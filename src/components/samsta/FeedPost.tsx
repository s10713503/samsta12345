import { Heart, MessageCircle, Send, Bookmark, ChevronLeft, ChevronRight, MapPin, Repeat2, FileText, Download, Maximize2, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { memo, useEffect, useMemo, useState } from "react";
import { MediaViewer, type ViewerItem } from "./MediaViewer";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ShareSheet } from "./ShareSheet";
import { CommentsSheet } from "./CommentsSheet";
import { LikersSheet } from "./LikersSheet";
import { RepostSheet } from "./RepostSheet";
import { PostMenu } from "./PostMenu";
import type { FeedPost as FeedPostRow } from "@/lib/api/feed";
import { useAuthUser } from "@/hooks/use-auth";
import {
  getLikeState,
  getSaveState,
  getCommentCount,
  likePost,
  unlikePost,
  savePost,
  unsavePost,
  subscribePostInteractions,
} from "@/lib/api/interactions";

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




/** Premium auto-frame: keep the media's own shape, clamped to a tasteful range, and always fill the frame (no black bars). */
function fitRatio(w?: number, h?: number) {
  if (!w || !h) return { ratio: 4 / 5, fit: "cover" as const };
  const raw = w / h;
  const MIN = 4 / 5;      // never taller than 4:5 in feed
  const MAX = 16 / 9;     // never wider than 16:9
  const ratio = Math.min(MAX, Math.max(MIN, raw));
  return { ratio, fit: "cover" as const };
}


