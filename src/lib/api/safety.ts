// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type MuteScope = "posts" | "stories" | "all";

/** IDs the current user has blocked, and IDs that have blocked the current user. */
export async function getBlockedIds(
  userId: string,
): Promise<{ blockedByMe: string[]; blockedMe: string[] }> {
  if (!userId) return { blockedByMe: [], blockedMe: [] };
  const { data } = await supabase
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const blockedByMe: string[] = [];
  const blockedMe: string[] = [];
  for (const r of data ?? []) {
    if (r.blocker_id === userId) blockedByMe.push(r.blocked_id);
    else if (r.blocked_id === userId) blockedMe.push(r.blocker_id);
  }
  return { blockedByMe, blockedMe };
}

/** IDs that the current user has muted (any scope). */
export async function getMutedIds(userId: string, scope: MuteScope = "all"): Promise<string[]> {
  if (!userId) return [];
  const q = supabase.from("user_mutes").select("muted_id, scope").eq("muter_id", userId);
  const { data } = await q;
  return (data ?? [])
    .filter((r) => scope === "all" || r.scope === "all" || r.scope === scope)
    .map((r) => r.muted_id as string);
}

/** Combined hidden set: blocks (both directions) + mutes for the given scope. */
export async function getHiddenUserIds(
  userId: string,
  scope: MuteScope = "all",
): Promise<Set<string>> {
  if (!userId) return new Set();
  const [{ blockedByMe, blockedMe }, muted] = await Promise.all([
    getBlockedIds(userId),
    getMutedIds(userId, scope),
  ]);
  return new Set<string>([...blockedByMe, ...blockedMe, ...muted]);
}

export async function blockUser(currentUserId: string, targetId: string) {
  if (currentUserId === targetId) return;
  // Remove any existing follow both directions
  await supabase
    .from("follows")
    .delete()
    .or(
      `and(follower_id.eq.${currentUserId},following_id.eq.${targetId}),and(follower_id.eq.${targetId},following_id.eq.${currentUserId})`,
    );
  const { error } = await supabase
    .from("user_blocks")
    .upsert({ blocker_id: currentUserId, blocked_id: targetId }, { onConflict: "blocker_id,blocked_id" });
  if (error) throw error;
}

export async function unblockUser(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", currentUserId)
    .eq("blocked_id", targetId);
  if (error) throw error;
}

export async function muteUser(
  currentUserId: string,
  targetId: string,
  scope: MuteScope = "all",
) {
  if (currentUserId === targetId) return;
  const { error } = await supabase
    .from("user_mutes")
    .upsert({ muter_id: currentUserId, muted_id: targetId, scope }, { onConflict: "muter_id,muted_id" });
  if (error) throw error;
}

export async function unmuteUser(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from("user_mutes")
    .delete()
    .eq("muter_id", currentUserId)
    .eq("muted_id", targetId);
  if (error) throw error;
}

export type ReportReason =
  | "spam"
  | "harassment"
  | "hate"
  | "nudity"
  | "violence"
  | "self-harm"
  | "scam"
  | "impersonation"
  | "other";

export async function reportContent(input: {
  reporterId: string;
  ownerId?: string;
  targetType: "post" | "reel" | "story" | "comment" | "profile" | "message";
  targetId: string;
  reason: ReportReason;
  details?: string;
}) {
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    owner_id: input.ownerId ?? null,
    reason: input.reason,
    details: input.details ?? null,
    status: "open",
  });
  if (error) throw error;
}

export async function listBlocked(userId: string) {
  const { data, error } = await supabase
    .from("user_blocks")
    .select(
      "created_at, blocked:profiles!user_blocks_blocked_id_fkey(id, username, full_name, avatar_url)",
    )
    .eq("blocker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    created_at: string;
    blocked: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
  }>;
}

// ============ Moderation queue ============
export type ReportRow = {
  id: string;
  reporter_id: string;
  owner_id: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution: string | null;
  created_at: string;
  reviewed_at: string | null;
};

/** Reports visible to me: ones I filed, ones about my content, all if admin. */
export async function listReports(
  filter: "open" | "reviewed" | "all" = "open",
): Promise<ReportRow[]> {
  let q = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(200);
  if (filter === "open") q = q.eq("status", "open");
  if (filter === "reviewed") q = q.neq("status", "open");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ReportRow[];
}

export async function reviewReport(
  reportId: string,
  reviewerId: string,
  status: "actioned" | "dismissed",
  resolution?: string,
) {
  const { error } = await supabase
    .from("reports")
    .update({
      status,
      resolution: resolution ?? null,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) throw error;
}

export async function isModerator(userId: string): Promise<boolean> {
  if (!userId) return false;
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);
  return (data ?? []).length > 0;
}

/** Am I blocked by, or have I blocked, this person? */
export async function isBlockedWith(currentUserId: string, otherId: string): Promise<boolean> {
  if (!currentUserId || !otherId || currentUserId === otherId) return false;
  const { data } = await supabase
    .from("user_blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${currentUserId},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${currentUserId})`,
    )
    .limit(1);
  return (data ?? []).length > 0;
}

/** True when I am the one who blocked them (so I can unblock). */
export async function didIBlock(currentUserId: string, otherId: string): Promise<boolean> {
  if (!currentUserId || !otherId) return false;
  const { data } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", currentUserId)
    .eq("blocked_id", otherId)
    .limit(1);
  return (data ?? []).length > 0;
}
