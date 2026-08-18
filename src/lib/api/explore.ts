// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { getHiddenUserIds } from "@/lib/api/safety";

export type ExploreItem = {
  id: string;
  user_id: string;
  kind: "post" | "reel";
  media_first: { path: string; type: string; bucket?: string } | null;
  caption: string | null;
  created_at: string;
  score: number;
};

/** Trending posts + reels ranked by (likes + 2*comments) over the last 7 days. */
export async function getExplore(currentUserId?: string | null): Promise<ExploreItem[]> {
  // Ranking happens in Postgres so we never pull thousands of like/comment
  // rows into the browser just to sort a grid of 60 tiles.
  const [{ data: ranked }, hidden] = await Promise.all([
    supabase.rpc("trending_post_ids", { _kinds: ["post", "reel"], _days: 7, _limit: 120 }),
    currentUserId ? getHiddenUserIds(currentUserId) : Promise.resolve(new Set<string>()),
  ]);
  const order = (ranked ?? []) as Array<{ id: string; score: number }>;
  if (!order.length) return [];

  const scoreById = new Map(order.map((r) => [r.id, Number(r.score)]));
  const { data: posts } = await supabase
    .from("posts")
    .select("id, user_id, kind, media, caption, created_at")
    .in("id", order.map((r) => r.id));

  const items: ExploreItem[] = (posts ?? [])
    .filter((p) => !hidden.has(p.user_id))
    .map((p) => {
      const media = Array.isArray(p.media) ? p.media : [];
      return {
        id: p.id,
        user_id: p.user_id,
        kind: p.kind,
        media_first: media[0] ?? null,
        caption: p.caption,
        created_at: p.created_at,
        score: scoreById.get(p.id) ?? 0,
      };
    });

  items.sort((a, b) => b.score - a.score);
  return items.slice(0, 60);
}

/** Trending hashtags from the last 7 days. */
export async function getTrendingHashtags(): Promise<Array<{ tag: string; count: number }>> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("posts")
    .select("hashtags")
    .gte("created_at", since)
    .not("hashtags", "is", null)
    .limit(500);
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    for (const t of r.hashtags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}
