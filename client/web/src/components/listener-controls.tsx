import CaptionsToggle from "@/components/controls/captions-toggle";
import LanguageSelect from "@/components/controls/language-select";
import LeaveButton from "@/components/controls/leave-button";
import { motion } from "framer-motion";

const controlsAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 * i,
    },
  }),
};

export default function ListenerControls() {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-white/5 backdrop-blur-lg rounded-full">
      <motion.div
        variants={controlsAnimation}
        initial="initial"
        animate="animate"
        custom={0}
      >
        <CaptionsToggle />
      </motion.div>
      <motion.div
        variants={controlsAnimation}
        initial="initial"
        animate="animate"
        custom={1}
        className="min-w-[180px]"
      >
        <LanguageSelect />
      </motion.div>
      <motion.div
        variants={controlsAnimation}
        initial="initial"
        animate="animate"
        custom={2}
      >
        <LeaveButton />
      </motion.div>
    </div>
  );
}
