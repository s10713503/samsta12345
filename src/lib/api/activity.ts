// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type ActivityKind = "likes" | "comments";

export type ActivityRow = {
  id: string;
  kind: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  preview: Record<string, unknown> | null;
  actor: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const LIKE_KINDS = ["like_post", "like_reel", "like_story"];
const COMMENT_KINDS = ["comment_post", "comment_reel", "reply", "like_comment"];

export async function listRecentActivity(
  recipientId: string,
  category: ActivityKind,
): Promise<ActivityRow[]> {
  const kinds = category === "likes" ? LIKE_KINDS : COMMENT_KINDS;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, kind, target_type, target_id, created_at, preview, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)",
    )
    .eq("recipient_id", recipientId)
    .in("kind", kinds)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as ActivityRow[];
}

export function subscribeActivity(recipientId: string, cb: () => void) {
  const ch = supabase
    .channel(`activity-${recipientId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${recipientId}` },
      () => cb(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
