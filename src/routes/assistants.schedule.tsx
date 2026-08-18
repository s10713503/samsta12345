// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, CalendarDays, Sparkles, Clock, Zap, Target, Flame, Users, Gauge,
  Rocket, BarChart3, Mic, Bell, MapPin, AlertTriangle, ListTodo, CheckCircle2,
  Trash2, Plus, RefreshCw, Send, Lock, ShieldCheck, Wand2, Brain, Timer,
  CalendarClock, Cake, Repeat, TrendingUp, Copy, Check,
} from "lucide-react";
import { toast } from "sonner";
import { usePremium } from "@/lib/premium";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistants/schedule")({
  head: () => ({
    meta: [
      { title: "Time Intelligence— Samsta" },
      { name: "description", content: "Premium schedule engine: smart planner, meeting optimizer, deadline prediction, habit tracker, conflict detection, productivity reports." },
    ],
  }),
  component: ScheduleEngine,
});

const ACCENT = "linear-gradient(135deg, oklch(0.78 0.16 55) 0%, oklch(0.72 0.18 30) 55%, oklch(0.68 0.2 340) 100%)";
const GLASS = "backdrop-blur-2xl bg-white/[0.06] border border-white/10";

type ToolId =
  | "sm_optimize" | "sm_meeting" | "sm_focus" | "sm_deadline" | "sm_conflict"
  | "sm_priority" | "sm_report" | "sm_habit" | "sm_travel_time" | "sm_notify";

type Tool = {
  id: ToolId; label: string; desc: string; Icon: typeof Sparkles;
  group: "plan" | "meet" | "predict" | "grow"; placeholder: string;
};

const TOOLS: Tool[] = [
  { id: "sm_optimize",   label: "Auto-Optimize Day",   desc: "Rebalance blocks",       Icon: Wand2,        group: "plan",    placeholder: "Paste today's items or a rough list…" },
  { id: "sm_focus",      label: "Daily Focus Plan",    desc: "3 deep blocks",          Icon: Target,       group: "plan",    placeholder: "Your tasks + energy + hours…" },
  { id: "sm_priority",   label: "Priority Suggestions", desc: "Eisenhower + energy",   Icon: Brain,        group: "plan",    placeholder: "Dump your task list…" },
  { id: "sm_conflict",   label: "Conflict Detection",  desc: "Overlaps + buffers",     Icon: AlertTriangle, group: "plan",   placeholder: "Paste today's items as a list…" },
  { id: "sm_meeting",    label: "Meeting Planner",     desc: "Slot + agenda",          Icon: Users,        group: "meet",    placeholder: "Attendees, goal, available windows…" },
  { id: "sm_travel_time",label: "Travel Time",         desc: "Leave-by estimate",      Icon: MapPin,       group: "meet",    placeholder: "Origin → destination · time…" },
  { id: "sm_notify",     label: "Smart Notification",  desc: "Contextual nudge",       Icon: Bell,         group: "meet",    placeholder: "Item + minutes until…" },
  { id: "sm_deadline",   label: "Deadline Prediction", desc: "Realistic ETA",          Icon: CalendarClock, group: "predict",placeholder: "Task + scope + your pace…" },
  { id: "sm_report",     label: "Productivity Report", desc: "Weekly review",          Icon: BarChart3,    group: "predict", placeholder: "Completed / missed / streaks…" },
  { id: "sm_habit",      label: "Habit Coach",         desc: "2-min version",          Icon: Flame,        group: "grow",    placeholder: "Habit + streak + friction…" },
];

const GROUPS = [
  { key: "plan",    label: "Plan",    Icon: ListTodo },
  { key: "meet",    label: "Meet",    Icon: Users },
  { key: "predict", label: "Predict", Icon: Rocket },
  { key: "grow",    label: "Grow",    Icon: TrendingUp },
] as const;

type Item = {
  id: string;
  kind: "task" | "meeting" | "event" | "birthday" | "reminder" | "habit";
  title: string;
  notes: string | null;
  status: "pending" | "done";
  priority: "low" | "normal" | "high" | "urgent";
  starts_at: string | null;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  reminder_minutes: number | null;
  recurrence: string | null;
  tags: string[];
};

type SRConstructor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

const KIND_ICON: Record<Item["kind"], typeof Sparkles> = {
  task: ListTodo, meeting: Users, event: CalendarDays,
  birthday: Cake, reminder: Bell, habit: Flame,
};

