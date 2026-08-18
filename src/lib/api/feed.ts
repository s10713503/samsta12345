// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";
import { compressImage, VIDEO_LIMITS, FILE_LIMITS, formatBytes } from "@/lib/media-compress";

const supabase = rawSupabase as any;

export type MediaItem = {
  path: string;
  type: "image" | "video" | "audio" | "file";
  bucket?: string;
  url?: string;
  filename?: string;
  size?: number;
  mime?: string;
};

export type FeedPost = {
  id: string;
  user_id: string;
  caption: string | null;
  kind: "post" | "reel" | "story";
  created_at: string;
  media: MediaItem[];
  location: string | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  tagged_users: string[] | null;
  processing_status?: string | null;
  processing_progress?: number | null;
  author: {
    id: string;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

const SIGN_TTL = 60 * 60; // 1 hour
const LEGACY_BUCKET = "media";

function bucketForKind(kind: "post" | "reel" | "story"): string {
  if (kind === "reel") return "reels";
  if (kind === "story") return "stories";
  return "posts";
}

export async function uploadMedia(
  userId: string,
  file: File,
  kind: "post" | "reel" | "story" = "post",
  opts: { isPremium?: boolean; unlimited?: boolean } = {},
): Promise<MediaItem> {
  // Everyone gets max quality — 8K / full-HD pipeline for all users.
  const tier = "ultra" as const;
  let toUpload = file;
  const isVideo = file.type.startsWith("video");
  if (isVideo) {
    const cap = VIDEO_LIMITS.ultra;
    if (file.size > cap) {
      throw new Error(`Video is ${formatBytes(file.size)}. Maximum upload size is ${formatBytes(cap)}.`);
    }
  } else if (file.type.startsWith("image")) {
    toUpload = await compressImage(file, tier);
  }

  const ext = (toUpload.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const bucket = bucketForKind(kind);
  const { error } = await supabase.storage.from(bucket).upload(path, toUpload, {
    contentType: toUpload.type,
    upsert: false,
  });
  if (error) throw new Error(error.message || "Upload failed");
  return {
    path,
    bucket,
    type: isVideo ? "video" : "image",
    size: toUpload.size,
    mime: toUpload.type,
  };
}

export async function uploadDocumentFile(
  userId: string,
  file: File,
  isPremium: boolean,
): Promise<MediaItem> {
  const cap = isPremium ? FILE_LIMITS.premium : FILE_LIMITS.free;
  if (file.size > cap) {
    throw new Error(
      `File is ${formatBytes(file.size)}. ${isPremium ? "Premium" : "Free"} limit is ${formatBytes(cap)}.`,
    );
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const { error } = await supabase.storage.from("files").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(error.message || "Upload failed");
  // Track for monthly quota (best-effort)
  await supabase.from("file_uploads").insert({
    user_id: userId,
    bucket: "files",
    path,
    filename: file.name,
    size_bytes: file.size,
    mime_type: file.type || null,
  });
  return {
    path,
    bucket: "files",
    type: "file",
    filename: file.name,
    size: file.size,
    mime: file.type,
  };
}

export async function getMonthlyFileUploadCount(userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("file_uploads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", start.toISOString());
  return count ?? 0;
}

export async function uploadProfileImage(
  userId: string,
  file: File,
  kind: "avatar" | "cover" = "avatar",
): Promise<{ bucket: string; path: string }> {
  const compressed = await compressImage(file, "ultra");
  const ext = (compressed.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const bucket = kind === "cover" ? "cover-images" : "profile-images";
  const { error } = await supabase.storage.from(bucket).upload(path, compressed, {
    contentType: compressed.type,
    upsert: true,
  });
  if (error) throw new Error(error.message || "Upload failed");
  return { bucket, path };
}


// ---- Signed-URL cache -------------------------------------------------
// Signing is a network round-trip per bucket. Re-mounting the feed, paging,
// or a realtime refetch used to re-sign every path again. We keep signed URLs
// in memory until shortly before they expire so repeat renders cost 0 requests.
const SIGN_CACHE_TTL = (SIGN_TTL - 300) * 1000; // refresh 5 min before expiry
const signCache = new Map<string, { at: number; url: string }>();
const SIGN_CHUNK = 100;

function cacheGet(key: string): string | undefined {
  const hit = signCache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > SIGN_CACHE_TTL) {
    signCache.delete(key);
    return undefined;
  }
  return hit.url;
}

async function signGroup(bucket: string, paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const map: Record<string, string> = {};
  const misses: string[] = [];
  for (const p of paths) {
    const cached = cacheGet(`${bucket}::${p}`);
    if (cached) map[p] = cached;
    else misses.push(p);
  }
  if (!misses.length) return map;
  // Chunk so one huge request can't stall the first paint.
  const chunks: string[][] = [];
  for (let i = 0; i < misses.length; i += SIGN_CHUNK) chunks.push(misses.slice(i, i + SIGN_CHUNK));
  const results = await Promise.all(
    chunks.map((c) => supabase.storage.from(bucket).createSignedUrls(c, SIGN_TTL)),
  );
  const now = Date.now();
  for (const { data, error } of results) {
    if (error) continue;
    for (const d of data ?? []) {
      if (d.path && d.signedUrl) {
        map[d.path] = d.signedUrl;
        signCache.set(`${bucket}::${d.path}`, { at: now, url: d.signedUrl });
      }
    }
  }
  return map;
}

async function signBucketed(items: Array<{ bucket: string; path: string }>): Promise<Record<string, string>> {
  const byBucket = new Map<string, Set<string>>();
  for (const it of items) {
    if (!it.path) continue;
    const set = byBucket.get(it.bucket) ?? new Set<string>();
    set.add(it.path);
    byBucket.set(it.bucket, set);
  }
  const merged: Record<string, string> = {};
  // Buckets are signed in parallel instead of one-after-another.
  const entries = [...byBucket.entries()];
  const maps = await Promise.all(entries.map(([bucket, set]) => signGroup(bucket, [...set])));
  entries.forEach(([bucket, set], i) => {
    for (const p of set) {
      const url = maps[i][p];
      if (url) merged[`${bucket}::${p}`] = url;
    }
  });
  return merged;
}

async function attachUrls(posts: FeedPost[]): Promise<FeedPost[]> {
  const items: Array<{ bucket: string; path: string }> = [];
  for (const p of posts) {
    for (const m of p.media) {
      items.push({ bucket: m.bucket || bucketForKind(p.kind), path: m.path });
    }
    const a = p.author?.avatar_url;
    if (a && !a.startsWith("http") && !a.startsWith("data:")) {
      items.push({ bucket: "profile-images", path: a });
    }
  }
  const map = await signBucketed(items);
  // Legacy `media` bucket is only probed for the paths that actually failed,
  // instead of speculatively doubling every signing request.
  const legacyMisses = items
    .filter((it) => !map[`${it.bucket}::${it.path}`])
    .map((it) => it.path);
  if (legacyMisses.length) {
    const legacy = await signGroup(LEGACY_BUCKET, [...new Set(legacyMisses)]);
    for (const [p, url] of Object.entries(legacy)) map[`${LEGACY_BUCKET}::${p}`] = url;
  }
  const lookup = (bucket: string, path: string, fallbackBuckets: string[] = []): string | undefined => {
    if (map[`${bucket}::${path}`]) return map[`${bucket}::${path}`];
    for (const fb of fallbackBuckets) {
      if (map[`${fb}::${path}`]) return map[`${fb}::${path}`];
    }
    return undefined;
  };
  return posts.map((p) => ({
    ...p,
    media: p.media.map((m) => {
      const primary = m.bucket || bucketForKind(p.kind);
      const url = lookup(primary, m.path, m.bucket ? [] : ["posts", "reels", "stories", LEGACY_BUCKET]) ?? "";
      return { ...m, url };
    }),
    author: p.author
      ? {
          ...p.author,
          avatar_url:
            p.author.avatar_url
              ? lookup("profile-images", p.author.avatar_url, [LEGACY_BUCKET]) ?? p.author.avatar_url
              : p.author.avatar_url,
        }
      : null,
  }));
}

type Row = {
  id: string;
  user_id: string;
  caption: string | null;
  kind: FeedPost["kind"];
  created_at: string;
  media: unknown;
  location: string | null;
  hashtags: string[] | null;
  mentions: string[] | null;
  tagged_users: string[] | null;
  author:
    | {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
      }
    | null;
};

function normalize(row: Row): FeedPost {
  const media = Array.isArray(row.media) ? (row.media as MediaItem[]) : [];
  return {
    id: row.id,
    user_id: row.user_id,
    caption: row.caption,
    kind: row.kind,
    created_at: row.created_at,
    location: row.location,
    hashtags: row.hashtags,
    mentions: row.mentions,
    tagged_users: row.tagged_users,
    media,
    author: row.author,
  };
}

const POST_COLS =
  "id, user_id, caption, kind, created_at, media, location, hashtags, mentions, tagged_users, processing_status, processing_progress, author:profiles!posts_profile_id_fkey(id, username, full_name, avatar_url)";

/**
 * Surfaces the real Postgres/PostgREST error instead of a bare "failed" state.
 * Keeps the message readable in the UI while logging code/details/hint so
 * schema-cache or RLS problems are diagnosable from the console.
 */
export function reportFeedError(where: string, error: unknown): Error {
  const e = error as { message?: string; code?: string; details?: string; hint?: string };
  // eslint-disable-next-line no-console
  console.error(`[feed] ${where} failed`, {
    code: e?.code,
    message: e?.message,
    details: e?.details,
    hint: e?.hint,
  });
  const err = new Error(
    [e?.message ?? "Unknown error", e?.code ? `(${e.code})` : "", e?.details ?? ""]
      .filter(Boolean)
      .join(" ")
      .trim(),
  );
  (err as any).code = e?.code;
  (err as any).where = where;
  return err;
}


export async function listFeed(kind: "post" | "reel"): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLS)
    .eq("kind", kind)
    .eq("is_archived", false)
    .eq("is_draft", false)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw reportFeedError(`listFeed(${kind})`, error);
  return attachUrls(((data ?? []) as unknown as Row[]).map(normalize));
}

/**
 * Keyset-paginated feed. Loading 50 posts (and their media signatures) up
 * front was the main cause of the slow first paint; pages of 8 keep the first
 * screen light and let the rest stream in as the user scrolls.
 */
export async function listFeedPage(
  kind: "post" | "reel",
  opts: { before?: string | null; limit?: number } = {},
): Promise<{ items: FeedPost[]; nextCursor: string | null }> {
  const limit = opts.limit ?? 8;
  let q = supabase
    .from("posts")
    .select(POST_COLS)
    .eq("kind", kind)
    .eq("is_archived", false)
    .eq("is_draft", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (opts.before) q = q.lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) throw reportFeedError(`listFeedPage(${kind})`, error);
  const rows = ((data ?? []) as unknown as Row[]).map(normalize);
  const items = await attachUrls(rows);
  const nextCursor = rows.length === limit ? rows[rows.length - 1].created_at : null;
  return { items, nextCursor };
}

/**
 * Public trending reels: ranked by likes + 2*comments + freshness.
 * The ranking runs inside Postgres (`trending_post_ids`) so the client no
 * longer downloads thousands of like/comment rows just to sort 50 reels.
 */
export async function listTrendingReels(): Promise<FeedPost[]> {
  const { data: ranked, error: rankErr } = await supabase.rpc("trending_post_ids", {
    _kinds: ["reel"],
    _days: 14,
    _limit: 50,
  });
  if (rankErr) throw rankErr;
  const order = (ranked ?? []) as Array<{ id: string; score: number }>;
  if (!order.length) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLS)
    .in("id", order.map((r) => r.id));
  if (error) throw error;
  const rank = new Map(order.map((r, i) => [r.id, i]));
  const rows = ((data ?? []) as unknown as Row[])
    .map(normalize)
    .sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  return attachUrls(rows);
}



export async function listUserPosts(
  userId: string,
  kind: "post" | "reel",
): Promise<FeedPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLS)
    .eq("user_id", userId)
    .eq("kind", kind)
    .eq("is_archived", false)
    .eq("is_draft", false)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return attachUrls(((data ?? []) as unknown as Row[]).map(normalize));
}

