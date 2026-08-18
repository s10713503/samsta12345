import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookMarked, Sparkles, Send, Plus, Search, FolderTree, Files,
  Bookmark, Mic, Image as ImageIcon, Link as LinkIcon, Tag, Trash2,
  Star, Archive, Brain, Network, Zap, Loader2, Bot, Copy, Download,
  BookOpen, GraduationCap, ClipboardEdit, ChevronRight, Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/knowledge")({
  component: KnowledgeBase,
  head: () => ({
    meta: [
      { title: "Knowledge Base · Samsta" },
      { name: "description", content: "Your Second Brain— notes, docs, bookmarks, voice, images. Semantic search, flashcards, mind maps, insights." },
    ],
  }),
});

/* ============================================================
 Data model (client-side; premium layered on top)
============================================================ */
type NoteKind = "note" | "url" | "pdf" | "voice" | "image" | "chat";
type Note = {
  id: string;
  kind: NoteKind;
  title: string;
  body: string;
  url?: string;
  tags: string[];
  category: string;
  folder: string;
  summary_short?: string;
  key_points?: string[];
  linked?: string[];
  favorite: boolean;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
};
type Folder = { id: string; name: string; color: string };
type State = { notes: Note[]; folders: Folder[]; language: string };

const DEFAULT: State = {
  notes: [], folders: [
    { id: "inbox", name: "Inbox", color: "from-rose-400/30 to-pink-300/30" },
    { id: "work", name: "Work", color: "from-indigo-400/30 to-cyan-300/30" },
    { id: "study", name: "Study", color: "from-emerald-400/30 to-teal-300/30" },
    { id: "ideas", name: "Ideas", color: "from-amber-400/30 to-orange-300/30" },
  ], language: "English",
};
const keyFor = (uid: string) => `samsta:kb:${uid}`;
function useStore(uid: string) {
  const [s, setS] = useState<State>(DEFAULT);
  useEffect(() => {
    try { const raw = localStorage.getItem(keyFor(uid)); if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) }); } catch { /* noop */ }
  }, [uid]);
  useEffect(() => { try { localStorage.setItem(keyFor(uid), JSON.stringify(s)); } catch { /* noop */ } }, [uid, s]);
  return [s, setS] as const;
}
const uid = () => Math.random().toString(36).slice(2, 10);

async function askJSON<T = unknown>(tool: string, payload: object): Promise<T | null> {
  try {
    const raw = await streamSam(tool, [{ role: "user", content: JSON.stringify(payload) }], () => {});
    const m = raw.match(/\{[\s\S]*\}$/) ?? raw.match(/\{[\s\S]*\}/);
    return m ? (JSON.parse(m[0]) as T) : null;
  } catch { return null; }
}

/* ============================================================
   UI primitives
============================================================ */
function Glass({ className, children, style }: { className?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={style} className={cn("rounded-3xl border border-foreground/10 bg-background/40 backdrop-blur-2xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.25)]", className)}>{children}</div>;
}
function GradientHeader({ icon, title, sub, accent = "from-indigo-400/30 via-fuchsia-300/20 to-rose-300/20" }: { icon: React.ReactNode; title: string; sub: string; accent?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-3xl border border-foreground/10 p-4", "bg-gradient-to-br", accent)}>
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-background/50 backdrop-blur-xl border border-foreground/10">{icon}</div>
        <div>
          <div className="font-display italic text-lg leading-tight">{title}</div>
          <div className="text-[11px] text-foreground/60">{sub}</div>
        </div>
      </div>
    </div>
  );
}
function Chip({ active, children, onClick }: { active?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap border transition active:scale-95",
      active ? "bg-foreground text-background border-foreground shadow" : "bg-background/50 border-foreground/10 text-foreground/70 hover:text-foreground",
    )}>{children}</button>
  );
}

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Brain },
  { id: "notes", label: "Notes", icon: Files },
  { id: "search", label: "Search", icon: Search },
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "graph", label: "Mind Map", icon: Network },
  { id: "sam", label: "Ask Sam", icon: Bot },
];

