// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Clock, Search, Plus, X, Heart, MapPin, Users, Tag, Star, Bookmark,
  Mic, FileText, Image as ImageIcon, Video, Link2, Sparkles, Bell, Download, Upload,
  Trash2, ChevronDown, ChevronRight, Wand2, Brain, RefreshCw, Filter, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import { supabase } from "@/integrations/supabase/client";
import {
  type Memory, type MemoryKind, type Reminder,
  listMemories, searchMemories, createMemory, updateMemory, deleteMemory, toggleFavorite,
  allTags, findDuplicates, listReminders, addReminder, completeReminder, exportJSON,
} from "@/lib/api/memories";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/memory")({
  component: MemoryHub,
  head: () => ({
    meta: [
      { title: "Memory Intelligence Hub · Samsta" },
      { name: "description", content: "A private, encrypted timeline of your memories— notes, photos, voice, places, people, projects— with recall, summaries and insights." },
    ],
  }),
});

type Tab = "timeline" | "recall" | "insights" | "reminders";

const KIND_META: Record<MemoryKind, { label: string; icon: React.ReactNode; accent: string }> = {
  note:     { label: "Note",     icon: <FileText className="h-4 w-4" />,   accent: "linear-gradient(135deg, oklch(0.75 0.11 260), oklch(0.72 0.13 290))" },
  photo:    { label: "Photo",    icon: <ImageIcon className="h-4 w-4" />,  accent: "linear-gradient(135deg, oklch(0.82 0.13 30), oklch(0.76 0.14 15))" },
  video:    { label: "Video",    icon: <Video className="h-4 w-4" />,      accent: "linear-gradient(135deg, oklch(0.7 0.15 350), oklch(0.68 0.17 320))" },
  voice:    { label: "Voice",    icon: <Mic className="h-4 w-4" />,        accent: "linear-gradient(135deg, oklch(0.78 0.13 190), oklch(0.72 0.14 220))" },
  file:     { label: "File",     icon: <FileText className="h-4 w-4" />,   accent: "linear-gradient(135deg, oklch(0.78 0.09 90), oklch(0.75 0.11 70))" },
  bookmark: { label: "Bookmark", icon: <Link2 className="h-4 w-4" />,      accent: "linear-gradient(135deg, oklch(0.72 0.13 210), oklch(0.7 0.15 240))" },
  person:   { label: "Person",   icon: <Users className="h-4 w-4" />,      accent: "linear-gradient(135deg, oklch(0.82 0.13 340), oklch(0.78 0.11 10))" },
  place:    { label: "Place",    icon: <MapPin className="h-4 w-4" />,     accent: "linear-gradient(135deg, oklch(0.72 0.13 150), oklch(0.7 0.15 180))" },
  project:  { label: "Project",  icon: <Bookmark className="h-4 w-4" />,   accent: "linear-gradient(135deg, oklch(0.55 0.15 260), oklch(0.55 0.18 300))" },
};