const PRIORITY_COLOR: Record<Item["priority"], string> = {
  low: "text-white/50", normal: "text-white/80",
  high: "text-amber-300", urgent: "text-rose-300",
};

function ScheduleEngine() {
  const { isPremium } = usePremium();
  const { user } = useAuthUser();
  const navigate = useNavigate();

  // === schedule state ===
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [quick, setQuick] = useState("");
  const [parsing, setParsing] = useState(false);
  const [checkins, setCheckins] = useState<Record<string, boolean>>({});

  // === ai tool state ===
  const [active, setActive] = useState<ToolId>("sm_optimize");
  const [group, setGroup] = useState<typeof GROUPS[number]["key"]>("plan");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);

  const tool = useMemo(() => TOOLS.find((t) => t.id === active)!, [active]);
  const visible = useMemo(() => TOOLS.filter((t) => t.group === group), [group]);

  // Load
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const [{ data: rows }, { data: today }] = await Promise.all([
        supabase.from("schedule_items")
          .select("id,kind,title,notes,status,priority,starts_at,ends_at,all_day,location,reminder_minutes,tags")
          .eq("user_id", user.id)
          .order("starts_at", { ascending: true, nullsFirst: false })
          .limit(200),
        supabase.from("habit_checkins")
          .select("item_id,day")
          .eq("user_id", user.id)
          .eq("day", new Date().toISOString().slice(0, 10)),
      ]);
      setItems((rows ?? []) as Item[]);
      const map: Record<string, boolean> = {};
      (today ?? []).forEach((r: { item_id: string }) => { map[r.item_id] = true; });
      setCheckins(map);
      setLoading(false);
    })();
  }, [user]);

  // Realtime cross-device sync
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`schedule:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schedule_items", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setItems((prev) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as Item;
              if (prev.some((p) => p.id === row.id)) return prev;
              return [...prev, row].sort((a, b) => (a.starts_at ?? "").localeCompare(b.starts_at ?? ""));
            }
            if (payload.eventType === "UPDATE") {
              return prev.map((p) => (p.id === (payload.new as Item).id ? (payload.new as Item) : p));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((p) => p.id !== (payload.old as { id: string }).id);
            }
            return prev;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight, behavior: "smooth" }); }, [output]);

  // === quick add via voice/NL ===
  async function quickAdd() {
    const text = quick.trim();
    if (!text || parsing) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    setParsing(true);
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "sm_parse",
          messages: [{ role: "user", content: text + `\n\n[user_tz: ${Intl.DateTimeFormat().resolvedOptions().timeZone}]` }],
        }),
      });
      if (!res.ok || !res.body) throw new Error("Parser unavailable");
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
            if (delta) acc += delta;
          } catch { /* ignore */ }
        }
      }
      const json = acc.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const parsed = JSON.parse(json);
      const { error } = await supabase.from("schedule_items").insert({
        user_id: user.id,
        title: parsed.title || text.slice(0, 80),
        kind: parsed.kind || "task",
        starts_at: parsed.starts_at || null,
        ends_at: parsed.ends_at || null,
        all_day: !!parsed.all_day,
        location: parsed.location || null,
        priority: parsed.priority || "normal",
        reminder_minutes: parsed.reminder_minutes ?? null,
        recurrence: parsed.recurrence || null,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (error) throw error;
      setQuick("");
      toast.success("Added to your timeline");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't parse that");
    } finally { setParsing(false); }
  }

  async function voiceCapture() {
    const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported on this browser"); return; }
    const rec = new SR();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = e.results[0]?.[0]?.transcript ?? "";
      setQuick(t);
      setTimeout(() => { void quickAdd(); }, 200);
    };
    rec.onerror = () => toast.error("Voice capture failed");
    try { rec.start(); toast.message("Listening…"); } catch { /* ignore */ }
  }

  async function toggleDone(it: Item) {
    const next = it.status === "done" ? "pending" : "done";
    await supabase.from("schedule_items").update({ status: next }).eq("id", it.id);
    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, status: next } : p)));
  }

  async function remove(it: Item) {
    await supabase.from("schedule_items").delete().eq("id", it.id);
    setItems((prev) => prev.filter((p) => p.id !== it.id));
  }

  async function checkHabit(it: Item) {
    if (!user) return;
    const day = new Date().toISOString().slice(0, 10);
    if (checkins[it.id]) {
      await supabase.from("habit_checkins").delete().eq("item_id", it.id).eq("day", day);
      setCheckins((p) => { const n = { ...p }; delete n[it.id]; return n; });
    } else {
      await supabase.from("habit_checkins").insert({ user_id: user.id, item_id: it.id, day });
      setCheckins((p) => ({ ...p, [it.id]: true }));
    }
  }

  // === AI tool run ===
  async function runTool() {
    const p = prompt.trim();
    if (!p && active !== "sm_optimize" && active !== "sm_conflict") return;
    if (!user) { navigate({ to: "/auth" }); return; }
    setOutput(""); setStreaming(true);
    // Auto-include today's items for whole-day tools
    const needsContext = active === "sm_optimize" || active === "sm_conflict" || active === "sm_focus" || active === "sm_priority";
    const contextBlock = needsContext
      ? "\n\n[my_items]\n" + JSON.stringify(items.filter((i) => i.status !== "done").slice(0, 40))
      : "";
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: active,
          messages: [{ role: "user", content: (p || "Optimize my day.") + contextBlock }],
        }),
      });
      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);
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
      toast.error(e instanceof Error ? e.message : "Engine unavailable");
    } finally { setStreaming(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(output); setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 1200); }
    catch { toast.error("Copy failed"); }
  }

  // === derived stats ===
  const now = Date.now();
  const todayItems = items.filter((i) => {
    if (!i.starts_at) return false;
    const d = new Date(i.starts_at);
    const n = new Date();
    return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
  });
  const upcoming = items.filter((i) => i.starts_at && new Date(i.starts_at).getTime() > now && i.status !== "done").slice(0, 12);
  const doneCount = items.filter((i) => i.status === "done").length;
  const habitCount = items.filter((i) => i.kind === "habit").length;
  const checkedToday = Object.keys(checkins).length;
  const streakPct = habitCount ? Math.round((checkedToday / habitCount) * 100) : 0;

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#0a0710] text-white">
        <TopBar />
        <div className={cn("mx-4 mt-8 rounded-3xl p-6 text-center", GLASS)}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Lock className="h-6 w-6" />
          </div>
          <div className="mt-4 font-display text-2xl italic">Time Intelligence is Premium</div>
          <p className="mt-2 text-xs text-white/60">powered scheduling, focus plans, and productivity analytics.</p>
          <Link to="/premium" className="mt-5 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#0a0710]">Upgrade</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0a0710] pb-32 text-white">
      {/* Ambient bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]" style={{ background: "oklch(0.75 0.18 45)" }} />
        <div className="absolute top-40 -right-24 h-[340px] w-[340px] rounded-full opacity-25 blur-[100px]" style={{ background: "oklch(0.7 0.2 15)" }} />
        <div className="absolute bottom-0 -left-24 h-[380px] w-[380px] rounded-full opacity-25 blur-[110px]" style={{ background: "oklch(0.68 0.2 340)" }} />
      </div>

      <TopBar />

      {/* Hero */}
      <section className="relative z-10 px-4 pt-3">
        <div className={cn("relative overflow-hidden rounded-[28px] p-5 shadow-2xl", GLASS)} style={{ backgroundImage: ACCENT }}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              <CalendarClock className="h-3 w-3" /> Time Intelligence
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium backdrop-blur">
              <Zap className="h-3 w-3" /> Realtime sync
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl italic leading-tight">Your calendar, but it thinks.</h1>
          <p className="mt-1 max-w-md text-[12.5px] text-white/85">
 planned days, deadline forecasts, habit streaks, meeting slots— synced across every device.
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Today", value: String(todayItems.length) },
              { label: "Upcoming", value: String(upcoming.length) },
              { label: "Done", value: String(doneCount) },
              { label: "Streaks", value: `${streakPct}%` },
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
              Synced to <span className="font-medium">{user?.email ?? "your account"}</span> — encrypted, cross-device.
            </div>
          </div>
        </div>
      </section>

      {/* Quick capture (voice + NL) */}
      <section className={cn("relative z-10 mx-4 mt-4 rounded-3xl p-4", GLASS)}>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
          <div className="text-[11px] uppercase tracking-wider text-white/60">Quick capture— parses time, place, priority</div>
        </div>
        <div className="flex gap-2">
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void quickAdd(); } }}
            placeholder='"Dentist Thursday 11am, remind me 1h before"'
            className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
          />
          <button onClick={voiceCapture} className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/[0.05] active:scale-95" aria-label="Voice">
            <Mic className="h-4 w-4" />
          </button>
          <button
            onClick={quickAdd}
            disabled={!quick.trim() || parsing}
            className="flex h-11 items-center justify-center gap-1.5 rounded-2xl px-4 text-sm font-semibold text-[#0a0710] active:scale-95 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #fff, #f6d5b8)" }}
          >
            {parsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </button>
        </div>
      </section>

      {/* Timeline dashboard */}
      <section className={cn("relative z-10 mx-4 mt-4 rounded-3xl p-4", GLASS)}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-amber-300" />
            <div className="text-[12px] font-semibold">Your timeline</div>
          </div>
          <div className="text-[10px] text-white/50">{items.length} items · live</div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-white/[0.04]" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-white/50">Nothing yet — add your first item above.</div>
        ) : (
          <ol className="relative space-y-2">
            <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gradient-to-b from-white/25 via-white/10 to-transparent" />
            {items.slice(0, 30).map((it) => {
              const Icon = KIND_ICON[it.kind] ?? ListTodo;
              const isPast = it.starts_at ? new Date(it.starts_at).getTime() < now : false;
              const timeLabel = it.starts_at
                ? new Date(it.starts_at).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })
                : "Anytime";
              return (
                <li key={it.id} className="relative flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2.5 animate-fade-in">
                  <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: ACCENT, opacity: it.status === "done" ? 0.4 : 1 }}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("truncate text-[13px] font-medium", it.status === "done" && "line-through text-white/40")}>
                      {it.title}
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-white/55">
                      <Clock className="h-3 w-3" />
                      <span className={cn(isPast && it.status !== "done" && "text-rose-300")}>{timeLabel}</span>
                      {it.location && <><span>·</span><MapPin className="h-3 w-3" /><span className="truncate">{it.location}</span></>}
                      {it.priority !== "normal" && <span className={cn("uppercase tracking-wider", PRIORITY_COLOR[it.priority])}>· {it.priority}</span>}
                      {it.recurrence && <><span>·</span><Repeat className="h-3 w-3" /></>}
                    </div>
                  </div>
                  {it.kind === "habit" ? (
                    <button onClick={() => void checkHabit(it)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-full transition",
                        checkins[it.id] ? "bg-emerald-400/90 text-[#0a0710]" : "border border-white/15 bg-white/[0.05]")}>
                      <Flame className="h-4 w-4" />
                    </button>
                  ) : (
                    <button onClick={() => void toggleDone(it)}
                      className={cn("flex h-8 w-8 items-center justify-center rounded-full transition",
                        it.status === "done" ? "bg-emerald-400/90 text-[#0a0710]" : "border border-white/15 bg-white/[0.05]")}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => void remove(it)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 text-white/50 hover:text-rose-300" aria-label="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Group tabs */}
      <section className="relative z-10 mt-5 px-4">
        <div className="mb-2 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-amber-300" />
          <div className="text-[11px] uppercase tracking-wider text-white/60"> engines</div>
        </div>
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
            <button key={t.id} onClick={() => setActive(t.id)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn("group relative overflow-hidden rounded-2xl p-3 text-left backdrop-blur-2xl transition animate-fade-in active:scale-[0.98]",
                on ? "border border-white/40 bg-white/[0.12] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.35)]"
                   : "border border-white/8 bg-white/[0.035] hover:border-white/20")}>
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
            <div className="truncate text-[10.5px] text-white/60">{tool.desc} · uses your timeline as context</div>
          </div>
        </div>
        <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void runTool(); } }}
          placeholder={tool.placeholder}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25" />
        <button onClick={runTool} disabled={streaming}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-[#0a0710] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.6)] transition active:scale-[0.98] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #fff, #f6d5b8 60%, #f7c9a4)" }}>
          {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {streaming ? "Thinking…" : `Run ${tool.label}`}
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
                <Gauge className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs text-white/60">Pick an engine — your timeline is auto-included as context.</div>
            </div>
          )}
        </div>
        {output && !streaming && (
          <div className="mt-3 flex gap-2">
            <button onClick={copy} className={cn("flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium active:scale-[0.98]", GLASS)}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={runTool} className={cn("flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium active:scale-[0.98]", GLASS)}>
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
        <CalendarDays className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="font-display text-lg italic leading-tight">Time Intelligence</div>
        <div className="text-[11px] text-white/60">Premium· realtime· planned</div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold tracking-wider text-[#f5e6b3]"
        style={{ background: "linear-gradient(135deg, #0a0a0a, #1a1a1a 60%, #2a2010)", border: "1px solid rgba(212,175,55,0.35)" }}>
        <Lock className="h-3 w-3" /> PRO
      </span>
    </header>
  );
}
