import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, TrendingUp, Briefcase, Building2, Wallet,
  Star, Users, Heart, Activity, Layers3, Send, Plus, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { SamOrb } from "@/components/samsta/SamOrb";
import { streamSam } from "@/lib/stream-sam";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/future")({ component: FutureSimulator });

type ModeKey =
  | "social" | "career" | "business" | "finance" | "brand"
  | "network" | "decision" | "health" | "compare";

type Mode = {
  key: ModeKey;
  title: string;
  tagline: string;
  placeholder: string;
  icon: React.ReactNode;
  accent: string;
  tint: string;
};

const MODES: Mode[] = [
  { key: "social", title: "Social Success",
    tagline: "Predict reach, likes, virality before you post",
    placeholder: "Describe the post: format, caption, hook, timing…",
    icon: <TrendingUp className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))",
    tint: "oklch(0.94 0.06 20)" },
  { key: "career", title: "Career",
    tagline: "Salary, promotion, roadmap over 5 years",
    placeholder: "Your role, skills, years, target company or role…",
    icon: <Briefcase className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.85 0.11 55), oklch(0.8 0.12 40))",
    tint: "oklch(0.95 0.05 55)" },
  { key: "business", title: "Business Growth",
    tagline: "Revenue, churn, ROI, demand",
    placeholder: "Product, price, channel, monthly spend, market…",
    icon: <Building2 className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))",
    tint: "oklch(0.93 0.04 250)" },
  { key: "finance", title: "Financial Future",
    tagline: "Savings, investments, wealth in 10 years",
    placeholder: "Income, savings/month, debts, goals…",
    icon: <Wallet className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.82 0.09 130), oklch(0.78 0.11 110))",
    tint: "oklch(0.94 0.04 125)" },
  { key: "brand", title: "Personal Brand",
    tagline: "Trust, influence, content quality",
    placeholder: "Handle, niche, current followers, tone…",
    icon: <Star className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.86 0.09 80), oklch(0.82 0.1 60))",
    tint: "oklch(0.96 0.04 75)" },
  { key: "network", title: "Network & Relationships",
    tagline: "Who to connect with, collab success",
    placeholder: "Your goal, city, industry, current network…",
    icon: <Users className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.8 0.1 340), oklch(0.78 0.12 20))",
    tint: "oklch(0.94 0.05 340)" },
  { key: "decision", title: "Decision Simulator",
    tagline: "Stay vs leave · this vs that",
    placeholder: "Ask a decision, e.g. 'Should I leave my job for a startup?'",
    icon: <Heart className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.75 0.15 25), oklch(0.65 0.2 20))",
    tint: "oklch(0.94 0.05 25)" },
  { key: "health", title: "Health & Productivity",
    tagline: "Burnout risk, goal completion",
    placeholder: "Sleep hrs, exercise, study/work hrs, screen time…",
    icon: <Activity className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.8 0.08 200), oklch(0.76 0.1 220))",
    tint: "oklch(0.94 0.04 210)" },
  { key: "compare", title: "Multi-Scenario",
    tagline: "Compare 2–3 futures side by side",
    placeholder: "List your scenarios (one per line)…",
    icon: <Layers3 className="h-5 w-5" />,
    accent: "linear-gradient(135deg, oklch(0.78 0.11 160), oklch(0.72 0.13 180))",
    tint: "oklch(0.94 0.05 160)" },
];

function FutureSimulator() {
  const [active, setActive] = useState<ModeKey | null>(null);
  const mode = useMemo(() => MODES.find((m) => m.key === active) ?? null, [active]);

  return (
    <div className="relative min-h-screen overflow-hidden pb-24">
      {/* animated aurora background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 -left-20 h-[520px] w-[520px] rounded-full blur-3xl opacity-70 animate-aurora"
          style={{ background: "radial-gradient(circle, oklch(0.9 0.11 25 / 0.55), transparent 65%)" }} />
        <div className="absolute top-40 -right-32 h-[560px] w-[560px] rounded-full blur-3xl opacity-70 animate-drift"
          style={{ background: "radial-gradient(circle, oklch(0.88 0.09 260 / 0.45), transparent 65%)" }} />
        <div className="absolute bottom-0 left-1/4 h-[380px] w-[380px] rounded-full blur-3xl opacity-60 animate-aurora"
          style={{ background: "radial-gradient(circle, oklch(0.9 0.09 130 / 0.4), transparent 65%)", animationDelay: "6s" }} />
      </div>

      {/* header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/sam" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-lg italic">Future Simulator</div>
          <div className="text-[11px] text-muted-foreground">See tomorrow before you post today</div>
        </div>
        <div className="relative">
          <SamOrb size={40} />
        </div>
      </header>

      {/* hero */}
      <section className="px-6 pt-4 pb-6 text-center animate-fade-up">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-widest text-muted-foreground">
          <Sparkles className="h-3 w-3" /> decision engine
        </div>
        <h1 className="mt-4 font-display text-4xl italic text-gradient leading-tight">
          Nine futures.<br/>One tap.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Career, business, money, brand, health — Sam forecasts the range so you can move with confidence.
        </p>
      </section>

      {/* mode grid */}
      <section className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m, i) => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className="glass group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.97] hover:-translate-y-0.5 animate-fade-up"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-100"
                style={{ background: m.tint }} />
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: "linear-gradient(120deg, transparent 40%, oklch(1 0 0 / 0.35) 50%, transparent 60%)", backgroundSize: "200% 100%", animation: "shine 2.4s linear infinite" }} />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: m.accent }}>{m.icon}</div>
              <div className="relative">
                <div className="font-display text-lg leading-tight italic">{m.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{m.tagline}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {mode && (
        <SimSheet mode={mode} onClose={() => setActive(null)} />
      )}
    </div>
  );
}