function MemoryHub() {
  const { user, loading } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("timeline");
  const [items, setItems] = useState<Memory[]>([]);
  const [tags, setTags] = useState<Array<{ tag: string; count: number }>>([]);
  const [kindFilter, setKindFilter] = useState<MemoryKind | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [favOnly, setFavOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  async function reload() {
    if (!user) return;
    const [rows, tg] = await Promise.all([
      search.trim() ? searchMemories(user.id, search.trim()) :
        listMemories(user.id, { kind: kindFilter === "all" ? undefined : kindFilter, tag: tagFilter ?? undefined, favorite: favOnly || undefined }),
      allTags(user.id),
    ]);
    setItems(rows); setTags(tg);
  }

  useEffect(() => { void reload(); }, [user, kindFilter, tagFilter, favOnly, search]); // eslint-disable-line

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("mem" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "memories", filter: `user_id=eq.${user.id}` }, () => void reload())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]); // eslint-disable-line

  if (loading || !user) return null;
  if (!isPremium) return <LockedGate />;

  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: "timeline", label: "Timeline", icon: <Clock className="h-4 w-4" /> },
    { key: "recall", label: "Recall", icon: <Brain className="h-4 w-4" /> },
    { key: "insights", label: "Insights", icon: <Sparkles className="h-4 w-4" /> },
    { key: "reminders", label: "Reminders", icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen pb-32" style={{
      background: "radial-gradient(1000px 500px at 100% 0%, oklch(0.94 0.06 340 / 0.45), transparent 60%), radial-gradient(900px 500px at 0% 30%, oklch(0.93 0.07 220 / 0.35), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex-1">
          <div className="font-display text-lg italic leading-tight">Memory Hub</div>
          <div className="text-[11px] text-muted-foreground">Private · encrypted · yours</div>
        </div>
        <button onClick={() => setAddOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md"
          style={{ background: "linear-gradient(135deg, oklch(0.7 0.15 340), oklch(0.68 0.17 20))" }}>
          <Plus className="h-5 w-5" />
        </button>
      </header>

      {/* Search */}
      <section className="px-4">
        <div className="glass-strong flex items-center gap-2 rounded-full px-4 py-2.5 animate-fade-up">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search memories, people, places, tags…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
          {search && <button onClick={() => setSearch("")}><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
      </section>

      <nav className="scrollbar-none mx-2 mt-3 flex gap-1.5 overflow-x-auto px-2 pb-1">
        {tabs.map((t) => {
          const on = t.key === tab;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm transition",
                on ? "text-white shadow-md" : "glass text-foreground/80")}
              style={on ? { background: "linear-gradient(135deg, oklch(0.7 0.15 340), oklch(0.68 0.17 20))" } : undefined}>
              {t.icon}<span className="font-display italic">{t.label}</span>
            </button>
          );
        })}
      </nav>

      <main className="px-4 pt-3">
        {tab === "timeline" && (
          <>
            <FilterBar
              kindFilter={kindFilter} setKindFilter={setKindFilter}
              tags={tags} tagFilter={tagFilter} setTagFilter={setTagFilter}
              favOnly={favOnly} setFavOnly={setFavOnly}
              onExport={() => exportAndDownload(items)} onImport={handleImport(user.id, reload)}
              onDedupe={async () => { const d = await findDuplicates(user.id); toast.info(d.length ? `${d.length} possible duplicates` : "No duplicates found"); }}
            />
            <Timeline items={items} onEdit={setEditing} onFav={async (m) => { await toggleFavorite(m.id, !m.favorite); reload(); }} />
          </>
        )}
        {tab === "recall" && <RecallTab userId={user.id} memories={items} />}
        {tab === "insights" && <InsightsTab userId={user.id} memories={items} />}
        {tab === "reminders" && <RemindersTab userId={user.id} onOpenMemory={(id) => { const m = items.find((x) => x.id === id); if (m) setEditing(m); }} />}
      </main>

      {(addOpen || editing) && (
        <MemoryEditor userId={user.id} initial={editing ?? undefined}
          onClose={() => { setAddOpen(false); setEditing(null); }}
          onSaved={() => { setAddOpen(false); setEditing(null); reload(); }} />
      )}
    </div>
  );
}

function LockedGate() {
  return (
    <div className="min-h-screen p-6">
      <div className="glass-strong mx-auto mt-16 max-w-md rounded-3xl p-6 text-center">
        <Clock className="mx-auto h-10 w-10" />
        <h1 className="mt-3 font-display text-2xl italic">Memory Hub is Premium</h1>
        <p className="mt-1 text-sm text-muted-foreground">A private timeline of everything worth remembering, with recall.</p>
        <Link to="/premium" className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2 text-sm text-background">Upgrade</Link>
      </div>
    </div>
  );
}

