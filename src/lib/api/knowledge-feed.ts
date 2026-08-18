// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export type KnowledgeMedia = {
  id: string;
  knowledge_post_id: string;
  kind: "image" | "video" | "pdf" | "doc" | "audio";
  bucket: string;
  path: string;
  mime: string | null;
  size_bytes: number | null;
  ordinal: number;
  url?: string;
};

export type KnowledgePost = {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  category: string | null;
  tags: string[];
  cover_bucket: string | null;
  cover_path: string | null;
  cover_url?: string | null;
  is_published: boolean;
  is_archived: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  media?: KnowledgeMedia[];
  likes_count?: number;
  comments_count?: number;
  liked_by_me?: boolean;
  saved_by_me?: boolean;
};

const SIGN_TTL = 60 * 60;

async function signOne(bucket: string, path: string): Promise<string | undefined> {
  if (!bucket || !path) return undefined;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGN_TTL);
  return data?.signedUrl;
}

async function signMedia(items: KnowledgeMedia[]): Promise<KnowledgeMedia[]> {
  if (!items.length) return items;
  const byBucket: Record<string, string[]> = {};
  items.forEach((m) => {
    byBucket[m.bucket] = byBucket[m.bucket] || [];
    byBucket[m.bucket].push(m.path);
  });
  const map: Record<string, string> = {};
  for (const bucket of Object.keys(byBucket)) {
    const { data } = await supabase.storage.from(bucket).createSignedUrls(byBucket[bucket], SIGN_TTL);
    (data || []).forEach((d: any) => {
      if (d?.path && d?.signedUrl) map[`${bucket}/${d.path}`] = d.signedUrl;
    });
  }
  return items.map((m) => ({ ...m, url: map[`${m.bucket}/${m.path}`] }));
}

export async function uploadKnowledgeFile(
  userId: string,
  file: File,
): Promise<{ bucket: string; path: string; kind: KnowledgeMedia["kind"]; mime: string; size: number }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = "knowledge";
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  let kind: KnowledgeMedia["kind"] = "doc";
  if (file.type.startsWith("image/")) kind = "image";
  else if (file.type.startsWith("video/")) kind = "video";
  else if (file.type.startsWith("audio/")) kind = "audio";
  else if (file.type === "application/pdf" || ext === "pdf") kind = "pdf";
  return { bucket, path, kind, mime: file.type, size: file.size };
}

