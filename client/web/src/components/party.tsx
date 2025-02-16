"use client";

import {
  useRoomContext,
  useParticipants,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Participant } from "livekit-client";
import { Headphones, Music } from "react-feather";
import HostControls from "@/components/host-controls";
import ListenerControls from "@/components/listener-controls";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CircleVisualizer from "./circle-visualizer";
import { usePartyState } from "@/hooks/usePartyState";
import Captions from "@/components/captions";
import { motion, AnimatePresence } from "framer-motion";

const translations = {
  listeningParty: "Прослушивание",
  liveSession: "Прямой эфир",
  live: "LIVE",
  listeners: "слушателей",
};

export default function Party() {
  const [host, setHost] = useState<Participant | undefined>();
  const room = useRoomContext();
  const participants = useParticipants();
  const { state } = usePartyState();

  useEffect(() => {
    const host = participants.find((p) => {
      return p.permissions?.canPublish;
    });
    if (host) {
      setHost(host);
    }
  }, [participants]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full min-h-screen flex flex-col relative px-8 py-6"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-between items-center mb-8"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/5 rounded-full">
            <Music className="w-6 h-6 text-neutral-400" />
          </div>
          <div className="flex flex-col">
            <p className="text-neutral-400 text-sm">{translations.listeningParty}</p>
            <h1 className="font-bold text-2xl text-white">{translations.liveSession}</h1>
          </div>
        </div>
        <div className="flex gap-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              variant="outline"
              className="uppercase bg-red-500/20 text-red-400 border-red-500/20 hover:bg-red-500/30"
            >
              {translations.live}
            </Button>
          </motion.div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button 
              variant="outline"
              className="bg-white/5 border-white/10 text-neutral-400 hover:bg-white/10"
            >
              <Headphones className="w-4 h-4 mr-2" />
              <span>{participants.length} {translations.listeners}</span>
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <AnimatePresence>
          {host && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-12"
            >
              <div className="relative flex items-center justify-center w-[200px] h-[200px]">
                <CircleVisualizer speaker={host} />
              </div>
              <div className="w-full max-w-2xl">
                <Captions />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center mt-8"
      >
        {host === room.localParticipant ? (
          <HostControls />
        ) : (
          <ListenerControls />
        )}
      </motion.div>
    </motion.div>
  );
}
