// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

// ============ Micro-batching layer ============
// Feeds render many posts at once. Without batching each card fired 3 separate
// requests (like count, my-like, comment count) => 3xN round trips per screen.
// These loaders coalesce every request made within the same animation frame
// into ONE query per table, and cache the result briefly so remounts (scroll
// in/out, tab switches) don't re-hit the network.

type Batch<T> = {
  ids: Set<string>;
  resolvers: Array<{ id: string; resolve: (v: T) => void }>;
  timer: ReturnType<typeof setTimeout> | null;
};

const CACHE_TTL = 5000;

function createBatcher<T>(
  run: (ids: string[]) => Promise<Record<string, T>>,
  fallback: () => T,
) {
  let batch: Batch<T> | null = null;
  const cache = new Map<string, { at: number; value: T }>();

  const flush = async () => {
    const b = batch;
    batch = null;
    if (!b) return;
    const ids = [...b.ids];
    let map: Record<string, T> = {};
    try {
      map = await run(ids);
    } catch {
      map = {};
    }
    const now = Date.now();
    for (const { id, resolve } of b.resolvers) {
      const value = map[id] ?? fallback();
      cache.set(id, { at: now, value });
      resolve(value);
    }
  };

  const load = (id: string): Promise<T> => {
    const hit = cache.get(id);
    if (hit && Date.now() - hit.at < CACHE_TTL) return Promise.resolve(hit.value);
    if (!batch) {
      batch = { ids: new Set(), resolvers: [], timer: null };
      batch.timer = setTimeout(flush, 16);
    }
    batch.ids.add(id);
    return new Promise<T>((resolve) => batch!.resolvers.push({ id, resolve }));
  };

  return { load, invalidate: (id?: string) => (id ? cache.delete(id) : cache.clear()) };
}

let statsUserId: string | null = null;

const likeBatcher = createBatcher<{ count: number; liked: boolean }>(
  async (ids) => {
    const { data } = await supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", ids)
      .limit(10000);
    const out: Record<string, { count: number; liked: boolean }> = {};
    for (const id of ids) out[id] = { count: 0, liked: false };
    for (const r of data ?? []) {
      const e = out[r.post_id] ?? (out[r.post_id] = { count: 0, liked: false });
      e.count += 1;
      if (statsUserId && r.user_id === statsUserId) e.liked = true;
    }
    return out;
  },
  () => ({ count: 0, liked: false }),
);

const commentCountBatcher = createBatcher<number>(
  async (ids) => {
    const { data } = await supabase
      .from("post_comments")
      .select("post_id")
      .in("post_id", ids)
      .limit(10000);
    const out: Record<string, number> = {};
    for (const id of ids) out[id] = 0;
    for (const r of data ?? []) out[r.post_id] = (out[r.post_id] ?? 0) + 1;
    return out;
  },
  () => 0,
);

const saveBatcher = createBatcher<boolean>(
  async (ids) => {
    const out: Record<string, boolean> = {};
    for (const id of ids) out[id] = false;
    if (!statsUserId) return out;
    const { data } = await supabase
      .from("post_saves")
      .select("post_id")
      .eq("user_id", statsUserId)
      .in("post_id", ids)
      .limit(10000);
    for (const r of data ?? []) out[r.post_id] = true;
    return out;
  },
  () => false,
);

function invalidatePost(postId: string) {
  likeBatcher.invalidate(postId);
  commentCountBatcher.invalidate(postId);
  saveBatcher.invalidate(postId);
}

// ============ Likes ============
export async function likePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, user_id: userId });
  if (error && !`${error.message}`.includes("duplicate")) throw error;
  invalidatePost(postId);
  // fire-and-forget notification
  const authorId = await getPostAuthor(postId);
  if (authorId && authorId !== userId) {
    await (supabase as any).rpc("notify_user", {
      _recipient: authorId,
      _kind: "like_post",
      _target_type: "post",
      _target_id: postId,
    });
  }
}

export async function unlikePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("post_likes")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw error;
  invalidatePost(postId);
}

export async function getLikeState(postId: string, userId: string) {
  if (userId && statsUserId !== userId) {
    statsUserId = userId;
    likeBatcher.invalidate();
    saveBatcher.invalidate();
  }
  return likeBatcher.load(postId);
}

// ============ Saves ============
export async function savePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("post_saves")
    .insert({ post_id: postId, user_id: userId });
  if (error && !`${error.message}`.includes("duplicate")) throw error;
  invalidatePost(postId);
}

export async function unsavePost(postId: string, userId: string) {
  const { error } = await supabase
    .from("post_saves")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", userId);
  if (error) throw error;
  invalidatePost(postId);
}

export async function getSaveState(postId: string, userId: string) {
  if (userId && statsUserId !== userId) {
    statsUserId = userId;
    likeBatcher.invalidate();
    saveBatcher.invalidate();
  }
  return saveBatcher.load(postId);
}

