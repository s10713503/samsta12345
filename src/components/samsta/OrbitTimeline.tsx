// @ts-nocheck
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays, ChevronDown, ChevronLeft, Image as ImageIcon, Film, Video, Mic,
  FileText, File, Play, Pause, Eye, BadgeCheck, X, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeOrbit } from "@/lib/api/orbit";
import { cn } from "@/lib/utils";
import { GridMediaTile } from "@/components/samsta/GridMediaTile";
import {
  bucketFor, categorize, daysInMonth, formatDuration, localDayKey, localTimeZone,
  monthNames, msUntilLocalMidnight, type MediaCategory,
} from "@/lib/timeline";

const CATEGORIES: Array<{ key: MediaCategory; label: string; icon: any }> = [
  { key: "images", label: "Images", icon: ImageIcon },
  { key: "reels", label: "Reels", icon: Film },
  { key: "videos", label: "Videos", icon: Video },
  { key: "podcasts", label: "Podcasts", icon: Mic },
  { key: "pdfs", label: "PDFs", icon: FileText },
  { key: "documents", label: "Documents", icon: File },
];

const PAGE = 60;

/**
 * Re-renders whenever the viewer's local day changes so "Today" becomes
 * "Yesterday" and a fresh Today section appears at 12:00 AM local time —
 * also re-checked when the tab/app returns to the foreground (a sleeping
 * device can miss a plain timer).
 */
function useLocalDayKey() {
  const [day, setDay] = useState(() => localDayKey(new Date()));
  useEffect(() => {
    let timer: any;
    const sync = () => {
      setDay(localDayKey(new Date()));
      clearTimeout(timer);
      timer = setTimeout(sync, msUntilLocalMidnight());
    };
    sync();
    const onWake = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("focus", onWake);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("focus", onWake);
    };
  }, []);
  return day;
}

