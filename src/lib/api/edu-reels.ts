// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;
const SIGN_TTL = 60 * 60;

export type EduReel = {
  id: string;
  author_id: string;
  caption: string | null;
  hashtags: string[];
  bucket: string;
  video_path: string;
  thumb_bucket: string | null;
  thumb_path: string | null;
  duration_sec: number | null;
  moderation_status: "pending" | "approved" | "rejected" | "review";
  moderation_reason: string | null;
  moderation_score: number | null;
  moderation_labels: string[];
  moderator_id: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  video_url?: string;
  thumb_url?: string | null;
  author?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  likes_count?: number;
  comments_count?: number;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
};

async function signOne(bucket: string, path: string): Promise<string | undefined> {
  if (!bucket || !path) return undefined;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl;
}

export async function uploadReelVideo(userId: string, file: File): Promise<{ bucket: string; path: string; duration?: number }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = "education-reels";
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return { bucket, path };
}

async function attachAggregates(reels: EduReel[], me: string | null): Promise<EduReel[]> {
  if (!reels.length) return reels;
  const ids = reels.map((r) => r.id);
  const authorIds = Array.from(new Set(reels.map((r) => r.author_id)));

  const [authors, likes, comments, myLikes, mySaves] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", authorIds),
    supabase.from("edu_reel_likes").select("reel_id").in("reel_id", ids),
    supabase.from("edu_reel_comments").select("reel_id").in("reel_id", ids),
    me ? supabase.from("edu_reel_likes").select("reel_id").in("reel_id", ids).eq("user_id", me) : Promise.resolve({ data: [] }),
    me ? supabase.from("edu_reel_saves").select("reel_id").in("reel_id", ids).eq("user_id", me) : Promise.resolve({ data: [] }),
  ]);

  const authorMap: Record<string, any> = {};
  (authors.data || []).forEach((a: any) => { authorMap[a.id] = a; });
  const likeCount: Record<string, number> = {};
  (likes.data || []).forEach((r: any) => { likeCount[r.reel_id] = (likeCount[r.reel_id] || 0) + 1; });
  const commentCount: Record<string, number> = {};
  (comments.data || []).forEach((r: any) => { commentCount[r.reel_id] = (commentCount[r.reel_id] || 0) + 1; });
  const likedSet = new Set((myLikes.data || []).map((r: any) => r.reel_id));
  const savedSet = new Set((mySaves.data || []).map((r: any) => r.reel_id));

  return Promise.all(
    reels.map(async (r) => ({
      ...r,
      author: authorMap[r.author_id] || null,
      likes_count: likeCount[r.id] || 0,
      comments_count: commentCount[r.id] || 0,
      liked_by_me: likedSet.has(r.id),
      saved_by_me: savedSet.has(r.id),
      video_url: await signOne(r.bucket, r.video_path),
      thumb_url: r.thumb_bucket && r.thumb_path ? await signOne(r.thumb_bucket, r.thumb_path) : null,
    })),
  );
}

export async function listApprovedReels(me: string | null): Promise<EduReel[]> {
  const { data, error } = await supabase
    .from("education_reels")
    .select("*")
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return attachAggregates((data || []) as EduReel[], me);
}

export async function listMyReels(userId: string): Promise<EduReel[]> {
  const { data, error } = await supabase
    .from("education_reels")
    .select("*")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachAggregates((data || []) as EduReel[], userId);
}

export async function listPendingReels(): Promise<EduReel[]> {
  const { data, error } = await supabase
    .from("education_reels")
    .select("*")
    .in("moderation_status", ["pending", "review"])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return attachAggregates((data || []) as EduReel[], null);
}

export async function toggleReelLike(reelId: string, userId: string, liked: boolean) {
  if (liked) return supabase.from("edu_reel_likes").delete().eq("reel_id", reelId).eq("user_id", userId);
  return supabase.from("edu_reel_likes").insert({ reel_id: reelId, user_id: userId });
}

export async function toggleReelSave(reelId: string, userId: string, saved: boolean) {
  if (saved) return supabase.from("edu_reel_saves").delete().eq("reel_id", reelId).eq("user_id", userId);
  return supabase.from("edu_reel_saves").insert({ reel_id: reelId, user_id: userId });
}

export async function recordWatch(reelId: string, viewerId: string, seconds: number, completed: boolean) {
  return supabase.from("edu_reel_metrics").upsert(
    {
      reel_id: reelId,
      viewer_id: viewerId,
      watch_seconds: seconds,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "reel_id,viewer_id" },
  );
}

export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data || []).some((r: any) => r.role === "admin" || r.role === "moderator");
}
