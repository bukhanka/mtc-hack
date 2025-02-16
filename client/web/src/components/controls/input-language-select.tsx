import React, { useState, useEffect } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRoomContext, useVoiceAssistant } from "@livekit/components-react";
import { usePartyState } from "@/hooks/usePartyState";
import { ConnectionState } from "livekit-client";
import { motion } from "framer-motion";
import { Mic } from "react-feather";

interface Language {
  code: string;
  name: string;
  flag: string;
}

const translations = {
  selectLanguage: "Язык ввода",
  russian: "Русский",
};

const InputLanguageSelect = () => {
  const room = useRoomContext();
  const { agent } = useVoiceAssistant();
  const { state, dispatch } = usePartyState();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    if (room.state === ConnectionState.Connected) {
      room.localParticipant.setAttributes({
        input_language: state.inputLanguage,
      });
    }
  }, [room.state, room.localParticipant, state.inputLanguage]);

  const handleChange = async (value: string) => {
    dispatch({
      type: "SET_INPUT_LANGUAGE",
      payload: value,
    });
    await room.localParticipant.setAttributes({
      input_language: value,
    });
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    async function getLanguages() {
      if (!mounted) return;
      
      try {
        setIsLoading(true);
        
        if (room.state !== ConnectionState.Connected || !agent) {
          if (retryCount < MAX_RETRIES) {
            timeoutId = setTimeout(() => {
              if (mounted) {
                setRetryCount(prev => prev + 1);
              }
            }, RETRY_DELAY * Math.pow(2, retryCount));
          }
          return;
        }

        const response = await Promise.race([
          room.localParticipant.performRpc({
            destinationIdentity: "agent",
            method: "get/languages",
            payload: "",
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("RPC timeout")), 10000)
          )
        ]);

        if (!mounted) return;

        const languages = JSON.parse(response as string);
        setLanguages(languages);
        setRetryCount(0);
        setIsLoading(false);
      } catch (error) {
        console.error("RPC call failed: ", error);
        if (mounted && retryCount < MAX_RETRIES) {
          timeoutId = setTimeout(() => {
            if (mounted) {
              setRetryCount(prev => prev + 1);
            }
          }, RETRY_DELAY * Math.pow(2, retryCount));
        }
      }
    }

    getLanguages();

    return () => {
      mounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [room, agent, retryCount]);

  const displayLanguages = isLoading ? [
    { code: "ru", name: translations.russian, flag: "🇷🇺" }
  ] : languages;

  return (
    <div className="flex items-center">
      <Select
        value={state.inputLanguage}
        onValueChange={handleChange}
        disabled={!state.captionsEnabled}
      >
        <SelectTrigger className="w-[180px] bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-neutral-400" />
            <SelectValue placeholder={translations.selectLanguage} />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-neutral-900 border-white/10">
          {displayLanguages.map((lang) => (
            <SelectItem 
              key={lang.code} 
              value={lang.code}
              className="text-white focus:bg-white/10 focus:text-white"
            >
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </motion.div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default InputLanguageSelect; 