/* ---------- Simulation sheet ---------- */

function SimSheet({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const isCompare = mode.key === "compare";
  const [input, setInput] = useState("");
  const [scenarios, setScenarios] = useState<string[]>(["", ""]);
  const [result, setResult] = useState("");
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight, behavior: "smooth" });
  }, [result]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function run() {
    let userText = "";
    if (isCompare) {
      const cleaned = scenarios.map((s, i) => `Scenario ${String.fromCharCode(65 + i)}: ${s.trim()}`).filter((s) => s.split(": ")[1]);
      if (cleaned.length < 2) { toast.error("Add at least 2 scenarios"); return; }
      userText = cleaned.join("\n");
    } else {
      if (!input.trim()) { toast.error("Describe your scenario"); return; }
      userText = `Category: ${mode.title}\n${input.trim()}`;
    }
    setResult("");
    setRunning(true);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      await streamSam(
        isCompare ? "future_compare" : "future_sim",
        [{ role: "user", content: userText }],
        (acc) => setResult(acc),
        ac.signal,
      );
    } catch (e) {
      if (!ac.signal.aborted) toast.error(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-up"
      onClick={onClose}>
      <div
        className="glass-strong relative flex h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60 backdrop-blur">
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 px-5 pt-4 pb-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: mode.accent }}>{mode.icon}</div>
          <div>
            <div className="font-display text-lg italic leading-tight">{mode.title}</div>
            <div className="text-[11px] text-muted-foreground">{mode.tagline}</div>
          </div>
        </div>

        {/* input */}
        <div className="px-4">
          {isCompare ? (
            <div className="flex flex-col gap-2">
              {scenarios.map((s, i) => (
                <div key={i} className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold text-white"
                    style={{ background: mode.accent }}>{String.fromCharCode(65 + i)}</span>
                  <input
                    value={s}
                    onChange={(e) => setScenarios((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))}
                    placeholder={i === 0 ? "MBA · current job · investment" : i === 1 ? "Startup· learning· move abroad" : "Government job · side business"}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                  />
                  {scenarios.length > 2 && (
                    <button onClick={() => setScenarios((arr) => arr.filter((_, j) => j !== i))} aria-label="Remove">
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              {scenarios.length < 3 && (
                <button onClick={() => setScenarios((a) => [...a, ""])}
                  className="glass flex items-center justify-center gap-1.5 rounded-2xl py-2 text-xs text-muted-foreground">
                  <Plus className="h-3.5 w-3.5" /> Add scenario C
                </button>
              )}
            </div>
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder={mode.placeholder}
              className="glass w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70"
            />
          )}

          <button
            onClick={run}
            disabled={running}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-white shadow-lg transition active:scale-[0.98] disabled:opacity-70"
            style={{ background: mode.accent }}
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {running ? "Simulating…" : "Simulate future"}
          </button>
        </div>

        {/* result */}
        <div ref={outRef} className="mt-4 flex-1 overflow-y-auto px-5 pb-8">
          {!result && !running && (
            <div className="mt-8 flex flex-col items-center text-center animate-fade-up">
              <SamOrb size={110} />
              <p className="mt-4 max-w-[280px] text-xs text-muted-foreground">
                Sam will forecast ranges, probability, and next moves.
                Estimates — not guarantees.
              </p>
            </div>
          )}
          {(result || running) && (
            <div className="relative">
              {running && !result && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" style={{ animationDelay: "0.2s" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" style={{ animationDelay: "0.4s" }} />
                  </div>
                  Consulting the future…
                </div>
              )}
              <article className="prose-editorial whitespace-pre-wrap text-[13.5px] leading-relaxed">
                <FormattedResult text={result} />
              </article>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* light markdown-ish formatter: bold, italic, bullets */
function FormattedResult({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        // heading (**Text**)
        const m = line.match(/^\*\*(.+?)\*\*$/);
        if (m) {
          return (
            <div key={i} className="mt-4 first:mt-0 font-display text-base italic text-gradient">
              {m[1]}
            </div>
          );
        }
        if (line.startsWith("- ")) {
          return (
            <div key={i} className="mt-1 flex gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
              <span>{renderInline(line.slice(2))}</span>
            </div>
          );
        }
        if (/^\d+\.\s/.test(line)) {
          const [n, ...rest] = line.split(". ");
          return (
            <div key={i} className="mt-1.5 flex gap-2">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}>{n}</span>
              <span>{renderInline(rest.join(". "))}</span>
            </div>
          );
        }
        if (/^_.+_$/.test(line)) {
          return <div key={i} className="mt-4 text-[11px] italic text-muted-foreground">{line.slice(1, -1)}</div>;
        }
        if (!line) return <div key={i} className="h-1" />;
        return <div key={i} className="mt-1">{renderInline(line)}</div>;
      })}
    </>
  );
}

function renderInline(t: string) {
  const parts = t.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  );
}

/* util unused-import guard */
export const _guard = cn;
