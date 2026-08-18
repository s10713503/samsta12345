import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Send, Music2, Pause, Play, Trash2, Share2, Eye } from "lucide-react";
import { ShareSheet } from "@/components/samsta/ShareSheet";
import { StoryViewersSheet } from "@/components/samsta/StoryViewersSheet";
import { markStoryViewed, getStoryViewCount } from "@/lib/api/stories";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import type { ShareTargetType } from "@/lib/api/share";

export type ViewerItem = {
  id?: string;
  ownerId?: string;
  image: string;
  type?: "image" | "video";
  targetType?: ShareTargetType;
  user?: { name: string; avatar: string };
  caption?: string;
  likes?: number;
  comments?: number;
};

type Props = {
  items: ViewerItem[];
  startIndex: number;
  mode: "photo" | "reel" | "story";
  onClose: () => void;
  onDelete?: (item: ViewerItem) => void | Promise<void>;
};

const IMAGE_DURATION = 10_000;

export function MediaViewer({ items, startIndex, mode, onClose, onDelete }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartT = useRef<number>(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ dist: number; zoom: number; cx: number; cy: number; pan: { x: number; y: number } } | null>(null);
  const panStart = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(performance.now());
  const elapsedRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { user } = useAuthUser();

  const isTimed = mode === "reel" || mode === "story";
  const current = items[index];
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = current?.caption || `View this ${current?.targetType ?? mode} on Samsta`;
  const isStory = mode === "story";
  const isOwner = isStory && !!current?.ownerId && !!user && current.ownerId === user.id;
  const currentViewCount = current?.id ? viewCounts[current.id] ?? 0 : 0;

  // Mark viewed + fetch count when entering a story
  useEffect(() => {
    if (!isStory || !current?.id) return;
    const storyId = current.id;
    const ownerId = current.ownerId;
    if (user && ownerId && ownerId !== user.id) {
      void markStoryViewed(storyId, user.id);
    }
    void getStoryViewCount(storyId).then((n) => {
      setViewCounts((prev) => ({ ...prev, [storyId]: n }));
    });
  }, [isStory, current?.id, current?.ownerId, user?.id]);

  // Live view-count updates for the story currently shown
  useEffect(() => {
    if (!isStory || !current?.id) return;
    const storyId = current.id;
    const ch = supabase
      .channel(`story-count-${storyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "story_views", filter: `story_id=eq.${storyId}` },
        () => {
          setViewCounts((prev) => ({ ...prev, [storyId]: (prev[storyId] ?? 0) + 1 }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isStory, current?.id]);


  useEffect(() => {
    setLiked(false);
    setProgress(0);
    elapsedRef.current = 0;
    startRef.current = performance.now();
  }, [index]);

  useEffect(() => {
    if (!isTimed) return;
    if (current?.type === "video") {
      const video = videoRef.current;
      if (!video) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      if (paused) {
        video.pause();
        rafRef.current = null;
        return;
      }

      void video.play().catch(() => undefined);
      const tick = () => {
        const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;
        setProgress(duration ? Math.min(1, currentTime / duration) : 0);
        if (!video.ended) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }

    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      elapsedRef.current += performance.now() - startRef.current;
      return;
    }
    startRef.current = performance.now();
    const tick = () => {
      const total = elapsedRef.current + (performance.now() - startRef.current);
      const p = Math.min(1, total / IMAGE_DURATION);
      setProgress(p);
      if (p >= 1) {
        if (index < items.length - 1) setIndex(index + 1);
        else onClose();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [index, paused, isTimed, items.length, onClose, current?.type]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") { setDirection(1); setIndex((i) => Math.min(items.length - 1, i + 1)); }
      if (e.key === "ArrowLeft") { setDirection(-1); setIndex((i) => Math.max(0, i - 1)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, onClose]);

  function resetZoom() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function next() { resetZoom(); setDirection(1); if (index < items.length - 1) setIndex(index + 1); else onClose(); }
  function prev() { resetZoom(); setDirection(-1); if (index > 0) setIndex(index - 1); }

  function dist(a: React.Touch, b: React.Touch) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const [a, b] = [e.touches[0], e.touches[1]];
      pinchRef.current = { dist: dist(a, b), zoom, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2, pan };
      setPaused(true);
      return;
    }
    const t = e.touches[0];
    if (zoom > 1) {
      panStart.current = { x: t.clientX, y: t.clientY, pan };
      return;
    }
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchStartT.current = performance.now();
    setDragging(true);
    setPaused(true);
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinchRef.current) {
      const p = pinchRef.current;
      const nextZoom = Math.min(6, Math.max(1, (dist(e.touches[0], e.touches[1]) / p.dist) * p.zoom));
      setZoom(nextZoom);
      return;
    }
    if (panStart.current && zoom > 1) {
      const t = e.touches[0];
      setPan({
        x: panStart.current.pan.x + (t.clientX - panStart.current.x),
        y: panStart.current.pan.y + (t.clientY - panStart.current.y),
      });
      return;
    }
    if (touchStartX.current == null || touchStartY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx) * 1.3) return; // let vertical scroll pass
    setDragX(dx);
  }
  function onTouchEnd(e?: React.TouchEvent) {
    if (pinchRef.current && (!e || e.touches.length < 2)) {
      pinchRef.current = null;
      if (zoom <= 1.05) resetZoom();
      setPaused(false);
      return;
    }
    if (panStart.current) { panStart.current = null; setPaused(false); return; }
    const dx = dragX;
    const dt = performance.now() - touchStartT.current;
    const velocity = Math.abs(dx) / Math.max(dt, 1);
    const threshold = 60;
    setDragging(false);
    touchStartX.current = null;
    touchStartY.current = null;
    if (dx <= -threshold || (dx < 0 && velocity > 0.5)) {
      setDragX(0);
      next();
    } else if (dx >= threshold || (dx > 0 && velocity > 0.5)) {
      setDragX(0);
      prev();
    } else {
      setDragX(0);
    }
    setPaused(false);
  }

  async function handleDelete() {
    if (!current || !onDelete || deleting) return;
    if (!window.confirm("Delete this upload?")) return;
    setDeleting(true);
    try {
      await onDelete(current);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black animate-fade-in">
      {/* Progress bars for story/reel */}
      {isTimed && (
        <div className="absolute left-3 right-3 top-3 z-20 flex gap-1.5">
          {items.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25 shadow-lg backdrop-blur">
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-white via-rose-100 to-amber-100 shadow-lg transition-transform duration-75 ease-linear"
                style={{ transform: `scaleX(${i < index ? 1 : i === index ? progress : 0})`, transitionDuration: i === index ? "75ms" : "0ms" }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="absolute left-3 right-3 top-8 z-20 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          {current.user && (
            <>
              <img src={current.user.avatar} alt="" className="h-9 w-9 rounded-full border-2 border-white object-cover" />
              <div>
                <div className="text-sm font-semibold">{current.user.name}</div>
                <div className="text-[11px] opacity-80">{index + 1} / {items.length}</div>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShareOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </button>
          {onDelete && current?.id && (
            <button onClick={handleDelete} disabled={deleting} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur disabled:opacity-50" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {isTimed && (
            <button onClick={() => setPaused((p) => !p)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur" aria-label={paused ? "Play" : "Pause"}>
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          )}
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Media */}
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden select-none"
        onClick={(e) => {
          if (zoom > 1) return;
          if (Math.abs(dragX) > 4) return; // ignore taps after a swipe
          const w = (e.currentTarget as HTMLDivElement).clientWidth;
          const x = e.clientX - (e.currentTarget as HTMLDivElement).getBoundingClientRect().left;
          if (x < w / 3) prev(); else if (x > (2 * w) / 3) next();
        }}
        onDoubleClick={() => {
          if (mode === "photo") { zoom > 1 ? resetZoom() : setZoom(2.5); return; }
          setLiked(true);
        }}
        onWheel={(e) => {
          if (mode !== "photo") return;
          const nz = Math.min(6, Math.max(1, zoom - e.deltaY * 0.002));
          setZoom(nz);
          if (nz === 1) setPan({ x: 0, y: 0 });
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => onTouchEnd()}
        style={{ touchAction: zoom > 1 ? "none" : undefined }}
      >
        <div
          key={index}
          className={`relative h-full w-full ${dragging ? "" : direction === 1 ? "animate-story-in-right" : "animate-story-in-left"}`}
          style={{
            transform: `perspective(1400px) translate3d(${dragX + pan.x}px, ${pan.y}px, ${dragging ? -Math.min(120, Math.abs(dragX) * 0.5) : 0}px) rotateY(${dragging ? -dragX * 0.03 : 0}deg) scale(${zoom * (dragging ? 0.985 : 1)})`,
            transition: dragging || zoom > 1 ? "none" : "transform 420ms cubic-bezier(0.16, 1, 0.3, 1), opacity 420ms ease",
            opacity: dragging ? Math.max(0.55, 1 - Math.abs(dragX) / 600) : 1,
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
            willChange: "transform, opacity, filter",
          }}
        >
          {current.type === "video" && current.image ? (
            <video
              key={current.image + index}
              ref={videoRef}
              src={current.image}
              className="h-full w-full object-contain"

              
              autoPlay
              playsInline
              onPlay={() => setPaused(false)}
              onPause={() => setPaused(true)}
              onLoadedMetadata={(e) => {
                if (!isTimed) return;
                const v = e.currentTarget;
                if (Number.isFinite(v.duration) && v.duration > 0) setProgress(Math.min(1, v.currentTime / v.duration));
              }}
              onEnded={() => {
                if (!isTimed) return;
                setProgress(1);
                if (index < items.length - 1) { setDirection(1); setIndex(index + 1); }
                else onClose();
              }}
            />
          ) : current.image ? (
            <img
              key={current.image + index}
              src={current.image}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-6 text-center text-sm text-white/70">
              This media file is no longer available.
            </div>
          )}
        </div>

        {/* Premium light sweep on each slide change */}
        {!dragging && (
          <div key={`sheen-${index}`} className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 -left-1/3 w-1/3 animate-story-sheen bg-gradient-to-r from-transparent via-white/25 to-transparent blur-md" />
          </div>
        )}

        {mode !== "photo" && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />}

        {/* Edge fade hints during swipe */}
        {dragging && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/60 to-transparent" style={{ opacity: Math.max(0, dragX) / 120 }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/60 to-transparent" style={{ opacity: Math.max(0, -dragX) / 120 }} />
          </>
        )}

        {liked && (
          <Heart className="pointer-events-none absolute h-40 w-40 fill-white text-white animate-heart-pop drop-shadow-2xl" />
        )}
      </div>


      {/* Side nav (desktop) */}
      {index > 0 && (
        <button onClick={prev} className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur md:flex">
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {index < items.length - 1 && (
        <button onClick={next} className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur md:flex">
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Footer for photo/reel */}
      {mode !== "story" && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-4 p-4 pb-8 text-white">
          <div className="max-w-[75%] space-y-1.5">
            {current.caption && <p className="text-sm leading-relaxed drop-shadow">{current.caption}</p>}
            {mode === "reel" && current.user && (
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Music2 className="h-3.5 w-3.5" /> Original audio · {current.user.name}
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-4">
            <button onClick={() => setLiked((v) => !v)} className="flex flex-col items-center gap-1 active:scale-90 transition">
              <Heart className={`h-7 w-7 ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
              <span className="text-[11px]">{((current.likes ?? 0) + (liked ? 1 : 0)).toLocaleString()}</span>
            </button>
            <button className="flex flex-col items-center gap-1"><MessageCircle className="h-7 w-7" /><span className="text-[11px]">{current.comments ?? 0}</span></button>
            <button onClick={() => setShareOpen(true)} className="flex flex-col items-center gap-1"><Send className="h-7 w-7" /></button>
          </div>
        </div>
      )}

      {/* Story view-count footer */}
      {isStory && current?.id && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 px-4 pb-6 text-white">
          {isOwner ? (
            <button
              onClick={() => { setPaused(true); setViewersOpen(true); }}
              className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur active:scale-95"
              aria-label="See viewers"
            >
              <Eye className="h-4 w-4" />
              <span>{currentViewCount.toLocaleString()}</span>
              <span className="opacity-80">{currentViewCount === 1 ? "view" : "views"}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] backdrop-blur">
              <Eye className="h-3.5 w-3.5" />
              <span>{currentViewCount.toLocaleString()}</span>
            </div>
          )}
          <div className="flex-1" />
        </div>
      )}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share upload"
        url={shareUrl}
        text={shareText}
        targetType={current?.targetType}
        targetId={current?.id}
        mediaUrl={current?.image ?? null}
        mediaType={current?.type === "video" ? "video" : "image"}
        username={current?.user?.name}
      />
      <StoryViewersSheet
        storyId={current?.id ?? null}
        open={viewersOpen}
        onClose={() => { setViewersOpen(false); setPaused(false); }}
      />
    </div>
  );
}