// ============ Comments ============
export type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const COMMENT_COLS =
  "id, post_id, user_id, parent_id, body, created_at, updated_at, author:profiles!post_comments_profile_id_fkey(id, username, full_name, avatar_url)";

/** Turns stored avatar paths into displayable signed URLs. */
async function signCommentAvatars(rows: CommentRow[]): Promise<CommentRow[]> {
  const paths = [
    ...new Set(
      rows
        .map((r) => r.author?.avatar_url ?? "")
        .filter((p) => p && !p.startsWith("http") && !p.startsWith("data:")),
    ),
  ];
  if (!paths.length) return rows;
  const map: Record<string, string> = {};
  const { data } = await supabase.storage.from("profile-images").createSignedUrls(paths, 3600);
  for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  const missing = paths.filter((p) => !map[p]);
  if (missing.length) {
    const legacy = await supabase.storage.from("media").createSignedUrls(missing, 3600);
    for (const d of legacy.data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  }
  return rows.map((r) =>
    r.author?.avatar_url && map[r.author.avatar_url]
      ? { ...r, author: { ...r.author, avatar_url: map[r.author.avatar_url] } }
      : r,
  );
}

export async function listComments(postId: string): Promise<CommentRow[]> {
  const { data, error } = await supabase
    .from("post_comments")
    .select(COMMENT_COLS)
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return signCommentAvatars((data ?? []) as unknown as CommentRow[]);
}

export async function getCommentCount(postId: string) {
  return commentCountBatcher.load(postId);
}

export async function addComment(
  postId: string,
  userId: string,
  body: string,
  parentId?: string | null,
) {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Empty comment");
  const { data, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: userId, body: trimmed, parent_id: parentId ?? null })
    .select(COMMENT_COLS)
    .single();
  if (error) throw error;
  invalidatePost(postId);
  const authorId = await getPostAuthor(postId);
  if (authorId && authorId !== userId) {
    await (supabase as any).rpc("notify_user", {
      _recipient: authorId,
      _kind: parentId ? "reply" : "comment_post",
      _target_type: "post",
      _target_id: postId,
      _preview: { body: trimmed.slice(0, 120) },
    });
  }
  const [signed] = await signCommentAvatars([data as unknown as CommentRow]);
  return signed;
}

export async function updateComment(commentId: string, body: string) {
  const { error } = await supabase
    .from("post_comments")
    .update({ body })
    .eq("id", commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function toggleCommentLike(commentId: string, userId: string, on: boolean) {
  if (on) {
    const { error } = await supabase
      .from("comment_likes")
      .insert({ comment_id: commentId, user_id: userId });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
  }
}

async function getPostAuthor(postId: string): Promise<string | null> {
  const { data } = await supabase
    .from("posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}

// ============ Realtime helpers ============
// A feed of 50 posts used to open 50 websocket channels. Instead we keep ONE
// shared channel for likes/comments and fan changes out to the interested
// cards. The channel is torn down as soon as the last subscriber unmounts.
const postListeners = new Map<string, Set<() => void>>();
let sharedChannel: any = null;

function notifyPost(postId: string | undefined) {
  if (!postId) return;
  invalidatePost(postId);
  const set = postListeners.get(postId);
  if (!set) return;
  for (const cb of set) cb();
}

function ensureSharedChannel() {
  if (sharedChannel) return;
  sharedChannel = supabase
    .channel("post-interactions")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_likes" },
      (payload: any) => notifyPost(payload.new?.post_id ?? payload.old?.post_id),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "post_comments" },
      (payload: any) => notifyPost(payload.new?.post_id ?? payload.old?.post_id),
    )
    .subscribe();
}

export function subscribePostInteractions(postId: string, cb: () => void) {
  const set = postListeners.get(postId) ?? new Set<() => void>();
  set.add(cb);
  postListeners.set(postId, set);
  ensureSharedChannel();
  return () => {
    const s = postListeners.get(postId);
    if (s) {
      s.delete(cb);
      if (!s.size) postListeners.delete(postId);
    }
    if (!postListeners.size && sharedChannel) {
      supabase.removeChannel(sharedChannel);
      sharedChannel = null;
    }
  };
}

// ============ Post management ============
export async function editPost(postId: string, patch: { caption?: string | null; location?: string | null }) {
  const { error } = await supabase.from("posts").update(patch).eq("id", postId);
  if (error) throw error;
}

export async function archivePost(postId: string) {
  const { error } = await supabase.from("posts").update({ is_archived: true }).eq("id", postId);
  if (error) throw error;
}

export async function restorePost(postId: string) {
  const { error } = await supabase.from("posts").update({ is_archived: false }).eq("id", postId);
  if (error) throw error;
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}
