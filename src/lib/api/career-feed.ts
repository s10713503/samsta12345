// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { MediaItem } from "@/lib/api/feed";

const SIGN_TTL = 60 * 60;

export type Visibility = "public" | "followers";

export type CareerFeedPost = {
  id: string;
  user_id: string;
  caption: string | null;
  created_at: string;
  visibility: Visibility;
  media: Array<MediaItem & { url: string }>;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type PostRow = {
  id: string;
  user_id: string;
  caption: string | null;
  created_at: string;
  visibility: string;
  media: unknown;
};

async function signBucket(bucket: string, paths: string[]) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, SIGN_TTL);
  const map: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  return map;
}

async function hydrate(rows: PostRow[], viewerId: string | null): Promise<CareerFeedPost[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));

  const [{ data: authors }, likeCounts, commentCounts, myLikes] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", authorIds),
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_comments").select("post_id").in("post_id", ids),
    viewerId
      ? supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", viewerId)
      : Promise.resolve({ data: [] as { post_id: string }[] }),
  ]);

  const authorMap = new Map((authors ?? []).map((a) => [a.id, a]));
  const likeMap = new Map<string, number>();
  for (const l of (likeCounts.data ?? []) as { post_id: string }[]) {
    likeMap.set(l.post_id, (likeMap.get(l.post_id) ?? 0) + 1);
  }
  const commentMap = new Map<string, number>();
  for (const c of (commentCounts.data ?? []) as { post_id: string }[]) {
    commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1);
  }
  const likedSet = new Set(((myLikes.data ?? []) as { post_id: string }[]).map((r) => r.post_id));

  // Sign all image paths in one call
  const postsBucketPaths: string[] = [];
  const profileBucketPaths: string[] = [];
  for (const r of rows) {
    const media = Array.isArray(r.media) ? (r.media as MediaItem[]) : [];
    for (const m of media) if (m.path) postsBucketPaths.push(m.path);
  }
  for (const a of authorMap.values()) {
    const av = a.avatar_url;
    if (av && !av.startsWith("http") && !av.startsWith("data:")) profileBucketPaths.push(av);
  }
  const [postUrls, avatarUrls] = await Promise.all([
    signBucket("posts", [...new Set(postsBucketPaths)]),
    signBucket("profile-images", [...new Set(profileBucketPaths)]),
  ]);

  return rows.map((r) => {
    const rawMedia = Array.isArray(r.media) ? (r.media as MediaItem[]) : [];
    const media = rawMedia
      .filter((m) => m.type === "image" && m.path)
      .map((m) => ({ ...m, url: postUrls[m.path] ?? "" }));
    const author = authorMap.get(r.user_id) ?? null;
    return {
      id: r.id,
      user_id: r.user_id,
      caption: r.caption,
      created_at: r.created_at,
      visibility: (r.visibility as Visibility) ?? "public",
      media,
      like_count: likeMap.get(r.id) ?? 0,
      comment_count: commentMap.get(r.id) ?? 0,
      liked_by_me: likedSet.has(r.id),
      author: author
        ? {
            ...author,
            avatar_url:
              author.avatar_url && avatarUrls[author.avatar_url]
                ? avatarUrls[author.avatar_url]
                : author.avatar_url,
          }
        : null,
    };
  });
}

export async function listCareerFeed(viewerId: string | null): Promise<CareerFeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, user_id, caption, created_at, visibility, media")
    .eq("kind", "post")
    .eq("is_archived", false)
    .eq("is_draft", false)
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw error;
  return hydrate((data ?? []) as PostRow[], viewerId);
}

export async function getDefaultVisibility(userId: string): Promise<Visibility> {
  const { data } = await supabase
    .from("profiles")
    .select("default_post_visibility")
    .eq("id", userId)
    .maybeSingle();
  return ((data?.default_post_visibility as Visibility) ?? "public");
}

export async function setDefaultVisibility(userId: string, v: Visibility) {
  const { error } = await supabase
    .from("profiles")
    .update({ default_post_visibility: v })
    .eq("id", userId);
  if (error) throw error;
}

export async function uploadFeedImage(userId: string, file: File): Promise<MediaItem> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("posts").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return { path, bucket: "posts", type: "image" };
}

export async function createFeedPost(input: {
  userId: string;
  caption: string;
  media: MediaItem[];
  visibility: Visibility;
}): Promise<string> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: input.userId,
      caption: input.caption || null,
      kind: "post",
      visibility: input.visibility,
      media: input.media.map((m) => ({ path: m.path, type: m.type, bucket: m.bucket ?? "posts" })),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function likePost(postId: string, userId: string) {
  const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  if (error && error.code !== "23505") throw error;
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function addComment(postId: string, userId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: userId, body: trimmed });
  if (error) throw error;
}

export type Comment = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author: { username: string | null; avatar_url: string | null; full_name: string | null } | null;
};

export async function listComments(postId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select("id, body, created_at, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw error;
  const rows = (data ?? []) as Array<Omit<Comment, "author">>;
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (!ids.length) return rows.map((r) => ({ ...r, author: null }));
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, full_name")
    .in("id", ids);
  const map = new Map((authors ?? []).map((a) => [a.id, a]));
  return rows.map((r) => {
    const a = map.get(r.user_id);
    return {
      ...r,
      author: a ? { username: a.username, avatar_url: a.avatar_url, full_name: a.full_name } : null,
    };
  });
}

// Follow helpers
export async function getFollowState(viewerId: string, targetId: string) {
  if (viewerId === targetId) return { status: "self" as const };
  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", viewerId)
    .eq("following_id", targetId)
    .maybeSingle();
  return { status: (data?.status as "pending" | "accepted" | undefined) ?? null };
}

export async function followUser(viewerId: string, targetId: string, targetIsPrivate: boolean) {
  const status = targetIsPrivate ? "pending" : "accepted";
  const { error } = await supabase
    .from("follows")
    .insert({ follower_id: viewerId, following_id: targetId, status });
  if (error && error.code !== "23505") throw error;
  return status;
}

export async function unfollowUser(viewerId: string, targetId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", viewerId)
    .eq("following_id", targetId);
  if (error) throw error;
}