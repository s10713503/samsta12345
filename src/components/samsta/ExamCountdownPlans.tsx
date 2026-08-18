import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Rocket, Zap, Flame, Target, ClipboardList, CalendarDays, Heart, BarChart3,
  ChevronDown, Sparkles, Clock, Plus, Trash2, NotebookPen, Check, CircleDashed,
} from "lucide-react";
import PlanMediaVault from "@/components/samsta/PlanMediaVault";

export type PlanItem = { label: string; prompt: string };
export type PlanGroup = {
  key: string;
  title: string;
  subtitle: string;
  Icon: typeof Rocket;
  gradient: string;
  items: PlanItem[];
};

const G_ORANGE = "linear-gradient(135deg, oklch(0.84 0.14 45), oklch(0.74 0.16 22))";
const G_RED    = "linear-gradient(135deg, oklch(0.80 0.16 25), oklch(0.68 0.18 8))";
const G_AMBER  = "linear-gradient(135deg, oklch(0.88 0.14 85), oklch(0.78 0.16 55))";
const G_BLUE   = "linear-gradient(135deg, oklch(0.82 0.12 250), oklch(0.72 0.15 275))";
const G_TEAL   = "linear-gradient(135deg, oklch(0.82 0.11 200), oklch(0.72 0.13 220))";
const G_GREEN  = "linear-gradient(135deg, oklch(0.82 0.13 150), oklch(0.72 0.15 132))";
const G_PINK   = "linear-gradient(135deg, oklch(0.84 0.13 345), oklch(0.74 0.16 320))";
const G_VIOLET = "linear-gradient(135deg, oklch(0.80 0.14 300), oklch(0.70 0.16 278))";

const P = (s: string) => `You are Sam, an elite IIT JEE mentor. ${s} Be specific, structured, use tables/checklists, and keep it actionable for an Indian JEE aspirant.`;

