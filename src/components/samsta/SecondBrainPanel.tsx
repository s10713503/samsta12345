import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Brain, Files, BookOpen, Bookmark, Mic, Sparkles, Search, GraduationCap, Network, Bot, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Note = { id: string; title: string; createdAt: number; viewedAt?: number };

export function SecondBrainPanel({ userId }: { userId: string }) {
  const storageKey = `sam.secondbrain.${userId}`;
  const [notes, setNotes] = useState<Note[]>([]);
  const [docs, setDocs] = useState(0);
  const [bookmarks, setBookmarks] = useState(0);
  const [voice, setVoice] = useState(0);
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (raw) {
        setNotes(raw.notes || []);
        setDocs(raw.docs || 0);
        setBookmarks(raw.bookmarks || 0);
        setVoice(raw.voice || 0);
      }
    } catch {}
  }, [storageKey]);

  const persist = (patch: Partial<{ notes: Note[]; docs: number; bookmarks: number; voice: number }>) => {
    const next = { notes, docs, bookmarks, voice, ...patch };
    setNotes(next.notes); setDocs(next.docs); setBookmarks(next.bookmarks); setVoice(next.voice);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };

  const recentAdded = useMemo(() => [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3), [notes]);
  const recentViewed = useMemo(() => notes.filter(n => n.viewedAt).sort((a, b) => (b.viewedAt || 0) - (a.viewedAt || 0)).slice(0, 3), [notes]);

  const knowledgeScore = Math.min(100, notes.length * 4 + docs * 6 + bookmarks * 3 + voice * 5);

  const runInsights = async () => {
    setLoading(true);
    setTimeout(() => {
      setInsight(
        notes.length === 0
          ? "Start capturing notes to unlock personalized monthly insights."
          : `You've grown your Second Brain with ${notes.length} note${notes.length > 1 ? "s" : ""}. Keep going — consistency compounds.`,
      );
      setLoading(false);
    }, 700);
  };

  const addNote = () => {
    const title = window.prompt("New note title");
    if (!title?.trim()) return;
    const n: Note = { id: crypto.randomUUID(), title: title.trim(), createdAt: Date.now(), viewedAt: Date.now() };
    persist({ notes: [n, ...notes] });
  };

  const stats = [
    { label: "Notes", value: notes.length, icon: Files, tint: "from-rose-400/40 to-pink-300/30" },
    { label: "Documents", value: docs, icon: BookOpen, tint: "from-indigo-400/40 to-cyan-300/30" },
    { label: "Bookmarks", value: bookmarks, icon: Bookmark, tint: "from-emerald-400/40 to-teal-300/30" },
    { label: "Voice", value: voice, icon: Mic, tint: "from-amber-400/40 to-orange-300/30" },
  ];

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Hero pill */}
      <div className="relative overflow-hidden rounded-full border border-foreground/10 bg-gradient-to-r from-indigo-300/30 via-fuchsia-300/25 to-pink-300/30 p-4 flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 rounded-full grid place-items-center bg-background/60 border border-foreground/10">
          <Brain className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-display italic text-lg leading-tight truncate">Your Second Brain</div>
          <div className="text-[11px] text-foreground/70 truncate">Ideas, notes, docs — all connected</div>
        </div>
      </div>

      {/* 4 stat circles */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "aspect-square rounded-full grid place-items-center text-center border border-foreground/10 bg-gradient-to-br animate-fade-up",
              s.tint,
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div>
              <s.icon className="h-4 w-4 mx-auto opacity-80" />
              <div className="mt-1 font-display italic text-lg leading-none">{s.value}</div>
              <div className="text-[10px] text-foreground/70 mt-0.5">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Knowledge Score */}
      <div className="rounded-3xl border border-foreground/10 bg-background/50 backdrop-blur-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-foreground/60">Knowledge Score</div>
            <div className="font-display italic text-3xl">{knowledgeScore}<span className="text-sm text-foreground/50">/100</span></div>
          </div>
          <div className="w-24 h-24 relative">
            <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
              <circle cx={50} cy={50} r={44} stroke="currentColor" className="text-foreground/10" strokeWidth={8} fill="none" />
              <circle cx={50} cy={50} r={44} stroke="url(#sbg)" strokeWidth={8} fill="none" strokeLinecap="round"
                strokeDasharray={276} strokeDashoffset={276 - (knowledgeScore / 100) * 276}
                style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }} />
              <defs><linearGradient id="sbg" x1="0" x2="1"><stop offset="0" stopColor="#a78bfa" /><stop offset="1" stopColor="#f472b6" /></linearGradient></defs>
            </svg>
          </div>
        </div>
        <button onClick={runInsights} disabled={loading} className="mt-3 w-full rounded-full bg-foreground text-background text-sm py-2.5 disabled:opacity-60">
          {loading ? "Thinking…" : <><Sparkles className="inline h-4 w-4 mr-1" /> Monthly Insights</>}
        </button>
        {insight && <div className="mt-3 rounded-2xl bg-background/40 border border-foreground/10 p-3 whitespace-pre-wrap text-sm">{insight}</div>}
      </div>

      {/* Recently added / viewed */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-3xl border border-foreground/10 bg-background/50 backdrop-blur-2xl p-3">
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Recently added</div>
          {recentAdded.length === 0 ? (
            <button onClick={addNote} className="w-full text-sm rounded-2xl border border-dashed border-foreground/20 p-3 text-foreground/60">
              + Add your first note
            </button>
          ) : (
            <ul className="space-y-1.5 text-[13px]">{recentAdded.map(n => <li key={n.id} className="truncate">📝 {n.title}</li>)}</ul>
          )}
        </div>
        <div className="rounded-3xl border border-foreground/10 bg-background/50 backdrop-blur-2xl p-3">
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Recently viewed</div>
          {recentViewed.length === 0 ? <div className="text-sm text-foreground/60">Nothing yet.</div>
            : <ul className="space-y-1.5 text-[13px]">{recentViewed.map(n => <li key={n.id} className="truncate">👁 {n.title}</li>)}</ul>}
        </div>
      </div>

      {/* Jump to */}
      <div className="rounded-3xl border border-foreground/10 bg-background/50 backdrop-blur-2xl p-3">
        <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Jump to</div>
        <div className="grid grid-cols-3 gap-2">
          <JumpLink to="/knowledge" icon={Files} label="All notes" />
          <JumpLink to="/search" icon={Search} label="Search" />
          <JumpLink to="/learn" icon={GraduationCap} label="Study" />
          <JumpLink to="/knowledge" icon={Network} label="Mind Map" />
          <JumpLink to="/sam" icon={Bot} label="Ask Sam" />
          <button onClick={addNote} className="rounded-2xl border border-foreground/10 bg-background/60 p-3 flex flex-col items-center gap-1 text-[11px] active:scale-95">
            <Plus className="h-4 w-4" /> New note
          </button>
        </div>
      </div>
    </div>
  );
}

function JumpLink({ to, icon: Icon, label }: { to: string; icon: any; label: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-foreground/10 bg-background/60 p-3 flex flex-col items-center gap-1 text-[11px] active:scale-95">
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}