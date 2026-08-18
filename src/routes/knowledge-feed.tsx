// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, Plus, Heart, MessageCircle, Bookmark, BookOpen, Search,
  Sparkles, Flame, TrendingUp, Brain, Zap, GraduationCap, Rocket, Cpu,
  DollarSign, Palette, Code2, ShieldCheck, Atom, Globe, Beaker,
  Newspaper, Trophy, Crown,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { listKnowledgeFeed, toggleKnowledgeLike, toggleKnowledgeSave, type KnowledgePost } from "@/lib/api/knowledge-feed";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { KnowledgeAISheet } from "@/components/samsta/KnowledgeAISheet";
import { SecondBrainPanel } from "@/components/samsta/SecondBrainPanel";

export const Route = createFileRoute("/knowledge-feed")({
  component: KnowledgeFeed,
  head: () => ({
    meta: [
      { title: "Knowledge Feed · Samsta" },
      { name: "description", content: "Share and discover articles, notes, PDFs, and educational posts from the Samsta community." },
    ],
  }),
});

function KnowledgeFeed() {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [aiPost, setAiPost] = useState<KnowledgePost | null>(null);

  const queryKey = ["knowledge-feed", user?.id ?? null, category];
  const { data: posts = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => listKnowledgeFeed(user?.id ?? null, { category: category ?? undefined }),
    enabled: !!user,
  });

  // realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("knowledge-feed-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "knowledge_posts" }, () => qc.invalidateQueries({ queryKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "knowledge_likes" }, () => qc.invalidateQueries({ queryKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "knowledge_comments" }, () => qc.invalidateQueries({ queryKey }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user, category]);

  const filtered = q.trim()
    ? posts.filter((p: KnowledgePost) =>
        p.title.toLowerCase().includes(q.toLowerCase()) ||
        (p.body || "").toLowerCase().includes(q.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(q.toLowerCase())),
      )
    : posts;

  const cats: Array<{ id: string; label: string; icon: any; tint: string }> = [
    { id: "SecondBrain", label: "Second Brain", icon: Brain, tint: "oklch(0.85 0.12 320)" },
    { id: "Trending", label: "Trending", icon: Flame, tint: "oklch(0.82 0.14 30)" },
    { id: "Picks", label: "Picks", icon: Sparkles, tint: "oklch(0.80 0.11 260)" },
    { id: "Research", label: "Research", icon: Beaker, tint: "oklch(0.78 0.10 200)" },
    { id: "Tech", label: "Technology", icon: Cpu, tint: "oklch(0.80 0.10 240)" },
    { id: "& ML", label: "/ ML", icon: Brain, tint: "oklch(0.80 0.13 300)" },
    { id: "Programming", label: "Programming", icon: Code2, tint: "oklch(0.78 0.12 150)" },
    { id: "Data Science", label: "Data", icon: Zap, tint: "oklch(0.85 0.12 90)" },
    { id: "Cyber", label: "Cyber Security", icon: ShieldCheck, tint: "oklch(0.78 0.10 190)" },
    { id: "Business", label: "Business", icon: TrendingUp, tint: "oklch(0.80 0.11 60)" },
    { id: "Finance", label: "Finance", icon: DollarSign, tint: "oklch(0.82 0.13 100)" },
    { id: "Startups", label: "Startups", icon: Rocket, tint: "oklch(0.82 0.13 20)" },
    { id: "Design", label: "Design", icon: Palette, tint: "oklch(0.85 0.10 340)" },
    { id: "Science", label: "Science", icon: Atom, tint: "oklch(0.80 0.10 220)" },
    { id: "Space", label: "Space", icon: Globe, tint: "oklch(0.72 0.10 270)" },
    { id: "Career", label: "Career", icon: GraduationCap, tint: "oklch(0.82 0.11 40)" },
    { id: "Study", label: "UPSC · Exams", icon: Newspaper, tint: "oklch(0.85 0.09 80)" },
    { id: "Premium", label: "Premium", icon: Crown, tint: "oklch(0.86 0.12 70)" },
    { id: "Community", label: "Community", icon: Trophy, tint: "oklch(0.82 0.10 140)" },
  ];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Late night, scholar";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }, []);
  const firstName = (user?.user_metadata as any)?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "friend";

  // Local, playful metrics — persisted per user in localStorage until backend stats land.
  const stats = useMemo(() => {
    if (typeof window === "undefined" || !user) return { streak: 0, iq: 100, xp: 0, week: [2,3,1,4,2,5,3] };
    const k = `sam.knowledge.stats.${user.id}`;
    try {
      const raw = JSON.parse(localStorage.getItem(k) || "null");
      if (raw) return raw;
    } catch {}
    const seed = {
      streak: 3 + ((user.id.charCodeAt(0) + user.id.charCodeAt(1)) % 12),
      iq: 110 + (user.id.charCodeAt(2) % 40),
      xp: 240 + (user.id.charCodeAt(3) % 500),
      week: Array.from({ length: 7 }, (_, i) => 1 + ((user.id.charCodeAt(i % user.id.length) + i) % 6)),
    };
    try { localStorage.setItem(k, JSON.stringify(seed)); } catch {}
    return seed;
  }, [user?.id]);

  const readingTime = (p: KnowledgePost) => {
    const words = ((p.body || "") + " " + p.title).split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  };
  const difficulty = (p: KnowledgePost): "Beginner" | "Intermediate" | "Expert" => {
    const l = (p.body || "").length;
    if (l < 400) return "Beginner";
    if (l < 1400) return "Intermediate";
    return "Expert";
  };
  const credibility = (p: KnowledgePost) => 60 + ((p.likes_count || 0) * 3) + Math.min(30, (p.comments_count || 0) * 2);

  if (!user) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="rounded-3xl border border-foreground/10 bg-background/40 backdrop-blur-2xl p-6 text-center max-w-sm">
          <BookOpen className="mx-auto h-8 w-8 opacity-70" />
          <div className="mt-3 font-display italic text-xl">Sign in to explore the Knowledge Feed</div>
          <Link to="/auth" className="mt-4 inline-flex rounded-full bg-foreground text-background px-4 py-2 text-sm">Sign in</Link>
        </div>
      </div>
    );
  }

  async function onLike(p: KnowledgePost) {
    await toggleKnowledgeLike(p.id, user.id, !!p.liked_by_me);
    qc.invalidateQueries({ queryKey });
  }
  async function onSave(p: KnowledgePost) {
    await toggleKnowledgeSave(p.id, user.id, !!p.saved_by_me);
    qc.invalidateQueries({ queryKey });
  }

  return (
    <div className="min-h-dvh pb-28">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-background/60 border-b border-foreground/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/" className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="flex-1 min-w-0">
            <div className="font-display italic text-lg leading-tight truncate">Knowledge</div>
            <div className="text-[11px] text-foreground/60 truncate">Sam's premium learning ecosystem</div>
          </div>
          <Link to="/knowledge-feed/new" className="grid place-items-center h-9 w-9 rounded-full bg-foreground text-background"><Plus className="h-4 w-4" /></Link>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/70" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask Sam or search articles, PDFs, papers…"
              className="w-full rounded-full bg-background/50 border border-foreground/10 pl-9 pr-24 py-2.5 text-sm outline-none focus:border-foreground/30" />
            <Link
              to="/sam"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-foreground text-background text-[10px] font-semibold uppercase tracking-wider px-3 py-1.5"
            >Ask Sam</Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="px-4 pt-4">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-4">
          <div aria-hidden className="absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-70 blur-3xl animate-aurora"
            style={{ background: "oklch(0.85 0.12 260)" }} />
          <div aria-hidden className="absolute -left-10 -bottom-16 h-40 w-40 rounded-full opacity-60 blur-3xl animate-aurora"
            style={{ background: "oklch(0.88 0.10 30)" }} />
          <div className="relative">
            <div className="text-[11px] uppercase tracking-widest text-foreground/60">{greeting}</div>
            <div className="font-display italic text-2xl leading-tight">{firstName}, ready to learn?</div>
            <div className="text-[12px] text-foreground/60 mt-1">A quiet, curated place to grow.</div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Streak" value={`${stats.streak}d`} sub="🔥" />
              <Stat label="IQ" value={String(stats.iq)} sub="lvl" />
              <Stat label="XP" value={String(stats.xp)} sub="pts" />
            </div>

            {/* Weekly growth bars */}
            <div className="mt-4">
              <div className="flex items-end justify-between h-16 gap-1">
                {stats.week.map((v, i) => (
                  <div key={i} className="flex-1 flex items-end">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-foreground/70 to-foreground/20 animate-fade-up"
                      style={{ height: `${(v / 6) * 100}%`, animationDelay: `${i * 40}ms` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wider text-foreground/50">
                {["M","T","W","T","F","S","S"].map((d, i) => <span key={i}>{d}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-3 pt-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 px-1">
          <CatChip active={!category} onClick={() => setCategory(null)} label="All" icon={BookOpen} tint="oklch(0.85 0.08 60)" />
          {cats.map((c) => (
            <CatChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)} label={c.label} icon={c.icon} tint={c.tint} />
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {category === "SecondBrain" ? (
          <SecondBrainPanel userId={user.id} />
        ) : isLoading ? (
          <>
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-foreground/15 p-8 text-center">
            <BookOpen className="mx-auto h-8 w-8 opacity-60" />
            <div className="mt-2 font-display italic text-lg">No posts yet</div>
            <div className="text-sm text-foreground/60 mt-1">Be the first to share knowledge.</div>
            <Link to="/knowledge-feed/new" className="mt-4 inline-flex rounded-full bg-foreground text-background px-4 py-2 text-sm"><Plus className="mr-1 h-4 w-4 inline" /> New post</Link>
          </div>
        ) : (
          filtered.map((p: KnowledgePost) => {
            const diff = difficulty(p);
            const rt = readingTime(p);
            const cred = credibility(p);
            const diffTint = diff === "Beginner" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
              : diff === "Intermediate" ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              : "bg-rose-500/15 text-rose-600 dark:text-rose-300";
            return (
            <article key={p.id} className="group relative rounded-3xl border border-foreground/10 bg-background/40 backdrop-blur-2xl overflow-hidden animate-fade-up">
              <Link to="/knowledge-feed/$postId" params={{ postId: p.id }} className="block">
                {p.cover_url && (
                  <img src={p.cover_url} alt="" className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full overflow-hidden bg-foreground/10">
                      {p.author?.avatar_url && <img src={p.author.avatar_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="text-xs">
                      <div className="font-semibold truncate max-w-[160px]">{p.author?.full_name || p.author?.username || "Anonymous"}</div>
                      <div className="text-[10px] text-foreground/50">{new Date(p.created_at).toLocaleDateString()}{p.category ? ` · ${p.category}` : ""}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <span className={cn("rounded-full text-[9px] uppercase tracking-wider px-2 py-0.5", diffTint)}>{diff}</span>
                      <span className="rounded-full text-[9px] uppercase tracking-wider px-2 py-0.5 bg-foreground/5 text-foreground/70">{rt} min</span>
                    </div>
                  </div>
                  <h2 className="font-display italic text-lg leading-tight">{p.title}</h2>
                  {p.body && <p className="text-sm text-foreground/70 mt-1 line-clamp-3">{p.body}</p>}
                  {p.tags.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {p.tags.slice(0, 5).map((t) => <span key={t} className="text-[10px] rounded-full bg-foreground/5 px-2 py-0.5">#{t}</span>)}
                    </div>
                  )}
                  {p.media && p.media.length > 0 && (
                    <div className="mt-2 text-[10px] text-foreground/60">
                      📎 {p.media.length} attachment{p.media.length > 1 ? "s" : ""}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-foreground/50">
                    <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Credibility {Math.min(99, cred)}</span>
                  </div>
                </div>
              </Link>
              <div className="px-4 pb-3 flex items-center gap-4 text-sm">
                <button onClick={() => onLike(p)} className="flex items-center gap-1 active:scale-95">
                  <Heart className={cn("h-4 w-4", p.liked_by_me && "fill-rose-500 text-rose-500")} />
                  <span className="text-xs">{p.likes_count || 0}</span>
                </button>
                <Link to="/knowledge-feed/$postId" params={{ postId: p.id }} className="flex items-center gap-1">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-xs">{p.comments_count || 0}</span>
                </Link>
                <button
                  onClick={() => setAiPost(p)}
                  className="ml-auto flex items-center gap-1 rounded-full bg-foreground text-background px-3 py-1.5 text-[11px] active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Ask Sam
                </button>
                <button onClick={() => onSave(p)} className="active:scale-95">
                  <Bookmark className={cn("h-4 w-4", p.saved_by_me && "fill-foreground")} />
                </button>
              </div>
            </article>
            );
          })
        )}
      </div>

      <KnowledgeAISheet
        open={!!aiPost}
        onClose={() => setAiPost(null)}
        title={aiPost?.title || ""}
        content={aiPost?.body || ""}
      />
    </div>
  );
}

function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border transition active:scale-95",
      active ? "bg-foreground text-background border-foreground" : "bg-background/50 border-foreground/10 text-foreground/70",
    )}>{children}</button>
  );
}

function CatChip({ active, label, icon: Icon, tint, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 relative flex items-center gap-1.5 rounded-2xl border pl-2 pr-3 py-1.5 text-[11px] whitespace-nowrap transition active:scale-95 overflow-hidden",
        active ? "bg-foreground text-background border-foreground" : "bg-background/50 border-foreground/10 text-foreground/80",
      )}
    >
      {!active && (
        <span aria-hidden className="absolute -left-4 -top-4 h-10 w-10 rounded-full opacity-60 blur-xl" style={{ background: tint }} />
      )}
      <span className="relative flex h-5 w-5 items-center justify-center">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="relative">{label}</span>
    </button>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/40 backdrop-blur-xl p-3 text-center">
      <div className="text-[9px] uppercase tracking-widest text-foreground/60">{label}</div>
      <div className="font-display italic text-xl leading-none mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-foreground/60 mt-0.5">{sub}</div>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-foreground/10 bg-background/30 backdrop-blur-2xl overflow-hidden animate-pulse">
      <div className="h-40 w-full bg-foreground/5" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-3/4 bg-foreground/10 rounded" />
        <div className="h-3 w-1/2 bg-foreground/10 rounded" />
        <div className="h-3 w-full bg-foreground/5 rounded" />
      </div>
    </div>
  );
}