function FilterBar({
  kindFilter, setKindFilter, tags, tagFilter, setTagFilter, favOnly, setFavOnly, onExport, onImport, onDedupe,
}: {
  kindFilter: MemoryKind | "all"; setKindFilter: (k: MemoryKind | "all") => void;
  tags: Array<{ tag: string; count: number }>; tagFilter: string | null; setTagFilter: (t: string | null) => void;
  favOnly: boolean; setFavOnly: (v: boolean) => void;
  onExport: () => void; onImport: (file: File) => void; onDedupe: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3 space-y-2">
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setKindFilter("all")}
          className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs transition", kindFilter === "all" ? "bg-foreground text-background" : "glass")}>All</button>
        {(Object.keys(KIND_META) as MemoryKind[]).map((k) => {
          const on = kindFilter === k;
          return (
            <button key={k} onClick={() => setKindFilter(k)}
              className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition", on ? "text-white shadow-md" : "glass")}
              style={on ? { background: KIND_META[k].accent } : undefined}>
              {KIND_META[k].icon}<span>{KIND_META[k].label}</span>
            </button>
          );
        })}
        <button onClick={() => setFavOnly(!favOnly)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs", favOnly ? "bg-pink-500 text-white" : "glass")}>
          <Star className={cn("mr-1 inline h-3 w-3", favOnly && "fill-current")} />Favs
        </button>
        <button onClick={() => setOpen((v) => !v)} className="glass shrink-0 rounded-full px-3 py-1.5 text-xs"><Filter className="mr-1 inline h-3 w-3" />More</button>
      </div>
      {open && (
        <div className="glass rounded-3xl p-3 animate-fade-up">
          <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Smart tags</div>
          {tags.length === 0 ? <div className="text-xs text-muted-foreground">No tags yet.</div> :
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = tagFilter === t.tag;
                return (
                  <button key={t.tag} onClick={() => setTagFilter(on ? null : t.tag)}
                    className={cn("rounded-full px-2.5 py-1 text-[11px] transition", on ? "bg-primary text-primary-foreground" : "bg-white/50")}>
                    #{t.tag} · {t.count}
                  </button>
                );
              })}
            </div>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={onExport} className="glass inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"><Download className="h-3.5 w-3.5" />Export</button>
            <label className="glass inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs">
              <Upload className="h-3.5 w-3.5" />Import
              <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files && onImport(e.target.files[0])} />
            </label>
            <button onClick={onDedupe} className="glass inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs"><Copy className="h-3.5 w-3.5" />Detect duplicates</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Timeline({ items, onEdit, onFav }: { items: Memory[]; onEdit: (m: Memory) => void; onFav: (m: Memory) => void }) {
  const grouped = useMemo(() => {
    const map = new Map<string, Memory[]>();
    items.forEach((m) => {
      const d = new Date(m.memory_date ?? m.created_at);
      const key = d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });
    return Array.from(map.entries());
  }, [items]);

  if (items.length === 0) {
    return <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground animate-fade-up">
      <Sparkles className="mx-auto mb-2 h-6 w-6" />
      Your timeline is empty. Tap + to capture your first memory.
    </div>;
  }

  return (
    <div className="space-y-6">
      {grouped.map(([month, list]) => (
        <section key={month}>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <div className="font-display text-xs italic text-muted-foreground">{month}</div>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {list.map((m, i) => <MemoryCard key={m.id} m={m} onEdit={onEdit} onFav={onFav} delay={i * 20} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function MemoryCard({ m, onEdit, onFav, delay }: { m: Memory; onEdit: (m: Memory) => void; onFav: (m: Memory) => void; delay: number }) {
  const meta = KIND_META[m.kind];
  const d = new Date(m.memory_date ?? m.created_at);
  return (
    <article className="glass group relative overflow-hidden rounded-3xl p-4 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-40 blur-2xl" style={{ background: meta.accent }} />
      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: meta.accent }}>{meta.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>{meta.label}</span><span>·</span><span>{d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
            {m.mood && <><span>·</span><span>{m.mood}</span></>}
          </div>
          <button onClick={() => onEdit(m)} className="mt-0.5 block w-full text-left">
            <div className="font-display italic leading-tight line-clamp-1">{m.title}</div>
            {m.content && <div className="mt-0.5 line-clamp-2 text-xs text-foreground/80">{m.content}</div>}
            {m.ai_summary && <div className="mt-1 rounded-lg bg-primary/5 p-2 text-[11px] italic text-primary/90 line-clamp-2">{m.ai_summary}</div>}
          </button>
          {(m.tags.length > 0 || m.people.length > 0 || m.location) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {m.location && <Chip icon={<MapPin className="h-3 w-3" />}>{m.location}</Chip>}
              {m.people.map((p) => <Chip key={p} icon={<Users className="h-3 w-3" />}>{p}</Chip>)}
              {m.tags.map((t) => <Chip key={t} icon={<Tag className="h-3 w-3" />}>#{t}</Chip>)}
            </div>
          )}
        </div>
        <button onClick={() => onFav(m)} aria-label="Favorite" className="shrink-0 text-muted-foreground hover:text-pink-500">
          <Heart className={cn("h-4 w-4", m.favorite && "fill-pink-500 text-pink-500")} />
        </button>
      </div>
    </article>
  );
}

function Chip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] text-foreground/80">{icon}{children}</span>;
}

/* ================= EDITOR ================= */
function MemoryEditor({ userId, initial, onClose, onSaved }: {
  userId: string; initial?: Memory; onClose: () => void; onSaved: () => void;
}) {
  const [kind, setKind] = useState<MemoryKind>(initial?.kind ?? "note");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [people, setPeople] = useState(initial?.people.join(", ") ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [mood, setMood] = useState(initial?.mood ?? "");
  const [memDate, setMemDate] = useState(initial?.memory_date ?? new Date().toISOString().slice(0, 10));
  const [mediaUrl, setMediaUrl] = useState(initial?.media_url ?? "");
  const [aiSummary, setAiSummary] = useState(initial?.ai_summary ?? "");
  const [busyAi, setBusyAi] = useState(false);
  const [saving, setSaving] = useState(false);

  const parseList = (s: string) => s.split(",").map((v) => v.trim()).filter(Boolean);

  async function summarize() {
    if (!title.trim()) return toast.error("Add a title first");
    setBusyAi(true);
    try {
      const payload = JSON.stringify({ title, content, people: parseList(people), location, mood, memory_date: memDate });
      let acc = "";
      await streamSam("memory_summarize", [{ role: "user", content: payload }], (a) => { acc = a; setAiSummary(a); });
      // Extract tags line
      const m = acc.match(/\*\*Tags:\*\*\s*(.+)/i) || acc.match(/Tags:\s*(.+)/i);
      if (m) {
        const found = m[1].split(/\s+/).map((t) => t.replace(/[#,.]/g, "").toLowerCase()).filter(Boolean).slice(0, 5);
        if (found.length && !tags.trim()) setTags(found.join(", "));
      }
    } catch { toast.error("unavailable"); }
    finally { setBusyAi(false); }
  }

  async function save() {
    if (!title.trim()) return toast.error("Title required");
    setSaving(true);
    try {
      const patch: Partial<Memory> = {
        kind, title, content: content || null, tags: parseList(tags), people: parseList(people),
        location: location || null, mood: mood || null, memory_date: memDate || null,
        media_url: mediaUrl || null, ai_summary: aiSummary || null,
      };
      if (initial) await updateMemory(initial.id, patch);
      else await createMemory(userId, { ...patch, kind, title });
      toast.success(initial ? "Updated" : "Saved");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't save"); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!initial) return;
    if (!confirm("Delete this memory?")) return;
    await deleteMemory(initial.id); onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="glass-strong max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <div className="font-display text-lg italic">{initial ? "Edit memory" : "New memory"}</div>
          <div className="flex-1" />
          <button onClick={onClose} className="glass flex h-8 w-8 items-center justify-center rounded-full"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {(Object.keys(KIND_META) as MemoryKind[]).map((k) => {
            const on = kind === k;
            return (
              <button key={k} onClick={() => setKind(k)}
                className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]", on ? "text-white shadow" : "glass")}
                style={on ? { background: KIND_META[k].accent } : undefined}>
                {KIND_META[k].icon}<span>{KIND_META[k].label}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
            className="w-full rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm font-display italic outline-none" />
          <textarea rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="What do you want to remember?"
            className="w-full resize-none rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm outline-none" />
          <div className="grid grid-cols-2 gap-2">
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
            <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="Mood (happy, calm…)" className="rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="People (comma separated)" className="rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
            <input type="date" value={memDate} onChange={(e) => setMemDate(e.target.value)} className="rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
          </div>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma separated)" className="w-full rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
          {(kind === "photo" || kind === "video" || kind === "voice" || kind === "file" || kind === "bookmark") && (
            <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="URL or attachment link" className="w-full rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm" />
          )}

          <div className="glass rounded-2xl p-3">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground"> Summary</div>
              <button onClick={summarize} disabled={busyAi} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] text-background disabled:opacity-40">
                {busyAi ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Curate
              </button>
            </div>
            <textarea rows={3} value={aiSummary} onChange={(e) => setAiSummary(e.target.value)} placeholder="Sam's poetic summary + auto-tags"
              className="w-full resize-none rounded-xl bg-white/40 px-2 py-1.5 text-xs italic outline-none" />
          </div>

          <div className="flex gap-2 pt-2">
            {initial && <button onClick={remove} className="glass flex items-center gap-1 rounded-full px-3 py-2 text-xs text-red-600"><Trash2 className="h-3.5 w-3.5" />Delete</button>}
            <div className="flex-1" />
            <button onClick={save} disabled={saving} className="flex items-center gap-1 rounded-full px-5 py-2 text-xs text-white shadow-md disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, oklch(0.7 0.15 340), oklch(0.68 0.17 20))" }}>
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= AI RECALL ================= */
function RecallTab({ userId, memories }: { userId: string; memories: Memory[] }) {
  const [q, setQ] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (!q.trim()) return;
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({
        query: q,
        memories: memories.slice(0, 60).map((m) => ({
          id: m.id, title: m.title, snippet: (m.content ?? m.ai_summary ?? "").slice(0, 200),
          tags: m.tags, memory_date: m.memory_date ?? m.created_at.slice(0, 10),
        })),
      });
      await streamSam("memory_recall", [{ role: "user", content: payload }], setOut);
    } catch { toast.error("Sam couldn't recall"); }
    finally { setBusy(false); }
  }

  const suggestions = ["Last time I was in Paris", "Ideas about my side project", "Warm moments with mom", "Books I bookmarked this year"];

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /><div className="font-display italic">Ask across your memories</div></div>
        <textarea rows={2} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. When did I meet Ana?"
          className="w-full resize-none rounded-2xl border border-border bg-white/50 px-3 py-2 text-sm outline-none" />
        <div className="mt-2 scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
          {suggestions.map((s) => <button key={s} onClick={() => setQ(s)} className="glass shrink-0 rounded-full px-3 py-1 text-[11px]">{s}</button>)}
        </div>
        <button onClick={ask} disabled={busy || !q.trim()} className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, oklch(0.7 0.15 340), oklch(0.68 0.17 20))" }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Recall
        </button>
      </div>
      {(out || busy) && <div className="glass rounded-3xl p-4 text-sm leading-relaxed whitespace-pre-wrap animate-fade-up">{out || <span className="text-muted-foreground">Searching your memories…</span>}</div>}
      {memories.length === 0 && <div className="text-xs text-muted-foreground text-center">Add memories to unlock recall.</div>}
    </div>
  );
}

/* ================= INSIGHTS ================= */
function InsightsTab({ userId, memories }: { userId: string; memories: Memory[] }) {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const total = memories.length;
    const byKind: Record<string, number> = {};
    const byPerson: Record<string, number> = {};
    const byPlace: Record<string, number> = {};
    memories.forEach((m) => {
      byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;
      m.people.forEach((p) => (byPerson[p] = (byPerson[p] ?? 0) + 1));
      if (m.location) byPlace[m.location] = (byPlace[m.location] ?? 0) + 1;
    });
    return { total, byKind, byPerson: Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 5), byPlace: Object.entries(byPlace).sort((a, b) => b[1] - a[1]).slice(0, 5) };
  }, [memories]);

  async function generate() {
    setBusy(true); setOut("");
    try {
      const payload = JSON.stringify({
        memories: memories.slice(0, 80).map((m) => ({
          title: m.title, tags: m.tags, memory_date: m.memory_date ?? m.created_at.slice(0, 10),
          mood: m.mood, people: m.people, location: m.location,
        })),
      });
      await streamSam("memory_insights", [{ role: "user", content: payload }], setOut);
    } catch { toast.error("Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><div className="font-display italic">Your memory patterns</div></div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Kinds" value={Object.keys(stats.byKind).length} />
        </div>
        <div className="mt-3">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">By kind</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {Object.entries(stats.byKind).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-white shadow-sm" style={{ background: KIND_META[k as MemoryKind]?.accent }}>
                {KIND_META[k as MemoryKind]?.icon}{v}
              </span>
            ))}
          </div>
        </div>
        {stats.byPerson.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">People in your orbit</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {stats.byPerson.map(([p, c]) => <span key={p} className="rounded-full bg-white/50 px-2 py-1 text-[11px]">{p} · {c}</span>)}
            </div>
          </div>
        )}
        {stats.byPlace.length > 0 && (
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Top places</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {stats.byPlace.map(([p, c]) => <span key={p} className="rounded-full bg-white/50 px-2 py-1 text-[11px]">{p} · {c}</span>)}
            </div>
          </div>
        )}
        <button onClick={generate} disabled={busy || memories.length < 3}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, oklch(0.7 0.15 340), oklch(0.68 0.17 20))" }}>
          {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} insights
        </button>
      </div>
      {out && <div className="glass rounded-3xl p-4 text-sm leading-relaxed whitespace-pre-wrap animate-fade-up">{out}</div>}
      {memories.length < 3 && <div className="text-xs text-muted-foreground text-center">Add a few memories to unlock insights.</div>}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-white/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-2xl italic leading-none">{value}</div>
    </div>
  );
}

/* ================= REMINDERS ================= */
function RemindersTab({ userId, onOpenMemory }: { userId: string; onOpenMemory: (id: string) => void }) {
  const [items, setItems] = useState<Reminder[]>([]);
  const [when, setWhen] = useState(""); const [note, setNote] = useState("");
  async function reload() { setItems(await listReminders(userId)); }
  useEffect(() => { void reload(); }, [userId]);
  async function add() {
    if (!when) return;
    await addReminder(userId, null, new Date(when).toISOString(), note || undefined);
    setWhen(""); setNote(""); reload();
    toast.success("Reminder set");
  }
  async function done(id: string) { await completeReminder(id); reload(); }
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="font-display italic">New reminder</div>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should we remind you?"
          className="w-full rounded-full border border-border bg-white/50 px-3 py-2 text-sm" />
        <button onClick={add} disabled={!when} className="flex h-10 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, oklch(0.7 0.15 340), oklch(0.68 0.17 20))" }}>
          <Bell className="h-4 w-4" /> Set reminder
        </button>
      </div>
      <div className="space-y-2">
        {items.length === 0 ? <div className="text-xs text-muted-foreground text-center">No upcoming reminders.</div> :
          items.map((r) => (
            <div key={r.id} className="glass flex items-center gap-2 rounded-2xl p-3 animate-fade-up">
              <Bell className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="text-sm">{r.note ?? "Reminder"}</div>
                <div className="text-[11px] text-muted-foreground">{new Date(r.remind_at).toLocaleString()}</div>
              </div>
              {r.memory_id && <button onClick={() => onOpenMemory(r.memory_id!)} className="text-[11px] text-primary">Open</button>}
              <button onClick={() => done(r.id)} className="glass rounded-full px-2 py-1 text-[11px]">Done</button>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ================= EXPORT / IMPORT ================= */
function exportAndDownload(items: Memory[]) {
  const blob = new Blob([exportJSON(items)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `memories-${new Date().toISOString().slice(0, 10)}.json`;
  a.click(); URL.revokeObjectURL(url);
  toast.success("Exported");
}

function handleImport(userId: string, reload: () => Promise<void> | void) {
  return async (file: File) => {
    try {
      const text = await file.text();
      const rows = JSON.parse(text) as Memory[];
      if (!Array.isArray(rows)) throw new Error("Invalid file");
      for (const r of rows) {
        await createMemory(userId, {
          kind: r.kind as MemoryKind, title: r.title, content: r.content ?? null,
          tags: r.tags ?? [], people: r.people ?? [], location: r.location ?? null,
          mood: r.mood ?? null, memory_date: r.memory_date ?? null, media_url: r.media_url ?? null,
          ai_summary: r.ai_summary ?? null,
        });
      }
      toast.success(`Imported ${rows.length}`);
      await reload();
    } catch { toast.error("Import failed"); }
  };
}
