// @ts-nocheck
/**
 * Samsta Orbit — real-time conversation layer.
 * Cursor-paginated reads, batched author hydration, zero duplicate lookups.
 */
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export type OrbitKind = "text" | "photo" | "video" | "voice" | "podcast" | "poll";

export type OrbitAuthor = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_verified?: boolean | null;
};

export type OrbitPost = {
  id: string;
  user_id: string;
  kind: OrbitKind;
  body: string | null;
  title: string | null;
  media_url: string | null;
  poster_url: string | null;
  duration_seconds: number | null;
  link_url: string | null;
  city: string | null;
  parent_id: string | null;
  root_id: string | null;
  quote_of: string | null;
  repost_of: string | null;
  community_id: string | null;
  is_live: boolean;
  is_pinned: boolean;
  is_edited: boolean;
  like_count: number;
  reply_count: number;
  repost_count: number;
  hot_score: number;
  created_at: string;
  author?: OrbitAuthor | null;
  liked?: boolean;
  bookmarked?: boolean;
  quoted?: OrbitPost | null;
  options?: OrbitPollOption[];
  myVote?: string | null;
};

export type OrbitPollOption = { id: string; post_id: string; label: string; position: number; vote_count: number };
export type OrbitTopic = { id: string; slug: string; label: string; post_count: number; score: number };
export type OrbitCommunity = {
  id: string; slug: string; name: string; description: string | null;
  accent: string | null; member_count: number;
};

export const PAGE_SIZE = 12;

const COLS =
  "id, user_id, kind, body, title, media_url, poster_url, duration_seconds, link_url, city, parent_id, root_id, quote_of, repost_of, community_id, is_live, is_pinned, is_edited, like_count, reply_count, repost_count, hot_score, created_at";

// ---------- author hydration (one query per page, cached) ----------
const authorCache = new Map<string, OrbitAuthor>();

