// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, Loader2, X, BookOpen, Layers, NotebookPen, Brain, BarChart3,
  CalendarDays, Target, FileDown, Video, HelpCircle, AlertTriangle, Trophy, Timer,
  Bell, Check, Plus, Trash2, Flame, ExternalLink, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { streamSam } from "@/lib/stream-sam";
import { RichText } from "@/components/samsta/jee/RichText";
import { useReminders } from "@/components/samsta/jee/useReminders";
import { allChapters, SYLLABUS } from "@/lib/jee-syllabus";
import {
  CK, DEFAULT_REMINDERS, EMPTY_PROGRESS, BOOKS, useStored, estimate, readLS, today,
  type GoalSetup, type MistakeEntry, type PlannerGoal, type ProgressState, type ReminderPrefs,
} from "@/lib/jee-coach";

export const Route = createFileRoute("/education/jee-coach")({
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "JEE Study Coach· Formula Library· Samsta" },
      { name: "description", content: "Set your JEE Main percentile and Advanced rank targets and get an adaptive roadmap, daily planner, weak-topic analysis, mistake notebook and progress tracking." },
      { property: "og:title", content: "JEE Study Coach· Samsta" },
      { property: "og:description", content: "Adaptive JEE roadmap, daily planner, mistake notebook, formula mastery and progress tracking— powered by Samsta." },
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
  pink: "linear-gradient(135deg, oklch(0.82 0.13 340), oklch(0.75 0.15 320))",
  teal: "linear-gradient(135deg, oklch(0.80 0.11 200), oklch(0.72 0.13 220))",
};

const TOTAL_CHAPTERS = allChapters().length;

function useSam() {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const run = async (prompt: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true); setOut("");
    try {
      return await streamSam("study-coach", [{ role: "user", content: prompt }], setOut, ctrl.signal);
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message || "Sam couldn't answer — try again");
      return "";
    } finally { setBusy(false); }
  };
  return { out, busy, run, setOut };
}

function goalLine(goal: GoalSetup | null) {
  if (!goal) return "The student has not set targets yet — assume a balanced JEE Main + Advanced aspirant.";
  return `Student targets — Exam: ${goal.exam}; Year: ${goal.year}; JEE Main percentile: ${goal.percentile}; Target marks: ${goal.marks}; JEE Advanced rank: ${goal.rank}; Study hours/day: ${goal.hours}; Current level: ${goal.level}.`;
}

