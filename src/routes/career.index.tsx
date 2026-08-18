import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AIResumeMatchSheet, type ResumeMatchResult } from "@/components/samsta/AIResumeMatchSheet";
import { useAuthUser } from "@/hooks/use-auth";
import {
  ArrowLeft, Search, Bell, Home, Users, Film, User, Briefcase, GraduationCap,
  FolderKanban, Building2, CalendarDays, Sparkles, Brain, Rocket, MessageSquare,
  BadgeCheck, ChevronRight, MapPin, Star, Zap, ThumbsUp, MessageCircle, Repeat2,
  Share2, Camera, Video, FileText, Plus, X, Upload, Image as ImageIcon, Pencil,
  Trash2, Check, ShieldCheck, IdCard, ScanFace, Phone, Award, Landmark, Fingerprint,
  Copy, Send, Heart, Play, Volume2, Bookmark, TrendingUp, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PageThemeToggle, usePageTheme } from "@/components/samsta/PageThemeToggle";
import { VerifyResultOverlay } from "@/components/samsta/VerifyResultOverlay";
import { usePublishAccess, PUBLISH_FEE_INR } from "@/components/samsta/PublishUnlockGate";


export const Route = createFileRoute("/career/")({
  component: CareerPage,
  head: () => ({
    meta: [
      { title: "Career & Business · Samsta" },
      { name: "description", content: "A premium professional network— jobs, portfolio, learning and career coaching, powered by Sam." },
    ],
  }),
});

/* ========================= THEME ========================= */

const PINK = {
  bg: "linear-gradient(180deg, oklch(0.985 0.002 90) 0%, oklch(0.975 0.003 90) 50%, oklch(0.965 0.004 85) 100%)",
  primary: "linear-gradient(135deg, oklch(0.78 0.13 15), oklch(0.72 0.15 355))",
  rose: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.75 0.15 10))",
  peach: "linear-gradient(135deg, oklch(0.88 0.09 55), oklch(0.82 0.12 30))",
  gold: "linear-gradient(135deg, oklch(0.88 0.11 85), oklch(0.8 0.14 60))",
  mint: "linear-gradient(135deg, oklch(0.86 0.09 175), oklch(0.8 0.12 190))",
  violet: "linear-gradient(135deg, oklch(0.82 0.1 320), oklch(0.75 0.13 340))",
  ice: "linear-gradient(135deg, oklch(0.94 0.03 20), oklch(0.9 0.05 350))",
  ink: "oklch(0.4 0.05 15)",
};

/* ========================= PRIMITIVES ========================= */

function Glass({ className, style, children, onClick }: {
  className?: string; style?: React.CSSProperties; children: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div onClick={onClick}
      className={cn("rounded-3xl border border-white/70 shadow-[0_12px_40px_-18px_oklch(0.6_0.15_15/0.35)]",
        onClick && "cursor-pointer active:scale-[0.99] transition-transform", className)}
      style={{
        background: "linear-gradient(135deg, oklch(1 0 0 / 0.82), oklch(1 0.005 20 / 0.5))",
        backdropFilter: "blur(24px) saturate(180%)",
        ...style,
      }}
    >{children}</div>
  );
}

function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between px-1">
      <h2 className="font-display text-xl italic tracking-tight" style={{ color: PINK.ink }}>{title}</h2>
      {action}
    </div>
  );
}

function Pill({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95",
        active ? "text-white shadow-md" : "border border-white/70 bg-white/70 text-foreground/75 backdrop-blur")}
      style={active ? { background: PINK.primary } : undefined}
    >{children}</button>
  );
}

/* ========================= ROOT ========================= */

type Tab = "home" | "network" | "reels" | "profile";
type View =
  | { t: Tab }
  | { t: "jobs" } | { t: "hire" } | { t: "learning" } | { t: "portfolio" }
  | { t: "companies" } | { t: "events" } | { t: "ai-career" } | { t: "ai-business" }
  | { t: "messages" } | { t: "media" } | { t: "experience" } | { t: "skills" };

function CareerPage() {
  const [view, setView] = useState<View>({ t: "home" });
  const [share, setShare] = useState(false);
  const { theme, setTheme, tokens: pt } = usePageTheme("rose");
  const tab: Tab = (["home","network","reels","profile"] as const).includes(view.t as Tab) ? (view.t as Tab) : "home";
  const navigate = useNavigate();

  const pageBg = theme === "rose" ? PINK.bg : pt.bg;
  const auroraA = theme === "dark" ? "oklch(0.45 0.14 15)" : theme === "white" ? "oklch(0.94 0.02 15)" : "oklch(0.96 0.006 90)";
  const auroraB = theme === "dark" ? "oklch(0.4 0.14 340)" : theme === "white" ? "oklch(0.94 0.02 340)" : "oklch(0.955 0.006 85)";
  const auroraC = theme === "dark" ? "oklch(0.42 0.12 55)" : theme === "white" ? "oklch(0.95 0.02 55)" : "oklch(0.96 0.008 80)";

  return (
    <div className="relative min-h-screen overflow-hidden pb-28 transition-colors duration-500" style={{ background: pageBg, color: theme === "rose" ? undefined : pt.ink }}>
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full opacity-60 blur-3xl animate-aurora" style={{ background: auroraA }} />
        <div className="absolute -right-20 top-40 h-80 w-80 rounded-full opacity-50 blur-3xl animate-drift" style={{ background: auroraB }} />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full opacity-45 blur-3xl animate-aurora" style={{ background: auroraC }} />
      </div>

      <div className="fixed right-4 top-3 z-40">
        <PageThemeToggle value={theme} onChange={setTheme} />
      </div>


      <TopBar view={view} setView={setView} />

      <main className="animate-fade-up">
        {view.t === "home" && <HomeView setView={setView} />}
        {view.t === "network" && <NetworkView />}
        {view.t === "reels" && <ReelsView />}
        {view.t === "profile" && <ProfileView setView={setView} openShare={() => setShare(true)} />}

        {view.t === "jobs" && <JobsView setView={setView} />}
        {view.t === "hire" && <HireView back={() => setView({ t: "jobs" })} />}
        {view.t === "learning" && <SimpleCards title="Learning" items={LEARN} />}
        {view.t === "portfolio" && <PortfolioRedirect onGo={() => navigate({ to: "/career/portfolio" })} />}
        {view.t === "companies" && <PortfolioRedirect onGo={() => navigate({ to: "/career/companies" })} />}
        {view.t === "events" && <PortfolioRedirect onGo={() => navigate({ to: "/career/events" })} />}
        {view.t === "ai-career" && <PortfolioRedirect onGo={() => navigate({ to: "/career/ai-career" })} />}
        {view.t === "ai-business" && <AICard title="Business Studio" icon={Rocket} lines={AI_BIZ} />}
        {view.t === "messages" && <SimpleCards title="Messages" items={MSGS} />}
        {view.t === "media" && <MediaView back={() => setView({ t: "profile" })} />}
        {view.t === "experience" && <ExperienceView back={() => setView({ t: "profile" })} />}
        {view.t === "skills" && <SkillsView back={() => setView({ t: "profile" })} />}
      </main>

      <BottomNav tab={tab} onChange={(t) => setView({ t })} />
      {share && <ShareSheet onClose={() => setShare(false)} />}
    </div>
  );
}