/* ============================================================
   Root
============================================================ */
function KnowledgeBase() {
  const { user } = useAuthUser();
  const { isPremium } = usePremium();
  const [store, setStore] = useStore(user?.id ?? "guest");
  const [tab, setTab] = useState<string>("dashboard");
  const [captureOpen, setCaptureOpen] = useState(false);

  if (!user) {
    return <div className="min-h-dvh grid place-items-center p-6">
      <Glass className="p-6 text-center max-w-sm">
        <BookMarked className="mx-auto h-8 w-8 opacity-70" />
        <div className="mt-3 font-display italic text-xl">Sign in to build your Second Brain</div>
        <Link to="/auth" className="mt-4 inline-flex rounded-full bg-foreground text-background px-4 py-2 text-sm">Sign in</Link>
      </Glass>
    </div>;
  }
  // Knowledge feed is free for everyone.

  return (
    <div className="min-h-dvh pb-28 relative overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-300/15 blur-[120px] animate-pulse" />
        <div className="absolute top-40 right-0 h-96 w-96 rounded-full bg-fuchsia-300/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-emerald-200/10 blur-[120px]" />
      </div>

      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-background/60 border-b border-foreground/5">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link to="/assistants" className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="flex-1 min-w-0">
            <div className="font-display italic text-lg leading-tight truncate">Knowledge Base</div>
            <div className="text-[11px] text-foreground/60 truncate">Your Second Brain· {store.notes.length} notes</div>
          </div>
          <button onClick={() => setCaptureOpen(true)} className="grid place-items-center h-9 w-9 rounded-full bg-foreground text-background"><Plus className="h-4 w-4" /></button>
        </div>
        <div className="px-3 pb-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap border transition active:scale-95",
                  tab === t.id ? "bg-foreground text-background border-foreground shadow" : "bg-background/50 border-foreground/10 text-foreground/70")}>
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {tab === "dashboard" && <DashboardTab store={store} onNew={() => setCaptureOpen(true)} onOpenTab={setTab} />}
        {tab === "notes" && <NotesTab store={store} setStore={setStore} onNew={() => setCaptureOpen(true)} />}
        {tab === "search" && <SearchTab store={store} />}
        {tab === "study" && <StudyTab store={store} />}
        {tab === "graph" && <MindMapTab store={store} />}
        {tab === "sam" && <SamTab store={store} />}
      </div>

      {captureOpen && <CaptureSheet onClose={() => setCaptureOpen(false)} onSave={(n) => { setStore((s) => ({ ...s, notes: [n, ...s.notes] })); setCaptureOpen(false); toast.success("Saved to your Second Brain"); }} language={store.language} folders={store.folders} />}
    </div>
  );
}