export const PLAN_GROUPS: PlanGroup[] = [
  {
    key: "sprint-90", title: "90-Day Sprint Plan", subtitle: "Full 12-week roadmap", Icon: Rocket, gradient: G_ORANGE,
    items: [
      { label: "Goal Setup", prompt: P("Help me set up 90-day JEE goals: target score, target AIR, subject-wise mark targets and 5 measurable milestones.") },
      { label: "12-Week Roadmap", prompt: P("Build a 12-week JEE roadmap with a theme per week, chapters covered per subject, and buffer weeks.") },
      { label: "Daily Study Schedule", prompt: P("Create a detailed daily study schedule (hour-by-hour, 6-8 study hours) for the 90-day sprint including breaks and sleep.") },
      { label: "Weekly Targets", prompt: P("Define weekly targets for the 90-day sprint: chapters, PYQs, problems solved, and mocks per week.") },
      { label: "Monthly Review", prompt: P("Design a monthly review framework for the 3 months: metrics to check, questions to ask myself, and course-correction rules.") },
      { label: "Progress Tracker", prompt: P("Create a 90-day progress tracker template with daily/weekly columns and a scoring rubric.") },
      { label: "Revision Plan", prompt: P("Build the revision plan inside the 90-day sprint: 3 loops with spacing, chapter priority and time per loop.") },
      { label: "Mock Tests", prompt: P("Plan the mock-test cadence across 90 days: full/sectional/chapter mocks, dates, and analysis time after each.") },
    ],
  },
  {
    key: "crash-60", title: "60-Day Crash Plan", subtitle: "8-week high-intensity", Icon: Zap, gradient: G_RED,
    items: [
      { label: "8-Week Crash Schedule", prompt: P("Build an 8-week JEE crash schedule with week-wise subject allocation and non-negotiables.") },
      { label: "High-Weightage Topics", prompt: P("List the highest-weightage JEE topics per subject with average marks per topic and the order to attack them in 60 days.") },
      { label: "Daily Tasks", prompt: P("Generate a daily task template for the 60-day crash plan: theory, problems, PYQ, revision, error log.") },
      { label: "Weekly Tests", prompt: P("Design the weekly test plan for 8 weeks: syllabus per test, timing, and score targets.") },
      { label: "Revision Checkpoints", prompt: P("Define revision checkpoints across the 60 days (day 15/30/45/55) with exactly what to revise at each.") },
      { label: "Performance Tracker", prompt: P("Create a performance tracker for the crash plan tracking accuracy, speed, and syllabus coverage weekly.") },
    ],
  },
  {
    key: "push-30", title: "30-Day Final Push", subtitle: "Last-month execution", Icon: Flame, gradient: G_AMBER,
    items: [
      { label: "Final 30-Day Timetable", prompt: P("Build a day-by-day 30-day final push timetable before the JEE exam.") },
      { label: "Quick Revision Notes", prompt: P("Generate quick revision notes: key formulas, reactions and theorems per subject that must be memorised in the last 30 days.") },
      { label: "PYQs Plan", prompt: P("Create a previous-year-questions marathon plan for 30 days: which years, how many per day, and analysis method.") },
      { label: "Mock Exam Schedule", prompt: P("Design a 30-day mock exam schedule with real exam timings and rest days.") },
      { label: "Weak-Topic Revision", prompt: P("Give a weak-topic revision protocol for the last 30 days: how to pick, fix and retest weak topics fast.") },
      { label: "Exam-Day Checklist", prompt: P("Write a complete JEE exam-day checklist: documents, timing, food, mindset, question-attempt strategy.") },
    ],
  },
  {
    key: "daily-target", title: "Daily Target Setter", subtitle: "Win today", Icon: Target, gradient: G_BLUE,
    items: [
      { label: "Today's Goals", prompt: P("Ask my days remaining and weak subject, then set today's exact goals (topics + question counts).") },
      { label: "Study Hours Target", prompt: P("Recommend today's study-hours target with a split across Physics, Chemistry and Maths, plus focus-block structure.") },
      { label: "Task Checklist", prompt: P("Generate today's study task checklist with 8-10 checkbox items sized to fit the day.") },
      { label: "Priority Tasks", prompt: P("Rank today's tasks by priority using impact vs effort, and tell me the 3 must-dos.") },
      { label: "Completion Percentage", prompt: P("Ask what I completed today, then compute my completion percentage, streak impact and a one-line correction for tomorrow.") },
    ],
  },
  {
    key: "mock-schedule", title: "Mock Schedule", subtitle: "Test like the real thing", Icon: ClipboardList, gradient: G_TEAL,
    items: [
      { label: "Mock Test Calendar", prompt: P("Build a mock test calendar from today to the exam with dates, type of mock and syllabus.") },
      { label: "Subject-wise Mocks", prompt: P("Plan subject-wise sectional mocks for Physics, Chemistry and Maths with frequency and difficulty progression.") },
      { label: "Test Timer Strategy", prompt: P("Give a timing strategy for a 3-hour JEE paper: per-section time, per-question limits and when to skip.") },
      { label: "Score History", prompt: P("Create a score-history tracker template and explain how to read the trend for JEE readiness.") },
      { label: "Mistake Analysis", prompt: P("Give a mistake-analysis framework: error types (concept/silly/time/guess), how to log them and fix each.") },
    ],
  },
  {
    key: "revision-calendar", title: "Revision Calendar", subtitle: "Spaced repetition engine", Icon: CalendarDays, gradient: G_GREEN,
    items: [
      { label: "Daily Revision Topics", prompt: P("Generate a daily revision topic rotation covering the full JEE syllabus over a month.") },
      { label: "Spaced Repetition", prompt: P("Design a spaced repetition schedule (1/3/7/15/30 day) for JEE chapters and formulas.") },
      { label: "Weekly Revision", prompt: P("Create the weekly revision block: what to revise every weekend and how to test retention.") },
      { label: "Monthly Revision", prompt: P("Create a monthly full-syllabus revision plan with time budget per subject.") },
      { label: "Revision Reminders", prompt: P("Suggest a reminder system for revision: triggers, timings and what each reminder should say.") },
    ],
  },
  {
    key: "motivation", title: "Motivation Boost", subtitle: "Stay in the fight", Icon: Heart, gradient: G_PINK,
    items: [
      { label: "Daily Motivational Quote", prompt: P("Give today's motivational quote for a JEE aspirant plus 2 lines on how to apply it today.") },
      { label: "Success Stories", prompt: P("Share 3 realistic JEE success stories (including late starters) with the exact habits that worked.") },
      { label: "Study Tips", prompt: P("Give 10 high-impact study tips for JEE focus, retention and burnout prevention.") },
      { label: "Rewards & Streaks", prompt: P("Design a rewards and streak system for daily JEE study that avoids guilt spirals.") },
      { label: "Motivation", prompt: P("Ask how I'm feeling today, then write a personal, no-fluff 200-word motivation message and one tiny next action.") },
    ],
  },
  {
    key: "progress-timeline", title: "Progress Timeline", subtitle: "See the climb", Icon: BarChart3, gradient: G_VIOLET,
    items: [
      { label: "Study Hours Graph", prompt: P("Ask my last 14 days of study hours, then render an ASCII bar graph with trend analysis.") },
      { label: "Completed Syllabus", prompt: P("Ask my completed chapters per subject, then show syllabus completion percentages and what's left.") },
      { label: "Test Scores", prompt: P("Ask my last 5 mock scores, then chart them and analyse improvement rate and projected score.") },
      { label: "Weekly Progress", prompt: P("Create a weekly progress report format with 6 metrics and a green/amber/red rating.") },
      { label: "Monthly Report", prompt: P("Generate a monthly JEE progress report template with insights, wins, leaks and next-month plan.") },
      { label: "Goal Achievement Timeline", prompt: P("Ask my target rank and exam date, then build a goal achievement timeline with milestones and checkpoints.") },
    ],
  },
];

