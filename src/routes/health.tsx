import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, HeartPulse, Moon, Droplet, Flame, Activity, Brain, Wind,
  Utensils, Dumbbell, Camera, Send, Bot, Sparkles, Download, Bell,
  Plus, Trash2, ShieldAlert, Baby, Watch, Play, Pause, Phone, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/health")({
  component: HealthHub,
  head: () => ({
    meta: [
      { title: "Health Coach & Digital Twin— Samsta" },
      { name: "description", content: "Your Premium Health Hub— daily health scores, meals, workouts, sleep, mood tracking and a personal Health Digital Twin, powered by Sam." },
      { property: "og:title", content: "Health Coach & Digital Twin— Samsta" },
      { property: "og:description", content: "Track health scores, meals, workouts, sleep and mood with a personal Health Digital Twin on Samsta Premium." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://samstaofficial.lovable.app/health" },
    ],
    links: [{ rel: "canonical", href: "https://samstaofficial.lovable.app/health" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        name: "Samsta Health Coach",
        serviceType: "powered health coaching and digital twin",
        provider: { "@type": "Organization", name: "Samsta" },
        url: "https://samstaofficial.lovable.app/health",
      }),
    }],
  }),
});

/* ============================================================
   Local storage store (per-user)
============================================================ */

type Checkin = { date: string; water: number; steps: number; sleep_h: number; sleep_q: 1|2|3|4|5; mood: 1|2|3|4|5; energy: 1|2|3|4|5; stress: 1|2|3|4|5 };
type Meal = { id: string; at: string; dish: string; calories: number; protein: number; carbs: number; fat: number; score: number; tags: string[] };
type WorkoutLog = { id: string; at: string; title: string; duration_min: number; blocks: number };
type Reminder = { id: string; kind: "water" | "medicine" | "habit"; label: string; time: string; on: boolean };
type Contact = { id: string; name: string; phone: string };
type State = {
  checkins: Checkin[];
  meals: Meal[];
  workouts: WorkoutLog[];
  reminders: Reminder[];
  contacts: Contact[];
  women_mode: boolean;
  period_start?: string;
  cycle_len: number;
  goal: string;
  level: "beginner" | "intermediate" | "advanced";
};

const DEFAULT: State = {
  checkins: [], meals: [], workouts: [], reminders: [
    { id: "r1", kind: "water", label: "Drink water", time: "10:00", on: true },
    { id: "r2", kind: "habit", label: "10-min stretch", time: "18:30", on: true },
  ], contacts: [], women_mode: false, cycle_len: 28,
  goal: "More energy", level: "beginner",
};

const keyFor = (uid: string) => `samsta:health:${uid}`;

function useStore(uid: string) {
  const [s, setS] = useState<State>(DEFAULT);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(uid));
      if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) });
    } catch { /* noop */ }
  }, [uid]);
  useEffect(() => {
    try { localStorage.setItem(keyFor(uid), JSON.stringify(s)); } catch { /* noop */ }
  }, [uid, s]);
  return [s, setS] as const;
}

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

/* ============================================================
   Score math
============================================================ */

function scores(s: State) {
  const last7 = s.checkins.slice(-7);
  const avg = <K extends keyof Checkin>(k: K, def = 0) =>
    last7.length ? last7.reduce((a, c) => a + Number(c[k] ?? 0), 0) / last7.length : def;
  const water = avg("water", 4);
  const steps = avg("steps", 2000);
  const sleep_h = avg("sleep_h", 6);
  const sleep_q = avg("sleep_q", 3);
  const mood = avg("mood", 3);
  const energy = avg("energy", 3);
  const stress = avg("stress", 3);

  const sleepScore = Math.min(100, Math.round((sleep_h / 8) * 60 + (sleep_q / 5) * 40));
  const hydrationScore = Math.min(100, Math.round((water / 8) * 100));
  const energyScore = Math.round((energy / 5) * 100);
  const stressScore = Math.round((1 - (stress - 1) / 4) * 100); // lower stress = higher score
  const recoveryScore = Math.round((sleepScore * 0.5 + stressScore * 0.35 + (100 - Math.min(100, (steps / 12000) * 100)) * 0.15));
  const activityScore = Math.min(100, Math.round((steps / 8000) * 100));
  const healthScore = Math.round(
    sleepScore * 0.25 + hydrationScore * 0.15 + energyScore * 0.15 +
    stressScore * 0.15 + activityScore * 0.2 + (mood / 5) * 100 * 0.1
  );
  return { healthScore, recoveryScore, sleepScore, hydrationScore, energyScore, stressScore, activityScore, mood: Math.round((mood/5)*100) };
}

