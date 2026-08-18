import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, Wand2, Zap, Hash, Search, CalendarDays, Mic2, Users, Target,
  TrendingUp, Clock, Rocket, LineChart, Globe2, MessageCircle, Image as ImageIcon,
  Gauge, Copy, Check, RefreshCw, Send, Lock, ShieldCheck, Flame, Layers, Play, Lightbulb,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { usePremium } from "@/lib/premium";
import { useAuthUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistants/content-creator")({
  head: () => ({
    meta: [
      { title: "Creator Studio— Samsta" },
      { name: "description", content: "20+ creator tools: captions, hooks, scripts, reels, carousels, thumbnails, hashtags, SEO, calendar, viral prediction, engagement forecast, and more." },
    ],
  }),
  component: CreatorStudio,
});

const ACCENT = "linear-gradient(135deg, oklch(0.72 0.18 15) 0%, oklch(0.68 0.2 340) 50%, oklch(0.65 0.22 300) 100%)";
const GLASS = "backdrop-blur-2xl bg-white/[0.06] border border-white/10";

type ToolId =
  | "cc_caption" | "cc_hook" | "cc_script" | "cc_reel_plan" | "cc_carousel" | "cc_thumbnail"
  | "cc_hashtags" | "cc_seo" | "cc_calendar" | "cc_brand_voice" | "cc_audience" | "cc_competitors"
  | "cc_trending" | "cc_best_time" | "cc_viral" | "cc_engagement" | "cc_translate"
  | "cc_autoreply" | "cc_media_analysis" | "cc_score";

type Tool = {
  id: ToolId;
  label: string;
  desc: string;
  Icon: typeof Sparkles;
  group: "compose" | "grow" | "predict" | "intel";
  placeholder: string;
};

const TOOLS: Tool[] = [
  { id: "cc_caption",       label: "Caption Generator",   desc: "20+ styles", Icon: Sparkles,      group: "compose", placeholder: "Topic, product, or moment…" },
  { id: "cc_hook",          label: "Hook Generator",      desc: "Scroll-stoppers", Icon: Zap,      group: "compose", placeholder: "Your subject or angle…" },
  { id: "cc_script",        label: "Script Writer",       desc: "Beats + cues", Icon: Wand2,       group: "compose", placeholder: "Video topic + duration…" },
  { id: "cc_reel_plan",     label: "Reel Planner",        desc: "Shot list + audio", Icon: Play,  group: "compose", placeholder: "Reel concept + niche…" },
  { id: "cc_carousel",      label: "Carousel Creator",    desc: "7-slide flow", Icon: Layers,      group: "compose", placeholder: "Carousel topic…" },
  { id: "cc_thumbnail",     label: "Thumbnail Concepts",  desc: "3 covers", Icon: ImageIcon,       group: "compose", placeholder: "Video/post idea…" },
  { id: "cc_hashtags",      label: "Hashtag Intelligence", desc: "Tiered + avoid", Icon: Hash,    group: "grow",    placeholder: "Topic + niche…" },
  { id: "cc_seo",           label: "SEO Keywords",        desc: "Titles + meta", Icon: Search,    group: "grow",    placeholder: "Topic + platform…" },
  { id: "cc_calendar",      label: "Content Calendar",    desc: "7-day plan", Icon: CalendarDays,  group: "grow",    placeholder: "Niche + goal + posts/wk…" },
  { id: "cc_brand_voice",   label: "Brand Voice Learn",   desc: "From your captions", Icon: Mic2, group: "intel",   placeholder: "Paste 2–5 past captions…" },
  { id: "cc_audience",      label: "Audience Analysis",   desc: "Persona + pillars", Icon: Users, group: "intel",   placeholder: "Notes on your followers…" },
  { id: "cc_competitors",   label: "Competitor Insights", desc: "Gaps to exploit", Icon: Target,  group: "intel",   placeholder: "1–3 competitor handles…" },
  { id: "cc_trending",      label: "Trending Topics",     desc: "This week", Icon: Flame,          group: "intel",   placeholder: "Niche + region + platform…" },
  { id: "cc_best_time",     label: "Best Posting Time",   desc: "7-day grid", Icon: Clock,         group: "predict", placeholder: "Niche + timezone…" },
  { id: "cc_viral",         label: "Viral Prediction",    desc: "Score /100", Icon: Rocket,        group: "predict", placeholder: "Paste caption/hook/script…" },
  { id: "cc_engagement",    label: "Engagement Forecast", desc: "Reach ranges", Icon: LineChart,   group: "predict", placeholder: "Content + follower count…" },
  { id: "cc_translate",     label: "Multi-language",      desc: "Preserve tone", Icon: Globe2,     group: "grow",    placeholder: "Caption + target languages…" },
  { id: "cc_autoreply",     label: "Auto Reply",          desc: "DMs + comments", Icon: MessageCircle, group: "intel", placeholder: "Incoming message + type…" },
  { id: "cc_media_analysis",label: "Image/Video Analysis", desc: "Fix + boost", Icon: ImageIcon,  group: "intel",   placeholder: "Describe or link your post…" },
  { id: "cc_score",         label: "Content Score",       desc: "6-axis dashboard", Icon: Gauge,   group: "predict", placeholder: "Paste full content package…" },
];

