// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StickyNote, Link2, Bookmark, Plus, Trash2, Check, ExternalLink, Youtube, Search,
} from "lucide-react";
import { toast } from "sonner";

type Note = { id: string; text: string; at: number; done: boolean };
type LinkItem = { id: string; url: string; title: string; host: string; favicon: string | null; thumb: string | null; at: number; saved: boolean };

const nKey = (k: string) => `samsta:jee:notes:${k}`;
const lKey = (k: string) => `samsta:jee:links:${k}`;

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function write<T>(key: string, v: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch { /* noop */ }
}

export function enrich(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const favicon = `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
    let thumb: string | null = null;
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      const id = host.includes("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v");
      if (id) thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
    return { host, favicon, thumb };
  } catch {
    return { host: url, favicon: null, thumb: null };
  }
}

/**
 * Premium Notes · Saved · Links workspace attached to every IIT JEE tool
 * category. Everything saves instantly and syncs across tabs.
 */
export default function ToolWorkspace({ toolKey, toolTitle, gradient }: { toolKey: string; toolTitle: string; gradient: string }) {
  const [tab, setTab] = useState<"notes" | "links" | "saved">("notes");
  const [notes, setNotes] = useState<Note[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [q, setQ] = useState("");

  const sync = useCallback(() => {
    setNotes(read<Note>(nKey(toolKey)));
    setLinks(read<LinkItem>(lKey(toolKey)));
  }, [toolKey]);

  useEffect(() => { sync(); }, [sync]);
  useEffect(() => {
    const h = (e: StorageEvent) => { if (!e.key || e.key.startsWith("samsta:jee:")) sync(); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, [sync]);

  const saveNotes = (v: Note[]) => { setNotes(v); write(nKey(toolKey), v); };
  const saveLinks = (v: LinkItem[]) => { setLinks(v); write(lKey(toolKey), v); };

  const addNote = () => {
    const t = text.trim();
    if (!t) return;
    saveNotes([{ id: crypto.randomUUID(), text: t, at: Date.now(), done: false }, ...notes]);
    setText("");
    toast.success("Note saved");
  };

  const addLink = () => {
    let raw = url.trim();
    if (!raw) return;
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
    const meta = enrich(raw);
    saveLinks([{ id: crypto.randomUUID(), url: raw, title: title.trim() || meta.host, ...meta, at: Date.now(), saved: false }, ...links]);
    setUrl(""); setTitle("");
    toast.success("Link saved");
  };

  const savedItems = useMemo(
    () => [
      ...notes.filter((n) => n.done).map((n) => ({ kind: "note" as const, ...n })),
      ...links.filter((l) => l.saved).map((l) => ({ kind: "link" as const, ...l })),
    ].sort((a, b) => b.at - a.at),
    [notes, links],
  );

  const filteredNotes = notes.filter((n) => !q || n.text.toLowerCase().includes(q.toLowerCase()));
  const filteredLinks = links.filter((l) => !q || `${l.title} ${l.url}`.toLowerCase().includes(q.toLowerCase()));

  const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(`JEE ${toolTitle} full concept`)}`;

  return (
    <section className="px-4 mt-5">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-4">
        <div aria-hidden className="absolute -left-16 -top-16 h-40 w-40 rounded-full opacity-50 blur-3xl" style={{ background: gradient }} />

        <div className="relative flex items-center gap-2 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow" style={{ background: gradient }}>
            <StickyNote className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display italic text-lg leading-tight">Notes · Saved · Links</div>
            <div className="text-[11px] text-muted-foreground truncate">Auto-saved for {toolTitle}</div>
          </div>
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold">
            {notes.length + links.length}
          </span>
        </div>

        {/* Tabs */}
        <div className="relative grid grid-cols-3 gap-1 rounded-full bg-foreground/5 p-1">
          {([["notes", "Notes", StickyNote], ["links", "Links", Link2], ["saved", "Saved", Bookmark]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`flex items-center justify-center gap-1 rounded-full py-1.5 text-[11.5px] font-semibold transition-all ${tab === k ? "text-white shadow" : "text-muted-foreground"}`}
              style={tab === k ? { background: gradient } : undefined}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab !== "saved" && (
          <div className="relative mt-3 flex items-center gap-2 rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
              className="w-full bg-transparent text-[12.5px] outline-none" />
          </div>
        )}

        {/* Notes */}
        {tab === "notes" && (
          <div className="relative mt-3">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
              placeholder={`Write a note for ${toolTitle}…`}
              className="w-full resize-none rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-primary/30" />
            <button onClick={addNote}
              className="mt-2 w-full rounded-full py-2.5 text-[12.5px] font-semibold text-white shadow active:scale-[0.98]"
              style={{ background: gradient }}>
              <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Save note</span>
            </button>

            <div className="mt-3 space-y-2">
              {filteredNotes.length === 0 && <div className="py-4 text-center text-[12px] text-muted-foreground">No notes yet.</div>}
              {filteredNotes.map((n) => (
                <div key={n.id} className="glass flex items-start gap-2 rounded-2xl p-3 animate-fade-up">
                  <button onClick={() => saveNotes(notes.map((x) => x.id === n.id ? { ...x, done: !x.done } : x))}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${n.done ? "text-white border-transparent" : "border-foreground/20"}`}
                    style={n.done ? { background: gradient } : undefined} aria-label="Toggle saved">
                    {n.done && <Check className="h-3 w-3" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={`text-[12.5px] leading-snug ${n.done ? "line-through opacity-60" : ""}`}>{n.text}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">{new Date(n.at).toLocaleString()}</div>
                  </div>
                  <button onClick={() => saveNotes(notes.filter((x) => x.id !== n.id))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {tab === "links" && (
          <div className="relative mt-3">
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste YouTube / Instagram / any link"
              className="w-full rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-[12.5px] outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)"
              className="mt-2 w-full rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-[12.5px] outline-none" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button onClick={addLink} className="rounded-full py-2.5 text-[12.5px] font-semibold text-white shadow active:scale-[0.98]" style={{ background: gradient }}>
                <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Save link</span>
              </button>
              <a href={ytSearch} target="_blank" rel="noreferrer" className="glass flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-semibold">
                <Youtube className="h-4 w-4 text-red-500" /> Find on YouTube
              </a>
            </div>

            <div className="mt-3 space-y-2">
              {filteredLinks.length === 0 && <div className="py-4 text-center text-[12px] text-muted-foreground">No links yet.</div>}
              {filteredLinks.map((l) => (
                <div key={l.id} className="glass flex items-center gap-3 rounded-2xl p-2.5 animate-fade-up">
                  {l.thumb ? (
                    <img src={l.thumb} alt="" loading="lazy" className="h-12 w-20 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground/5">
                      {l.favicon ? <img src={l.favicon} alt="" className="h-5 w-5" /> : <Link2 className="h-4 w-4" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12.5px] font-medium">{l.title}</div>
                    <div className="truncate text-[10px] text-muted-foreground">{l.host}</div>
                  </div>
                  <button onClick={() => saveLinks(links.map((x) => x.id === l.id ? { ...x, saved: !x.saved } : x))}
                    className={l.saved ? "text-primary" : "text-muted-foreground"} aria-label="Save">
                    <Bookmark className={`h-4 w-4 ${l.saved ? "fill-current" : ""}`} />
                  </button>
                  <a href={l.url} target="_blank" rel="noreferrer" className="text-muted-foreground"><ExternalLink className="h-4 w-4" /></a>
                  <button onClick={() => saveLinks(links.filter((x) => x.id !== l.id))} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Saved */}
        {tab === "saved" && (
          <div className="relative mt-3 space-y-2">
            {savedItems.length === 0 && (
              <div className="py-6 text-center text-[12px] text-muted-foreground">
                Tick a note or bookmark a link — it lands here.
              </div>
            )}
            {savedItems.map((s) => (
              <div key={s.id} className="glass rounded-2xl p-3 animate-fade-up">
                {s.kind === "note" ? (
                  <>
                    <div className="text-[12.5px] leading-snug">{s.text}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">Note · {new Date(s.at).toLocaleDateString()}</div>
                  </>
                ) : (
                  <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-2">
                    {s.favicon && <img src={s.favicon} alt="" className="h-4 w-4" />}
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{s.title}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
