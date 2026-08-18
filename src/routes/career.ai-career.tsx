import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CareerShell, GlassCard } from "@/components/samsta/CareerShell";
import { useAuthUser } from "@/hooks/use-auth";
import { streamSam } from "@/lib/stream-sam";
import {
  listGoals, listTasks, listMilestones, listApplications, listResumes,
  listInterviews, listLearningPaths, listScores, listReminders, listNotifications,
  createGoal, createTask, toggleTask, createMilestone, achieveMilestone,
  trackApplication, saveResume, saveCoverLetter, saveInterview, saveRoadmap,
  saveLearningPath, recordScore, addReminder, computeGrowthScore, markNotificationRead,
  type CareerGoal, type CareerTask, type CareerApplication,
} from "@/lib/api/ai-career";
import {
  Sparkles, Brain, Target, ListChecks, Trophy, FileText, ScanLine, MessagesSquare,
  GraduationCap, Users, Building2, ChartBar, Bell, Rocket, Plus, Check, Loader2,
  Send, ArrowRight, ClipboardList, LineChart, ShieldCheck, Bookmark, Wand2,
} from "lucide-react";

export const Route = createFileRoute("/career/ai-career")({
  component: AICareerHub,
  head: () => ({
    meta: [
      { title: "Career Coach· Samsta" },
      { name: "description", content: "Your 24×7 powered career coach— roadmaps, ATS resumes, mock interviews, job match, learning and networking." },
    ],
  }),
});

type Tab =
  | "dashboard" | "coach" | "goals" | "tasks" | "roadmap" | "resume" | "ats"
  | "cover" | "interview" | "intelligence" | "jobs" | "learning" | "networking"
  | "productivity" | "analytics" | "reminders" | "security";

const TABS: { k: Tab; l: string; I: typeof Brain }[] = [
  { k: "dashboard", l: "Dashboard", I: LineChart },
  { k: "coach", l: "24×7 Mentor", I: Brain },
  { k: "goals", l: "Goals", I: Target },
  { k: "tasks", l: "Tasks", I: ListChecks },
  { k: "roadmap", l: "Roadmap", I: Rocket },
  { k: "resume", l: "Resume", I: FileText },
  { k: "ats", l: "ATS", I: ScanLine },
  { k: "cover", l: "Cover Letter", I: ClipboardList },
  { k: "interview", l: "Interview", I: MessagesSquare },
  { k: "intelligence", l: "Intelligence", I: Sparkles },
  { k: "jobs", l: "Jobs", I: Building2 },
  { k: "learning", l: "Learning", I: GraduationCap },
  { k: "networking", l: "Network", I: Users },
  { k: "productivity", l: "Productivity", I: Wand2 },
  { k: "analytics", l: "Analytics", I: ChartBar },
  { k: "reminders", l: "Reminders", I: Bell },
  { k: "security", l: "Security", I: ShieldCheck },
];

