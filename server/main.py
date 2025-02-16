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
    supported_stt: list[str]  
    stt_code: str  # The language code used by Deepgram


languages = {
    "en": Language(code="en", name="English", flag="🇺🇸", supported_stt=["deepgram"], stt_code="en-US"),
    "es": Language(code="es", name="Spanish", flag="🇪🇸", supported_stt=["deepgram"], stt_code="es"),
    "fr": Language(code="fr", name="French", flag="🇫🇷", supported_stt=["deepgram"], stt_code="fr-FR"),
    "de": Language(code="de", name="German", flag="🇩🇪", supported_stt=["deepgram"], stt_code="de"),
    "ja": Language(code="ja", name="Japanese", flag="🇯🇵", supported_stt=["deepgram"], stt_code="ja"),
    "ru": Language(code="ru", name="Russian", flag="🇷🇺", supported_stt=["deepgram"], stt_code="ru-RU"),
    "en-deaf": Language(code="en-deaf", name="English (Deaf-Friendly)", flag="👋🇺🇸", supported_stt=["deepgram"], stt_code="en-US"),
    "ru-deaf": Language(code="ru-deaf", name="Русский (для глухих)", flag="👋🇷🇺", supported_stt=["deepgram"], stt_code="ru-RU"),
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


class DeafFriendlyTranslator(Translator):
    def __init__(self, room: rtc.Room, lang: Enum):
        super().__init__(room, lang)
        # Determine base language from the code (e.g., "en-deaf" -> "en")
        base_language = self.lang.name.split()[0]  # Get "English" or "Русский" from the full name
        
        # Define prompts for different languages
        prompts = {
            "English": (
                "You are a specialized translator adapting speech for the Deaf community using ASL-friendly English. "
                "Follow these critical guidelines:\n"
                "1. STRUCTURE: Use simple, direct Subject-Verb-Object structure common in sign languages\n"
                "2. TIME MARKERS: Put time references at the beginning of sentences\n"
                "3. CONTEXT: Add [brackets] for:\n"
                "   - Speaker emotions [EXCITED]\n"
                "   - Sound descriptions [DOOR SLAMS]\n"
                "   - Speaker changes [NEW SPEAKER]\n"
                "4. VISUAL LANGUAGE: Use concrete, visual descriptions instead of abstract concepts\n"
                "5. SIMPLIFY:\n"
                "   - Break long sentences into shorter ones\n"
                "   - Remove filler words and redundancies\n"
                "   - Replace idioms with direct meanings\n"
                "6. GRAMMAR ADAPTATION:\n"
                "   - Use present tense when possible\n"
                "   - Make rhetorical questions into statements\n"
                "   - Make passive voice into active voice\n"
                "7. CULTURAL AWARENESS:\n"
                "   - Consider Deaf culture norms\n"
                "   - Maintain the message's core meaning\n"
                "Your output must be the adapted text only, following these guidelines precisely."
            ),
            "Русский": (
                "Вы специализированный переводчик, адаптирующий речь для глухих, использующих РЖЯ (русский жестовый язык). "
                "Следуйте этим важным правилам:\n"
                "1. СТРУКТУРА: Используйте простую структуру Субъект-Предикат-Объект, характерную для жестовых языков\n"
                "2. ВРЕМЯ: Ставьте временные маркеры в начало предложения\n"
                "3. КОНТЕКСТ: Добавляйте [скобки] для:\n"
                "   - Эмоций говорящего [РАДОСТНО]\n"
                "   - Описания звуков [СТУК В ДВЕРЬ]\n"
                "   - Смены говорящего [НОВЫЙ ГОВОРЯЩИЙ]\n"
                "4. ВИЗУАЛЬНОСТЬ: Используйте конкретные, визуальные описания вместо абстрактных понятий\n"
                "5. УПРОЩЕНИЕ:\n"
                "   - Разбивайте длинные предложения на короткие\n"
                "   - Убирайте слова-паразиты и повторы\n"
                "   - Заменяйте идиомы прямым значением\n"
                "6. ГРАММАТИЧЕСКАЯ АДАПТАЦИЯ:\n"
                "   - Используйте настоящее время где возможно\n"
                "   - Превращайте риторические вопросы в утверждения\n"
                "   - Заменяйте пассивный залог на активный\n"
                "7. КУЛЬТУРНАЯ АДАПТАЦИЯ:\n"
                "   - Учитывайте нормы культуры глухих\n"
                "   - Сохраняйте основной смысл сообщения\n"
                "Ваш ответ должен содержать только адаптированный текст, строго следуя этим правилам."
            )
        }
        
        # Select appropriate prompt based on language
        prompt = prompts.get(base_language, prompts["English"])  # Default to English if language not found
        
        self.context = llm.ChatContext().append(
            role="system",
            text=prompt
        )
        self.llm = openai.LLM(
            model="gpt-4o",  # Using the full model for better adaptation
            temperature=0.3,
        )


async def entrypoint(job: JobContext):
    # Use Deepgram STT with English as default
    stt_provider = deepgram.STT(language="en")  # Initialize with default language
    tasks = []
    translators = {}
    active_audio_tracks = {}  # Словарь для хранения активных аудио-треков участников
    current_transcribe_task = None  # Track current transcription task

    def update_stt_language(input_language: str = "en") -> None:
        """Update STT provider language"""
        try:
            if input_language not in languages:
                logger.warning(f"Unsupported input language: {input_language}, falling back to English")
                input_language = "en"
            
            language = languages[input_language]
            stt_code = language.stt_code
            
            logger.info(f"Updating STT language to: {input_language} (code: {stt_code})")
            
            # Configure Deepgram with the correct language code
            stt_provider.update_options(
                language=stt_code,
                model="enhanced",  # Use enhanced model for better recognition
                interim_results=True,
            )
            
        except Exception as e:
            logger.error(f"Error updating STT language: {e}")
            # Fallback to English in case of error
            stt_provider.update_options(language=languages["en"].stt_code)

    def get_participant_languages(participant: rtc.Participant) -> tuple[str, str]:
        """Get input and output languages from participant metadata"""
        try:
            metadata = json.loads(participant.metadata) if participant.metadata else {}
            input_lang = metadata.get("input_language", "en")
            output_lang = metadata.get("captions_language", "ru")
            return input_lang, output_lang
        except json.JSONDecodeError:
            logger.error(f"Failed to parse participant metadata: {participant.metadata}")
            return "en", "ru"  # Default fallback
        except Exception as e:
            logger.error(f"Error getting participant languages: {e}")
            return "en", "ru"  # Default fallback

    async def _forward_transcription(
        stt_stream: stt.SpeechStream,
        stt_forwarder: transcription.STTSegmentsForwarder,
        track: rtc.Track,
        input_language: str = "en"
    ):
        """Forward the transcription and log the transcript in the console"""
        async for ev in stt_stream:
            stt_forwarder.update(ev)
            # log to console
            if ev.type == stt.SpeechEventType.INTERIM_TRANSCRIPT:
                print(f"[{input_language}] ", ev.alternatives[0].text, end="")
            elif ev.type == stt.SpeechEventType.FINAL_TRANSCRIPT:
                print("\n")
                print(f"[{input_language}] -> ", ev.alternatives[0].text)

                message = ev.alternatives[0].text
                # Send original transcription in input language
                segment = rtc.TranscriptionSegment(
                    id=utils.misc.shortuuid("SG_"),
                    text=message,
                    start_time=0,
                    end_time=0,
                    language=input_language,
                    final=True,
                )
                transcription = rtc.Transcription(
                    job.room.local_participant.identity, track.sid, [segment]
                )
                await job.room.local_participant.publish_transcription(transcription)

                # Send translations for other languages
                for lang, translator in translators.items():
                    # Now we translate to English as well if it's selected as target language
                    asyncio.create_task(translator.translate(message, track))

    async def start_transcription(participant: rtc.RemoteParticipant, track: rtc.Track, input_language: str):
        """Start new transcription with specified language"""
        nonlocal current_transcribe_task, stt_provider
        
        try:
            # Cancel existing transcription if any
            if current_transcribe_task and not current_transcribe_task.done():
                current_transcribe_task.cancel()
                try:
                    await current_transcribe_task
                except asyncio.CancelledError:
                    logger.info(f"Previous transcription cancelled")
                except Exception as e:
                    logger.error(f"Error cancelling previous transcription: {e}")

            # Create a fresh STT provider instance for the new language
            stt_provider = deepgram.STT(language=languages[input_language].stt_code)
            logger.info(f"Starting new transcription with language: {input_language}")
            
            # Set up audio processing
            audio_stream = rtc.AudioStream(track)
            stt_forwarder = transcription.STTSegmentsForwarder(
                room=job.room, participant=participant, track=track
            )
            stt_stream = stt_provider.stream()
            
            # Create and store new transcription task
            current_transcribe_task = asyncio.create_task(
                _forward_transcription(stt_stream, stt_forwarder, track, input_language)
            )
            tasks.append(current_transcribe_task)

            # Process audio frames
            async for ev in audio_stream:
                stt_stream.push_frame(ev.frame)
        except Exception as e:
            logger.error(f"Error in start_transcription: {e}")
            # Attempt to fallback to English
            if input_language != "en":
                logger.info("Attempting fallback to English...")
                await start_transcription(participant, track, "en")

    async def transcribe_track(participant: rtc.RemoteParticipant, track: rtc.Track):
        # Get participant language settings
        input_language, output_language = get_participant_languages(participant)
        await start_transcription(participant, track, input_language)

    @job.room.on("track_subscribed")
    def on_track_subscribed(
        track: rtc.Track,
        publication: rtc.TrackPublication,
        participant: rtc.RemoteParticipant,
    ):
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info(f"Adding transcriber for participant: {participant.identity}")
            active_audio_tracks[participant.identity] = track  # Сохраняем активный аудио-трек для участника
            tasks.append(asyncio.create_task(transcribe_track(participant, track)))

    @job.room.on("participant_attributes_changed")
    def on_attributes_changed(
        changed_attributes: dict[str, str], participant: rtc.Participant
    ):
        """
        When participant attributes change, handle new translation requests and input language changes.
        """
        try:
            input_language, output_language = get_participant_languages(participant)
            
            # Handle translation language changes
            lang = changed_attributes.get("captions_language", None)
            if lang and lang not in translators:
                try:
                    target_language = LanguageCode[lang].value
                    logger.info(f"Creating new translator for language: {target_language}")
                    # Use DeafFriendlyTranslator for deaf options, regular Translator for others
                    translator_class = DeafFriendlyTranslator if "-deaf" in lang else Translator
                    translator = translator_class(job.room, LanguageCode[lang])
                    translators[lang] = translator
                    logger.info(f"Added translator for language: {target_language}")
                except KeyError:
                    logger.warning(f"Unsupported language requested: {lang}")
                except Exception as e:
                    logger.error(f"Error setting up translator: {e}")

            # Handle input language changes
            input_language = changed_attributes.get("input_language", None)
            if input_language:
                try:
                    if input_language in languages:
                        logger.info(f"Changing input language to: {input_language}")
                        # Получаем активный аудио-трек из словаря, используя идентификатор участника
                        track = active_audio_tracks.get(participant.identity)
                        if track:
                            tasks.append(asyncio.create_task(
                                start_transcription(participant, track, input_language)
                            ))
                        else:
                            logger.warning(f"No active audio track found for participant: {participant.identity}")
                    else:
                        logger.warning(f"Unsupported input language: {input_language}")
                except Exception as e:
                    logger.error(f"Error changing input language: {e}")
        except Exception as e:
            logger.error(f"Error in on_attributes_changed: {e}")

    @job.room.on("participant_joined")
    def on_participant_joined(participant: rtc.Participant):
        """
        When a participant joins, check their initial attributes.
        """
        try:
            input_language, output_language = get_participant_languages(participant)
            
            # Update initial STT language if needed
            if input_language != "en":
                update_stt_language(input_language)
            
            # Handle initial translation language
            if output_language not in translators:  # Remove input language check
                try:
                    target_language = LanguageCode[output_language].value
                    logger.info(f"Creating new translator for initial language: {target_language}")
                    translator = Translator(job.room, LanguageCode[output_language])
                    translators[output_language] = translator
                    logger.info(f"Added translator for initial language: {target_language}")
                except KeyError:
                    logger.warning(f"Unsupported initial language: {output_language}")
                except Exception as e:
                    logger.error(f"Error setting up initial translator: {e}")
        except Exception as e:
            logger.error(f"Error in on_participant_joined: {e}")

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
