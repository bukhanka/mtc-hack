import { NextRequest, NextResponse } from "next/server";

import {
  AccessTokenOptions,
  VideoGrant,
  AccessToken,
  RoomServiceClient,
} from "livekit-server-sdk";

export interface TokenResult {
  identity: string;
  token: string;
  serverUrl: string;
}

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const livekitHost = process.env.NEXT_PUBLIC_LIVEKIT_URL!.replace(
  "wss://",
  "https://"
);

const roomService = new RoomServiceClient(livekitHost);

const createToken = (userInfo: AccessTokenOptions, grant: VideoGrant) => {
  const timestamp = new Date().toISOString();
  console.log(`[Token] [${timestamp}] Creating token:`, {
    identity: userInfo.identity,
    grant,
    metadata: userInfo.metadata
  });

  const at = new AccessToken(apiKey, apiSecret, userInfo);
  at.addGrant(grant);
  const token = at.toJwt();

  console.log(`[Token] [${timestamp}] Token created successfully for:`, {
    identity: userInfo.identity,
    tokenLength: token.length,
    grantType: grant.canPublish ? 'host' : 'participant'
  });

  return token;
};

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const timestamp = new Date().toISOString();
  
  try {
    console.log(`[Token API] [${timestamp}] [${requestId}] Received token request`);

    if (!apiKey || !apiSecret) {
      console.error(`[Token API] [${timestamp}] [${requestId}] Missing API credentials`);
      return new Response(
        JSON.stringify({
          error: "Environment variables aren't set up correctly",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { searchParams } = request.nextUrl;
    const partyId = searchParams.get("party_id")!;
    const userName = searchParams.get("name")!;
    const host = searchParams.get("host")! === "true";

    console.log(`[Token API] [${timestamp}] [${requestId}] Request params:`, {
      partyId,
      userName,
      host,
      url: request.url
    });

    const roomName = partyId;
    const identity = userName;

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: host,
      canPublishData: true,
      canSubscribe: true,
      canUpdateOwnMetadata: true,
    };
    const userInfo: AccessTokenOptions = {
      identity,
      metadata: JSON.stringify({
        requestId,
        timestamp,
        isHost: host
      })
    };

    console.log(`[Token API] [${timestamp}] [${requestId}] Generating token for:`, {
      room: roomName,
      identity,
      isHost: host
    });

    const token = await createToken(userInfo, grant);

    const result: TokenResult = {
      identity,
      token,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
    };

    console.log(`[Token API] [${timestamp}] [${requestId}] Token generated successfully:`, {
      identity,
      room: roomName,
      isHost: host,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (e) {
    console.error(`[Token API] [${timestamp}] [${requestId}] Error generating token:`, {
      error: (e as Error).message,
      stack: (e as Error).stack
    });

    return new Response(
      JSON.stringify({
        error: (e as Error).message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