/* ========================= TOPBAR + BOTTOM NAV ========================= */

function TopBar({ view, setView }: { view: View; setView: (v: View) => void }) {
  const isSub = !(["home","network","reels","profile"] as const).includes(view.t as Tab);
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 px-4 pb-2 pt-3 backdrop-blur-xl"
      style={{ background: "linear-gradient(180deg, oklch(0.985 0.003 90 / 0.92), oklch(0.985 0.003 90 / 0.4))" }}
    >
      {isSub ? (
        <button onClick={() => setView({ t: "home" })} aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <Link to="/" aria-label="Back to Samsta"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <div className="flex flex-1 items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input placeholder="Search people, jobs, companies…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
      </div>
      <button aria-label="Alerts"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg active:scale-95"
        style={{ background: PINK.primary }}>
        <Bell className="h-4 w-4" />
        
      </button>
    </header>
  );
}

function BottomNav({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: { k: Tab; l: string; I: typeof Home }[] = [
    { k: "home", l: "Home", I: Home },
    { k: "network", l: "Network", I: Users },
    { k: "reels", l: "Reels", I: Film },
    { k: "profile", l: "Profile", I: User },
  ];
  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[min(440px,calc(100%-24px))] -translate-x-1/2">
      <div className="flex items-center justify-around rounded-full border border-white/70 px-3 py-2.5 shadow-[0_20px_60px_-20px_oklch(0.6_0.18_15/0.35)]"
        style={{ background: "oklch(1 0 0 / 0.85)", backdropFilter: "blur(30px) saturate(200%)" }}>
        {items.map(({ k, l, I }) => {
          const on = tab === k;
          return (
            <button key={k} onClick={() => onChange(k)} aria-label={l}
              className={cn("relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                on ? "text-white shadow-md" : "text-foreground/70")}
              style={on ? { background: PINK.primary } : undefined}>
              <I className={cn("h-5 w-5", on && "scale-110")} strokeWidth={on ? 2.4 : 1.8} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/* ========================= HOME ========================= */

function PortfolioRedirect({ onGo }: { onGo: () => void }) {
  useEffect(() => { onGo(); }, [onGo]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 text-center">
      <div>
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-[#e8c874]" />
        <div className="text-sm text-foreground/70">Opening your Portfolio…</div>
      </div>
    </div>
  );
}

const HOME_CATS: { k: View["t"]; l: string; sub: string; I: typeof Briefcase; g: string }[] = [
  { k: "jobs", l: "Jobs", sub: "Explore & apply", I: Briefcase, g: PINK.primary },
  { k: "hire", l: "Hire", sub: "Verified hiring", I: ShieldCheck, g: PINK.violet },
  { k: "learning", l: "Learning", sub: "Courses & tests", I: GraduationCap, g: PINK.mint },
  { k: "portfolio", l: "Portfolio", sub: "Showcase work", I: FolderKanban, g: PINK.peach },
  { k: "companies", l: "Companies", sub: "Follow & scout", I: Building2, g: PINK.gold },
  { k: "events", l: "Events", sub: "Meetups & talks", I: CalendarDays, g: PINK.rose },
  { k: "ai-career", l: "Career", sub: "Coach & match", I: Brain, g: PINK.violet },
  { k: "ai-business", l: "Business", sub: "Studio & ideas", I: Rocket, g: PINK.primary },
  { k: "messages", l: "Messages", sub: "Chat & DMs", I: MessageSquare, g: PINK.mint },
];

/* Grouped premium suite — fewer things visible at once, calmer scanning */
const SUITE_GROUPS: { group: string; note: string; keys: View["t"][] }[] = [
  { group: "Work", note: "Find & be found", keys: ["jobs", "hire", "companies"] },
  { group: "Grow", note: "Skill & showcase", keys: ["learning", "portfolio", "ai-career"] },
  { group: "Connect", note: "People & ventures", keys: ["events", "messages", "ai-business"] },
];

const FEED: { name: string; role: string; when: string; verified?: boolean; kind?: string; text: string; tags: string[]; likes: number; comments: number; thumb: string }[] = [];

function SuiteIndex({ setView }: { setView: (v: View) => void }) {
  const byKey = (k: View["t"]) => HOME_CATS.find((c) => c.k === k)!;
  let n = 0;
  return (
    <div>
      <SectionTitle
        title="The Suite"
        action={<span className="text-[9.5px] uppercase tracking-[0.28em] text-muted-foreground">members only</span>}
      />
      <div
        className="relative overflow-hidden rounded-[26px] border animate-fade-up"
        style={{
          borderColor: "rgba(201,163,74,0.35)",
          background:
            "linear-gradient(165deg, rgba(252,251,248,0.92) 0%, rgba(249,248,244,0.88) 45%, rgba(247,246,241,0.92) 100%)",
          backdropFilter: "blur(28px) saturate(180%)",
          boxShadow:
            "0 30px 70px -34px rgba(201,163,74,0.45), inset 0 1px 0 rgba(255,255,255,0.85)",
        }}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, rgba(201,163,74,0.7), transparent)" }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,199,214,0.55), transparent 70%)" }}
        />

        {SUITE_GROUPS.map(({ group, note, keys }, gi) => (
          <div key={group} className="px-4 py-3">
            <div
              className="mb-1 flex items-baseline gap-2 animate-fade-up"
              style={{ animationDelay: `${gi * 90}ms` }}
            >
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.32em]" style={{ color: "#a8822c" }}>
                {group}
              </span>
              <span className="h-px flex-1" style={{ background: "rgba(168,130,44,0.18)" }} />
              <span className="text-[9.5px] tracking-wide" style={{ color: "rgba(90,60,70,0.45)" }}>{note}</span>

            </div>

            {keys.map((k) => {
              const { l, sub, I } = byKey(k);
              n += 1;
              const idx = String(n).padStart(2, "0");
              return (
                <button
                  key={k}
                  onClick={() => setView({ t: k } as View)}
                  className="group relative flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-all duration-500 animate-fade-up active:scale-[0.99]"
                  style={{ animationDelay: `${gi * 90 + n * 40}ms` }}
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ background: "linear-gradient(90deg, rgba(255,205,220,0.45), rgba(232,200,116,0.18) 60%, transparent 90%)" }}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-1/2 h-0 w-[2px] -translate-y-1/2 rounded-full transition-all duration-500 group-hover:h-7"
                    style={{ background: "linear-gradient(180deg, #c9a34a, rgba(255,182,201,0.6))" }}
                  />
                  <span
                    className="relative w-6 shrink-0 text-[10px] font-medium tabular-nums tracking-widest transition-colors duration-500 group-hover:text-[#a8822c]"
                    style={{ color: "rgba(90,60,70,0.35)" }}
                  >
                    {idx}
                  </span>
                  <span
                    className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all duration-500 group-hover:-translate-y-0.5"
                    style={{
                      background: "linear-gradient(140deg, rgba(255,255,255,0.9), rgba(255,236,242,0.75))",
                      border: "1px solid rgba(201,163,74,0.4)",
                      color: "#b08828",
                      boxShadow: "0 6px 16px -8px rgba(201,163,74,0.6)",
                    }}
                  >
                    <I className="h-[15px] w-[15px]" strokeWidth={1.5} />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate font-display text-[15.5px] italic leading-tight" style={{ color: "#2b1d24" }}>{l}</span>
                    <span className="block truncate text-[10px] tracking-wide" style={{ color: "rgba(90,60,70,0.55)" }}>{sub}</span>
                  </span>
                  <ChevronRight
                    className="relative h-4 w-4 shrink-0 opacity-50 transition-all duration-500 group-hover:translate-x-1 group-hover:opacity-100"
                    style={{ color: "#c9a34a" }}
                    strokeWidth={1.6}
                  />

                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeView({ setView }: { setView: (v: View) => void }) {
  return (
    <div className="space-y-5 px-4">
      {/* Hero */}
      <Glass className="overflow-hidden p-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: PINK.primary }}>
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg italic" style={{ color: PINK.ink }}>Career & Business</div>
            <div className="text-[11px] text-muted-foreground">Premium professional network · powered by Sam</div>
          </div>
          <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow" style={{ background: PINK.gold }}>Elite</span>
        </div>
        <Link to="/career/feed" className="mt-3 flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur transition active:scale-[0.98]">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow" style={{ background: PINK.rose }}>
              <MessageCircle className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-display text-sm italic leading-tight" style={{ color: PINK.ink }}>Professional Feed</span>
              <span className="block text-[10px] text-muted-foreground">Real-time posts · live like & comment</span>
            </span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/60">Open →</span>
        </Link>
        <a href="/premium/career" className="group relative mt-4 flex items-center justify-between overflow-hidden rounded-2xl px-4 py-3 text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: "linear-gradient(120deg, #0b1230 0%, #1e3a8a 45%, #c9a34a 100%)" }}>
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <span className="relative flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur"><Sparkles className="h-4 w-4" /></span>
            <span>
              <span className="block font-display text-sm italic leading-tight">Unlock Premium</span>
              <span className="block text-[10px] opacity-80">14 features· India & International plans</span>
            </span>
          </span>
          <span className="relative rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold backdrop-blur">Upgrade →</span>
        </a>
      </Glass>

      {/* Premium suite — grouped index, minimal ink, calm scanning */}
      <SuiteIndex setView={setView} />

      {/* Feed */}
      <div className="space-y-4">
        <SectionTitle title="Professional feed" />
        {FEED.length === 0 ? (
          <Glass className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.violet }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="font-display text-base italic" style={{ color: PINK.ink }}>Your feed is empty</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Follow companies and people to see updates here.</div>
          </Glass>
        ) : FEED.map((p, i) => (
          <Glass key={i} className="overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start gap-3 p-4">
              <div className="h-11 w-11 rounded-2xl shadow" style={{ background: p.thumb }} />
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold">
                  {p.name}
                  {p.verified && <BadgeCheck className="h-4 w-4" style={{ color: "oklch(0.6 0.18 15)" }} />}
                </div>
                <div className="text-[11px] text-muted-foreground">{p.role} · {p.when}</div>
              </div>
              {p.kind === "hiring" && (
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow" style={{ background: PINK.gold }}>hiring</span>
              )}
            </div>
            <p className="px-4 pb-2 text-sm leading-relaxed">{p.text}</p>
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {p.tags.map((t) => (
                <span key={t} className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium" style={{ color: "oklch(0.5 0.18 15)" }}>{t}</span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-1 border-t border-white/60 p-1.5 text-[11px]">
              {[{ I: ThumbsUp, l: "Like" }, { I: MessageCircle, l: "Comment" }, { I: Repeat2, l: "Repost" }, { I: Share2, l: "Send" }].map(({ I, l }) => (
                <button key={l} className="flex items-center justify-center gap-1 rounded-2xl py-2 font-medium hover:bg-white/60 active:scale-95">
                  <I className="h-4 w-4" /> {l}
                </button>
              ))}
            </div>
          </Glass>
        ))}
      </div>

    </div>
  );
}

/* ========================= NETWORK ========================= */

function NetworkView() {
  const people: { n: string; r: string; mutual: number; g: string }[] = [];
  return (
    <div className="space-y-5 px-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { l: "Connections", v: "0", g: PINK.primary },
          { l: "Followers", v: "0", g: PINK.violet },
          { l: "Requests", v: "0", g: PINK.gold },
        ].map((s, i) => (
          <Glass key={s.l} className="overflow-hidden p-3 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="mb-1 h-1.5 w-8 rounded-full" style={{ background: s.g }} />
            <div className="font-display text-xl italic leading-none" style={{ color: PINK.ink }}>{s.v}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
          </Glass>
        ))}
      </div>
      <div>
        <SectionTitle title="People you may know" />
        {people.length === 0 ? (
          <Glass className="p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.rose }}>
              <Users className="h-5 w-5" />
            </div>
            <div className="font-display text-base italic" style={{ color: PINK.ink }}>No suggestions yet</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Complete your profile to get matched with people.</div>
          </Glass>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {people.map((p, i) => (
              <Glass key={p.n} className="overflow-hidden p-3 text-center animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mx-auto h-16 w-16 rounded-2xl shadow-md" style={{ background: p.g }} />
                <div className="mt-2 text-sm font-semibold leading-tight">{p.n}</div>
                <div className="text-[10px] text-muted-foreground">{p.r}</div>
                <div className="mt-1 text-[10px] text-muted-foreground">{p.mutual} mutual</div>
                <button className="mt-2 w-full rounded-full py-1.5 text-[11px] font-semibold text-white shadow" style={{ background: PINK.primary }}>Connect</button>
              </Glass>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================= REELS (career & business, AI-moderated) ========================= */

function ReelsView() {
  const navigate = useNavigate();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const mod = await import("@/lib/api/career-reels");
        const rows = await mod.listApprovedCareerReels();
        if (!cancel) setReels(rows);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <div className="space-y-4 px-4">
      <SectionTitle
        title="Career & Business Reels"
        action={
          <button
            onClick={() => navigate({ to: "/career/reels/new" })}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow active:scale-95"
            style={{ background: PINK.primary }}
          >
            <Plus className="h-3.5 w-3.5" /> Create
          </button>
        }
      />
      <div className="flex items-start gap-2 rounded-2xl border border-white/70 bg-white/60 p-3 text-[11px] text-foreground/75">
        <Sparkles className="mt-0.5 h-3.5 w-3.5" style={{ color: "oklch(0.6 0.18 15)" }} />
        <div>Only <b>career &amp; business</b> reels are allowed. Sam reviews every upload— entertainment reels are removed automatically.</div>
      </div>

      {loading ? (
        <Glass className="p-8 text-center text-sm text-muted-foreground">Loading reels…</Glass>
      ) : reels.length === 0 ? (
        <Glass className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.violet }}>
            <Film className="h-5 w-5" />
          </div>
          <div className="font-display text-base italic" style={{ color: PINK.ink }}>No reels yet</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Be the first — share a career tip, hiring insight, or business story.</div>
          <button
            onClick={() => navigate({ to: "/career/reels/new" })}
            className="mt-4 rounded-full px-4 py-2 text-[12px] font-semibold text-white shadow active:scale-95"
            style={{ background: PINK.primary }}
          >
            Create a reel
          </button>
        </Glass>
      ) : (
        reels.map((r, i) => (
          <Glass key={r.id} className="overflow-hidden animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="relative h-80 w-full bg-black">
              {r.video_url ? (
                <video src={r.video_url} className="absolute inset-0 h-full w-full object-cover" playsInline muted loop controls preload="metadata" poster={r.thumb_url ?? undefined} />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
              <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-white">
                <div className="flex items-center gap-2">
                  {r.author?.avatar_url && <img src={r.author.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/60" />}
                  <div className="font-semibold text-sm">{r.author?.username || r.author?.full_name || "user"}</div>
                  <span className="ml-auto rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wider backdrop-blur">{r.category}</span>
                </div>
                {r.caption && <p className="mt-1.5 text-[13px] leading-snug line-clamp-2">{r.caption}</p>}
              </div>
            </div>
          </Glass>
        ))
      )}
    </div>
  );
}


/* ========================= PROFILE ========================= */

function ProfileView({ setView, openShare }: { setView: (v: View) => void; openShare: () => void }) {
  const { user } = useAuthUser();
  const displayName = (user?.user_metadata?.full_name as string | undefined)
    || (user?.user_metadata?.username as string | undefined)
    || user?.email?.split("@")[0]
    || "Your profile";
  return (
    <div className="space-y-4 px-4">
      <Glass className="overflow-hidden p-5 animate-fade-up">
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 rounded-3xl shadow-md" style={{ background: PINK.primary }} />
          <div className="flex-1">
            <div className="font-display text-xl italic" style={{ color: PINK.ink }}>{displayName}</div>
            <div className="text-[11px] text-muted-foreground">Complete your profile to appear to recruiters</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button className="rounded-full py-2 text-[12px] font-semibold text-white shadow active:scale-95" style={{ background: PINK.primary }}>
            <Pencil className="mr-1 inline h-3.5 w-3.5" /> Edit profile
          </button>
          <button onClick={openShare} className="rounded-full border border-white/70 bg-white/70 py-2 text-[12px] font-semibold active:scale-95">
            <Share2 className="mr-1 inline h-3.5 w-3.5" /> Share
          </button>
        </div>
      </Glass>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { l: "Photos & Videos", I: ImageIcon, g: PINK.rose, on: () => setView({ t: "media" }) },
          { l: "Experience", I: Briefcase, g: PINK.violet, on: () => setView({ t: "experience" }) },
          { l: "Skills", I: Star, g: PINK.gold, on: () => setView({ t: "skills" }) },
        ].map((x, i) => (
          <button key={x.l} onClick={x.on} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <Glass className="p-3 text-left transition-transform active:scale-[0.97]">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow" style={{ background: x.g }}>
                <x.I className="h-5 w-5" />
              </div>
              <div className="font-display text-sm italic" style={{ color: PINK.ink }}>{x.l}</div>
              <div className="text-[10px] text-muted-foreground">Tap to open</div>
            </Glass>
          </button>
        ))}
      </div>

      {/* Verification snapshot */}
      <Glass className="p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" style={{ color: "oklch(0.55 0.18 15)" }} />
          <div className="font-display text-base italic" style={{ color: PINK.ink }}>Verification</div>
          <span className="ml-auto text-[11px] font-semibold" style={{ color: "oklch(0.55 0.18 15)" }}>72%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
          <div className="h-full rounded-full" style={{ width: "72%", background: PINK.primary }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["🟢 Basic", "🔵 Identity", "🟣 Skill", "🟡 Professional"].map((b) => (
            <span key={b} className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-medium">{b}</span>
          ))}
        </div>
      </Glass>
    </div>
  );
}

/* ========================= MEDIA (photos & videos) ========================= */

function MediaView({ back }: { back: () => void }) {
  const [tab, setTab] = useState<"photos" | "videos">("photos");
  const [items, setItems] = useState<{ url: string; kind: "photo" | "video" }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const added = files.map((f) => ({
      url: URL.createObjectURL(f),
      kind: f.type.startsWith("video") ? "video" as const : "photo" as const,
    }));
    setItems((p) => [...added, ...p]);
    e.target.value = "";
  }

  const filtered = items.filter((i) => (tab === "photos" ? i.kind === "photo" : i.kind === "video"));

  return (
    <div className="space-y-4 px-4">
      <div className="flex items-center gap-2">
        <Pill active={tab === "photos"} onClick={() => setTab("photos")}>Photos</Pill>
        <Pill active={tab === "videos"} onClick={() => setTab("videos")}>Videos</Pill>
        <button onClick={() => inputRef.current?.click()}
          className="ml-auto flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-white shadow active:scale-95"
          style={{ background: PINK.primary }}>
          <Upload className="h-3.5 w-3.5" /> Upload
        </button>
        <input ref={inputRef} type="file" accept={tab === "photos" ? "image/*" : "video/*"} multiple hidden onChange={onPick} />
      </div>

      {filtered.length === 0 ? (
        <Glass className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.rose }}>
            {tab === "photos" ? <Camera className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </div>
          <div className="font-display text-lg italic" style={{ color: PINK.ink }}>No {tab} yet</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Upload your first {tab === "photos" ? "photo" : "video"} to showcase.</div>
        </Glass>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((it, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-2xl shadow animate-fade-up">
              {it.kind === "photo" ? (
                <img src={it.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <video src={it.url} className="h-full w-full object-cover" muted />
              )}
              {it.kind === "video" && (
                <span className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white"><Play className="h-3 w-3" /></span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ========================= EXPERIENCE ========================= */

type Exp = { id: string; role: string; org: string; period: string };
const EXP_SEED: Exp[] = [];

function ExperienceView({ back }: { back: () => void }) {
  const [items, setItems] = useState<Exp[]>(EXP_SEED);
  const [editing, setEditing] = useState<Exp | null>(null);
  const [form, setForm] = useState<Exp>({ id: "", role: "", org: "", period: "" });

  function open(e?: Exp) {
    const base = e ?? { id: crypto.randomUUID(), role: "", org: "", period: "" };
    setForm(base); setEditing(base);
  }
  function save() {
    if (!form.role.trim()) return;
    setItems((p) => (p.some((x) => x.id === form.id) ? p.map((x) => (x.id === form.id ? form : x)) : [form, ...p]));
    setEditing(null);
  }
  function del(id: string) { setItems((p) => p.filter((x) => x.id !== id)); }

  return (
    <div className="space-y-3 px-4">
      <div className="flex items-center justify-between">
        <SectionTitle title="Experience" />
        <button onClick={() => open()} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow" style={{ background: PINK.primary }}>
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>
      {items.map((e, i) => (
        <Glass key={e.id} className="flex items-center gap-3 p-3 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.violet }}>
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-display text-base italic leading-tight" style={{ color: PINK.ink }}>{e.role}</div>
            <div className="text-[11px] text-muted-foreground">{e.org} · {e.period}</div>
          </div>
          <button onClick={() => open(e)} className="rounded-full bg-white/70 p-2"><Pencil className="h-3.5 w-3.5" /></button>
          <button onClick={() => del(e.id)} className="rounded-full bg-white/70 p-2"><Trash2 className="h-3.5 w-3.5" /></button>
        </Glass>
      ))}

      {editing && (
        <Sheet onClose={() => setEditing(null)} title={items.some((x) => x.id === editing.id) ? "Edit experience" : "Add experience"}>
          <Field label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} placeholder="Design Lead" />
          <Field label="Organization" value={form.org} onChange={(v) => setForm({ ...form, org: v })} placeholder="Company" />
          <Field label="Period" value={form.period} onChange={(v) => setForm({ ...form, period: v })} placeholder="2023 — Present" />
          <button onClick={save} className="mt-2 w-full rounded-full py-3 text-sm font-semibold text-white shadow" style={{ background: PINK.primary }}>Save</button>
        </Sheet>
      )}
    </div>
  );
}

/* ========================= SKILLS ========================= */

const SKILL_SUGGEST: string[] = [];

function SkillsView({ back }: { back: () => void }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const filtered = useMemo(() => SKILL_SUGGEST.filter((s) => !skills.includes(s) && s.toLowerCase().includes(q.toLowerCase())), [q, skills]);

  return (
    <div className="space-y-4 px-4">
      <SectionTitle title="Skills" />
      <Glass className="p-3">
        <div className="flex flex-wrap gap-1.5">
          {skills.length === 0 && <div className="text-[11px] text-muted-foreground">No skills yet — tap suggestions below or type your own.</div>}
          {skills.map((s) => (
            <span key={s} className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow" style={{ background: PINK.primary }}>
              {s}
              <button onClick={() => setSkills((p) => p.filter((x) => x !== s))}><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      </Glass>

      <Glass className="p-3">
        <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or add a skill…" className="flex-1 bg-transparent text-sm outline-none" />
          {q.trim() && (
            <button onClick={() => { setSkills((p) => [q.trim(), ...p]); setQ(""); }}
              className="rounded-full px-2 py-1 text-[10px] font-semibold text-white" style={{ background: PINK.primary }}>Add</button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {filtered.map((s) => (
            <button key={s} onClick={() => setSkills((p) => [s, ...p])}
              className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-medium active:scale-95">
              + {s}
            </button>
          ))}
        </div>
      </Glass>
    </div>
  );
}

/* ========================= JOBS ========================= */

const JOB_TYPES = ["All", "Remote", "Hybrid", "On-site", "Internship", "Contract", "Freelance", "Executive"];

type AIJob = {
  title: string; company: string; location: string; work_type: string;
  place_of_work_required: string; joining_time: string; salary: string;
  match_score: number; apply_url: string; summary: string;
};

function tierFor(score: number): { label: string; bg: string; sub: string } {
  if (score >= 90) return { label: "Very Strong", bg: "oklch(0.72 0.18 155)", sub: "Top-tier fit" };
  if (score >= 75) return { label: "Strong", bg: "oklch(0.65 0.19 265)", sub: "High fit" };
  if (score >= 60) return { label: "Moderate", bg: "oklch(0.75 0.15 75)", sub: "Worth applying" };
  if (score >= 45) return { label: "Low", bg: "oklch(0.7 0.14 40)", sub: "Stretch role" };
  return { label: "Very Low", bg: "oklch(0.62 0.2 20)", sub: "Long shot" };
}

function MatchTier({ score }: { score: number }) {
  const t = tierFor(score);
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white shadow" style={{ background: t.bg }}>
        {t.label} · {score}%
      </div>
      <div className="text-[9px] text-muted-foreground">{t.sub}</div>
    </div>
  );
}

function JobsView({ setView }: { setView: (v: View) => void }) {
  const [filter, setFilter] = useState("All");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiJobs, setAiJobs] = useState<AIJob[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [candidate, setCandidate] = useState<{ name: string; skills: string[]; location: string } | null>(null);

  const norm = (w: string) => w.toLowerCase();
  const list = useMemo(() => {
    if (filter === "All") return aiJobs;
    const f = norm(filter);
    return aiJobs.filter((j) => norm(j.work_type) === f || (f === "on-site" && norm(j.work_type) === "onsite"));
  }, [filter, aiJobs]);

  async function loadJobs(r: ResumeMatchResult, prefs: { role: string; location: string }) {
    setAiLoading(true); setAiError(""); setAiJobs([]);
    setCandidate({ name: r.candidate_name, skills: r.extracted_skills, location: prefs.location });
    try {
      const res = await fetch("/api/career/job-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: r.extracted_skills,
          suggested_roles: r.suggested_roles,
          target_role: prefs.role,
          target_location: prefs.location,
          years_experience: r.years_experience,
        }),
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Job suggest failed");
      const data = await res.json() as { jobs: AIJob[] };
      setAiJobs(data.jobs ?? []);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setAiLoading(false);
    }
  }

  const gradFor = (i: number) => [PINK.primary, PINK.violet, PINK.mint, PINK.peach, PINK.gold, PINK.rose][i % 6];

  return (
    <div className="space-y-4 px-4">
      <Glass className="flex items-center gap-3 p-4 animate-fade-up">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.primary }}>
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-display text-base italic" style={{ color: PINK.ink }}> Resume match</div>
          <div className="text-[11px] text-muted-foreground">Scan or upload — camera, photo or PDF.</div>
        </div>
        <button
          onClick={() => setAiOpen(true)}
          className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white shadow active:scale-95"
          style={{ background: PINK.violet }}
        >Run</button>
      </Glass>

      <button onClick={() => setView({ t: "hire" })} className="w-full">
        <Glass className="flex items-center gap-3 p-4 transition-transform active:scale-[0.99]">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.gold }}>
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-display text-base italic" style={{ color: PINK.ink }}>Hire someone</div>
            <div className="text-[11px] text-muted-foreground">Post a role with verified trust — 8-step verification</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Glass>
      </button>

      {candidate && (
        <Glass className="p-3 animate-fade-up">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" style={{ color: "oklch(0.6 0.18 15)" }} />
            <div className="text-[12px]" style={{ color: PINK.ink }}>
              <span className="font-semibold">Accepted</span>
              {candidate.name ? ` · ${candidate.name}` : ""} · matching {candidate.skills.slice(0, 4).join(" · ") || "your skills"}
              {candidate.location ? ` · ${candidate.location}` : ""}
            </div>
          </div>
        </Glass>
      )}

      <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
        {JOB_TYPES.map((t) => <Pill key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</Pill>)}
      </div>

      {aiLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Glass key={i} className="h-28 animate-pulse p-4"><div /></Glass>)}</div>
      ) : aiError ? (
        <Glass className="p-6 text-center text-[12px]" style={{ color: "oklch(0.5 0.2 20)" }}>{aiError}</Glass>
      ) : list.length === 0 ? (
        <Glass className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.violet }}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="font-display text-base italic" style={{ color: PINK.ink }}>
            {candidate ? "No jobs match that filter" : "Run Resume Match to see internet jobs"}
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">Tap Run above — camera, photo or PDF supported.</div>
        </Glass>
      ) : (
        <div className="space-y-3">
          {list.map((j, i) => (
            <Glass key={`${j.title}-${i}`} className="flex items-start gap-3 p-4 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="h-12 w-12 shrink-0 rounded-2xl shadow" style={{ background: gradFor(i) }} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-base italic leading-tight" style={{ color: PINK.ink }}>{j.title}</div>
                <div className="text-[11px] text-muted-foreground">{j.company}</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground"><MapPin className="h-3 w-3" /> {j.location}</div>
                {j.place_of_work_required && (
                  <div className="mt-1 text-[10px] text-muted-foreground"><span className="font-semibold text-foreground/70">Work: </span>{j.place_of_work_required}</div>
                )}
                {j.joining_time && (
                  <div className="mt-0.5 text-[10px] text-muted-foreground"><span className="font-semibold text-foreground/70">Joining: </span>{j.joining_time}</div>
                )}
                {j.salary && <div className="mt-1 text-[11px] font-semibold">{j.salary}</div>}
                {j.summary && <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{j.summary}</div>}
                <div className="mt-1.5 flex gap-1">
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[9px] font-medium capitalize">{j.work_type}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <MatchTier score={j.match_score} />
                <a
                  href={j.apply_url || "#"}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="rounded-full px-3 py-1 text-[11px] font-semibold text-white shadow active:scale-95"
                  style={{ background: PINK.primary }}
                >Apply</a>
              </div>
            </Glass>
          ))}
        </div>
      )}

      <AIResumeMatchSheet
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onAccepted={(r, prefs) => { setAiOpen(false); loadJobs(r, prefs); }}
      />
    </div>
  );
}

/* ========================= HIRE / VERIFICATION WIZARD ========================= */

const STEPS: { key: string; title: string; sub: string; I: typeof ShieldCheck; g: string }[] = [
  { key: "gov", title: "Government ID", sub: "Aadhaar · Passport · Licence · Voter ID", I: IdCard, g: PINK.primary },
  { key: "face", title: "Face & Liveness", sub: "Selfie + blink + anti-spoof", I: ScanFace, g: PINK.rose },
  { key: "contact", title: "Phone & Email", sub: "OTP + 2FA + recovery email", I: Phone, g: PINK.violet },
  { key: "work", title: "Work Proof & Portfolio", sub: "GitHub · Behance · Site · PDFs", I: FolderKanban, g: PINK.peach },
  { key: "edu", title: "Education & Skills", sub: "Degree· Certs· skill test", I: GraduationCap, g: PINK.mint },
  { key: "exp", title: "Experience", sub: "Companies · Recommendation letters", I: Briefcase, g: PINK.gold },
  { key: "bank", title: "Bank & Payments", sub: "Account · UPI · Card verify", I: Landmark, g: PINK.violet },
  { key: "bg", title: "Background & Reputation", sub: "Reviews · Success rate · Trust score", I: Fingerprint, g: PINK.rose },
];

function HireView({ back }: { back: () => void }) {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [role, setRole] = useState({ title: "", desc: "", location: "", pay: "", type: "Remote" });
  const [posted, setPosted] = useState(false);
  const { unlocked: canPublish, loading: accessLoading, paying, purchase } = usePublishAccess();

  const trust = Math.round((done.size / STEPS.length) * 1000);
  const pct = Math.round((done.size / STEPS.length) * 100);

  return (
    <div className="space-y-5 px-4">
      {/* Dashboard */}
      <Glass className="overflow-hidden p-5 animate-fade-up">
        <div className="flex items-center gap-4">
          <div className="relative flex h-24 w-24 items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
              <circle cx="50" cy="50" r="42" strokeWidth="10" stroke="oklch(0.94 0.02 20)" fill="none" />
              <circle cx="50" cy="50" r="42" strokeWidth="10" stroke="url(#pinkgrad)" fill="none"
                strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - pct / 100)} strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22,1,0.36,1)" }} />
              <defs>
                <linearGradient id="pinkgrad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="oklch(0.78 0.13 15)" />
                  <stop offset="1" stopColor="oklch(0.72 0.15 355)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="text-center">
              <div className="font-display text-2xl italic leading-none" style={{ color: PINK.ink }}>{pct}%</div>
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">verified</div>
            </div>
          </div>
          <div className="flex-1">
            <div className="font-display text-lg italic" style={{ color: PINK.ink }}>Verification Center</div>
            <div className="mt-0.5 text-[11px] text-muted-foreground"> Trust Score</div>
            <div className="font-display text-2xl italic" style={{ color: trust >= 800 ? "oklch(0.6 0.18 85)" : trust >= 500 ? "oklch(0.6 0.18 240)" : "oklch(0.6 0.18 25)" }}>
              {trust} <span className="text-xs text-muted-foreground">/ 1000</span>
            </div>
            <div className="mt-1 flex gap-1">
              {["🟢","🔵","🟣","🟡","🟠","🔴","⭐","🏆"].slice(0, Math.max(1, done.size)).map((b, i) => <span key={i} className="text-sm">{b}</span>)}
            </div>
          </div>
        </div>
      </Glass>

      {/* Steps */}
      <div>
        <SectionTitle title="Verification steps" action={<span className="text-[10px] uppercase tracking-widest text-muted-foreground">{done.size}/{STEPS.length}</span>} />
        <div className="space-y-2">
          {STEPS.map((s, i) => {
            const isDone = done.has(s.key);
            return (
              <button key={s.key} onClick={() => setOpen(s.key)} className="block w-full text-left">
                <Glass className="flex items-center gap-3 p-3 transition-transform active:scale-[0.99] animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow" style={{ background: s.g }}>
                    <s.I className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-sm italic" style={{ color: PINK.ink }}>{s.title}</div>
                    <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                  </div>
                  {isDone ? (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow" style={{ background: PINK.mint }}>
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </Glass>
              </button>
            );
          })}
        </div>
      </div>

      {/* Post role */}
      <Glass className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Briefcase className="h-5 w-5" style={{ color: "oklch(0.55 0.18 15)" }} />
          <div className="font-display text-base italic" style={{ color: PINK.ink }}>Post a role</div>
          <span className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white" style={{ background: pct >= 50 ? PINK.mint : PINK.gold }}>
            {pct >= 50 ? "Trusted" : "Basic"}
          </span>
        </div>
        <Field label="Job title" value={role.title} onChange={(v) => setRole({ ...role, title: v })} placeholder="e.g. Product Designer" />
        <Field label="Description" value={role.desc} onChange={(v) => setRole({ ...role, desc: v })} placeholder="What the person will do" area />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Location" value={role.location} onChange={(v) => setRole({ ...role, location: v })} placeholder="Remote / City" />
          <Field label="Pay" value={role.pay} onChange={(v) => setRole({ ...role, pay: v })} placeholder="$ or ₹ range" />
        </div>
        <div className="mt-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Type</div>
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {["Remote","Hybrid","On-site","Internship","Contract","Freelance"].map((t) => (
            <Pill key={t} active={role.type === t} onClick={() => setRole({ ...role, type: t })}>{t}</Pill>
          ))}
        </div>
        <button onClick={() => { if (!canPublish) { purchase(); return; } if (role.title.trim()) setPosted(true); }}
          disabled={paying}
          className="mt-4 w-full rounded-full py-3 text-sm font-semibold text-white shadow-lg active:scale-[0.99] disabled:opacity-60"
          style={{ background: PINK.primary }}>
          {!canPublish
            ? (paying ? "Opening secure checkout…" : `Unlock publishing — ₹${PUBLISH_FEE_INR} one-time`)
            : posted ? "✓ Role posted — invitations sent" : "Publish role"}
        </button>
        <div className="mt-2 text-center text-[10px] text-muted-foreground">
          {!canPublish && !accessLoading
            ? `Publishing roles needs a one-time ₹${PUBLISH_FEE_INR} fee — then publish unlimited roles officially.`
            : pct < 50 ? "Complete 4+ verifications to unlock a Trusted badge." : "Your role will show the Trusted verified badge."}
        </div>
      </Glass>

      {open && (
        <Sheet onClose={() => setOpen(null)} title={STEPS.find((s) => s.key === open)!.title}>
          <StepBody
            stepKey={open}
            title={STEPS.find((s) => s.key === open)!.title}
            onCancel={() => setOpen(null)}
            onVerified={() => { setDone((p) => new Set(p).add(open)); setOpen(null); }}
          />
        </Sheet>
      )}
    </div>
  );
}

type StepSpec = {
  note: string;
  fields: { key: string; l: string; ph: string; type?: string }[];
  upload?: string;
  mode: "document" | "otp" | "attest";
};

const STEP_SPECS: Record<string, StepSpec> = {
  gov: {
    note: "Upload a government-issued ID. Sam reads the name, ID number, DOB and expiry, then checks them against what you typed.",
    fields: [
      { key: "name", l: "Full name (as on ID)", ph: "Your full name" },
      { key: "idNumber", l: "ID number", ph: "ID number" },
    ],
    upload: "Upload ID photo (front)",
    mode: "document",
  },
  face: {
    note: "Upload or capture a clear selfie. Liveness + anti-spoof checks run before your face is matched.",
    fields: [{ key: "name", l: "Full name", ph: "Your full name" }],
    upload: "Capture / upload selfie",
    mode: "document",
  },
  contact: {
    note: "We send a 6-digit code to your mobile. Enter it to confirm ownership of the number.",
    fields: [
      { key: "phone", l: "Mobile", ph: "+91 98765 43210", type: "tel" },
      { key: "email", l: "Email", ph: "you@example.com", type: "email" },
    ],
    mode: "otp",
  },
  work: {
    note: "Add your portfolio link and upload a work sample. Sam checks the sample really belongs to the link/name you gave.",
    fields: [
      { key: "name", l: "Your name / handle", ph: "As shown on the work" },
      { key: "link", l: "GitHub / Behance / Site", ph: "https://…" },
    ],
    upload: "Attach work sample",
    mode: "document",
  },
  edu: {
    note: "Upload your degree or certificate. Sam reads the name, institute and qualification and matches your entry.",
    fields: [
      { key: "name", l: "Name on certificate", ph: "Your full name" },
      { key: "qualification", l: "Highest qualification", ph: "e.g. B.Sc" },
      { key: "institute", l: "Institute / board", ph: "University name" },
    ],
    upload: "Upload certificate",
    mode: "document",
  },
  exp: {
    note: "Upload your experience or relieving letter. Sam matches the company and your name.",
    fields: [
      { key: "name", l: "Your name", ph: "Your full name" },
      { key: "company", l: "Most recent company", ph: "Company name" },
      { key: "years", l: "Years of experience", ph: "0" },
    ],
    upload: "Upload experience letter",
    mode: "document",
  },
  bank: {
    note: "Upload a passbook / cancelled cheque / UPI screenshot. Sam matches the account holder name and account or UPI ID.",
    fields: [
      { key: "name", l: "Account holder", ph: "Your name" },
      { key: "account", l: "UPI / Account no", ph: "you@upi" },
    ],
    upload: "Upload bank proof",
    mode: "document",
  },
  bg: {
    note: "Your ratings, reviews, success rate and disputes are aggregated into your trust score once your ID and contact are verified.",
    fields: [],
    mode: "attest",
  },
};

function StepBody({
  stepKey,
  title,
  onCancel,
  onVerified,
}: {
  stepKey: string;
  title: string;
  onCancel: () => void;
  onVerified: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const s = STEP_SPECS[stepKey] ?? STEP_SPECS.bg;
  const [vals, setVals] = useState<Record<string, string>>({});
  const [file, setFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState("");
  const [otp, setOtp] = useState("");
  const [result, setResult] = useState<{ state: "success" | "fail"; reason: string; confidence?: number } | null>(null);

  const set = (k: string) => (v: string) => setVals((p) => ({ ...p, [k]: v }));

  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setErr("Please upload an image of the document."); return; }
    if (f.size > 6 * 1024 * 1024) { setErr("Image is too large (max 6MB)."); return; }
    setErr("");
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = () => rej(new Error("Could not read file"));
      r.readAsDataURL(f);
    });
    setFile({ name: f.name, dataUrl });
  };

  const runDocument = async () => {
    setBusy(true); setErr("");
    try {
      const { verifyCredential } = await import("@/lib/verify.functions");
      const r = await verifyCredential({
        data: {
          step: stepKey,
          label: title,
          fields: s.fields.map((f) => ({ label: f.l, value: vals[f.key] ?? "" })),
          image: file?.dataUrl ?? "",
        },
      });
      setResult({ state: r.ok ? "success" : "fail", reason: r.reason, confidence: r.confidence });
    } catch (e: any) {
      setErr(e?.message ?? "Verification failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    setBusy(true); setErr("");
    try {
      const { requestOtp } = await import("@/lib/verify.functions");
      const r = await requestOtp({ data: { channel: "phone", target: vals.phone ?? "" } });
      setOtpSent(true);
      setOtpHint(r.code);
    } catch (e: any) {
      setErr(e?.message ?? "Could not send the code.");
    } finally {
      setBusy(false);
    }
  };

  const checkOtp = async () => {
    setBusy(true); setErr("");
    try {
      const { confirmOtp } = await import("@/lib/verify.functions");
      const r = await confirmOtp({ data: { channel: "phone", target: vals.phone ?? "", code: otp } });
      setResult({ state: r.ok ? "success" : "fail", reason: r.ok ? "Congratulations — welcome to Samsta Premium verification." : r.reason, confidence: r.confidence });
    } catch (e: any) {
      setErr(e?.message ?? "Could not verify the code.");
    } finally {
      setBusy(false);
    }
  };

  const canSubmit = s.mode === "attest"
    ? true
    : s.mode === "otp"
      ? otpSent && otp.replace(/\D/g, "").length === 6
      : s.fields.every((f) => (vals[f.key] ?? "").trim().length > 0) && !!file;

  return (
    <div className="space-y-2">
      <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-[11px] text-muted-foreground">{s.note}</div>

      {s.fields.map((f) => (
        <Field key={f.key} label={f.l} placeholder={f.ph} value={vals[f.key] ?? ""} onChange={set(f.key)} />
      ))}

      {s.upload && (
        <>
          <button onClick={() => inputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white bg-white/60 py-4 text-[12px] font-semibold">
            <Upload className="h-4 w-4" /> {file ? "Change document photo" : s.upload}
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
          </button>
          {file && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-2">
              <img src={file.dataUrl} alt="Uploaded document preview" className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1 truncate text-[11px] font-semibold" style={{ color: PINK.ink }}>{file.name}</div>
              <button onClick={() => setFile(null)} aria-label="Remove document" className="rounded-full p-1"><X className="h-4 w-4" /></button>
            </div>
          )}
        </>
      )}

      {s.mode === "otp" && (
        <>
          {!otpSent ? (
            <button onClick={sendOtp} disabled={busy || !(vals.phone ?? "").trim()}
              className="w-full rounded-full py-3 text-sm font-semibold text-white shadow disabled:opacity-50"
              style={{ background: PINK.violet }}>
              {busy ? "Sending…" : "Send OTP to my mobile"}
            </button>
          ) : (
            <>
              <Field label="6-digit OTP" placeholder="••••••" value={otp} onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))} />
              {otpHint && (
                <div className="rounded-2xl border border-white/70 bg-white/70 p-2 text-center text-[10px] text-muted-foreground">
                  Demo delivery — your code is <span className="font-bold tracking-widest" style={{ color: PINK.ink }}>{otpHint}</span>. Connect an SMS provider for live delivery.
                </div>
              )}
              <button onClick={sendOtp} disabled={busy} className="w-full text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Resend code</button>
            </>
          )}
        </>
      )}

      {err && <div className="rounded-2xl bg-white/70 p-2 text-center text-[11px] font-semibold" style={{ color: "oklch(0.55 0.2 20)" }}>{err}</div>}

      <div className="mt-3 flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-full border border-white/70 bg-white/70 py-3 text-sm font-semibold">Later</button>
        <button
          onClick={() => { if (s.mode === "otp") checkOtp(); else if (s.mode === "attest") setResult({ state: "success", reason: "Reputation checks passed.", confidence: 100 }); else runDocument(); }}
          disabled={busy || !canSubmit}
          className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow active:scale-[0.99] disabled:opacity-50"
          style={{ background: PINK.primary }}>
          {busy ? "Checking…" : "Mark verified"}
        </button>
      </div>

      {result && (
        <VerifyResultOverlay
          state={result.state}
          title={title}
          reason={result.reason}
          confidence={result.confidence}
          onDone={() => {
            const ok = result.state === "success";
            setResult(null);
            if (ok) onVerified();
          }}
        />
      )}
    </div>
  );
}


/* ========================= SIMPLE CARD SECTIONS ========================= */

type SimpleCard = { t: string; s: string; g: string; I: typeof Home };
const LEARN: SimpleCard[] = [];
const PORT: SimpleCard[] = [];
const COMP: SimpleCard[] = [];
const EVENTS: SimpleCard[] = [];
const MSGS: SimpleCard[] = [];
const AI_CAREER: string[] = [];
const AI_BIZ: string[] = [];

function SimpleCards({ title, items }: { title: string; items: { t: string; s: string; g: string; I: typeof Home }[] }) {
  return (
    <div className="space-y-3 px-4">
      <SectionTitle title={title} />
      {items.length === 0 ? (
        <Glass className="p-8 text-center">
          <div className="font-display text-base italic" style={{ color: PINK.ink }}>Nothing here yet</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Your {title.toLowerCase()} will appear here.</div>
        </Glass>
      ) : items.map((x, i) => (
        <Glass key={i} className="flex items-center gap-3 p-3 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow" style={{ background: x.g }}>
            <x.I className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="font-display text-sm italic" style={{ color: PINK.ink }}>{x.t}</div>
            <div className="text-[10px] text-muted-foreground">{x.s}</div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Glass>
      ))}
    </div>
  );
}

function AICard({ title, icon: I, lines }: { title: string; icon: typeof Brain; lines: string[] }) {
  return (
    <div className="space-y-3 px-4">
      <Glass className="p-5 animate-fade-up">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow" style={{ background: PINK.primary }}>
            <I className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-lg italic" style={{ color: PINK.ink }}>{title}</div>
            <div className="text-[11px] text-muted-foreground">Personalised by Sam </div>
          </div>
        </div>
        <div className="space-y-2">
          {lines.length === 0 ? (
            <div className="rounded-2xl border border-white/70 bg-white/70 p-3 text-[12px] text-muted-foreground">
              Personalised insights will appear here once you add your details.
            </div>
          ) : lines.map((l, i) => (
            <div key={i} className="rounded-2xl border border-white/70 bg-white/70 p-3 text-[12px]" style={{ animationDelay: `${i * 60}ms` }}>
              <Sparkles className="mr-1.5 inline h-3.5 w-3.5" style={{ color: "oklch(0.6 0.18 15)" }} />
              {l}
            </div>
          ))}
        </div>
      </Glass>
    </div>
  );
}

/* ========================= SHARE SHEET ========================= */

function ShareSheet({ onClose }: { onClose: () => void }) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/career` : "https://samsta.app/career";
  const text = "Check out my Samsta professional profile— verified, premium & powered.";
  const enc = encodeURIComponent(`${text} ${url}`);
  const items = [
    { l: "WhatsApp", href: `https://wa.me/?text=${enc}`, g: "linear-gradient(135deg,#25D366,#128C7E)" },
    { l: "Telegram", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, g: "linear-gradient(135deg,#37AEE2,#1E96C8)" },
    { l: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${enc}`, g: "linear-gradient(135deg,#111,#333)" },
    { l: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, g: "linear-gradient(135deg,#1877F2,#0d5fc7)" },
    { l: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, g: "linear-gradient(135deg,#0A66C2,#004182)" },
    { l: "Email", href: `mailto:?subject=${encodeURIComponent("My Samsta profile")}&body=${enc}`, g: PINK.violet },
  ];
  async function nativeShare() {
    if (navigator.share) { try { await navigator.share({ title: "Samsta", text, url }); onClose(); } catch {} }
  }
  async function copy() { try { await navigator.clipboard.writeText(url); } catch {} }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-[2rem] border border-white/70 p-5 pb-8 shadow-2xl"
        style={{ background: "linear-gradient(180deg, oklch(0.99 0.005 20 / 0.98), oklch(0.97 0.02 15 / 0.98))", backdropFilter: "blur(30px)" }}>
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/10" />
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-lg italic" style={{ color: PINK.ink }}>Share your profile</div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {items.map((x) => (
            <a key={x.l} href={x.href} target="_blank" rel="noreferrer" onClick={onClose} className="flex flex-col items-center gap-1.5 active:scale-95">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: x.g }}>
                <Send className="h-6 w-6" />
              </div>
              <div className="text-[10px] font-medium">{x.l}</div>
            </a>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={nativeShare} className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow" style={{ background: PINK.primary }}>
            <Share2 className="mr-1 inline h-4 w-4" /> More
          </button>
          <button onClick={copy} className="flex-1 rounded-full border border-white/70 bg-white/70 py-3 text-sm font-semibold">
            <Copy className="mr-1 inline h-4 w-4" /> Copy link
          </button>
        </div>
      </div>
    </div>
  );
}

/* ========================= SHEET + FIELD ========================= */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] border border-white/70 p-5 shadow-2xl animate-tab-in"
        style={{ background: "linear-gradient(180deg, oklch(0.99 0.005 20 / 0.98), oklch(0.97 0.02 15 / 0.98))", backdropFilter: "blur(30px)" }}>

        <div className="mb-3 flex items-center justify-between">
          <div className="font-display text-lg italic" style={{ color: PINK.ink }}>{title}</div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-2">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, area }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; area?: boolean;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3}
          className="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full rounded-2xl border border-white/70 bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200" />
      )}
    </label>
  );
}