export async function listUserUploads(userId: string): Promise<FeedPost[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLS)
    .eq("user_id", userId)
    .in("kind", ["post", "reel", "story"])
    .eq("is_archived", false)
    .eq("is_draft", false)
    .or(`kind.neq.story,expires_at.gt.${nowIso},expires_at.is.null`)
    .order("created_at", { ascending: false })
    .limit(150);
  if (error) throw error;
  return attachUrls(((data ?? []) as unknown as Row[]).map(normalize));
}

export async function listUserStories(userId: string): Promise<FeedPost[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLS)
    .eq("user_id", userId)
    .eq("kind", "story")
    .eq("is_archived", false)
    .eq("is_draft", false)
    .or(`expires_at.gt.${nowIso},expires_at.is.null`)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return attachUrls(((data ?? []) as unknown as Row[]).map(normalize));
}

/** Posts the user has liked, newest like first. */
export async function listLikedPosts(userId: string): Promise<FeedPost[]> {
  const { data: likes, error: likeErr } = await supabase
    .from("post_likes")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(150);
  if (likeErr) throw likeErr;
  const ids = (likes ?? []).map((l: any) => l.post_id);
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLS)
    .in("id", ids)
    .eq("is_archived", false)
    .eq("is_draft", false);
  if (error) throw error;
  const rows = await attachUrls(((data ?? []) as unknown as Row[]).map(normalize));
  const order = new Map<string, number>(ids.map((id: string, i: number) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}


export type StoryGroup = {
  user: FeedPost["author"];
  items: FeedPost[];
};

export async function listStories(): Promise<StoryGroup[]> {
  const nowIso = new Date().toISOString();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select(POST_COLS)
    .eq("kind", "story")
    .eq("is_archived", false)
    .eq("is_draft", false)
    .or(`expires_at.gt.${nowIso},and(expires_at.is.null,created_at.gte.${cutoff})`)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const withUrls = await attachUrls(
    ((data ?? []) as unknown as Row[]).map(normalize),
  );
  const map = new Map<string, StoryGroup>();
  for (const p of withUrls) {
    const key = p.user_id;
    if (!map.has(key)) map.set(key, { user: p.author, items: [] });
    map.get(key)!.items.push(p);
  }
  return Array.from(map.values());
}

function parseHashtags(text: string): string[] {
  const set = new Set<string>();
  const re = /#([\p{L}\p{N}_]{2,50})/gu;
  let m;
  while ((m = re.exec(text)) !== null) set.add(m[1].toLowerCase());
  return [...set];
}

function parseMentions(text: string): string[] {
  const set = new Set<string>();
  const re = /@([a-zA-Z0-9_.]{2,32})/g;
  let m;
  while ((m = re.exec(text)) !== null) set.add(m[1].toLowerCase());
  return [...set];
}

async function resolveMentionIds(usernames: string[]): Promise<string[]> {
  if (!usernames.length) return [];
  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", usernames);
  return (data ?? []).map((p) => p.id as string);
}

/** Makes sure the signed-in user has a profile row (posts reference it). */
export async function ensureProfile() {
  const { error } = await supabase.rpc("ensure_my_profile");
  if (error) throw error;
}

export async function createPost(input: {
  userId: string;
  caption: string;
  kind: "post" | "reel" | "story";
  media: MediaItem[];
  ttlHours?: number;
  location?: string | null;
  taggedUsers?: string[];
  closeFriendsOnly?: boolean;
  /** Videos / podcasts get a poster + duration built after the upload. */
  needsProcessing?: boolean;
}) {
  const profileReady = ensureProfile();
  const ttl = input.ttlHours && input.ttlHours > 0 ? input.ttlHours : 24;
  const expires_at =
    input.kind === "story"
      ? new Date(Date.now() + ttl * 60 * 60 * 1000).toISOString()
      : null;
  const caption = input.caption || "";
  const hashtags = parseHashtags(caption);
  const mentionNames = parseMentions(caption);
  const [, mentionIds] = await Promise.all([
    profileReady,
    resolveMentionIds(mentionNames),
  ]);
  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      user_id: input.userId,
      caption: caption || null,
      kind: input.kind,
      media: input.media.map((m) => ({ path: m.path, type: m.type, bucket: m.bucket })),
      expires_at,
      location: input.location ?? null,
      hashtags: hashtags.length ? hashtags : undefined,
      mentions: mentionIds.length ? mentionIds : undefined,
      tagged_users: input.taggedUsers?.length ? input.taggedUsers : undefined,
      close_friends_only: input.kind === "story" ? !!input.closeFriendsOnly : undefined,
      processing_status: input.needsProcessing ? "processing" : "ready",
      processing_progress: input.needsProcessing ? 10 : 100,
    })
    .select("id")
    .single();
  if (error) throw error;

  // fanout: mention notifications
  if (mentionIds.length && inserted?.id) {
    for (const uid of mentionIds.filter((u) => u !== input.userId)) {
      void (supabase as any).rpc("notify_user", {
        _recipient: uid,
        _kind: "mention",
        _target_type: input.kind,
        _target_id: inserted.id as string,
      });
    }
  }
  // Publishing counts as activity, so this account's content is kept
  // for another 6 months of inactivity.
  void (supabase as any).rpc("touch_last_active");
  return inserted?.id as string | undefined;
}

