import { NextRequest, NextResponse } from "next/server";
import { AccessTokenOptions, VideoGrant, AccessToken } from "livekit-server-sdk";

export interface TokenResult {
  identity: string;
  token: string;
  serverUrl: string;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;
const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL!;

export async function GET(request: NextRequest) {
  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Environment variables aren't set up correctly" },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const partyId = searchParams.get("party_id")!;
  const userName = searchParams.get("name")!;
  const host = searchParams.get("host")! === "true";

  const grant: VideoGrant = {
    room: partyId,
    roomJoin: true,
    canPublish: host,
    canPublishData: true,
    canSubscribe: true,
    canUpdateOwnMetadata: true,
  };

  const at = new AccessToken(apiKey, apiSecret, { identity: userName });
  at.addGrant(grant);

  const token = await at.toJwt();

  const result: TokenResult = {
    identity: userName,
    token,
    serverUrl,
  };

  return NextResponse.json(result);
}
