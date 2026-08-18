import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Copy, Check, RefreshCw, Plus, Trash2, ShieldAlert, ShieldCheck, ShieldQuestion, Video } from "lucide-react";
import { toast } from "sonner";
import { AssistantShell } from "@/components/samsta/AssistantShell";
import { getAssistant, type Assistant } from "@/lib/assistants";
import { streamSam } from "@/lib/stream-sam";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistants/$tool")({ component: ToolPage });

function ToolPage() {
  const { tool } = Route.useParams();
  const navigate = useNavigate();
  const a = getAssistant(tool);
  useEffect(() => { if (a?.shape === "twin") navigate({ to: "/assistants/digital-twin", replace: true }); }, [a, navigate]);
  if (!a) return <AssistantShell title="Not found" hint="Unknown assistant" accent="#111" icon={null}><div className="p-8 text-center text-sm">This assistant doesn't exist.</div></AssistantShell>;
  if (a.shape === "twin") return null;

  return (
    <AssistantShell title={a.title} hint={a.hint} accent={a.accent} icon={a.icon}>
      {a.shape === "composer" && <Composer a={a} />}
      {a.shape === "planner" && <Planner a={a} />}
      {a.shape === "scheduler" && <Scheduler a={a} />}
      {a.shape === "learning" && <Learning a={a} />}
      {a.shape === "timeline" && <Timeline a={a} />}
      {a.shape === "scanner" && <Scanner a={a} />}
      {a.shape === "search" && <SearchShape a={a} />}
      {a.shape === "avatar" && <AvatarShape a={a} />}
    </AssistantShell>
  );
}