export async function repostPost(input: {
  userId: string;
  originalPostId: string;
  caption: string;
}): Promise<string | undefined> {
  const { data: orig, error: e1 } = await supabase
    .from("posts")
    .select("id, user_id, media, kind, location")
    .eq("id", input.originalPostId)
    .maybeSingle();
  if (e1) throw e1;
  if (!orig) throw new Error("Original post not found");
  const rawMedia = Array.isArray(orig.media) ? (orig.media as MediaItem[]) : [];
  const media = rawMedia.map((m) => ({ path: m.path, type: m.type, bucket: m.bucket }));
  const caption = input.caption || "";
  const hashtags = parseHashtags(caption);
  const mentionNames = parseMentions(caption);
  const mentionIds = await resolveMentionIds(mentionNames);
  const kind = (orig.kind === "reel" ? "reel" : "post") as "post" | "reel";
  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      user_id: input.userId,
      caption: caption || null,
      kind,
      media,
      location: (orig.location as string | null) ?? null,
      hashtags: hashtags.length ? hashtags : undefined,
      mentions: mentionIds.length ? mentionIds : undefined,
      reposted_from: input.originalPostId,
    })
    .select("id")
    .single();
  if (error) throw error;
  const origAuthor = orig.user_id as string;
  if (origAuthor && origAuthor !== input.userId && inserted?.id) {
    // Best-effort: a failed notification must never fail the repost itself.
    const { error: notifyError } = await (supabase as any).rpc("notify_user", {
      _recipient: origAuthor,
      _kind: "repost",
      _entity: inserted.id as string,
      _body: caption.slice(0, 120),
    });
    if (notifyError) console.warn("repost notification failed", notifyError);
  }
  return inserted?.id as string | undefined;
}