const STORE_KEY = "samsta.jee.examDate";
const NOTES_KEY = "samsta.jee.planNotes";

export type PlanNote = { id: string; text: string; item: string | null; done: boolean; at: number };
type NotesMap = Record<string, PlanNote[]>;

function readNotes(): NotesMap {
  try {
    const raw = window.localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as NotesMap) : {};
  } catch {
    return {};
  }
}

/** Notes store with instant (real-time) persistence + cross-tab sync. */
function usePlanNotes() {
  const [notes, setNotes] = useState<NotesMap>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    setNotes(readNotes());
    hydrated.current = true;
    const onStorage = (e: StorageEvent) => {
      if (e.key === NOTES_KEY) setNotes(readNotes());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((next: NotesMap) => {
    setNotes(next);
    try {
      window.localStorage.setItem(NOTES_KEY, JSON.stringify(next));
      setSavedAt(Date.now());
    } catch { /* ignore */ }
  }, []);

  const add = useCallback((key: string, text: string, item: string | null) => {
    const t = text.trim();
    if (!t) return;
    const next = { ...notes };
    const note: PlanNote = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text: t, item, done: false, at: Date.now() };
    next[key] = [note, ...(next[key] || [])];
    persist(next);
  }, [notes, persist]);

  const toggle = useCallback((key: string, id: string) => {
    const next = { ...notes, [key]: (notes[key] || []).map((n) => (n.id === id ? { ...n, done: !n.done } : n)) };
    persist(next);
  }, [notes, persist]);

  const remove = useCallback((key: string, id: string) => {
    const next = { ...notes, [key]: (notes[key] || []).filter((n) => n.id !== id) };
    persist(next);
  }, [notes, persist]);

  return { notes, add, toggle, remove, savedAt };
}