function AICareerHub() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { user, loading } = useAuthUser();

  if (loading) return <CareerShell title="Career"><Loading /></CareerShell>;
  if (!user) return <CareerShell title="Career"><SignIn /></CareerShell>;

  return (
    <CareerShell title="Career Coach" subtitle="24×7 personalized career mentor, powered by Sam.">
      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs transition ${tab === t.k ? "border-[#e8c874]/60 bg-[#e8c874]/15 text-[#e8c874]" : "border-white/10 bg-white/[0.03] text-white/70"}`}>
            <t.I className="mr-1 inline h-3.5 w-3.5" />{t.l}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <Dashboard userId={user.id} />}
      {tab === "coach" && <AIChat tool="ac_mentor" title="24×7 Career Mentor" placeholder="Ask about roles, promotions, transitions, decisions…" />}
      {tab === "goals" && <Goals userId={user.id} />}
      {tab === "tasks" && <Tasks userId={user.id} />}
      {tab === "roadmap" && <Roadmap userId={user.id} />}
      {tab === "resume" && <Resume userId={user.id} />}
      {tab === "ats" && <AIChat tool="ac_ats" title="ATS Resume Score" placeholder="Paste resume text (and target job title / JD)…" />}
      {tab === "cover" && <CoverLetter userId={user.id} />}
      {tab === "interview" && <Interview userId={user.id} />}
      {tab === "intelligence" && <Intelligence />}
      {tab === "jobs" && <Jobs userId={user.id} />}
      {tab === "learning" && <Learning userId={user.id} />}
      {tab === "networking" && <Networking />}
      {tab === "productivity" && <Productivity />}
      {tab === "analytics" && <Analytics userId={user.id} />}
      {tab === "reminders" && <Reminders userId={user.id} />}
      {tab === "security" && <Security />}
    </CareerShell>
  );
}

/* ---------- small primitives ---------- */
function Loading() { return <div className="flex items-center justify-center py-16 text-white/50"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>; }
function SignIn() { return <GlassCard className="p-6 text-center text-white/70">Sign in to unlock your Career hub.</GlassCard>; }
function Empty({ text }: { text: string }) { return <GlassCard className="p-5 text-center text-xs text-white/50">{text}</GlassCard>; }
function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 mt-1 flex items-baseline justify-between">
      <h2 className="font-display text-xl italic text-white">{title}</h2>
      {hint && <span className="text-[10px] uppercase tracking-widest text-white/40">{hint}</span>}
    </div>
  );
}

/* ---------- AI chat runner ---------- */
function AIChat({ tool, title, placeholder }: { tool: string; title: string; placeholder: string }) {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!input.trim()) return;
    setBusy(true); setOut("");
    try { await streamSam(tool, [{ role: "user", content: input }], (a) => setOut(a)); }
    catch (e) { setOut(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <div>
      <SectionHead title={title} hint="" />
      <GlassCard className="space-y-3 p-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder={placeholder}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30" />
        <button onClick={run} disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white active:scale-[0.98] disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Thinking…" : "Generate"}
        </button>
      </GlassCard>
      {out && <GlassCard className="mt-4 whitespace-pre-wrap p-4 text-sm text-white/85">{out}</GlassCard>}
    </div>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<CareerGoal[]>([]);
  const [tasks, setTasks] = useState<CareerTask[]>([]);
  const [apps, setApps] = useState<CareerApplication[]>([]);
  const [notifs, setNotifs] = useState<Awaited<ReturnType<typeof listNotifications>>>([]);
  useEffect(() => {
    (async () => {
      const [g, t, a, n] = await Promise.all([
        listGoals(userId), listTasks(userId), listApplications(userId), listNotifications(userId),
      ]);
      setGoals(g); setTasks(t); setApps(a); setNotifs(n);
    })().catch(() => {});
  }, [userId]);

  const done = tasks.filter((t) => t.status === "done").length;
  const growth = useMemo(() => computeGrowthScore({
    goals: goals.length, tasksDone: done, milestones: 0, applications: apps.length, interviews: 0, learningPaths: 0,
  }), [goals.length, done, apps.length]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Growth Score" value={`${growth}`} sub="/ 100" I={LineChart} />
        <StatCard label="Active goals" value={String(goals.filter((g) => g.status === "active").length)} sub={`${goals.length} total`} I={Target} />
        <StatCard label="Tasks done" value={String(done)} sub={`${tasks.length} total`} I={ListChecks} />
        <StatCard label="Applications" value={String(apps.length)} sub="lifetime" I={Building2} />
      </div>
      <GlassCard className="p-4">
        <SectionHead title="Today's focus" hint="" />
        {tasks.filter((t) => t.status !== "done").slice(0, 5).length === 0 ? (
          <Empty text="No open tasks. Set a goal or generate daily tasks in the Tasks tab." />
        ) : (
          <ul className="space-y-2">
            {tasks.filter((t) => t.status !== "done").slice(0, 5).map((t) => (
              <li key={t.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/85">
                <span className="h-2 w-2 rounded-full bg-[#e8c874]" />
                <span className="flex-1">{t.title}</span>
                <span className="text-[10px] uppercase tracking-wider text-white/40">{t.priority}</span>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
      <GlassCard className="p-4">
        <SectionHead title="Notifications" hint={`${notifs.filter((n) => !n.read).length} unread`} />
        {notifs.length === 0 ? <Empty text="You're all caught up." /> : (
          <ul className="space-y-2">
            {notifs.slice(0, 6).map((n) => (
              <li key={n.id} onClick={() => { markNotificationRead(n.id); setNotifs((xs) => xs.map((x) => x.id === n.id ? { ...x, read: true } : x)); }}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-sm ${n.read ? "border-white/5 bg-white/[0.02] text-white/50" : "border-[#e8c874]/30 bg-[#e8c874]/5 text-white/90"}`}>
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-[11px] text-white/50">{n.body}</div>}
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}

