// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, GraduationCap, Brain, ScrollText, ClipboardList, Layers,
  Sigma, Code2, Languages, CalendarClock, Trophy, Flame, Target, Send, RefreshCw,
  BookOpen, TrendingUp, Award, Plus, X, Check, ChevronRight, Wand2, Lightbulb,
  BarChart3, Map, HelpCircle, Zap, FileText, Compass, Briefcase, GlobeLock, Mic, MicOff, Volume2, VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import { supabase } from "@/integrations/supabase/client";
import {
  type LearningProfile, type Flashcard, type QuizRow, type LessonRow, type Badge, type Goal,
  getProfile, upsertProfile, saveLesson, listLessons, listDueFlashcards, insertFlashcards,
  reviewFlashcard, saveQuiz, finishQuiz, listQuizzes, grantBadge, listBadges, listGoals, addGoal,
  updateGoal, deleteGoal, progressStats, bumpStreakAndXp,
} from "@/lib/api/learning";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/learn")({
  component: LearnHub,
  head: () => ({
    meta: [
      { title: "Personal Learning Hub · Samsta" },
      { name: "description", content: "Your tutor, quizzes, flashcards, mind maps, coding, math and a personalised study roadmap— all in one premium hub." },
    ],
  }),
});

type Tab = "home" | "tutor" | "practice" | "library" | "progress";

function LearnHub() {
  const { user, loading } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    void (async () => {
      const p = await getProfile(user.id);
      setProfile(p);
      if (!p || !p.education_level) setShowOnboard(true);
    })();
  }, [user, loading, navigate]);

  if (loading || !user) return null;
  if (!isPremium) return <LockedGate />;

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: "home", label: "Home", icon: <Sparkles className="h-4 w-4" /> },
    { key: "tutor", label: "Tutor", icon: <GraduationCap className="h-4 w-4" /> },
    { key: "practice", label: "Practice", icon: <Brain className="h-4 w-4" /> },
    { key: "library", label: "Library", icon: <BookOpen className="h-4 w-4" /> },
    { key: "progress", label: "Progress", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen pb-32" style={{
      background: "radial-gradient(1200px 600px at 10% -10%, oklch(0.94 0.06 130 / 0.55), transparent 60%), radial-gradient(900px 500px at 100% 0%, oklch(0.93 0.07 250 / 0.5), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-lg italic leading-tight">Learning Hub</div>
          <div className="text-[11px] text-muted-foreground">Your personal academy</div>
        </div>
        <StreakChip profile={profile} />
      </header>

      {showOnboard && (
        <Onboarding
          userId={user.id}
          initial={profile}
          onDone={(p) => { setProfile(p); setShowOnboard(false); toast.success("Personalised."); }}
        />
      )}

      {/* Tabs */}
      <nav className="scrollbar-none mx-2 mt-1 flex gap-1.5 overflow-x-auto px-2 pb-1">
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition",
                on ? "text-white shadow-md" : "glass text-foreground/80")}
              style={on ? { background: "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))" } : undefined}>
              {t.icon}<span className="font-display italic">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="px-4 pt-3">
        {tab === "home" && <HomeTab userId={user.id} profile={profile} setTab={setTab} openOnboard={() => setShowOnboard(true)} />}
        {tab === "tutor" && <TutorTab userId={user.id} profile={profile} />}
        {tab === "practice" && <PracticeTab userId={user.id} profile={profile} />}
        {tab === "library" && <LibraryTab userId={user.id} />}
        {tab === "progress" && <ProgressTab userId={user.id} profile={profile} />}
      </main>
    </div>
  );
}

function LockedGate() {
  return (
    <div className="min-h-screen p-6">
      <div className="glass-strong mx-auto mt-16 max-w-md rounded-3xl p-6 text-center">
        <GraduationCap className="mx-auto h-10 w-10" />
        <h1 className="mt-3 font-display text-2xl italic">Learning Hub is Premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">Unlock your tutor, flashcards, mind maps, coding, math and analytics.</p>
        <Link to="/premium" className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2 text-sm text-background">Upgrade</Link>
      </div>
    </div>
  );
}

function StreakChip({ profile }: { profile: LearningProfile | null }) {
  const days = profile?.streak_days ?? 0;
  const xp = profile?.xp ?? 0;
  return (
    <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
      <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-orange-500" />{days}d</span>
      <span className="h-3 w-px bg-border" />
      <span className="inline-flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-amber-500" />{xp}</span>
    </div>
  );
}

/* ================= ONBOARDING ================= */
const LEVELS = ["Kid (5–10)", "School (11–15)", "High School (16–18)", "College", "Professional", "Hobbyist"];
const INTEREST_CHIPS = ["Math", "Science", "Coding", "History", "Languages", "Art", "Music", "Business", "Design", "Philosophy", "Health", "", "Space", "Literature"];
const LANGUAGES = ["English", "Hindi", "Spanish", "French", "German", "Japanese", "Arabic", "Portuguese"];

