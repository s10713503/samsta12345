// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { sendFollowStatusEmail } from "@/lib/follow-email.functions";
import { sendFollowPush } from "@/lib/push.functions";

/** Fire-and-forget web push so alerts land even when the app is closed. */
async function queueFollowPush(recipientId: string, kind: string) {
  try {
    await sendFollowPush({ data: { recipientId, kind } });
  } catch {
    /* push is best-effort */
  }
}

/** Fire-and-forget email delivery; never blocks the in-app flow. */
async function queueFollowEmail(recipientId: string, actorId: string, kind: string) {
  try {
    await sendFollowStatusEmail({ data: { recipientId, actorId, kind } });
  } catch {
    /* email is best-effort */
  }
}

export type PublicProfile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  is_private: boolean;
};

const PROFILE_COLS =
  "id, username, full_name, avatar_url, bio, is_verified, is_private";

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as PublicProfile | null;
}

export async function getFollowCounts(userId: string) {
  const [followers, following, posts] = await Promise.all([
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId)
      .eq("status", "accepted"),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("status", "accepted"),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("kind", ["post", "reel"])
      .eq("is_archived", false)
      .eq("is_draft", false),

  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    posts: posts.count ?? 0,
  };
}

/** People who follow `userId` (accepted). */
export async function listFollowers(userId: string): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`follower:profiles!follows_follower_profile_fkey(${PROFILE_COLS})`)
    .eq("following_id", userId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ follower: PublicProfile | null }>)
    .map((r) => r.follower)
    .filter((p): p is PublicProfile => !!p);
}

/** People `userId` follows (accepted). */
export async function listFollowing(userId: string): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`followed:profiles!follows_following_profile_fkey(${PROFILE_COLS})`)
    .eq("follower_id", userId)
    .eq("status", "accepted")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ followed: PublicProfile | null }>)
    .map((r) => r.followed)
    .filter((p): p is PublicProfile => !!p);
}

/** Which of `candidateIds` the current user is currently following. */
export async function getFollowingMap(
  currentUserId: string,
  candidateIds: string[],
): Promise<Record<string, boolean>> {
  if (!candidateIds.length) return {};
  const { data, error } = await supabase
    .from("follows")
    .select("following_id, status")
    .eq("follower_id", currentUserId)
    .in("following_id", candidateIds);
  if (error) throw error;
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) {
    map[row.following_id as string] = row.status === "accepted";
  }
  return map;
}

export async function follow(currentUserId: string, targetId: string, isPrivate = false) {
  const { error } = await supabase.from("follows").upsert(
    {
      follower_id: currentUserId,
      following_id: targetId,
      status: isPrivate ? "pending" : "accepted",
    },
    { onConflict: "follower_id,following_id" },
  );
  if (error) throw error;
  // Tell the owner: a pending request needs approval, a public follow is just news.
  await notifyRespectingPrefs({
    recipient_id: targetId,
    actor_id: currentUserId,
    kind: isPrivate ? "follow_request" : "follow",
    target_type: "user",
    target_id: currentUserId,
  });
  if (isPrivate) void queueFollowPush(targetId, "follow_request");
}

/** "none" | "pending" | "accepted" for the current user against a target. */
export async function getFollowStatus(currentUserId: string, targetId: string) {
  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", currentUserId)
    .eq("following_id", targetId)
    .maybeSingle();
  return (data?.status as "pending" | "accepted" | undefined) ?? "none";
}

export async function unfollow(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetId);
  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<PublicProfile, "username" | "full_name" | "bio" | "avatar_url" | "is_private">>,
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

// ============ Follow requests ============
export async function listFollowRequests(userId: string): Promise<PublicProfile[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`follower:profiles!follows_follower_profile_fkey(${PROFILE_COLS})`)
    .eq("following_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ follower: PublicProfile | null }>)
    .map((r) => r.follower)
    .filter((p): p is PublicProfile => !!p);
}

export async function acceptFollowRequest(currentUserId: string, requesterId: string) {
  const { error } = await supabase
    .from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", requesterId)
    .eq("following_id", currentUserId);
  if (error) throw error;
  await notifyRespectingPrefs({
    recipient_id: requesterId,
    actor_id: currentUserId,
    kind: "follow_accepted",
    target_type: "user",
    target_id: currentUserId,
  });
  await queueFollowEmail(requesterId, currentUserId, "follow_accepted");
  void queueFollowPush(requesterId, "follow_accepted");
}