function StatCard({ label, value, sub, I }: { label: string; value: string; sub: string; I: typeof Target }) {
  return (
    <GlassCard className="p-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/50"><I className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 font-display text-2xl italic text-white">{value}</div>
      <div className="text-[10px] text-white/40">{sub}</div>
    </GlassCard>
  );
}

/* ---------- Goals ---------- */
function Goals({ userId }: { userId: string }) {
  const [rows, setRows] = useState<CareerGoal[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const refresh = () => listGoals(userId).then(setRows).catch(() => {});
  useEffect(() => { refresh(); }, [userId]);
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="New career goal" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Goal title (e.g. Become senior PM in 12 months)" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target role" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <button onClick={async () => { if (!title) return; await createGoal({ user_id: userId, title, target_role: target || null }); setTitle(""); setTarget(""); refresh(); }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#e8c874] py-2.5 text-sm font-bold text-black active:scale-[0.98]"><Plus className="h-4 w-4" /> Add goal</button>
      </GlassCard>
      {rows.length === 0 ? <Empty text="No goals yet." /> : rows.map((g) => (
        <GlassCard key={g.id} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-white">{g.title}</div>
              {g.target_role && <div className="text-[11px] text-white/50">Target: {g.target_role}</div>}
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">{g.status}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[#e8c874]" style={{ width: `${g.progress}%` }} />
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------- Tasks ---------- */
function Tasks({ userId }: { userId: string }) {
  const [rows, setRows] = useState<CareerTask[]>([]);
  const [title, setTitle] = useState("");
  const refresh = () => listTasks(userId).then(setRows).catch(() => {});
  useEffect(() => { refresh(); }, [userId]);
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="Daily career tasks" />
        <div className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
          <button onClick={async () => { if (!title) return; await createTask({ user_id: userId, title, due_date: new Date().toISOString().slice(0, 10) }); setTitle(""); refresh(); }}
            className="rounded-xl bg-[#e8c874] px-3 text-sm font-bold text-black"><Plus className="h-4 w-4" /></button>
        </div>
      </GlassCard>
      <AIChat tool="ac_daily_tasks" title="Generate today's tasks" placeholder='JSON: {"goals":["…"], "hours_available":2}' />
      {rows.length === 0 ? <Empty text="No tasks yet." /> : rows.map((t) => (
        <GlassCard key={t.id} className="flex items-center gap-3 p-3">
          <button onClick={async () => { await toggleTask(t.id, t.status !== "done"); refresh(); }}
            className={`flex h-6 w-6 items-center justify-center rounded-full border ${t.status === "done" ? "border-[#e8c874] bg-[#e8c874] text-black" : "border-white/20"}`}>
            {t.status === "done" && <Check className="h-3.5 w-3.5" />}
          </button>
          <div className="flex-1 text-sm text-white/90">{t.title}</div>
          {t.due_date && <span className="text-[10px] text-white/40">{t.due_date}</span>}
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------- Roadmap ---------- */
function Roadmap({ userId }: { userId: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [weeks, setWeeks] = useState(12);
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate() {
    if (!from || !to) return;
    setBusy(true); setOut("");
    try {
      await streamSam("ac_roadmap", [{ role: "user", content: JSON.stringify({ from_role: from, target_role: to, timeline_weeks: weeks }) }], (a) => setOut(a));
    } finally { setBusy(false); }
  }
  async function save() {
    if (!out) return;
    await saveRoadmap({ user_id: userId, title: `${from} → ${to}`, from_role: from, target_role: to, plan: safeJson(out) });
  }
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="Personalized roadmap" hint="" />
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Current role" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="Target role" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <input type="number" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none" />
        <div className="flex gap-2">
          <button onClick={generate} disabled={busy} className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "…" : "Generate"}</button>
          <button onClick={save} disabled={!out} className="rounded-2xl bg-[#e8c874] px-4 text-sm font-bold text-black disabled:opacity-40"><Bookmark className="h-4 w-4" /></button>
        </div>
      </GlassCard>
      {out && <GlassCard className="whitespace-pre-wrap p-4 text-sm text-white/85">{out}</GlassCard>}
    </div>
  );
}
function safeJson(s: string) { try { return JSON.parse(s); } catch { return { raw: s }; } }

/* ---------- Resume ---------- */
function Resume({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listResumes>>>([]);
  const [target, setTarget] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { listResumes(userId).then(setRows).catch(() => {}); }, [userId]);
  async function build() {
    setBusy(true); setOut("");
    try { await streamSam("ac_resume_builder", [{ role: "user", content: JSON.stringify({ target_role: target, language: "en" }) }], (a) => setOut(a)); }
    finally { setBusy(false); }
  }
  async function save() {
    await saveResume({ user_id: userId, title: target || "Resume", content: safeJson(out) });
    listResumes(userId).then(setRows);
  }
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="resume builder" hint="" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target role" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <div className="flex gap-2">
          <button onClick={build} disabled={busy} className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "…" : "Build"}</button>
          <button onClick={save} disabled={!out} className="rounded-2xl bg-[#e8c874] px-4 text-sm font-bold text-black disabled:opacity-40"><Bookmark className="h-4 w-4" /></button>
        </div>
      </GlassCard>
      {out && <GlassCard className="whitespace-pre-wrap p-4 text-xs text-white/80">{out}</GlassCard>}
      <SectionHead title="Your resumes" hint={`${rows.length}`} />
      {rows.length === 0 ? <Empty text="No saved resumes yet." /> : rows.map((r) => (
        <GlassCard key={r.id} className="p-3">
          <div className="text-sm font-semibold text-white">{r.title}</div>
          <div className="text-[10px] text-white/40">v{r.version} · {r.template} · ATS {r.ats_score ?? "—"}</div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------- Cover letter ---------- */
function CoverLetter({ userId }: { userId: string }) {
  const [job, setJob] = useState("");
  const [co, setCo] = useState("");
  const [jd, setJd] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!job || !co) return;
    setBusy(true); setOut("");
    try { await streamSam("ac_cover_letter", [{ role: "user", content: JSON.stringify({ job_title: job, company: co, job_description: jd }) }], (a) => setOut(a)); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="Cover letter generator" hint="" />
        <input value={job} onChange={(e) => setJob(e.target.value)} placeholder="Job title" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <input value={co} onChange={(e) => setCo(e.target.value)} placeholder="Company" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <textarea value={jd} onChange={(e) => setJd(e.target.value)} rows={4} placeholder="Paste JD (optional)" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30" />
        <div className="flex gap-2">
          <button onClick={run} disabled={busy} className="flex-1 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "…" : "Generate"}</button>
          <button onClick={async () => { if (!out) return; await saveCoverLetter({ user_id: userId, job_title: job, company: co, body: out }); }} disabled={!out} className="rounded-2xl bg-[#e8c874] px-4 text-sm font-bold text-black disabled:opacity-40"><Bookmark className="h-4 w-4" /></button>
        </div>
      </GlassCard>
      {out && <GlassCard className="whitespace-pre-wrap p-4 text-sm text-white/85">{out}</GlassCard>}
    </div>
  );
}

/* ---------- Interview ---------- */
function Interview({ userId }: { userId: string }) {
  const [kind, setKind] = useState<"hr" | "technical" | "coding" | "behavioral">("hr");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [ans, setAns] = useState("");
  const [fb, setFb] = useState("");
  const [busy, setBusy] = useState(false);

  async function nextQ() {
    setBusy(true); setQ("");
    try { await streamSam("ac_mock_interview", [{ role: "user", content: JSON.stringify({ role, kind, turn: "opening", history: [] }) }], (a) => setQ(a)); }
    finally { setBusy(false); }
  }
  async function grade() {
    if (!q || !ans) return;
    setBusy(true); setFb("");
    try {
      await streamSam("ac_interview_feedback", [{ role: "user", content: JSON.stringify({ question: q, answer: ans, role, kind }) }], (a) => setFb(a));
      await saveInterview({ user_id: userId, kind, role, mode: "text", transcript: [{ q, a: ans }], feedback: fb });
    } finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="Mock Interview" hint="" />
        <div className="flex flex-wrap gap-2">
          {(["hr","technical","coding","behavioral"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-full border px-3 py-1 text-xs ${kind === k ? "border-[#e8c874]/60 bg-[#e8c874]/15 text-[#e8c874]" : "border-white/10 text-white/60"}`}>{k}</button>
          ))}
        </div>
        <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role, e.g. Frontend Engineer" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <button onClick={nextQ} disabled={busy || !role} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">Get question</button>
      </GlassCard>
      {q && (
        <GlassCard className="space-y-2 p-4">
          <div className="text-sm text-white/90"><span className="text-[10px] uppercase tracking-widest text-white/40">Question</span><div className="mt-1">{q}</div></div>
          <textarea value={ans} onChange={(e) => setAns(e.target.value)} rows={5} placeholder="Your answer…" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30" />
          <button onClick={grade} disabled={busy || !ans} className="w-full rounded-2xl bg-[#e8c874] py-2.5 text-sm font-bold text-black disabled:opacity-60">Score & feedback</button>
        </GlassCard>
      )}
      {fb && <GlassCard className="whitespace-pre-wrap p-4 text-xs text-white/80">{fb}</GlassCard>}
    </div>
  );
}

/* ---------- Intelligence ---------- */
function Intelligence() {
  const items: { tool: string; l: string }[] = [
    { tool: "ac_skill_gap", l: "Skill gap analysis" },
    { tool: "ac_match_score", l: "Career match score" },
    { tool: "ac_readiness_job", l: "Job readiness score" },
    { tool: "ac_promotion", l: "Promotion readiness" },
    { tool: "ac_salary", l: "Salary prediction" },
    { tool: "ac_industry_trends", l: "Industry trends" },
    { tool: "ac_emerging_skills", l: "Emerging skills" },
    { tool: "ac_risk", l: "Career risk analysis" },
    { tool: "ac_future_ops", l: "Future opportunities" },
    { tool: "ac_global", l: "Global career suggestions" },
  ];
  return <ToolGrid items={items} placeholder="Paste JSON context for this analysis…" />;
}
function Jobs({ userId }: { userId: string }) {
  const [rows, setRows] = useState<CareerApplication[]>([]);
  const [t, setT] = useState(""); const [c, setC] = useState("");
  useEffect(() => { listApplications(userId).then(setRows).catch(() => {}); }, [userId]);
  const items: { tool: string; l: string }[] = [
    { tool: "ac_job_match", l: "job matching" },
    { tool: "ac_intern_match", l: "Internship matching" },
    { tool: "ac_recruiter_match", l: "Recruiter matching" },
    { tool: "ac_referral", l: "Referral suggestions" },
    { tool: "ac_remote_jobs", l: "Remote job finder" },
    { tool: "ac_gov_jobs", l: "Government jobs" },
    { tool: "ac_startup_ops", l: "Startup opportunities" },
    { tool: "ac_intl_jobs", l: "International jobs" },
  ];
  return (
    <div className="space-y-4">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="Track application" />
        <input value={t} onChange={(e) => setT(e.target.value)} placeholder="Job title" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <input value={c} onChange={(e) => setC(e.target.value)} placeholder="Company" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <button onClick={async () => { if (!t || !c) return; await trackApplication({ user_id: userId, job_title: t, company: c }); setT(""); setC(""); listApplications(userId).then(setRows); }}
          className="w-full rounded-2xl bg-[#e8c874] py-2.5 text-sm font-bold text-black">One-tap track</button>
      </GlassCard>
      {rows.slice(0, 5).map((r) => (
        <GlassCard key={r.id} className="p-3">
          <div className="text-sm font-semibold text-white">{r.job_title} · {r.company}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">{r.status} · {new Date(r.applied_at).toLocaleDateString()}</div>
        </GlassCard>
      ))}
      <ToolGrid items={items} placeholder="Paste JSON context (profile, target)…" />
    </div>
  );
}
function Learning({ userId }: { userId: string }) {
  const items: { tool: string; l: string }[] = [
    { tool: "ac_learning_path", l: "Learning path" },
    { tool: "ac_course_reco", l: "Course recs" },
    { tool: "ac_cert_reco", l: "Certifications" },
    { tool: "ac_daily_learn", l: "Daily learning" },
    { tool: "ac_mock_test", l: "Mock test" },
    { tool: "ac_skill_verify", l: "Skill verify" },
    { tool: "ac_revision", l: "Revision plan" },
  ];
  void userId;
  return <ToolGrid items={items} placeholder="Paste JSON context (target_role, level, etc)…" />;
}
function Networking() {
  const items: { tool: string; l: string }[] = [
    { tool: "ac_mentor_match", l: "Mentor matching" },
    { tool: "ac_alumni", l: "Alumni network" },
    { tool: "ac_expert_reco", l: "Expert recs" },
    { tool: "ac_networking", l: "Networking plan" },
    { tool: "ac_communities", l: "Communities" },
    { tool: "ac_collab", l: "Collab opportunities" },
  ];
  return <ToolGrid items={items} placeholder="Paste JSON context (profile, goals)…" />;
}
function Productivity() {
  const items: { tool: string; l: string }[] = [
    { tool: "ac_email_writer", l: "Email writer" },
    { tool: "ac_linkedin_opt", l: "Profile optimizer" },
    { tool: "ac_portfolio_suggest", l: "Portfolio ideas" },
    { tool: "ac_branding", l: "Personal branding" },
    { tool: "ac_time_mgmt", l: "Time management" },
    { tool: "ac_meeting_notes", l: "Meeting notes" },
    { tool: "ac_motivation", l: "Motivation coach" },
  ];
  return <ToolGrid items={items} placeholder="Paste JSON context…" />;
}
function Analytics({ userId }: { userId: string }) {
  const [scores, setScores] = useState<Awaited<ReturnType<typeof listScores>>>([]);
  useEffect(() => { listScores(userId).then(setScores).catch(() => {}); }, [userId]);
  return (
    <div className="space-y-3">
      <SectionHead title="Career analytics" hint="live" />
      {scores.length === 0 ? <Empty text="No score snapshots yet — generate an analytics report to start tracking." /> : scores.map((s) => (
        <GlassCard key={s.id} className="flex items-center justify-between p-3">
          <div>
            <div className="text-sm font-semibold text-white">{s.kind}</div>
            <div className="text-[10px] text-white/40">{new Date(s.captured_at).toLocaleString()}</div>
          </div>
          <div className="font-display text-2xl italic text-[#e8c874]">{s.score}</div>
        </GlassCard>
      ))}
      <AIChat tool="ac_growth_analytics" title="Growth analytics" placeholder='JSON: {"scores_over_time":[…],"applications":…}' />
      <button onClick={async () => { await recordScore({ user_id: userId, kind: "growth", score: 60 }); listScores(userId).then(setScores); }}
        className="w-full rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-sm text-white/80">Snapshot current score</button>
    </div>
  );
}
function Reminders({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listReminders>>>([]);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const refresh = () => listReminders(userId).then(setRows).catch(() => {});
  useEffect(() => { refresh(); }, [userId]);
  return (
    <div className="space-y-3">
      <GlassCard className="space-y-2 p-4">
        <SectionHead title="Smart reminders" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reminder title" className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30" />
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none" />
        <button onClick={async () => { if (!title || !when) return; await addReminder({ user_id: userId, title, remind_at: new Date(when).toISOString() }); setTitle(""); setWhen(""); refresh(); }}
          className="w-full rounded-2xl bg-[#e8c874] py-2.5 text-sm font-bold text-black">Add reminder</button>
      </GlassCard>
      {rows.length === 0 ? <Empty text="No reminders yet." /> : rows.map((r) => (
        <GlassCard key={r.id} className="flex items-center justify-between p-3">
          <div>
            <div className="text-sm font-semibold text-white">{r.title}</div>
            <div className="text-[10px] text-white/40">{new Date(r.remind_at).toLocaleString()}</div>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-white/40">{r.channel}</span>
        </GlassCard>
      ))}
    </div>
  );
}
function Security() {
  const items = [
    "Secure cloud storage (Supabase)",
    "Row-level security on every record",
    "End-to-end encrypted transport",
    "Two-factor authentication (via account settings)",
    "Privacy controls & data export",
    "Activity logs & device management",
    "Cloud backup & versioning",
    "Verified profile badge",
    "Role-based access",
  ];
  return (
    <div className="space-y-2">
      <SectionHead title="Security & privacy" />
      {items.map((i) => (
        <GlassCard key={i} className="flex items-center gap-2 p-3 text-sm text-white/85">
          <ShieldCheck className="h-4 w-4 text-[#e8c874]" /> {i}
        </GlassCard>
      ))}
    </div>
  );
}

function ToolGrid({ items, placeholder }: { items: { tool: string; l: string }[]; placeholder: string }) {
  const [tool, setTool] = useState(items[0].tool);
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!input.trim()) return;
    setBusy(true); setOut("");
    try { await streamSam(tool, [{ role: "user", content: input }], (a) => setOut(a)); }
    catch (e) { setOut(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <button key={i.tool} onClick={() => { setTool(i.tool); setOut(""); }}
            className={`rounded-full border px-3 py-1.5 text-[11px] ${tool === i.tool ? "border-[#e8c874]/60 bg-[#e8c874]/15 text-[#e8c874]" : "border-white/10 text-white/60"}`}>{i.l}</button>
        ))}
      </div>
      <GlassCard className="space-y-2 p-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={5} placeholder={placeholder}
          className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white outline-none placeholder:text-white/30" />
        <button onClick={run} disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy ? "…" : "Run"}</button>
      </GlassCard>
      {out && <GlassCard className="whitespace-pre-wrap p-4 text-xs text-white/80">{out}</GlassCard>}
    </div>
  );
}

/* silence unused imports for stubs used later */
void createMilestone; void achieveMilestone; void listMilestones; void listInterviews; void listLearningPaths; void saveLearningPath; void Send; void ArrowRight;