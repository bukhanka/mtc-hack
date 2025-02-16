import { useRoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "react-feather";
import { motion } from "framer-motion";
import { Tooltip } from "@/components/ui/tooltip";

const translations = {
  muteMic: "Выключить микрофон",
  unmuteMic: "Включить микрофон",
};

export default function MicToggle() {
  const room = useRoomContext();

  return (
    <Tooltip content={room.localParticipant.isMicrophoneEnabled ? translations.muteMic : translations.unmuteMic}>
      <Button
        variant="outline"
        className="relative w-10 h-10 p-0 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
        onClick={() => {
          room.localParticipant.setMicrophoneEnabled(
            !room.localParticipant.isMicrophoneEnabled
          );
        }}
      >
        <motion.div
          initial={false}
          animate={{
            scale: room.localParticipant.isMicrophoneEnabled ? 1 : 0,
            opacity: room.localParticipant.isMicrophoneEnabled ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <Mic className="w-5 h-5 text-white" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            scale: room.localParticipant.isMicrophoneEnabled ? 0 : 1,
            opacity: room.localParticipant.isMicrophoneEnabled ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <MicOff className="w-5 h-5 text-neutral-400" />
        </motion.div>
      </Button>
    </Tooltip>
  );
}
