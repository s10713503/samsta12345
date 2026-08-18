import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Newspaper, Sparkles, Send, Sunrise, Sun, Moon, Flame, Globe2,
  TrendingUp, ShieldCheck, Scale, Smile, Meh, Frown, Radio, Bookmark, Share2,
  Volume2, VolumeX, Languages, Search, Mail, Map, Bot, Zap, ChevronRight,
  MessageSquare, BarChart3, Loader2, Trash2, Plus, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news")({
  component: NewsHub,
  head: () => ({
    meta: [
      { title: "News Intelligence & Briefings— Samsta" },
      { name: "description", content: "Premium news briefings, fact-checking, bias analysis and personalized story intelligence— powered by Sam on Samsta." },
      { property: "og:title", content: "News Intelligence & Briefings— Samsta" },
      { property: "og:description", content: "Personalized news briefings with fact-checks, bias analysis and sentiment on Samsta Premium." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://samstaofficial.lovable.app/news" },
    ],
    links: [{ rel: "canonical", href: "https://samstaofficial.lovable.app/news" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Samsta News Intelligence",
        serviceType: "news briefing, fact-checking and bias analysis",
        provider: { "@type": "Organization", name: "Samsta" },
        url: "https://samstaofficial.lovable.app/news",
      }),
    }],
  }),
});

/* ============================================================
   Local store
============================================================ */
type Story = {
  id: string; title: string; source: string; category: string;
  summary_30s: string; summary_1m: string;
  sentiment: "positive"|"neutral"|"negative";
  bias: "left"|"center-left"|"center"|"center-right"|"right"|"unknown";
  credibility: number; region: "global"|"national"|"local";
  tags: string[]; emoji: string; published_min_ago: number;
  impact: "low"|"medium"|"high";
};
type Trend = { tag: string; title: string; score: number; delta: string; category: string; volume: string };
type Region = { name: string; lat: number; lng: number; intensity: number; headline: string; category: string };
type Bookmark = { id: string; title: string; source: string; category: string; savedAt: number; body: string };
type Reading = { id: string; title: string; at: number };
type State = {
  interests: string[];
  region: string;
  profession: string;
  language: string;
  bookmarks: Bookmark[];
  reading: Reading[];
  notif: { breaking: boolean; morning: boolean; afternoon: boolean; evening: boolean };
  ttsOn: boolean;
  watchlist: string[];
};
const DEFAULT: State = {
  interests: ["", "Startups", "Technology", "Business"],
  region: "Global", profession: "Creator", language: "English",
  bookmarks: [], reading: [],
  notif: { breaking: true, morning: true, afternoon: false, evening: true },
  ttsOn: false,
  watchlist: ["AAPL", "TSLA", "BTC"],
};
const keyFor = (uid: string) => `samsta:news:${uid}`;
function useStore(uid: string) {
  const [s, setS] = useState<State>(DEFAULT);
  useEffect(() => {
    try { const raw = localStorage.getItem(keyFor(uid)); if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) }); } catch { /* noop */ }
  }, [uid]);
  useEffect(() => { try { localStorage.setItem(keyFor(uid), JSON.stringify(s)); } catch { /* noop */ } }, [uid, s]);
  return [s, setS] as const;
}
const uid = () => Math.random().toString(36).slice(2, 10);
const slot = (): "morning"|"afternoon"|"evening" => {
  const h = new Date().getHours();
  if (h < 12) return "morning"; if (h < 17) return "afternoon"; return "evening";
};

/* ============================================================
   JSON helper
============================================================ */
async function askJSON<T = unknown>(tool: string, payload: object): Promise<T | null> {
  try {
    const raw = await streamSam(tool, [{ role: "user", content: JSON.stringify(payload) }], () => {});
    const m = raw.match(/\{[\s\S]*\}$/) ?? raw.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch { return null; }
}

/* ============================================================
   UI primitives
============================================================ */
function Glass({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("rounded-3xl border border-foreground/10 bg-background/40 backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]", className)}>{children}</div>;
}
function GradientHeader({ icon, title, sub, accent = "from-rose-400/30 via-fuchsia-400/20 to-amber-300/20" }: { icon: React.ReactNode; title: string; sub: string; accent?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-foreground/10 p-4", "bg-gradient-to-br", accent)}>
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-background/50 backdrop-blur-xl border border-foreground/10">{icon}</div>
        <div>
          <div className="font-display italic text-lg leading-tight">{title}</div>
          <div className="text-[11px] text-foreground/60">{sub}</div>
        </div>
      </div>
    </div>
  );
}
function Chip({ active, children, onClick, className }: { active?: boolean; children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn(
      "px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border transition active:scale-95",
      active ? "bg-foreground text-background border-foreground shadow" : "bg-background/50 border-foreground/10 text-foreground/70 hover:text-foreground",
      className,
    )}>{children}</button>
  );
}