export async function rejectFollowRequest(currentUserId: string, requesterId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", requesterId)
    .eq("following_id", currentUserId);
  if (error) throw error;
  await notifyRespectingPrefs({
    recipient_id: requesterId,
    actor_id: currentUserId,
    kind: "follow_declined",
    target_type: "user",
    target_id: currentUserId,
  });
  await queueFollowEmail(requesterId, currentUserId, "follow_declined");
  void queueFollowPush(requesterId, "follow_declined");
}

// ============ Search ============
export async function searchProfiles(query: string, limit = 50): Promise<PublicProfile[]> {
  const q = query.trim();
  if (!q) return [];
  const clean = q.replace(/[%_]/g, "");
  // Prefer prefix matches (Instagram/Twitter-style: typing "p" shows names starting with p),
  // then fall back to substring matches so partial typing still surfaces results.
  const prefix = `${clean}%`;
  const like = `%${clean}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .or(`username.ilike.${like},full_name.ilike.${like}`)
    .order("is_verified", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as PublicProfile[];
  const starts = (p: PublicProfile) =>
    (p.username ?? "").toLowerCase().startsWith(clean.toLowerCase()) ||
    (p.full_name ?? "").toLowerCase().startsWith(clean.toLowerCase());
  // Sort: prefix matches first, then alphabetical by username.
  return rows.sort((a, b) => {
    const sa = starts(a) ? 0 : 1;
    const sb = starts(b) ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return (a.username ?? "").localeCompare(b.username ?? "");
  });
}

export async function searchByHashtag(tag: string, limit = 30) {
  const clean = tag.replace(/^#/, "").toLowerCase().trim();
  if (!clean) return [];
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, media, kind, created_at, caption")
    .contains("hashtags", [clean])
    .eq("is_archived", false)
    .eq("is_draft", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}



// ============ Notification delivery preferences ============
export type NotifPrefs = {
  follow_approved_push: boolean;
  follow_declined_push: boolean;
  follow_request_push: boolean;
  follow_approved_in_app: boolean;
  follow_approved_email: boolean;
  follow_declined_in_app: boolean;
  follow_declined_email: boolean;
  follow_request_in_app: boolean;
};

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  follow_approved_push: true,
  follow_declined_push: true,
  follow_request_push: true,
  follow_approved_in_app: true,
  follow_approved_email: false,
  follow_declined_in_app: true,
  follow_declined_email: false,
  follow_request_in_app: true,
};

export async function getNotifPrefs(userId: string): Promise<NotifPrefs> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select(
      "follow_approved_in_app, follow_approved_email, follow_declined_in_app, follow_declined_email, follow_request_in_app, follow_approved_push, follow_declined_push, follow_request_push",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_NOTIF_PREFS, ...(data ?? {}) } as NotifPrefs;
}

export async function updateNotifPrefs(userId: string, patch: Partial<NotifPrefs>) {
  const { error } = await supabase
    .from("notification_settings")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}

/** Does the recipient still want this kind of alert in-app? Defaults to yes. */
async function wantsInApp(recipientId: string, kind: string) {
  const { data, error } = await supabase.rpc("notify_pref", {
    _user_id: recipientId,
    _kind: kind,
  });
  if (error) return true;
  return data !== false;
}

/** Insert a notification only when the recipient still wants it in-app. */
export async function notifyRespectingPrefs(row: {
  recipient_id: string;
  actor_id: string;
  kind: string;
  target_type?: string;
  target_id?: string;
}) {
  if (!(await wantsInApp(row.recipient_id, row.kind))) return;
  await (supabase as any).rpc("notify_user", {
    _recipient: row.recipient_id,
    _kind: row.kind,
    _target_type: row.target_type ?? null,
    _target_id: row.target_id ?? null,
  });
}

// ============ Follower management ============
/**
 * Remove an accepted follower: their row is deleted, so RLS immediately stops
 * serving your private posts to them, and they get a status notification.
 */
export async function removeFollower(currentUserId: string, followerId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", currentUserId);
  if (error) throw error;
  await notifyRespectingPrefs({
    recipient_id: followerId,
    actor_id: currentUserId,
    kind: "follow_removed",
    target_type: "user",
    target_id: currentUserId,
  });
}
