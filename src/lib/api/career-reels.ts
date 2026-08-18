// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;
const SIGN_TTL = 60 * 60;

export type CareerReel = {
  id: string;
  author_id: string;
  caption: string | null;
  hashtags: string[];
  category: "career" | "business";
  bucket: string;
  video_path: string;
  thumb_bucket: string | null;
  thumb_path: string | null;
  duration_sec: number | null;
  moderation_status: "pending" | "approved" | "rejected" | "review";
  moderation_reason: string | null;
  moderation_score: number | null;
  moderation_labels: string[];
  view_count: number;
  created_at: string;
  video_url?: string;
  thumb_url?: string | null;
  author?: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

async function signOne(bucket: string, path: string): Promise<string | undefined> {
  if (!bucket || !path) return undefined;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl;
}

export async function uploadCareerReelVideo(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = "career-reels";
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { bucket, path };
}

async function hydrate(rows: CareerReel[]): Promise<CareerReel[]> {
  if (!rows.length) return rows;
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", authorIds);
  const map: Record<string, any> = {};
  (authors || []).forEach((a: any) => { map[a.id] = a; });
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      author: map[r.author_id] || null,
      video_url: await signOne(r.bucket, r.video_path),
      thumb_url: r.thumb_bucket && r.thumb_path ? await signOne(r.thumb_bucket, r.thumb_path) : null,
    })),
  );
}

export async function listApprovedCareerReels(): Promise<CareerReel[]> {
  const { data, error } = await supabase
    .from("career_reels")
    .select("*")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return hydrate((data || []) as CareerReel[]);
}

export async function listMyCareerReels(userId: string): Promise<CareerReel[]> {
  const { data, error } = await supabase
    .from("career_reels")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return hydrate((data || []) as CareerReel[]);
}
