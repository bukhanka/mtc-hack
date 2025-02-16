import { createContext, useContext } from "react";

// State type
export type State = {
  token?: string;
  serverUrl: string;
  shouldConnect: boolean;
  captionsEnabled: boolean;
  captionsLanguage: string;
  isHost: boolean;
  ttsEnabled: boolean;
  ttsVoiceId: string;
};

// Initial state with Russian as default
export const initialState: State = {
  serverUrl: "",
  shouldConnect: false,
  captionsEnabled: true,
  captionsLanguage: "ru",
  isHost: false,
  ttsEnabled: false,
  ttsVoiceId: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || "Png1rsLPwah87cs3JX7l", // Voice ID from env
};

// Action type
export type Action =
  | { type: "SET_TOKEN"; payload: string }
  | { type: "SET_SERVER_URL"; payload: string }
  | { type: "SET_SHOULD_CONNECT"; payload: boolean }
  | { type: "SET_CAPTIONS_ENABLED"; payload: boolean }
  | { type: "SET_CAPTIONS_LANGUAGE"; payload: string }
  | { type: "SET_IS_HOST"; payload: boolean }
  | { type: "SET_TTS_ENABLED"; payload: boolean }
  | { type: "SET_TTS_VOICE_ID"; payload: string };

// Reducer function
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "SET_TOKEN":
      return { ...state, token: action.payload };
    case "SET_SERVER_URL":
      return { ...state, serverUrl: action.payload };
    case "SET_SHOULD_CONNECT":
      return { ...state, shouldConnect: action.payload };
    case "SET_CAPTIONS_ENABLED":
      return { ...state, captionsEnabled: action.payload };
    case "SET_CAPTIONS_LANGUAGE":
      return { ...state, captionsLanguage: action.payload };
    case "SET_IS_HOST":
      return { ...state, isHost: action.payload };
    case "SET_TTS_ENABLED":
      return { ...state, ttsEnabled: action.payload };
    case "SET_TTS_VOICE_ID":
      return { ...state, ttsVoiceId: action.payload };
    default:
      // Ensure exhaustive check
      const _: never = action;
      throw new Error(`Unknown action: ${JSON.stringify(action)}`);
  }
};

// Context
export const PartyStateContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// Custom hook for using the context
export const usePartyState = () => {
  const context = useContext(PartyStateContext);
  if (!context) {
    throw new Error("usePartyState must be used within a PartyProvider");
  }
  return context;
};
