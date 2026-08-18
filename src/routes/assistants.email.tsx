import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Mail, PenLine, Reply, Repeat2, Wand2, Briefcase, Users, TrendingUp,
  Megaphone, LifeBuoy, Hash, Paperclip, FileText, Globe2, Mic, CalendarClock,
  ShieldAlert, BarChart3, Copy, Check, RefreshCw, Send, Lock, ShieldCheck, Inbox,
  Sparkles, Zap, Search,
} from "lucide-react";
import { toast } from "sonner";
import { usePremium } from "@/lib/premium";
import { useAuthUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistants/email")({
  head: () => ({
    meta: [
      { title: "Email Studio— Samsta" },
      { name: "description", content: "Premium Professional Communication Studio: compose, reply, follow-up, tone-fix, translate, summarize, detect scams, and forecast analytics." },
    ],
  }),
  component: EmailStudio,
});

const ACCENT = "linear-gradient(135deg, oklch(0.72 0.14 250) 0%, oklch(0.68 0.16 220) 45%, oklch(0.65 0.14 200) 100%)";
const GLASS = "backdrop-blur-2xl bg-white/[0.06] border border-white/10";

type ToolId =
  | "em_compose" | "em_reply" | "em_followup" | "em_grammar"
  | "em_biz" | "em_hr" | "em_sales" | "em_marketing" | "em_support"
  | "em_subject" | "em_attach" | "em_summary" | "em_translate"
  | "em_voice" | "em_schedule" | "em_spam" | "em_analytics";

type Tool = {
  id: ToolId;
  label: string;
  desc: string;
  Icon: typeof Mail;
  group: "write" | "templates" | "understand" | "optimize";
  placeholder: string;
};

const TOOLS: Tool[] = [
  { id: "em_compose",   label: "Compose Email",       desc: "From a brief",         Icon: PenLine,       group: "write",      placeholder: "What do you want to say? (recipient, purpose, key points)" },
  { id: "em_reply",     label: "Reply Generator",     desc: "3 smart drafts",       Icon: Reply,         group: "write",      placeholder: "Paste the email you're replying to…" },
  { id: "em_followup",  label: "Follow-up",           desc: "Nudge · close · check", Icon: Repeat2,      group: "write",      placeholder: "Paste the earlier email + days since…" },
  { id: "em_grammar",   label: "Grammar & Tone",      desc: "Polish + score",       Icon: Wand2,         group: "write",      placeholder: "Paste your draft to improve…" },
  { id: "em_biz",       label: "Business Templates",  desc: "Proposal · intro",     Icon: Briefcase,     group: "templates",  placeholder: "Category + context (e.g. \"partnership pitch to X\")" },
  { id: "em_hr",        label: "HR Emails",           desc: "Offer · leave · appraisal", Icon: Users,    group: "templates",  placeholder: "Type + details (offer letter for Priya, SDE-2…)" },
  { id: "em_sales",     label: "Sales Emails",        desc: "Cold → close",         Icon: TrendingUp,    group: "templates",  placeholder: "Product · lead · stage · pain point…" },
  { id: "em_marketing", label: "Marketing Emails",    desc: "Launch · promo · nurture", Icon: Megaphone, group: "templates",  placeholder: "Campaign · audience · goal…" },
  { id: "em_support",   label: "Support Emails",      desc: "Empathy + status",     Icon: LifeBuoy,      group: "templates",  placeholder: "Ticket + sentiment + resolution status…" },
  { id: "em_subject",   label: "Subject Generator",   desc: "8 A/B options",        Icon: Hash,          group: "optimize",   placeholder: "Email body or brief + goal…" },
  { id: "em_attach",    label: "Attachment Analyzer", desc: "Extract · flag · reply", Icon: Paperclip,   group: "understand", placeholder: "Paste attachment contents or a summary…" },
  { id: "em_summary",   label: "Email Summarizer",    desc: "TL;DR + actions",      Icon: FileText,      group: "understand", placeholder: "Paste the long email or thread…" },
  { id: "em_translate", label: "Translate",           desc: "Preserve tone",        Icon: Globe2,        group: "optimize",   placeholder: "Paste email + target languages (e.g. Spanish, Japanese)" },
  { id: "em_voice",     label: "Voice-to-Email",      desc: "Dictate, we polish",   Icon: Mic,           group: "write",      placeholder: "Speak or paste your dictated text (fillers OK)…" },
  { id: "em_schedule",  label: "Smart Scheduling",    desc: "Propose 3 slots",      Icon: CalendarClock, group: "optimize",   placeholder: "Recipient TZ · your availability · duration · purpose" },
  { id: "em_spam",      label: "Spam & Scam Check",   desc: "Phishing · BEC",       Icon: ShieldAlert,   group: "understand", placeholder: "Paste the suspicious email (headers + body)…" },
  { id: "em_analytics", label: "Email Analytics",     desc: "Weekly report",        Icon: BarChart3,     group: "optimize",   placeholder: "Paste this week's stats (sent, open %, reply %, top subjects)…" },
];

