// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, GraduationCap, Brain, Trophy, Flame, Target,
  BookOpen, Award, ChevronRight, Send, Loader2, PlayCircle, ClipboardList,
  Cpu, Database, Code2, Shield, Boxes, Briefcase, LineChart, Landmark,
  Palette, Megaphone, Languages, Rocket, Beaker, Sigma, FileCheck2,
  Layers, Zap, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { streamSam } from "@/lib/stream-sam";
import {
  getProfile, upsertProfile, saveLesson, listLessons, saveQuiz, finishQuiz,
  listQuizzes, listBadges, progressStats, bumpStreakAndXp,
  type LearningProfile, type LessonRow, type QuizRow, type Badge,
} from "@/lib/api/learning";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/education/")({
  component: EducationHub,
  head: () => ({
    meta: [
      { title: "Education Purpose · Samsta" },
      { name: "description", content: "A futuristic learning academy— dashboard, lessons, practice and certificates in one premium experience." },
      { property: "og:title", content: "Education Purpose · Samsta" },
      { property: "og:description", content: "Learn, practice, test and earn certificates with Sam." },
    ],
  }),
});

type Tab = "dashboard" | "learn" | "practice" | "certificates";

const PATHS = [
  { key: "jee", label: "IIT JEE", I: Sigma, g: "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.72 0.14 280))" },
  { key: "neet", label: "NEET", I: Beaker, g: "linear-gradient(135deg, oklch(0.80 0.13 140), oklch(0.72 0.15 120))" },
  { key: "prog", label: "Programming", I: Code2, g: "linear-gradient(135deg, oklch(0.80 0.13 160), oklch(0.72 0.15 180))" },
  { key: "cyber", label: "Cyber Security", I: Shield, g: "linear-gradient(135deg, oklch(0.72 0.14 20), oklch(0.68 0.16 10))" },
  { key: "block", label: "Blockchain", I: Boxes, g: "linear-gradient(135deg, oklch(0.80 0.13 80), oklch(0.75 0.15 60))" },
  { key: "biz", label: "Business", I: Briefcase, g: "linear-gradient(135deg, oklch(0.78 0.12 40), oklch(0.72 0.14 20))" },
  { key: "fin", label: "Finance", I: LineChart, g: "linear-gradient(135deg, oklch(0.80 0.12 150), oklch(0.72 0.14 130))" },
  { key: "upsc", label: "UPSC / IAS", I: Landmark, g: "linear-gradient(135deg, oklch(0.78 0.13 30), oklch(0.72 0.15 10))" },
  { key: "ai", label: "Artificial Intelligence", I: Cpu, g: "linear-gradient(135deg, oklch(0.78 0.13 260), oklch(0.72 0.15 290))" },
  { key: "ds", label: "Data Science", I: Database, g: "linear-gradient(135deg, oklch(0.82 0.12 200), oklch(0.75 0.14 230))" },
  { key: "design", label: "Design", I: Palette, g: "linear-gradient(135deg, oklch(0.82 0.12 320), oklch(0.75 0.14 340))" },
  { key: "mkt", label: "Marketing", I: Megaphone, g: "linear-gradient(135deg, oklch(0.80 0.13 60), oklch(0.72 0.15 40))" },
  { key: "lang", label: "Languages", I: Languages, g: "linear-gradient(135deg, oklch(0.80 0.12 220), oklch(0.72 0.14 240))" },
  { key: "pd", label: "Personal Growth", I: Rocket, g: "linear-gradient(135deg, oklch(0.82 0.12 100), oklch(0.75 0.14 80))" },
] as const;

