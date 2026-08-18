// @ts-nocheck
/**
 * Samsta Orbit identity layer — a social profile that is completely separate
 * from the main Samsta profile (own username, followers, DMs, reputation).
 */
import { supabase as raw } from "@/integrations/supabase/client";

const sb = raw as any;

export type OrbitProfile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  avatar_video_url: string | null;
  cover_url: string | null;
  website: string | null;
  location: string | null;
  profession: string | null;
  education: string | null;
  interests: string[];
  birthday: string | null;
  creator_category: string | null;
  verification_requested: boolean;
  is_verified: boolean;
  reputation_score: number;
  follower_count: number;
  following_count: number;
  post_count: number;
};

export async function getMyOrbitProfile(userId: string | null): Promise<OrbitProfile | null> {
  if (!userId) return null;
  const { data } = await sb.from("orbit_profiles").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

export async function getOrbitProfileByUsername(username: string): Promise<OrbitProfile | null> {
  const { data } = await sb.from("orbit_profiles").select("*").eq("username", username).maybeSingle();
  return data ?? null;
}

export async function usernameAvailable(username: string): Promise<boolean> {
  const u = username.trim().toLowerCase();
  if (u.length < 3) return false;
  const { data } = await sb.from("orbit_profiles").select("id").eq("username", u).maybeSingle();
  return !data;
}

export async function saveOrbitProfile(userId: string, input: Partial<OrbitProfile>): Promise<OrbitProfile> {
  const payload: any = {
    user_id: userId,
    username: (input.username ?? "").trim().toLowerCase().replace(/[^a-z0-9._]/g, ""),
    display_name: (input.display_name ?? "").trim(),
    bio: input.bio?.trim() || null,
    avatar_url: input.avatar_url || null,
    avatar_video_url: input.avatar_video_url || null,
    cover_url: input.cover_url || null,
    website: input.website?.trim() || null,
    location: input.location?.trim() || null,
    profession: input.profession?.trim() || null,
    education: input.education?.trim() || null,
    interests: input.interests ?? [],
    birthday: input.birthday || null,
    creator_category: input.creator_category || null,
    verification_requested: !!input.verification_requested,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb
    .from("orbit_profiles")
    .upsert(payload, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Orbit-only follow graph. */
export async function isOrbitFollowing(meId: string, targetId: string) {
  const { data } = await sb.from("orbit_follows").select("id")
    .eq("follower_id", meId).eq("following_id", targetId).maybeSingle();
  return !!data;
}

export async function toggleOrbitFollow(meId: string, targetId: string, on: boolean) {
  if (on) {
    const { error } = await sb.from("orbit_follows").insert({ follower_id: meId, following_id: targetId });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    await sb.from("orbit_follows").delete().eq("follower_id", meId).eq("following_id", targetId);
  }
}

export async function orbitSuggestions(meId: string | null, limit = 12): Promise<OrbitProfile[]> {
  let q = sb.from("orbit_profiles").select("*").order("reputation_score", { ascending: false }).limit(limit);
  if (meId) q = q.neq("user_id", meId);
  const { data } = await q;
  return data ?? [];
}

/** Orbit inbox (separate from Samsta messages). */
export type OrbitThread = {
  id: string; title: string | null; is_group: boolean; last_message_at: string;
  preview?: string | null; peer?: OrbitProfile | null;
};

export async function listOrbitThreads(userId: string | null): Promise<OrbitThread[]> {
  if (!userId) return [];
  const { data: mem } = await sb.from("orbit_thread_members").select("thread_id").eq("user_id", userId);
  const ids = (mem ?? []).map((m: any) => m.thread_id);
  if (!ids.length) return [];
  const { data: threads } = await sb.from("orbit_threads").select("*")
    .in("id", ids).order("last_message_at", { ascending: false });
  const { data: last } = await sb.from("orbit_dms").select("thread_id, body, created_at")
    .in("thread_id", ids).order("created_at", { ascending: false }).limit(200);
  const preview = new Map<string, string>();
  for (const m of last ?? []) if (!preview.has(m.thread_id)) preview.set(m.thread_id, m.body ?? "Attachment");
  return (threads ?? []).map((t: any) => ({ ...t, preview: preview.get(t.id) ?? null }));
}

/** Notifications derived from Orbit activity on my posts — no extra polling table. */
export type OrbitNotification = {
  id: string; kind: "like" | "reply" | "repost" | "follow"; created_at: string;
  actor?: OrbitProfile | null; text: string; postId?: string | null;
};

export async function listOrbitNotifications(userId: string | null): Promise<OrbitNotification[]> {
  if (!userId) return [];
  const { data: mine } = await sb.from("orbit_posts").select("id").eq("user_id", userId).limit(200);
  const postIds = (mine ?? []).map((p: any) => p.id);

  const [likes, replies, follows] = await Promise.all([
    postIds.length
      ? sb.from("orbit_likes").select("id, user_id, post_id, created_at")
          .in("post_id", postIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(40)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? sb.from("orbit_posts").select("id, user_id, parent_id, body, created_at")
          .in("parent_id", postIds).neq("user_id", userId).order("created_at", { ascending: false }).limit(40)
      : Promise.resolve({ data: [] }),
    sb.from("orbit_follows").select("id, follower_id, created_at")
      .eq("following_id", userId).order("created_at", { ascending: false }).limit(40),
  ]);

  const actorIds = [
    ...(likes.data ?? []).map((r: any) => r.user_id),
    ...(replies.data ?? []).map((r: any) => r.user_id),
    ...(follows.data ?? []).map((r: any) => r.follower_id),
  ];
  const actors = new Map<string, OrbitProfile>();
  if (actorIds.length) {
    const { data } = await sb.from("orbit_profiles").select("*").in("user_id", [...new Set(actorIds)]);
    for (const p of data ?? []) actors.set(p.user_id, p);
  }

  const items: OrbitNotification[] = [
    ...(likes.data ?? []).map((r: any) => ({
      id: `l_${r.id}`, kind: "like" as const, created_at: r.created_at,
      actor: actors.get(r.user_id) ?? null, text: "orbited your post", postId: r.post_id,
    })),
    ...(replies.data ?? []).map((r: any) => ({
      id: `r_${r.id}`, kind: "reply" as const, created_at: r.created_at,
      actor: actors.get(r.user_id) ?? null, text: r.body ? `replied: ${r.body.slice(0, 60)}` : "replied to you",
      postId: r.parent_id,
    })),
    ...(follows.data ?? []).map((r: any) => ({
      id: `f_${r.id}`, kind: "follow" as const, created_at: r.created_at,
      actor: actors.get(r.follower_id) ?? null, text: "started orbiting you", postId: null,
    })),
  ];
  return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 60);
}
