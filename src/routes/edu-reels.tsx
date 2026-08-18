// @ts-nocheck
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart, MessageCircle, Send, Bookmark, ArrowLeft, GraduationCap,
  ShieldCheck, Home, Film, User, BookOpen, Sparkles, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/hooks/use-auth";
import { listApprovedReels, toggleReelLike, toggleReelSave, recordWatch, type EduReel } from "@/lib/api/edu-reels";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/edu-reels")({
  component: EduReelsPage,
  head: () => ({
    meta: [
      { title: "Educational Reels · Samsta" },
      { name: "description", content: "moderated educational reels only. Learn in 60 seconds— non-educational content is blocked." },
      { property: "og:title", content: "Educational Reels · Samsta" },
      { property: "og:description", content: "moderated learning reels." },
      { property: "og:type", content: "website" },
    ],
  }),
});

function EduReelsPage() {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const queryKey = ["edu-reels", user?.id ?? null];
  const { data: reels = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listApprovedReels(user?.id ?? null),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("edu-reels-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "education_reels" }, () => qc.invalidateQueries({ queryKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "edu_reel_likes" }, () => qc.invalidateQueries({ queryKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "edu_reel_comments" }, () => qc.invalidateQueries({ queryKey }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-dvh grid place-items-center bg-black text-white p-6">
        <div className="text-center">
          <GraduationCap className="mx-auto h-8 w-8 opacity-70" />
          <div className="mt-3 font-display italic text-xl">Sign in to watch educational reels</div>
          <Link to="/auth" className="mt-4 inline-flex rounded-full bg-white text-black px-4 py-2 text-sm">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 pt-4 pb-3 bg-gradient-to-b from-black/70 to-transparent">
        <Link to="/" aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl bg-white/10 text-white ring-1 ring-white/20 active:scale-90 transition">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="text-center">
            <div className="font-display italic text-base leading-tight">Educational Reels</div>
            <div className="text-[10px] text-white/70 leading-tight flex items-center gap-1 justify-center">
              <ShieldCheck className="h-3 w-3" /> moderated· {reels.length} approved
            </div>
          </div>
        </div>
        <Link to="/edu-reels/new" aria-label="Upload"
          className="flex h-10 w-10 items-center justify-center rounded-full backdrop-blur-xl bg-white text-black active:scale-90 transition">
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex h-full items-center justify-center text-white/70">Loading…</div>
      ) : reels.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="h-full snap-y snap-mandatory overflow-y-auto">
          {reels.map((r: EduReel, i: number) => (
            <ReelCard key={r.id} r={r} idx={i} me={user.id} onChange={() => qc.invalidateQueries({ queryKey })} />
          ))}
        </div>
      )}

      <EduBottomNav />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
        <GraduationCap className="h-7 w-7" />
      </div>
      <div className="font-display italic text-2xl">No approved reels yet</div>
      <p className="text-sm text-white/60 max-w-xs">
 Reels are moderated for learning content only. Upload a tutorial, explainer, or lesson to seed the feed.
      </p>
      <Link to="/edu-reels/new" className="mt-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-black inline-flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> Upload educational reel
      </Link>
    </div>
  );
}

