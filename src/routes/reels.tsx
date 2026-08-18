import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Heart, MessageCircle, Send, Bookmark, Music2, ArrowLeft, MoreHorizontal, Volume2, VolumeX, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ShareSheet } from "@/components/samsta/ShareSheet";
import { CommentsSheet } from "@/components/samsta/CommentsSheet";
import { listTrendingReels, type FeedPost } from "@/lib/api/feed";
import { useRealtimeFeed } from "@/hooks/use-realtime";
import { useAuthUser } from "@/hooks/use-auth";
import { getLikeState, likePost, unlikePost, getCommentCount } from "@/lib/api/interactions";
import { getRecommendedReels, getRelatedReels, trackReelEvent } from "@/lib/api/recommend";

export const Route = createFileRoute("/reels")({
  component: ReelsPage,
  head: () => ({
    meta: [
      { title: "Reels · Samsta" },
      { name: "description", content: "Watch public and trending reels from creators across Samsta." },
      { property: "og:title", content: "Reels · Samsta" },
      { property: "og:description", content: "Watch public and trending reels from creators across Samsta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Tab = "foryou" | "trending";

function ReelsPage() {
  const [tab, setTab] = useState<Tab>("foryou");
  const [muted, setMuted] = useState(true);
  const router = useRouter();
  const { user } = useAuthUser();

  // ---- personalised infinite feed ----
  const [foryou, setForyou] = useState<FeedPost[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const seenRef = useRef<string[]>([]);

  const loadMore = useCallback(async () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    try {
      const next = await getRecommendedReels(8, seenRef.current);
      const fresh = next.filter((r) => !seenRef.current.includes(r.id));
      if (!fresh.length) setExhausted(true);
      seenRef.current = [...seenRef.current, ...fresh.map((r) => r.id)];
      setForyou((prev) => [...prev, ...fresh]);
    } catch {
      setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, exhausted]);

  useEffect(() => {
    if (tab === "foryou" && foryou.length === 0) void loadMore();
  }, [tab, foryou.length, loadMore]);

  // Watched half a reel (or held on it)? Queue up reels on the same topic next.
  const injectRelated = useCallback(async (postId: string) => {
    try {
      const related = await getRelatedReels(postId, 4, seenRef.current);
      if (!related.length) return;
      seenRef.current = [...seenRef.current, ...related.map((r) => r.id)];
      setForyou((prev) => {
        const at = prev.findIndex((p) => p.id === postId);
        if (at < 0) return [...prev, ...related];
        const next = [...prev];
        next.splice(at + 1, 0, ...related);
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  const { data: trending = [], isLoading: trendingLoading } = useQuery({
    queryKey: ["reels", "trending"],
    queryFn: listTrendingReels,
    enabled: tab === "trending",
  });
  useRealtimeFeed("reel", ["feed", "reel"]);

  const reels = tab === "trending" ? trending : foryou;
  const isLoading = tab === "trending" ? trendingLoading : foryou.length === 0 && loadingMore;

  return (
    <div className="snap-y snap-mandatory h-screen overflow-y-auto relative bg-black">
      <button
        type="button"
        aria-label="Back"
        onClick={() => {
          if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
          else router.navigate({ to: "/" });
        }}
        className="fixed left-4 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl bg-white/10 text-white ring-1 ring-white/20 transition active:scale-90">
        <ArrowLeft className="h-5 w-5" strokeWidth={2} />
      </button>

      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        onClick={() => setMuted((m) => !m)}
        className="fixed right-4 top-5 z-50 flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl bg-white/10 text-white ring-1 ring-white/20 transition active:scale-90">
        {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
      </button>

      <div className="fixed inset-x-0 top-5 z-40 flex justify-center">
        <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-xl ring-1 ring-white/20">
          {(["foryou", "trending"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium transition",
                tab === t ? "bg-white text-black" : "text-white/80",
              )}
            >
              {t === "foryou" ? "For you" : "Trending"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-screen items-center justify-center text-white/70">Loading…</div>
      ) : reels.length === 0 ? (
        <div className="flex h-screen flex-col items-center justify-center gap-3 text-center text-white/80 px-8">
          <div className="font-display text-2xl italic">No reels yet</div>
          <p className="text-sm text-white/60 max-w-xs">Be the first — upload a video reel from Create.</p>
          <Link to="/create" search={{ mode: "reel" } as any} className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black">Create a reel</Link>
        </div>
      ) : (
        reels.map((r, i) => (
          <ReelItem
            key={r.id}
            r={r}
            idx={i}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            onUnmute={() => setMuted(false)}
            onNearEnd={tab === "foryou" && i >= reels.length - 3 ? loadMore : undefined}
            onDeepWatch={tab === "foryou" ? injectRelated : undefined}
          />
        ))
      )}
      {tab === "foryou" && loadingMore && foryou.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 text-center text-xs text-white/60">
          Finding more for you…
        </div>
      )}
    </div>
  );
}

function ReelItem({ r, idx, muted, onToggleMute, onUnmute, onNearEnd, onDeepWatch }: { r: FeedPost; idx: number; muted: boolean; onToggleMute: () => void; onUnmute: () => void; onNearEnd?: () => void; onDeepWatch?: (postId: string) => void }) {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const watchRef = useRef({ startedAt: 0, watchedMs: 0, replays: 0, lastTime: 0 });
  const deepRef = useRef(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState(0);
  const [saved, setSaved] = useState(false);
  const [active, setActive] = useState(false);
  // "near" = within one screen of the viewport. Only these buffer video.
  const [near, setNear] = useState(false);
  const [paused, setPaused] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const media = r.media[0];
  const name = r.author?.username ?? "user";
  const avatar = r.author?.avatar_url ?? "";

  // Play only the reel in view; keep sound in sync with the global mute toggle.
  useEffect(() => {
    const el = sectionRef.current;
    const vid = videoRef.current;
    if (!el || !vid) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          setPaused(false);
          watchRef.current = { startedAt: Date.now(), watchedMs: 0, replays: 0, lastTime: 0 };
          onNearEnd?.();
          vid.play().catch(() => {});
        } else {
          setActive(false);
          setPaused(false);
          vid.pause();
          vid.muted = true;
          // Emit the watch signal that drives the recommendation model.
          const w = watchRef.current;
          if (w.startedAt) {
            const watched = Date.now() - w.startedAt;
            const dur = Number.isFinite(vid.duration) ? Math.round(vid.duration * 1000) : 0;
            trackReelEvent(r.id, watched < 2000 ? "skip" : "view", {
              watchMs: watched,
              durationMs: dur,
              meta: { replays: w.replays, muted, position: idx },
            });
            if (w.replays > 0) trackReelEvent(r.id, "replay", { watchMs: watched, durationMs: dur });
            w.startedAt = 0;
          }
          try { vid.currentTime = 0; } catch { /* ignore */ }
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [media?.url, r.id, idx, muted, onNearEnd]);

  // Preload window: without this every reel in the DOM downloaded its full
  // video at once, saturating the network and stalling scrolling.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Loop detection = replay signal.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onTime = () => {
      const w = watchRef.current;
      if (vid.currentTime + 0.5 < w.lastTime) w.replays += 1;
      w.lastTime = vid.currentTime;
      // Half (or 6s of holding on) the reel = strong interest signal.
      const dur = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : 0;
      const deep = dur ? vid.currentTime >= dur * 0.5 : vid.currentTime >= 6;
      if (deep && !deepRef.current) {
        deepRef.current = true;
        onDeepWatch?.(r.id);
      }
    };
    vid.addEventListener("timeupdate", onTime);
    return () => vid.removeEventListener("timeupdate", onTime);
  }, [media?.url, r.id, onDeepWatch]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    // Only the reel currently in view is allowed to produce sound.
    vid.muted = muted || !active;
    if (active && !paused) vid.play().catch(() => {});
    else vid.pause();
  }, [muted, active, paused]);

  // Tap anywhere on the reel to pause/resume (audio follows the video).
  const togglePlayback = () => {
    if (!media || media.type !== "video") return;
    setPaused((p) => {
      const next = !p;
      if (!next) onUnmute();
      return next;
    });
  };


  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [state, count] = await Promise.all([
          getLikeState(r.id, user?.id ?? "00000000-0000-0000-0000-000000000000"),
          getCommentCount(r.id),
        ]);
        if (!alive) return;
        setLiked(state.liked);
        setLikes(state.count);
        setComments(count);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [r.id, user?.id]);

  const toggleLike = async () => {
    if (!user) return;
    const next = !liked;
    setLiked(next);
    setLikes((n) => Math.max(0, n + (next ? 1 : -1)));
    try {
      if (next) await likePost(r.id, user.id);
      else await unlikePost(r.id, user.id);
      if (next) trackReelEvent(r.id, "like");
      qc.invalidateQueries({ queryKey: ["reels", "trending"] });
    } catch {
      setLiked(!next);
      setLikes((n) => Math.max(0, n + (next ? -1 : 1)));
    }
  };

  return (
    <section ref={sectionRef} className="snap-start premium-frame relative h-screen w-full overflow-hidden bg-black">
      {media?.url && (
        <div
          aria-hidden
          className="absolute inset-0 scale-110 bg-cover bg-center blur-3xl opacity-45"
          style={{ backgroundImage: `url(${media.url})` }}
        />
      )}
      {media?.type === "video" ? (
        <video
          ref={videoRef}
          src={media.url}
          preload={active ? "auto" : near ? "metadata" : "none"}
          className="absolute inset-0 h-full w-full object-cover object-center"
          autoPlay={false}
          muted={muted || !active}
          loop
          playsInline
        />
      ) : media ? (
        <img
          src={media.url}
          alt={r.caption ?? `Reel by ${name}`}
          loading={idx === 0 ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : null}

      {media?.type === "video" && (
        <button
          type="button"
          onClick={togglePlayback}
          aria-label={paused ? "Resume reel" : "Pause reel"}
          className="absolute inset-0 z-[5] flex items-center justify-center focus:outline-none"
        >
          <span
            className={cn(
              "grid h-20 w-20 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/25 backdrop-blur-md transition-all duration-300",
              paused ? "scale-100 opacity-100" : "scale-75 opacity-0",
            )}
          >
            <Play className="h-9 w-9 translate-x-0.5 fill-white" strokeWidth={0} />
          </span>
        </button>
      )}


      <div className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-black/92 via-black/50 to-transparent" />

      <div className="absolute right-3 bottom-20 z-10 flex flex-col items-center gap-5 text-white">
        <button onClick={toggleLike} aria-label="Like" className="flex flex-col items-center gap-1 active:scale-90 transition">
          <Heart className={cn("h-7 w-7 drop-shadow-md transition-colors", liked && "fill-[oklch(0.68_0.22_20)] text-[oklch(0.68_0.22_20)]")} strokeWidth={liked ? 0 : 2} />
          <span className="text-[11px] font-semibold tabular-nums drop-shadow">{likes}</span>
        </button>
        <button onClick={() => { setCommentsOpen(true); trackReelEvent(r.id, "comment"); }} aria-label="Comments" className="flex flex-col items-center gap-1 active:scale-90 transition">
          <MessageCircle className="h-7 w-7 drop-shadow-md" strokeWidth={2} />
          <span className="text-[11px] font-semibold tabular-nums drop-shadow">{comments}</span>
        </button>
        <button onClick={() => { setShareOpen(true); trackReelEvent(r.id, "share"); }} aria-label="Share" className="flex flex-col items-center gap-1 active:scale-90 transition">
          <Send className="h-7 w-7 drop-shadow-md" strokeWidth={2} />
        </button>
        <button onClick={() => { setSaved((s) => { if (!s) trackReelEvent(r.id, "save"); return !s; }); }} aria-label="Save" className="flex flex-col items-center gap-1 active:scale-90 transition">
          <Bookmark className={cn("h-7 w-7 drop-shadow-md", saved && "fill-white")} strokeWidth={2} />
        </button>
        <button aria-label="More" className="active:scale-90 transition">
          <MoreHorizontal className="h-6 w-6 drop-shadow-md" strokeWidth={2} />
        </button>
        {avatar && (
          <div className="mt-1 h-9 w-9 rounded-full ring-2 ring-white/70 overflow-hidden animate-[spin_6s_linear_infinite]">
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-8 z-10 px-4 pr-20 text-white">
        <Link to="/profile/$userId" params={{ userId: r.user_id }} search={{} as any} onClick={() => trackReelEvent(r.id, "profile_visit")} className="flex items-center gap-2.5">
          {avatar && <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/90 shadow-lg" />}
          <span className="font-semibold text-sm drop-shadow">{name}</span>
        </Link>
        {r.caption && <p className="mt-1.5 text-[15px] leading-snug line-clamp-2 drop-shadow">{r.caption}</p>}
        <div className="mt-1.5 flex items-center gap-1.5 text-xs opacity-95">
          <Music2 className="h-3.5 w-3.5" />
          <span className="truncate">Original audio · {name}</span>
        </div>
      </div>

      <CommentsSheet
        open={commentsOpen}
        onClose={() => {
          setCommentsOpen(false);
          getCommentCount(r.id).then(setComments).catch(() => {});
        }}
        postId={r.id}
        postAuthor={name}
        postAvatar={avatar}
      />

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share reel"
        url={typeof window !== "undefined" ? `${window.location.origin}/reels?r=${idx}` : ""}
        text={`${name} on Samsta`}
        targetType="reel"
        targetId={r.id}
        username={name}
        mediaType="video"
      />
    </section>
  );
}