async function hydrate(rows: any[], userId: string | null): Promise<OrbitPost[]> {
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.user_id))].filter((id) => !authorCache.has(id));
  if (ids.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);
    for (const p of data ?? []) authorCache.set(p.id, p);
  }

  const postIds = rows.map((r) => r.id);
  const [likes, marks, quotes, options, votes] = await Promise.all([
    userId
      ? supabase.from("orbit_likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    userId
      ? supabase.from("orbit_bookmarks").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    (() => {
      const q = rows.map((r) => r.quote_of).filter(Boolean);
      return q.length ? supabase.from("orbit_posts").select(COLS).in("id", q) : Promise.resolve({ data: [] });
    })(),
    (() => {
      const p = rows.filter((r) => r.kind === "poll").map((r) => r.id);
      return p.length
        ? supabase.from("orbit_poll_options").select("*").in("post_id", p).order("position")
        : Promise.resolve({ data: [] });
    })(),
    userId
      ? supabase.from("orbit_poll_votes").select("post_id, option_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
  ]);

  const likeSet = new Set((likes.data ?? []).map((r: any) => r.post_id));
  const markSet = new Set((marks.data ?? []).map((r: any) => r.post_id));
  const voteMap = new Map((votes.data ?? []).map((r: any) => [r.post_id, r.option_id]));
  const quoteMap = new Map<string, any>();
  for (const q of quotes.data ?? []) quoteMap.set(q.id, { ...q, author: authorCache.get(q.user_id) ?? null });
  const optMap = new Map<string, OrbitPollOption[]>();
  for (const o of options.data ?? []) {
    const list = optMap.get(o.post_id) ?? [];
    list.push(o);
    optMap.set(o.post_id, list);
  }

  // quote authors that weren't in the main page
  const missing = [...quoteMap.values()].filter((q) => !q.author).map((q) => q.user_id);
  if (missing.length) {
    const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", missing);
    for (const p of data ?? []) authorCache.set(p.id, p);
    for (const q of quoteMap.values()) if (!q.author) q.author = authorCache.get(q.user_id) ?? null;
  }

  return rows.map((r) => ({
    ...r,
    author: authorCache.get(r.user_id) ?? null,
    liked: likeSet.has(r.id),
    bookmarked: markSet.has(r.id),
    quoted: r.quote_of ? quoteMap.get(r.quote_of) ?? null : null,
    options: optMap.get(r.id) ?? undefined,
    myVote: voteMap.get(r.id) ?? null,
  }));
}

export type OrbitLane =
  | "foryou" | "following" | "trending" | "local" | "podcasts"
  | "live" | "new" | "viral" | "bookmarks";

export async function listOrbit(opts: {
  lane: OrbitLane;
  userId: string | null;
  cursor?: string | null;
  topic?: string | null;
  communityId?: string | null;
  city?: string | null;
}): Promise<{ items: OrbitPost[]; nextCursor: string | null }> {
  const { lane, userId, cursor, topic, communityId, city } = opts;

  if (lane === "bookmarks") {
    if (!userId) return { items: [], nextCursor: null };
    const { data: marks } = await supabase
      .from("orbit_bookmarks").select("post_id").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(PAGE_SIZE);
    const ids = (marks ?? []).map((m: any) => m.post_id);
    if (!ids.length) return { items: [], nextCursor: null };
    const { data } = await supabase.from("orbit_posts").select(COLS).in("id", ids).is("deleted_at", null);
    return { items: await hydrate(data ?? [], userId), nextCursor: null };
  }

  let postIds: string[] | null = null;
  if (topic) {
    const { data: t } = await supabase.from("orbit_topics").select("id").eq("slug", topic).maybeSingle();
    if (!t) return { items: [], nextCursor: null };
    const { data: pt } = await supabase.from("orbit_post_topics").select("post_id").eq("topic_id", t.id).limit(400);
    postIds = (pt ?? []).map((r: any) => r.post_id);
    if (!postIds.length) return { items: [], nextCursor: null };
  }

  if (lane === "following" && userId) {
    const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", userId).limit(1000);
    const authors = (f ?? []).map((r: any) => r.following_id);
    if (!authors.length) return { items: [], nextCursor: null };
    let q = supabase.from("orbit_posts").select(COLS).is("deleted_at", null).is("parent_id", null)
      .in("user_id", authors).order("created_at", { ascending: false }).limit(PAGE_SIZE);
    if (cursor) q = q.lt("created_at", cursor);
    const { data } = await q;
    const items = await hydrate(data ?? [], userId);
    return { items, nextCursor: items.length === PAGE_SIZE ? items[items.length - 1].created_at : null };
  }

  let q = supabase.from("orbit_posts").select(COLS).is("deleted_at", null).is("parent_id", null);
  if (postIds) q = q.in("id", postIds);
  if (communityId) q = q.eq("community_id", communityId);
  if (lane === "podcasts") q = q.in("kind", ["podcast", "voice"]);
  if (lane === "live") q = q.eq("is_live", true);
  if (lane === "local" && city) q = q.ilike("city", city);

  const hot = lane === "trending" || lane === "viral" || lane === "foryou";
  if (hot) {
    q = q.order("hot_score", { ascending: false }).order("created_at", { ascending: false });
  } else {
    q = q.order("created_at", { ascending: false });
    if (cursor) q = q.lt("created_at", cursor);
  }
  q = q.limit(PAGE_SIZE + (hot && cursor ? Number(cursor) : 0));

  const { data, error } = await q;
  if (error) throw error;
  let rows = data ?? [];
  if (hot && cursor) rows = rows.slice(Number(cursor));
  const items = await hydrate(rows, userId);
  const nextCursor = hot
    ? items.length === PAGE_SIZE ? String(Number(cursor ?? 0) + PAGE_SIZE) : null
    : items.length === PAGE_SIZE ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}

export async function getOrbitPost(id: string, userId: string | null): Promise<OrbitPost | null> {
  const { data } = await supabase.from("orbit_posts").select(COLS).eq("id", id).is("deleted_at", null).maybeSingle();
  if (!data) return null;
  const [p] = await hydrate([data], userId);
  return p;
}

export async function listReplies(rootId: string, userId: string | null): Promise<OrbitPost[]> {
  const { data } = await supabase
    .from("orbit_posts").select(COLS)
    .or(`root_id.eq.${rootId},parent_id.eq.${rootId}`)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);
  return hydrate(data ?? [], userId);
}

// ---------- writes ----------
const HASHTAG = /#([\p{L}\p{N}_]{2,30})/gu;

export function extractTags(text: string): string[] {
  return [...new Set([...(text.matchAll(HASHTAG) as any)].map((m: any) => m[1].toLowerCase()))].slice(0, 8);
}

async function linkTopics(postId: string, text: string) {
  const tags = extractTags(text);
  if (!tags.length) return;
  for (const slug of tags) {
    let { data: t } = await supabase.from("orbit_topics").select("id, post_count, score").eq("slug", slug).maybeSingle();
    if (!t) {
      const ins = await supabase.from("orbit_topics")
        .insert({ slug, label: slug, post_count: 1, score: 1 }).select("id").maybeSingle();
      t = ins.data;
    } else {
      await supabase.from("orbit_topics")
        .update({ post_count: t.post_count + 1, score: t.score + 1 }).eq("id", t.id);
    }
    if (t?.id) await supabase.from("orbit_post_topics").insert({ post_id: postId, topic_id: t.id });
  }
}