function Onboarding({ userId, initial, onDone }: { userId: string; initial: LearningProfile | null; onDone: (p: LearningProfile) => void }) {
  const [level, setLevel] = useState(initial?.education_level ?? "");
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [goals, setGoals] = useState(initial?.goals ?? "");
  const [minutes, setMinutes] = useState(initial?.daily_goal_minutes ?? 20);
  const [lang, setLang] = useState(initial?.preferred_language ?? "English");
  const [saving, setSaving] = useState(false);

  const toggle = (t: string) => setInterests((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  async function save() {
    if (!level || interests.length === 0) return toast.error("Pick your level and 1+ interest");
    setSaving(true);
    try {
      const p = await upsertProfile(userId, {
        education_level: level, interests, goals: goals || null, daily_goal_minutes: minutes, preferred_language: lang,
      });
      await grantBadge(userId, "onboarded", "Ready to learn", "Set up your personal learning profile");
      onDone(p);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
    finally { setSaving(false); }
  }

  return (
    <section className="mx-3 mt-3 animate-fade-up">
      <div className="glass-strong overflow-hidden rounded-3xl p-5">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <div className="font-display italic">Personalise your learning</div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Sam adapts every lesson to your level, interests and goals.</p>

        <div className="mt-4 space-y-4">
          <Field label="Education level">
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)}
                  className={cn("rounded-full px-3 py-1.5 text-xs transition", level === l ? "bg-foreground text-background" : "glass")}>{l}</button>
              ))}
            </div>
          </Field>

          <Field label="Interests">
            <div className="flex flex-wrap gap-2">
              {INTEREST_CHIPS.map((t) => {
                const on = interests.includes(t);
                return (
                  <button key={t} onClick={() => toggle(t)}
                    className={cn("rounded-full px-3 py-1.5 text-xs transition", on ? "bg-primary text-primary-foreground" : "glass")}>
                    {on ? "✓ " : ""}{t}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Your goals (optional)">
            <textarea rows={2} value={goals} onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Ace calc mid-terms · Ship my first app · Read 12 books"
              className="w-full resize-none rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Daily minutes">
              <input type="range" min={5} max={90} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
                className="w-full" />
              <div className="text-xs text-muted-foreground">{minutes} min/day</div>
            </Field>
            <Field label="Language">
              <select value={lang} onChange={(e) => setLang(e.target.value)}
                className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm">
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>

          <button onClick={save} disabled={saving}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))" }}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Personalise
          </button>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

/* ================= HOME TAB ================= */
function HomeTab({ userId, profile, setTab, openOnboard }: { userId: string; profile: LearningProfile | null; setTab: (t: Tab) => void; openOnboard: () => void }) {
  const [stats, setStats] = useState<{ minutesTotal: number; sessionsTotal: number; weekMinutes: number; weekChart: Record<string, number> } | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  useEffect(() => {
    void (async () => {
      const [s, b] = await Promise.all([progressStats(userId), listBadges(userId)]);
      setStats(s); setBadges(b);
    })();
  }, [userId]);

  const goal = profile?.daily_goal_minutes ?? 20;
  const today = new Date().toISOString().slice(0, 10);
  const todayMin = stats?.weekChart[today] ?? 0;
  const pct = Math.min(100, Math.round((todayMin / goal) * 100));

  const quick = [
    { key: "tutor", label: "Tutor", tint: "linear-gradient(135deg, oklch(0.75 0.13 260), oklch(0.7 0.15 290))", icon: <GraduationCap className="h-5 w-5" />, onClick: () => setTab("tutor") },
    { key: "quiz", label: "Quiz", tint: "linear-gradient(135deg, oklch(0.78 0.13 30), oklch(0.72 0.14 15))", icon: <HelpCircle className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "flash", label: "Flashcards", tint: "linear-gradient(135deg, oklch(0.78 0.13 190), oklch(0.72 0.14 220))", icon: <Layers className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "mind", label: "Mind Map", tint: "linear-gradient(135deg, oklch(0.82 0.12 130), oklch(0.76 0.13 170))", icon: <Brain className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "math", label: "Math Solver", tint: "linear-gradient(135deg, oklch(0.75 0.13 340), oklch(0.72 0.15 15))", icon: <Sigma className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "code", label: "Coding", tint: "linear-gradient(135deg, oklch(0.35 0.04 240), oklch(0.5 0.1 270))", icon: <Code2 className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "lang", label: "Language", tint: "linear-gradient(135deg, oklch(0.82 0.13 60), oklch(0.78 0.12 90))", icon: <Languages className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "plan", label: "Revision Plan", tint: "linear-gradient(135deg, oklch(0.75 0.13 210), oklch(0.7 0.15 240))", icon: <CalendarClock className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "mock", label: "Mock Test", tint: "linear-gradient(135deg, oklch(0.7 0.15 25), oklch(0.65 0.18 15))", icon: <ClipboardList className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "road", label: "Roadmap", tint: "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))", icon: <Map className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "home", label: "Homework", tint: "linear-gradient(135deg, oklch(0.72 0.13 150), oklch(0.7 0.15 180))", icon: <Lightbulb className="h-5 w-5" />, onClick: () => setTab("practice") },
    { key: "weak", label: "Weak Topics", tint: "linear-gradient(135deg, oklch(0.7 0.16 40), oklch(0.68 0.18 20))", icon: <Target className="h-5 w-5" />, onClick: () => setTab("progress") },
  ];

  return (
    <div className="space-y-5">
      {/* daily goal ring */}
      <section className="animate-fade-up">
        <div className="glass-strong overflow-hidden rounded-3xl p-5">
          <div className="flex items-center gap-4">
            <GoalRing pct={pct} size={92} />
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Daily goal</div>
              <div className="font-display text-2xl italic">{todayMin}<span className="text-sm not-italic text-muted-foreground">/{goal} min</span></div>
              <div className="mt-1 text-xs text-muted-foreground">{profile?.education_level ?? "Set your level"} · {(profile?.interests ?? []).slice(0, 3).join(" · ") || "No interests yet"}</div>
              <button onClick={openOnboard} className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary">Edit preferences <ChevronRight className="h-3 w-3" /></button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="Streak" value={`${profile?.streak_days ?? 0}d`} icon={<Flame className="h-3.5 w-3.5 text-orange-500" />} />
            <Stat label="XP" value={`${profile?.xp ?? 0}`} icon={<Zap className="h-3.5 w-3.5 text-amber-500" />} />
            <Stat label="Total" value={`${stats?.minutesTotal ?? 0}m`} icon={<BookOpen className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </section>

      {/* quick actions */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="font-display italic">Everything you can learn</div>
          <span className="text-[11px] text-muted-foreground">Tap to open</span>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {quick.map((q, i) => (
            <button key={q.key} onClick={q.onClick}
              className="group relative flex aspect-square flex-col items-start justify-between overflow-hidden rounded-2xl p-3 text-left text-white shadow-md transition active:scale-95 animate-fade-up"
              style={{ background: q.tint, animationDelay: `${i * 25}ms` }}>
              <div className="rounded-xl bg-white/20 p-1.5 backdrop-blur">{q.icon}</div>
              <div className="font-display text-sm italic leading-tight">{q.label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* badges */}
      {badges.length > 0 && (
        <section>
          <div className="mb-2 font-display italic">Achievements</div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
            {badges.map((b) => (
              <div key={b.id} className="glass flex min-w-[130px] shrink-0 items-center gap-2 rounded-2xl px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow"
                  style={{ background: "linear-gradient(135deg, #f5d76e, #d4af37)" }}>
                  <Award className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-medium leading-tight">{b.title}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/40 p-2">
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 font-display text-lg italic">{value}</div>
    </div>
  );
}

function GoalRing({ pct, size }: { pct: number; size: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={7} className="fill-none stroke-muted-foreground/20" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={7} strokeLinecap="round"
          className="fill-none" style={{ stroke: "url(#g1)" }} strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} />
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.18 260)" />
            <stop offset="100%" stopColor="oklch(0.7 0.18 300)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-lg italic leading-none">{pct}%</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">today</div>
        </div>
      </div>
    </div>
  );
}

/* ================= TUTOR TAB ================= */
type ChatMsg = { role: "user" | "assistant"; content: string };

function TutorTab({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "Hi — I'm Sam, your tutor. Ask me anything: a topic to unpack, a homework question, a math step, a coding puzzle. I'll adapt to your level." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<unknown>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [messages]);

  function speak(text: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const cleaned = text.replace(/[#*_`>~[\]()]/g, "").replace(/\s+/g, " ").trim();
    if (!cleaned) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(cleaned);
      u.rate = 1; u.pitch = 1;
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }

  function toggleListen() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input not supported in this browser"); return; }
    if (listening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recogRef.current as any)?.stop?.();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ev = e as any;
      let t = "";
      for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript;
      setInput(t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recogRef.current = rec;
    setListening(true);
    rec.start();
  }

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    const header = JSON.stringify({
      level: profile?.education_level ?? "any",
      interests: profile?.interests ?? [],
      goals: profile?.goals ?? "",
      language: profile?.preferred_language ?? "English",
    });
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const acc = await streamSam("tutor", [{ role: "user", content: `${header}\n---\n${q}` }], (a) => {
        setMessages((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: a }; return c; });
      });
      await saveLesson(userId, { topic: q.slice(0, 80), kind: "tutor", content: acc });
      await bumpStreakAndXp(userId, 2, 5);
      if (voiceOn) speak(acc);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Sam couldn't respond"); }
    finally { setBusy(false); }
  }

  const suggestions = useMemo(() => {
    const base = ["Explain photosynthesis simply", "Help me solve 2x²+3x-5=0", "Teach me recursion with a story", "Why did WWI start?"];
    return base;
  }, []);

  return (
    <div className="flex h-[calc(100vh-220px)] flex-col">
      <div className="mb-2 flex items-center justify-end gap-2">
        <button onClick={() => { const next = !voiceOn; setVoiceOn(next); if (!next && typeof window !== "undefined") window.speechSynthesis?.cancel(); }}
          className={cn("glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]", voiceOn && "bg-primary/10 text-primary")}>
          {voiceOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          Voice {voiceOn ? "on" : "off"}
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
              m.role === "user"
                ? "text-white"
                : "glass text-foreground",
            )} style={m.role === "user" ? { background: "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))" } : undefined}>
              {m.content || (busy && i === messages.length - 1 ? <span className="text-muted-foreground">…</span> : null)}
            </div>
          </div>
        ))}
      </div>

      {messages.length <= 2 && (
        <div className="scrollbar-none mb-2 flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((s) => (
            <button key={s} onClick={() => setInput(s)} className="glass shrink-0 rounded-full px-3 py-1.5 text-xs">{s}</button>
          ))}
        </div>
      )}

      <div className="glass-strong flex items-end gap-2 rounded-3xl p-2">
        <button onClick={toggleListen} title="Voice input" aria-label="Voice input"
          className={cn("flex h-10 w-10 items-center justify-center rounded-full", listening ? "bg-red-500 text-white animate-pulse" : "glass")}>
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
        <textarea rows={1} value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder="Ask your tutor…"
          className="max-h-32 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none" />
        <button onClick={send} disabled={busy || !input.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))" }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* ================= PRACTICE TAB ================= */
type PracticeMode =
  | { kind: "menu" }
  | { kind: "explain" } | { kind: "quiz" } | { kind: "flash" } | { kind: "mind" }
  | { kind: "math" } | { kind: "code" } | { kind: "lang" } | { kind: "plan" }
  | { kind: "mock" } | { kind: "road" } | { kind: "home" } | { kind: "review" }
  | { kind: "notes" } | { kind: "study" } | { kind: "predict" } | { kind: "career" } | { kind: "translate" };

function PracticeTab({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [mode, setMode] = useState<PracticeMode>({ kind: "menu" });

  const items: Array<{ kind: PracticeMode["kind"]; title: string; hint: string; tint: string; icon: React.ReactNode }> = [
    { kind: "explain", title: "Topic Explainer", hint: "In-depth, level-aware", tint: "linear-gradient(135deg, oklch(0.75 0.13 260), oklch(0.7 0.15 290))", icon: <BookOpen className="h-4 w-4" /> },
    { kind: "notes", title: "Notes Generator", hint: "Deep structured notes", tint: "linear-gradient(135deg, oklch(0.78 0.11 220), oklch(0.72 0.14 250))", icon: <FileText className="h-4 w-4" /> },
    { kind: "quiz", title: "Quiz Generator", hint: "5 Qs, instant score", tint: "linear-gradient(135deg, oklch(0.78 0.13 30), oklch(0.72 0.14 15))", icon: <HelpCircle className="h-4 w-4" /> },
    { kind: "flash", title: "Flashcards", hint: "Spaced repetition", tint: "linear-gradient(135deg, oklch(0.78 0.13 190), oklch(0.72 0.14 220))", icon: <Layers className="h-4 w-4" /> },
    { kind: "review", title: "Review Due", hint: "Cards to review today", tint: "linear-gradient(135deg, oklch(0.72 0.13 150), oklch(0.7 0.15 180))", icon: <RefreshCw className="h-4 w-4" /> },
    { kind: "mind", title: "Mind Map", hint: "Visual overview", tint: "linear-gradient(135deg, oklch(0.82 0.12 130), oklch(0.76 0.13 170))", icon: <Brain className="h-4 w-4" /> },
    { kind: "math", title: "Math Solver", hint: "Step-by-step", tint: "linear-gradient(135deg, oklch(0.75 0.13 340), oklch(0.72 0.15 15))", icon: <Sigma className="h-4 w-4" /> },
    { kind: "code", title: "Coding Practice", hint: "Challenges + solutions", tint: "linear-gradient(135deg, oklch(0.35 0.04 240), oklch(0.5 0.1 270))", icon: <Code2 className="h-4 w-4" /> },
    { kind: "lang", title: "Language", hint: "Vocab + grammar", tint: "linear-gradient(135deg, oklch(0.82 0.13 60), oklch(0.78 0.12 90))", icon: <Languages className="h-4 w-4" /> },
    { kind: "plan", title: "Revision Planner", hint: "Day-by-day plan", tint: "linear-gradient(135deg, oklch(0.75 0.13 210), oklch(0.7 0.15 240))", icon: <CalendarClock className="h-4 w-4" /> },
    { kind: "study", title: "Study Planner", hint: "Week-by-week schedule", tint: "linear-gradient(135deg, oklch(0.7 0.14 180), oklch(0.68 0.15 210))", icon: <Compass className="h-4 w-4" /> },
    { kind: "mock", title: "Mock Test", hint: "Mixed difficulty", tint: "linear-gradient(135deg, oklch(0.7 0.15 25), oklch(0.65 0.18 15))", icon: <ClipboardList className="h-4 w-4" /> },
    { kind: "predict", title: "Exam Predictor", hint: "Likely questions + weights", tint: "linear-gradient(135deg, oklch(0.68 0.17 10), oklch(0.62 0.19 350))", icon: <Target className="h-4 w-4" /> },
    { kind: "road", title: "Study Roadmap", hint: "Week-by-week", tint: "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))", icon: <Map className="h-4 w-4" /> },
    { kind: "home", title: "Homework Helper", hint: "We teach, not paste", tint: "linear-gradient(135deg, oklch(0.72 0.13 150), oklch(0.7 0.15 180))", icon: <Lightbulb className="h-4 w-4" /> },
    { kind: "career", title: "Career Recommender", hint: "Paths from your learning", tint: "linear-gradient(135deg, oklch(0.6 0.16 280), oklch(0.55 0.18 320))", icon: <Briefcase className="h-4 w-4" /> },
    { kind: "translate", title: "Lesson Translator", hint: "Any note · 100+ languages", tint: "linear-gradient(135deg, oklch(0.75 0.12 100), oklch(0.7 0.14 140))", icon: <GlobeLock className="h-4 w-4" /> },
  ];

  if (mode.kind === "menu") {
    return (
      <div className="space-y-2">
        {items.map((it, i) => (
          <button key={it.kind} onClick={() => setMode({ kind: it.kind })}
            className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition active:scale-[0.98] animate-fade-up"
            style={{ animationDelay: `${i * 20}ms` }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: it.tint }}>{it.icon}</div>
            <div className="flex-1">
              <div className="font-display italic">{it.title}</div>
              <div className="text-[11px] text-muted-foreground">{it.hint}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <button onClick={() => setMode({ kind: "menu" })} className="glass mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      {mode.kind === "explain" && <StreamPanel tool="topic_explain" title="Topic Explainer" placeholder="e.g. Quantum entanglement" userId={userId} profile={profile} kind="explanation" jsonInput />}
      {mode.kind === "quiz" && <QuizPanel userId={userId} profile={profile} kind="quiz" />}
      {mode.kind === "mock" && <QuizPanel userId={userId} profile={profile} kind="mock_test" />}
      {mode.kind === "flash" && <FlashcardsPanel userId={userId} profile={profile} />}
      {mode.kind === "review" && <ReviewDuePanel userId={userId} />}
      {mode.kind === "mind" && <MindMapPanel userId={userId} profile={profile} />}
      {mode.kind === "math" && <StreamPanel tool="math_solve" title="Math Solver" placeholder="Paste any problem…" userId={userId} profile={profile} kind="math" />}
      {mode.kind === "code" && <StreamPanel tool="code_practice" title="Coding Practice" placeholder='e.g. "arrays, easy, python"' userId={userId} profile={profile} kind="code" jsonInput codeMode />}
      {mode.kind === "lang" && <LanguagePanel userId={userId} profile={profile} />}
      {mode.kind === "plan" && <PlanPanel userId={userId} profile={profile} />}
      {mode.kind === "road" && <RoadmapPanel userId={userId} profile={profile} />}
      {mode.kind === "home" && <HomeworkPanel userId={userId} profile={profile} />}
      {mode.kind === "notes" && <NotesPanel userId={userId} profile={profile} />}
      {mode.kind === "study" && <StudyPlannerPanel userId={userId} profile={profile} />}
      {mode.kind === "predict" && <ExamPredictorPanel userId={userId} profile={profile} />}
      {mode.kind === "career" && <CareerRecoPanel userId={userId} profile={profile} />}
      {mode.kind === "translate" && <TranslatorPanel userId={userId} profile={profile} />}
    </div>
  );
}

function panelBg() {
  return "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))";
}

function StreamPanel({
  tool, title, placeholder, userId, profile, kind, jsonInput, codeMode,
}: {
  tool: string; title: string; placeholder: string; userId: string; profile: LearningProfile | null; kind: string;
  jsonInput?: boolean; codeMode?: boolean;
}) {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    const v = input.trim();
    if (!v || busy) return;
    let payload = v;
    if (jsonInput) {
      if (codeMode) {
        const [langP, levelP, ...rest] = v.split(",").map((s) => s.trim());
        payload = JSON.stringify({ language: langP || "python", level: levelP || (profile?.education_level ?? "any"), topic: rest.join(", ") || "arrays" });
      } else {
        payload = JSON.stringify({ topic: v, level: profile?.education_level ?? "any", language: profile?.preferred_language ?? "English" });
      }
    }
    setOut(""); setBusy(true);
    try {
      const acc = await streamSam(tool, [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: v.slice(0, 100), kind, content: acc });
      await bumpStreakAndXp(userId, 3, 8);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 font-display italic">{title}</div>
        <textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder}
          className="w-full resize-none rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        <button onClick={run} disabled={busy || !input.trim()} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
        </button>
      </div>
      {(out || busy) && (
        <div className="glass rounded-3xl p-4 text-sm leading-relaxed whitespace-pre-wrap animate-fade-up">
          {out || <span className="text-muted-foreground">Thinking…</span>}
        </div>
      )}
    </div>
  );
}

/* ---- Quiz / Mock Test ---- */
type QuizQ = { q: string; choices: string[]; answer: number; explain?: string };
function QuizPanel({ userId, profile, kind }: { userId: string; profile: LearningProfile | null; kind: "quiz" | "mock_test" }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(kind === "mock_test" ? 10 : 5);
  const [questions, setQuestions] = useState<QuizQ[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);

  async function generate() {
    const t = topic.trim();
    if (!t) return;
    setBusy(true); setQuestions(null); setShowResult(false); setAnswers([]);
    try {
      const payload = JSON.stringify({ topic: t, level: profile?.education_level ?? "any", count, language: profile?.preferred_language ?? "English", mixed_difficulty: kind === "mock_test" });
      let raw = "";
      await streamSam(kind === "mock_test" ? "mock_test" : "quiz_gen", [{ role: "user", content: payload }], (a) => { raw = a; });
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const qs: QuizQ[] = parsed.questions ?? [];
      if (!qs.length) throw new Error("No questions");
      setQuestions(qs);
      setAnswers(new Array(qs.length).fill(-1));
      const saved = await saveQuiz(userId, t, kind, qs);
      setQuizId(saved.id);
    } catch (e) { toast.error("Couldn't generate — try again"); }
    finally { setBusy(false); }
  }

  async function submit() {
    if (!questions) return;
    const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    setShowResult(true);
    if (quizId) await finishQuiz(quizId, answers, score);
    await bumpStreakAndXp(userId, 5, score * 3);
    if (score === questions.length) await grantBadge(userId, "perfect_score", "Perfect Score", "Aced a quiz");
    if (kind === "mock_test") await grantBadge(userId, "mock_first", "Mock Warrior", "Completed your first mock test");
  }

  if (!questions) {
    return (
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 font-display italic">{kind === "mock_test" ? "Mock Test" : "Quiz Generator"}</div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic e.g. Newton's laws"
          className="w-full rounded-full border border-border bg-white/50 px-4 py-2 text-sm outline-none" />
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Questions</span>
          {[5, 10, 15, 20].map((n) => (
            <button key={n} onClick={() => setCount(n)} className={cn("rounded-full px-3 py-1", count === n ? "bg-foreground text-background" : "glass")}>{n}</button>
          ))}
        </div>
        <button onClick={generate} disabled={busy || !topic.trim()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate
        </button>
      </div>
    );
  }

  const score = questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
  return (
    <div className="space-y-3">
      {questions.map((q, i) => (
        <div key={i} className="glass rounded-2xl p-4 animate-fade-up">
          <div className="text-xs text-muted-foreground">Q{i + 1}</div>
          <div className="font-medium">{q.q}</div>
          <div className="mt-2 space-y-1.5">
            {q.choices.map((c, ci) => {
              const chosen = answers[i] === ci;
              const correct = showResult && q.answer === ci;
              const wrong = showResult && chosen && q.answer !== ci;
              return (
                <button key={ci} disabled={showResult} onClick={() => setAnswers((a) => { const n = [...a]; n[i] = ci; return n; })}
                  className={cn("flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm transition",
                    correct ? "border-green-500 bg-green-500/10" :
                    wrong ? "border-red-500 bg-red-500/10" :
                    chosen ? "border-primary bg-primary/5" : "border-border bg-white/40")}>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full border text-[10px]", chosen && "border-primary bg-primary text-primary-foreground")}>{String.fromCharCode(65 + ci)}</span>
                  <span className="flex-1">{c}</span>
                  {correct && <Check className="h-4 w-4 text-green-600" />}
                </button>
              );
            })}
          </div>
          {showResult && q.explain && <div className="mt-2 text-[11px] italic text-muted-foreground">{q.explain}</div>}
        </div>
      ))}
      {!showResult ? (
        <button onClick={submit} disabled={answers.some((a) => a < 0)} className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          <Check className="h-4 w-4" /> Submit
        </button>
      ) : (
        <div className="glass-strong rounded-3xl p-4 text-center">
          <Trophy className="mx-auto h-8 w-8 text-amber-500" />
          <div className="mt-1 font-display text-2xl italic">{score}/{questions.length}</div>
          <div className="text-xs text-muted-foreground">Nice work — logged to your progress</div>
          <button onClick={() => { setQuestions(null); setTopic(""); }} className="mt-3 rounded-full bg-foreground px-4 py-1.5 text-xs text-background">New quiz</button>
        </div>
      )}
    </div>
  );
}

/* ---- Flashcards ---- */
function FlashcardsPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [busy, setBusy] = useState(false);

  async function generate() {
    const t = topic.trim(); if (!t) return;
    setBusy(true);
    try {
      const payload = JSON.stringify({ topic: t, level: profile?.education_level ?? "any", count, language: profile?.preferred_language ?? "English" });
      let raw = "";
      await streamSam("flashcards_gen", [{ role: "user", content: payload }], (a) => { raw = a; });
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      await insertFlashcards(userId, t, parsed.cards ?? []);
      toast.success(`${parsed.cards?.length ?? 0} cards added`);
      setTopic("");
    } catch { toast.error("Couldn't generate"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 font-display italic">Generate Flashcards</div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic e.g. French verbs"
          className="w-full rounded-full border border-border bg-white/50 px-4 py-2 text-sm outline-none" />
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Cards</span>
          {[5, 8, 12, 20].map((n) => <button key={n} onClick={() => setCount(n)} className={cn("rounded-full px-3 py-1", count === n ? "bg-foreground text-background" : "glass")}>{n}</button>)}
        </div>
        <button onClick={generate} disabled={busy || !topic.trim()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />} Create deck
        </button>
      </div>
      <ReviewDuePanel userId={userId} />
    </div>
  );
}

function ReviewDuePanel({ userId }: { userId: string }) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);

  async function load() { setCards(await listDueFlashcards(userId)); setI(0); setFlip(false); }
  useEffect(() => { void load(); }, [userId]);

  if (cards.length === 0) {
    return (
      <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground animate-fade-up">
        <Layers className="mx-auto mb-2 h-6 w-6" />
        No cards due today. Generate a deck to start.
      </div>
    );
  }

  if (i >= cards.length) {
    return (
      <div className="glass-strong rounded-3xl p-6 text-center animate-fade-up">
        <Trophy className="mx-auto h-7 w-7 text-amber-500" />
        <div className="mt-1 font-display italic">Review complete</div>
        <button onClick={load} className="mt-2 rounded-full bg-foreground px-4 py-1.5 text-xs text-background">Refresh</button>
      </div>
    );
  }

  const card = cards[i];
  async function rate(q: "again" | "hard" | "good" | "easy") {
    await reviewFlashcard(card.id, q);
    setFlip(false); setI((n) => n + 1);
    await bumpStreakAndXp(userId, 1, q === "again" ? 1 : q === "hard" ? 2 : q === "good" ? 3 : 5);
  }

  return (
    <div className="space-y-3 animate-fade-up">
      <div className="text-center text-[11px] text-muted-foreground">{i + 1} / {cards.length} due</div>
      <button onClick={() => setFlip((v) => !v)} className="glass-strong flex min-h-[180px] w-full items-center justify-center rounded-3xl p-6 text-center transition">
        <div className="max-w-full">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{flip ? "Back" : "Front"}</div>
          <div className="mt-1 font-display text-lg italic">{flip ? card.back : card.front}</div>
        </div>
      </button>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <button onClick={() => rate("again")} className="rounded-full bg-red-500/10 py-2 text-red-600">Again</button>
        <button onClick={() => rate("hard")} className="rounded-full bg-orange-500/10 py-2 text-orange-600">Hard</button>
        <button onClick={() => rate("good")} className="rounded-full bg-green-500/10 py-2 text-green-600">Good</button>
        <button onClick={() => rate("easy")} className="rounded-full bg-sky-500/10 py-2 text-sky-600">Easy</button>
      </div>
    </div>
  );
}

/* ---- Mind Map ---- */
function MindMapPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [topic, setTopic] = useState("");
  const [tree, setTree] = useState<{ root: string; branches: Array<{ label: string; leaves: string[] }> } | null>(null);
  const [busy, setBusy] = useState(false);

  function parseMermaid(src: string) {
    const lines = src.split("\n").map((l) => l.replace(/^\s*/, ""));
    const idx = lines.findIndex((l) => l.startsWith("mindmap"));
    if (idx < 0) return null;
    const rest = src.split("\n").slice(idx + 1);
    let root = topic;
    const branches: Array<{ label: string; leaves: string[] }> = [];
    let cur: { label: string; leaves: string[] } | null = null;
    for (const raw of rest) {
      if (!raw.trim()) continue;
      const indent = raw.length - raw.trimStart().length;
      const text = raw.trim().replace(/^[*\-+]\s*/, "").replace(/^\((.*)\)$/, "$1").replace(/^\[(.*)\]$/, "$1");
      if (indent <= 2 && !root) { root = text; continue; }
      if (indent <= 4) { cur = { label: text, leaves: [] }; branches.push(cur); }
      else if (cur) cur.leaves.push(text);
    }
    return { root: root || topic, branches };
  }

  async function generate() {
    const t = topic.trim(); if (!t) return;
    setBusy(true); setTree(null);
    try {
      const payload = JSON.stringify({ topic: t, level: profile?.education_level ?? "any", language: profile?.preferred_language ?? "English" });
      let raw = "";
      await streamSam("mindmap_gen", [{ role: "user", content: payload }], (a) => { raw = a; });
      const cleaned = raw.replace(/```mermaid|```/g, "").trim();
      const parsed = parseMermaid(cleaned);
      if (!parsed) throw new Error();
      setTree(parsed);
      await saveLesson(userId, { topic: t, kind: "mindmap", content: cleaned });
      await bumpStreakAndXp(userId, 3, 6);
    } catch { toast.error("Couldn't build map"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 font-display italic">Mind Map</div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic e.g. World War II"
          className="w-full rounded-full border border-border bg-white/50 px-4 py-2 text-sm outline-none" />
        <button onClick={generate} disabled={busy || !topic.trim()} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />} Visualise
        </button>
      </div>
      {tree && (
        <div className="glass rounded-3xl p-5 animate-fade-up">
          <div className="mb-3 text-center font-display text-lg italic text-primary">{tree.root}</div>
          <div className="space-y-2">
            {tree.branches.map((b, i) => (
              <div key={i} className="rounded-2xl bg-white/40 p-3">
                <div className="font-medium">{b.label}</div>
                {b.leaves.length > 0 && (
                  <ul className="mt-1 ml-4 list-disc space-y-0.5 text-xs text-foreground/80">
                    {b.leaves.map((l, li) => <li key={li}>{l}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- Language / Plan / Roadmap / Homework panels ---- */
function LanguagePanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [target, setTarget] = useState("Spanish");
  const [focus, setFocus] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({ target_language: target, native_language: profile?.preferred_language ?? "English", level: profile?.education_level ?? "beginner", focus: focus || "everyday" });
      const acc = await streamSam("language_lesson", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `${target} · ${focus || "everyday"}`, kind: "language", content: acc });
      await bumpStreakAndXp(userId, 4, 8);
    } catch (e) { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 font-display italic">Language Coach</div>
        <div className="grid grid-cols-2 gap-2">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-full border border-border bg-white/50 px-3 py-2 text-sm">
            {["Spanish", "French", "German", "Italian", "Japanese", "Korean", "Arabic", "Hindi", "Portuguese", "Mandarin"].map((l) => <option key={l}>{l}</option>)}
          </select>
          <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus (travel, food…)" className="rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        </div>
        <button onClick={go} disabled={busy} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />} Today's lesson
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

function PlanPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [topics, setTopics] = useState("");
  const [weak, setWeak] = useState("");
  const [date, setDate] = useState("");
  const [min, setMin] = useState(profile?.daily_goal_minutes ?? 30);
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({
        topics: topics.split(",").map((s) => s.trim()).filter(Boolean),
        exam_date: date, minutes_per_day: min, weak_topics: weak.split(",").map((s) => s.trim()).filter(Boolean),
        language: profile?.preferred_language ?? "English",
      });
      const acc = await streamSam("revision_plan", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `Revision plan · ${date || "custom"}`, kind: "plan", content: acc });
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic">Revision Planner</div>
        <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="Topics (comma separated)" className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <input value={weak} onChange={(e) => setWeak(e.target.value)} placeholder="Weak topics (optional)" className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
          <input type="number" value={min} onChange={(e) => setMin(Number(e.target.value))} className="rounded-full border border-border bg-white/50 px-3 py-2 text-sm" placeholder="Minutes/day" />
        </div>
        <button onClick={go} disabled={busy || !topics.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />} Plan my week
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

function RoadmapPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [weeks, setWeeks] = useState(8);
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({
        level: profile?.education_level ?? "any", interests: profile?.interests ?? [],
        goals: profile?.goals ?? "", weeks, language: profile?.preferred_language ?? "English",
      });
      const acc = await streamSam("learning_roadmap", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `Roadmap · ${weeks}w`, kind: "roadmap", content: acc });
      await grantBadge(userId, "roadmap_set", "Roadmap Set", "Built a personalised study roadmap");
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 font-display italic">Personalised Study Roadmap</div>
        <div className="text-xs text-muted-foreground">Based on your profile — {profile?.education_level || "?"} · {(profile?.interests ?? []).join(", ") || "no interests set"}</div>
        <div className="mt-2 flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Weeks</span>
          {[4, 8, 12].map((n) => <button key={n} onClick={() => setWeeks(n)} className={cn("rounded-full px-3 py-1", weeks === n ? "bg-foreground text-background" : "glass")}>{n}</button>)}
        </div>
        <button onClick={go} disabled={busy} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Map className="h-4 w-4" />} Build roadmap
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

function HomeworkPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    if (!q.trim()) return;
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({ subject, level: profile?.education_level ?? "any", question: q, language: profile?.preferred_language ?? "English" });
      const acc = await streamSam("homework_assist", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `${subject}: ${q.slice(0, 60)}`, kind: "homework", content: acc });
      await bumpStreakAndXp(userId, 5, 8);
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic">Homework Assistant</div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (Math, Physics…)" className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <textarea rows={3} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Paste your question…" className="w-full resize-none rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm outline-none" />
        <button onClick={go} disabled={busy || !q.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />} Help me understand
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

/* ---- AI Notes Generator ---- */
function NotesPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<"quick" | "standard" | "deep">("standard");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!topic.trim()) return;
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({ topic, level: profile?.education_level ?? "any", language: profile?.preferred_language ?? "English", depth });
      const acc = await streamSam("learn_notes", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `Notes · ${topic.slice(0, 60)}`, kind: "notes", content: acc });
      await bumpStreakAndXp(userId, depth === "deep" ? 8 : depth === "standard" ? 5 : 3, depth === "deep" ? 12 : 8);
      toast.success("Saved to your library");
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic"> Notes Generator</div>
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic e.g. Photosynthesis · CAP theorem"
          className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Depth</span>
          {(["quick", "standard", "deep"] as const).map((d) => (
            <button key={d} onClick={() => setDepth(d)} className={cn("rounded-full px-3 py-1 capitalize", depth === d ? "bg-foreground text-background" : "glass")}>{d}</button>
          ))}
        </div>
        <button onClick={go} disabled={busy || !topic.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Generate notes
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

/* ---- AI Study Planner ---- */
function StudyPlannerPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [goal, setGoal] = useState("");
  const [weeks, setWeeks] = useState(4);
  const [hpw, setHpw] = useState(6);
  const [subjects, setSubjects] = useState("");
  const [deadline, setDeadline] = useState("");
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    if (!goal.trim()) return;
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({
        goal, weeks, hours_per_week: hpw,
        subjects: subjects.split(",").map((s) => s.trim()).filter(Boolean),
        deadline: deadline || undefined,
        language: profile?.preferred_language ?? "English",
      });
      const acc = await streamSam("learn_study_planner", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `Study plan · ${goal.slice(0, 60)}`, kind: "study_plan", content: acc });
      await addGoal(userId, `Study: ${goal.slice(0, 80)}`, `${weeks} weeks · ${hpw}h/week`, deadline || undefined);
      await bumpStreakAndXp(userId, 4, 8);
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic"> Study Planner</div>
        <input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Goal e.g. Pass AWS SAA · Master React"
          className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <input value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Subjects (comma separated)"
          className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs text-muted-foreground">Weeks
            <input type="number" min={1} max={12} value={weeks} onChange={(e) => setWeeks(Math.max(1, Math.min(12, Number(e.target.value))))} className="mt-1 w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-muted-foreground">Hours / wk
            <input type="number" min={1} max={40} value={hpw} onChange={(e) => setHpw(Math.max(1, Math.min(40, Number(e.target.value))))} className="mt-1 w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
          </label>
          <label className="text-xs text-muted-foreground">Deadline
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
          </label>
        </div>
        <button onClick={go} disabled={busy || !goal.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Compass className="h-4 w-4" />} Build my plan
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

/* ---- AI Exam Predictor ---- */
function ExamPredictorPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [subject, setSubject] = useState("");
  const [syllabus, setSyllabus] = useState("");
  const [style, setStyle] = useState<"school" | "university" | "competitive" | "certification">("university");
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    if (!subject.trim() || !syllabus.trim()) return;
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({
        subject, syllabus, level: profile?.education_level ?? "any",
        exam_style: style, language: profile?.preferred_language ?? "English",
      });
      const acc = await streamSam("learn_exam_predict", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `Exam predict · ${subject}`, kind: "exam_predict", content: acc });
      await bumpStreakAndXp(userId, 5, 10);
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic"> Exam Predictor</div>
        <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject e.g. Organic Chemistry"
          className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <textarea rows={3} value={syllabus} onChange={(e) => setSyllabus(e.target.value)} placeholder="Paste syllabus / topics covered…"
          className="w-full resize-none rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Style</span>
          {(["school", "university", "competitive", "certification"] as const).map((s) => (
            <button key={s} onClick={() => setStyle(s)} className={cn("rounded-full px-3 py-1 capitalize", style === s ? "bg-foreground text-background" : "glass")}>{s}</button>
          ))}
        </div>
        <button onClick={go} disabled={busy || !subject.trim() || !syllabus.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />} Predict likely questions
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

/* ---- AI Career Recommender ---- */
function CareerRecoPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true); setOut("");
    try {
      const [lessons, quizzes] = await Promise.all([listLessons(userId, 30), listQuizzes(userId, 20)]);
      const payload = JSON.stringify({
        level: profile?.education_level ?? "any",
        interests: profile?.interests ?? [],
        goals: profile?.goals ?? "",
        recent_topics: lessons.slice(0, 12).map((l) => l.topic),
        quiz_scores: quizzes.slice(0, 10).map((q) => ({ topic: q.topic, pct: q.total ? Math.round(((q.score ?? 0) / q.total) * 100) : 0 })),
        language: profile?.preferred_language ?? "English",
      });
      const acc = await streamSam("learn_career_reco", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: "Career recommendation", kind: "career_reco", content: acc });
      await grantBadge(userId, "career_explored", "Career Explorer", "Ran an career recommendation");
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic"> Career Recommender</div>
        <div className="text-xs text-muted-foreground">Analyses your saved lessons, quiz scores and interests to suggest fitting paths.</div>
        <button onClick={go} disabled={busy} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />} Recommend paths
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}

/* ---- AI Lesson Translator ---- */
const TRANSLATE_LANGS = [
  "English", "Hindi", "Spanish", "French", "German", "Italian", "Portuguese", "Arabic",
  "Japanese", "Korean", "Mandarin", "Russian", "Turkish", "Dutch", "Swedish", "Polish",
  "Bengali", "Tamil", "Telugu", "Marathi", "Urdu", "Vietnamese", "Thai", "Indonesian",
];
function TranslatorPanel({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("Spanish");
  const [out, setOut] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { void listLessons(userId, 20).then(setLessons); }, [userId]);
  async function go() {
    if (!source.trim()) return;
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({ content: source, target_language: target, preserve_markdown: true });
      const acc = await streamSam("learn_translate", [{ role: "user", content: payload }], setOut);
      await saveLesson(userId, { topic: `Translated → ${target}`, kind: "translation", content: acc });
    } catch { toast.error("Failed"); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic"> Lesson Translator</div>
        {lessons.length > 0 && (
          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto pb-1">
            {lessons.map((l) => (
              <button key={l.id} onClick={() => setSource(l.content)} className="glass shrink-0 rounded-full px-3 py-1.5 text-[11px]">
                {l.topic.slice(0, 32)}
              </button>
            ))}
          </div>
        )}
        <textarea rows={5} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Paste any lesson, notes or text…"
          className="w-full resize-none rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Translate to</span>
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="flex-1 rounded-full border border-border bg-white/50 px-3 py-2 text-sm">
            {TRANSLATE_LANGS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <button onClick={go} disabled={busy || !source.trim()} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40" style={{ background: panelBg() }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <GlobeLock className="h-4 w-4" />} Translate
        </button>
        <div className="text-[10px] text-muted-foreground">Native lang: {profile?.preferred_language ?? "English"}</div>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm whitespace-pre-wrap animate-fade-up">{out}</div>}
    </div>
  );
}


/* ================= LIBRARY TAB ================= */
function LibraryTab({ userId }: { userId: string }) {
  const [items, setItems] = useState<LessonRow[]>([]);
  const [open, setOpen] = useState<LessonRow | null>(null);
  useEffect(() => { void listLessons(userId, 50).then(setItems); }, [userId]);
  if (items.length === 0) {
    return <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">Your lessons will show up here.</div>;
  }
  return (
    <div className="space-y-2">
      {items.map((l, i) => (
        <button key={l.id} onClick={() => setOpen(l)} className="glass w-full rounded-2xl p-3 text-left animate-fade-up" style={{ animationDelay: `${i * 15}ms` }}>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">{l.kind}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</span>
          </div>
          <div className="mt-1 font-display italic">{l.topic}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{l.content.replace(/[#*_`]/g, "").slice(0, 160)}</div>
        </button>
      ))}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4 animate-fade-in" onClick={() => setOpen(null)}>
          <div className="glass-strong max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">{open.kind}</span>
              <div className="flex-1 font-display italic">{open.topic}</div>
              <button onClick={() => setOpen(null)} className="glass flex h-8 w-8 items-center justify-center rounded-full"><X className="h-4 w-4" /></button>
            </div>
            <div className="whitespace-pre-wrap text-sm">{open.content}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= PROGRESS TAB ================= */
function ProgressTab({ userId, profile }: { userId: string; profile: LearningProfile | null }) {
  const [stats, setStats] = useState<{ minutesTotal: number; sessionsTotal: number; weekChart: Record<string, number>; weekMinutes: number } | null>(null);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [weak, setWeak] = useState(""); const [busyWeak, setBusyWeak] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");

  async function reload() {
    const [s, q, g, b] = await Promise.all([progressStats(userId), listQuizzes(userId), listGoals(userId), listBadges(userId)]);
    setStats(s); setQuizzes(q); setGoals(g); setBadges(b);
  }
  useEffect(() => { void reload(); const ch = supabase.channel("prog"+userId).on("postgres_changes", { event: "*", schema: "public", table: "learning_progress", filter: `user_id=eq.${userId}` }, () => reload()).subscribe(); return () => { supabase.removeChannel(ch); }; }, [userId]);

  async function detectWeak() {
    setBusyWeak(true); setWeak("");
    try {
      const payload = JSON.stringify({
        progress: quizzes.map((q) => ({ topic: q.topic, score: q.score ?? 0, total: q.total ?? 0 })),
        recent_quizzes: quizzes.slice(0, 5).map((q) => ({ topic: q.topic, score: q.score ?? 0, total: q.total ?? 0 })),
      });
      await streamSam("weak_topics", [{ role: "user", content: payload }], setWeak);
    } finally { setBusyWeak(false); }
  }

  async function saveGoal() {
    if (!goalTitle.trim()) return;
    await addGoal(userId, goalTitle.trim());
    setGoalTitle(""); reload();
  }

  const chart = stats?.weekChart ?? {};
  const days = Object.entries(chart);
  const max = Math.max(...days.map(([, v]) => v), profile?.daily_goal_minutes ?? 20, 1);

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-1 flex items-center gap-2"><BarChart3 className="h-4 w-4" /><div className="font-display italic">This week</div></div>
        <div className="text-xs text-muted-foreground">{stats?.weekMinutes ?? 0} min · {stats?.sessionsTotal ?? 0} lifetime sessions</div>
        <div className="mt-3 flex h-28 items-end gap-2">
          {days.map(([d, v]) => (
            <div key={d} className="flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t-lg" style={{ height: `${Math.max(4, (v / max) * 100)}%`, background: "linear-gradient(180deg, oklch(0.65 0.18 260), oklch(0.7 0.18 300))" }} />
              <div className="text-[9px] text-muted-foreground">{new Date(d).toLocaleDateString(undefined, { weekday: "narrow" })}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-display italic">Weak topic detection</div>
          <button onClick={detectWeak} disabled={busyWeak || quizzes.length === 0} className="rounded-full bg-foreground px-3 py-1 text-xs text-background disabled:opacity-40">Analyse</button>
        </div>
        {quizzes.length === 0 ? <div className="text-xs text-muted-foreground">Take a quiz to unlock analytics.</div> :
          weak ? <div className="whitespace-pre-wrap text-sm">{weak}</div> : <div className="text-xs text-muted-foreground">Tap analyse for insights.</div>}
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="mb-2 font-display italic">Daily learning goals</div>
        <div className="flex gap-2">
          <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="Add a goal…"
            className="flex-1 rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
          <button onClick={saveGoal} className="rounded-full bg-primary px-4 text-xs text-primary-foreground"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="mt-2 space-y-1.5">
          {goals.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded-2xl bg-white/40 p-2">
              <button onClick={() => { updateGoal(g.id, { done: !g.done }).then(reload); }} className={cn("flex h-5 w-5 items-center justify-center rounded-full border", g.done && "border-primary bg-primary text-primary-foreground")}>
                {g.done && <Check className="h-3 w-3" />}
              </button>
              <div className={cn("flex-1 text-sm", g.done && "line-through text-muted-foreground")}>{g.title}</div>
              <button onClick={() => { deleteGoal(g.id).then(reload); }} className="text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {goals.length === 0 && <div className="text-xs text-muted-foreground">Set daily targets to build momentum.</div>}
        </div>
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="mb-2 font-display italic">Achievements</div>
        {badges.length === 0 ? <div className="text-xs text-muted-foreground">Complete lessons and quizzes to earn badges.</div> :
          <div className="grid grid-cols-2 gap-2">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-2xl bg-white/40 p-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-white shadow" style={{ background: "linear-gradient(135deg, #f5d76e, #d4af37)" }}><Award className="h-4 w-4" /></div>
                <div>
                  <div className="text-xs font-medium">{b.title}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-1">{b.description}</div>
                </div>
              </div>
            ))}
          </div>}
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="mb-2 flex items-center justify-between"><div className="font-display italic">Recent quizzes</div><span className="text-[11px] text-muted-foreground">{quizzes.length}</span></div>
        {quizzes.length === 0 ? <div className="text-xs text-muted-foreground">No quizzes yet.</div> :
          <div className="space-y-1.5">
            {quizzes.slice(0, 8).map((q) => (
              <div key={q.id} className="flex items-center gap-2 rounded-2xl bg-white/40 p-2 text-sm">
                <ScrollText className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 line-clamp-1">{q.topic}</div>
                <div className="text-xs font-medium">{q.score ?? "—"}/{q.total ?? "?"}</div>
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}
