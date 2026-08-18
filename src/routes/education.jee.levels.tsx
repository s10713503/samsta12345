// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Lock, Check, Loader2, X, BookOpen, ExternalLink, Sparkles,
  Timer, Trophy, RefreshCw, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { streamSam } from "@/lib/stream-sam";
import { RichText } from "@/components/samsta/jee/RichText";
import {
  PHYSICS_LEVELS, PATTERNS, TRACKS, bestMarks, levelPrompt, parseQuestions,
  recordAttempt, scoreToMarks, testPrompt, useLevelState, type PhysicsLevel,
} from "@/lib/physics-levels";

export const Route = createFileRoute("/education/jee/levels")({
  component: LevelsPage,
  head: () => ({
    meta: [
      { title: "Physics Level Ladder 0–19 · JEE to Olympiad · Samsta" },
      { name: "description", content: "Climb a 20-level physics roadmap from NCERT to Olympiad. Samsta teaches each level, then tests you on the real JEE Main (300) and Advanced (360) patterns — clear the cut-off to unlock the next level." },
      { property: "og:title", content: "Physics Level Ladder 0–19 · Samsta" },
      { property: "og:description", content: "NCERT to Olympiad in 20 gated levels with Samsta's own level tests and automatic unlocks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const G = {
  violet: "linear-gradient(135deg, oklch(0.78 0.14 300), oklch(0.70 0.16 280))",
  blue: "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.72 0.14 280))",
  green: "linear-gradient(135deg, oklch(0.80 0.13 150), oklch(0.72 0.15 130))",
  amber: "linear-gradient(135deg, oklch(0.86 0.14 80), oklch(0.78 0.16 60))",
};

function tierGradient(level: number) {
  if (level <= 3) return G.green;
  if (level <= 7) return G.blue;
  if (level <= 9) return G.amber;
  return G.violet;
}

function LevelsPage() {
  const [state, setState, ready] = useLevelState();
  const [open, setOpen] = useState<PhysicsLevel | null>(null);
  const current = PHYSICS_LEVELS[Math.min(state.unlocked, 19)];

  return (
    <div className="min-h-screen pb-28" style={{
      background: "radial-gradient(1000px 600px at 10% -10%, oklch(0.94 0.06 260 / 0.55), transparent 60%), radial-gradient(800px 500px at 100% 0%, oklch(0.93 0.07 20 / 0.5), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/education/$catKey" params={{ catKey: "jee" }} aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">IIT JEE · Physics</div>
          <h1 className="truncate font-display text-lg italic leading-tight">Level Ladder 0 → 19</h1>
        </div>
        <div className="glass rounded-full px-2.5 py-1 text-[10px] font-bold">L{state.unlocked}</div>
      </header>

      <section className="px-4 pt-2">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="absolute -right-20 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl animate-aurora" style={{ background: tierGradient(state.unlocked) }} />
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">You are here</div>
            <div className="font-display text-2xl italic leading-tight">Level {current.level} · {current.difficulty}</div>
            <p className="mt-1 text-[12px] text-foreground/80">{current.book} — {current.author}</p>
            <p className="mt-3 rounded-2xl bg-card/70 p-3 text-[11px] leading-relaxed text-muted-foreground">
              Study this level's content, then take Samsta's own level test. Clear the cut-off
              ({PATTERNS[current.pattern].passMarks}/{PATTERNS[current.pattern].totalMarks}) and Level {Math.min(19, current.level + 1)} unlocks automatically.
            </p>
            <button onClick={() => setOpen(current)} className="mt-3 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
              Continue Level {current.level} →
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 px-4">
        <div className="mb-2 px-1 font-display text-lg italic">Which levels you need</div>
        <div className="grid grid-cols-2 gap-2">
          {TRACKS.map((t) => (
            <div key={t.key} className="glass rounded-2xl p-3">
              <p className="text-[12px] font-bold leading-tight">{t.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{t.range}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round((state.unlocked / t.max) * 100))}%`, background: tierGradient(t.max) }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5 px-4">
        <div className="mb-2 px-1 font-display text-lg italic">The ladder</div>
        <div className="space-y-2.5">
          {PHYSICS_LEVELS.map((l) => {
            const locked = ready && l.level > state.unlocked;
            const best = bestMarks(state, l.level);
            const cleared = l.level < state.unlocked;
            return (
              <button key={l.level} disabled={locked} onClick={() => setOpen(l)}
                className={`glass flex w-full items-center gap-3 rounded-3xl p-4 text-left transition ${locked ? "opacity-55" : "hover:-translate-y-0.5 hover:shadow-xl"}`}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-extrabold text-white shadow-md" style={{ background: tierGradient(l.level) }}>
                  {locked ? <Lock className="h-4 w-4" /> : cleared ? <Check className="h-5 w-5" /> : l.level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[12px] font-extrabold">Level {l.level}</span>
                    <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">{l.difficulty}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold">{l.book}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {l.author}{best !== null ? ` · best ${best}/${PATTERNS[l.pattern].totalMarks}` : ` · ${PATTERNS[l.pattern].label}`}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </section>

      {open && <LevelSheet level={open} onClose={() => setOpen(null)} onState={setState} state={state} />}
    </div>
  );
}

function Sheet({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong max-h-[92vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-t-3xl p-5 pb-24" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg italic">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-muted/70 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LevelSheet({ level, state, onState, onClose }: any) {
  const [tab, setTab] = useState<"content" | "test">("content");
  const p = PATTERNS[level.pattern];
  return (
    <Sheet title={`Level ${level.level} · ${level.difficulty}`} onClose={onClose}>
      <div className="mb-3 flex gap-1.5">
        {(["content", "test"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-[11px] font-bold transition ${tab === t ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground"}`}>
            {t === "content" ? "📘 Content" : `🧪 Level test · ${p.totalMarks} marks`}
          </button>
        ))}
      </div>
      {tab === "content"
        ? <LevelContent level={level} state={state} onState={onState} />
        : <LevelTest level={level} onState={onState} />}
    </Sheet>
  );
}

function LevelContent({ level, state, onState }: any) {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const run = async () => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true); setOut("");
    try {
      await streamSam("physics-levels", [{ role: "user", content: levelPrompt(level) }], setOut, ctrl.signal);
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message || "Sam couldn't build this level — try again");
    } finally { setBusy(false); }
  };

  useEffect(() => { run(); return () => abort.current?.abort(); /* eslint-disable-next-line */ }, [level.level]);

  const done = !!state.contentDone?.[String(level.level)];

  return (
    <div className="space-y-3">
      <a href={level.url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3">
        <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold">{level.book}</span>
          <span className="block truncate text-[10px] text-muted-foreground">{level.author} · {level.note}</span>
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </a>

      {busy && !out && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Sam is writing Level {level.level} content…</div>}
      <RichText text={out} />

      {!!out && !busy && (
        <>
          <button onClick={() => onState((s: any) => ({ ...s, contentDone: { ...s.contentDone, [String(level.level)]: true } }))}
            className={`flex w-full items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-bold ${done ? "bg-emerald-500/15 text-emerald-600" : "bg-primary text-primary-foreground"}`}>
            <Check className="h-3.5 w-3.5" /> {done ? "Content completed" : "Mark content complete"}
          </button>
          <button onClick={run} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold hover:bg-muted">
            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
          </button>
        </>
      )}
    </div>
  );
}

function LevelTest({ level, onState }: any) {
  const p = PATTERNS[level.pattern];
  const [phase, setPhase] = useState<"idle" | "loading" | "paper" | "result">("idle");
  const [paper, setPaper] = useState(1);
  const [qs, setQs] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [papers, setPapers] = useState<Array<{ correct: number; wrong: number; questions: number }>>([]);
  const [left, setLeft] = useState(p.minutesPerPaper * 60);

  useEffect(() => {
    if (phase !== "paper") return;
    const id = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => { if (phase === "paper" && left === 0) submitPaper(); /* eslint-disable-next-line */ }, [left, phase]);

  const loadPaper = async (n: number) => {
    setPhase("loading"); setQs([]); setAnswers({});
    let raw = "";
    try {
      raw = await streamSam("physics-levels", [{ role: "user", content: testPrompt(level, n) }], () => {});
    } catch (e: any) {
      toast.error(e?.message || "Couldn't build the test — try again");
      setPhase("idle"); return;
    }
    const parsed = parseQuestions(raw);
    if (!parsed.length) { toast.error("Test generation failed — try again"); setPhase("idle"); return; }
    setQs(parsed); setPaper(n); setLeft(p.minutesPerPaper * 60); setPhase("paper");
  };

  const submitPaper = () => {
    let correct = 0, wrong = 0;
    qs.forEach((q, i) => {
      if (answers[i] === undefined) return;
      answers[i] === q.answer ? correct++ : wrong++;
    });
    const next = [...papers, { correct, wrong, questions: qs.length }];
    setPapers(next);
    if (paper < p.papers) { toast.success(`Paper ${paper} submitted — Paper ${paper + 1} next`); loadPaper(paper + 1); return; }

    const marks = next.reduce((sum, r) => sum + scoreToMarks(r.correct, r.wrong, r.questions, p.perPaperMarks), 0);
    const passed = marks >= p.passMarks;
    const s = recordAttempt({ level: level.level, pattern: level.pattern, marks, total: p.totalMarks, passed, at: Date.now() });
    onState(s);
    setPhase("result");
    toast[passed ? "success" : "error"](passed ? `Cleared! Level ${Math.min(19, level.level + 1)} unlocked` : `${marks}/${p.totalMarks} — need ${p.passMarks} to advance`);
  };

  const totals = papers.reduce((sum, r) => sum + scoreToMarks(r.correct, r.wrong, r.questions, p.perPaperMarks), 0);
  const mmss = useMemo(() => `${String(Math.floor(left / 3600)).padStart(2, "0")}:${String(Math.floor((left % 3600) / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`, [left]);

  if (phase === "idle") return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
        <p className="text-[12px] font-bold">{p.label}</p>
        <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
          <li>· {p.papers === 1 ? `1 paper · ${p.totalMarks} marks · 3 hours` : `Paper 1 + Paper 2 · ${p.perPaperMarks} marks each · 3 hours each`}</li>
          <li>· Marking: +4 correct, -1 wrong</li>
          <li>· Cut-off to unlock Level {Math.min(19, level.level + 1)}: {p.passMarks}/{p.totalMarks}</li>
          <li>· Difficulty locked to Level {level.level} ({level.difficulty})</li>
        </ul>
      </div>
      <button onClick={() => loadPaper(1)} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
        <Sparkles className="h-4 w-4" /> Start Samsta level test
      </button>
    </div>
  );

  if (phase === "loading") return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Samsta is setting Paper {paper}…
    </div>
  );

  if (phase === "result") {
    const passed = totals >= p.passMarks;
    return (
      <div className="space-y-3">
        <div className="rounded-3xl p-5 text-center text-white shadow-lg" style={{ background: passed ? G.green : G.amber }}>
          <Trophy className="mx-auto h-7 w-7" />
          <div className="mt-2 font-display text-3xl italic">{totals}/{p.totalMarks}</div>
          <p className="mt-1 text-[12px] font-semibold">
            {passed ? `Level ${Math.min(19, level.level + 1)} unlocked` : `Need ${p.passMarks} to unlock Level ${Math.min(19, level.level + 1)}`}
          </p>
        </div>
        <button onClick={() => { setPapers([]); setPhase("idle"); }} className="w-full rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold hover:bg-muted">
          Retake test
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-2xl bg-card/90 p-2.5 backdrop-blur">
        <Timer className="h-4 w-4 text-primary" />
        <span className="text-[12px] font-bold tabular-nums">{mmss}</span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          Paper {paper}/{p.papers} · {Object.keys(answers).length}/{qs.length} answered
        </span>
      </div>

      {qs.map((q, i) => (
        <div key={i} className="rounded-2xl border border-border/60 bg-card/60 p-3">
          <p className="text-[12px] font-semibold leading-relaxed">{i + 1}. {q.q}</p>
          <div className="mt-2 space-y-1.5">
            {q.choices.map((c: string, ci: number) => (
              <button key={ci} onClick={() => setAnswers((a) => ({ ...a, [i]: ci }))}
                className={`block w-full rounded-xl px-3 py-2 text-left text-[11.5px] transition ${answers[i] === ci ? "bg-primary text-primary-foreground font-semibold" : "bg-muted/60 hover:bg-muted"}`}>
                {String.fromCharCode(65 + ci)}. {c}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button onClick={submitPaper} className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
        Submit Paper {paper}{p.papers > 1 && paper < p.papers ? " & continue" : ""}
      </button>
    </div>
  );
}