const TABS = [
  { id: "feed", label: "Feed", icon: Newspaper },
  { id: "briefing", label: "Briefing", icon: Sun },
  { id: "trending", label: "Trending", icon: Flame },
  { id: "map", label: "World Map", icon: Map },
  { id: "tools", label: "Tools", icon: Sparkles },
  { id: "saved", label: "Saved", icon: Bookmark },
  { id: "sam", label: "Ask Sam", icon: Bot },
];

const CATEGORIES = ["All", "World", "Business", "Tech", "", "Science", "Politics", "Sports", "Entertainment", "Health", "Climate", "Startup", "Space", "Finance"];
const INTEREST_POOL = ["", "Startups", "Technology", "Business", "Finance", "Crypto", "Sports", "Entertainment", "Health", "Politics", "Science", "Space", "Climate", "Education", "Gaming", "Design"];

/* ============================================================
   Root
============================================================ */
function NewsHub() {
  const { user } = useAuthUser();
  const { isPremium } = usePremium();
  const [store, setStore] = useStore(user?.id ?? "guest");
  const [tab, setTab] = useState<string>("feed");

  if (!user) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <Glass className="p-6 text-center max-w-sm">
          <Newspaper className="mx-auto h-8 w-8 opacity-70" />
          <div className="mt-3 font-display italic text-xl">Sign in for personalized news</div>
          <div className="mt-1 text-sm text-foreground/60">Your interests, bookmarks, and briefings sync across devices.</div>
          <Link to="/auth" className="mt-4 inline-flex items-center rounded-full bg-foreground text-background px-4 py-2 text-sm">Sign in</Link>
        </Glass>
      </div>
    );
  }
  if (!isPremium) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <Glass className="p-6 text-center max-w-sm">
          <Sparkles className="mx-auto h-8 w-8 text-amber-500" />
          <div className="mt-3 font-display italic text-xl">News Intelligence is a Premium feature</div>
          <Link to="/premium" className="mt-4 inline-flex items-center rounded-full bg-foreground text-background px-4 py-2 text-sm">Unlock Premium</Link>
        </Glass>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-24 relative overflow-hidden">
      {/* Ambient gradient */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 -left-20 h-96 w-96 rounded-full bg-rose-300/20 blur-[120px] animate-pulse" />
        <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-indigo-300/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-amber-200/15 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-background/60 border-b border-foreground/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/assistants" className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="flex-1 min-w-0">
            <div className="font-display italic text-lg leading-tight truncate">News Intelligence</div>
            <div className="text-[11px] text-foreground/60 truncate">Personal analyst· {store.region} · {slot()}</div>
          </div>
          <button onClick={() => setStore((s) => ({ ...s, ttsOn: !s.ttsOn }))} className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10" title="Voice reader">
            {store.ttsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 opacity-60" />}
          </button>
        </div>
        {/* Live ticker */}
        <LiveTicker />
        {/* Tabs */}
        <div className="px-3 pb-2 pt-1 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap border transition active:scale-95",
                  tab === t.id ? "bg-foreground text-background border-foreground shadow" : "bg-background/50 border-foreground/10 text-foreground/70",
                )}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {tab === "feed" && <FeedTab store={store} setStore={setStore} />}
        {tab === "briefing" && <BriefingTab store={store} />}
        {tab === "trending" && <TrendingTab store={store} />}
        {tab === "map" && <MapTab />}
        {tab === "tools" && <ToolsTab language={store.language} />}
        {tab === "saved" && <SavedTab store={store} setStore={setStore} />}
        {tab === "sam" && <SamTab store={store} setStore={setStore} />}
      </div>
    </div>
  );
}

/* ============================================================
   Live Ticker
============================================================ */
function LiveTicker() {
  const items = useMemo(() => [
    { t: "BREAKING", m: "Global summit reaches surprise tech-safety pact" },
    { t: "MARKETS", m: "chip demand pushes semis to fresh highs" },
    { t: "SPACE", m: "First privately funded lunar payload lands successfully" },
    { t: "CLIMATE", m: "Record-low emissions week reported across EU" },
    { t: "STARTUP", m: "$2B mega-round in infra week's biggest deal" },
  ], []);
  return (
    <div className="border-y border-foreground/5 bg-gradient-to-r from-rose-500/5 via-transparent to-indigo-500/5 overflow-hidden">
      <div className="flex gap-8 py-1.5 animate-[ticker_35s_linear_infinite] whitespace-nowrap">
        {[...items, ...items].map((it, i) => (
          <span key={i} className="text-[11px] flex items-center gap-2">
            <span className="rounded-full bg-rose-500/15 text-rose-600 px-2 py-0.5 text-[9px] font-semibold tracking-wide">{it.t}</span>
            <span className="text-foreground/80">{it.m}</span>
          </span>
        ))}
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  );
}

