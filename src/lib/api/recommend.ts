// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";
import { listPostsByIds, listTrendingReels, type FeedPost } from "@/lib/api/feed";

const supabase = rawSupabase as any;

export type ReelEvent =
  | "view" | "skip" | "replay" | "like" | "share" | "save" | "comment"
  | "follow" | "profile_visit" | "search" | "unmute" | "mute" | "fullscreen";

export type RecommendedReel = FeedPost & { score?: number; reason?: string };

/** Cold-start interest catalogue shown to brand-new users. */

/** Fire-and-forget behaviour signal. Never throws — tracking must not break playback. */
export function trackReelEvent(
  postId: string | null,
  event: ReelEvent,
  opts: { watchMs?: number; durationMs?: number; meta?: Record<string, unknown> } = {},
): void {
  try {
    void supabase.rpc("record_reel_event", {
      p_post_id: postId,
      p_event: event,
      p_watch_ms: Math.round(opts.watchMs ?? 0),
      p_duration_ms: Math.round(opts.durationMs ?? 0),
      p_meta: {
        ...(opts.meta ?? {}),
        tz_offset: new Date().getTimezoneOffset(),
        hour: new Date().getHours(),
        lang: typeof navigator !== "undefined" ? navigator.language : null,
      },
    });
  } catch {
    /* ignore */
  }
}

/** Live interest profile, highest score first, normalised to 0-100%. */
export async function getInterestProfile(
  userId: string,
): Promise<Array<{ topic: string; percent: number }>> {
  const { data } = await supabase
    .from("user_interests")
    .select("topic, score")
    .eq("user_id", userId)
    .order("score", { ascending: false })
    .limit(30);
  const rows = (data ?? []).filter((r: any) => Number(r.score) > 0);
  if (!rows.length) return [];
  const max = Math.max(...rows.map((r: any) => Number(r.score)));
  return rows.map((r: any) => ({
    topic: r.topic,
    percent: Math.round((Number(r.score) / max) * 100),
  }));
}



/**
 * Personalised reel page. Ranking runs in the database (interest match, watch
 * retention, engagement, trending, freshness, creator diversity, seen-penalty)
 * so one round-trip returns the next batch.
 */
export async function getRecommendedReels(
  limit = 8,
  exclude: string[] = [],
): Promise<RecommendedReel[]> {
  const { data, error } = await supabase.rpc("recommend_reels", {
    p_limit: limit,
    p_exclude: exclude.slice(-200),
  });
  if (error || !data?.length) {
    // Fallback keeps the feed alive for signed-out or empty-profile sessions.
    const trending = await listTrendingReels();
    return trending.filter((r) => !exclude.includes(r.id)).slice(0, limit);
  }
  const ids = data.map((d: any) => d.post_id as string);
  const meta = new Map(data.map((d: any) => [d.post_id, d]));
  const posts = await listPostsByIds(ids);
  return posts.map((p) => ({
    ...p,
    score: Number(meta.get(p.id)?.score ?? 0),
    reason: meta.get(p.id)?.reason as string | undefined,
  }));
}

/**
 * "More like this": once a viewer watches half (or holds) a reel, pull reels
 * that share its topics so the very next swipes stay on the same vibe.
 */
export async function getRelatedReels(
  postId: string,
  limit = 5,
  exclude: string[] = [],
): Promise<RecommendedReel[]> {
  const { data: seed } = await supabase
    .from("post_topics")
    .select("topic")
    .eq("post_id", postId);
  const topics = (seed ?? []).map((t: any) => t.topic as string);
  if (!topics.length) return [];

  const { data: rows } = await supabase
    .from("post_topics")
    .select("post_id")
    .in("topic", topics)
    .limit(300);
  const ids = Array.from(new Set((rows ?? []).map((r: any) => r.post_id as string)))
    .filter((id) => id !== postId && !exclude.includes(id))
    .slice(0, limit);
  if (!ids.length) return [];

  const posts = await listPostsByIds(ids);
  return posts.map((p) => ({ ...p, reason: "related" }));
}
