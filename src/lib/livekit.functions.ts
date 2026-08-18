// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mint a LiveKit access token so an authenticated user can join a room.
 * Requires 3 env vars: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
 */
export const mintLivekitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      room: z.string().min(1).max(120),
      identity: z.string().min(1).max(120).optional(),
      name: z.string().min(1).max(120).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const url = process.env.LIVEKIT_URL;
    const key = process.env.LIVEKIT_API_KEY;
    const secret = process.env.LIVEKIT_API_SECRET;
    if (!url || !key || !secret) {
      return { ok: false as const, error: "livekit_not_configured" };
    }
    const { AccessToken } = await import("livekit-server-sdk");
    const at = new AccessToken(key, secret, {
      identity: data.identity || context.userId,
      name: data.name || undefined,
      ttl: 60 * 60, // 1h
    });
    at.addGrant({
      room: data.room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    return { ok: true as const, url, token, room: data.room };
  });