export function OrbitTimeline({ userId, profile }: { userId: string | null; profile?: any }) {
  const queryClient = useQueryClient();
  const today = useLocalDayKey();
  const [cat, setCat] = useState<MediaCategory>("images");

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState(PAGE);
  const [calOpen, setCalOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<any>(null);
  const scrollKey = `orbit-timeline-scroll:${cat}`;

  const { data: posts = [] } = useQuery({
    queryKey: ["orbit-timeline", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("orbit_posts")
        .select("*")
        .eq("user_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
  });

  // Instant timeline updates after any upload or delete.
  useEffect(() => {
    let t: any;
    return subscribeOrbit(() => {
      clearTimeout(t);
      t = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: ["orbit-timeline", userId] });
      }, 250);
    });
  }, [queryClient, userId]);

  const byCat = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const p of posts) {
      const c = categorize(p);
      (map[c] ||= []).push(p);
    }
    return map;
  }, [posts]);

  const groups = useMemo(() => {
    const items = byCat[cat] ?? [];
    const now = new Date();
    const out: Record<string, { bucket: any; items: any[] }> = {};
    for (const p of items) {
      const b = bucketFor(p.created_at, now);
      (out[b.id] ||= { bucket: b, items: [] }).items.push(p);
    }
    return Object.values(out).sort((a, b) => b.bucket.sort - a.bucket.sort);
  }, [byCat, cat, today]);


  // Infinite scroll: reveal more groups as the sentinel comes into view.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting) setVisible((v) => v + PAGE);
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [groups.length]);

  useEffect(() => setVisible(PAGE), [cat]);

  // Remember scroll position per timeline.
  useEffect(() => {
    const y = Number(sessionStorage.getItem(scrollKey) || 0);
    if (y) requestAnimationFrame(() => window.scrollTo({ top: y }));
    const onScroll = () => sessionStorage.setItem(scrollKey, String(window.scrollY));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [scrollKey]);

  const jumpTo = useCallback((id: string) => {
    setVisible(9999);
    setCalOpen(false);
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  const shown = groups.slice(0, Math.max(1, Math.ceil(visible / 12)));
  const total = (byCat[cat] ?? []).length;

  return (
    <div className="px-4">
      {/* Category timelines */}
      <div className="sticky top-0 z-20 -mx-4 mb-3 px-4 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setCat(key)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 active:scale-95",
                cat === key ? "bg-foreground text-background shadow-lg" : "glass text-muted-foreground")}>
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className="opacity-60">{(byCat[key] ?? []).length}</span>
            </button>
          ))}
          <button onClick={() => setCalOpen((o) => !o)}
            className="glass ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs active:scale-95">
            <CalendarDays className="h-3.5 w-3.5" /> Jump
          </button>
        </div>
      </div>

      {calOpen && <CalendarNavigator groups={groups} onJump={jumpTo} onClose={() => setCalOpen(false)} />}

      <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{total} {cat} · {localTimeZone()}</span>
        {cat === "images" && !!total && (
          <button onClick={() => { setSelecting((s) => !s); setSelected({}); }}
            className="glass rounded-full px-2.5 py-1 active:scale-95">
            {selecting ? `Done (${Object.values(selected).filter(Boolean).length})` : "Select"}
          </button>
        )}
      </div>

      {!groups.length && (
        <div className="glass animate-fade-in rounded-3xl p-8 text-center text-sm text-muted-foreground">
          Nothing in your {cat} timeline yet.
        </div>
      )}

      <div className="flex flex-col gap-5">
        {shown.map(({ bucket, items }, gi) => {
          const isCollapsed = collapsed[bucket.id];
          return (
            <section key={bucket.id} id={bucket.id}
              className="animate-fade-in scroll-mt-24"
              style={{ animationDelay: `${Math.min(gi, 6) * 40}ms` }}>
              <button onClick={() => setCollapsed((c) => ({ ...c, [bucket.id]: !c[bucket.id] }))}
                className="mb-2 flex w-full items-center gap-2 text-left">
                <h3 className={cn("text-[15px] font-semibold tracking-tight",
                  bucket.label === "Today" && "text-primary")}>{bucket.label}</h3>
                <span className="glass rounded-full px-2 py-0.5 text-[10px] text-muted-foreground">{items.length}</span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300",
                  isCollapsed && "-rotate-90")} />
              </button>
              {!isCollapsed && (
                <CategoryGrid cat={cat} items={items} profile={profile}
                  selecting={selecting} selected={selected}
                  onToggleSelect={(id) => setSelected((s) => ({ ...s, [id]: !s[id] }))}
                  onOpen={(p) => setLightbox(p)} />
              )}
            </section>
          );
        })}
      </div>

      <div ref={sentinel} className="h-10" />

      {lightbox && <Lightbox post={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function CategoryGrid({ cat, items, profile, selecting, selected, onToggleSelect, onOpen }: any) {
  if (cat === "images")
    return (
      <div className="grid grid-cols-3 gap-[6px]">
        {items.map((p: any) => (
          <button key={p.id} onClick={() => (selecting ? onToggleSelect(p.id) : onOpen(p))}
            className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-muted/40 shadow-sm ring-1 ring-border/40 transition-all duration-300 active:scale-[0.98]">
            <GridMediaTile media={{ url: p.media_url, type: "image" }} />
            {p.duration_seconds ? (
              <span className="glass-strong absolute left-2 top-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold">LIVE</span>
            ) : null}
            {selecting && (
              <span className={cn("absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border border-white/60 transition-all",
                selected[p.id] ? "bg-primary text-primary-foreground scale-100" : "bg-black/30 scale-90")}>
                {selected[p.id] && <Check className="h-3.5 w-3.5" />}
              </span>
            )}
          </button>
        ))}
      </div>
    );

  if (cat === "reels")
    return (
      <div className="grid grid-cols-3 gap-[6px]">
        {items.map((p: any) => <ReelTile key={p.id} post={p} profile={profile} onOpen={onOpen} />)}
      </div>
    );


  if (cat === "videos")
    return (
      <div className="grid grid-cols-3 gap-[6px]">
        {items.map((p: any) => (
          <button key={p.id} onClick={() => onOpen(p)}
            className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/40 shadow-sm ring-1 ring-border/40 animate-fade-in active:scale-[0.98]">
            <GridMediaTile media={{ url: p.poster_url ?? p.media_url, type: p.poster_url ? "image" : "video" }} />
              <span className="glass-strong pointer-events-none absolute bottom-2 right-2 rounded-full px-1.5 py-0.5 text-[10px]">
                {formatDuration(p.duration_seconds) ?? "HD"}
              </span>
          </button>
        ))}
      </div>
    );


  if (cat === "podcasts")
    return (
      <div className="flex flex-col gap-2">
        {items.map((p: any) => <PodcastRow key={p.id} post={p} />)}
      </div>
    );

  // PDFs / documents / plain posts
  return (
    <div className="flex flex-col gap-2">
      {items.map((p: any) => (
        <a key={p.id} href={p.media_url ?? "#"} target="_blank" rel="noreferrer"
          className="glass-strong flex items-center gap-3 rounded-2xl p-3 active:scale-[0.99]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            {cat === "pdfs" ? <FileText className="h-5 w-5" /> : <File className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{p.title || p.body || "Untitled"}</span>
            <span className="block text-[11px] text-muted-foreground">
              {new Date(p.created_at).toLocaleString(undefined, { timeZone: localTimeZone() })}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

function ReelTile({ post, profile, onOpen }: any) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(

      ([e]) => {
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <button type="button" onClick={() => onOpen?.(post)}
      className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-muted/40 shadow-sm ring-1 ring-border/40 animate-fade-in active:scale-[0.98]">

      <video ref={ref} src={post.media_url} poster={post.poster_url ?? undefined}
        muted loop playsInline preload="none"
        className="h-full w-full object-contain transition-opacity duration-500" />

      <span className="glass-strong absolute bottom-2 right-2 rounded-full px-1.5 py-0.5 text-[10px]">
        {formatDuration(post.duration_seconds) ?? "reel"}
      </span>
      <span className="glass-strong absolute bottom-2 left-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]">
        <Eye className="h-2.5 w-2.5" /> {post.view_count ?? 0}
      </span>
      {profile?.username && (
        <span className="glass-strong absolute left-2 top-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px]">
          @{profile.username} {profile.is_verified && <BadgeCheck className="h-2.5 w-2.5 text-primary" />}
        </span>
      )}
    </button>
  );

}

function PodcastRow({ post }: any) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  return (
    <div className="glass-strong flex items-center gap-3 p-3">
      <span className="relative h-14 w-14 shrink-0 overflow-hidden bg-primary/15">
        {post.poster_url ? (
          <img src={post.poster_url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <Mic className="absolute inset-0 m-auto h-5 w-5 text-primary" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{post.title || post.body || "Podcast"}</p>
        <div className="mt-1 flex h-5 items-end gap-[2px]">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i}
              className={cn("w-[3px] rounded-full bg-primary/60", playing && "animate-pulse")}
              style={{
                height: `${6 + ((i * 7) % 14)}px`,
                animationDelay: `${i * 40}ms`,
                opacity: i / 28 <= progress ? 1 : 0.35,
              }} />
          ))}
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground">{formatDuration(post.duration_seconds) ?? ""}</span>
      <button aria-label={playing ? "Pause" : "Play"}
        onClick={() => {
          const el = ref.current;
          if (!el) return;
          if (playing) { el.pause(); setPlaying(false); }
          else { el.play().catch(() => {}); setPlaying(true); }
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-90">
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <audio ref={ref} src={post.media_url} preload="none"
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setProgress(el.currentTime / el.duration);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }} />
    </div>
  );
}

function CalendarNavigator({ groups, onJump, onClose }: any) {
  const years = useMemo(() => {
    const set = new Set<number>();
    for (const g of groups) set.add(g.bucket.year);
    return [...set].sort((a, b) => b - a);
  }, [groups]);
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const [month, setMonth] = useState<number | null>(null);

  const ids = useMemo(() => new Set(groups.map((g: any) => g.bucket.id)), [groups]);
  const findId = (y: number, m?: number, d?: number) => {
    if (d) {
      const key = `d-${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (ids.has(key)) return key;
    }
    if (m) {
      const key = `m-${y}-${String(m).padStart(2, "0")}`;
      if (ids.has(key)) return key;
      const day = groups.find((g: any) => g.bucket.year === y && g.bucket.month === m);
      if (day) return day.bucket.id;
    }
    const any = groups.find((g: any) => g.bucket.year === y);
    return any?.bucket.id ?? null;
  };

  const todayId = `d-${localDayKey(new Date())}`;

  return (
    <div className="glass-strong animate-scale-in mb-4 rounded-3xl p-3">
      <div className="mb-2 flex items-center gap-2">
        {month ? (
          <button onClick={() => setMonth(null)} className="glass flex h-7 w-7 items-center justify-center rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
        <span className="text-xs font-semibold">{month ? `${monthNames[month - 1]} ${year}` : "Jump to date"}</span>
        <button onClick={() => ids.has(todayId) && onJump(todayId)}
          className="glass ml-auto rounded-full px-2.5 py-1 text-[11px] active:scale-95">Today</button>
        <button onClick={onClose} className="glass flex h-7 w-7 items-center justify-center rounded-full">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!month && (
        <>
          <div className="mb-2 flex gap-1.5 overflow-x-auto">
            {years.map((y) => (
              <button key={y} onClick={() => setYear(y)}
                className={cn("shrink-0 rounded-full px-3 py-1 text-[11px] transition-all active:scale-95",
                  y === year ? "bg-foreground text-background" : "glass text-muted-foreground")}>{y}</button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {monthNames.map((m, i) => (
              <button key={m} onClick={() => setMonth(i + 1)}
                className="glass rounded-xl px-2 py-1.5 text-[11px] active:scale-95">{m.slice(0, 3)}</button>
            ))}
          </div>
        </>
      )}

      {month && year && (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
            const d = i + 1;
            const id = `d-${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const has = ids.has(id);
            return (
              <button key={d} onClick={() => { const t = findId(year, month, d); if (t) onJump(t); }}
                className={cn("aspect-square rounded-lg text-[11px] transition-all active:scale-90",
                  has ? "bg-primary/20 font-semibold text-primary" : "glass text-muted-foreground")}>{d}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PREVIEW_SECONDS = 10;

/** 10-second reel preview with sound; tap "Play full" to watch the rest. */
function VideoPlayer({ post, onClose }: any) {
  const ref = useRef<HTMLVideoElement>(null);
  const [full, setFull] = useState(false);
  const [left, setLeft] = useState(PREVIEW_SECONDS);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    el.play().catch(() => {
      // autoplay with sound blocked → fall back to muted playback
      el.muted = true;
      setMuted(true);
      el.play().catch(() => {});
    });
  }, []);

  return (
    <div onClick={onClose}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 backdrop-blur-xl">
      <video
        ref={ref}
        src={post.media_url}
        poster={post.poster_url ?? undefined}
        playsInline
        autoPlay
        loop={full}
        controls={full}
        onClick={(e) => e.stopPropagation()}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (full) return;
          const remaining = Math.max(0, PREVIEW_SECONDS - el.currentTime);
          setLeft(Math.ceil(remaining));
          if (el.currentTime >= PREVIEW_SECONDS) {
            if ((el.duration || 0) > PREVIEW_SECONDS + 0.3) el.pause();
            else { el.currentTime = 0; el.play().catch(() => {}); }
          }
        }}
        className="animate-scale-in max-h-full max-w-full object-contain" />

      {!full && (
        <div onClick={(e) => e.stopPropagation()}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2">
          <span className="glass-strong rounded-full px-3 py-1.5 text-[11px] font-medium">
            {left > 0 ? `${left}s preview` : "Preview ended"}
          </span>
          <button
            onClick={() => {
              setFull(true);
              const el = ref.current;
              if (el) { el.muted = false; setMuted(false); el.play().catch(() => {}); }
            }}
            className="rounded-full bg-white px-4 py-1.5 text-[11px] font-semibold text-black active:scale-95">
            Play full
          </button>
        </div>
      )}

      {muted && (
        <button onClick={(e) => {
            e.stopPropagation();
            const el = ref.current;
            if (el) { el.muted = false; el.volume = 1; setMuted(false); el.play().catch(() => {}); }
          }}
          className="glass-strong absolute left-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-semibold">
          Tap for sound
        </button>
      )}

      <button aria-label="Close" onClick={onClose}
        className="glass-strong absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function Lightbox({ post, onClose }: any) {
  const isVideo = post?.kind === "video" || post?.kind === "reel" ||
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(post?.media_url ?? "");
  if (isVideo) return <VideoPlayer post={post} onClose={onClose} />;
  return (
    <div onClick={onClose}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl">
      <img src={post.media_url} alt={post.body || "Photo"}
        className="animate-scale-in max-h-full max-w-full touch-pinch-zoom object-contain"
        style={{ touchAction: "pinch-zoom" }} />

      <button aria-label="Close" onClick={onClose}
        className="glass-strong absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