function renderRichText(text: string) {
  const parts = text.split(/(@[A-Za-z0-9_.]+|#[A-Za-z0-9_]+)/g);
  return parts.map((p, i) => {
    if (p.startsWith("@")) {
      return (
        <Link key={i} to="/search" search={{ q: p.slice(1) } as any} className="text-primary hover:underline">
          {p}
        </Link>
      );
    }
    if (p.startsWith("#")) {
      return (
        <Link key={i} to="/explore" search={{ tag: p.slice(1) } as any} className="text-primary hover:underline">
          {p}
        </Link>
      );
    }
    return <span key={i}>{p}</span>;
  });
}


function FeedPostImpl({ post, index = 0 }: { post: FeedPostRow; index?: number }) {
  const { user } = useAuthUser();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [burst, setBurst] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [repostOpen, setRepostOpen] = useState(false);
  const [slide, setSlide] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [dims, setDims] = useState<Record<number, { w: number; h: number }>>({});

  const author = post.author;
  const name = author?.username ?? "user";
  const avatar = author?.avatar_url ?? "";
  const visualMedia = post.media.filter((m) => m.type !== "file");
  const fileAttachments = post.media.filter((m) => m.type === "file");
  const media = visualMedia;
  const current = media[slide] ?? media[0];

  const viewerItems: ViewerItem[] = useMemo(
    () => media.map((m) => ({
      id: post.id,
      ownerId: post.user_id,
      image: m.url ?? "",
      type: m.type === "video" ? "video" : "image",
      targetType: "post",
      user: { name, avatar },
      caption: post.caption ?? undefined,
      likes: likeCount,
      comments: commentCount,
    })),
    [media, post.id, post.user_id, post.caption, name, avatar, likeCount, commentCount],
  );
  const viewerMode: "photo" | "reel" = post.kind === "reel" || media.some((m) => m.type === "video") ? "reel" : "photo";

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/${post.id}` : "";
  const isProcessing = post.processing_status === "processing";
  const shareText = `${name} on Samsta`;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let pending: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      const [l, s, c] = await Promise.all([
        getLikeState(post.id, user.id),
        getSaveState(post.id, user.id),
        getCommentCount(post.id),
      ]);
      if (cancelled) return;
      setLiked(l.liked);
      setLikeCount(l.count);
      setSaved(s);
      setCommentCount(c);
    };
    load();
    // Coalesce realtime bursts so a flurry of likes can't thrash React state.
    const scheduleLoad = () => {
      if (pending) clearTimeout(pending);
      pending = setTimeout(load, 250);
    };
    const unsub = subscribePostInteractions(post.id, scheduleLoad);
    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      unsub();
    };
  }, [post.id, user?.id]);

  const toggleLike = async () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      if (next) await likePost(post.id, user.id);
      else await unlikePost(post.id, user.id);
    } catch {
      setLiked(!next);
      setLikeCount((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  };

  const toggleSave = async () => {
    if (!user) return;
    const next = !saved;
    setSaved(next);
    try {
      if (next) await savePost(post.id, user.id);
      else await unsavePost(post.id, user.id);
    } catch {
      setSaved(!next);
    }
  };

  const doubleTap = () => {
    setBurst((b) => b + 1);
    if (!liked) toggleLike();
  };

  return (
    <article className="feed-card animate-fade-up px-4" style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}>
      <div className="glass overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-3">
          <Link
            to="/profile/$userId"
            params={{ userId: post.user_id }}
            search={{} as any}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2.5 active:scale-[0.98]"
            aria-label={`Open ${name}'s profile`}
          >
            <div className="story-gradient h-9 w-9 rounded-full p-[2px]">
              <div className="h-full w-full rounded-full bg-background p-[1.5px]">
                {avatar ? (
                  <img src={avatar} alt="" width={36} height={36} loading="lazy" decoding="async"
                    className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="h-full w-full rounded-full bg-muted" />
                )}
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{name}</div>
              {post.location && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5" />{post.location}
                </div>
              )}
            </div>
          </Link>
          {isProcessing && (
            <span className="mr-2 flex items-center gap-1.5 rounded-full bg-[#d4af37]/15 px-2.5 py-1 text-[10px] font-medium text-[#d4af37]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#d4af37]" />
              Processing {post.processing_progress ?? 0}%
            </span>
          )}
          <PostMenu targetType={post.kind === "story" ? "story" : post.kind === "reel" ? "reel" : "post"} targetId={post.id} authorId={post.user_id} />
        </div>

        {media.length > 0 && (() => {
          const d = dims[slide];
          const { ratio, fit } = fitRatio(d?.w, d?.h);
          return (
          <div
            onDoubleClick={doubleTap}
            className="group premium-frame relative mx-2 mb-1 overflow-hidden rounded-[26px] bg-muted/40 ring-1 ring-[#d4af37]/35 shadow-[0_10px_30px_-12px_hsl(var(--foreground)/0.35)]"
            style={{ aspectRatio: String(ratio), maxHeight: "80vh" }}
          >
            {/* soft blurred backdrop for a premium edge glow */}
            {current?.type !== "video" && current?.url && (
              <div
                aria-hidden
                className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl opacity-40"
                style={{ backgroundImage: `url(${current.url})` }}
              />
            )}
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="absolute inset-0 z-[1] cursor-zoom-in"
              aria-label="Open media preview"
            />
            {current?.type === "video" ? (
              <video
                src={current.url}
                className={cn("relative mx-auto block h-full w-full object-center", fit === "cover" ? "object-cover" : "object-contain")}
                controls
                playsInline
                /* Only the first cards fetch metadata up-front; the rest wait
                   until the user actually reaches them. */
                preload={index < 2 ? "metadata" : "none"}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth) setDims((p) => ({ ...p, [slide]: { w: v.videoWidth, h: v.videoHeight } }));
                }}
              />
            ) : current ? (
              <img
                src={current.url}
                alt={post.caption ?? ""}
                /* First card is the LCP element — load it eagerly, lazy-load the rest. */
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                decoding="async"
                onLoad={(e) => {
                  const im = e.currentTarget;
                  if (im.naturalWidth) setDims((p) => ({ ...p, [slide]: { w: im.naturalWidth, h: im.naturalHeight } }));
                }}
                className={cn(
                  "relative mx-auto block h-full w-full object-center transition-transform duration-500 ease-out group-hover:scale-[1.01]",
                  fit === "cover" ? "object-cover" : "object-contain",
                )}
              />
            ) : null}
            {/* Premium inner outline */}
            <div className="pointer-events-none absolute inset-0 z-[2] rounded-[26px] ring-1 ring-inset ring-white/15" />
            {/* Premium reel shimmer */}
            {post.kind === "reel" && (
              <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/40 via-transparent to-black/10" />
            )}

            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="absolute right-2 bottom-2 z-[3] flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md ring-1 ring-white/20 active:scale-90"
              aria-label="Expand"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            {media.length > 1 && (
              <>
                {slide > 0 && (
                  <button onClick={(e) => { e.stopPropagation(); setSlide((s) => s - 1); }}
                    className="absolute left-2 top-1/2 z-[3] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                {slide < media.length - 1 && (
                  <button onClick={(e) => { e.stopPropagation(); setSlide((s) => s + 1); }}
                    className="absolute right-2 top-1/2 z-[3] -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}
                <div className="absolute right-2 top-2 z-[3] rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                  {slide + 1}/{media.length}
                </div>
              </>
            )}
            {burst > 0 && (
              <Heart
                key={burst}
                className="pointer-events-none absolute left-1/2 top-1/2 z-[3] h-24 w-24 -translate-x-1/2 -translate-y-1/2 animate-heart-pop fill-white text-white drop-shadow-lg"
              />
            )}
          </div>
          );
        })()}

        {fileAttachments.length > 0 && (
          <div className="space-y-2 px-4 pt-3">
            {fileAttachments.map((f, i) => {
              const label = f.filename || (f.path?.split("/").pop() ?? "attachment");
              const kb = f.size ? `${(f.size / 1024).toFixed(0)} KB` : "";
              const isPdf = (f.mime?.includes("pdf")) || label.toLowerCase().endsWith(".pdf");
              return (
                <a
                  key={i}
                  href={f.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3 transition active:scale-[0.99] hover:border-foreground/40"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-transparent">
                    <FileText className="h-5 w-5 text-[#d4af37]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {isPdf ? "PDF" : (f.mime?.split("/")[1]?.toUpperCase() || "FILE")}{kb ? ` · ${kb}` : ""} · Tap to open
                    </div>
                  </div>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        )}


        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button onClick={toggleLike} className="transition-transform active:scale-90" aria-label="Like">
              <Heart className={cn("h-6 w-6 transition-colors", liked ? "fill-[oklch(0.62_0.22_20)] text-[oklch(0.62_0.22_20)]" : "text-foreground")} strokeWidth={1.8} />
            </button>
            <button onClick={() => setCommentsOpen(true)} className="transition-transform active:scale-90" aria-label="Comment">
              <MessageCircle className="h-6 w-6" strokeWidth={1.8} />
            </button>
            <button
              onClick={async () => {
                // Native system share sheet first (iOS/Android/desktop OS),
                // so the link lands in any installed app with its preview card.
                const data = { title: shareText, text: `${shareText}${post.caption ? ` — ${post.caption.slice(0, 120)}` : ""}`, url: shareUrl };
                if (typeof navigator !== "undefined" && navigator.share) {
                  try {
                    await navigator.share(data);
                    return;
                  } catch (err) {
                    if ((err as DOMException)?.name === "AbortError") return;
                  }
                }
                setShareOpen(true);
              }}
              className="transition-transform active:scale-90"
              aria-label="Share"
            >
              <Send className="h-6 w-6" strokeWidth={1.8} />
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  toast.success("Link copied — opens this post on the profile");
                  setTimeout(() => setCopied(false), 1400);
                } catch {
                  setShareOpen(true);
                }
              }}
              className="relative transition-transform active:scale-90"
              aria-label="Copy post link"
            >
              {copied ? (
                <Check key="c" className="h-6 w-6 animate-scale-in text-[oklch(0.72_0.15_300)]" strokeWidth={2} />
              ) : (
                <Link2 className="h-6 w-6" strokeWidth={1.8} />
              )}
            </button>
            <button onClick={() => setRepostOpen(true)} className="transition-transform active:scale-90" aria-label="Repost">
              <Repeat2 className="h-6 w-6" strokeWidth={1.8} />
            </button>
          </div>
          <button onClick={toggleSave} className="transition-transform active:scale-90" aria-label="Save">
            <Bookmark className={cn("h-6 w-6", saved && "fill-foreground")} strokeWidth={1.8} />
          </button>
        </div>

        <div className="px-4 pb-4">
          <button
            onClick={() => likeCount > 0 && setLikersOpen(true)}
            disabled={likeCount === 0}
            className="text-sm font-semibold hover:text-foreground/80 transition-colors disabled:cursor-default"
          >
            {likeCount > 0 ? `${likeCount} ${likeCount === 1 ? "like" : "likes"}` : "Be the first to like"}
          </button>
          {post.caption && (
            <p className="mt-1 text-sm leading-relaxed">
              <span className="font-semibold">{name}</span>{" "}
              <span className="text-foreground/90">{renderRichText(post.caption)}</span>
            </p>
          )}

          {post.hashtags && post.hashtags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {post.hashtags.map((h) => (
                <span key={h} className="text-xs text-primary">#{h}</span>
              ))}
            </div>
          )}
          <button onClick={() => setCommentsOpen(true)} className="mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {commentCount > 0 ? `View all ${commentCount} comment${commentCount === 1 ? "" : "s"}` : "Add a comment"}
          </button>
          <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{timeAgo(post.created_at)} ago</div>
        </div>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share post"
        url={shareUrl}
        text={shareText}
        targetType="post"
        targetId={post.id}
        mediaUrl={current?.url ?? null}
        mediaType={current?.type === "video" ? "video" : "image"}
        username={name}
      />

      <CommentsSheet
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
        postAuthor={name}
        postAvatar={avatar}
      />

      <LikersSheet open={likersOpen} onClose={() => setLikersOpen(false)} postId={post.id} />

      <RepostSheet open={repostOpen} onClose={() => setRepostOpen(false)} postId={post.id} authorName={name} />

      {viewerOpen && viewerItems.length > 0 && (
        <MediaViewer
          items={viewerItems}
          startIndex={slide}
          mode={viewerMode}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </article>
  );
}

// Re-render only when the post content itself changes; parent re-renders from
// pagination or realtime no longer walk every card in the list.
export const FeedPost = memo(
  FeedPostImpl,
  (a, b) =>
    a.index === b.index &&
    a.post.id === b.post.id &&
    a.post.caption === b.post.caption &&
    a.post.media[0]?.url === b.post.media[0]?.url &&
    a.post.author?.avatar_url === b.post.author?.avatar_url,
);