// ─── Shared streamed-output block ──────────────────────────────────────────
function useStream(tool: string) {
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" }); }, [output]);
  const run = async (prompt: string) => {
    if (!prompt.trim() || streaming) return;
    setOutput(""); setStreaming(true);
    try { await streamSam(tool, [{ role: "user", content: prompt }], setOutput); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Something went wrong"); }
    finally { setStreaming(false); }
  };
  return { output, streaming, run, ref };
}

function OutputPane({ output, streaming, refEl }: { output: string; streaming: boolean; refEl: React.RefObject<HTMLDivElement | null> }) {
  const copy = async () => { try { await navigator.clipboard.writeText(output); toast.success("Copied"); } catch { toast.error("Copy failed"); } };
  return (
    <>
      <div ref={refEl} className="mt-4 min-h-[160px] max-h-[52vh] overflow-y-auto rounded-2xl bg-white/40 p-4">
        {output ? <div className="whitespace-pre-wrap text-sm leading-relaxed">{output}</div>
          : streaming ? <ShineLines /> : <div className="py-6 text-center text-xs text-muted-foreground">Your result will appear here</div>}
      </div>
      {output && !streaming && (
        <div className="mt-3 flex gap-2">
          <button onClick={copy} className="glass flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm active:scale-[0.98]"><Copy className="h-4 w-4" />Copy</button>
        </div>
      )}
    </>
  );
}

function ShineLines() {
  return (
    <div className="space-y-2">
      {[80, 60, 90, 45].map((w, i) => (
        <div key={i} className={cn("h-3 rounded-full")}
          style={{ width: `${w}%`,
            background: "linear-gradient(90deg, oklch(0.9 0.02 30 / 0.6), oklch(0.82 0.06 20 / 0.9), oklch(0.9 0.02 30 / 0.6))",
            backgroundSize: "200% 100%", animation: "shine 1.6s linear infinite", animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ─── COMPOSER: tone + free text ────────────────────────────────────────────
function Composer({ a }: { a: Assistant }) {
  const [text, setText] = useState("");
  const [tone, setTone] = useState(a.tones?.[0] ?? "");
  const { output, streaming, run, ref } = useStream(a.key);
  return (
    <div>
      {a.tones && (
        <div className="mb-2 flex flex-wrap gap-2">
          {a.tones.map((t) => (
            <button key={t} onClick={() => setTone(t)}
              className={`rounded-full px-3 py-1 text-[11px] ${tone === t ? "bg-foreground text-background" : "glass"}`}>{t}</button>
          ))}
        </div>
      )}
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4}
        placeholder={a.placeholder}
        className="w-full resize-none rounded-2xl border border-border bg-white/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.82_0.1_20/0.4)]" />
      <button onClick={() => run(tone ? `Tone: ${tone}\n\n${text}` : text)} disabled={!text.trim() || streaming}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        style={{ background: a.accent }}>
        {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {streaming ? "Thinking…" : "Generate"}
      </button>
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}

// ─── PLANNER: multi-field form ─────────────────────────────────────────────
function Planner({ a }: { a: Assistant }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const { output, streaming, run, ref } = useStream(a.key);
  const canGo = a.fields?.some((f) => (values[f.id] ?? "").trim());
  const submit = () => {
    const brief = (a.fields ?? []).map((f) => `${f.label}: ${values[f.id] ?? "(any)"}`).join("\n");
    run(brief);
  };
  return (
    <div>
      <div className="glass rounded-3xl p-4 space-y-3">
        {(a.fields ?? []).map((f) => (
          <label key={f.id} className="block">
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">{f.label}</div>
            {f.type === "textarea" ? (
              <textarea rows={2} value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full resize-none rounded-xl border border-border bg-white/60 px-3 py-2 text-sm outline-none" />
            ) : f.type === "select" ? (
              <select value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                className="w-full rounded-xl border border-border bg-white/60 px-3 py-2 text-sm outline-none">
                <option value="">Choose…</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input type="text" value={values[f.id] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full rounded-xl border border-border bg-white/60 px-3 py-2 text-sm outline-none" />
            )}
          </label>
        ))}
      </div>
      <button onClick={submit} disabled={!canGo || streaming}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        style={{ background: a.accent }}>
        {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {streaming ? "Building…" : "Build my plan"}
      </button>
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}

// ─── SCHEDULER: local list + AI plan ──────────────────────────────────────
type Item = { id: string; title: string; when?: string; note?: string };
function useLocalList(key: string) {
  const [items, setItems] = useState<Item[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(items)); } catch { /* */ } }, [key, items]);
  return [items, setItems] as const;
}
function Scheduler({ a }: { a: Assistant }) {
  const [items, setItems] = useLocalList(`samsta:${a.key}:items`);
  const [title, setTitle] = useState(""); const [when, setWhen] = useState("");
  const { output, streaming, run, ref } = useStream(a.key);
  const add = () => { if (!title.trim()) return; setItems([{ id: crypto.randomUUID(), title, when }, ...items]); setTitle(""); setWhen(""); };
  const plan = () => run(items.map((i) => `- ${i.title}${i.when ? ` (${i.when})` : ""}`).join("\n") || a.placeholder);
  return (
    <div>
      <div className="glass rounded-3xl p-3">
        <div className="flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={a.placeholder}
            className="flex-1 rounded-xl border border-border bg-white/60 px-3 py-2 text-sm outline-none" />
          <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="When"
            className="w-24 rounded-xl border border-border bg-white/60 px-3 py-2 text-sm outline-none" />
          <button onClick={add} className="rounded-xl bg-foreground px-3 text-background"><Plus className="h-4 w-4" /></button>
        </div>
        <ul className="mt-3 space-y-1.5">
          {items.length === 0 && <li className="py-2 text-center text-[11px] text-muted-foreground">Nothing yet.</li>}
          {items.map((i) => (
            <li key={i.id} className="flex items-center justify-between rounded-xl bg-white/50 px-3 py-2 text-sm">
              <div><div>{i.title}</div>{i.when && <div className="text-[10px] text-muted-foreground">{i.when}</div>}</div>
              <button onClick={() => setItems(items.filter((x) => x.id !== i.id))} aria-label="Remove"><Trash2 className="h-4 w-4 opacity-60" /></button>
            </li>
          ))}
        </ul>
      </div>
      <button onClick={plan} disabled={streaming}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        style={{ background: a.accent }}>
        {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {streaming ? "Planning…" : "Plan my day"}
      </button>
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}

// ─── LEARNING: tabbed modes ────────────────────────────────────────────────
function Learning({ a }: { a: Assistant }) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"explain" | "summary" | "quiz">("explain");
  const { output, streaming, run, ref } = useStream("learning");
  const submit = () => {
    const map = { explain: "Explain this topic like a lesson.", summary: "Summarize this.", quiz: "Make a 3-question quiz with answers." };
    run(`${map[mode]}\n\n${text}`);
  };
  return (
    <div>
      <div className="mb-3 flex gap-2">
        {(["explain", "summary", "quiz"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs capitalize ${mode === m ? "bg-foreground text-background" : "glass"}`}>{m}</button>
        ))}
      </div>
      <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={a.placeholder}
        className="w-full resize-none rounded-2xl border border-border bg-white/60 px-4 py-3 text-sm outline-none" />
      <button onClick={submit} disabled={!text.trim() || streaming}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        style={{ background: a.accent }}>
        {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Go
      </button>
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}

// ─── TIMELINE: memories / KB ───────────────────────────────────────────────
function Timeline({ a }: { a: Assistant }) {
  const [items, setItems] = useLocalList(`samsta:${a.key}:notes`);
  const [note, setNote] = useState(""); const [q, setQ] = useState("");
  const { output, streaming, run, ref } = useStream(a.key);
  const add = () => { if (!note.trim()) return; setItems([{ id: crypto.randomUUID(), title: note.slice(0, 60), note }, ...items]); setNote(""); };
  const filtered = q ? items.filter((i) => (i.note || "").toLowerCase().includes(q.toLowerCase())) : items;
  const organize = () => run(items.map((i) => i.note).join("\n\n") || "no items");
  return (
    <div>
      <div className="glass rounded-3xl p-3">
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={a.placeholder}
          className="w-full resize-none rounded-xl border border-border bg-white/60 px-3 py-2 text-sm outline-none" />
        <button onClick={add} className="mt-2 w-full rounded-xl bg-foreground py-2 text-sm text-background">Add</button>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search notes…"
        className="mt-3 w-full rounded-full border border-border bg-white/60 px-4 py-2 text-sm outline-none" />
      <ul className="mt-2 space-y-1.5">
        {filtered.length === 0 && <li className="py-4 text-center text-[11px] text-muted-foreground">No entries.</li>}
        {filtered.map((i) => (
          <li key={i.id} className="rounded-xl bg-white/50 px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="whitespace-pre-wrap">{i.note}</div>
              <button onClick={() => setItems(items.filter((x) => x.id !== i.id))} aria-label="Remove"><Trash2 className="h-4 w-4 opacity-60" /></button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={organize} disabled={streaming || items.length === 0}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        style={{ background: a.accent }}>
        {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Organize with
      </button>
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}

// ─── SCANNER: privacy guardian ─────────────────────────────────────────────
function Scanner({ a }: { a: Assistant }) {
  const [text, setText] = useState("");
  const { output, streaming, run, ref } = useStream("privacy_guard");
  const risk = output.match(/Risk:\s*(low|medium|high)/i)?.[1]?.toLowerCase();
  const RiskBadge = () => {
    if (!risk) return null;
    const map = { low: { bg: "bg-emerald-500", Icon: ShieldCheck }, medium: { bg: "bg-amber-500", Icon: ShieldQuestion }, high: { bg: "bg-red-600", Icon: ShieldAlert } } as const;
    const cfg = map[risk as keyof typeof map];
    return (
      <div className={`mt-3 flex items-center gap-2 rounded-2xl px-4 py-3 text-white ${cfg.bg}`}>
        <cfg.Icon className="h-5 w-5" /><span className="text-sm font-medium">Risk: {risk.toUpperCase()}</span>
      </div>
    );
  };
  return (
    <div>
      <textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={a.placeholder}
        className="w-full resize-none rounded-2xl border border-border bg-white/60 px-4 py-3 text-sm outline-none" />
      <button onClick={() => run(text)} disabled={!text.trim() || streaming}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        style={{ background: a.accent }}>
        {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />} Scan
      </button>
      <RiskBadge />
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}

// ─── SEARCH ────────────────────────────────────────────────────────────────
function SearchShape({ a }: { a: Assistant }) {
  const [q, setQ] = useState("");
  const { output, streaming, run, ref } = useStream("ai_search_pro");
  return (
    <div>
      <div className="glass flex items-center gap-2 rounded-full p-1.5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.placeholder}
          onKeyDown={(e) => e.key === "Enter" && run(q)}
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button onClick={() => run(q)} disabled={!q.trim() || streaming}
          className="rounded-full px-4 py-2 text-sm text-white" style={{ background: a.accent }}>
          {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Search"}
        </button>
      </div>
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}

// ─── AVATAR ────────────────────────────────────────────────────────────────
function AvatarShape({ a }: { a: Assistant }) {
  const [text, setText] = useState("");
  const [fmt, setFmt] = useState<"video" | "voice" | "presentation">("video");
  const { output, streaming, run, ref } = useStream("ai_avatar");
  return (
    <div>
      <div className="glass mb-3 flex items-center justify-center gap-4 rounded-3xl p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black text-white"><Video className="h-8 w-8" /></div>
        <div>
          <div className="font-display italic">Your Avatar</div>
          <div className="text-[11px] text-muted-foreground">Preview only — connect voice/video later.</div>
        </div>
      </div>
      <div className="mb-3 flex gap-2">
        {(["video", "voice", "presentation"] as const).map((f) => (
          <button key={f} onClick={() => setFmt(f)}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs capitalize ${fmt === f ? "bg-foreground text-background" : "glass"}`}>{f}</button>
        ))}
      </div>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={a.placeholder}
        className="w-full resize-none rounded-2xl border border-border bg-white/60 px-4 py-3 text-sm outline-none" />
      <button onClick={() => run(`Format: ${fmt}\n\n${text}`)} disabled={!text.trim() || streaming}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
        style={{ background: a.accent }}>
        {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Write script
      </button>
      <OutputPane output={output} streaming={streaming} refEl={ref} />
    </div>
  );
}
