import { useRoomContext } from "@livekit/components-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "react-feather";
import { motion } from "framer-motion";
import { Tooltip } from "@/components/ui/tooltip";

const translations = {
  leaveParty: "Покинуть комнату",
};

export default function LeaveButton() {
  const room = useRoomContext();
  const router = useRouter();

  const onClose = async () => {
    await room.disconnect();
    router.push("/");
  };

  return (
    <Tooltip content={translations.leaveParty}>
      <Button
        variant="outline"
        className="relative w-10 h-10 p-0 bg-red-500/20 border-red-500/20 hover:bg-red-500/30 hover:border-red-500/30"
        onClick={onClose}
      >
        <motion.div
          whileHover={{ rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          <X className="w-5 h-5 text-red-400" />
        </motion.div>
      </Button>
    </Tooltip>
  );
}