const GROUPS = [
  { key: "write",      label: "Write",      Icon: PenLine },
  { key: "templates",  label: "Templates",  Icon: Inbox },
  { key: "understand", label: "Understand", Icon: Search },
  { key: "optimize",   label: "Optimize",   Icon: Sparkles },
] as const;

const TONES = ["Formal","Friendly","Assertive","Warm","Concise","Persuasive","Apologetic","Enthusiastic"];
const LENGTHS = ["short","medium","long"] as const;
const LANGS = ["English","Hindi","Spanish","French","Portuguese","Arabic","German","Japanese","Korean","Indonesian"];

type Prefs = {
  sender_name: string;
  signature: string;
  style_notes: string;
  language: string;
  tone: string;
  length: (typeof LENGTHS)[number];
};

function loadPrefs(uid: string | undefined): Prefs {
  const base: Prefs = { sender_name: "", signature: "", style_notes: "", language: "English", tone: "Friendly", length: "medium" };
  if (typeof window === "undefined" || !uid) return base;
  try {
    const raw = localStorage.getItem(`em_prefs:${uid}`);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch { return base; }
}
function savePrefs(uid: string, p: Prefs) {
  try { localStorage.setItem(`em_prefs:${uid}`, JSON.stringify(p)); } catch { /* */ }
}

function EmailStudio() {
  const { isPremium } = usePremium();
  const { user } = useAuthUser();
  const navigate = useNavigate();

  const [active, setActive] = useState<ToolId>("em_compose");
  const [group, setGroup] = useState<typeof GROUPS[number]["key"]>("write");
  const [brief, setBrief] = useState("");
  const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs(undefined));
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [drafts, setDrafts] = useState<Array<{ id: string; tool: ToolId; brief: string; output: string; at: number }>>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("em_drafts") || "[]"); } catch { return []; }
  });
  const outRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<{ rec: { stop: () => void } | null; on: boolean }>({ rec: null, on: false });
  const [recOn, setRecOn] = useState(false);

  useEffect(() => { setPrefs(loadPrefs(user?.id)); }, [user?.id]);
  useEffect(() => { if (user?.id) savePrefs(user.id, prefs); }, [prefs, user?.id]);
  useEffect(() => { outRef.current?.scrollTo({ top: outRef.current.scrollHeight, behavior: "smooth" }); }, [output]);
  useEffect(() => { try { localStorage.setItem("em_drafts", JSON.stringify(drafts.slice(0, 20))); } catch { /* */ } }, [drafts]);

  const tool = useMemo(() => TOOLS.find((t) => t.id === active)!, [active]);
  const visible = useMemo(() => TOOLS.filter((t) => t.group === group), [group]);

  function pickTool(id: ToolId) {
    setActive(id);
    const t = TOOLS.find((x) => x.id === id);
    if (t) setGroup(t.group);
    setOutput("");
  }

  function toggleVoice() {
    type SR = {
      new (): {
        continuous: boolean; interimResults: boolean; lang: string;
        onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
        onerror: (() => void) | null; onend: (() => void) | null;
        start: () => void; stop: () => void;
      };
    };
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toast.error("Voice input isn't supported on this browser"); return; }
    if (recRef.current.on) {
      recRef.current.rec?.stop();
      recRef.current.on = false;
      setRecOn(false);
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = prefs.language === "Hindi" ? "hi-IN" : "en-US";
    let base = brief;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) base = (base ? base + " " : "") + r[0].transcript.trim();
        else interim += r[0].transcript;
      }
      setBrief((base + (interim ? " " + interim : "")).trim());
    };
    rec.onerror = () => { recRef.current.on = false; setRecOn(false); };
    rec.onend = () => { recRef.current.on = false; setRecOn(false); };
    rec.start();
    recRef.current = { rec, on: true };
    setRecOn(true);
    if (active !== "em_voice") pickTool("em_voice");
  }

  async function run() {
    const t = brief.trim();
    if (!t || streaming) return;
    if (!user) { toast.error("Sign in to personalize your inbox"); navigate({ to: "/auth" }); return; }
    setOutput(""); setStreaming(true);

    const payload = {
      user_id: user.id,
      brief: t,
      tone: prefs.tone,
      length: prefs.length,
      language: prefs.language,
      signature: prefs.signature,
      sender_name: prefs.sender_name || user.email?.split("@")[0] || "Me",
      writing_style_notes: prefs.style_notes,
    };
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: active,
          messages: [{ role: "user", content: "```json\n" + JSON.stringify(payload) + "\n```" }],
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `Request failed (${res.status})`);
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
      if (acc.trim()) {
        setDrafts((d) => [{ id: crypto.randomUUID(), tool: active, brief: t.slice(0, 80), output: acc, at: Date.now() }, ...d].slice(0, 20));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Studio couldn't respond");
    } finally { setStreaming(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(output); setCopied(true); toast.success("Copied to clipboard"); setTimeout(() => setCopied(false), 1200); }
    catch { toast.error("Copy failed"); }
  }

  function sendMailto() {
    // Extract subject line if present
    const m = /\*\*Subject:\*\*\s*(.+)/i.exec(output);
    const subject = m ? m[1].trim() : "";
    const body = output.replace(/\*\*Subject:\*\*.*\n?/i, "").replace(/\*\*/g, "").trim();
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-[#070b12] text-white">
        <TopBar />
        <div className={cn("mx-4 mt-8 rounded-3xl p-6 text-center", GLASS)}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
            <Lock className="h-6 w-6" />
          </div>
          <div className="mt-4 font-display text-2xl italic">Email Studio is Premium</div>
          <p className="mt-2 text-xs text-white/60">17 email tools, personalized to your voice, signature & recipients.</p>
          <Link to="/premium" className="mt-5 inline-flex rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#070b12]">Upgrade</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070b12] pb-32 text-white">
      {/* Ambient bg */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-30 blur-[120px]" style={{ background: "oklch(0.68 0.16 220)" }} />
        <div className="absolute top-40 -right-24 h-[340px] w-[340px] rounded-full opacity-25 blur-[100px]" style={{ background: "oklch(0.72 0.14 250)" }} />
        <div className="absolute bottom-0 -left-24 h-[380px] w-[380px] rounded-full opacity-25 blur-[110px]" style={{ background: "oklch(0.65 0.14 200)" }} />
      </div>

      <TopBar />

      {/* Hero */}
      <section className="relative z-10 px-4 pt-3">
        <div className={cn("relative overflow-hidden rounded-[28px] p-5 shadow-2xl", GLASS)} style={{ backgroundImage: ACCENT }}>
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              <Mail className="h-3 w-3" /> Email Studio
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-medium backdrop-blur">
              <Zap className="h-3 w-3" /> Live streaming
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl italic leading-tight">Write email like a diplomat.</h1>
          <p className="mt-1 max-w-md text-[12.5px] text-white/85">
            17 premium tools tuned to your voice, signature, and recipients. Compose, reply, translate, and detect scams — instantly.
          </p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {[
              { label: "Tools", value: "17" },
              { label: "Tones", value: "8" },
              { label: "Languages", value: "10" },
              { label: "Live", value: "" },
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
              Personalized to <span className="font-medium">{user?.email ?? "your account"}</span> — signature, style & language saved per user.
            </div>
          </div>
        </div>
      </section>

      {/* Personalization strip */}
      <section className="relative z-10 mx-4 mt-4 rounded-3xl p-4 backdrop-blur-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="mb-2 flex items-center gap-2">
          <PenLine className="h-3.5 w-3.5 text-sky-300" />
          <div className="text-[11px] uppercase tracking-wider text-white/60">Your writing profile</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={prefs.sender_name} onChange={(e) => setPrefs({ ...prefs, sender_name: e.target.value })}
            placeholder="Your name (for sign-off)"
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
          />
          <input
            value={prefs.signature} onChange={(e) => setPrefs({ ...prefs, signature: e.target.value })}
            placeholder="Signature (Role · Company · Link)"
            className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
          />
        </div>
        <textarea
          rows={2}
          value={prefs.style_notes} onChange={(e) => setPrefs({ ...prefs, style_notes: e.target.value })}
          placeholder="Writing style notes (e.g. \u201cShort sentences. Never use \u2018just\u2019. Warm but direct.\u201d)"
          className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
        />
        <div className="mt-2 grid grid-cols-3 gap-2">
          <select value={prefs.tone} onChange={(e) => setPrefs({ ...prefs, tone: e.target.value })} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none">
            {TONES.map((s) => <option key={s} value={s} className="bg-[#070b12]">{s}</option>)}
          </select>
          <select value={prefs.length} onChange={(e) => setPrefs({ ...prefs, length: e.target.value as Prefs["length"] })} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none capitalize">
            {LENGTHS.map((l) => <option key={l} value={l} className="bg-[#070b12] capitalize">{l}</option>)}
          </select>
          <select value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs outline-none">
            {LANGS.map((l) => <option key={l} value={l} className="bg-[#070b12]">{l}</option>)}
          </select>
        </div>
      </section>

      {/* Group tabs */}
      <section className="relative z-10 mt-5 px-4">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {GROUPS.map((g) => {
            const on = g.key === group;
            return (
              <button key={g.key} onClick={() => setGroup(g.key)}
                className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition",
                  on ? "bg-white text-[#070b12]" : "border border-white/12 bg-white/[0.04] text-white/80")}>
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
            <button
              key={t.id}
              onClick={() => pickTool(t.id)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={cn(
                "group relative overflow-hidden rounded-2xl p-3 text-left backdrop-blur-2xl transition animate-fade-in active:scale-[0.98]",
                on
                  ? "border border-white/40 bg-white/[0.12] shadow-[0_10px_40px_-10px_rgba(255,255,255,0.35)]"
                  : "border border-white/8 bg-white/[0.035] hover:border-white/20"
              )}
            >
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
            <div className="truncate text-[10.5px] text-white/60">{tool.desc}</div>
          </div>
          <button
            onClick={toggleVoice}
            aria-label="Voice input"
            className={cn("flex h-8 w-8 items-center justify-center rounded-xl border border-white/12",
              recOn ? "bg-red-500/80 text-white animate-pulse" : "bg-white/[0.05] text-white/80")}
          >
            <Mic className="h-4 w-4" />
          </button>
        </div>
        <textarea
          rows={4}
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
          placeholder={tool.placeholder}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-3.5 py-3 text-sm outline-none placeholder:text-white/40 focus:ring-2 focus:ring-white/25"
        />
        <button
          onClick={run}
          disabled={!brief.trim() || streaming}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold text-[#070b12] shadow-[0_10px_40px_-10px_rgba(180,220,255,0.6)] transition active:scale-[0.98] disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #ffffff, #d8ecff 60%, #b3d1f5)" }}
        >
          {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {streaming ? "Streaming…" : `Generate · ${tool.label}`}
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
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs text-white/60">Pick a tool, add a brief, and generate.</div>
            </div>
          )}
        </div>

        {output && !streaming && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button onClick={copy} className={cn("flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium active:scale-[0.98]", GLASS)}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={run} className={cn("flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-medium active:scale-[0.98]", GLASS)}>
              <RefreshCw className="h-4 w-4" /> Redo
            </button>
            <button onClick={sendMailto} className="flex items-center justify-center gap-2 rounded-full py-2.5 text-xs font-semibold text-[#070b12] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #ffffff, #d8ecff 60%, #b3d1f5)" }}>
              <Send className="h-4 w-4" /> Open in mail
            </button>
          </div>
        )}
      </section>

      {/* Recent drafts */}
      {drafts.length > 0 && (
        <section className="relative z-10 mx-4 mt-6">
          <div className="mb-2 flex items-center gap-2">
            <Inbox className="h-3.5 w-3.5 text-white/70" />
            <div className="text-[11px] uppercase tracking-wider text-white/60">Recent drafts</div>
          </div>
          <div className="space-y-2">
            {drafts.slice(0, 5).map((d) => {
              const t = TOOLS.find((x) => x.id === d.tool);
              return (
                <button
                  key={d.id}
                  onClick={() => { setActive(d.tool); if (t) setGroup(t.group); setBrief(d.brief); setOutput(d.output); }}
                  className={cn("flex w-full items-center gap-3 rounded-2xl p-3 text-left active:scale-[0.99]", GLASS)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: ACCENT }}>
                    {t ? <t.Icon className="h-4 w-4 text-white" /> : <Mail className="h-4 w-4 text-white" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-medium">{t?.label ?? d.tool}</div>
                    <div className="truncate text-[10.5px] text-white/55">{d.brief}</div>
                  </div>
                  <div className="text-[10px] text-white/40">{timeAgo(d.at)}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <style>{`@keyframes shine { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } } .no-scrollbar::-webkit-scrollbar { display: none } .no-scrollbar { scrollbar-width: none }`}</style>
    </div>
  );
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl" style={{ background: "linear-gradient(to bottom, rgba(7,11,18,0.85), transparent)" }}>
      <Link to="/assistants" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.05]">
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: ACCENT }}>
        <Mail className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="font-display text-lg italic leading-tight"> Email Studio</div>
        <div className="text-[11px] text-white/60">Premium · personalized · streaming</div>
      </div>
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold tracking-wider text-[#f5e6b3]"
        style={{ background: "linear-gradient(135deg, #0a0a0a, #1a1a1a 60%, #2a2010)", border: "1px solid rgba(212,175,55,0.35)" }}>
        <Lock className="h-3 w-3" /> PRO
      </span>
    </header>
  );
}
