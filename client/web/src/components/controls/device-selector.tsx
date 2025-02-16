import { useMediaDeviceSelect } from "@livekit/components-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { Mic } from "react-feather";

const translations = {
  selectMicrophone: "Выберите микрофон",
};

export default function DeviceSelector() {
  const deviceSelect = useMediaDeviceSelect({ kind: "audioinput" });
  const [selectedDeviceName, setSelectedDeviceName] = useState("");

  const handleChange = async (value: string) => {
    deviceSelect.setActiveMediaDevice(value);
  };

  useEffect(() => {
    deviceSelect.devices.forEach((device) => {
      if (device.deviceId === deviceSelect.activeDeviceId) {
        setSelectedDeviceName(device.label);
      }
    });
  }, [deviceSelect.activeDeviceId, deviceSelect.devices, selectedDeviceName]);

  return (
    <Select value={deviceSelect.activeDeviceId} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px] bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20">
        <div className="flex items-center gap-2 truncate">
          <Mic className="flex-shrink-0 w-4 h-4 text-neutral-400" />
          <SelectValue placeholder={translations.selectMicrophone} className="truncate" />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-neutral-900 border-white/10">
        {deviceSelect.devices.map((device) => (
          <SelectItem 
            key={device.deviceId} 
            value={device.deviceId}
            className="text-white focus:bg-white/10 focus:text-white"
          >
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 truncate"
            >
              <Mic className="flex-shrink-0 w-4 h-4 text-neutral-400" />
              <span className="truncate">{device.label}</span>
            </motion.div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