/* ============================================================
   Reusable premium UI
============================================================ */

function Ring({ value, size = 96, stroke = 9, label, sub, color }: { value: number; size?: number; stroke?: number; label: string; sub?: string; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" className="text-foreground/10" strokeWidth={stroke} fill="none" />
          <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-xl italic">{Math.round(value)}</div>
          {sub && <div className="text-[9px] text-muted-foreground">{sub}</div>}
        </div>
      </div>
      <div className="mt-1.5 text-[10px] font-medium tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function SectionTitle({ icon, title, kicker }: { icon: React.ReactNode; title: string; kicker?: string }) {
  return (
    <div className="mb-2 flex items-end justify-between px-1">
      <div>
        <div className="font-display text-lg italic">{title}</div>
        {kicker && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{kicker}</div>}
      </div>
      <div className="text-muted-foreground">{icon}</div>
    </div>
  );
}

/* ============================================================
   Main
============================================================ */

type Tab = "dash" | "meals" | "workout" | "sleep" | "mind" | "reminders" | "women" | "sos" | "coach";

function HealthHub() {
  const { user, loading } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (!loading && user && !isPremium) navigate({ to: "/premium" }); }, [loading, user, isPremium, navigate]);
  if (loading || !user) return <div className="min-h-screen animate-pulse bg-background" />;
  return <HealthInner userId={user.id} />;
}

function HealthInner({ userId }: { userId: string }) {
  const [s, setS] = useStore(userId);
  const [tab, setTab] = useState<Tab>("dash");
  const sc = useMemo(() => scores(s), [s]);

  const tabs: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: "dash", label: "Dashboard", icon: <HeartPulse className="h-3.5 w-3.5" /> },
    { k: "meals", label: "Meals", icon: <Utensils className="h-3.5 w-3.5" /> },
    { k: "workout", label: "Workout", icon: <Dumbbell className="h-3.5 w-3.5" /> },
    { k: "sleep", label: "Sleep", icon: <Moon className="h-3.5 w-3.5" /> },
    { k: "mind", label: "Mind", icon: <Brain className="h-3.5 w-3.5" /> },
    { k: "reminders", label: "Reminders", icon: <Bell className="h-3.5 w-3.5" /> },
    { k: "women", label: "Women", icon: <Baby className="h-3.5 w-3.5" /> },
    { k: "sos", label: "SOS", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { k: "coach", label: "Coach", icon: <Bot className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen pb-28">
      {/* Aurora */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[380px] opacity-70"
        style={{ background: "radial-gradient(60% 60% at 20% 10%, oklch(0.9 0.12 25 / 0.35), transparent), radial-gradient(60% 60% at 80% 10%, oklch(0.85 0.14 340 / 0.35), transparent)" }} />

      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants" className="glass flex h-10 w-10 items-center justify-center rounded-full"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.75 0.14 350))" }}>
          <HeartPulse className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg italic leading-tight">Health Coach</div>
          <div className="text-[11px] text-muted-foreground">Your personal Health Digital Twin</div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-[64px] z-20 -mx-1 flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition",
              tab === t.k ? "bg-foreground text-background" : "glass")}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <main className="relative z-10 px-4 pt-2">
        {tab === "dash" && <Dashboard s={s} setS={setS} sc={sc} />}
        {tab === "meals" && <Meals s={s} setS={setS} />}
        {tab === "workout" && <Workout s={s} setS={setS} />}
        {tab === "sleep" && <Sleep s={s} setS={setS} sc={sc} />}
        {tab === "mind" && <Mind />}
        {tab === "reminders" && <Reminders s={s} setS={setS} />}
        {tab === "women" && <Women s={s} setS={setS} />}
        {tab === "sos" && <SOS s={s} setS={setS} />}
        {tab === "coach" && <Coach s={s} sc={sc} />}
      </main>
    </div>
  );
}

/* ============================================================
   Dashboard
============================================================ */

