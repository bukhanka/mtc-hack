import { NextRequest } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech";
const ELEVENLABS_WS_URL = "wss://api.elevenlabs.io/v1/text-to-speech";

// Simple in-memory request deduplication cache
const requestCache = new Map<string, { timestamp: number, promise: Promise<Response> }>();
const CACHE_TTL = 2000; // 2 seconds TTL for cached responses

function getCacheKey(text: string, voiceId: string): string {
  return `${voiceId}:${Buffer.from(text).toString('base64')}`;
}

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}

async function generateSpeech(text: string, voiceId: string, requestTimestamp: string): Promise<Response> {
  const apiStartTime = Date.now();
  console.log(`[TTS API] [${requestTimestamp}] Calling ElevenLabs API...`, {
    endpoint: `${ELEVENLABS_API_URL}/${voiceId}`,
    requestSize: JSON.stringify({ text }).length,
    timestamp: new Date().toISOString()
  });

  const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": ELEVENLABS_API_KEY || "",
      "Accept": "audio/mpeg",
    } as HeadersInit,
    body: JSON.stringify({
      text,
      model_id: "eleven_flash_v2_5",
      output_format: "mp3_44100_128",
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        optimize_streaming_latency: 3, // Enable streaming optimization
      },
    }),
  });

  const apiEndTime = Date.now();
  console.log(`[TTS API] [${requestTimestamp}] ElevenLabs API response:`, {
    status: response.status,
    ok: response.ok,
    duration: apiEndTime - apiStartTime,
    timestamp: new Date().toISOString()
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`[TTS API] [${requestTimestamp}] ElevenLabs API error:`, {
      status: response.status,
      error,
      text: text.substring(0, 100)
    });
    return new Response(
      JSON.stringify({
        error: error.detail?.message || "Failed to generate speech",
      }),
      {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  console.log("[TTS API] Successfully received audio stream from ElevenLabs");
  return new Response(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
    },
  });
}

export async function POST(request: NextRequest) {
  const requestTimestamp = new Date().toISOString();
  console.log(`[TTS API] [${requestTimestamp}] Received request`);
  
  try {
    if (!ELEVENLABS_API_KEY) {
      console.error("[TTS API] Missing API key");
      return new Response(
        JSON.stringify({
          error: "ElevenLabs API key is not configured",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { text, voiceId } = await request.json();
    console.log(`[TTS API] [${requestTimestamp}] Request params:`, { 
      text, 
      voiceId,
      textLength: text.length,
      textHash: Buffer.from(text).toString('base64').slice(0, 10),
      requestId: Math.random().toString(36).substring(7)
    });

    if (!text || !voiceId) {
      const error = "Missing required parameters";
      console.error(`[TTS API] [${requestTimestamp}] Validation error:`, { error, text: !!text, voiceId: !!voiceId });
      return new Response(
        JSON.stringify({ error }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Clean up expired cache entries
    cleanupCache();

    // Check cache for duplicate requests
    const cacheKey = getCacheKey(text, voiceId);
    const cachedResponse = requestCache.get(cacheKey);
    
    if (cachedResponse) {
      console.log(`[TTS API] [${requestTimestamp}] Using cached response for`, { 
        textHash: Buffer.from(text).toString('base64').slice(0, 10),
        age: Date.now() - cachedResponse.timestamp
      });
      return cachedResponse.promise;
    }

    // Generate new speech and cache the promise
    const responsePromise = generateSpeech(text, voiceId, requestTimestamp);
    requestCache.set(cacheKey, {
      timestamp: Date.now(),
      promise: responsePromise
    });

    return responsePromise;
  } catch (e) {
    console.error("[TTS API] Unexpected error:", e);
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