export async function createKnowledgePost(input: {
  authorId: string;
  title: string;
  body?: string;
  category?: string;
  tags?: string[];
  cover?: { bucket: string; path: string } | null;
  media?: Array<{ bucket: string; path: string; kind: KnowledgeMedia["kind"]; mime?: string; size?: number }>;
}): Promise<KnowledgePost> {
  const { data: post, error } = await supabase
    .from("knowledge_posts")
    .insert({
      author_id: input.authorId,
      title: input.title,
      body: input.body ?? null,
      category: input.category ?? null,
      tags: input.tags ?? [],
      cover_bucket: input.cover?.bucket ?? null,
      cover_path: input.cover?.path ?? null,
      is_published: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  if (input.media?.length) {
    const rows = input.media.map((m, i) => ({
      knowledge_post_id: post.id,
      kind: m.kind,
      bucket: m.bucket,
      path: m.path,
      mime: m.mime ?? null,
      size_bytes: m.size ?? null,
      ordinal: i,
    }));
    const { error: mErr } = await supabase.from("knowledge_media").insert(rows);
    if (mErr) throw mErr;
  }
  return post as KnowledgePost;
}

async function attachAggregates(posts: KnowledgePost[], me: string | null): Promise<KnowledgePost[]> {
  if (!posts.length) return posts;
  const ids = posts.map((p) => p.id);
  const authorIds = Array.from(new Set(posts.map((p) => p.author_id)));

  const [authors, media, likes, comments, myLikes, mySaves] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", authorIds),
    supabase.from("knowledge_media").select("*").in("knowledge_post_id", ids).order("ordinal", { ascending: true }),
    supabase.from("knowledge_likes").select("knowledge_post_id").in("knowledge_post_id", ids),
    supabase.from("knowledge_comments").select("knowledge_post_id").in("knowledge_post_id", ids),
    me ? supabase.from("knowledge_likes").select("knowledge_post_id").in("knowledge_post_id", ids).eq("user_id", me) : Promise.resolve({ data: [] }),
    me ? supabase.from("knowledge_saves").select("knowledge_post_id").in("knowledge_post_id", ids).eq("user_id", me) : Promise.resolve({ data: [] }),
  ]);

  const authorMap: Record<string, any> = {};
  (authors.data || []).forEach((a: any) => { authorMap[a.id] = a; });
  const mediaMap: Record<string, KnowledgeMedia[]> = {};
  const signedMedia = await signMedia((media.data || []) as KnowledgeMedia[]);
  signedMedia.forEach((m) => {
    mediaMap[m.knowledge_post_id] = mediaMap[m.knowledge_post_id] || [];
    mediaMap[m.knowledge_post_id].push(m);
  });
  const likeCount: Record<string, number> = {};
  (likes.data || []).forEach((r: any) => { likeCount[r.knowledge_post_id] = (likeCount[r.knowledge_post_id] || 0) + 1; });
  const commentCount: Record<string, number> = {};
  (comments.data || []).forEach((r: any) => { commentCount[r.knowledge_post_id] = (commentCount[r.knowledge_post_id] || 0) + 1; });
  const likedSet = new Set((myLikes.data || []).map((r: any) => r.knowledge_post_id));
  const savedSet = new Set((mySaves.data || []).map((r: any) => r.knowledge_post_id));

  return Promise.all(
    posts.map(async (p) => ({
      ...p,
      author: authorMap[p.author_id] || null,
      media: mediaMap[p.id] || [],
      likes_count: likeCount[p.id] || 0,
      comments_count: commentCount[p.id] || 0,
      liked_by_me: likedSet.has(p.id),
      saved_by_me: savedSet.has(p.id),
      cover_url: p.cover_bucket && p.cover_path ? await signOne(p.cover_bucket, p.cover_path) : null,
    })),
  );
}

export async function listKnowledgeFeed(me: string | null, opts: { limit?: number; category?: string; tag?: string } = {}): Promise<KnowledgePost[]> {
  let q = supabase
    .from("knowledge_posts")
    .select("*")
    .eq("is_archived", false)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.tag) q = q.contains("tags", [opts.tag]);
  const { data, error } = await q;
  if (error) throw error;
  return attachAggregates((data || []) as KnowledgePost[], me);
}

export async function getKnowledgePost(id: string, me: string | null): Promise<KnowledgePost | null> {
  const { data, error } = await supabase.from("knowledge_posts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [full] = await attachAggregates([data as KnowledgePost], me);
  return full;
}

export async function toggleKnowledgeLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    return supabase.from("knowledge_likes").delete().eq("knowledge_post_id", postId).eq("user_id", userId);
  }
  return supabase.from("knowledge_likes").insert({ knowledge_post_id: postId, user_id: userId });
}

export async function toggleKnowledgeSave(postId: string, userId: string, saved: boolean) {
  if (saved) {
    return supabase.from("knowledge_saves").delete().eq("knowledge_post_id", postId).eq("user_id", userId);
  }
  return supabase.from("knowledge_saves").insert({ knowledge_post_id: postId, user_id: userId });
}

export async function listComments(postId: string) {
  const { data, error } = await supabase
    .from("knowledge_comments")
    .select("*")
    .eq("knowledge_post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const ids = Array.from(new Set((data || []).map((r: any) => r.user_id)));
  const { data: profs } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
  const map: Record<string, any> = {};
  (profs || []).forEach((p: any) => { map[p.id] = p; });
  return (data || []).map((c: any) => ({ ...c, author: map[c.user_id] || null }));
}

export async function addComment(postId: string, userId: string, body: string, parentId?: string) {
  return supabase.from("knowledge_comments").insert({
    knowledge_post_id: postId,
    user_id: userId,
    body,
    parent_id: parentId ?? null,
  });
}

export async function deleteKnowledgePost(id: string) {
  return supabase.from("knowledge_posts").delete().eq("id", id);
}

export async function reportContent(reporterId: string, targetType: string, targetId: string, reason: string, details?: string) {
  return supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason,
    details: details ?? null,
  });
}
