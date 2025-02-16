"use client";

import React, { useReducer, use } from "react";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import Party from "@/components/party";
import Lobby from "@/components/lobby";
import { State, reducer, PartyStateContext, Action } from "@/hooks/usePartyState";
import { motion } from "framer-motion";

type PartyIdType = { party_id: string };

type PartyPageProps = {
  params: Promise<PartyIdType>;
};

// Initial state
const initialState: State = {
  token: undefined,
  serverUrl: "",
  shouldConnect: false,
  captionsEnabled: true,
  captionsLanguage: "ru",
  isHost: false,
  ttsEnabled: false,
  ttsVoiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice ID (Rachel)
};

// PartyPage component
export default function PartyPage({ params }: PartyPageProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { party_id } = use<PartyIdType>(params);

  // Log initial party state
  console.log("[Party] Initializing party page:", {
    party_id,
    initialState: {
      ...initialState,
      timestamp: new Date().toISOString()
    }
  });

  // Wrap dispatch to add logging
  const loggedDispatch = (action: Action) => {
    console.log("[Party] State change:", {
      action,
      previousState: state,
      timestamp: new Date().toISOString()
    });
    dispatch(action);
  };

  return (
    <PartyStateContext.Provider value={{ state, dispatch: loggedDispatch }}>
      <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
        <LiveKitRoom
          token={state.token}
          serverUrl={state.serverUrl}
          connect={state.shouldConnect}
          audio={state.isHost}
          className="w-full min-h-screen flex items-center justify-center p-4"
        >
          <div className="w-full max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              {state.shouldConnect ? <Party /> : <Lobby partyId={party_id} />}
            </motion.div>
          </div>
        </LiveKitRoom>
      </div>
    </PartyStateContext.Provider>
  );
}
