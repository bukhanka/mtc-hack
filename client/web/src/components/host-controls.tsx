"use client";

import MicToggle from "@/components/controls/mic-toggle";
import LeaveButton from "@/components/controls/leave-button";
import CaptionsToggle from "@/components/controls/captions-toggle";
import LanguageSelect from "@/components/controls/language-select";
import DeviceSelector from "@/components/controls/device-selector";
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

export default function HostControls() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 p-3 bg-white/5 backdrop-blur-lg rounded-full">
      <motion.div
        variants={controlsAnimation}
        initial="initial"
        animate="animate"
        custom={0}
        className="flex items-center gap-2"
      >
        <div className="min-w-[180px]">
          <DeviceSelector />
        </div>
        <MicToggle />
      </motion.div>
      <motion.div
        variants={controlsAnimation}
        initial="initial"
        animate="animate"
        custom={1}
      >
        <CaptionsToggle />
      </motion.div>
      <motion.div
        variants={controlsAnimation}
        initial="initial"
        animate="animate"
        custom={2}
        className="min-w-[180px]"
      >
        <LanguageSelect />
      </motion.div>
      <motion.div
        variants={controlsAnimation}
        initial="initial"
        animate="animate"
        custom={3}
      >
        <LeaveButton />
      </motion.div>
    </div>
  );
}