function EducationHub() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [profile, setProfile] = useState<LearningProfile | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    void (async () => setProfile(await getProfile(user.id)))();
  }, [user, loading, navigate]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen pb-36" style={{
      background: "radial-gradient(1200px 700px at 15% -10%, oklch(0.94 0.06 260 / 0.55), transparent 60%), radial-gradient(900px 500px at 100% 0%, oklch(0.93 0.07 160 / 0.5), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-lg italic leading-tight">Education Purpose</div>
          <div className="text-[11px] text-muted-foreground">Your personal academy</div>
        </div>
        <div className="glass rounded-full px-3 py-1.5 text-[11px] font-medium flex items-center gap-1">
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          {profile?.streak_days ?? 0}d
        </div>
      </header>

      <main className="animate-fade-up">
        {tab === "dashboard" && <DashboardView user={user} profile={profile} onGo={setTab} />}
        {tab === "learn" && <LearnView user={user} profile={profile} />}
        {tab === "practice" && <PracticeView user={user} profile={profile} />}
        {tab === "certificates" && <CertificatesView user={user} />}
      </main>

      <BottomTabs tab={tab} onChange={setTab} />
    </div>
  );
}

/* ─────────────── DASHBOARD ─────────────── */
function DashboardView({ user, profile, onGo }: { user: any; profile: LearningProfile | null; onGo: (t: Tab) => void }) {
  const [stats, setStats] = useState<{ minutesTotal: number; sessionsTotal: number; weekMinutes: number; weekChart: Record<string, number> } | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  useEffect(() => {
    void (async () => {
      setStats(await progressStats(user.id));
      setBadges(await listBadges(user.id));
    })();
  }, [user.id]);

  const xp = profile?.xp ?? 0;
  const level = Math.floor(xp / 200) + 1;
  const levelProgress = (xp % 200) / 200;
  const dailyGoal = profile?.daily_goal_minutes ?? 20;
  const todayMin = stats ? Object.values(stats.weekChart).slice(-1)[0] || 0 : 0;
  const dailyProgress = Math.min(1, todayMin / Math.max(1, dailyGoal));

  return (
    <div className="px-4 pt-4 space-y-5">
      {/* Hero — Knowledge level + rings */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-70 blur-3xl animate-aurora"
          style={{ background: "oklch(0.9 0.11 260)" }} />
        <div aria-hidden className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full opacity-60 blur-3xl"
          style={{ background: "oklch(0.9 0.11 150)" }} />
        <div className="relative flex items-center gap-5">
          <ProgressRing progress={levelProgress} size={110}>
            <div className="text-center">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Level</div>
              <div className="font-display text-3xl italic leading-none">{level}</div>
              <div className="text-[10px] text-muted-foreground">{xp} XP</div>
            </div>
          </ProgressRing>
          <div className="flex-1 min-w-0">
            <div className="font-display italic text-xl leading-tight">Welcome back{profile?.education_level ? "," : ""}</div>
            <div className="text-[12px] text-muted-foreground line-clamp-2">
              {profile?.goals || "Set a goal in Learn to unlock a personalised roadmap."}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onGo("learn")} className="rounded-full bg-foreground text-background text-[11px] font-semibold px-3 py-1.5 flex items-center gap-1">
                <PlayCircle className="h-3.5 w-3.5" /> Start lesson
              </button>
              <button onClick={() => onGo("practice")} className="glass rounded-full text-[11px] font-medium px-3 py-1.5 flex items-center gap-1">
                <Brain className="h-3.5 w-3.5" /> Quick quiz
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Target className="h-4 w-4" />} label="Daily goal" value={`${todayMin}/${dailyGoal}m`} progress={dailyProgress} tint="oklch(0.9 0.11 150)" />
        <StatCard icon={<Flame className="h-4 w-4" />} label="Streak" value={`${profile?.streak_days ?? 0} days`} progress={Math.min(1, (profile?.streak_days ?? 0) / 30)} tint="oklch(0.9 0.11 30)" />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="This week" value={`${stats?.weekMinutes ?? 0}m`} progress={Math.min(1, (stats?.weekMinutes ?? 0) / (dailyGoal * 7))} tint="oklch(0.9 0.11 260)" />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Badges" value={`${badges.length}`} progress={Math.min(1, badges.length / 10)} tint="oklch(0.9 0.11 80)" />
      </div>

      {/* Knowledge library — moved here from the social Explore area */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          to="/knowledge-feed"
          className="glass relative overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.97]"
        >
          <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
            style={{ background: "oklch(0.9 0.09 260)" }} />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))" }}>
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="relative mt-2 font-display text-base italic leading-tight">Knowledge feed</div>
          <div className="relative text-[10px] text-muted-foreground">Articles · notes · PDFs</div>
        </Link>
        <Link
          to="/edu-reels"
          className="glass relative overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.97]"
        >
          <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
            style={{ background: "oklch(0.9 0.09 150)" }} />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.13 150), oklch(0.72 0.14 170))" }}>
            <PlayCircle className="h-5 w-5" />
          </div>
          <div className="relative mt-2 font-display text-base italic leading-tight">Learning reels</div>
          <div className="relative text-[10px] text-muted-foreground">Short lessons on loop</div>
        </Link>
      </div>

      {/* Weekly sparkline */}
      {stats && (
        <div className="glass rounded-3xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-display italic text-base leading-tight">Weekly focus</div>
              <div className="text-[11px] text-muted-foreground">Minutes per day</div>
            </div>
            <div className="text-[11px] text-muted-foreground">{stats.weekMinutes}m total</div>
          </div>
          <div className="flex items-end gap-1.5 h-20">
            {Object.entries(stats.weekChart).map(([d, v]) => {
              const max = Math.max(1, ...Object.values(stats.weekChart));
              const h = Math.max(6, (v / max) * 78);
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md" style={{ height: h, background: "linear-gradient(180deg, oklch(0.78 0.13 260), oklch(0.72 0.15 200))" }} />
                  <div className="text-[9px] text-muted-foreground">{d.slice(-2)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Learning paths */}
      <section>
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="font-display italic text-lg"> Learning Paths</div>
          <span className="text-[11px] text-muted-foreground">{PATHS.length} tracks</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {PATHS.map((p) => {
            const live = p.key === "jee" || p.key === "neet";
            if (live) {
              return (
                <Link key={p.key} to="/education/$catKey" params={{ catKey: p.key }}
                  className="glass group relative overflow-hidden rounded-2xl p-3 text-left transition-transform active:scale-[0.97]">
                  <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-60 blur-2xl" style={{ background: p.g }} />
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md mb-2" style={{ background: p.g }}>
                    <p.I className="h-4 w-4" />
                  </div>
                  <div className="relative font-medium text-[13px] leading-tight">{p.label}</div>
                  <div className="relative text-[10px] text-muted-foreground mt-0.5">curated</div>
                  <span className="absolute right-2 top-2 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white shadow">Live</span>
                </Link>
              );
            }
            return (
              <div key={p.key}
                role="button"
                aria-disabled="true"
                tabIndex={-1}
                onClick={(e) => e.preventDefault()}
                className="glass relative overflow-hidden rounded-2xl p-3 text-left cursor-not-allowed select-none">
                <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-40 blur-2xl" style={{ background: p.g }} />
                <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl"
                  style={{ background: "linear-gradient(140deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))", backdropFilter: "blur(6px)" }} />
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md mb-2 opacity-80" style={{ background: p.g }}>
                  <p.I className="h-4 w-4" />
                </div>
                <div className="relative font-medium text-[13px] leading-tight opacity-80">{p.label}</div>
                <div className="relative text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Preparing content
                </div>
                <span className="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white shadow-lg border border-white/30 overflow-hidden"
                  style={{ background: "linear-gradient(135deg, oklch(0.72 0.16 260), oklch(0.82 0.17 320), oklch(0.78 0.15 290))", boxShadow: "0 4px 14px oklch(0.6 0.18 300 / 0.35)" }}>
                  <span className="relative z-10 flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    Coming soon
                  </span>
                  <span aria-hidden className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    style={{ backgroundSize: "200% 100%" }} />
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, progress, tint }: { icon: React.ReactNode; label: string; value: string; progress: number; tint: string }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-3">
      <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: tint }} />
      <div className="relative flex items-center gap-2 text-muted-foreground text-[11px]">{icon}{label}</div>
      <div className="relative font-display italic text-2xl leading-tight mt-1">{value}</div>
      <div className="relative mt-2 h-1 rounded-full bg-foreground/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, background: "linear-gradient(90deg, oklch(0.78 0.13 260), oklch(0.75 0.15 200))" }} />
      </div>
    </div>
  );
}

function ProgressRing({ progress, size = 100, children }: { progress: number; size?: number; children?: React.ReactNode }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity="0.1" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ring)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))} className="transition-all duration-700" />
        <defs>
          <linearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.78 0.13 260)" />
            <stop offset="100%" stopColor="oklch(0.82 0.13 20)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/* ─────────────── LEARN ─────────────── */