/* ============================================================
   Dashboard
============================================================ */
function DashboardTab({ store, onNew, onOpenTab }: { store: State; onNew: () => void; onOpenTab: (id: string) => void }) {
  const total = store.notes.length;
  const docs = store.notes.filter((n) => n.kind === "pdf").length;
  const bookmarks = store.notes.filter((n) => n.kind === "url").length;
  const voice = store.notes.filter((n) => n.kind === "voice").length;
  const favs = store.notes.filter((n) => n.favorite).length;
  const recentAdded = [...store.notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const recentViewed = [...store.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);
  const knowledgeScore = Math.min(100, total * 4 + favs * 2);

  const [insight, setInsight] = useState("");
  const [loading, setLoading] = useState(false);
  const runInsights = async () => {
    if (store.notes.length === 0) { toast.error("Add a few notes first"); return; }
    setLoading(true); setInsight("");
    try {
      const acc = await streamSam("kb_insights", [{ role: "user", content: JSON.stringify({ notes: store.notes.map((n) => ({ tags: n.tags, category: n.category, updated: n.updatedAt })) }) }], setInsight);
      setInsight(acc);
    } finally { setLoading(false); }
  };

  const stats = [
    { label: "Notes", value: total, icon: Files, tint: "from-rose-400/30 to-pink-300/30" },
    { label: "Documents", value: docs, icon: BookOpen, tint: "from-indigo-400/30 to-cyan-300/30" },
    { label: "Bookmarks", value: bookmarks, icon: Bookmark, tint: "from-emerald-400/30 to-teal-300/30" },
    { label: "Voice", value: voice, icon: Mic, tint: "from-amber-400/30 to-orange-300/30" },
  ];

  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Brain className="h-5 w-5" />} title="Your Second Brain" sub="Ideas, notes, docs — all connected" />

      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <Glass key={s.label} className={cn("p-3 text-center animate-fade-up bg-gradient-to-br", s.tint)} style={{ animationDelay: `${i * 40}ms` }}>
            <s.icon className="h-4 w-4 mx-auto opacity-80" />
            <div className="mt-1 font-display italic text-lg leading-none">{s.value}</div>
            <div className="text-[10px] text-foreground/70 mt-0.5">{s.label}</div>
          </Glass>
        ))}
      </div>

      <Glass className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-foreground/60">Knowledge Score</div>
            <div className="font-display italic text-2xl">{knowledgeScore}<span className="text-sm text-foreground/50">/100</span></div>
          </div>
          <div className="w-24 h-24 relative">
            <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
              <circle cx={50} cy={50} r={44} stroke="currentColor" className="text-foreground/10" strokeWidth={8} fill="none" />
              <circle cx={50} cy={50} r={44} stroke="url(#g)" strokeWidth={8} fill="none" strokeLinecap="round"
                strokeDasharray={276} strokeDashoffset={276 - (knowledgeScore / 100) * 276}
                style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }} />
              <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#f472b6" /></linearGradient></defs>
            </svg>
          </div>
        </div>
        <button onClick={runInsights} disabled={loading} className="mt-3 w-full rounded-full bg-foreground text-background text-sm py-2.5 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <><Sparkles className="inline h-4 w-4 mr-1" /> Monthly Insights</>}
        </button>
        {insight && <div className="mt-3 rounded-2xl bg-background/40 border border-foreground/10 p-3 whitespace-pre-wrap text-sm">{insight}</div>}
      </Glass>

      <div className="grid grid-cols-2 gap-2">
        <Glass className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Recently added</div>
          {recentAdded.length === 0 ? <button onClick={onNew} className="w-full text-sm rounded-2xl border border-dashed border-foreground/20 p-3 text-foreground/60">+ Add your first note</button>
            : <ul className="space-y-1.5 text-[13px]">{recentAdded.map((n) => <li key={n.id} className="truncate">📝 {n.title}</li>)}</ul>}
        </Glass>
        <Glass className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Recently viewed</div>
          {recentViewed.length === 0 ? <div className="text-sm text-foreground/60">Nothing yet.</div>
            : <ul className="space-y-1.5 text-[13px]">{recentViewed.map((n) => <li key={n.id} className="truncate">👁 {n.title}</li>)}</ul>}
        </Glass>
      </div>

      <Glass className="p-3">
        <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Jump to</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "notes", label: "All notes", icon: Files },
            { id: "search", label: "Search", icon: Search },
            { id: "study", label: "Study", icon: GraduationCap },
            { id: "graph", label: "Mind Map", icon: Network },
            { id: "sam", label: "Ask Sam", icon: Bot },
          ].map((q) => (
            <button key={q.id} onClick={() => onOpenTab(q.id)} className="rounded-2xl border border-foreground/10 bg-background/50 p-3 flex flex-col items-center gap-1 text-[11px] active:scale-95">
              <q.icon className="h-4 w-4" /> {q.label}
            </button>
          ))}
        </div>
      </Glass>
    </div>
  );
}