export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const { path } = await uploadProfileImage(userId, file, "avatar");
  return path;
}

export async function uploadCover(userId: string, file: File): Promise<string> {
  const { path } = await uploadProfileImage(userId, file, "cover");
  return path;
}

export async function signOne(path: string, bucket = "profile-images"): Promise<string> {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("data:")) return path;
  // Goes through the shared signed-URL cache, so avatars shown on many
  // screens are signed once per hour instead of once per component mount.
  const primary = await signGroup(bucket, [path]);
  if (primary[path]) return primary[path];
  const legacy = await signGroup(LEGACY_BUCKET, [path]);
  return legacy[path] ?? "";
}

export type PostThumb = {
  id: string;
  kind: "post" | "reel" | "story";
  type: "image" | "video";
  url: string;
};

export async function listPostThumbs(ids: string[]): Promise<Record<string, PostThumb>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase
    .from("posts")
    .select("id, kind, media")
    .in("id", unique);
  if (error || !data) return {};
  const rows = data as unknown as Array<{ id: string; kind: FeedPost["kind"]; media: unknown }>;
  const items: Array<{ bucket: string; path: string }> = [];
  const meta: Record<string, { kind: FeedPost["kind"]; path: string; type: "image" | "video"; bucket: string }> = {};
  for (const r of rows) {
    const media = Array.isArray(r.media) ? (r.media as MediaItem[]) : [];
    const first = media[0];
    if (!first?.path) continue;
    const bucket = first.bucket || bucketForKind(r.kind);
    meta[r.id] = { kind: r.kind, path: first.path, type: first.type, bucket };
    items.push({ bucket, path: first.path });
    if (!first.bucket) items.push({ bucket: LEGACY_BUCKET, path: first.path });
  }
  const map = await signBucketed(items);
  const out: Record<string, PostThumb> = {};
  for (const [id, m] of Object.entries(meta)) {
    const url = map[`${m.bucket}::${m.path}`] || map[`${LEGACY_BUCKET}::${m.path}`] || "";
    out[id] = { id, kind: m.kind, type: m.type, url };
  }
  return out;
}

/** Fetch specific posts (any kind) preserving the given id order, with signed URLs. */
export async function listPostsByIds(ids: string[]): Promise<FeedPost[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  const { data, error } = await supabase.from("posts").select(POST_COLS).in("id", unique);
  if (error) throw error;
  const rows = ((data ?? []) as unknown as Row[]).map(normalize);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = unique.map((id) => byId.get(id)).filter(Boolean) as FeedPost[];
  return attachUrls(ordered);
}