const GROUPS = [
  { key: "compose", label: "Compose",   Icon: Wand2 },
  { key: "grow",    label: "Grow",      Icon: TrendingUp },
  { key: "predict", label: "Predict",   Icon: Rocket },
  { key: "intel",   label: "Intel",     Icon: BarChart3 },
] as const;

const STYLES = [
  "Editorial","Playful","Bold","Poetic","Luxury","Minimal","Storytelling","Gen-Z",
  "Professional","Inspirational","Funny","Romantic","Dramatic","Mysterious",
  "Aesthetic","Confident","Vulnerable","Data-driven","CTA-hard","Question-hook",
];

const LANGS = ["English","Hindi","Spanish","French","Portuguese","Arabic","German","Japanese","Korean","Indonesian"];

function CreatorStudio() {
  const { isPremium } = usePremium();
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const [active, setActive] = useState<ToolId>("cc_caption");
  const [group, setGroup] = useState<typeof GROUPS[number]["key"]>("compose");
  const [topic, setTopic] = useState("");
  const [niche, setNiche] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("cc_niche")) || "");
  const [audience, setAudience] = useState<string>(() => (typeof window !== "undefined" && localStorage.getItem("cc_audience")) || "");
  const [style, setStyle] = useState("Editorial");
  const [lang, setLang] = useState("English");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (niche) localStorage.setItem("cc_niche", niche); }, [niche]);
  useEffect(() => { if (audience) localStorage.setItem("cc_audience", audience); }, [audience]);
  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight, behavior: "smooth" }); }, [output]);

  const tool = useMemo(() => TOOLS.find((t) => t.id === active)!, [active]);
  const visible = useMemo(() => TOOLS.filter((t) => t.group === group), [group]);

  async function run() {
    const t = topic.trim();
    if (!t || streaming) return;
    if (!user) { toast.error("Sign in to personalize your studio"); navigate({ to: "/auth" }); return; }
    setOutput(""); setStreaming(true);
    const payload = {
      user_id: user.id,
      topic: t,
      niche: niche || "general creator",
      audience: audience || "engaged followers",
      brand_voice: style,
      language: lang,
      style,
    };
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: active,
          messages: [{ role: "user", content: "```json\n" + JSON.stringify(payload) + "\n```" }],
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `Request failed (${res.status})`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = ""; let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) { acc += delta; setOutput(acc); }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Studio couldn't respond");
    } finally { setStreaming(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(output); setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 1200); }
    catch { toast.error("Copy failed"); }
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#0a0710] text-white">
        <TopBar />
        <div className={cn("mx-4 mt-8 rounded-3xl p-6 text-center", GLASS)}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Lock className="h-6 w-6" />
          </div>
          <div className="mt-4 font-display text-2xl italic">Creator Studio is Premium</div>
          <p className="mt-2 text-xs text-white/60">20+ creator tools, analytics, and viral prediction.</p>
          <Link to="/premium" className="mt-5 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#0a0710]">Upgrade</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0710] pb-32 text-white">
      {/* Ambient bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]" style={{ background: "oklch(0.68 0.22 340)" }} />
        <div className="absolute top-40 -right-24 h-[340px] w-[340px] rounded-full opacity-20 blur-[100px]" style={{ background: "oklch(0.7 0.2 15)" }} />
        <div className="absolute bottom-0 -left-24 h-[380px] w-[380px] rounded-full opacity-25 blur-[110px]" style={{ background: "oklch(0.65 0.22 300)" }} />
      </div>

      <TopBar />

      {/* Hero */}
      <section className="relative z-10 px-4 pt-3">
        <div className={cn("relative overflow-hidden rounded-[28px] p-5 shadow-2xl", GLASS)} style={{ backgroundImage: ACCENT }}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              <Sparkles className="h-3 w-3" /> Creator Studio
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium backdrop-blur">
              <Zap className="h-3 w-3" /> Live streaming
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl italic leading-tight">Turn ideas into scroll-stopping content.</h1>
          <p className="mt-1 max-w-md text-[12.5px] text-white/85">
            20 premium tools, tuned to your niche, audience & voice. Real backend, real analytics.
          </p>

          {/* Studio analytics tiles */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Tools", value: "20" },
              { label: "Styles", value: "20+" },
              { label: "Languages", value: "10" },
              { label: "Live", value: "" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-black/25 p-2.5 text-center backdrop-blur">
                <div className="font-display text-lg italic leading-none">{s.value}</div>
                <div className="mt-1 text-[9px] uppercase tracking-wider text-white/70">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-black/30 px-3 py-2 backdrop-blur">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            <div className="text-[10.5px] leading-tight text-white/85">
              Personalized to <span className="font-medium">{user?.email ?? "your account"}</span> — niche & voice saved for future sessions.
            </div>
          </div>
        </div>
      </section>

      {/* Personalization strip */}
      <section className="relative z-10 mx-4 mt-4 rounded-3xl p-4 backdrop-blur-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="mb-2 flex items-center gap-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-300" />
          <div className="text-[11px] uppercase tracking-wider text-white/60">Your creator profile</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={niche} onChange={(e) => setNiche(e.target.value)}
            placeholder="Your niche (e.g. skincare)"
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
          />
          <input
            value={audience} onChange={(e) => setAudience(e.target.value)}
            placeholder="Audience (e.g. Gen-Z, India)"
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
          />
        </div>
        <div className="mt-2 flex gap-2">
          <select value={style} onChange={(e) => setStyle(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none">
            {STYLES.map((s) => <option key={s} value={s} className="bg-[#0a0710]">{s}</option>)}
          </select>
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none">
            {LANGS.map((l) => <option key={l} value={l} className="bg-[#0a0710]">{l}</option>)}
          </select>
        </div>
      </section>

      {/* Group tabs */}
      <section className="relative z-10 mt-5 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {GROUPS.map((g) => {
            const on = g.key === group;
            return (
              <button key={g.key} onClick={() => setGroup(g.key)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition",
                  on ? "bg-white text-[#0a0710]" : "border border-white/12 bg-white/[0.04] text-white/80")}>
                <g.Icon className="h-3.5 w-3.5" /> {g.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tool grid */}
      <section className="relative z-10 mt-3 grid grid-cols-2 gap-2.5 px-4">
        {visible.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-3 text-left backdrop-blur-2xl transition animate-fade-in active:scale-[0.98]",
                on
                  ? "border border-white/40 bg-white/[0.12] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.35)]"
                  : "border border-white/8 bg-white/[0.035] hover:border-white/20"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: on ? ACCENT : "rgba(255,255,255,0.08)" }}>
                  <t.Icon className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-semibold leading-tight">{t.label}</div>
                  <div className="truncate text-[10px] text-white/60">{t.desc}</div>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {/* Composer */}
      <section className={cn("relative z-10 mx-4 mt-5 rounded-3xl p-4", GLASS)}>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: ACCENT }}>
            <tool.Icon className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold leading-tight">{tool.label}</div>
            <div className="truncate text-[10.5px] text-white/60">{tool.desc}</div>
          </div>
        </div>
        <textarea
          rows={3}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
          placeholder={tool.placeholder}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
        />
        <button
          onClick={run}
          disabled={!topic.trim() || streaming}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-[#0a0710] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.6)] transition active:scale-[0.98] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #fff, #f6d5e1 60%, #f7c9a4)" }}
        >
          {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {streaming ? "Streaming…" : `Generate with ${tool.label}`}
        </button>
      </section>

      {/* Output */}
      <section className="relative z-10 mx-4 mt-4">
        <div ref={outRef} className={cn("max-h-[52vh] overflow-y-auto rounded-3xl p-4", GLASS)}>
          {output ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-white/95">{output}</div>
          ) : streaming ? (
            <div className="space-y-2">
              {[85, 60, 92, 45, 70].map((w, i) => (
                <div key={i} className="h-3 rounded-full" style={{
                  width: `${w}%`,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.25), rgba(255,255,255,0.08))",
                  backgroundSize: "200% 100%",
                  animation: "shine 1.6s linear infinite",
                  animationDelay: `${i * 0.12}s`,
                }} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: ACCENT }}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs text-white/60">Pick a tool, add a topic, and generate.</div>
            </div>
          )}
        </div>

        {output && !streaming && (
          <div className="mt-3 flex gap-2">
            <button onClick={copy} className={cn("flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium active:scale-[0.98]", GLASS)}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={run} className={cn("flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium active:scale-[0.98]", GLASS)}>
              <RefreshCw className="h-4 w-4" /> Regenerate
            </button>
          </div>
        )}
      </section>

      <style>{`@keyframes shine { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl" style={{ background: "linear-gradient(to bottom, rgba(10,7,16,0.85), transparent)" }}>
      <Link to="/assistants" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.05]">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: ACCENT }}>
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="font-display text-lg italic leading-tight"> Creator Studio</div>
        <div className="text-[11px] text-white/60">Premium · personalized · streaming</div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold tracking-wider text-[#f5e6b3]"
        style={{ background: "linear-gradient(135deg, #0a0a0a, #1a1a1a 60%, #2a2010)", border: "1px solid rgba(212,175,55,0.35)" }}>
        <Lock className="h-3 w-3" /> PRO
      </span>
    </header>
  );
}