/* ============================================================
   Notes
============================================================ */
function NotesTab({ store, setStore, onNew }: { store: State; setStore: React.Dispatch<React.SetStateAction<State>>; onNew: () => void }) {
  const [folder, setFolder] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Note | null>(null);
  const filtered = useMemo(() => {
    let ns = store.notes.filter((n) => !n.archived);
    if (folder !== "all") ns = ns.filter((n) => n.folder === folder);
    if (query.trim()) {
      const q = query.toLowerCase();
      ns = ns.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q) || n.tags.join(" ").toLowerCase().includes(q));
    }
    return ns.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [store.notes, folder, query]);

  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Files className="h-5 w-5" />} title="Your notes" sub={`${store.notes.length} across ${store.folders.length} folders`} accent="from-emerald-300/30 via-teal-300/20 to-cyan-300/20" />

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles, body, tags…" className="w-full rounded-full bg-background/60 border border-foreground/10 pl-9 pr-3 py-2 text-sm outline-none focus:border-foreground/30" />
        </div>
        <button onClick={onNew} className="rounded-full bg-foreground text-background px-3 py-2 text-sm inline-flex items-center gap-1"><Plus className="h-4 w-4" /> New</button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        <Chip active={folder === "all"} onClick={() => setFolder("all")}>All</Chip>
        {store.folders.map((f) => <Chip key={f.id} active={folder === f.id} onClick={() => setFolder(f.id)}>{f.name}</Chip>)}
      </div>

      <div className="space-y-2">
        {filtered.map((n, i) => (
          <Glass key={n.id} className="p-3 animate-fade-up cursor-pointer" style={{ animationDelay: `${i * 30}ms` }}>
            <div onClick={() => setOpen(n)}>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-foreground/60">
                <span>{n.kind} · {n.category || store.folders.find((f) => f.id === n.folder)?.name}</span>
                <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-1 font-display italic text-[15px] leading-snug">{n.title}</div>
              {n.summary_short && <div className="text-[12px] text-foreground/70 mt-0.5">{n.summary_short}</div>}
              {n.tags.length > 0 && <div className="mt-2 flex gap-1 flex-wrap">{n.tags.map((t) => <span key={t} className="text-[10px] rounded-full bg-foreground/5 px-2 py-0.5">#{t}</span>)}</div>}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <button onClick={() => setStore((s) => ({ ...s, notes: s.notes.map((x) => x.id === n.id ? { ...x, favorite: !x.favorite, updatedAt: Date.now() } : x) }))} className="grid place-items-center h-7 w-7 rounded-full border border-foreground/10 bg-background/50"><Star className={cn("h-3.5 w-3.5", n.favorite && "fill-amber-500 text-amber-500")} /></button>
              <button onClick={() => setStore((s) => ({ ...s, notes: s.notes.map((x) => x.id === n.id ? { ...x, archived: true } : x) }))} className="grid place-items-center h-7 w-7 rounded-full border border-foreground/10 bg-background/50"><Archive className="h-3.5 w-3.5" /></button>
              <button onClick={() => setStore((s) => ({ ...s, notes: s.notes.filter((x) => x.id !== n.id) }))} className="grid place-items-center h-7 w-7 rounded-full border border-foreground/10 bg-background/50 text-rose-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </Glass>
        ))}
        {filtered.length === 0 && <Glass className="p-6 text-center text-sm text-foreground/60">No notes yet. Tap + to capture your first thought.</Glass>}
      </div>

      {open && <NoteSheet note={open} onClose={() => setOpen(null)} onSave={(n) => { setStore((s) => ({ ...s, notes: s.notes.map((x) => x.id === n.id ? n : x) })); setOpen(null); }} language={store.language} />}
    </div>
  );
}

function NoteSheet({ note, onClose, onSave, language }: { note: Note; onClose: () => void; onSave: (n: Note) => void; language: string }) {
  const [n, setN] = useState<Note>(note);
  const [busy, setBusy] = useState<string | null>(null);
  const rewrite = async (mode: "improve"|"shorten"|"expand"|"bullets"|"academic"|"casual") => {
    setBusy(mode);
    try {
      const acc = await streamSam("kb_writing", [{ role: "user", content: JSON.stringify({ draft: n.body, mode, language }) }], (d) => setN((x) => ({ ...x, body: d })));
      setN((x) => ({ ...x, body: acc, updatedAt: Date.now() }));
    } finally { setBusy(null); }
  };
  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xl overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="min-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></button>
            <button onClick={() => onSave({ ...n, updatedAt: Date.now() })} className="rounded-full bg-foreground text-background px-4 py-2 text-sm">Save</button>
          </div>
          <Glass className="p-3">
            <input value={n.title} onChange={(e) => setN({ ...n, title: e.target.value })} className="w-full bg-transparent text-lg font-display italic outline-none" />
            <textarea value={n.body} onChange={(e) => setN({ ...n, body: e.target.value })} rows={12} className="w-full mt-2 bg-background/40 border border-foreground/10 rounded-2xl p-3 text-sm outline-none focus:border-foreground/30" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {n.tags.map((t) => <span key={t} className="text-[10px] rounded-full bg-foreground/5 px-2 py-0.5">#{t} <button className="opacity-60" onClick={() => setN({ ...n, tags: n.tags.filter((x) => x !== t) })}>×</button></span>)}
              <TagAdd onAdd={(t) => setN({ ...n, tags: Array.from(new Set([...n.tags, t])) })} />
            </div>
          </Glass>
          <Glass className="p-3">
            <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2"> Writing Assistant</div>
            <div className="grid grid-cols-3 gap-2">
              {(["improve","shorten","expand","bullets","academic","casual"] as const).map((m) => (
                <button key={m} disabled={busy !== null} onClick={() => rewrite(m)} className="rounded-full bg-background/60 border border-foreground/10 py-2 text-[12px] capitalize active:scale-95 disabled:opacity-60">{busy === m ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : m}</button>
              ))}
            </div>
          </Glass>
          {n.key_points && n.key_points.length > 0 && (
            <Glass className="p-3"><div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Key points</div><ul className="text-sm list-disc list-inside space-y-1">{n.key_points.map((k, i) => <li key={i}>{k}</li>)}</ul></Glass>
          )}
        </div>
      </div>
    </div>
  );
}
function TagAdd({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <span className="inline-flex items-center gap-1">
      <input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onAdd(v.trim().toLowerCase().replace(/^#/, "")); setV(""); } }} placeholder="+tag" className="rounded-full bg-background border border-foreground/20 px-2 py-1 text-[11px] w-16 outline-none" />
    </span>
  );
}

/* ============================================================
   Capture (new note / bookmark / voice / image)
============================================================ */
function CaptureSheet({ onClose, onSave, language, folders }: { onClose: () => void; onSave: (n: Note) => void; language: string; folders: Folder[] }) {
  const [kind, setKind] = useState<NoteKind>("note");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [folder, setFolder] = useState<string>(folders[0]?.id ?? "inbox");
  const [busy, setBusy] = useState(false);

  const kinds: Array<{ id: NoteKind; icon: React.ElementType; label: string }> = [
    { id: "note", icon: ClipboardEdit, label: "Note" },
    { id: "url", icon: LinkIcon, label: "Bookmark" },
    { id: "pdf", icon: BookOpen, label: "Document" },
    { id: "voice", icon: Mic, label: "Voice" },
    { id: "image", icon: ImageIcon, label: "Image" },
    { id: "chat", icon: Bot, label: "Chat" },
  ];

  const capture = async () => {
    const content = (kind === "url" ? `${url}\n\n${body}` : body).trim();
    if (!content) { toast.error("Add some content first"); return; }
    setBusy(true);
    try {
      type Ing = { title: string; summary_short: string; summary_long: string; tags: string[]; category: string; key_points: string[]; linked_concepts: string[] };
      const r = await askJSON<Ing>("kb_ingest", { content, kind, language });
      const n: Note = {
        id: uid(), kind, title: r?.title || content.slice(0, 60), body: content, url: kind === "url" ? url : undefined,
        tags: r?.tags ?? [], category: r?.category ?? "Personal", folder,
        summary_short: r?.summary_short, key_points: r?.key_points, linked: r?.linked_concepts,
        favorite: false, archived: false, createdAt: Date.now(), updatedAt: Date.now(),
      };
      onSave(n);
    } catch { toast.error("Couldn't process — saving as raw note"); onSave({ id: uid(), kind, title: content.slice(0, 60), body: content, url: kind === "url" ? url : undefined, tags: [], category: "Personal", folder, favorite: false, archived: false, createdAt: Date.now(), updatedAt: Date.now() }); }
      finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-xl overflow-y-auto animate-fade-in" onClick={onClose}>
      <div className="min-h-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <button onClick={onClose} className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></button>
            <div className="text-sm font-display italic">Capture to Second Brain</div>
            <div className="w-9" />
          </div>
          <Glass className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {kinds.map((k) => (
                <button key={k.id} onClick={() => setKind(k.id)}
                  className={cn("rounded-2xl border p-3 flex flex-col items-center gap-1 text-[11px] active:scale-95",
                    kind === k.id ? "bg-foreground text-background border-foreground" : "bg-background/50 border-foreground/10")}>
                  <k.icon className="h-4 w-4" /> {k.label}
                </button>
              ))}
            </div>
          </Glass>
          <Glass className="p-3">
            {kind === "url" && (
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="w-full rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none mb-2" />
            )}
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder={kind === "voice" ? "Paste voice transcription…" : kind === "image" ? "Describe or paste OCR text…" : "Type or paste content…"}
              className="w-full rounded-2xl bg-background/60 border border-foreground/10 p-3 text-sm outline-none focus:border-foreground/30" />
            <div className="mt-2 flex items-center gap-2">
              <select value={folder} onChange={(e) => setFolder(e.target.value)} className="rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none">
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <button onClick={capture} disabled={busy} className="ml-auto rounded-full bg-foreground text-background px-4 py-2 text-sm inline-flex items-center gap-1 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4" /> Save with </>}
              </button>
            </div>
            <div className="text-[10px] text-foreground/60 mt-2">Sam auto-generates title, summary, tags, key points, and linked concepts.</div>
          </Glass>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Semantic Search
============================================================ */
function SearchTab({ store }: { store: State }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ answer: string; best_ids: string[]; related_tags: string[]; follow_ups: string[] } | null>(null);
  const run = async () => {
    if (!q.trim()) return;
    setBusy(true);
    const r = await askJSON<typeof res>("kb_search", {
      query: q,
      notes: store.notes.map((n) => ({ id: n.id, title: n.title, snippet: (n.summary_short ?? n.body).slice(0, 240), tags: n.tags, category: n.category })),
    });
    setBusy(false); setRes(r);
  };
  const matches = res ? store.notes.filter((n) => res.best_ids.includes(n.id)) : [];
  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Search className="h-5 w-5" />} title="Semantic Search" sub="Ask in natural language across your Second Brain" accent="from-cyan-400/30 via-indigo-300/20 to-fuchsia-300/20" />
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()} placeholder="e.g. Find blockchain notes from last month" className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-4 py-3 text-sm outline-none focus:border-foreground/30" />
        <button onClick={run} disabled={busy} className="rounded-full bg-foreground text-background px-4 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}</button>
      </div>
      {res && (
        <>
          <Glass className="p-4"><div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-1">Sam's answer</div><div className="text-sm whitespace-pre-wrap">{res.answer}</div></Glass>
          {matches.length > 0 && (
            <Glass className="p-3">
              <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Best matches</div>
              <ul className="space-y-2">{matches.map((n) => (
                <li key={n.id} className="rounded-2xl border border-foreground/10 bg-background/40 p-3">
                  <div className="font-display italic text-sm">{n.title}</div>
                  <div className="text-[12px] text-foreground/70">{n.summary_short ?? n.body.slice(0, 140)}</div>
                </li>
              ))}</ul>
            </Glass>
          )}
          {res.related_tags?.length > 0 && <div className="flex flex-wrap gap-1.5">{res.related_tags.map((t) => <Chip key={t}>#{t}</Chip>)}</div>}
          {res.follow_ups?.length > 0 && <Glass className="p-3"><div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Follow-ups</div><ul className="space-y-1 text-sm">{res.follow_ups.map((f, i) => <li key={i} className="flex items-center gap-2"><ChevronRight className="h-3.5 w-3.5" /> <button className="text-left" onClick={() => { setQ(f); void run(); }}>{f}</button></li>)}</ul></Glass>}
        </>
      )}
    </div>
  );
}

/* ============================================================
   Study — flashcards & quiz from notes
============================================================ */
function StudyTab({ store }: { store: State }) {
  const [source, setSource] = useState<string>("");
  const [mode, setMode] = useState<"flash"|"quiz">("flash");
  const [busy, setBusy] = useState(false);
  const [cards, setCards] = useState<Array<{ front: string; back: string; difficulty?: string }>>([]);
  const [quiz, setQuiz] = useState<Array<{ q: string; choices: string[]; answer: number; explain: string }>>([]);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [picks, setPicks] = useState<Record<number, number>>({});

  const noteMap = useMemo(() => Object.fromEntries(store.notes.map((n) => [n.id, n])), [store.notes]);
  const run = async () => {
    const content = source === "all"
      ? store.notes.map((n) => `# ${n.title}\n${n.body}`).slice(0, 20).join("\n\n")
      : (noteMap[source]?.body ?? "");
    if (!content.trim()) { toast.error("Select a note first"); return; }
    setBusy(true); setCards([]); setQuiz([]);
    if (mode === "flash") {
      const r = await askJSON<{ cards: typeof cards }>("kb_flashcards", { content, count: 8, language: store.language });
      if (r?.cards) setCards(r.cards);
    } else {
      const r = await askJSON<{ questions: typeof quiz }>("kb_quiz", { content, count: 5, language: store.language });
      if (r?.questions) setQuiz(r.questions);
    }
    setBusy(false);
  };
  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<GraduationCap className="h-5 w-5" />} title="Study from your notes" sub="flashcards & quizzes from your Second Brain" accent="from-emerald-400/30 via-lime-300/20 to-amber-300/20" />
      <Glass className="p-3 space-y-2">
        <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none">
          <option value="">Pick a source…</option>
          <option value="all">All notes (last 20)</option>
          {store.notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>
        <div className="flex gap-1.5">
          <Chip active={mode === "flash"} onClick={() => setMode("flash")}>Flashcards</Chip>
          <Chip active={mode === "quiz"} onClick={() => setMode("quiz")}>Quiz</Chip>
        </div>
        <button onClick={run} disabled={busy} className="w-full rounded-full bg-foreground text-background text-sm py-2.5 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Generate with"}
        </button>
      </Glass>

      {mode === "flash" && cards.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {cards.map((c, i) => (
            <button key={i} onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))} className={cn("rounded-3xl border border-foreground/10 p-4 min-h-[120px] text-left text-sm transition bg-gradient-to-br", i % 2 ? "from-rose-400/20 to-fuchsia-300/20" : "from-indigo-400/20 to-cyan-300/20")}>
              <div className="text-[10px] uppercase tracking-wide text-foreground/60 mb-1">{flipped[i] ? "Back" : "Front"} · {c.difficulty ?? "medium"}</div>
              <div className="font-display italic">{flipped[i] ? c.back : c.front}</div>
            </button>
          ))}
        </div>
      )}

      {mode === "quiz" && quiz.length > 0 && (
        <div className="space-y-3">
          {quiz.map((q, i) => (
            <Glass key={i} className="p-3">
              <div className="text-[11px] uppercase tracking-wide text-foreground/60">Question {i + 1}</div>
              <div className="mt-1 text-sm font-medium">{q.q}</div>
              <div className="mt-2 grid gap-1.5">
                {q.choices.map((ch, ci) => {
                  const picked = picks[i];
                  const correct = q.answer === ci;
                  const isPicked = picked === ci;
                  const show = picked !== undefined;
                  return (
                    <button key={ci} onClick={() => setPicks((p) => ({ ...p, [i]: ci }))}
                      className={cn("rounded-2xl border px-3 py-2 text-left text-sm transition",
                        !show && "bg-background/50 border-foreground/10",
                        show && correct && "bg-emerald-500/15 border-emerald-500/40",
                        show && !correct && isPicked && "bg-rose-500/15 border-rose-500/40",
                        show && !correct && !isPicked && "bg-background/40 border-foreground/10 opacity-70")}>
                      {ch}
                    </button>
                  );
                })}
              </div>
              {picks[i] !== undefined && <div className="mt-2 text-[12px] text-foreground/70"><b>Why:</b> {q.explain}</div>}
            </Glass>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Mind Map
============================================================ */
function MindMapTab({ store }: { store: State }) {
  const [source, setSource] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const run = async () => {
    const content = source === "all"
      ? store.notes.map((n) => `# ${n.title}\n${n.body}`).slice(0, 15).join("\n\n")
      : (store.notes.find((n) => n.id === source)?.body ?? "");
    if (!content.trim()) { toast.error("Pick a source"); return; }
    setBusy(true); setText("");
    const acc = await streamSam("kb_mindmap", [{ role: "user", content: JSON.stringify({ content, language: store.language }) }], setText);
    setText(acc); setBusy(false);
  };
  return (
    <div className="space-y-4 animate-fade-up">
      <GradientHeader icon={<Network className="h-5 w-5" />} title="Mind Map" sub="Turn your notes into a knowledge graph" accent="from-fuchsia-400/30 via-indigo-300/20 to-cyan-300/20" />
      <Glass className="p-3 space-y-2">
        <select value={source} onChange={(e) => setSource(e.target.value)} className="w-full rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none">
          <option value="">Pick a source…</option>
          <option value="all">All notes (last 15)</option>
          {store.notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>
        <button onClick={run} disabled={busy} className="w-full rounded-full bg-foreground text-background text-sm py-2.5 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Generate Mind Map"}</button>
      </Glass>
      {text && (
        <Glass className="p-3">
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2 flex items-center justify-between">
            <span>Mermaid mindmap</span>
            <button onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }} className="inline-flex items-center gap-1 text-[11px]"><Copy className="h-3 w-3" /> copy</button>
          </div>
          <pre className="text-[11px] whitespace-pre-wrap font-mono bg-background/60 border border-foreground/10 rounded-2xl p-3 overflow-x-auto">{text}</pre>
          <div className="text-[10px] text-foreground/60 mt-2">Paste into any Mermaid renderer to visualize.</div>
        </Glass>
      )}
    </div>
  );
}

/* ============================================================
   Ask Sam over your Knowledge
============================================================ */
function SamTab({ store }: { store: State }) {
  const [q, setQ] = useState("");
  const [msgs, setMsgs] = useState<Array<{ role: "user"|"assistant"; content: string }>>([]);
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const ask = async () => {
    const question = q.trim(); if (!question) return;
    const context_notes = store.notes.slice(0, 30).map((n) => ({ title: n.title, snippet: (n.summary_short ?? n.body).slice(0, 300) }));
    const next = [...msgs, { role: "user" as const, content: question }];
    setMsgs([...next, { role: "assistant" as const, content: "" }]);
    setQ(""); setBusy(true);
    try {
      const acc = await streamSam("kb_ask", [{ role: "user", content: JSON.stringify({ question, context_notes }) }], (d) => {
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: d }; return c; });
      });
      setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: "assistant", content: acc }; return c; });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Sam is unavailable"); }
    finally { setBusy(false); }
  };
  const quick = ["Summarize all my notes from this month", "Create a study plan from my notes", "What are my top ideas?", "Extract action items from everything"];

  return (
    <div className="space-y-3 animate-fade-up">
      <GradientHeader icon={<Bot className="h-5 w-5" />} title="Ask Sam over your knowledge" sub={`${store.notes.length} notes in memory`} accent="from-indigo-400/30 via-fuchsia-300/20 to-rose-300/20" />
      <Glass className="p-3 min-h-[240px] max-h-[54vh] overflow-y-auto space-y-2">
        {msgs.length === 0 && (
          <div className="space-y-2">
            {quick.map((q) => <button key={q} onClick={() => setQ(q)} className="w-full text-left rounded-2xl border border-foreground/10 bg-background/40 px-3 py-2 text-sm hover:bg-background/60"><Sparkles className="inline h-3.5 w-3.5 mr-1 text-fuchsia-500" /> {q}</button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap", m.role === "user" ? "bg-foreground text-background" : "bg-background/60 border border-foreground/10")}>{m.content || <Loader2 className="h-4 w-4 animate-spin opacity-60" />}</div>
          </div>
        ))}
        <div ref={bottom} />
      </Glass>
      <div className="flex items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !busy && ask()} placeholder="Ask about your saved knowledge…" className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-4 py-3 text-sm outline-none focus:border-foreground/30" />
        <button onClick={ask} disabled={busy} className="grid place-items-center h-11 w-11 rounded-full bg-foreground text-background disabled:opacity-60"><Send className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
