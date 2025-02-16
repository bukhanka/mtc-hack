import asyncio
import logging
import json

from enum import Enum
from dataclasses import dataclass, asdict
import os

from livekit import rtc
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobRequest,
    WorkerOptions,
    cli,
    stt,
    llm,
    transcription,
    utils,
)
from livekit.plugins import openai, deepgram
from dotenv import load_dotenv

load_dotenv()

# Configure logging with less verbose format
logging.basicConfig(
    level=logging.INFO,
    format='%(levelname)s - %(message)s'
)
logger = logging.getLogger("transcriber")


@dataclass
class Language:
    code: str
    name: str
    flag: str
    supported_stt: list[str]  # List of STT providers that support this language


languages = {
    "en": Language(code="en", name="English", flag="🇺🇸", supported_stt=["deepgram"]),
    "es": Language(code="es", name="Spanish", flag="🇪🇸", supported_stt=["deepgram"]),
    "fr": Language(code="fr", name="French", flag="🇫🇷", supported_stt=["deepgram"]),
    "de": Language(code="de", name="German", flag="🇩🇪", supported_stt=["deepgram"]),
    "ja": Language(code="ja", name="Japanese", flag="🇯🇵", supported_stt=["deepgram"]),
    "ru": Language(code="ru", name="Russian", flag="🇷🇺", supported_stt=["deepgram"]),
}

LanguageCode = Enum(
    "LanguageCode",  # Name of the Enum
    {code: lang.name for code, lang in languages.items()},  # Enum entries
)


class Translator:
    def __init__(self, room: rtc.Room, lang: Enum):
        logger.info(f"Initializing Translator for language: {lang.value}")
        self.room = room
        self.lang = lang
        self.context = llm.ChatContext().append(
            role="system",
            text=(
                f"You are a translator for language: {lang.value}. "
                f"Your only response should be the exact translation of input text in the {lang.value} language."
            ),
        )
        self.llm = openai.LLM(
            model="gpt-4o-mini",
            temperature=0.3,
        )

    async def translate(self, message: str, track: rtc.Track):
        try:
            # Translation process
            self.context.append(text=message, role="user")
            stream = self.llm.chat(chat_ctx=self.context)
            
            translated_message = ""
            async for chunk in stream:
                content = chunk.choices[0].delta.content
                if content is None:
                    break
                translated_message += content

            # Send text transcription
            segment = rtc.TranscriptionSegment(
                id=utils.misc.shortuuid("SG_"),
                text=translated_message,
                start_time=0,
                end_time=0,
                language=self.lang.name,
                final=True,
            )
            transcription = rtc.Transcription(
                self.room.local_participant.identity, track.sid, [segment]
            )
            await self.room.local_participant.publish_transcription(transcription)

        except Exception as e:
            logger.error(f"Error in translate for {self.lang.value}: {e}")
            raise

    async def cleanup(self):
        """Cleanup resources"""
        pass


async def entrypoint(job: JobContext):
    # Use Deepgram STT with English as default
    stt_provider = deepgram.STT(language="en")
    tasks = []
    translators = {}

    async def _forward_transcription(
        stt_stream: stt.SpeechStream,
        stt_forwarder: transcription.STTSegmentsForwarder,
        track: rtc.Track,
    ):
        """Forward the transcription and log the transcript in the console"""
        async for ev in stt_stream:
            stt_forwarder.update(ev)
            # log to console
            if ev.type == stt.SpeechEventType.INTERIM_TRANSCRIPT:
                print(ev.alternatives[0].text, end="")
            elif ev.type == stt.SpeechEventType.FINAL_TRANSCRIPT:
                print("\n")
                print(" -> ", ev.alternatives[0].text)

                message = ev.alternatives[0].text
                # Send original transcription in input language
                segment = rtc.TranscriptionSegment(
                    id=utils.misc.shortuuid("SG_"),
                    text=message,
                    start_time=0,
                    end_time=0,
                    language="en",
                    final=True,
                )
                transcription = rtc.Transcription(
                    job.room.local_participant.identity, track.sid, [segment]
                )
                await job.room.local_participant.publish_transcription(transcription)

                # Send translations for other languages (excluding input language)
                for lang, translator in translators.items():
                    if lang != "en":  # Skip translation for input language
                        asyncio.create_task(translator.translate(message, track))

    async def transcribe_track(participant: rtc.RemoteParticipant, track: rtc.Track):
        audio_stream = rtc.AudioStream(track)
        stt_forwarder = transcription.STTSegmentsForwarder(
            room=job.room, participant=participant, track=track
        )
        stt_stream = stt_provider.stream()
        stt_task = asyncio.create_task(
            _forward_transcription(stt_stream, stt_forwarder, track)
        )
        tasks.append(stt_task)

        async for ev in audio_stream:
            stt_stream.push_frame(ev.frame)

    @job.room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info(f"Adding transcriber for participant: {participant.identity}")
            tasks.append(asyncio.create_task(transcribe_track(participant, track)))

    @job.room.on("participant_attributes_changed")
    def on_attributes_changed(
        changed_attributes: dict[str, str], participant: rtc.Participant
    ):
        """
        When participant attributes change, handle new translation requests.
        """
        # Handle translation language changes
        lang = changed_attributes.get("captions_language", None)
        if lang and lang != "en" and lang not in translators:
            try:
                target_language = LanguageCode[lang].value
                logger.info(f"Creating new translator for language: {target_language}")
                translator = Translator(job.room, LanguageCode[lang])
                translators[lang] = translator
                logger.info(f"Added translator for language: {target_language}")
            except KeyError:
                logger.warning(f"Unsupported language requested: {lang}")
            except Exception as e:
                logger.error(f"Error setting up translator: {e}")

    @job.room.on("participant_joined")
    def on_participant_joined(participant: rtc.Participant):
        """
        When a participant joins, check their initial attributes.
        """
        # Handle initial translation language
        lang = participant.metadata.get("captions_language", "ru")
        if lang != "en" and lang not in translators:
            try:
                target_language = LanguageCode[lang].value
                logger.info(f"Creating new translator for initial language: {target_language}")
                translator = Translator(job.room, LanguageCode[lang])
                translators[lang] = translator
                logger.info(f"Added translator for initial language: {target_language}")
            except KeyError:
                logger.warning(f"Unsupported initial language: {lang}")
            except Exception as e:
                logger.error(f"Error setting up initial translator: {e}")

    await job.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    @job.room.local_participant.register_rpc_method("get/languages")
    async def get_languages(data: rtc.RpcInvocationData):
        languages_list = [asdict(lang) for lang in languages.values()]
        return json.dumps(languages_list)


async def request_fnc(req: JobRequest):
    await req.accept(
        name="agent",
        identity="agent",
    )


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint, request_fnc=request_fnc
        )
    )