function ReelCard({ r, idx, me, onChange }: { r: EduReel; idx: number; me: string; onChange: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const startRef = useRef<number>(0);
  const [liked, setLiked] = useState(!!r.liked_by_me);
  const [saved, setSaved] = useState(!!r.saved_by_me);

  useEffect(() => { setLiked(!!r.liked_by_me); setSaved(!!r.saved_by_me); }, [r.liked_by_me, r.saved_by_me]);

  // watch-time tracking via IntersectionObserver
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.intersectionRatio > 0.6) {
          v.play().catch(() => {});
          startRef.current = Date.now();
        } else {
          v.pause();
          const elapsed = (Date.now() - startRef.current) / 1000;
          if (startRef.current && elapsed > 1) {
            const dur = r.duration_sec || v.duration || 0;
            recordWatch(r.id, me, Math.min(elapsed, dur || elapsed), dur > 0 && elapsed >= dur * 0.9).catch(() => {});
          }
          startRef.current = 0;
        }
      });
    }, { threshold: [0, 0.6, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, [r.id, r.duration_sec, me]);

  async function onLike() {
    setLiked((l) => !l);
    await toggleReelLike(r.id, me, liked);
    onChange();
  }
  async function onSave() {
    setSaved((s) => !s);
    await toggleReelSave(r.id, me, saved);
    onChange();
  }

  const name = r.author?.username ?? "learner";
  const avatar = r.author?.avatar_url ?? "";

  return (
    <section className="snap-start relative h-dvh w-full overflow-hidden">
      {r.video_url ? (
        <video ref={videoRef} src={r.video_url} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline poster={r.thumb_url ?? undefined} />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black" />
      )}
      <div className="absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-black/95 via-black/60 to-transparent" />

      <div className="absolute top-20 left-4 z-10 flex items-center gap-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md px-2.5 py-1 ring-1 ring-emerald-400/40 text-emerald-100 text-[10px] font-medium">
        <ShieldCheck className="h-3 w-3" /> verified educational{r.moderation_score ? ` · ${Math.round(r.moderation_score)}%` : ""}
      </div>

      <div className="absolute right-3 bottom-32 z-10 flex flex-col items-center gap-5 text-white">
        <button onClick={onLike} className="flex flex-col items-center gap-1 active:scale-90 transition">
          <Heart className={cn("h-7 w-7 drop-shadow-md", liked && "fill-rose-500 text-rose-500")} strokeWidth={liked ? 0 : 2} />
          <span className="text-[10px] font-semibold">{r.likes_count || 0}</span>
        </button>
        <button className="flex flex-col items-center gap-1 active:scale-90 transition">
          <MessageCircle className="h-7 w-7 drop-shadow-md" />
          <span className="text-[10px] font-semibold">{r.comments_count || 0}</span>
        </button>
        <button className="flex flex-col items-center gap-1 active:scale-90 transition">
          <Send className="h-7 w-7 drop-shadow-md" />
        </button>
        <button onClick={onSave} className="flex flex-col items-center gap-1 active:scale-90 transition">
          <Bookmark className={cn("h-7 w-7 drop-shadow-md", saved && "fill-white")} />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-24 z-10 px-4 pr-20 text-white">
        <div className="flex items-center gap-2.5">
          {avatar && <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/90" />}
          <span className="font-semibold text-sm drop-shadow">@{name}</span>
          <span className="rounded-full bg-white/15 backdrop-blur px-2 py-0.5 text-[10px]">Reel #{idx + 1}</span>
        </div>
        {r.caption && <p className="mt-1.5 text-[15px] leading-snug line-clamp-3 drop-shadow">{r.caption}</p>}
        {r.moderation_reason && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/80">
            <BookOpen className="h-3.5 w-3.5" /> <span className="truncate">{r.moderation_reason}</span>
          </div>
        )}
        {r.hashtags?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {r.hashtags.slice(0, 4).map((h) => (
              <span key={h} className="text-[10px] rounded-full bg-white/10 backdrop-blur px-2 py-0.5">#{h}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EduBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = [
    { to: "/" as const, icon: Home, label: "Home" },
    { to: "/edu-reels" as const, icon: Film, label: "Reels" },
    { to: "/knowledge-feed" as const, icon: BookOpen, label: "Knowledge" },
    { to: "/profile" as const, icon: User, label: "Profile" },
  ];
  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[min(420px,calc(100%-24px))] -translate-x-1/2">
      <div className="flex items-center justify-around rounded-full px-3 py-2.5 bg-white/10 backdrop-blur-2xl ring-1 ring-white/20 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = pathname === to;
          return (
            <Link key={to} to={to} aria-label={label}
              className={cn("relative flex flex-col items-center gap-0.5 h-12 w-14 justify-center rounded-2xl transition active:scale-90",
                active ? "text-white" : "text-white/60")}
            >
              {active && <span className="absolute inset-1 rounded-2xl bg-white/15" />}
              <Icon className={cn("relative h-5 w-5", active && "scale-110")} strokeWidth={active ? 2.4 : 1.8} />
              <span className="relative text-[9px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
