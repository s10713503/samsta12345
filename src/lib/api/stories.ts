// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function markStoryViewed(storyId: string, viewerId: string) {
  if (!UUID_RE.test(storyId) || !viewerId) return;
  const { error } = await supabase
    .from("story_views")
    .insert({ story_id: storyId, viewer_id: viewerId });
  if (error && !`${error.message}`.toLowerCase().includes("duplicate")) {
    // ignore other errors quietly
  }
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", storyId)
    .maybeSingle();
  const ownerId = post?.user_id as string | undefined;
  if (ownerId && ownerId !== viewerId) {
    await (supabase as any).rpc("notify_user", {
      _recipient: ownerId,
      _kind: "story_view",
      _target_type: "story",
      _target_id: storyId,
    });
  }
}

export async function getStoryViewCount(storyId: string): Promise<number> {
  if (!UUID_RE.test(storyId)) return 0;
  const { count } = await supabase
    .from("story_views")
    .select("*", { count: "exact", head: true })
    .eq("story_id", storyId);
  return count ?? 0;
}

export async function getStoryViewCounts(storyIds: string[]): Promise<Record<string, number>> {
  const ids = storyIds.filter((id) => UUID_RE.test(id));
  const result: Record<string, number> = {};
  if (ids.length === 0) return result;
  const { data } = await supabase
    .from("story_views")
    .select("story_id")
    .in("story_id", ids);
  (data ?? []).forEach((row: any) => {
    result[row.story_id] = (result[row.story_id] ?? 0) + 1;
  });
  ids.forEach((id) => { if (!(id in result)) result[id] = 0; });
  return result;
}

export async function listStoryViewers(storyId: string) {
  const { data, error } = await supabase
    .from("story_views")
    .select(
      "created_at, viewer:profiles!story_views_viewer_id_fkey(id, username, full_name, avatar_url)",
    )
    .eq("story_id", storyId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    created_at: string;
    viewer: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
  }>;
}

export async function replyToStory(storyId: string, senderId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("story_replies")
    .insert({ story_id: storyId, sender_id: senderId, body: trimmed });
  if (error) throw error;
  const { data: post } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", storyId)
    .maybeSingle();
  const ownerId = post?.user_id as string | undefined;
  if (ownerId && ownerId !== senderId) {
    await (supabase as any).rpc("notify_user", {
      _recipient: ownerId,
      _kind: "story_reply",
      _target_type: "story",
      _target_id: storyId,
      _preview: { body: trimmed.slice(0, 120) },
    });
  }
}
