// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, MessageCircle, Image as ImageIcon, X, Send, Globe2, Users, ChevronDown, Loader2, Sparkles, MoreHorizontal } from "lucide-react";
import { CareerShell } from "@/components/samsta/CareerShell";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  listCareerFeed,
  createFeedPost,
  uploadFeedImage,
  likePost,
  unlikePost,
  addComment,
  listComments,
  getDefaultVisibility,
  setDefaultVisibility,
  type CareerFeedPost,
  type Visibility,
  type Comment,
} from "@/lib/api/career-feed";
import type { MediaItem } from "@/lib/api/feed";

export const Route = createFileRoute("/career/feed")({
  head: () => ({
    meta: [
      { title: "Professional Feed · Samsta Career" },
      { name: "description", content: "Real-time posts from your professional network." },
    ],
  }),
  component: CareerFeedPage,
});

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

function CareerFeedPage() {
  const { user, loading: authLoading } = useAuthUser();
  const [posts, setPosts] = useState<CareerFeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [visibility, setVisibilityState] = useState<Visibility>("public");
  const [showVisibilitySheet, setShowVisibilitySheet] = useState(false);

  useEffect(() => {
    if (!user) return;
    getDefaultVisibility(user.id).then(setVisibilityState).catch(() => {});
  }, [user?.id]);

  const refresh = async () => {
    try {
      const rows = await listCareerFeed(user?.id ?? null);
      setPosts(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    refresh();
    // Realtime: any insert/update/delete on posts, likes, comments → refresh
    const channel = supabase
      .channel("career-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user?.id]);

  const changeVisibility = async (v: Visibility) => {
    setVisibilityState(v);
    setShowVisibilitySheet(false);
    if (user) await setDefaultVisibility(user.id, v).catch(() => {});
  };

  return (
    <CareerShell
      title="Professional Feed"
      subtitle="Real-time posts from your network"
      right={
        <button
          onClick={() => setShowVisibilitySheet(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-xl active:scale-90"
          aria-label="Visibility settings"
          title={visibility === "public" ? "Public posts" : "Followers-only posts"}
        >
          {visibility === "public" ? <Globe2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
        </button>
      }
    >
      {!user && !authLoading && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-xl">
          <p className="text-sm text-white/70">Sign in to view your professional feed.</p>
        </div>
      )}

      {user && (
        <>
          <ComposerCard
            onClick={() => setComposerOpen(true)}
            visibility={visibility}
            onChangeVisibility={() => setShowVisibilitySheet(true)}
          />

          <div className="mt-5 space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-10 text-white/40">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!loading && posts.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
                <Sparkles className="mx-auto mb-3 h-6 w-6 text-[#e8c874]" />
                <div className="font-display text-lg italic">No posts yet</div>
                <p className="mt-1 text-xs text-white/50">Follow people or share your first update.</p>
              </div>
            )}
            {posts.map((p) => (
              <PostCard key={p.id} post={p} viewerId={user.id} onChange={refresh} />
            ))}
          </div>
        </>
      )}

      {composerOpen && user && (
        <ComposerSheet
          userId={user.id}
          visibility={visibility}
          onClose={() => setComposerOpen(false)}
          onCreated={refresh}
        />
      )}

      {showVisibilitySheet && (
        <VisibilitySheet
          current={visibility}
          onSelect={changeVisibility}
          onClose={() => setShowVisibilitySheet(false)}
        />
      )}
    </CareerShell>
  );
}

function ComposerCard({
  onClick,
  visibility,
  onChangeVisibility,
}: {
  onClick: () => void;
  visibility: Visibility;
  onChangeVisibility: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 backdrop-blur-xl">
      <button
        onClick={onClick}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm text-white/50 hover:border-white/20"
      >
        Share an update, insight or win…
      </button>
      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70"
        >
          <ImageIcon className="h-3.5 w-3.5" /> Photo
        </button>
        <button
          onClick={onChangeVisibility}
          className="flex items-center gap-1 rounded-full border border-[#e8c874]/30 bg-[#e8c874]/10 px-3 py-1.5 text-[11px] font-medium text-[#e8c874]"
        >
          {visibility === "public" ? <Globe2 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
          {visibility === "public" ? "Public" : "Followers"}
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function VisibilitySheet({
  current,
  onSelect,
  onClose,
}: {
  current: Visibility;
  onSelect: (v: Visibility) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-white/10 bg-[#0a0f1f] p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h3 className="mb-1 font-display text-lg italic">Post visibility</h3>
        <p className="mb-4 text-xs text-white/50">Applies to all your new posts. Change it anytime — existing posts keep their original visibility.</p>
        {(["public", "followers"] as const).map((v) => (
          <button
            key={v}
            onClick={() => onSelect(v)}
            className={cn(
              "mb-2 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
              current === v ? "border-[#e8c874]/50 bg-[#e8c874]/10" : "border-white/10 bg-white/[0.03]",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
              {v === "public" ? <Globe2 className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{v === "public" ? "Public" : "Followers only"}</div>
              <div className="text-[11px] text-white/50">
                {v === "public" ? "Anyone on Samsta can see your posts" : "Only your accepted followers see your posts"}
              </div>
            </div>
            {current === v && <div className="h-2 w-2 rounded-full bg-[#e8c874]" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function ComposerSheet({
  userId,
  visibility,
  onClose,
  onCreated,
}: {
  userId: string;
  visibility: Visibility;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...imgs].slice(0, 4));
  };

  const submit = async () => {
    if (!caption.trim() && files.length === 0) return;
    setSubmitting(true);
    try {
      const uploaded: MediaItem[] = [];
      for (const f of files) uploaded.push(await uploadFeedImage(userId, f));
      await createFeedPost({ userId, caption: caption.trim(), media: uploaded, visibility });
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Could not post. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-white/10 bg-[#0a0f1f] p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg italic">New post</h3>
          <span className="flex items-center gap-1 rounded-full border border-[#e8c874]/30 bg-[#e8c874]/10 px-2 py-0.5 text-[10px] font-medium text-[#e8c874]">
            {visibility === "public" ? <Globe2 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
            {visibility === "public" ? "Public" : "Followers"}
          </span>
        </div>

        <textarea
          autoFocus
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          maxLength={2000}
          placeholder="Share an update, insight or win…"
          className="min-h-[120px] w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
        />

        {previews.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= 4}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/80 disabled:opacity-40"
          >
            <ImageIcon className="h-4 w-4" /> Add photo {files.length > 0 && `(${files.length}/4)`}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
          <button
            onClick={submit}
            disabled={submitting || (!caption.trim() && files.length === 0)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-5 py-2 text-xs font-bold text-[#05070f] shadow-lg disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  viewerId,
  onChange,
}: {
  post: CareerFeedPost;
  viewerId: string;
  onChange: () => void;
}) {
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    setLiked(post.liked_by_me);
    setLikeCount(post.like_count);
  }, [post.liked_by_me, post.like_count]);

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      if (next) await likePost(post.id, viewerId);
      else await unlikePost(post.id, viewerId);
    } catch (e) {
      console.error(e);
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  };

  const name = post.author?.full_name || post.author?.username || "user";
  const media = post.media;
  const current = media[slide];

  return (
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl animate-fade-in">
      <div className="flex items-center gap-3 px-4 pt-4">
        <div className="h-9 w-9 overflow-hidden rounded-full bg-white/10">
          {post.author?.avatar_url ? (
            <img src={post.author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white/60">
              {name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 leading-tight">
          <div className="text-sm font-semibold">{name}</div>
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <span>{timeAgo(post.created_at)} ago</span>
            <span>·</span>
            {post.visibility === "public" ? <Globe2 className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}
          </div>
        </div>
        <button className="p-1 text-white/40" aria-label="More">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {post.caption && (
        <p className="whitespace-pre-wrap px-4 pt-3 text-sm text-white/90">{post.caption}</p>
      )}

      {media.length > 0 && current && (
        <div className="relative mt-3 aspect-square w-full overflow-hidden bg-black">
          <img src={current.url} alt="" className="h-full w-full object-cover" />
          {media.length > 1 && (
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {media.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === slide ? "w-4 bg-white" : "w-1.5 bg-white/40",
                  )}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-3">
        <button onClick={toggleLike} className="flex items-center gap-1.5 text-sm active:scale-90 transition">
          <Heart className={cn("h-5 w-5", liked ? "fill-rose-500 text-rose-500" : "text-white/80")} strokeWidth={1.8} />
          <span className={cn("text-xs", liked ? "text-rose-400" : "text-white/70")}>{likeCount}</span>
        </button>
        <button onClick={() => setCommentsOpen(true)} className="flex items-center gap-1.5 text-sm active:scale-90 transition">
          <MessageCircle className="h-5 w-5 text-white/80" strokeWidth={1.8} />
          <span className="text-xs text-white/70">{post.comment_count}</span>
        </button>
      </div>

      {commentsOpen && (
        <CommentsSheet
          postId={post.id}
          viewerId={viewerId}
          onClose={() => {
            setCommentsOpen(false);
            onChange();
          }}
        />
      )}
    </article>
  );
}

function CommentsSheet({
  postId,
  viewerId,
  onClose,
}: {
  postId: string;
  viewerId: string;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const refresh = async () => {
    try {
      const rows = await listComments(postId);
      setComments(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await addComment(postId, viewerId, body);
      setBody("");
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl border-t border-white/10 bg-[#0a0f1f] pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20" />
        <h3 className="px-5 py-3 font-display text-lg italic">Comments</h3>
        <div className="flex-1 overflow-y-auto px-5">
          {loading && (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-white/40" /></div>
          )}
          {!loading && comments.length === 0 && (
            <p className="py-8 text-center text-xs text-white/40">Be the first to comment.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="mb-3 flex items-start gap-2">
              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/10">
                {c.author?.avatar_url && <img src={c.author.avatar_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="flex-1">
                <div className="text-xs">
                  <span className="font-semibold text-white/90">{c.author?.username || c.author?.full_name || "user"}</span>{" "}
                  <span className="text-white/80">{c.body}</span>
                </div>
                <div className="mt-0.5 text-[10px] text-white/40">{timeAgo(c.created_at)} ago</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-white/10 px-4 pt-3">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={sending || !body.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] text-[#05070f] disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}