/* ============================================================
   Feed
============================================================ */
function FeedTab({ store, setStore }: { store: State; setStore: React.Dispatch<React.SetStateAction<State>> }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState("All");
  const [openStory, setOpenStory] = useState<Story | null>(null);

  const load = async () => {
    setLoading(true);
    const r = await askJSON<{ stories: Story[] }>("news_feed", {
      interests: store.interests, region: store.region, profession: store.profession,
      time_of_day: slot(), language: store.language,
    });
    setLoading(false);
    if (r?.stories) setStories(r.stories.map((s, i) => ({ ...s, id: s.id || `s${i}` })));
    else toast.error("Couldn't load feed");
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = cat === "All" ? stories : stories.filter((s) => s.category === cat);

  const save = (s: Story) => {
    setStore((st) => ({
      ...st,
      bookmarks: [{ id: uid(), title: s.title, source: s.source, category: s.category, savedAt: Date.now(), body: s.summary_1m }, ...st.bookmarks].slice(0, 100),
    }));
    toast.success("Saved to reading list");
  };
  const read = (s: Story) => {
    setStore((st) => ({ ...st, reading: [{ id: s.id, title: s.title, at: Date.now() }, ...st.reading.filter((r) => r.id !== s.id)].slice(0, 60) }));
    setOpenStory(s);
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Newspaper className="h-5 w-5" />} title="Your personalized feed"
        sub={`${store.interests.slice(0, 3).join(" · ")}${store.interests.length > 3 ? " · +" : ""}`}
        accent="from-rose-400/30 via-pink-300/20 to-amber-300/20" />

      {/* Interests editor */}
      <Glass className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wide text-foreground/60">Interests</div>
          <button onClick={load} className="text-[11px] rounded-full bg-foreground text-background px-3 py-1">Refresh</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INTEREST_POOL.map((i) => (
            <Chip key={i} active={store.interests.includes(i)}
              onClick={() => setStore((s) => ({ ...s, interests: s.interests.includes(i) ? s.interests.filter((x) => x !== i) : [...s.interests, i] }))}>
              {i}
            </Chip>
          ))}
        </div>
      </Glass>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>

      {loading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin opacity-60" /></div>}

      <div className="space-y-3">
        {filtered.map((s, i) => (
          <StoryCard key={s.id} s={s} onSave={() => save(s)} onOpen={() => read(s)} style={{ animationDelay: `${i * 40}ms` }} />
        ))}
        {!loading && filtered.length === 0 && (
          <Glass className="p-6 text-center text-sm text-foreground/60">No stories in this category. Try refreshing.</Glass>
        )}
      </div>

      {openStory && <StorySheet story={openStory} onClose={() => setOpenStory(null)} language={store.language} />}
    </div>
  );
}

function StoryCard({ s, onSave, onOpen, style }: { s: Story; onSave: () => void; onOpen: () => void; style?: React.CSSProperties }) {
  const SentIcon = s.sentiment === "positive" ? Smile : s.sentiment === "negative" ? Frown : Meh;
  const sentColor = s.sentiment === "positive" ? "text-emerald-500" : s.sentiment === "negative" ? "text-rose-500" : "text-foreground/60";
  const impactColor = s.impact === "high" ? "bg-rose-500/15 text-rose-600" : s.impact === "medium" ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600";
  return (
    <Glass className="p-4 animate-fade-up hover:scale-[1.005] transition-transform" >
      <div style={style} className="animate-fade-up">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wide">
          <div className="flex items-center gap-2 text-foreground/60">
            <span className="text-base">{s.emoji || "📰"}</span>
            <span>{s.source}</span>
            <span>·</span>
            <span>{s.category}</span>
            <span>·</span>
            <span>{s.published_min_ago}m ago</span>
          </div>
          <span className={cn("px-2 py-0.5 rounded-full text-[9px]", impactColor)}>{s.impact} impact</span>
        </div>
        <div className="mt-2 font-display italic text-[17px] leading-snug">{s.title}</div>
        <div className="mt-1.5 text-sm text-foreground/70">{s.summary_30s}</div>

        <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] text-foreground/60">
          <span className="inline-flex items-center gap-1"><SentIcon className={cn("h-3.5 w-3.5", sentColor)} /> {s.sentiment}</span>
          <span className="inline-flex items-center gap-1"><Scale className="h-3.5 w-3.5" /> bias: {s.bias}</span>
          <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> {s.credibility}% credible</span>
          <span className="inline-flex items-center gap-1"><Globe2 className="h-3.5 w-3.5" /> {s.region}</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button onClick={onOpen} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-foreground text-background text-xs px-3 py-2 active:scale-95">
            Open <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button onClick={onSave} className="grid place-items-center h-9 w-9 rounded-full border border-foreground/10 bg-background/50 active:scale-90"><Bookmark className="h-4 w-4" /></button>
          <button onClick={() => { navigator.share?.({ title: s.title, text: s.summary_30s }).catch(() => {}); }} className="grid place-items-center h-9 w-9 rounded-full border border-foreground/10 bg-background/50 active:scale-90"><Share2 className="h-4 w-4" /></button>
        </div>
      </div>
    </Glass>
  );
}