function Dashboard({ s, setS, sc }: { s: State; setS: (fn: (p: State) => State) => void; sc: ReturnType<typeof scores> }) {
  const [tempReport, setTempReport] = useState("");
  const [busy, setBusy] = useState(false);
  const t = today();
  const todayC = s.checkins.find(c => c.date === t);
  const upsert = (patch: Partial<Checkin>) => setS(p => {
    const others = p.checkins.filter(c => c.date !== t);
    const base: Checkin = todayC ?? { date: t, water: 0, steps: 0, sleep_h: 7, sleep_q: 3, mood: 3, energy: 3, stress: 3 };
    return { ...p, checkins: [...others, { ...base, ...patch }].sort((a, b) => a.date.localeCompare(b.date)) };
  });

  const genReport = async () => {
    setBusy(true); setTempReport("");
    try {
      const ctx = { scores: sc, last14: s.checkins.slice(-14), goal: s.goal, recent_meals: s.meals.slice(-5), workouts: s.workouts.slice(-3) };
      await streamSam("health_report", [{ role: "user", content: JSON.stringify(ctx) }], (acc) => setTempReport(acc));
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      {/* Health digital twin hero */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5 animate-fade-up">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-40" style={{ background: "oklch(0.85 0.15 340)" }} />
        <div className="flex items-start gap-4">
          <Ring value={sc.healthScore} size={112} stroke={11} label="Health" color="oklch(0.75 0.16 15)" />
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Your health digital twin</div>
            <div className="mt-1 font-display text-xl italic">
              {sc.healthScore >= 80 ? "You're thriving." : sc.healthScore >= 60 ? "You're on track." : "Let's rebuild momentum."}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Predicts fatigue and stress from your last {s.checkins.length || 0} check-ins. Update today's numbers to sharpen predictions.
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={genReport} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs text-background disabled:opacity-50">
                <Sparkles className="h-3.5 w-3.5" /> {busy ? "Preparing…" : "Weekly report"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scores */}
      <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <SectionTitle icon={<Activity className="h-4 w-4" />} title="Live scores" kicker="Rolling 7-day" />
        <div className="grid grid-cols-3 gap-3 pt-1 sm:grid-cols-6">
          <Ring value={sc.recoveryScore} label="Recovery" color="oklch(0.72 0.14 160)" />
          <Ring value={sc.stressScore}   label="Stress"   color="oklch(0.75 0.14 25)" />
          <Ring value={sc.energyScore}   label="Energy"   color="oklch(0.82 0.13 80)" />
          <Ring value={sc.sleepScore}    label="Sleep"    color="oklch(0.72 0.12 265)" />
          <Ring value={sc.hydrationScore} label="Hydration" color="oklch(0.75 0.12 220)" />
          <Ring value={sc.activityScore} label="Activity" color="oklch(0.78 0.15 140)" />
        </div>
      </div>

      {/* Today check-in */}
      <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <SectionTitle icon={<Droplet className="h-4 w-4" />} title="Today" kicker="Quick check-in" />
        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Water (glasses)" value={todayC?.water ?? 0} onChange={(v) => upsert({ water: v })} icon={<Droplet className="h-3.5 w-3.5" />} />
          <Stepper label="Steps (×1000)" value={Math.round(((todayC?.steps ?? 0) / 1000))} onChange={(v) => upsert({ steps: v * 1000 })} icon={<Flame className="h-3.5 w-3.5" />} />
          <SliderRow label="Sleep hrs" value={todayC?.sleep_h ?? 7} onChange={(v) => upsert({ sleep_h: v })} min={3} max={10} step={0.5} />
          <SliderRow label="Sleep quality" value={todayC?.sleep_q ?? 3} onChange={(v) => upsert({ sleep_q: v as 1|2|3|4|5 })} min={1} max={5} step={1} />
          <SliderRow label="Mood" value={todayC?.mood ?? 3} onChange={(v) => upsert({ mood: v as 1|2|3|4|5 })} min={1} max={5} step={1} />
          <SliderRow label="Stress" value={todayC?.stress ?? 3} onChange={(v) => upsert({ stress: v as 1|2|3|4|5 })} min={1} max={5} step={1} />
        </div>
      </div>

      {/* Wearable placeholder */}
      <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "180ms" }}>
        <SectionTitle icon={<Watch className="h-4 w-4" />} title="Wearables" kicker="Coming online" />
        <div className="grid grid-cols-3 gap-2">
          {["Apple Health", "Google Fit", "Fitbit"].map((n) => (
            <button key={n} onClick={() => toast.success(`${n} — pairing simulated`)}
              className="rounded-2xl border border-foreground/10 p-3 text-left transition hover:bg-foreground/5">
              <div className="text-xs font-medium">{n}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">Tap to connect</div>
            </button>
          ))}
        </div>
      </div>

      {tempReport && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Weekly report" kicker="generated" />
          <article className="whitespace-pre-wrap text-sm leading-relaxed">{tempReport}</article>
          <div className="mt-3 flex justify-end">
            <button onClick={() => {
              const blob = new Blob([tempReport], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url; a.download = "samsta-health-report.txt"; a.click();
              URL.revokeObjectURL(url);
            }} className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs">
              <Download className="h-3.5 w-3.5" /> Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ label, value, onChange, icon }: { label: string; value: number; onChange: (v: number) => void; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">{icon}{label}</div>
      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="h-8 w-8 rounded-full glass">−</button>
        <div className="font-display text-2xl italic">{value}</div>
        <button onClick={() => onChange(value + 1)} className="h-8 w-8 rounded-full bg-foreground text-background">+</button>
      </div>
    </div>
  );
}
function SliderRow({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-3">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span><span className="font-display text-sm italic normal-case text-foreground">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-foreground" />
    </div>
  );
}

/* ============================================================
   Meals
============================================================ */

function Meals({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = async (text: string) => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      let acc = "";
      await streamSam("health_meal", [{ role: "user", content: text }], (a) => (acc = a));
      const cleaned = acc.replace(/```json|```/g, "").trim();
      const j = JSON.parse(cleaned);
      const m: Meal = { id: uid(), at: new Date().toISOString(), dish: j.dish, calories: j.calories, protein: j.protein_g, carbs: j.carbs_g, fat: j.fat_g, score: j.score, tags: j.tags ?? [] };
      setS(p => ({ ...p, meals: [m, ...p.meals].slice(0, 60) }));
      setDesc("");
      toast.success(`${j.dish} · ${j.calories} kcal`);
    } catch (e) { toast.error("Couldn't analyze that meal — try more detail."); }
    setBusy(false);
  };

  const onPhoto = async (f: File | null) => {
    if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    await analyze(`Photo of: ${name}. Estimate typical serving.`);
  };

  const totals = s.meals.filter(m => m.at.slice(0,10) === today()).reduce((a, m) => ({
    kcal: a.kcal + m.calories, p: a.p + m.protein, c: a.c + m.carbs, f: a.f + m.fat
  }), { kcal: 0, p: 0, c: 0, f: 0 });

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Utensils className="h-4 w-4" />} title="Meal Planner" kicker="Scan · analyze · improve" />
        <div className="grid grid-cols-4 gap-2 text-center">
          <Stat label="kcal" value={Math.round(totals.kcal)} />
          <Stat label="P (g)" value={Math.round(totals.p)} />
          <Stat label="C (g)" value={Math.round(totals.c)} />
          <Stat label="F (g)" value={Math.round(totals.f)} />
        </div>
        <div className="mt-3 flex gap-2">
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. paneer wrap + lassi"
            className="flex-1 rounded-full bg-background/60 px-4 py-2 text-sm outline-none border border-foreground/10" />
          <button onClick={() => analyze(desc)} disabled={busy || !desc.trim()}
            className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-50">
            {busy ? "…" : "Analyze"}
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-full glass px-3">
            <Camera className="h-4 w-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
        </div>
      </div>

      <div className="space-y-2">
        {s.meals.length === 0 && <Empty text="No meals yet. Scan or type something you ate." />}
        {s.meals.map((m, i) => (
          <div key={m.id} className="glass rounded-2xl p-3 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{m.dish}</div>
                <div className="text-[10px] text-muted-foreground">{new Date(m.at).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-lg italic">{m.calories}<span className="text-xs text-muted-foreground"> kcal</span></div>
                <div className="text-[10px] text-muted-foreground">P {m.protein} · C {m.carbs} · F {m.fat}</div>
              </div>
              <button onClick={() => setS(p => ({ ...p, meals: p.meals.filter(x => x.id !== m.id) }))}
                className="ml-2 h-8 w-8 rounded-full glass"><Trash2 className="mx-auto h-3.5 w-3.5" /></button>
            </div>
            {m.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.tags.map(t => <span key={t} className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px]">{t}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/40 p-2">
      <div className="font-display text-lg italic">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">{text}</div>;
}

/* ============================================================
   Workout
============================================================ */

type Plan = { title: string; duration_min: number; blocks: { name: string; sets: number; reps: string; rest_s: number; cue: string }[]; cooldown: string; notes: string };

function Workout({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const [goal, setGoal] = useState(s.goal);
  const [level, setLevel] = useState(s.level);
  const [mins, setMins] = useState(30);
  const [equip, setEquip] = useState("bodyweight");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const [reps, setReps] = useState(0);

  const build = async () => {
    setBusy(true);
    try {
      let acc = "";
      await streamSam("health_workout", [{ role: "user", content: JSON.stringify({ goal, level, minutes: mins, equipment: equip }) }], (a) => (acc = a));
      const j = JSON.parse(acc.replace(/```json|```/g, "").trim()) as Plan;
      setPlan(j); setActive(null); setReps(0);
      setS(p => ({ ...p, goal, level }));
    } catch { toast.error("Couldn't build a plan — try again."); }
    setBusy(false);
  };

  const complete = () => {
    if (!plan) return;
    setS(p => ({ ...p, workouts: [{ id: uid(), at: new Date().toISOString(), title: plan.title, duration_min: plan.duration_min, blocks: plan.blocks.length }, ...p.workouts].slice(0, 30) }));
    toast.success("Nice work — logged.");
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Dumbbell className="h-4 w-4" />} title="Workout Coach" kicker="Personalized · voice cues" />
        <div className="grid grid-cols-2 gap-2">
          <select value={goal} onChange={(e) => setGoal(e.target.value)} className="rounded-2xl bg-background/60 px-3 py-2 text-sm border border-foreground/10">
            {["Lose weight","Build muscle","More energy","Better sleep","Reduce stress","Mobility"].map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={level} onChange={(e) => setLevel(e.target.value as State["level"])} className="rounded-2xl bg-background/60 px-3 py-2 text-sm border border-foreground/10">
            {["beginner","intermediate","advanced"].map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={equip} onChange={(e) => setEquip(e.target.value)} className="rounded-2xl bg-background/60 px-3 py-2 text-sm border border-foreground/10">
            {["bodyweight","dumbbells","resistance band","full gym"].map(o => <option key={o}>{o}</option>)}
          </select>
          <input type="number" value={mins} onChange={(e) => setMins(Number(e.target.value))} min={10} max={90} className="rounded-2xl bg-background/60 px-3 py-2 text-sm border border-foreground/10" placeholder="Minutes" />
        </div>
        <button onClick={build} disabled={busy} className="mt-3 w-full rounded-full bg-foreground py-2 text-sm text-background disabled:opacity-50">
          {busy ? "Building your plan…" : "Generate today's plan"}
        </button>
      </div>

      {plan && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="font-display text-lg italic">{plan.title}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{plan.duration_min} min · {plan.blocks.length} blocks</div>
            </div>
            <button onClick={complete} className="rounded-full glass px-3 py-1.5 text-xs">Log</button>
          </div>
          <ol className="space-y-2">
            {plan.blocks.map((b, i) => (
              <li key={i} className={cn("rounded-2xl border p-3 transition", active === i ? "border-foreground/40 bg-foreground/5" : "border-foreground/10")}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-[11px] text-muted-foreground">{b.sets} × {b.reps} · rest {b.rest_s}s</div>
                    <div className="mt-1 text-[11px] italic text-muted-foreground">{b.cue}</div>
                  </div>
                  <button onClick={() => { setActive(active === i ? null : i); setReps(0); }} className="h-9 w-9 rounded-full bg-foreground text-background">
                    {active === i ? <Pause className="mx-auto h-4 w-4" /> : <Play className="mx-auto h-4 w-4" />}
                  </button>
                </div>
                {active === i && (
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-background/60 p-2">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Rep counter</div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setReps(Math.max(0, reps - 1))} className="h-8 w-8 rounded-full glass">−</button>
                      <div className="font-display text-2xl italic">{reps}</div>
                      <button onClick={() => setReps(reps + 1)} className="h-8 w-8 rounded-full bg-foreground text-background">+</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-2xl bg-foreground/5 p-3 text-xs">
            <div className="font-medium">Cooldown</div><div className="text-muted-foreground">{plan.cooldown}</div>
          </div>
          {plan.notes && <div className="mt-2 text-[11px] italic text-muted-foreground">{plan.notes}</div>}
        </div>
      )}

      {s.workouts.length > 0 && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <SectionTitle icon={<Activity className="h-4 w-4" />} title="Recent workouts" />
          <ul className="space-y-2">
            {s.workouts.slice(0, 5).map(w => (
              <li key={w.id} className="flex items-center justify-between rounded-xl bg-background/40 p-2 text-sm">
                <div>{w.title}</div>
                <div className="text-[11px] text-muted-foreground">{w.duration_min}min · {new Date(w.at).toLocaleDateString()}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Sleep
============================================================ */

function Sleep({ s, setS, sc }: { s: State; setS: (fn: (p: State) => State) => void; sc: ReturnType<typeof scores> }) {
  const [hours, setHours] = useState(7);
  const [quality, setQuality] = useState<1|2|3|4|5>(3);
  const [wakes, setWakes] = useState(0);
  const [analysis, setAnalysis] = useState("");
  const [busy, setBusy] = useState(false);
  const analyze = async () => {
    setBusy(true); setAnalysis("");
    try {
      await streamSam("health_sleep", [{ role: "user", content: JSON.stringify({ hours, quality_1_5: quality, wake_ups: wakes }) }], (a) => setAnalysis(a));
      const t = today();
      setS(p => {
        const others = p.checkins.filter(c => c.date !== t);
        const base = p.checkins.find(c => c.date === t) ?? { date: t, water: 0, steps: 0, mood: 3, energy: 3, stress: 3 } as Checkin;
        return { ...p, checkins: [...others, { ...base, sleep_h: hours, sleep_q: quality } as Checkin].sort((a,b) => a.date.localeCompare(b.date)) };
      });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-5 animate-fade-up">
        <div className="flex items-center gap-4">
          <Ring value={sc.sleepScore} size={110} stroke={11} label="Sleep score" color="oklch(0.72 0.14 265)" />
          <div className="flex-1">
            <div className="font-display text-xl italic">Restore your night</div>
            <p className="text-xs text-muted-foreground">Log last night, get a tailored wind-down plan.</p>
          </div>
        </div>
      </div>
      <div className="glass rounded-3xl p-4 space-y-3 animate-fade-up">
        <SliderRow label="Hours slept" value={hours} min={3} max={10} step={0.5} onChange={setHours} />
        <SliderRow label="Quality (1–5)" value={quality} min={1} max={5} step={1} onChange={(v) => setQuality(v as 1|2|3|4|5)} />
        <SliderRow label="Wake-ups" value={wakes} min={0} max={6} step={1} onChange={setWakes} />
        <button onClick={analyze} disabled={busy} className="w-full rounded-full bg-foreground py-2 text-sm text-background disabled:opacity-50">
          {busy ? "Analyzing…" : "Analyze last night"}
        </button>
      </div>
      {analysis && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <article className="whitespace-pre-wrap text-sm leading-relaxed">{analysis}</article>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Mind (Mood + Meditation + Breathing)
============================================================ */

function Mind() {
  const [mood, setMood] = useState("");
  const [moodOut, setMoodOut] = useState("");
  const [medOut, setMedOut] = useState("");
  const [medMin, setMedMin] = useState(5);
  const [busy, setBusy] = useState(false);
  const [breathing, setBreathing] = useState(false);

  const doMood = async () => {
    if (!mood.trim()) return; setBusy(true); setMoodOut("");
    try { await streamSam("health_mood", [{ role: "user", content: mood }], (a) => setMoodOut(a)); }
    catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const doMed = async () => {
    setBusy(true); setMedOut("");
    try { await streamSam("health_meditate", [{ role: "user", content: JSON.stringify({ mood: mood || "calm", minutes: medMin }) }], (a) => setMedOut(a)); }
    catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Brain className="h-4 w-4" />} title="Mood check" kicker="Gentle · private" />
        <textarea value={mood} onChange={(e) => setMood(e.target.value)} placeholder="How are you feeling right now?" rows={3}
          className="w-full resize-none rounded-2xl bg-background/60 p-3 text-sm outline-none border border-foreground/10" />
        <button onClick={doMood} disabled={busy || !mood.trim()} className="mt-2 rounded-full bg-foreground px-4 py-1.5 text-xs text-background disabled:opacity-50">Talk it through</button>
        {moodOut && <article className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{moodOut}</article>}
      </div>

      <div className="glass rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Wind className="h-4 w-4" />} title="Box breathing" kicker="4 · 4 · 4 · 4" />
        <div className="flex flex-col items-center py-3">
          <div className={cn("h-24 w-24 rounded-full transition-all duration-[4000ms] ease-in-out", breathing ? "scale-150 opacity-90" : "scale-100 opacity-60")}
            style={{ background: "radial-gradient(circle, oklch(0.85 0.12 220), oklch(0.7 0.14 260))" }} />
          <div className="mt-3 text-xs text-muted-foreground">{breathing ? "Breathe with the orb" : "Tap to begin"}</div>
          <button onClick={() => setBreathing(b => !b)} className="mt-3 rounded-full glass px-4 py-1.5 text-xs">{breathing ? "Stop" : "Start"}</button>
        </div>
      </div>

      <div className="glass rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="Guided meditation" />
        <div className="flex items-center gap-2">
          {[3, 5, 10].map(m => (
            <button key={m} onClick={() => setMedMin(m)} className={cn("rounded-full px-3 py-1 text-xs", medMin === m ? "bg-foreground text-background" : "glass")}>{m} min</button>
          ))}
          <button onClick={doMed} disabled={busy} className="ml-auto rounded-full bg-foreground px-4 py-1.5 text-xs text-background disabled:opacity-50">Begin</button>
        </div>
        {medOut && <article className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{medOut}</article>}
      </div>
    </div>
  );
}

/* ============================================================
   Reminders
============================================================ */

function Reminders({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const [label, setLabel] = useState(""); const [time, setTime] = useState("09:00"); const [kind, setKind] = useState<Reminder["kind"]>("water");
  const add = () => {
    if (!label.trim()) return;
    setS(p => ({ ...p, reminders: [...p.reminders, { id: uid(), kind, label, time, on: true }] }));
    setLabel("");
  };
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Bell className="h-4 w-4" />} title="Reminders" kicker="Water · medicine · habits" />
        <div className="grid grid-cols-6 gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value as Reminder["kind"])} className="col-span-2 rounded-2xl bg-background/60 px-2 py-2 text-xs border border-foreground/10">
            <option value="water">Water</option><option value="medicine">Medicine</option><option value="habit">Habit</option>
          </select>
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="col-span-3 rounded-2xl bg-background/60 px-3 py-2 text-xs border border-foreground/10" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="col-span-1 rounded-2xl bg-background/60 px-2 py-2 text-xs border border-foreground/10" />
        </div>
        <button onClick={add} className="mt-2 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1.5 text-xs text-background"><Plus className="h-3.5 w-3.5" />Add</button>
      </div>
      <ul className="space-y-2">
        {s.reminders.map((r, i) => (
          <li key={r.id} className="glass flex items-center justify-between rounded-2xl p-3 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div>
              <div className="text-sm font-medium">{r.label}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-widest">{r.kind} · {r.time}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setS(p => ({ ...p, reminders: p.reminders.map(x => x.id === r.id ? { ...x, on: !x.on } : x) }))}
                className={cn("h-6 w-11 rounded-full transition", r.on ? "bg-foreground" : "bg-foreground/20")}>
                <span className={cn("block h-5 w-5 translate-y-0.5 rounded-full bg-background transition", r.on ? "translate-x-5" : "translate-x-0.5")} />
              </button>
              <button onClick={() => setS(p => ({ ...p, reminders: p.reminders.filter(x => x.id !== r.id) }))} className="h-8 w-8 rounded-full glass">
                <Trash2 className="mx-auto h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   Women's mode
============================================================ */

function Women({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const start = s.period_start ? new Date(s.period_start) : null;
  const daysSince = start ? Math.floor((Date.now() - start.getTime()) / 86400000) : null;
  const cycleDay = daysSince != null ? (daysSince % s.cycle_len) + 1 : null;
  const fertileWindow = cycleDay != null && cycleDay >= 10 && cycleDay <= 17;
  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Baby className="h-4 w-4" />} title="Women's health" kicker="Cycle · fertility · pregnancy" />
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Enable to track cycle & symptoms</div>
          <button onClick={() => setS(p => ({ ...p, women_mode: !p.women_mode }))}
            className={cn("h-6 w-11 rounded-full transition", s.women_mode ? "bg-foreground" : "bg-foreground/20")}>
            <span className={cn("block h-5 w-5 translate-y-0.5 rounded-full bg-background transition", s.women_mode ? "translate-x-5" : "translate-x-0.5")} />
          </button>
        </div>
      </div>
      {s.women_mode && (
        <div className="glass rounded-3xl p-4 space-y-3 animate-fade-up">
          <label className="block text-[10px] uppercase tracking-widest text-muted-foreground">Last period started</label>
          <input type="date" value={s.period_start ?? ""} onChange={(e) => setS(p => ({ ...p, period_start: e.target.value }))}
            className="w-full rounded-2xl bg-background/60 px-3 py-2 text-sm border border-foreground/10" />
          <SliderRow label="Cycle length" value={s.cycle_len} min={21} max={40} step={1} onChange={(v) => setS(p => ({ ...p, cycle_len: v }))} />
          {cycleDay != null && (
            <div className="rounded-2xl bg-foreground/5 p-3 text-sm">
              <div className="font-medium">Cycle day {cycleDay} of {s.cycle_len}</div>
              <div className="mt-1 text-xs text-muted-foreground">{fertileWindow ? "Fertile window — higher conception chance." : "Outside fertile window."}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SOS
============================================================ */

function SOS({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const [name, setName] = useState(""); const [phone, setPhone] = useState("");
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  const shareLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation unavailable");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); toast.success("Location captured"); },
      () => toast.error("Location denied"),
    );
  };

  const trigger = () => {
    if (s.contacts.length === 0) return toast.error("Add an emergency contact first");
    const link = loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : "Location not shared";
    const body = encodeURIComponent(`SOS — I need help. My location: ${link}`);
    const contact = s.contacts[0];
    window.location.href = `sms:${contact.phone}?body=${body}`;
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<ShieldAlert className="h-4 w-4" />} title="Emergency mode" kicker="Fall detection · SOS · live location" />
        <div className="flex flex-col items-center py-3">
          <button onClick={trigger} className="relative h-32 w-32 rounded-full text-white shadow-xl transition active:scale-95"
            style={{ background: "radial-gradient(circle, oklch(0.75 0.18 25), oklch(0.55 0.2 20))" }}>
            <span className="absolute inset-0 animate-ping rounded-full opacity-30" style={{ background: "oklch(0.75 0.18 25)" }} />
            <span className="relative font-display text-2xl italic">SOS</span>
          </button>
          <div className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground">Hold to send</div>
        </div>
        <div className="flex gap-2">
          <button onClick={shareLocation} className="flex-1 rounded-full glass px-3 py-2 text-xs inline-flex items-center justify-center gap-1">
            <MapPin className="h-3.5 w-3.5" />{loc ? "Location saved" : "Share live location"}
          </button>
        </div>
      </div>
      <div className="glass rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Phone className="h-4 w-4" />} title="Emergency contacts" />
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-2xl bg-background/60 px-3 py-2 text-xs border border-foreground/10" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="rounded-2xl bg-background/60 px-3 py-2 text-xs border border-foreground/10" />
        </div>
        <button onClick={() => { if (!name || !phone) return; setS(p => ({ ...p, contacts: [...p.contacts, { id: uid(), name, phone }] })); setName(""); setPhone(""); }}
          className="mt-2 rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Add contact</button>
        <ul className="mt-3 space-y-2">
          {s.contacts.map(c => (
            <li key={c.id} className="flex items-center justify-between rounded-xl bg-background/40 p-2 text-sm">
              <div>{c.name} <span className="text-muted-foreground">· {c.phone}</span></div>
              <button onClick={() => setS(p => ({ ...p, contacts: p.contacts.filter(x => x.id !== c.id) }))} className="h-7 w-7 rounded-full glass">
                <Trash2 className="mx-auto h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Coach chat
============================================================ */

function Coach({ s, sc }: { s: State; sc: ReturnType<typeof scores> }) {
  const [msgs, setMsgs] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim(); if (!text || busy) return;
    setInput(""); setBusy(true);
    const context = `USER CONTEXT: scores=${JSON.stringify(sc)}, goal=${s.goal}, recent workouts=${s.workouts.slice(0,3).map(w=>w.title).join(", ") || "none"}, last meals=${s.meals.slice(0,3).map(m=>m.dish).join(", ") || "none"}.`;
    const next = [...msgs, { role: "user" as const, content: text }, { role: "assistant" as const, content: "" }];
    setMsgs(next);
    try {
      await streamSam("health_chat", [
        { role: "system", content: context },
        ...next.filter(m => m.content || m.role === "user").map(m => ({ role: m.role, content: m.content })),
      ], (acc) => setMsgs(m => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: acc }; return copy; }));
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  const starters = ["Design my morning routine", "Why am I always tired?", "5-min desk stretch", "Best foods for energy"];

  return (
    <div className="flex h-[70vh] flex-col gap-3">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-2">
        {msgs.length === 0 && (
          <div className="glass-strong rounded-3xl p-4 animate-fade-up">
            <div className="font-display text-lg italic">Ask your Health Coach</div>
            <p className="mt-1 text-xs text-muted-foreground">Grounded in your live scores and habits.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starters.map(s => <button key={s} onClick={() => setInput(s)} className="rounded-full glass px-3 py-1 text-xs">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-sm leading-relaxed",
              m.role === "user" ? "bg-foreground text-background" : "glass")}>
              {m.content || (busy && i === msgs.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>
      <div className="glass-strong flex items-center gap-2 rounded-full p-1.5">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about sleep, energy, workouts…" className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button onClick={send} disabled={busy || !input.trim()} className="h-9 w-9 rounded-full bg-foreground text-background disabled:opacity-50">
          <Send className="mx-auto h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