function LearnView({ user, profile }: { user: any; profile: LearningProfile | null }) {
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = async () => setLessons(await listLessons(user.id, 10));
  useEffect(() => { void refresh(); }, [user.id]);

  const run = async () => {
    if (!topic.trim()) { toast.info("Type a topic to learn"); return; }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true); setOut("");
    try {
      const payload = JSON.stringify({ topic, level: profile?.education_level ?? "any", language: profile?.preferred_language ?? "English" });
      let acc = "";
      await streamSam("learn_lesson", [{ role: "user", content: payload }], (a) => { acc = a; setOut(a); }, ctrl.signal);
      await saveLesson(user.id, { topic, kind: "lesson", content: acc });
      await bumpStreakAndXp(user.id, 5, 10);
      await refresh();
      toast.success("+10 XP · lesson saved");
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message ?? "Sam couldn't teach that");
    } finally { setLoading(false); }
  };

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl text-white animate-orb" style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            <GraduationCap className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display italic text-base leading-tight">Sam Tutor</div>
            <div className="text-[11px] text-muted-foreground">Ask anything — full lesson in seconds</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Neural networks, Kanban, LBO valuation"
            className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          <button onClick={run} disabled={loading}
            className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Teach
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {["Transformers", "Compound interest", "React hooks", "Photosynthesis", "SQL joins"].map((s) => (
            <button key={s} onClick={() => setTopic(s)} className="rounded-full border border-foreground/10 text-[10px] px-2 py-1 bg-background/50">
              {s}
            </button>
          ))}
        </div>
        {(out || loading) && (
          <div className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90 max-h-[50vh] overflow-y-auto">
            {out}{loading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
          </div>
        )}
      </div>

      <section>
        <div className="font-display italic text-lg px-1 mb-2">Recent lessons</div>
        {lessons.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">No lessons yet — ask Sam to teach you something above.</div>
        )}
        <div className="space-y-2">
          {lessons.map((l) => (
            <div key={l.id} className="glass rounded-2xl p-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                <div className="font-medium text-sm truncate flex-1">{l.topic}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</div>
              </div>
              <div className="text-[12px] text-muted-foreground line-clamp-2 mt-1">{l.content.slice(0, 220)}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─────────────── PRACTICE ─────────────── */
function PracticeView({ user, profile }: { user: any; profile: LearningProfile | null }) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizRow | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<QuizRow[]>([]);

  const refresh = async () => setHistory(await listQuizzes(user.id, 8));
  useEffect(() => { void refresh(); }, [user.id]);

  const generate = async () => {
    if (!topic.trim()) { toast.info("Pick a topic"); return; }
    setLoading(true); setQuiz(null); setSubmitted(false); setAnswers([]);
    try {
      const payload = JSON.stringify({ topic, level: profile?.education_level ?? "any", count: 5, language: profile?.preferred_language ?? "English", mixed_difficulty: false });
      let acc = "";
      await streamSam("quiz_generator", [{ role: "user", content: payload }], (a) => { acc = a; });
      const json = safeJson(acc);
      const questions = json?.questions ?? json;
      if (!Array.isArray(questions) || !questions.length) throw new Error("No quiz produced");
      const saved = await saveQuiz(user.id, topic, "quiz", questions);
      setQuiz(saved);
      setAnswers(new Array(questions.length).fill(-1));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not build quiz");
    } finally { setLoading(false); }
  };

  const submit = async () => {
    if (!quiz) return;
    const score = quiz.questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0);
    await finishQuiz(quiz.id, answers, score);
    await bumpStreakAndXp(user.id, 5, 5 + score * 3);
    setSubmitted(true);
    toast.success(`Score ${score}/${quiz.questions.length} · +${5 + score * 3} XP`);
    await refresh();
  };

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl text-white" style={{ background: "linear-gradient(135deg, oklch(0.80 0.13 160), oklch(0.72 0.15 180))" }}>
            <Brain className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display italic text-base leading-tight">Practice Hub</div>
            <div className="text-[11px] text-muted-foreground">generated quiz· instant feedback</div>
          </div>
        </div>
        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic to be tested on"
            className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40" />
          <button onClick={generate} disabled={loading}
            className="rounded-full bg-foreground text-background px-4 py-2 text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Quiz me
          </button>
        </div>
      </div>

      {quiz && (
        <div className="space-y-3">
          {quiz.questions.map((q, i) => {
            const picked = answers[i];
            return (
              <div key={i} className="glass rounded-2xl p-3">
                <div className="text-[12px] text-muted-foreground">Question {i + 1}</div>
                <div className="font-medium text-sm mt-0.5">{q.q}</div>
                <div className="mt-2 grid gap-1.5">
                  {q.choices.map((c: string, ci: number) => {
                    const correct = submitted && ci === q.answer;
                    const wrong = submitted && picked === ci && ci !== q.answer;
                    return (
                      <button key={ci} disabled={submitted}
                        onClick={() => setAnswers((a) => { const n = [...a]; n[i] = ci; return n; })}
                        className={cn(
                          "text-left rounded-xl border px-3 py-2 text-[13px] transition",
                          picked === ci ? "border-foreground/60 bg-foreground/5" : "border-foreground/10 bg-background/40",
                          correct && "border-emerald-500/60 bg-emerald-500/10",
                          wrong && "border-rose-500/60 bg-rose-500/10",
                        )}>
                        {c}
                      </button>
                    );
                  })}
                </div>
                {submitted && q.explain && (
                  <div className="text-[11px] text-muted-foreground mt-2">💡 {q.explain}</div>
                )}
              </div>
            );
          })}
          {!submitted && (
            <button onClick={submit} disabled={answers.some((a) => a < 0)}
              className="w-full rounded-full bg-foreground text-background py-2.5 text-sm font-semibold disabled:opacity-40">
              Submit answers
            </button>
          )}
        </div>
      )}

      <section>
        <div className="font-display italic text-lg px-1 mb-2">Recent attempts</div>
        {history.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Take your first quiz to see history.</div>
        )}
        <div className="space-y-2">
          {history.map((q) => (
            <div key={q.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <ClipboardList className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{q.topic}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(q.taken_at).toLocaleDateString()} · {q.kind}</div>
              </div>
              <div className="text-sm font-semibold">
                {q.score ?? "–"}<span className="text-muted-foreground">/{q.total}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function safeJson(s: string): any {
  try { return JSON.parse(s); } catch {}
  const m = s.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

/* ─────────────── CERTIFICATES ─────────────── */
function CertificatesView({ user }: { user: any }) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  useEffect(() => {
    void (async () => {
      setBadges(await listBadges(user.id));
      setQuizzes(await listQuizzes(user.id, 50));
    })();
  }, [user.id]);

  const passed = quizzes.filter((q) => q.score != null && q.total && q.score / q.total >= 0.7);

  return (
    <div className="px-4 pt-4 space-y-5">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-70 blur-3xl animate-aurora" style={{ background: "oklch(0.9 0.12 80)" }} />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: "linear-gradient(135deg, oklch(0.82 0.13 60), oklch(0.75 0.15 40))" }}>
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display italic text-xl leading-tight">Your credentials</div>
            <div className="text-[12px] text-muted-foreground">{badges.length} badges · {passed.length} passed quizzes</div>
          </div>
        </div>
      </div>

      <section>
        <div className="font-display italic text-lg px-1 mb-2">Badges earned</div>
        {badges.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Complete lessons and quizzes to unlock premium badges.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {badges.map((b) => (
              <div key={b.id} className="glass relative overflow-hidden rounded-2xl p-3">
                <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-60 blur-2xl" style={{ background: "oklch(0.9 0.11 80)" }} />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md mb-2" style={{ background: "linear-gradient(135deg, oklch(0.82 0.13 60), oklch(0.75 0.15 40))" }}>
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="relative font-medium text-[13px] leading-tight">{b.title}</div>
                <div className="relative text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{b.description ?? b.badge_key}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="font-display italic text-lg px-1 mb-2">Certificates</div>
        {passed.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">Score 70%+ on any quiz to earn a certificate.</div>
        ) : (
          <div className="space-y-3">
            {passed.map((q) => (
              <div key={q.id} className="glass-strong relative overflow-hidden rounded-2xl p-4">
                <div aria-hidden className="absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-60 blur-3xl" style={{ background: "oklch(0.9 0.11 260)" }} />
                <div className="relative flex items-center gap-3">
                  <FileCheck2 className="h-6 w-6 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Certificate of Completion</div>
                    <div className="font-display italic text-lg leading-tight truncate">{q.topic}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Score {q.score}/{q.total} · Issued {new Date(q.taken_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────── BOTTOM TABS ─────────────── */
function BottomTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const items: Array<{ key: Tab; label: string; I: any }> = [
    { key: "dashboard", label: "Dashboard", I: Sparkles },
    { key: "learn", label: "Learn", I: GraduationCap },
    { key: "practice", label: "Practice", I: Brain },
    { key: "certificates", label: "Certificates", I: Award },
  ];
  const containerRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (el) {
      const parent = containerRef.current!.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setPill({ left: rect.left - parent.left, width: rect.width });
    }
  }, [tab]);

  return (
    <nav className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 glass-strong rounded-full px-2 py-1.5 shadow-2xl">
      <div ref={containerRef} className="relative flex items-center gap-1">
        <span
          aria-hidden
          className="absolute top-0 bottom-0 rounded-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            left: pill.left,
            width: pill.width,
            background: "linear-gradient(135deg, oklch(0.28 0.02 260), oklch(0.22 0.02 260))",
            boxShadow: "0 8px 24px -6px oklch(0.22 0.02 260 / 0.5)",
          }}
        />
        {items.map((it) => {
          const active = tab === it.key;
          return (
            <button
              key={it.key}
              data-tab={it.key}
              onClick={() => onChange(it.key)}
              className="relative flex flex-col items-center justify-center gap-0.5 rounded-full px-3 py-2 transition-colors duration-300"
            >
              <it.I
                className={cn(
                  "relative h-4 w-4 transition-transform duration-300",
                  active ? "text-background scale-110 animate-bounce-soft" : "text-foreground/70 hover:scale-110"
                )}
              />
              <span
                className={cn(
                  "relative text-[9px] font-semibold uppercase tracking-wider transition-colors duration-300",
                  active ? "text-background" : "text-foreground/70"
                )}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