function PlanNotes({
  group, notes, onAdd, onToggle, onRemove,
}: {
  group: PlanGroup;
  notes: PlanNote[];
  onAdd: (text: string, item: string | null) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState("");
  const [item, setItem] = useState<string>("");
  const done = notes.filter((n) => n.done).length;

  function submit() {
    onAdd(text, item || null);
    setText("");
  }

  return (
    <div className="relative mt-3 rounded-2xl bg-foreground/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <NotebookPen className="h-3.5 w-3.5" style={{ color: "currentColor" }} />
          Notes & plan content
        </div>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
          {notes.length ? `${done}/${notes.length} done` : "empty"}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <select
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="w-full rounded-xl bg-background/60 px-2.5 py-2 text-[11.5px] outline-none ring-1 ring-foreground/10 focus:ring-foreground/25"
        >
          <option value="">General · {group.title}</option>
          {group.items.map((it) => (
            <option key={it.label} value={it.label}>{it.label}</option>
          ))}
        </select>
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); }
            }}
            rows={2}
            placeholder="Write a note, target or plan detail…"
            className="min-h-[42px] flex-1 resize-none rounded-xl bg-background/60 px-3 py-2 text-[12px] leading-snug outline-none ring-1 ring-foreground/10 placeholder:text-muted-foreground focus:ring-foreground/25"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            aria-label="Add note"
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40"
            style={{ background: group.gradient }}
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {notes.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {notes.map((n) => (
            <li key={n.id} className="glass flex items-start gap-2 rounded-xl px-2.5 py-2 animate-fade-in">
              <button
                onClick={() => onToggle(n.id)}
                aria-label={n.done ? "Mark as pending" : "Mark as done"}
                className="mt-0.5 shrink-0 transition-transform active:scale-90"
              >
                {n.done
                  ? <span className="flex h-4 w-4 items-center justify-center rounded-full text-white" style={{ background: group.gradient }}><Check className="h-2.5 w-2.5" /></span>
                  : <CircleDashed className="h-4 w-4 text-muted-foreground" />}
              </button>
              <div className="min-w-0 flex-1">
                {n.item && (
                  <div className="mb-0.5 inline-block rounded-full bg-foreground/10 px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider">{n.item}</div>
                )}
                <p className={`whitespace-pre-wrap break-words text-[12px] leading-snug ${n.done ? "line-through text-muted-foreground" : ""}`}>{n.text}</p>
                <div className="mt-0.5 text-[9px] text-muted-foreground">
                  {new Date(n.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button onClick={() => onRemove(n.id)} aria-label="Delete note" className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useCountdown(dateStr: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => {
    const target = new Date(`${dateStr}T09:00:00`).getTime();
    const diff = Math.max(0, target - now);
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      mins: Math.floor((diff / 60000) % 60),
      secs: Math.floor((diff / 1000) % 60),
    };
  }, [dateStr, now]);
}

export default function ExamCountdownPlans({
  onOpen,
}: {
  onOpen: (title: string, prompt: string) => void;
}) {
  const [examDate, setExamDate] = useState("2027-01-24");
  const [open, setOpen] = useState<string | null>(PLAN_GROUPS[0].key);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORE_KEY) : null;
    if (saved) setExamDate(saved);
  }, []);

  function updateDate(v: string) {
    setExamDate(v);
    try { window.localStorage.setItem(STORE_KEY, v); } catch { /* ignore */ }
  }

  const { days, hours, mins, secs } = useCountdown(examDate);
  const { notes, add, toggle, remove, savedAt } = usePlanNotes();
  const totalItems = PLAN_GROUPS.reduce((n, g) => n + g.items.length, 0);
  const totalNotes = Object.values(notes).reduce((n, arr) => n + arr.length, 0);

  return (
    <section className="px-4 mt-5 space-y-4">
      {/* Countdown hero */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
        <div aria-hidden className="absolute -left-16 -bottom-16 h-52 w-52 rounded-full opacity-60 blur-3xl animate-aurora" style={{ background: G_ORANGE }} />
        <div className="relative flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time left
            </div>
            <div className="font-display italic text-3xl leading-tight tabular-nums">{days} days</div>
          </div>
          <div className="flex gap-1.5">
            {[["HRS", hours], ["MIN", mins], ["SEC", secs]].map(([l, v]) => (
              <div key={l as string} className="glass rounded-2xl px-2.5 py-2 text-center min-w-[46px]">
                <div className="font-display text-base tabular-nums leading-none">{String(v).padStart(2, "0")}</div>
                <div className="text-[8px] uppercase tracking-widest text-muted-foreground mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <label className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl bg-foreground/5 px-3 py-2">
          <span className="text-[11px] text-muted-foreground">Exam date</span>
          <input
            type="date"
            value={examDate}
            onChange={(e) => updateDate(e.target.value)}
            className="bg-transparent text-[12px] font-medium outline-none"
          />
        </label>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="font-display italic text-lg">Plans inside</div>
        <span className="text-[10px] text-muted-foreground">
          {PLAN_GROUPS.length} plans · {totalItems} modules · {totalNotes} notes
          {savedAt && <span className="ml-1 text-emerald-500">· saved</span>}
        </span>
      </div>


      <div className="space-y-3">
        {PLAN_GROUPS.map((g, gi) => {
          const isOpen = open === g.key;
          return (
            <div
              key={g.key}
              className="glass-strong relative overflow-hidden rounded-3xl animate-fade-up"
              style={{ animationDelay: `${gi * 60}ms` }}
            >
              <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-50 blur-3xl" style={{ background: g.gradient }} />
              <button
                onClick={() => setOpen(isOpen ? null : g.key)}
                className="relative flex w-full items-center gap-3 p-4 text-left transition-transform active:scale-[0.99]"
                aria-expanded={isOpen}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: g.gradient }}>
                  <g.Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-display italic text-[15px] leading-tight truncate">{g.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {g.subtitle} · {g.items.length} steps
                    {(notes[g.key]?.length ?? 0) > 0 && ` · ${notes[g.key].length} notes`}
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              <div
                className="grid transition-all duration-500 ease-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr", opacity: isOpen ? 1 : 0 }}
              >
                <div className="overflow-hidden">
                  <div className="relative space-y-2 px-4 pb-4">
                    {g.items.map((it, i) => (
                      <button
                        key={it.label}
                        onClick={() => onOpen(`${it.label} · ${g.title}`, it.prompt)}
                        className="glass group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all duration-300 active:scale-[0.98] hover:translate-x-0.5"
                        style={{ transitionDelay: isOpen ? `${i * 35}ms` : "0ms" }}
                      >
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-semibold text-white shadow-sm"
                          style={{ background: g.gradient }}
                        >
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-[12.5px] font-medium leading-tight">{it.label}</span>
                        <span className="flex items-center gap-1 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                          <Sparkles className="h-2.5 w-2.5" /> 
                        </span>
                      </button>
                    ))}

                    <PlanNotes
                      group={g}
                      notes={notes[g.key] || []}
                      onAdd={(t, item) => add(g.key, t, item)}
                      onToggle={(id) => toggle(g.key, id)}
                      onRemove={(id) => remove(g.key, id)}
                    />

                    <PlanMediaVault planKey={g.key} planTitle={g.title} gradient={g.gradient} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
