import { usePartyState } from "@/hooks/usePartyState";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Eye, Type } from "react-feather";

const translations = {
  textSize: "Размер текста",
  small: "Маленький",
  medium: "Средний",
  large: "Большой",
  highContrast: "Высокий контраст",
  accessibility: "Доступность",
};

export default function AccessibilityControls() {
  const { state, dispatch } = usePartyState();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-4"
    >
      <Button
        variant="outline"
        className="relative w-10 h-10 p-0 bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
        onClick={() => {
          const menu = document.getElementById("accessibility-menu");
          if (menu) {
            menu.style.display = menu.style.display === "none" ? "block" : "none";
          }
        }}
      >
        <Eye className="w-5 h-5 text-neutral-400" />
      </Button>

      <div
        id="accessibility-menu"
        className="absolute bottom-full mb-4 p-4 bg-neutral-900/95 backdrop-blur-lg rounded-lg border border-white/10 shadow-xl"
        style={{ display: "none" }}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Type className="w-4 h-4 text-neutral-400" />
              <Label className="text-sm text-neutral-200">{translations.textSize}</Label>
            </div>
            <Select
              value={state.textSize}
              onValueChange={(value: 'small' | 'medium' | 'large') =>
                dispatch({ type: "SET_TEXT_SIZE", payload: value })
              }
            >
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">{translations.small}</SelectItem>
                <SelectItem value="medium">{translations.medium}</SelectItem>
                <SelectItem value="large">{translations.large}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm text-neutral-200">{translations.highContrast}</Label>
            <Switch
              checked={state.highContrastMode}
              onCheckedChange={(checked) =>
                dispatch({ type: "SET_HIGH_CONTRAST_MODE", payload: checked })
              }
              className="data-[state=checked]:bg-white"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
} 