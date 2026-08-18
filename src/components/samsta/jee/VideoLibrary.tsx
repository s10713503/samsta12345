// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Search, Bookmark, BookmarkCheck, History, Play, ExternalLink, CheckCircle2,
  ChevronRight, Sparkles, Filter, Clock, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  INSTITUTES, subjectsFor, CHAPTERS, categoriesFor, DEFAULT_FILTERS,
  buildQuery, youtubeSearchUrl, loadVideoState, saveVideoState, chapterId, nextChapter, searchChapters,
} from "@/lib/jee-videos";

const G = "linear-gradient(135deg, oklch(0.82 0.13 340), oklch(0.75 0.15 320))";
const CLASSES = [11, 12];

export default function VideoLibrary({ onOpen, exam = "jee" }: { onOpen?: (title: string, prompt: string) => void; exam?: "jee" | "neet" }) {
  const EXAM = exam === "neet" ? "NEET" : "JEE";
  const SUBJECTS = subjectsFor(exam);
  const VIDEO_CATEGORIES = categoriesFor(exam);
  const [state, setState] = useState(() => loadVideoState(exam));
  const [inst, setInst] = useState<any>(null);
  const [subject, setSubject] = useState<any>(null);
  const [cls, setCls] = useState<any>(null);
  const [chapter, setChapter] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [view, setView] = useState<"browse" | "bookmarks" | "history">("browse");
  const [showFilters, setShowFilters] = useState(false);
  const [player, setPlayer] = useState<any>(null);

  useEffect(() => { setState(loadVideoState(exam)); setInst(null); setSubject(null); setCls(null); setChapter(null); }, [exam]);
  const patch = (p: any) => setState((s) => { const n = { ...s, ...p }; saveVideoState(n, exam); return n; });
  const f = state.filters ?? DEFAULT_FILTERS;

  const results = useMemo(() => searchChapters(term, exam), [term, exam]);

  const openCategory = (cat: any) => {
    const query = buildQuery(inst, subject, cls, chapter!, cat, f, exam);
    const url = youtubeSearchUrl(query, f);
    const id = `${inst.key}|${subject}|${cls}|${chapter}|${cat.key}`;
    const entry = {
      id, institute: inst.short, subject, cls, chapter, category: cat.label, query, url,
      at: Date.now(), seconds: state.history.find((h: any) => h.id === id)?.seconds ?? 0, done: false,
    };
    patch({ history: [entry, ...state.history.filter((h: any) => h.id !== id)].slice(0, 60) });
    setPlayer(entry);
  };

  const toggleBookmark = (entry: any) => {
    const has = state.bookmarks.some((b: any) => b.id === entry.id);
    patch({ bookmarks: has ? state.bookmarks.filter((b: any) => b.id !== entry.id) : [entry, ...state.bookmarks] });
    toast.success(has ? "Bookmark removed" : "Bookmarked");
  };

  const toggleComplete = () => {
    const id = chapterId(subject, cls, chapter!);
    const has = state.completed.includes(id);
    patch({ completed: has ? state.completed.filter((c: string) => c !== id) : [...state.completed, id] });
  };

  const toggleWeak = () => {
    const id = chapterId(subject, cls, chapter!);
    const has = state.weak.includes(id);
    patch({ weak: has ? state.weak.filter((c: string) => c !== id) : [...state.weak, id] });
  };

  const back = () => {
    if (chapter) return setChapter(null);
    if (cls) return setCls(null);
    if (subject) return setSubject(null);
    setInst(null);
  };

  const crumb = [inst?.short, subject, cls && `Class ${cls}`, chapter].filter(Boolean).join(" · ");
  const chapterList = subject && cls ? CHAPTERS[subject][cls] : [];
  const progress = subject && cls
    ? Math.round((chapterList.filter((c: string) => state.completed.includes(chapterId(subject, cls, c))).length / chapterList.length) * 100)
    : 0;
  const continueWatching = state.history.slice(0, 6);

  return (
    <section className="px-4 mt-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { k: "browse", label: "Browse", Icon: Play },
          { k: "bookmarks", label: `Bookmarks (${state.bookmarks.length})`, Icon: Bookmark },
          { k: "history", label: "History", Icon: History },
        ].map((t) => (
          <button key={t.k} onClick={() => setView(t.k as any)}
            className={`glass flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${view === t.k ? "text-white shadow-md" : "text-muted-foreground"}`}
            style={view === t.k ? { background: G } : undefined}>
            <t.Icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
        <button onClick={() => setShowFilters((v) => !v)} className="glass flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground">
          <Filter className="h-3.5 w-3.5" /> Filters
        </button>
      </div>

      {showFilters && (
        <div className="glass mt-3 rounded-2xl p-3 space-y-2.5">
          {[
            { k: "language", label: "Language", opts: ["any", "english", "hinglish", "hindi"] },
            { k: "duration", label: "Duration", opts: ["any", "short", "medium", "long"] },
            { k: "sort", label: "Sort", opts: ["relevance", "latest"] },
            ...(exam === "neet" ? [] : [{ k: "exam", label: "Exam", opts: ["any", "main", "advanced"] }]),
          ].map((row) => (
            <div key={row.k}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{row.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {row.opts.map((o) => (
                  <button key={o} onClick={() => patch({ filters: { ...f, [row.k]: o } })}
                    className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold capitalize ${f[row.k] === o ? "text-white" : "bg-foreground/10 text-muted-foreground"}`}
                    style={f[row.k] === o ? { background: G } : undefined}>{o}</button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Teacher</div>
            <input value={f.teacher} onChange={(e) => patch({ filters: { ...f, teacher: e.target.value } })}
              placeholder="e.g. Alakh Pandey"
              className="w-full rounded-xl bg-foreground/5 px-3 py-2 text-[12px] outline-none" />
          </div>
        </div>
      )}

      {view === "history" && (
        <div className="mt-3 space-y-2">
          {!state.history.length && <Empty text="No watch history yet." />}
          {state.history.map((h: any) => <Row key={h.id + h.at} h={h} onPlay={() => setPlayer(h)} onBookmark={() => toggleBookmark(h)} marked={state.bookmarks.some((b: any) => b.id === h.id)} />)}
          {!!state.history.length && (
            <button onClick={() => patch({ history: [] })} className="glass mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </button>
          )}
        </div>
      )}

      {view === "bookmarks" && (
        <div className="mt-3 space-y-2">
          {!state.bookmarks.length && <Empty text="Bookmark a lecture to save it here." />}
          {state.bookmarks.map((h: any) => <Row key={h.id} h={h} onPlay={() => setPlayer(h)} onBookmark={() => toggleBookmark(h)} marked />)}
        </div>
      )}

      {view === "browse" && (
        <>
          {/* Search chapters */}
          <div className="glass mt-3 flex items-center gap-2 rounded-2xl px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search any chapter…"
              className="flex-1 bg-transparent text-[12.5px] outline-none" />
            {term && <button onClick={() => setTerm("")}><X className="h-4 w-4 text-muted-foreground" /></button>}
          </div>
          {!!results.length && (
            <div className="mt-2 space-y-1.5">
              {results.map((r) => (
                <button key={`${r.subject}${r.cls}${r.chapter}`}
                  onClick={() => { setInst(inst ?? INSTITUTES[0]); setSubject(r.subject); setCls(r.cls); setChapter(r.chapter); setTerm(""); }}
                  className="glass flex w-full items-center justify-between rounded-xl px-3 py-2 text-left">
                  <span className="text-[12px] font-medium">{r.chapter}</span>
                  <span className="text-[10px] text-muted-foreground">{r.subject} · Class {r.cls}</span>
                </button>
              ))}
            </div>
          )}

          {/* Continue watching */}
          {!inst && !!continueWatching.length && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="font-display italic text-base">Continue watching</div>
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                {continueWatching.map((h: any) => (
                  <button key={h.id + h.at} onClick={() => setPlayer(h)}
                    className="glass relative w-[150px] shrink-0 overflow-hidden rounded-2xl p-3 text-left">
                    <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: G }} />
                    <div className="relative text-[11.5px] font-semibold leading-tight line-clamp-2">{h.chapter}</div>
                    <div className="relative mt-1 text-[10px] text-muted-foreground">{h.institute} · {h.category}</div>
                    <div className="relative mt-2 flex items-center gap-1 text-[10px] font-semibold"><Play className="h-3 w-3" /> Resume</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumb */}
          {inst && (
            <div className="mt-4 flex items-center gap-2">
              <button onClick={back} className="glass flex h-8 w-8 items-center justify-center rounded-full"><ArrowLeft className="h-4 w-4" /></button>
              <div className="text-[11px] text-muted-foreground truncate">{crumb}</div>
            </div>
          )}

          {/* Step 1: institutes */}
          {!inst && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="font-display italic text-base">Coaching institutes</div>
                <span className="text-[10px] text-muted-foreground">{INSTITUTES.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {INSTITUTES.map((i) => (
                  <button key={i.key} onClick={() => setInst(i)} className="glass relative overflow-hidden rounded-2xl p-3 text-left transition-transform active:scale-[0.97]">
                    <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: G }} />
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-md mb-2" style={{ background: G }}>
                      {i.short.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="relative text-[12.5px] font-semibold leading-tight">{i.name}</div>
                    <div className="relative mt-1 text-[10px] text-muted-foreground">{i.tag}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: subject */}
          {inst && !subject && (
            <Grid title="Choose subject">
              {SUBJECTS.map((s) => <Tile key={s} label={s} hint={`${CHAPTERS[s][11].length + CHAPTERS[s][12].length} chapters`} onClick={() => setSubject(s)} />)}
            </Grid>
          )}

          {/* Step 3: class */}
          {inst && subject && !cls && (
            <Grid title="Choose class">
              {CLASSES.map((c) => <Tile key={c} label={`Class ${c}`} hint={`${CHAPTERS[subject][c].length} chapters`} onClick={() => setCls(c)} />)}
            </Grid>
          )}

          {/* Step 4: chapters */}
          {inst && subject && cls && !chapter && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="font-display italic text-base">{subject} · Class {cls}</div>
                <span className="text-[10px] text-muted-foreground">{progress}% done</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: G }} />
              </div>
              <div className="mt-3 space-y-2">
                {chapterList.map((c: string) => {
                  const done = state.completed.includes(chapterId(subject, cls, c));
                  const weak = state.weak.includes(chapterId(subject, cls, c));
                  return (
                    <button key={c} onClick={() => setChapter(c)} className="glass flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left">
                      <span className="flex-1 text-[12.5px] font-medium">{c}</span>
                      {weak && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-semibold text-amber-600">Weak</span>}
                      {done && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: lecture types */}
          {inst && subject && cls && chapter && (
            <div className="mt-4">
              <div className="glass-strong relative overflow-hidden rounded-3xl p-4">
                <div aria-hidden className="absolute -right-16 -top-12 h-40 w-40 rounded-full opacity-70 blur-3xl" style={{ background: G }} />
                <div className="relative font-display italic text-lg leading-tight">{chapter}</div>
                <div className="relative text-[11px] text-muted-foreground">{inst.name} · {subject} · Class {cls}</div>
                <div className="relative mt-3 flex flex-wrap gap-2">
                  <button onClick={toggleComplete} className="glass rounded-full px-3 py-1.5 text-[10.5px] font-semibold">
                    {state.completed.includes(chapterId(subject, cls, chapter)) ? "✓ Completed" : "Mark completed"}
                  </button>
                  <button onClick={toggleWeak} className="glass rounded-full px-3 py-1.5 text-[10.5px] font-semibold">
                    {state.weak.includes(chapterId(subject, cls, chapter)) ? "★ Weak topic" : "Mark weak"}
                  </button>
                  {nextChapter(subject, cls, chapter) && (
                    <button onClick={() => setChapter(nextChapter(subject, cls, chapter)!)} className="glass rounded-full px-3 py-1.5 text-[10.5px] font-semibold">
                      Next: {nextChapter(subject, cls, chapter)}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 mb-2 flex items-center justify-between px-1">
                <div className="font-display italic text-base">Lecture types</div>
                <span className="text-[10px] text-muted-foreground">{VIDEO_CATEGORIES.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {VIDEO_CATEGORIES.map((cat) => {
                  const id = `${inst.key}|${subject}|${cls}|${chapter}|${cat.key}`;
                  const marked = state.bookmarks.some((b: any) => b.id === id);
                  return (
                    <div key={cat.key} className="glass relative overflow-hidden rounded-2xl p-3">
                      <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: G }} />
                      <button onClick={() => openCategory(cat)} className="relative w-full text-left">
                        <div className="text-lg">{cat.emoji}</div>
                        <div className="mt-1 text-[12.5px] font-semibold leading-tight">{cat.label}</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground leading-tight">{cat.hint}</div>
                      </button>
                      <div className="relative mt-2 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider"><Play className="h-3 w-3" /> Watch</span>
                        <button onClick={() => toggleBookmark({
                          id, institute: inst.short, subject, cls, chapter, category: cat.label,
                          query: buildQuery(inst, subject, cls, chapter, cat, f, exam),
                          url: youtubeSearchUrl(buildQuery(inst, subject, cls, chapter, cat, f, exam), f),
                          at: Date.now(), seconds: 0, done: false,
                        })} aria-label="Bookmark">
                          {marked ? <BookmarkCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Study extras (Sam AI) */}
              <div className="mt-5 mb-2 font-display italic text-base px-1">Study kit for this chapter</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Doubt Assistant", p: `I'm studying ${subject} chapter "${chapter}" (Class ${cls}) from ${inst.name}. Ask my doubt, then explain with concept, example and one practice question.` },
                  { label: "Notes", p: `Write clean tutor-quality ${EXAM} notes for ${subject} Class ${cls} chapter "${chapter}" — headings, key results, boxed formulas, TL;DR on top.` },
                  { label: "Flashcards", p: `Give 20 flashcards (Q → A) for ${subject} Class ${cls} chapter "${chapter}".` },
                  { label: "Formula Sheet", p: `Give the complete formula sheet for ${subject} Class ${cls} chapter "${chapter}" with variables, units and conditions.` },
                  { label: "PYQs", p: `Give 10 ${EXAM} previous-year questions from ${subject} chapter "${chapter}" with year tags and full solutions.` },
                  { label: "DPP", p: `Create a Daily Practice Problem sheet (12 questions, easy→hard) for ${subject} chapter "${chapter}" with an answer key.` },
                  { label: "Chapter Test", p: `Create a 20-question chapter test on ${subject} "${chapter}" (${EXAM} pattern) with answer key and solutions.` },
                  { label: "Mock Test", p: `Create a full ${EXAM} mock test slice weighted around ${subject} "${chapter}" with marking scheme and solutions.` },
                  { label: "Related Videos", p: `Suggest the best YouTube lectures and playlists for ${subject} "${chapter}" across ALLEN, PW, Unacademy, Vedantu — with what each is good for.` },
                  { label: "Recommended Next", p: `I finished ${subject} "${chapter}" (Class ${cls}). Tell me the best next chapter and why, plus a 3-day plan.` },
                ].map((x) => (
                  <button key={x.label} onClick={() => onOpen?.(`${x.label} · ${chapter}`, x.p)}
                    className="glass relative overflow-hidden rounded-2xl p-3 text-left transition-transform active:scale-[0.97]">
                    <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: G }} />
                    <div className="relative flex h-7 w-7 items-center justify-center rounded-xl text-white shadow-md mb-2" style={{ background: G }}>
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="relative text-[12px] font-medium leading-tight">{x.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {player && <PlayerSheet entry={player} onClose={() => setPlayer(null)}
        onSaveTime={(sec) => patch({ history: state.history.map((h: any) => (h.id === player.id ? { ...h, seconds: sec } : h)) })} />}
    </section>
  );
}

function Grid({ title, children }: any) {
  return (
    <div className="mt-4">
      <div className="mb-2 font-display italic text-base px-1">{title}</div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function Tile({ label, hint, onClick }: any) {
  return (
    <button onClick={onClick} className="glass relative overflow-hidden rounded-2xl p-4 text-left transition-transform active:scale-[0.97]">
      <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: G }} />
      <div className="relative text-[13px] font-semibold">{label}</div>
      <div className="relative mt-1 text-[10px] text-muted-foreground">{hint}</div>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="glass rounded-2xl p-5 text-center text-[12px] text-muted-foreground">{text}</div>;
}

function Row({ h, onPlay, onBookmark, marked }: any) {
  return (
    <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2.5">
      <button onClick={onPlay} className="flex-1 text-left">
        <div className="text-[12.5px] font-medium leading-tight">{h.chapter}</div>
        <div className="text-[10px] text-muted-foreground">{h.institute} · {h.category} · {h.subject} Class {h.cls}{h.seconds ? ` · ${Math.floor(h.seconds / 60)} min in` : ""}</div>
      </button>
      <button onClick={onBookmark} aria-label="Bookmark">
        {marked ? <BookmarkCheck className="h-4 w-4 text-emerald-500" /> : <Bookmark className="h-4 w-4 text-muted-foreground" />}
      </button>
      <a href={h.url} target="_blank" rel="noreferrer" aria-label="Open on YouTube"><ExternalLink className="h-4 w-4 text-muted-foreground" /></a>
    </div>
  );
}

function PlayerSheet({ entry, onClose, onSaveTime }: any) {
  const [min, setMin] = useState(Math.floor((entry.seconds || 0) / 60));
  const src = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(entry.query)}&start=${entry.seconds || 0}&rel=0`;
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative flex w-full max-w-[480px] max-h-[88vh] flex-col overflow-hidden rounded-t-3xl pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60 backdrop-blur"><X className="h-4 w-4" /></button>
        <div className="px-5 pb-2 pr-12">
          <div className="font-display italic text-lg leading-tight">{entry.category}</div>
          <div className="text-[11px] text-muted-foreground">{entry.institute} · {entry.chapter} · Class {entry.cls}</div>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          <div className="overflow-hidden rounded-2xl bg-black aspect-video">
            <iframe src={src} title={entry.query} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowFullScreen />
          </div>
          <div className="glass mt-3 rounded-2xl p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Search used</div>
            <div className="mt-1 text-[12px]">{entry.query}</div>
            <a href={entry.url} target="_blank" rel="noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-white" style={{ background: G }}>
              <ExternalLink className="h-4 w-4" /> Open full results on YouTube
            </a>
          </div>
          <div className="glass mt-3 flex items-center gap-2 rounded-2xl p-3">
            <div className="flex-1 text-[11px] text-muted-foreground">Resume point</div>
            <input type="number" min={0} value={min} onChange={(e) => setMin(Number(e.target.value))}
              className="w-16 rounded-lg bg-foreground/5 px-2 py-1 text-[12px] outline-none" />
            <span className="text-[11px] text-muted-foreground">min</span>
            <button onClick={() => { onSaveTime(Math.max(0, min) * 60); toast.success("Resume point saved"); }}
              className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: G }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