function StorySheet({ story, onClose, language }: { story: Story; onClose: () => void; language: string }) {
  const [mode, setMode] = useState<"summary"|"deep"|"explain"|"factcheck"|"bias"|"qa">("summary");
  const [depth, setDepth] = useState<"30s"|"1m"|"deep">("1m");
  const [out, setOut] = useState<string>(depth === "30s" ? story.summary_30s : story.summary_1m);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [fc, setFc] = useState<{ verdict: string; confidence: number; reasoning: string; evidence: string[] } | null>(null);
  const [bias, setBias] = useState<{ bias: string; confidence: number; framing: string; balanced_alt: string; loaded_phrases: string[] } | null>(null);

  const run = async (m: typeof mode) => {
    setMode(m); setLoading(true);
    try {
      if (m === "summary") {
        const acc = await streamSam("news_summary", [{ role: "user", content: JSON.stringify({ title: story.title, body: story.summary_1m, length: depth, language }) }], setOut);
        setOut(acc);
      } else if (m === "deep") {
        setDepth("deep");
        const acc = await streamSam("news_summary", [{ role: "user", content: JSON.stringify({ title: story.title, body: story.summary_1m, length: "deep", language }) }], setOut);
        setOut(acc);
      } else if (m === "explain") {
        const acc = await streamSam("news_explain", [{ role: "user", content: `${story.title}\n\n${story.summary_1m}` }], setOut);
        setOut(acc);
      } else if (m === "factcheck") {
        setOut(""); const r = await askJSON<typeof fc>("news_factcheck", { claim: story.title, context: story.summary_1m });
        setFc(r);
      } else if (m === "bias") {
        setOut(""); const r = await askJSON<typeof bias>("news_bias", { title: story.title, body: story.summary_1m, source: story.source });
        setBias(r);
      }
    } finally { setLoading(false); }
  };

  const ask = async () => {
    if (!q.trim()) return;
    setMode("qa"); setLoading(true); setOut("");
    try {
      const acc = await streamSam("news_qa", [{ role: "user", content: JSON.stringify({ article: `${story.title}\n\n${story.summary_1m}`, question: q, language }) }], setOut);
      setOut(acc);
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xl overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="min-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={onClose} className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></button>
            <div className="text-[11px] text-foreground/60">{story.source}</div>
          </div>
          <Glass className="p-4">
            <div className="text-[10px] uppercase tracking-wide text-foreground/60">{story.category} · {story.published_min_ago}m ago</div>
            <div className="mt-1 font-display italic text-2xl leading-tight">{story.title}</div>
            <div className="mt-3 flex gap-1.5 flex-wrap">
              {(["30s","1m","deep"] as const).map((d) => (
                <Chip key={d} active={depth === d} onClick={() => { setDepth(d); void run(d === "deep" ? "deep" : "summary"); }}>{d} read</Chip>
              ))}
              <Chip active={mode==="explain"} onClick={() => void run("explain")}>Explain</Chip>
              <Chip active={mode==="factcheck"} onClick={() => void run("factcheck")}>Fact check</Chip>
              <Chip active={mode==="bias"} onClick={() => void run("bias")}>Bias</Chip>
            </div>
          </Glass>

          <Glass className="p-4 mt-3 min-h-[160px]">
            {loading && <div className="flex items-center gap-2 text-sm text-foreground/60"><Loader2 className="h-4 w-4 animate-spin" /> Sam is analyzing…</div>}
            {!loading && mode === "factcheck" && fc && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" /><b>Verdict:</b> {fc.verdict} · <span className="text-foreground/60">{fc.confidence}% confidence</span></div>
                <div className="text-foreground/80">{fc.reasoning}</div>
                <ul className="list-disc list-inside text-foreground/70 text-[13px]">{fc.evidence?.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </div>
            )}
            {!loading && mode === "bias" && bias && (
              <div className="space-y-2 text-sm">
                <div><Scale className="inline h-4 w-4 mr-1" /><b>Bias:</b> {bias.bias} ({bias.confidence}% conf.)</div>
                <div><b>Framing:</b> {bias.framing}</div>
                <div><b>Balanced angle:</b> {bias.balanced_alt}</div>
                {bias.loaded_phrases?.length > 0 && <div className="text-[12px] text-foreground/60">Loaded phrases: {bias.loaded_phrases.join(" · ")}</div>}
              </div>
            )}
            {!loading && (mode === "summary" || mode === "deep" || mode === "explain" || mode === "qa") && (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{out}</div>
            )}
          </Glass>

          <Glass className="p-3 mt-3">
            <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Ask Sam about this story</div>
            <div className="flex items-center gap-2">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()}
                placeholder="e.g. Who's affected the most?"
                className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none focus:border-foreground/30" />
              <button onClick={ask} className="grid place-items-center h-9 w-9 rounded-full bg-foreground text-background"><Send className="h-4 w-4" /></button>
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Briefing
============================================================ */
function BriefingTab({ store }: { store: State }) {
  const [slotSel, setSlotSel] = useState<"morning"|"afternoon"|"evening">(slot());
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true); setOut("");
    try {
      const acc = await streamSam("news_brief_deep", [{ role: "user", content: JSON.stringify({ slot: slotSel, interests: store.interests, language: store.language }) }], setOut);
      setOut(acc);
    } finally { setLoading(false); }
  };
  useEffect(() => { void generate(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [slotSel]);

  const speak = () => {
    try {
      const u = new SpeechSynthesisUtterance(out.replace(/[*_#]/g, ""));
      u.rate = 1.02; speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch { toast.error("Voice unavailable"); }
  };

  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Sun className="h-5 w-5" />} title="Daily Briefing" sub="Morning · Afternoon · Evening — written for you"
        accent="from-amber-300/30 via-orange-300/20 to-rose-300/20" />
      <div className="flex gap-2">
        {(["morning","afternoon","evening"] as const).map((s) => {
          const Icon = s === "morning" ? Sunrise : s === "afternoon" ? Sun : Moon;
          return (
            <button key={s} onClick={() => setSlotSel(s)}
              className={cn("flex-1 rounded-2xl border p-3 flex items-center gap-2 transition active:scale-95",
                slotSel === s ? "bg-foreground text-background border-foreground" : "bg-background/50 border-foreground/10")}>
              <Icon className="h-4 w-4" /><span className="text-sm capitalize">{s}</span>
            </button>
          );
        })}
      </div>
      <Glass className="p-4 min-h-[240px]">
        {loading ? <div className="flex items-center gap-2 text-sm text-foreground/60"><Loader2 className="h-4 w-4 animate-spin" /> Composing your briefing…</div>
          : <div className="whitespace-pre-wrap text-sm leading-relaxed">{out}</div>}
      </Glass>
      <div className="flex gap-2">
        <button onClick={generate} className="flex-1 rounded-full bg-foreground text-background text-sm py-2.5">Regenerate</button>
        <button onClick={speak} className="rounded-full border border-foreground/10 bg-background/50 px-4 py-2.5 text-sm inline-flex items-center gap-2"><Volume2 className="h-4 w-4" /> Listen</button>
      </div>
    </div>
  );
}

/* ============================================================
   Trending
============================================================ */
function TrendingTab({ store }: { store: State }) {
  const [topics, setTopics] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const r = await askJSON<{ topics: Trend[] }>("news_trending", { region: store.region, interests: store.interests });
    setLoading(false);
    if (r?.topics) setTopics(r.topics);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Flame className="h-5 w-5" />} title="Trending now" sub="Live popularity scores across your topics"
        accent="from-orange-400/30 via-rose-300/20 to-fuchsia-300/20" />
      {loading && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin opacity-60" /></div>}
      <div className="space-y-2">
        {topics.map((t, i) => (
          <Glass key={i} className="p-3 flex items-center gap-3 animate-fade-up" >
            <div className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-rose-400/30 to-orange-300/30 text-sm font-bold">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{t.title}</div>
              <div className="text-[11px] text-foreground/60">{t.tag} · {t.category} · {t.volume}</div>
              <div className="mt-1.5 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-amber-500" style={{ width: `${t.score}%` }} />
              </div>
            </div>
            <div className={cn("text-[11px] font-semibold", t.delta?.startsWith("-") ? "text-rose-500" : "text-emerald-500")}>{t.delta}</div>
          </Glass>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Map
============================================================ */
function MapTab() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [focus, setFocus] = useState("global events");
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    const r = await askJSON<{ regions: Region[] }>("news_heatmap", { focus });
    setLoading(false); if (r?.regions) setRegions(r.regions);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Map className="h-5 w-5" />} title="News Heatmap" sub="Where the world is moving right now"
        accent="from-indigo-400/30 via-cyan-300/20 to-teal-300/20" />
      <div className="flex gap-2">
        <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. climate, elections, markets"
          className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-4 py-2 text-sm outline-none" />
        <button onClick={load} className="rounded-full bg-foreground text-background px-4 text-sm">Scan</button>
      </div>
      <Glass className="p-3">
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-950/70 via-slate-900/70 to-slate-950/70">
          {/* Simple map grid backdrop */}
          <svg viewBox="0 0 360 180" className="absolute inset-0 h-full w-full opacity-20 text-white">
            {Array.from({ length: 19 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={180} stroke="currentColor" strokeWidth={0.3} />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 20} x2={360} y2={i * 20} stroke="currentColor" strokeWidth={0.3} />
            ))}
          </svg>
          {loading && <div className="absolute inset-0 grid place-items-center text-white/70"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          {regions.map((r, i) => {
            const x = ((r.lng + 180) / 360) * 100;
            const y = ((90 - r.lat) / 180) * 100;
            const size = 12 + (r.intensity / 100) * 28;
            return (
              <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{ left: `${x}%`, top: `${y}%` }}>
                <div className="rounded-full bg-rose-500/70 animate-ping absolute inset-0" style={{ width: size, height: size }} />
                <div className="rounded-full bg-rose-400 border-2 border-white/70" style={{ width: size, height: size }} />
                <div className="opacity-0 group-hover:opacity-100 transition absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap rounded-lg bg-black/80 text-white text-[10px] px-2 py-1">
                  {r.name} · {r.category}
                </div>
              </div>
            );
          })}
        </div>
      </Glass>
      <div className="space-y-2">
        {regions.map((r, i) => (
          <Glass key={i} className="p-3 animate-fade-up">
            <div className="flex items-center justify-between text-[11px] text-foreground/60">
              <span>{r.name} · {r.category}</span><span>intensity {r.intensity}</span>
            </div>
            <div className="text-sm mt-1">{r.headline}</div>
          </Glass>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 Tools (fact-check, compare, timeline, forecast, newsletter, translate)
============================================================ */
function ToolsTab({ language }: { language: string }) {
  const [tool, setTool] = useState<string>("factcheck");
  const tools = [
    { id: "factcheck", label: "Fact Check", icon: ShieldCheck },
    { id: "compare", label: "Compare sources", icon: Scale },
    { id: "timeline", label: "Story timeline", icon: BarChart3 },
    { id: "forecast", label: "forecast", icon: TrendingUp },
    { id: "newsletter", label: "Newsletter", icon: Mail },
    { id: "translate", label: "Translate", icon: Languages },
  ];
  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Sparkles className="h-5 w-5" />} title="News Toolbox" sub="Investigate, compare, forecast, translate"
        accent="from-violet-400/30 via-indigo-300/20 to-cyan-300/20" />
      <div className="grid grid-cols-3 gap-2">
        {tools.map((t) => (
          <button key={t.id} onClick={() => setTool(t.id)}
            className={cn("rounded-2xl border p-3 flex flex-col items-center gap-1 text-[11px] transition active:scale-95",
              tool === t.id ? "bg-foreground text-background border-foreground" : "bg-background/50 border-foreground/10")}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>
      {tool === "factcheck" && <ToolBox tool="news_factcheck" title="Fact Check" fields={[
        { key: "claim", label: "Claim", placeholder: "Paste the claim you want to verify…", type: "textarea" },
        { key: "context", label: "Context (optional)", placeholder: "Extra background…", type: "textarea" },
      ]} />}
      {tool === "compare" && <ToolBox tool="news_compare" title="Compare Sources" fields={[
        { key: "topic", label: "Topic", placeholder: "e.g. Fed rate decision", type: "input" },
        { key: "publishers", label: "Publishers (comma-separated)", placeholder: "Reuters, BBC, WSJ, Guardian", type: "input", coerce: "csv" },
      ]} />}
      {tool === "timeline" && <ToolBox tool="news_timeline" title="Story Timeline" fields={[
        { key: "topic", label: "Story", placeholder: "e.g. Rise of open-source", type: "input" },
      ]} />}
      {tool === "forecast" && <ToolBox tool="news_predict" title="Forecast" fields={[
        { key: "topic", label: "Topic", placeholder: "e.g. EV market in India", type: "input" },
        { key: "horizon", label: "Horizon", placeholder: "7d | 30d | 90d", type: "input" },
      ]} note="Forecasts are estimates, not facts." />}
      {tool === "newsletter" && <ToolBox tool="news_newsletter" title="Newsletter Generator" fields={[
        { key: "interests", label: "Interests (comma)", placeholder: ", Startups, Space", type: "input", coerce: "csv" },
        { key: "week_summary", label: "Week highlights", placeholder: "1–2 lines about the week…", type: "textarea" },
        { key: "tone", label: "Tone", placeholder: "editorial | casual | professional", type: "input" },
      ]} extra={{ language }} />}
      {tool === "translate" && <ToolBox tool="translate" title="Translate news" fields={[
        { key: "prompt", label: "Article text + target language", placeholder: "Paste article… → Hindi", type: "textarea", raw: true },
      ]} raw />}
    </div>
  );
}

type ToolField = { key: string; label: string; placeholder: string; type: "input"|"textarea"; coerce?: "csv"; raw?: boolean };
function ToolBox({ tool, title, fields, note, extra, raw }: { tool: string; title: string; fields: ToolField[]; note?: string; extra?: object; raw?: boolean }) {
  const [state, setState] = useState<Record<string, string>>({});
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const run = async () => {
    setLoading(true); setOut("");
    try {
      let content: string;
      if (raw) content = state["prompt"] ?? "";
      else {
        const payload: Record<string, unknown> = { ...(extra ?? {}) };
        fields.forEach((f) => {
          const v = state[f.key] ?? "";
          payload[f.key] = f.coerce === "csv" ? v.split(",").map((x) => x.trim()).filter(Boolean) : v;
        });
        content = JSON.stringify(payload);
      }
      const acc = await streamSam(tool, [{ role: "user", content }], setOut);
      setOut(acc);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  };
  return (
    <Glass className="p-4 space-y-3 animate-fade-up">
      <div className="font-display italic text-lg">{title}</div>
      {fields.map((f) => (
        <div key={f.key}>
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-1">{f.label}</div>
          {f.type === "textarea"
            ? <textarea value={state[f.key] ?? ""} onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder} rows={4}
                className="w-full rounded-2xl bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none focus:border-foreground/30" />
            : <input value={state[f.key] ?? ""} onChange={(e) => setState((s) => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none focus:border-foreground/30" />}
        </div>
      ))}
      <button onClick={run} disabled={loading} className="w-full rounded-full bg-foreground text-background text-sm py-2.5 disabled:opacity-60">
        {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Run with Sam"}
      </button>
      {note && <div className="text-[10px] italic text-foreground/60">{note}</div>}
      {out && <div className="rounded-2xl border border-foreground/10 bg-background/40 p-3 text-sm whitespace-pre-wrap">{out}</div>}
    </Glass>
  );
}

/* ============================================================
   Saved / Bookmarks / History
============================================================ */
function SavedTab({ store, setStore }: { store: State; setStore: React.Dispatch<React.SetStateAction<State>> }) {
  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Bookmark className="h-5 w-5" />} title="Saved & History" sub="Bookmarks, reading history, watchlists"
        accent="from-emerald-400/30 via-teal-300/20 to-cyan-300/20" />

      <Glass className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Watchlist</div>
        <div className="flex flex-wrap gap-1.5">
          {store.watchlist.map((w) => (
            <span key={w} className="inline-flex items-center gap-1 rounded-full bg-foreground/5 border border-foreground/10 px-2.5 py-1 text-[11px]">
              <Zap className="h-3 w-3 text-amber-500" /> {w}
              <button onClick={() => setStore((s) => ({ ...s, watchlist: s.watchlist.filter((x) => x !== w) }))} className="ml-1 opacity-60 hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
            </span>
          ))}
          <AddChip onAdd={(v) => setStore((s) => ({ ...s, watchlist: Array.from(new Set([...s.watchlist, v.toUpperCase()])) }))} />
        </div>
      </Glass>

      <Glass className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Bookmarks ({store.bookmarks.length})</div>
        {store.bookmarks.length === 0 ? <div className="text-sm text-foreground/60">Save stories from the feed and they'll appear here for offline reading.</div>
          : <div className="space-y-2">
              {store.bookmarks.map((b) => (
                <div key={b.id} className="rounded-2xl border border-foreground/10 bg-background/40 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-foreground/60">{b.source} · {b.category} · {new Date(b.savedAt).toLocaleDateString()}</div>
                  <div className="font-display italic text-sm mt-1">{b.title}</div>
                  <div className="text-[12px] text-foreground/70 mt-1">{b.body}</div>
                  <button onClick={() => setStore((s) => ({ ...s, bookmarks: s.bookmarks.filter((x) => x.id !== b.id) }))} className="mt-2 text-[11px] text-rose-500">Remove</button>
                </div>
              ))}
            </div>}
      </Glass>

      <Glass className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Reading history</div>
        {store.reading.length === 0 ? <div className="text-sm text-foreground/60">Articles you open will be listed here.</div>
          : <ul className="space-y-1.5 text-sm">
              {store.reading.map((r) => (
                <li key={`${r.id}-${r.at}`} className="flex items-center justify-between gap-2 border-b border-foreground/5 pb-1.5">
                  <span className="truncate">{r.title}</span>
                  <span className="text-[10px] text-foreground/50 shrink-0">{new Date(r.at).toLocaleString()}</span>
                </li>
              ))}
            </ul>}
      </Glass>
    </div>
  );
}
function AddChip({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  const [open, setOpen] = useState(false);
  if (!open) return <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-foreground/5 border border-dashed border-foreground/20 px-2.5 py-1 text-[11px]"><Plus className="h-3 w-3" /> add</button>;
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onAdd(v.trim()); setV(""); setOpen(false); } if (e.key === "Escape") setOpen(false); }} className="rounded-full bg-background border border-foreground/20 px-2 py-1 text-[11px] w-20 outline-none" placeholder="ticker" />
    </span>
  );
}

/* ============================================================
   Ask Sam (chat)
============================================================ */
function SamTab({ store, setStore }: { store: State; setStore: React.Dispatch<React.SetStateAction<State>> }) {
  const [msgs, setMsgs] = useState<Array<{ role: "user"|"assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const q = input.trim(); if (!q) return;
    const ctx = `Context: interests=${store.interests.join(",")}, region=${store.region}, profession=${store.profession}, language=${store.language}, watchlist=${store.watchlist.join(",")}.`;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs([...next, { role: "assistant" as const, content: "" }]);
    setInput(""); setLoading(true);
    try {
      const acc = await streamSam("chat", [{ role: "system", content: ctx }, ...next], (d) => {
        setMsgs((m) => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: d }; return copy; });
      });
      setMsgs((m) => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: acc }; return copy; });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Sam is unavailable"); }
    finally { setLoading(false); }
  };

  const quick = ["What's the biggest story today?", "Explain the Fed decision like I'm 12", "Give me a 1-minute markets brief", "Fact-check the top tech headline"];
  return (
    <div className="space-y-3 animate-fade-up">
      <GradientHeader icon={<Bot className="h-5 w-5" />} title="Ask Sam" sub="Personal news analyst, always on" accent="from-rose-400/30 via-fuchsia-300/20 to-indigo-300/20" />
      <Glass className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Personalization</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[11px]">Region <input value={store.region} onChange={(e) => setStore((s) => ({ ...s, region: e.target.value }))} className="mt-1 w-full rounded-full bg-background/60 border border-foreground/10 px-3 py-1.5 text-sm outline-none" /></label>
          <label className="text-[11px]">Profession <input value={store.profession} onChange={(e) => setStore((s) => ({ ...s, profession: e.target.value }))} className="mt-1 w-full rounded-full bg-background/60 border border-foreground/10 px-3 py-1.5 text-sm outline-none" /></label>
          <label className="text-[11px]">Language <input value={store.language} onChange={(e) => setStore((s) => ({ ...s, language: e.target.value }))} className="mt-1 w-full rounded-full bg-background/60 border border-foreground/10 px-3 py-1.5 text-sm outline-none" /></label>
        </div>
      </Glass>
      <Glass className="p-3 min-h-[240px] max-h-[54vh] overflow-y-auto space-y-2">
        {msgs.length === 0 && (
          <div className="space-y-2">
            {quick.map((q) => <button key={q} onClick={() => setInput(q)} className="w-full text-left rounded-2xl border border-foreground/10 bg-background/40 px-3 py-2 text-sm hover:bg-background/60"><Sparkles className="inline h-3.5 w-3.5 mr-1 text-rose-500" /> {q}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap", m.role === "user" ? "bg-foreground text-background" : "bg-background/60 border border-foreground/10")}>{m.content || <Loader2 className="h-4 w-4 animate-spin opacity-60" />}</div>
          </div>
        ))}
        <div ref={bottom} />
      </Glass>
      <div className="flex items-center gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && send()}
          placeholder="Ask about any news topic…"
          className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-4 py-3 text-sm outline-none focus:border-foreground/30" />
        <button onClick={send} disabled={loading} className="grid place-items-center h-11 w-11 rounded-full bg-foreground text-background disabled:opacity-60"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