export async function createOrbitPost(input: {
  userId: string;
  kind: OrbitKind;
  body?: string;
  title?: string;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  durationSeconds?: number | null;
  city?: string | null;
  parentId?: string | null;
  rootId?: string | null;
  quoteOf?: string | null;
  repostOf?: string | null;
  communityId?: string | null;
  pollOptions?: string[];
}): Promise<OrbitPost> {
  const { data, error } = await supabase
    .from("orbit_posts")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      body: input.body?.trim() || null,
      title: input.title?.trim() || null,
      media_url: input.mediaUrl ?? null,
      poster_url: input.posterUrl ?? null,
      duration_seconds: input.durationSeconds ?? null,
      city: input.city ?? null,
      parent_id: input.parentId ?? null,
      root_id: input.rootId ?? input.parentId ?? null,
      quote_of: input.quoteOf ?? null,
      repost_of: input.repostOf ?? null,
      community_id: input.communityId ?? null,
    })
    .select(COLS)
    .single();
  if (error) throw error;
  if (input.kind === "poll" && input.pollOptions?.length) {
    await supabase.from("orbit_poll_options").insert(
      input.pollOptions.filter((l) => l.trim()).map((label, position) => ({ post_id: data.id, label: label.trim(), position })),
    );
  }
  if (input.body) await linkTopics(data.id, input.body);
  // Publishing counts as activity: keeps this account (and its content)
  // out of the 6-month inactivity cleanup.
  void (supabase as any).rpc("touch_last_active");
  const [p] = await hydrate([data], input.userId);
  return p;
}

export async function toggleOrbitLike(postId: string, userId: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from("orbit_likes").insert({ post_id: postId, user_id: userId });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase.from("orbit_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  }
}

export async function toggleOrbitBookmark(postId: string, userId: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from("orbit_bookmarks").insert({ post_id: postId, user_id: userId });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase.from("orbit_bookmarks").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  }
}

export async function repostOrbit(postId: string, userId: string) {
  return createOrbitPost({ userId, kind: "text", repostOf: postId });
}

export async function voteOrbitPoll(postId: string, optionId: string, userId: string) {
  await supabase.from("orbit_poll_votes").delete().eq("post_id", postId).eq("user_id", userId);
  const { error } = await supabase.from("orbit_poll_votes").insert({ post_id: postId, user_id: userId, option_id: optionId });
  if (error) throw error;
}

export async function deleteOrbitPost(postId: string) {
  const { error } = await supabase.from("orbit_posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId);
  if (error) throw error;
}

export async function editOrbitPost(postId: string, body: string) {
  const { error } = await supabase.from("orbit_posts").update({ body, is_edited: true }).eq("id", postId);
  if (error) throw error;
}

// ---------- discovery ----------
export async function listTopics(limit = 14): Promise<OrbitTopic[]> {
  const { data } = await supabase.from("orbit_topics").select("*").order("score", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function listCommunities(): Promise<OrbitCommunity[]> {
  const { data } = await supabase.from("orbit_communities").select("*").order("member_count", { ascending: false }).limit(30);
  return data ?? [];
}

export async function myCommunityIds(userId: string): Promise<string[]> {
  const { data } = await supabase.from("orbit_community_members").select("community_id").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.community_id);
}

export async function toggleCommunity(communityId: string, userId: string, join: boolean) {
  if (join) {
    const { error } = await supabase.from("orbit_community_members").insert({ community_id: communityId, user_id: userId });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    await supabase.from("orbit_community_members").delete().eq("community_id", communityId).eq("user_id", userId);
  }
}

export async function searchOrbit(term: string, userId: string | null): Promise<OrbitPost[]> {
  const t = term.trim();
  if (!t) return [];
  const { data } = await supabase
    .from("orbit_posts").select(COLS)
    .is("deleted_at", null)
    .or(`body.ilike.%${t}%,title.ilike.%${t}%`)
    .order("hot_score", { ascending: false })
    .limit(30);
  return hydrate(data ?? [], userId);
}

/** Live counters: every subscriber gets its own channel so nothing is dropped. */
export function subscribeOrbit(onChange: () => void) {
  const ch = supabase.channel(`orbit-realtime-${Math.random().toString(36).slice(2)}`);
  for (const table of ["orbit_posts", "orbit_likes", "orbit_bookmarks", "orbit_poll_votes"]) {
    ch.on("postgres_changes", { event: "*", schema: "public", table }, onChange);
  }
  ch.subscribe();
  return () => { supabase.removeChannel(ch); };
}