function CoachPage() {
  const [goal, setGoal] = useStored<GoalSetup | null>(CK.goal, null);
  const [progress] = useStored<ProgressState>(CK.progress, EMPTY_PROGRESS);
  const [module, setModule] = useState<string | null>(null);
  const [wizard, setWizard] = useState(false);
  const est = useMemo(() => estimate(progress, TOTAL_CHAPTERS), [progress]);
  useReminders();

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
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">IIT JEE</div>
          <h1 className="truncate font-display text-lg italic leading-tight">Formula Library + Study Coach</h1>
        </div>
        <div className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold">
          <Flame className="h-3 w-3 text-orange-500" /> {progress.streak.count}d
        </div>
      </header>

      {/* Target hero */}
      <section className="px-4 pt-2">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="absolute -right-20 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl animate-aurora" style={{ background: G.violet }} />
          {goal ? (
            <div className="relative">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your target</div>
              <div className="font-display text-2xl italic leading-tight">
                {goal.exam === "both" ? "JEE Main + Advanced" : goal.exam === "main" ? "JEE Main" : "JEE Advanced"} {goal.year}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Percentile" value={goal.percentile} />
                <Stat label="Marks" value={goal.marks} />
                <Stat label="Advanced" value={goal.rank} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="Syllabus" value={`${est.coverage}%`} />
                <Stat label="Est. percentile" value={String(est.percentile)} />
                <Stat label="Est. AIR" value={est.air > 100000 ? "100k+" : String(est.air)} />
              </div>
              <button onClick={() => setWizard(true)} className="mt-3 w-full rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold hover:bg-muted">
                Edit targets
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="font-display text-2xl italic leading-tight">Set your JEE target</div>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/80">
                Tell Sam your exam, year, percentile, marks, Advanced rank and daily hours — then get a complete adaptive roadmap built around them.
              </p>
              <button onClick={() => setWizard(true)} className="mt-4 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
                Start goal setup →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Dashboard */}
      <section className="mt-5 px-4">
        <div className="mb-2 px-1 font-display text-lg italic">Your study command centre</div>
        <div className="grid grid-cols-2 gap-3">
          {MODULES.map((m) => (
            <button
              key={m.key}
              onClick={() => setModule(m.key)}
              className="glass group flex flex-col gap-2 rounded-3xl p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              <span className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md" style={{ background: m.gradient }}>
                <m.Icon className="h-5 w-5" />
              </span>
              <span className="text-[13px] font-bold leading-tight">{m.emoji} {m.title}</span>
              <span className="text-[10px] leading-snug text-muted-foreground">{m.hint}</span>
            </button>
          ))}
          <Link to="/education/jee/$toolKey" params={{ toolKey: "formulas" }}
            className="glass col-span-2 flex items-center gap-3 rounded-3xl p-4 transition hover:-translate-y-0.5 hover:shadow-xl">
            <span className="grid h-10 w-10 place-items-center rounded-2xl text-white shadow-md" style={{ background: G.violet }}>
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold">📚 Formula Library — all {TOTAL_CHAPTERS} chapters</span>
              <span className="block text-[10px] text-muted-foreground">5-page sheet, tables, derivations, traps, PYQ analysis, PDF</span>
            </span>
          </Link>
        </div>
      </section>

      {wizard && <GoalWizard initial={goal} onClose={() => setWizard(false)} onSave={(g) => { setGoal(g); setWizard(false); toast.success("Targets saved — building your roadmap"); setModule("roadmap"); }} />}
      {module && <ModuleSheet moduleKey={module} goal={goal} progress={progress} onClose={() => setModule(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card/70 p-2.5 text-center">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-extrabold">{value}</div>
    </div>
  );
}

const MODULES = [
  { key: "roadmap", title: "Roadmap", emoji: "🧭", hint: "Yearly → monthly → weekly → daily plan", Icon: Target, gradient: G.violet },
  { key: "planner", title: "Daily Planner", emoji: "📅", hint: "Today's chapters, formulas, PYQs, mock", Icon: CalendarDays, gradient: G.blue },
  { key: "goals", title: "Goal Planner", emoji: "🎯", hint: "Milestones with due dates + progress", Icon: Trophy, gradient: G.amber },
  { key: "weak", title: "Weak Topic Analysis", emoji: "🧠", hint: "Find leaks, fix concepts, retest", Icon: Brain, gradient: G.pink },
  { key: "progress", title: "Progress Dashboard", emoji: "📈", hint: "Mastery, streak, heatmap, est. rank", Icon: BarChart3, gradient: G.green },
  { key: "mistakes", title: "Mistake Notebook", emoji: "📝", hint: "Log every error and retest it", Icon: NotebookPen, gradient: G.teal },
  { key: "books", title: "Book & PDF Library", emoji: "📄", hint: "Official publisher and NCERT links", Icon: FileDown, gradient: G.amber },
  { key: "videos", title: "Concept Videos", emoji: "🎥", hint: "Best lectures per chapter", Icon: Video, gradient: G.pink },
  { key: "doubt", title: "Doubt Solver", emoji: "❓", hint: "Paste any doubt, get a full solution", Icon: HelpCircle, gradient: G.blue },
  { key: "strategy", title: "Main vs Advanced", emoji: "🏆", hint: "Strategy split for both papers", Icon: Trophy, gradient: G.violet },
  { key: "countdown", title: "Exam Countdown", emoji: "🔥", hint: "Days left + sprint plan", Icon: Timer, gradient: G.amber },
  { key: "flashcards", title: "Flashcard Mastery", emoji: "🧠", hint: "Spaced repetition on formulas", Icon: Layers, gradient: G.teal },
  { key: "reminders", title: "Reminders", emoji: "🔔", hint: "Study, revision, mock, sleep, water", Icon: Bell, gradient: G.green },
  { key: "mentor", title: "Samsta Mentor", emoji: "🤝", hint: "Next best topic, adaptive plan", Icon: Sparkles, gradient: G.violet },
];

// ---------------- Goal wizard ----------------
const YEARS = ["2027", "2028", "2029"];
const PERCENTILES = ["95", "97", "98", "99", "99.5", "99.9"];
const MARKS = ["100", "150", "180", "220", "250", "280", "300"];
const RANKS = ["AIR 1", "AIR 10", "AIR 50", "AIR 100", "AIR 500", "AIR 1000", "AIR 5000"];
const LEVELS = ["weak", "average", "good", "excellent"] as const;

function GoalWizard({ initial, onClose, onSave }: { initial: GoalSetup | null; onClose: () => void; onSave: (g: GoalSetup) => void }) {
  const [g, setG] = useState<GoalSetup>(initial ?? {
    exam: "both", year: "2027", percentile: "99", marks: "220", rank: "AIR 500", hours: 6, level: "average", savedAt: Date.now(),
  });
  const set = (patch: Partial<GoalSetup>) => setG((p) => ({ ...p, ...patch }));

  return (
    <Sheet title="Goal setup" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Target exam">
          <Chips options={[["main", "JEE Main"], ["advanced", "JEE Advanced"], ["both", "Both"]]} value={g.exam} onChange={(v) => set({ exam: v as any })} />
        </Field>
        <Field label="Target year"><Chips options={YEARS.map((y) => [y, y])} value={g.year} onChange={(v) => set({ year: v })} /></Field>
        <Field label="Target JEE Main percentile"><Chips options={PERCENTILES.map((y) => [y, y])} value={g.percentile} onChange={(v) => set({ percentile: v })} /></Field>
        <Field label="Target marks"><Chips options={MARKS.map((y) => [y, y])} value={g.marks} onChange={(v) => set({ marks: v })} /></Field>
        <Field label="Target JEE Advanced rank"><Chips options={RANKS.map((y) => [y, y])} value={g.rank} onChange={(v) => set({ rank: v })} /></Field>
        <Field label={`Study hours per day — ${g.hours}h`}>
          <input type="range" min={2} max={14} value={g.hours} onChange={(e) => set({ hours: Number(e.target.value) })} className="w-full accent-primary" />
        </Field>
        <Field label="Current preparation level">
          <Chips options={LEVELS.map((l) => [l, l[0].toUpperCase() + l.slice(1)])} value={g.level} onChange={(v) => set({ level: v as any })} />
        </Field>
        <button onClick={() => onSave({ ...g, savedAt: Date.now() })} className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
          Save targets & generate roadmap
        </button>
      </div>
    </Sheet>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Chips({ options, value, onChange }: { options: Array<[string, string]>; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${value === v ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------- Module sheet ----------------
function Sheet({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-strong max-h-[90vh] w-full max-w-lg animate-scale-in overflow-y-auto rounded-t-3xl p-5 pb-24" onClick={(e) => e.stopPropagation()}>
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

function ModuleSheet({ moduleKey, goal, progress, onClose }: any) {
  const m = MODULES.find((x) => x.key === moduleKey)!;
  return (
    <Sheet title={`${m.emoji} ${m.title}`} onClose={onClose}>
      {moduleKey === "mistakes" ? <MistakeNotebook /> :
       moduleKey === "goals" ? <GoalPlanner /> :
       moduleKey === "books" ? <BookLibrary /> :
       moduleKey === "reminders" ? <Reminders /> :
       moduleKey === "progress" ? <ProgressDashboard progress={progress} goal={goal} /> :
       <AiModule moduleKey={moduleKey} goal={goal} progress={progress} />}
    </Sheet>
  );
}

// ---------------- AI-backed modules ----------------
function AiModule({ moduleKey, goal, progress }: any) {
  const { out, busy, run } = useSam();
  const [input, setInput] = useState("");
  const studied = Object.entries(progress.studied || {});
  const weakest = studied.filter(([, v]) => (v as number) < 50).slice(0, 8).map(([k]) => k.split(":")[1]).join(", ") || "not tracked yet";
  const done = studied.filter(([, v]) => (v as number) >= 80).map(([k]) => k.split(":")[1]).slice(0, 12).join(", ") || "none yet";
  const ctx = `${goalLine(goal)}\nChapters opened: ${studied.length}/${TOTAL_CHAPTERS}. Mastered: ${done}. Weak: ${weakest}. Streak: ${progress.streak?.count ?? 0} days.`;

  const PROMPTS: Record<string, string> = {
    roadmap: `${ctx}\nBuild a complete JEE roadmap to hit these exact targets. Sections: Reality check, Yearly plan, Monthly plan (next 6 months), Weekly template, Daily template with the student's hours, Revision loops (30/15/7/3 day), Mock test cadence, Sleep + break schedule, Productivity score system, and a short honest motivation note.`,
    planner: `${ctx}\nGenerate TODAY's smart study plan (${today()}). Sections: Today's goals, Today's chapters, Today's formulas to revise, Today's revision, Today's PYQs, Today's mock, Today's mistakes to re-attempt, and a completion checklist with time blocks that fit the student's daily hours.`,
    weak: `${ctx}\nRun a weak topic analysis. Identify the 6 weakest areas with root cause (concept / speed / accuracy / revision gap), then give priority chapters, formula revision list, extra question targets, video topics and book chapters. End with a 14-day fix plan and a retest checkpoint.`,
    videos: `${ctx}\nRecommend concept video playlists and creators for the student's weakest chapters (Physics, Chemistry, Maths). For each: what to watch, why, approximate length and what to do right after watching. Do not invent exact URLs — name the creator and the playlist.`,
    doubt: `${ctx}\nSolve this JEE doubt like a patient 1:1 tutor — concept, formula, step-by-step solution, the shortcut method, and the trap to avoid:\n\n"""${input}"""`,
    strategy: `${ctx}\nGive a JEE Main vs JEE Advanced strategy split: mindset difference, question style, chapter weightage differences, time management, attempt strategy, negative-marking policy, and a week-by-week hybrid plan that prepares for both.`,
    countdown: `${ctx}\nAssume the JEE Main ${goal?.year ?? "2027"} session is the target. Compute roughly how much time is left, then give a sprint plan: phase breakdown, weekly themes, mock cadence, revision calendar and the checkpoints that decide whether the target is on track.`,
    flashcards: `${ctx}\nCreate 20 spaced-repetition flashcards on the student's weakest chapters. Format each as "Q: ... " then "A: ..." on the next line, ordered easy to hard, mixing formula recall, unit checks and trap-spotting.`,
    mentor: `${ctx}\nAct as Samsta, the student's personal JEE mentor. Give: (1) the single next best topic to study right now and why, (2) what to revise today based on forgetting curves, (3) how to adapt if study days were missed, (4) a milestone check against the target rank, (5) one short line of real motivation.`,
  };

  useEffect(() => { if (moduleKey !== "doubt") run(PROMPTS[moduleKey]); /* eslint-disable-next-line */ }, [moduleKey]);

  return (
    <div className="space-y-3">
      {moduleKey === "doubt" && (
        <>
          <textarea
            value={input} onChange={(e) => setInput(e.target.value)} rows={4}
            placeholder="Paste your question or describe where you're stuck…"
            className="w-full rounded-2xl border border-border/60 bg-card/60 p-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => input.trim() ? run(PROMPTS.doubt) : toast.error("Type your doubt first")} disabled={busy}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {busy ? "Solving…" : "Solve my doubt"}
          </button>
        </>
      )}
      {busy && !out && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Sam is thinking…</div>}
      <RichText text={out} />
      {!!out && !busy && (
        <button onClick={() => run(PROMPTS[moduleKey])} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold hover:bg-muted">
          <RefreshCw className="h-3.5 w-3.5" /> Regenerate
        </button>
      )}
    </div>
  );
}

// ---------------- Mistake notebook ----------------
function MistakeNotebook() {
  const [list, setList] = useStored<MistakeEntry[]>(CK.mistakes, []);
  const [form, setForm] = useState({ subject: "Physics", chapter: "", question: "", mistakeType: "Concept", fix: "" });

  const add = () => {
    if (!form.chapter.trim() || !form.question.trim()) { toast.error("Add the chapter and what went wrong"); return; }
    setList((l) => [{ id: crypto.randomUUID(), ...form, retested: false, at: Date.now() }, ...l]);
    setForm({ ...form, chapter: "", question: "", fix: "" });
    toast.success("Mistake logged");
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
        <Chips options={Object.keys(BOOKS).map((s) => [s, s])} value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} />
        <input value={form.chapter} onChange={(e) => setForm({ ...form, chapter: e.target.value })} placeholder="Chapter"
          className="mt-2 w-full rounded-xl bg-muted/60 px-3 py-2 text-sm outline-none" />
        <input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question / what went wrong"
          className="mt-2 w-full rounded-xl bg-muted/60 px-3 py-2 text-sm outline-none" />
        <div className="mt-2"><Chips options={[["Concept", "Concept"], ["Sign", "Sign"], ["Unit", "Unit"], ["Calculation", "Calculation"], ["Silly", "Silly"], ["Time", "Time"]]} value={form.mistakeType} onChange={(v) => setForm({ ...form, mistakeType: v })} /></div>
        <input value={form.fix} onChange={(e) => setForm({ ...form, fix: e.target.value })} placeholder="Fix action"
          className="mt-2 w-full rounded-xl bg-muted/60 px-3 py-2 text-sm outline-none" />
        <button onClick={add} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground">
          <Plus className="h-3.5 w-3.5" /> Log mistake
        </button>
      </div>

      {!list.length && <p className="py-4 text-center text-xs text-muted-foreground">No mistakes logged yet — log them and Sam will build retests around them.</p>}
      {list.map((m) => (
        <div key={m.id} className="rounded-2xl border border-border/60 bg-card/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold">{m.subject} · {m.chapter}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{m.question}</p>
              {!!m.fix && <p className="mt-1 text-[11px] text-emerald-600">Fix: {m.fix}</p>}
            </div>
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-600">{m.mistakeType}</span>
          </div>
          <div className="mt-2 flex gap-2">
            <button onClick={() => setList((l) => l.map((x) => x.id === m.id ? { ...x, retested: !x.retested } : x))}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold ${m.retested ? "bg-emerald-500/15 text-emerald-600" : "bg-muted/60"}`}>
              <Check className="h-3 w-3" /> {m.retested ? "Retested" : "Mark retested"}
            </button>
            <button onClick={() => setList((l) => l.filter((x) => x.id !== m.id))} aria-label="Delete"
              className="grid h-8 w-8 place-items-center rounded-xl bg-muted/60 hover:bg-muted"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- Goal planner ----------------
function GoalPlanner() {
  const [goals, setGoals] = useStored<PlannerGoal[]>(CK.goals, []);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(today());

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone — e.g. Finish Rotational Motion + 60 PYQs"
          className="w-full rounded-xl bg-muted/60 px-3 py-2 text-sm outline-none" />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-2 w-full rounded-xl bg-muted/60 px-3 py-2 text-sm outline-none" />
        <button
          onClick={() => { if (!title.trim()) return toast.error("Name the milestone"); setGoals((g) => [{ id: crypto.randomUUID(), title, due, done: false, at: Date.now() }, ...g]); setTitle(""); }}
          className="mt-3 w-full rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground">Add milestone</button>
      </div>
      {!goals.length && <p className="py-4 text-center text-xs text-muted-foreground">No milestones yet.</p>}
      {goals.map((g) => (
        <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3">
          <button onClick={() => setGoals((l) => l.map((x) => x.id === g.id ? { ...x, done: !x.done } : x))}
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${g.done ? "bg-emerald-500 text-white" : "bg-muted"}`}>
            <Check className="h-3.5 w-3.5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-semibold ${g.done ? "line-through opacity-60" : ""}`}>{g.title}</p>
            <p className="text-[10px] text-muted-foreground">Due {g.due}</p>
          </div>
          <button onClick={() => setGoals((l) => l.filter((x) => x.id !== g.id))} aria-label="Delete"
            className="grid h-8 w-8 place-items-center rounded-xl bg-muted/60"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
  );
}

// ---------------- Book library ----------------
function BookLibrary() {
  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Samsta never hosts copyrighted PDFs. These are official publisher, author and NCERT pages — plus your own uploaded notes in the Study workspace.
      </p>
      {Object.entries(BOOKS).map(([subject, books]) => (
        <div key={subject}>
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{subject}</p>
          <div className="space-y-2">
            {books.map((b) => (
              <a key={b.title} href={b.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{b.title}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{b.author} · {b.note}</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </div>
      ))}
      <Link to="/education/study/$exam" params={{ exam: "jee" }} className="block rounded-2xl bg-muted/60 py-3 text-center text-xs font-semibold hover:bg-muted">
        Upload your own notes & PDFs →
      </Link>
    </div>
  );
}

// ---------------- Reminders ----------------
const REMINDER_LABELS: Record<string, string> = {
  study: "Study reminder", revision: "Revision reminder", mock: "Mock test reminder",
  pyq: "PYQ reminder", sleep: "Sleep reminder", water: "Water reminder", break: "Break reminder",
};

function Reminders() {
  const [prefs, setPrefs] = useStored<ReminderPrefs>(CK.reminders, DEFAULT_REMINDERS);
  return (
    <div className="space-y-2">
      <p className="rounded-2xl bg-muted/50 p-3 text-[11px] text-muted-foreground">
        Reminders fire as in-app nudges while Samsta is open. Allow notifications for alerts outside the tab.
      </p>
      <button
        onClick={async () => {
          if (!("Notification" in window)) return toast.error("This browser has no notifications");
          const p = await Notification.requestPermission();
          toast[p === "granted" ? "success" : "error"](p === "granted" ? "Notifications enabled" : "Notifications blocked");
        }}
        className="w-full rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold hover:bg-muted">Enable notifications</button>
      {Object.entries(REMINDER_LABELS).map(([key, label]) => {
        const p = prefs[key] ?? { on: false, at: "18:00" };
        return (
          <div key={key} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/60 p-3">
            <Bell className={`h-4 w-4 ${p.on ? "text-primary" : "text-muted-foreground"}`} />
            <span className="flex-1 text-xs font-semibold">{label}</span>
            <input type="time" value={p.at} onChange={(e) => setPrefs((s) => ({ ...s, [key]: { ...p, at: e.target.value } }))}
              className="rounded-lg bg-muted/60 px-2 py-1 text-[11px] outline-none" />
            <button onClick={() => setPrefs((s) => ({ ...s, [key]: { ...p, on: !p.on } }))}
              className={`h-6 w-11 rounded-full p-0.5 transition ${p.on ? "bg-primary" : "bg-muted"}`}>
              <span className={`block h-5 w-5 rounded-full bg-background transition-transform ${p.on ? "translate-x-5" : ""}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- Progress dashboard ----------------
function ProgressDashboard({ progress, goal }: { progress: ProgressState; goal: GoalSetup | null }) {
  const est = estimate(progress, TOTAL_CHAPTERS);
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(Date.now() - (27 - i) * 86_400_000).toISOString().slice(0, 10);
    return { d, min: progress.minutes?.[d] ?? 0 };
  });
  const max = Math.max(60, ...days.map((x) => x.min));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Syllabus coverage" value={`${est.coverage}%`} />
        <Stat label="Formula mastery" value={`${est.mastery}%`} />
        <Stat label="Chapters mastered" value={`${est.mastered}/${TOTAL_CHAPTERS}`} />
        <Stat label="Study streak" value={`${progress.streak?.count ?? 0} days`} />
        <Stat label="Est. percentile" value={String(est.percentile)} />
        <Stat label="Est. Advanced AIR" value={est.air > 100000 ? "100k+" : String(est.air)} />
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Last 28 days</p>
        <div className="flex items-end gap-1 rounded-2xl border border-border/60 bg-card/60 p-3">
          {days.map((x) => (
            <span key={x.d} title={`${x.d}: ${x.min} min`}
              className="flex-1 rounded-t-sm bg-primary/70"
              style={{ height: `${Math.max(3, (x.min / max) * 64)}px`, opacity: x.min ? 1 : 0.25 }} />
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Subject progress</p>
        <div className="space-y-2">
          {(Object.keys(SYLLABUS) as Array<keyof typeof SYLLABUS>).map((s) => {
            const chs = SYLLABUS[s].chapters;
            const total = chs.length * 100;
            const got = chs.reduce((acc, c) => acc + (progress.studied?.[`${s}:${c.name}`] ?? 0), 0);
            const pct = Math.round((got / total) * 100);
            return (
              <div key={s} className="rounded-2xl border border-border/60 bg-card/60 p-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
                  <span>{SYLLABUS[s].name}</span><span className="text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: G.violet }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="rounded-2xl bg-muted/50 p-3 text-[11px] leading-relaxed text-muted-foreground">
        Estimates are indicative and improve as you study chapters, revise formulas and log mock results
        {goal ? ` against your ${goal.rank} / ${goal.percentile} percentile target.` : "."}
      </p>
    </div>
  );
}
