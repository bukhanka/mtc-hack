import { Button } from "@/components/ui/button";
import { usePartyState } from "@/hooks/usePartyState";
import { BiSolidCaptions, BiCaptions } from "react-icons/bi";
import { motion } from "framer-motion";
import { Tooltip } from "@/components/ui/tooltip";

const translations = {
  enableCaptions: "Включить субтитры",
  disableCaptions: "Отключить субтитры",
};

export default function CaptionsToggle() {
  const { state, dispatch } = usePartyState();

  return (
    <Tooltip content={state.captionsEnabled ? translations.disableCaptions : translations.enableCaptions}>
      <Button
        variant="outline"
        className="relative w-10 h-10 p-0 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
        onClick={() => {
          dispatch({
            type: "SET_CAPTIONS_ENABLED",
            payload: !state.captionsEnabled,
          });
        }}
      >
        <motion.div
          initial={false}
          animate={{
            scale: state.captionsEnabled ? 1 : 0,
            opacity: state.captionsEnabled ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <BiSolidCaptions className="w-5 h-5 text-white" />
        </motion.div>
        <motion.div
          initial={false}
          animate={{
            scale: state.captionsEnabled ? 0 : 1,
            opacity: state.captionsEnabled ? 0 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="absolute"
        >
          <BiCaptions className="w-5 h-5 text-neutral-400" />
        </motion.div>
      </Button>
    </Tooltip>
  );
}
