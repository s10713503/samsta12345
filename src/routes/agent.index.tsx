// @ts-nocheck
import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Mic, ShieldAlert, Send, X, History, SlidersHorizontal, Brain, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { byKey } from "@/lib/agent/registry";
import { execute, type Plan } from "@/lib/agent/execute";
import { listMemory, listPermissions, recordAction } from "@/lib/agent/api";
import { enableNotifications, getHandsFree, getUltra, notificationState, setHandsFree } from "@/lib/agent/ultra";
import { NotificationGate } from "@/components/samsta/NotificationGate";
import { replyFor, speak } from "@/lib/agent/voice";
import { haptic } from "@/lib/agent/silent";



type Turn =
  | { kind: "user"; text: string }
  | { kind: "sam"; text: string }
  | { kind: "plan"; utterance: string; plan: Plan; status: "pending" | "running" | "done" | "failed" | "cancelled"; note?: string };

const CHIPS = [
  "Kal subah 6 baje uthne ka reminder",
  "20 minute ka timer",
  "Ahmedabad airport ka route",
  "Nearby vegetarian restaurants",
  "Ahmedabad se Delhi Saturday flight",
  "Amazon par wireless mouse dhundo",
];

export const Route = createFileRoute("/agent/")({
  head: () => ({
    meta: [
      { title: "Samsta AI — Tell Samsta. Get it done." },
      { name: "description", content: "Speak or type what you need. Samsta understands, plans, asks permission, and only then acts — reminders, routes, calls, travel and shopping." },
      { property: "og:title", content: "Samsta AI — Tell Samsta. Get it done." },
      { property: "og:description", content: "Your real-world AI agent: understand, plan, confirm, execute, verify." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentPage,
});

function AgentPage() {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [ultra, setUltraState] = useState(false);
  const [handsFree, setHF] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);
  const handsFreeRef = useRef(false);
  const aliveRef = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, thinking]);
  useEffect(() => {
    setUltraState(getUltra().active);
    setHF(getHandsFree());
    const on = (e: any) => setUltraState(!!e.detail?.active);
    window.addEventListener("samsta:ultra", on);
    return () => {
      window.removeEventListener("samsta:ultra", on);
      handsFreeRef.current = false;
      recRef.current?.stop?.();
    };
  }, []);
  useEffect(() => { handsFreeRef.current = ultra && handsFree; }, [ultra, handsFree]);
  useEffect(() => { if (ultra && handsFree) startVoice(); }, [ultra, handsFree]);

  // Ultra: notifications are how Sam reaches you when a task fires — ask once,
  // and tell you plainly if the browser has hard-blocked them.
  useEffect(() => {
    if (!ultra) return;
    const state = notificationState();
    if (state === "granted" || state === "unsupported") return;
    void enableNotifications().then((r) => { if (!r.ok) toast.error(r.note, { duration: 8000 }); });
  }, [ultra]);

  // Ultra hands-free must survive tab wake-ups, silence timeouts and OS pauses.
  useEffect(() => {
    if (!(ultra && handsFree)) return;
    const revive = () => { if (handsFreeRef.current && !document.hidden) startVoice(); };
    const id = window.setInterval(revive, 4000);
    document.addEventListener("visibilitychange", revive);
    window.addEventListener("focus", revive);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", revive);
      window.removeEventListener("focus", revive);
    };
  }, [ultra, handsFree]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  async function submit(text: string) {
    const utterance = text.trim();
    if (!utterance || thinking) return;
    setInput("");
    setTurns((t) => [...t, { kind: "user", text: utterance }]);
    setThinking(true);
    try {
      const memory = await listMemory().catch(() => []);
      const res = await fetch("/api/agent/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utterance, ultra, memory: memory.map((m) => ({ key: m.key, value: m.value })) }),
      });
      if (!res.ok) throw new Error((await res.text()) || "Planning failed");
      const plan = (await res.json()) as Plan;

      if (plan.capability === "answer" || (plan.missing?.length ?? 0) > 0) {
        setTurns((t) => [...t, { kind: "sam", text: plan.say }]);
        setThinking(false);
        return;
      }

      const cap = byKey(plan.capability);
      if (cap?.ultra && !ultra) {
        setTurns((t) => [...t, { kind: "sam", text: `${cap.label} is a Sam AI Ultra capability. Unlock Ultra and I'll take it from there.` }]);
        setThinking(false);
        return;
      }
      const perms = await listPermissions().catch(() => ({} as Record<string, boolean>));
      if (cap && perms[cap.scope] === false) {
        setTurns((t) => [...t, { kind: "sam", text: `${cap.label} is switched off in your Samsta Permissions. Turn it on and I'll do it.` }]);
        setThinking(false);
        return;
      }

      // Ultra auto-executes anything you've already permitted; high risk always asks.
      const autoOk = ultra && plan.risk !== "high" && !cap?.unsupported;
      const needsConfirm = !autoOk && (cap?.confirm || plan.risk !== "low" || cap?.unsupported);
      setTurns((t) => [...t, { kind: "plan", utterance, plan, status: needsConfirm ? "pending" : "running" }]);
      setThinking(false);
      if (!needsConfirm) void run(utterance, plan, ultra);
    } catch (e) {
      setThinking(false);
      setTurns((t) => [...t, { kind: "sam", text: e instanceof Error ? e.message : "Something slipped." }]);
    }
  }

  async function run(utterance: string, plan: Plan, confirmed: boolean) {
    setTurns((t) => t.map((x) => (x.kind === "plan" && x.plan === plan ? { ...x, status: "running" } : x)));
    const out = await execute(plan);
    setTurns((t) =>
      t.map((x) =>
        x.kind === "plan" && x.plan === plan
          ? { ...x, status: out.ok ? "done" : "failed", note: out.ok ? out.result : out.error }
          : x,
      ),
    );
    // Silent by default: a gentle haptic (if the user keeps haptics on) and a
    // written reply. Sam only speaks aloud if speech was explicitly enabled.
    haptic(out.ok ? 12 : [8, 40, 8]);
    if (ultra) {
      const reply = replyFor(plan.capability, out.ok, out.error);
      setTurns((t) => [...t, { kind: "sam", text: reply }]);
      speak(reply);
    }
    await recordAction(utterance, plan, out.ok ? "completed" : byKey(plan.capability)?.unsupported ? "blocked" : "failed", confirmed, out.result, out.error).catch(() => {});
  }


  function cancel(plan: Plan, utterance: string) {
    setTurns((t) => t.map((x) => (x.kind === "plan" && x.plan === plan ? { ...x, status: "cancelled", note: "Cancelled — nothing happened." } : x)));
    void recordAction(utterance, plan, "cancelled", false).catch(() => {});
  }

  function startVoice() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input isn't supported in this browser — type instead."); return; }
    if (aliveRef.current) return; // already listening — never stack recognisers
    const rec = new SR();
    recRef.current = rec;
    aliveRef.current = true;
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      const raw = String(e.results[e.results.length - 1][0].transcript || "").trim();
      // "Sam, open YouTube" and "open YouTube" both work — the wake word is optional.
      const said = raw.replace(/^\s*(hey\s+|ok\s+)?(sam|samsta)\s*[,:।-]?\s*/i, "").trim() || raw;
      if (!handsFreeRef.current) setListening(false);
      if (said) void submit(said);
    };
    rec.onerror = (e: any) => {
      const fatal = e?.error === "not-allowed" || e?.error === "service-not-allowed";
      aliveRef.current = false;
      if (fatal) {
        handsFreeRef.current = false;
        setListening(false);
        toast.error("Microphone is blocked. Allow it from the lock icon in the address bar to keep Sam always listening.", { duration: 8000 });
        return;
      }
      if (!handsFreeRef.current) setListening(false);
    };
    rec.onend = () => {
      aliveRef.current = false;
      // Browsers stop recognition after silence; Ultra restarts it immediately
      // so you never have to tap the mic again.
      if (handsFreeRef.current && !document.hidden) { window.setTimeout(startVoice, 250); return; }
      setListening(false);
    };
    setListening(true);
    try { rec.start(); } catch { aliveRef.current = false; }
  }

  function toggleHandsFree() {
    const next = !handsFree;
    setHF(next);
    setHandsFree(next);
    handsFreeRef.current = ultra && next;
    if (!next) { recRef.current?.stop?.(); aliveRef.current = false; setListening(false); }
    else startVoice();
  }

  return (
    <div className="min-h-screen px-4 pt-6">
      <header className="flex items-center justify-between">
        <Link to="/" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <div className="flex gap-2">
          <Link
            to="/agent/ultra"
            aria-label="Sam AI Ultra"
            className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs ${ultra ? "text-primary-foreground" : "glass text-foreground/80"}`}
            style={ultra ? { background: "linear-gradient(135deg, oklch(0.86 0.10 25), oklch(0.80 0.12 340))" } : undefined}
          >
            <Sparkles className="h-4 w-4" /> {ultra ? "Ultra" : "Get Ultra"}
          </Link>
          <Link to="/agent/activity" aria-label="Activity" className="glass flex h-10 w-10 items-center justify-center rounded-full"><History className="h-4.5 w-4.5" /></Link>
          <Link to="/agent/memory" aria-label="Memory" className="glass flex h-10 w-10 items-center justify-center rounded-full"><Brain className="h-4.5 w-4.5" /></Link>
          <Link to="/agent/permissions" aria-label="Permissions" className="glass flex h-10 w-10 items-center justify-center rounded-full"><SlidersHorizontal className="h-4.5 w-4.5" /></Link>
        </div>
      </header>

      {turns.length === 0 && (
        <section className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">{greet} 👋</p>
          <h1 className="font-display mt-1 text-4xl leading-tight">What do you need?</h1>
          <button
            onClick={startVoice}
            aria-label="Speak to Samsta"
            className="relative mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ background: "linear-gradient(135deg, oklch(0.86 0.10 25), oklch(0.80 0.12 340))" }}
          >
            {listening && (
              <>
                <span className="absolute -inset-3 animate-[pulse_2.4s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-primary/15 blur-md" />
                <span className="absolute -inset-1 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full ring-1 ring-primary/40" />
              </>
            )}
            {thinking && <span className="absolute -inset-1.5 rounded-full ring-2 ring-primary/50 blur-[1px] animate-[pulse_1.4s_ease-in-out_infinite]" />}
            <Mic className="relative h-10 w-10 text-primary-foreground" strokeWidth={1.8} />
          </button>
          <p className="mt-3 text-xs text-muted-foreground">Hindi · Hinglish · Gujarati · English</p>
          {ultra && handsFree && (
            <p className="mx-auto mt-2 max-w-xs text-[11px] leading-relaxed text-muted-foreground">
              No tap needed — say “Sam, open YouTube” or just “open YouTube”. Keep Samsta open in a tab;
              a phone that is switched off or a closed browser can't hear you — nothing can.
            </p>
          )}

          {ultra ? (
            <button onClick={toggleHandsFree} className="glass mx-auto mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${handsFree ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
              {handsFree ? "Always listening — just speak" : "Hands-free listening off"}
            </button>
          ) : (
            <Link to="/agent/ultra" className="glass mx-auto mt-4 flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Unlock Ultra for hands-free, auto-executed tasks
            </Link>
          )}

          <div className="mx-auto mt-2 max-w-sm">
            <NotificationGate ultra={ultra} />
          </div>



          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => submit(c)} className="glass rounded-full px-3.5 py-2 text-xs text-foreground/80">{c}</button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 space-y-3 pb-40">
        {turns.map((t, i) =>
          t.kind === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">{t.text}</p>
            </div>
          ) : t.kind === "sam" ? (
            <p key={i} className="max-w-[90%] whitespace-pre-wrap text-sm leading-relaxed text-foreground">{t.text}</p>
          ) : (
            <ActionCard key={i} turn={t} onRun={() => run(t.utterance, t.plan, true)} onCancel={() => cancel(t.plan, t.utterance)} />
          ),
        )}
        {thinking && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-3.5 w-3.5 items-center justify-center">
              <span className="absolute inset-0 rounded-full ring-2 ring-primary/50 animate-[pulse_1.4s_ease-in-out_infinite]" />
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" />
            </span>
            Understanding…
          </p>
        )}
        <div ref={endRef} />
      </section>

      <form
        onSubmit={(e) => { e.preventDefault(); void submit(input); }}
        className="fixed bottom-6 left-1/2 z-30 w-[min(456px,calc(100%-24px))] -translate-x-1/2"
      >
        <div className="glass-strong flex items-end gap-2 rounded-3xl p-2">
          <button type="button" onClick={startVoice} aria-label="Voice" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground">
            <Mic className="h-5 w-5" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void submit(input); } }}
            rows={1}
            placeholder="Tell Samsta what you need…"
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button type="submit" aria-label="Send" disabled={!input.trim() || thinking}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function ActionCard({ turn, onRun, onCancel }: { turn: Extract<Turn, { kind: "plan" }>; onRun: () => void; onCancel: () => void }) {
  const { plan, status, note } = turn;
  const cap = byKey(plan.capability);
  const high = plan.risk === "high";
  const tone = high ? "border-destructive/40" : plan.risk === "medium" ? "border-amber-500/30" : "border-border/60";

  return (
    <div className={`glass rounded-3xl border ${tone} p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none">{cap?.emoji ?? "✨"}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight">{cap?.label ?? plan.capability}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{plan.say}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${high ? "bg-destructive/15 text-destructive" : plan.risk === "medium" ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/15 text-emerald-700"}`}>
          {plan.risk}
        </span>
      </div>

      {Object.keys(plan.params ?? {}).length > 0 && (
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {Object.entries(plan.params).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground capitalize">{k}</dt>
              <dd className="truncate">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {plan.steps?.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
          {plan.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span>{status === "done" ? "✓" : status === "running" ? "→" : "○"}</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      {cap && (
        <p className="mt-3 rounded-2xl bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">
          <strong className="text-foreground/80">Can:</strong> {cap.can}<br />
          <strong className="text-foreground/80">Cannot:</strong> {cap.cannot}
        </p>
      )}

      {status === "pending" && (
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="flex-1 rounded-full border border-border px-4 py-2.5 text-sm">Cancel</button>
          <button onClick={onRun} className={`flex-1 rounded-full px-4 py-2.5 text-sm ${high ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
            {high ? "I authorise this" : "Continue"}
          </button>
        </div>
      )}
      {status === "running" && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="relative flex h-3.5 w-3.5 items-center justify-center"><span className="absolute inset-0 rounded-full ring-2 ring-primary/50 animate-[pulse_1.4s_ease-in-out_infinite]" /><Loader2 className="h-3.5 w-3.5 animate-spin text-primary/70" /></span> Working…</p>}
      {status === "done" && (
        <p className="mt-3 flex items-start gap-2 text-xs text-emerald-700 animate-fade-in">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 animate-scale-in">
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
          {note}
        </p>
      )}
      {status === "failed" && <p className="mt-3 flex items-start gap-2 text-xs text-destructive"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />{note}</p>}
      {status === "cancelled" && <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><X className="h-3.5 w-3.5" />{note}</p>}
    </div>
  );
}
