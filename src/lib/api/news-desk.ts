// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export const MAX_STORY_FILE_BYTES = 5 * 1024 * 1024; // 5 MB per file
const YEAR = 60 * 60 * 24 * 365;

export type NewsMedia = { url: string; name: string; type: string; size: number };

export type NewsStory = {
  id: string;
  user_id: string;
  desk: string;
  headline: string;
  body: string | null;
  link: string | null;
  media: NewsMedia[];
  created_at: string;
  author?: { username?: string | null; display_name?: string | null; avatar_url?: string | null };
};

/** Uploads a story attachment (≤5 MB) to the private media bucket. */
export async function uploadStoryFile(userId: string, file: File): Promise<NewsMedia> {
  if (file.size > MAX_STORY_FILE_BYTES) {
    throw new Error(`${file.name} is larger than 5 MB`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/news/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await (supabase as any).storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;
  const signed = await (supabase as any).storage.from("media").createSignedUrl(path, YEAR);
  if (signed.error) throw signed.error;
  return { url: signed.data.signedUrl, name: file.name, type: file.type || "application/octet-stream", size: file.size };
}

export async function createNewsStory(input: {
  userId: string;
  desk: string;
  headline: string;
  body?: string;
  link?: string;
  media?: NewsMedia[];
}): Promise<NewsStory> {
  const { data, error } = await (supabase as any)
    .from("news_stories")
    .insert({
      user_id: input.userId,
      desk: input.desk,
      headline: input.headline.trim(),
      body: input.body?.trim() || null,
      link: input.link?.trim() || null,
      media: input.media ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as NewsStory;
}

/** Stories for one desk only — newest first, with author profile. */
export async function listDeskStories(desk: string): Promise<NewsStory[]> {
  const { data, error } = await (supabase as any)
    .from("news_stories")
    .select("*")
    .eq("desk", desk)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  const rows = (data ?? []) as NewsStory[];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (!ids.length) return rows;
  const { data: profiles } = await (supabase as any)
    .from("orbit_profiles")
    .select("user_id, username, display_name, avatar_url")
    .in("user_id", ids);
  const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
  return rows.map((r) => ({ ...r, author: map.get(r.user_id) }));
}

export async function deleteNewsStory(id: string) {
  const { error } = await (supabase as any).from("news_stories").delete().eq("id", id);
  if (error) throw error;
}

/** Live desk feed: fires on any story change. */
export function subscribeDeskStories(desk: string, onChange: () => void) {
  const channel = (supabase as any)
    .channel(`news-desk-${desk}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "news_stories", filter: `desk=eq.${desk}` }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
