// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Bookmark, Share2, Volume2, VolumeX, Gauge, Plus, Mic, Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { OrbitStudio } from "@/components/samsta/OrbitStudio";
import { supabase } from "@/integrations/supabase/client";
import { toggleOrbitLike, toggleOrbitBookmark, subscribeOrbit } from "@/lib/api/orbit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orbit/reels")({
  component: OrbitReels,
  head: () => ({
    meta: [
      { title: "Reels — Samsta Orbit" },
      { name: "description", content: "Vertical Orbit reels with autoplay, speed control and AI recommendations — kept separate from the feed." },
      { property: "og:title", content: "Reels — Samsta Orbit" },
      { property: "og:description", content: "Full-screen vertical video inside Samsta Orbit." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SPEEDS = [1, 1.25, 1.5, 2];

function OrbitReels() {
  const { user } = useAuthUser();
  const [muted, setMuted] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [studio, setStudio] = useState(false);

  const { data: reels = [], refetch } = useQuery({
    queryKey: ["orbit-reels"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("orbit_posts")
        .select("id, user_id, body, media_url, poster_url, like_count, reply_count, created_at")
        .eq("kind", "video").not("media_url", "is", null).is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
    staleTime: 30_000,
  });


  // Live: new reels/photos/podcasts from anyone appear without a refresh.
  useEffect(() => {
    let t: any;
    return subscribeOrbit(() => { clearTimeout(t); t = setTimeout(() => refetch(), 500); });
  }, [refetch]);

  return (
    <div className="relative min-h-dvh pb-28">
      <OrbitHeader title="Orbit Reels" subtitle="Vertical · Autoplay · AI picks"
        right={
          <div className="flex gap-2">
            <button onClick={() => setStudio(true)} aria-label="Create reel"
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-white shadow-md active:scale-90"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
              <Plus className="h-3.5 w-3.5" /> Create
            </button>
            <Link to="/orbit/podcasts" aria-label="Orbit podcasts"
              className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90">
              <Mic className="h-4 w-4" />
            </Link>
            <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}
              className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])} aria-label="Playback speed"
              className="glass flex h-9 items-center gap-1 rounded-full px-2.5 text-[11px] active:scale-90">
              <Gauge className="h-3.5 w-3.5" /> {speed}x
            </button>
          </div>
        } />

      <main className="relative mt-3 h-[calc(100dvh-9rem)] snap-y snap-mandatory overflow-y-auto px-4">
        {!reels.length && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">No Orbit reels yet — post the first one.</div>
        )}
        {reels.map((r: any) => (
          <ReelItem key={r.id} reel={r} muted={muted} speed={speed} userId={user?.id ?? null} />
        ))}
      </main>

      <OrbitStudio open={studio} onClose={() => setStudio(false)} userId={user?.id ?? null}
        initialKind="video" onDone={() => refetch()} />
    </div>
  );
}

function ReelItem({ reel, muted, speed, userId }: any) {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);

  // Autoplay the reel that is on screen, pause the rest — no tap needed.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        const on = e.isIntersecting && e.intersectionRatio >= 0.5;
        setActive(on);
        if (on) setPaused(false);
      },
      { threshold: [0, 0.5, 0.9] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Only the reel in view produces sound; the rest are muted and paused.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.playbackRate = speed;
    el.muted = muted || !active;
    if (active && !paused) {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Autoplay with sound can be blocked — fall back to muted playback.
          el.muted = true;
          const q = el.play();
          if (q && typeof q.catch === "function") q.catch(() => {});
        });
      }
    } else {
      el.pause();
      if (!active) {
        try { el.currentTime = 0; } catch { /* ignore */ }
      }
    }
  }, [muted, speed, active, paused]);

  return (
    <section className="relative mb-4 h-[78dvh] snap-start overflow-hidden rounded-[2rem] bg-black/80">
      <video ref={ref} src={reel.media_url} poster={reel.poster_url ?? undefined} playsInline loop
        preload="auto" className="h-full w-full object-contain" />

      {/* Tap anywhere to pause/resume this reel. */}
      <button type="button" onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "Resume reel" : "Pause reel"}
        className="absolute inset-0 z-[5] flex items-center justify-center focus:outline-none">
        <span className={cn(
          "grid h-20 w-20 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md transition-all duration-300",
          paused ? "scale-100 opacity-100" : "scale-75 opacity-0",
        )}>
          <Play className="h-9 w-9 translate-x-0.5 fill-white" strokeWidth={0} />
        </span>
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
        <p className="line-clamp-2 text-sm text-white">{reel.body}</p>
      </div>
      <div className="absolute bottom-6 right-3 z-10 flex flex-col items-center gap-4 text-white">
        <button aria-label="Like" onClick={() => { setLiked(!liked); if (userId) toggleOrbitLike(reel.id, userId, !liked).catch(() => {}); }}>
          <Heart className={cn("h-6 w-6", liked && "fill-current text-rose-400")} />
        </button>
        <MessageCircle className="h-6 w-6" />
        <button aria-label="Save" onClick={() => { setSaved(!saved); if (userId) toggleOrbitBookmark(reel.id, userId, !saved).catch(() => {}); }}>
          <Bookmark className={cn("h-6 w-6", saved && "fill-current")} />
        </button>
        <Share2 className="h-6 w-6" />
      </div>
    </section>
  );
}

