import { useRoomContext } from "@livekit/components-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { RoomEvent, Participant, TranscriptionSegment } from "livekit-client";
import { usePartyState } from "@/hooks/usePartyState";
import { SpeakerWaveIcon, SpeakerXMarkIcon, ClipboardIcon, CheckIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

// Helper function to format time
const formatTime = (date: number) => {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface GroupedSegment {
  id: string;
  text: string;
  timestamp?: number;
  segments: (TranscriptionSegment & { timestamp?: number })[];
}

// Add this near the top of the file, after imports
const TTS_DEBOUNCE_TIME = 5000; // 5 seconds

export default function Captions() {
  const room = useRoomContext();
  const { state, dispatch } = usePartyState();
  const [isPlaying, setIsPlaying] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const originalScrollRef = useRef<HTMLDivElement>(null);
  const translationScrollRef = useRef<HTMLDivElement>(null);
  // Add a ref to store last played TTS text and timestamp
  const lastTTSRef = useRef<{ text: string; timestamp: number } | null>(null);
  const [transcriptions, setTranscriptions] = useState<{
    [language: string]: {
      [id: string]: TranscriptionSegment & { timestamp?: number };
    };
  }>({});

  // Group segments by time proximity (5 seconds window)
  const groupSegments = (segments: (TranscriptionSegment & { timestamp?: number })[]) => {
    const groups: GroupedSegment[] = [];
    let currentGroup: (TranscriptionSegment & { timestamp?: number })[] = [];
    
    segments.forEach((segment, index) => {
      if (index === 0) {
        currentGroup.push(segment);
      } else {
        const prevSegment = segments[index - 1];
        const timeDiff = (segment.timestamp || 0) - (prevSegment.timestamp || 0);
        
        if (timeDiff < 5000) { // 5 seconds window
          currentGroup.push(segment);
        } else {
          if (currentGroup.length > 0) {
            groups.push({
              id: currentGroup[0].id,
              text: currentGroup.map(s => s.text).join(' '),
              timestamp: currentGroup[0].timestamp,
              segments: [...currentGroup]
            });
          }
          currentGroup = [segment];
        }
      }
    });

    if (currentGroup.length > 0) {
      groups.push({
        id: currentGroup[0].id,
        text: currentGroup.map(s => s.text).join(' '),
        timestamp: currentGroup[0].timestamp,
        segments: [...currentGroup]
      });
    }

    return groups.slice(-5); // Keep last 5 groups
  };

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current) {
        const { scrollHeight, clientHeight, scrollTop } = ref.current;
        // Only auto-scroll if user is already near bottom (within 100px)
        const isNearBottom = scrollHeight - clientHeight - scrollTop < 100;
        if (isNearBottom) {
          ref.current.scrollTop = scrollHeight;
        }
      }
    };

    scrollToBottom(originalScrollRef);
    scrollToBottom(translationScrollRef);
  }, [transcriptions]);

  const playTTS = useCallback(async (text: string) => {
    if (isPlaying) {
      console.log("[Captions] TTS already playing, skipping");
      return;
    }

    // Check if this text was recently played
    const now = Date.now();
    if (lastTTSRef.current && 
        lastTTSRef.current.text === text && 
        now - lastTTSRef.current.timestamp < TTS_DEBOUNCE_TIME) {
      console.log("[Captions] Skipping duplicate TTS within debounce window", {
        text,
        lastPlayed: new Date(lastTTSRef.current.timestamp).toISOString(),
        timeSinceLastPlay: now - lastTTSRef.current.timestamp
      });
      return;
    }

    try {
      console.log("[Captions] Starting TTS playback", {
        text,
        timestamp: new Date().toISOString(),
        voiceId: state.ttsVoiceId
      });
      setIsPlaying(true);
      
      if (!state.ttsVoiceId) {
        console.error("[Captions] Voice ID is not set");
        setIsPlaying(false);
        return;
      }

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voiceId: state.ttsVoiceId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[Captions] TTS API error:", error);
        setIsPlaying(false);
        return;
      }

      console.log("[Captions] Received TTS audio response");
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      audio.onerror = (e) => {
        console.error("[Captions] Audio playback error:", e);
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onended = () => {
        console.log("[Captions] Audio playback completed");
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      console.log("[Captions] Starting audio playback");
      await audio.play();
      // Update last played text and timestamp
      lastTTSRef.current = { text, timestamp: now };
      console.log("[Captions] Audio playback started successfully");
    } catch (error) {
      console.error("[Captions] TTS playback error:", error);
      setIsPlaying(false);
    }
  }, [state.ttsVoiceId, isPlaying]);

  useEffect(() => {
    const updateTranscriptions = async (
      segments: TranscriptionSegment[],
      participant?: Participant
    ) => {
      console.debug('[Debug] Transcription event received:', {
        time: new Date().toISOString(),
        hasSegments: segments?.length > 0,
        participantIdentity: participant?.identity
      });

      const timestamp = new Date().toISOString();
      
      // Immediate logging of raw incoming data
      console.log(`[Transcription] [${timestamp}] Raw incoming data:`, {
        participant: participant?.identity,
        segmentsCount: segments.length,
        segments: segments.map(s => ({
          id: s.id,
          language: s.language || "en",
          text: s.text,
          isFinal: s.final,
          firstReceivedTime: new Date(s.firstReceivedTime).toISOString(),
          lastReceivedTime: new Date(s.lastReceivedTime).toISOString()
        }))
      });

      // Log current state before update
      console.log(`[Transcription] [${timestamp}] Current state:`, {
        ttsEnabled: state.ttsEnabled,
        captionsLanguage: state.captionsLanguage,
        isPlaying,
        existingTranscriptions: Object.keys(transcriptions).map(lang => ({
          language: lang,
          count: Object.keys(transcriptions[lang] || {}).length
        }))
      });

      setTranscriptions((prev) => {
        const newTranscriptions = { ...prev };
        const processedSegments: { id: string; action: string; reason: string; text: string }[] = [];

        for (const segment of segments) {
          const { id, text } = segment;
          let { language } = segment;

          if (language === "") {
            language = "en";
            console.log(`[Transcription] [${timestamp}] Empty language code defaulted to 'en'`, { id, text });
          }

          // Skip if we already have this segment
          if (newTranscriptions[language]?.[id]) {
            processedSegments.push({ 
              id, 
              action: "skipped", 
              reason: "duplicate_segment",
              text 
            });
            console.log(`[Transcription] [${timestamp}] Skipped duplicate segment:`, { id, language, text });
            continue;
          }

          if (!newTranscriptions[language]) {
            newTranscriptions[language] = {};
            console.log(`[Transcription] [${timestamp}] Created new language bucket:`, { language });
          }

          newTranscriptions[language][id] = {
            ...segment,
            timestamp: Date.now(),
          };

          processedSegments.push({ 
            id, 
            action: "added", 
            reason: "new_segment",
            text
          });

          console.log(`[Transcription] [${timestamp}] Added new segment:`, {
            id,
            language,
            text,
            isTranslation: language !== "en",
            timestamp: new Date().toISOString()
          });

          if (state.ttsEnabled && language === state.captionsLanguage && language !== "en") {
            console.log(`[TTS Request] [${timestamp}] New TTS request:`, {
              id,
              language,
              text,
              ttsEnabled: state.ttsEnabled,
              selectedLanguage: state.captionsLanguage,
              isPlaying,
              lastTTS: lastTTSRef.current ? {
                text: lastTTSRef.current.text,
                playedAt: new Date(lastTTSRef.current.timestamp).toISOString(),
                timeSince: Date.now() - lastTTSRef.current.timestamp
              } : null
            });
            
            playTTS(text).catch(error => {
              console.error(`[TTS Error] [${timestamp}]`, {
                id,
                text,
                error: error.message
              });
            });
          } else {
            console.log(`[TTS Skip] [${timestamp}]`, {
              id,
              language,
              text,
              reason: !state.ttsEnabled ? "tts_disabled" : 
                     language !== state.captionsLanguage ? "wrong_language" :
                     language === "en" ? "english_segment" : "unknown"
            });
          }
        }

        // Log summary of what we processed
        console.log(`[Transcription] [${timestamp}] Processing summary:`, {
          totalSegments: segments.length,
          processed: processedSegments,
          ttsState: {
            enabled: state.ttsEnabled,
            selectedLanguage: state.captionsLanguage,
            isCurrentlyPlaying: isPlaying
          }
        });

        return newTranscriptions;
      });
    };

    room.on(RoomEvent.TranscriptionReceived, updateTranscriptions);
    return () => {
      room.off(RoomEvent.TranscriptionReceived, updateTranscriptions);
    };
  }, [room, state.ttsEnabled, state.captionsLanguage, playTTS, isPlaying, transcriptions]);

  const originalSegments = Object.values(transcriptions["en"] || {})
    .sort((a, b) => a.firstReceivedTime - b.firstReceivedTime)
    .slice(-10);

  const translatedSegments = state.captionsLanguage !== "en"
    ? Object.values(transcriptions[state.captionsLanguage] || {})
      .sort((a, b) => a.firstReceivedTime - b.firstReceivedTime)
      .slice(-10)
    : [];

  const originalGroups = groupSegments(originalSegments);
  const translatedGroups = groupSegments(translatedSegments);

  if (!state.captionsEnabled) {
    return null;
  }

  const toggleTTS = () => {
    dispatch({ type: "SET_TTS_ENABLED", payload: !state.ttsEnabled });
  };

  const copyText = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[90vw] mx-auto">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleTTS}
        className="p-2.5 rounded-full hover:bg-white/5 transition-colors border border-white/10 mb-6"
        title={state.ttsEnabled ? "Disable TTS" : "Enable TTS"}
      >
        {state.ttsEnabled ? (
          <SpeakerWaveIcon className="w-5 h-5 text-white/80" />
        ) : (
          <SpeakerXMarkIcon className="w-5 h-5 text-white/50" />
        )}
      </motion.button>

      <div className="w-full min-h-[200px] grid grid-cols-2 gap-6 bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
        {/* Original text */}
        <div className="w-full space-y-3 flex flex-col">
          <div className="text-center mb-4">
            <span className="text-neutral-400 text-sm px-3 py-1 rounded-full bg-white/5 inline-flex items-center gap-2">
              <span>🎤</span>
              <span>Original</span>
            </span>
          </div>
          <div 
            ref={originalScrollRef} 
            className="flex-1 overflow-y-auto space-y-4 min-h-[300px] max-h-[60vh] pr-2 custom-scrollbar"
          >
            <AnimatePresence mode="popLayout">
              {originalGroups.map((group) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="relative group"
                >
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-white/5">
                    <div className="flex-1">
                      <div className="text-white/90 text-lg font-medium">{group.text}</div>
                      {group.timestamp && (
                        <div className="text-white/40 text-xs mt-1">{formatTime(group.timestamp)}</div>
                      )}
                    </div>
                    <button
                      onClick={() => copyText(group.text, group.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg"
                      title="Copy text"
                    >
                      {copiedId === group.id ? (
                        <CheckIcon className="w-4 h-4 text-green-400" />
                      ) : (
                        <ClipboardIcon className="w-4 h-4 text-white/60" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="absolute left-1/2 top-[20%] bottom-[20%] w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />

        {/* Translation */}
        <div className="w-full space-y-3 flex flex-col">
          <div className="text-center mb-4">
            <span className="text-neutral-400 text-sm px-3 py-1 rounded-full bg-white/5 inline-flex items-center gap-2">
              <span>🌐</span>
              <span>Translation</span>
            </span>
          </div>
          <div 
            ref={translationScrollRef} 
            className="flex-1 overflow-y-auto space-y-4 min-h-[300px] max-h-[60vh] pr-2 custom-scrollbar"
          >
            <AnimatePresence mode="popLayout">
              {translatedGroups.map((group) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="relative group"
                >
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-white/5">
                    <div className="flex-1">
                      <div className="text-white/90 text-lg font-medium">{group.text}</div>
                      {group.timestamp && (
                        <div className="text-white/40 text-xs mt-1">{formatTime(group.timestamp)}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyText(group.text, group.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg"
                        title="Copy text"
                      >
                        {copiedId === group.id ? (
                          <CheckIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ClipboardIcon className="w-4 h-4 text-white/60" />
                        )}
                      </button>
                      {state.ttsEnabled && (
                        <motion.button
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={() => playTTS(group.text)}
                          disabled={isPlaying}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-lg"
                          title="Play audio"
                        >
                          <SpeakerWaveIcon className="w-4 h-4 text-white/60" />
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
