import { useState } from "react";
import { usePartyState } from "@/hooks/usePartyState";
import { TokenResult } from "@/app/api/token/route";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Headphones } from "react-feather";

const translations = {
  joinParty: "Присоединиться",
  description: "Присоединитесь к комнате для общения или прослушивания",
  displayName: "Ваше имя",
  enterName: "Введите ваше имя...",
  beHost: "Я хочу быть ведущим",
  joinButton: "Присоединиться",
};

interface LobbyProps {
  partyId: string;
}

export default function Lobby({ partyId }: LobbyProps) {
  const [name, setName] = useState<string>("");
  const [isHost, setIsHost] = useState<boolean>(false);
  const { dispatch } = usePartyState();

  const onJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `/api/token?party_id=${encodeURIComponent(
          partyId
        )}&name=${encodeURIComponent(name)}&host=${isHost}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch token");
      }

      const data = (await response.json()) as TokenResult;

      dispatch({ type: "SET_TOKEN", payload: data.token });
      dispatch({ type: "SET_SERVER_URL", payload: data.serverUrl });
      dispatch({ type: "SET_IS_HOST", payload: isHost });
      dispatch({ type: "SET_SHOULD_CONNECT", payload: true });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-md bg-white/10 border-white/20">
          <form onSubmit={onJoin}>
            <CardHeader>
              <div className="flex items-center gap-2 mb-4">
                <Headphones className="w-6 h-6 text-neutral-400" />
                <CardTitle className="text-2xl">{translations.joinParty}</CardTitle>
              </div>
              <CardDescription className="text-neutral-400">
                {translations.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-neutral-200">{translations.displayName}</Label>
                <Input
                  id="name"
                  placeholder={translations.enterName}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-neutral-500"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="host"
                  checked={isHost}
                  onCheckedChange={(checked: CheckedState) =>
                    setIsHost(checked === "indeterminate" ? false : checked)
                  }
                  className="border-white/20 data-[state=checked]:bg-white/20"
                />
                <Label
                  htmlFor="host"
                  className="text-sm font-medium text-neutral-200"
                >
                  {translations.beHost}
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-white/10 hover:bg-white/20 text-white"
                disabled={!name.trim()}
              >
                {translations.joinButton}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
