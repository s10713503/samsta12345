// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type Highlight = {
  id: string;
  user_id: string;
  title: string;
  cover_bucket: string | null;
  cover_path: string | null;
  created_at: string;
};

export async function listHighlights(userId: string): Promise<Highlight[]> {
  const { data, error } = await supabase
    .from("story_highlights")
    .select("id, user_id, title, cover_bucket, cover_path, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Highlight[];
}

export async function createHighlight(input: {
  userId: string;
  title: string;
  coverBucket?: string | null;
  coverPath?: string | null;
}): Promise<string> {
  const { data, error } = await supabase
    .from("story_highlights")
    .insert({
      user_id: input.userId,
      title: input.title.trim() || "Highlight",
      cover_bucket: input.coverBucket ?? null,
      cover_path: input.coverPath ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function addPostsToHighlight(
  highlightId: string,
  addedBy: string,
  postIds: string[],
) {
  if (!postIds.length) return;
  const rows = postIds.map((post_id) => ({ highlight_id: highlightId, post_id, added_by: addedBy }));
  const { error } = await supabase.from("story_highlight_items").upsert(rows, { onConflict: "highlight_id,post_id" });
  if (error) throw error;
}

export async function listHighlightItems(highlightId: string) {
  const { data, error } = await supabase
    .from("story_highlight_items")
    .select("post:posts!story_highlight_items_post_id_fkey(id, media, caption, created_at, user_id)")
    .eq("highlight_id", highlightId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => r.post).filter(Boolean);
}

export async function deleteHighlight(highlightId: string) {
  const { error } = await supabase.from("story_highlights").delete().eq("id", highlightId);
  if (error) throw error;
}
