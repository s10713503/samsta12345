// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Atom, Beaker, Sigma, Search, Layers, Star, FileDown, Mic, Loader2, Shuffle,
  RotateCcw, Check, X, Flame, Trash2, Share2, ChevronRight, Sparkles, Printer, Leaf,
} from "lucide-react";
import { deLatex } from "@/lib/plain-math";
import * as JEE from "@/lib/jee-syllabus";
import * as NEET from "@/lib/neet-syllabus";
import { markStudied } from "@/lib/jee-coach";
import { toast } from "sonner";
import { streamSam } from "@/lib/stream-sam";
import { streamImage } from "@/lib/stream-image";
import physicsCover from "@/assets/formula-physics.jpg";
import chemistryCover from "@/assets/formula-chemistry.jpg";
import mathsCover from "@/assets/formula-maths.jpg";
import biologyCover from "@/assets/formula-biology.jpg";

export type ExamKey = "jee" | "neet";
type SubjectKey = "physics" | "chemistry" | "maths" | "biology";

const SUBJECT_META: Record<SubjectKey, {
  name: string; Icon: any; cover: string; gradient: string; accent: string;
  chapters: string[]; fields: string[];
}> = {
  physics: {
    name: "Physics",
    Icon: Atom,
    cover: physicsCover,
    gradient: "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.70 0.15 285))",
    accent: "oklch(0.80 0.12 250)",
    fields: ["Formula", "Variable meanings", "SI Units", "Explanation", "Shortcut trick", "Common mistakes", "Example", "Related formulas"],
    chapters: [],
  },
  chemistry: {
    name: "Chemistry",
    Icon: Beaker,
    cover: chemistryCover,
    gradient: "linear-gradient(135deg, oklch(0.80 0.13 150), oklch(0.72 0.15 130))",
    accent: "oklch(0.78 0.13 150)",
    fields: ["Equation", "Variables", "Explanation", "Conditions", "Units", "Exceptions", "Example", "Memory trick"],
    chapters: [],
  },
  maths: {
    name: "Mathematics",
    Icon: Sigma,
    cover: mathsCover,
    gradient: "linear-gradient(135deg, oklch(0.86 0.14 80), oklch(0.76 0.16 45))",
    accent: "oklch(0.84 0.14 75)",
    fields: ["Formula", "Proof (optional)", "Explanation", "Shortcut", "Solved example", "Practice question", "Common mistakes"],
    chapters: [],
  },
  biology: {
    name: "Biology",
    Icon: Leaf,
    cover: biologyCover,
    gradient: "linear-gradient(135deg, oklch(0.84 0.13 150), oklch(0.74 0.14 165))",
    accent: "oklch(0.80 0.13 155)",
    fields: ["Concept", "Definition", "Diagram cues", "NCERT line", "Exceptions", "Examples", "Memory trick", "Common mistakes"],
    chapters: [],
  },
};

const EXAMS: Record<ExamKey, { label: string; subjects: SubjectKey[]; syl: any }> = {
  jee: { label: "IIT JEE", subjects: ["physics", "chemistry", "maths"], syl: JEE },
  neet: { label: "NEET", subjects: ["physics", "chemistry", "biology"], syl: NEET },
};

const SUBJECT_LABEL: Record<SubjectKey, string> = {
  physics: "Physics", chemistry: "Chemistry", maths: "Maths", biology: "Biology",
};

/** Subject config (with chapters) for a given exam. */
function subjectsOf(exam: ExamKey) {
  const { subjects, syl } = EXAMS[exam];
  const out: Record<string, any> = {};
  for (const k of subjects) out[k] = { ...SUBJECT_META[k], chapters: syl.chapterNames(k) };
  return out;
}

const tabsOf = (exam: ExamKey) => [
  ...EXAMS[exam].subjects.map((k) => ({ key: k, label: SUBJECT_LABEL[k], Icon: SUBJECT_META[k].Icon })),
  { key: "search", label: "Search", Icon: Search },
  { key: "flashcards", label: "Flashcards", Icon: Layers },
  { key: "favourites", label: "Favourites", Icon: Star },
  { key: "export", label: "PDF Export", Icon: FileDown },
];

// ---------- local storage helpers ----------
const keys = (exam: ExamKey) => ({
  fav: `samsta:${exam}:formula:favourites`,
  cards: `samsta:${exam}:formula:cards`,
  recent: `samsta:${exam}:formula:recent`,
  streak: `samsta:${exam}:formula:streak`,
  cache: `samsta:${exam}:formula:cache`,
});
function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key: string, v: any) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* noop */ }
}
const uid = () => Math.random().toString(36).slice(2, 10);

function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => { setV(read<T>(key, initial)); /* eslint-disable-next-line */ }, [key]);
  const set = useCallback((next: T | ((p: T) => T)) => {
    setV((prev) => {
      const out = typeof next === "function" ? (next as any)(prev) : next;
      write(key, out);
      return out;
    });
  }, [key]);
  return [v, set] as const;
}

// ---------- markdown-lite renderer ----------
function Rich({ text }: { text: string }) {
  const html = useMemo(() => {
    return deLatex(text)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/^### (.*)$/gm, '<h3 class="mt-4 mb-1 text-base font-bold">$1</h3>')
      .replace(/^## (.*)$/gm, '<h2 class="mt-5 mb-2 text-lg font-extrabold">$1</h2>')
      .replace(/^# (.*)$/gm, '<h1 class="mt-5 mb-2 text-xl font-extrabold">$1</h1>')
      .replace(/`([^`]+)`/g, '<code class="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/^\s*[-•]\s+(.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
      .replace(/\n{2,}/g, '<div class="h-2"></div>')
      .replace(/\n/g, "<br/>");
  }, [text]);
  return <div className="text-sm leading-relaxed text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground" dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---------- main ----------
export default function FormulaLibrary({
  onOpen,
  tab: tabProp,
  onTabChange,
  exam = "jee",
}: {
  onOpen?: (title: string, prompt: string) => void;
  tab?: string;
  onTabChange?: (t: string) => void;
  exam?: ExamKey;
}) {
  const K = keys(exam);
  const TABS = useMemo(() => tabsOf(exam), [exam]);
  const SUBJECTS = useMemo(() => subjectsOf(exam), [exam]);
  const [tabState, setTabState] = useState<string>("physics");
  const tab = tabProp ?? tabState;
  const setTab = (t: string) => { setTabState(t); onTabChange?.(t); };
  const [favs, setFavs] = useLocal<any[]>(K.fav, []);
  const [cards, setCards] = useLocal<any[]>(K.cards, []);
  const [recent, setRecent] = useLocal<string[]>(K.recent, []);
  const [streak, setStreak] = useLocal<{ day: string; count: number }>(K.streak, { day: "", count: 0 });

  const bumpStreak = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setStreak((s) => {
      if (s.day === today) return s;
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      return { day: today, count: s.day === y ? s.count + 1 : 1 };
    });
  }, [setStreak]);

  const toggleFav = useCallback((item: any) => {
    setFavs((list) => {
      const i = list.findIndex((f) => f.id === item.id);
      if (i >= 0) { toast("Removed from favourites"); return list.filter((f) => f.id !== item.id); }
      toast.success("Saved to favourites ⭐");
      return [{ ...item, at: Date.now(), note: "" }, ...list];
    });
  }, [setFavs]);

  return (
    <section className="mt-6 space-y-4">
      {/* header */}
      <div className="glass-strong overflow-hidden rounded-3xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">Formula & Flashcard Studio</h2>
            <p className="text-xs text-muted-foreground">generated formula sheets· flashcards· favourites· printable PDF</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1.5 text-xs font-semibold">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            {streak.count} day{streak.count === 1 ? "" : "s"}
          </div>
        </div>

        {/* tabs */}
        <div className="mt-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-all duration-300 ${
                  active ? "text-background shadow-lg scale-[1.03]" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}
                style={active ? { background: "linear-gradient(135deg, oklch(0.78 0.14 300), oklch(0.70 0.16 280))" } : undefined}
              >
                <t.Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div key={tab} className="animate-fade-in">
        {SUBJECTS[tab] && (
          <SubjectPanel
            exam={exam}
            subject={tab as SubjectKey}
            onFav={toggleFav}
            favs={favs}
            onOpen={onOpen}
            onStudy={bumpStreak}
          />
        )}
        {tab === "search" && <SearchPanel exam={exam} recent={recent} setRecent={setRecent} onFav={toggleFav} onStudy={bumpStreak} />}
        {tab === "flashcards" && <FlashcardsPanel exam={exam} cards={cards} setCards={setCards} onStudy={bumpStreak} />}
        {tab === "favourites" && <FavouritesPanel favs={favs} setFavs={setFavs} />}
        {tab === "export" && <ExportPanel exam={exam} favs={favs} cards={cards} />}
      </div>
    </section>
  );
}

// ---------- shared AI panel ----------
function useSam(tool = "formulas") {
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const run = useCallback(async (prompt: string) => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true); setOut("");
    try {
      await streamSam(tool, [{ role: "user", content: prompt }], setOut, ctrl.signal);
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message || "Sam couldn't answer — try again");
    } finally { setBusy(false); }
  }, [tool]);
  return { out, busy, run, setOut };
}

// ---------- 1-3: subject masters (5-page chapter sheets) ----------
const WEIGHT_STYLE: Record<string, string> = {
  high: "bg-rose-500/15 text-rose-500",
  medium: "bg-amber-500/15 text-amber-600",
  low: "bg-emerald-500/15 text-emerald-600",
};

function SubjectPanel({ exam = "jee", subject, onFav, favs, onOpen, onStudy }: any) {
  const K = keys(exam as ExamKey);
  const EX = EXAMS[exam as ExamKey];
  const SHEET_SECTIONS = EX.syl.SHEET_SECTIONS;
  const REVISION_MODES = EX.syl.REVISION_MODES;
  const s = subjectsOf(exam as ExamKey)[subject];
  const all = EX.syl.chaptersOf(subject);
  const [chapter, setChapter] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<"all" | 11 | 12>("all");
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [revision, setRevision] = useState<{ mode: string; text: string } | null>(null);
  const [img, setImg] = useState<{ url: string; final: boolean } | null>(null);
  const [imgBusy, setImgBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const cacheKey = (c: string, k: string) => `${K.cache}:${subject}:${c}:${k}`;

  const chapters = all.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) && (cls === "all" || c.cls === cls),
  );

  const generate = useCallback(async (c: string, sectionKey: string, prompt: string, into: "page" | "revision") => {
    const cached = read<string>(cacheKey(c, sectionKey), "");
    if (cached) {
      if (into === "page") setPages((p) => ({ ...p, [sectionKey]: cached }));
      else setRevision({ mode: sectionKey, text: cached });
      return cached;
    }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusyKey(sectionKey);
    if (into === "page") setPages((p) => ({ ...p, [sectionKey]: "" }));
    else setRevision({ mode: sectionKey, text: "" });
    try {
      const out = await streamSam("formulas", [{ role: "user", content: prompt }], (acc) => {
        if (into === "page") setPages((p) => ({ ...p, [sectionKey]: acc }));
        else setRevision({ mode: sectionKey, text: acc });
      }, ctrl.signal);
      write(cacheKey(c, sectionKey), out);
      return out;
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error(e?.message || "Sam couldn't answer — try again");
      return "";
    } finally {
      setBusyKey(null);
    }
  }, [subject]);

  const open = (c: string) => {
    setChapter(c);
    setPage(0);
    setPages({});
    setRevision(null);
    setImg(null);
    onStudy?.();
    markStudied(`${subject}:${c}`, 15, 10);
    const sec = SHEET_SECTIONS[0];
    generate(c, sec.key, sec.prompt(s.name, c), "page");
  };

  const openPage = (i: number) => {
    setPage(i);
    const sec = SHEET_SECTIONS[i];
    if (chapter && !pages[sec.key]) generate(chapter, sec.key, sec.prompt(s.name, chapter), "page");
  };

  const generateAll = async () => {
    if (!chapter) return;
    for (let i = 0; i < SHEET_SECTIONS.length; i++) {
      const sec = SHEET_SECTIONS[i];
      setPage(i);
      if (!pages[sec.key] && !read<string>(cacheKey(chapter, sec.key), "")) {
        await generate(chapter, sec.key, sec.prompt(s.name, chapter), "page");
      } else {
        await generate(chapter, sec.key, sec.prompt(s.name, chapter), "page");
      }
    }
    toast.success("All 5 pages ready 📄");
  };

  const makeVisual = async (c: string) => {
    setImgBusy(true);
    try {
      await streamImage(
        `A beautiful, ultra-clean educational formula poster for the ${EX.label} ${s.name} chapter "${c}". Show the most important formulas written in crisp, correct, legible PLAIN-TEXT typography (no LaTeX markup, no stray backslashes or dollar signs), grouped in soft rounded cards with sub-topic labels, tiny diagrams and colour-coded variable legends. Pastel study-aesthetic palette, generous white space, flat vector infographic style, portrait poster layout, no watermark.`,
        (f) => setImg({ url: f.dataUrl, final: f.isFinal }),
      );
    } catch (e: any) {
      toast.error(e?.message || "Couldn't generate the visual sheet");
    } finally {
      setImgBusy(false);
    }
  };

  const mdToHtml = (t: string) => {
    const esc = (x: string) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const lines = esc(deLatex(t)).split("\n");
    const out: string[] = [];
    let table: string[][] = [];
    const flush = () => {
      if (!table.length) return;
      const [head, ...rows] = table;
      out.push(
        `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
        rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("") +
        `</tbody></table>`,
      );
      table = [];
    };
    for (const line of lines) {
      if (/^\s*\|.*\|\s*$/.test(line)) {
        const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
        table.push(cells);
        continue;
      }
      flush();
      out.push(
        line
          .replace(/^### (.*)$/, "<h3>$1</h3>")
          .replace(/^## (.*)$/, "<h2>$1</h2>")
          .replace(/^# (.*)$/, "<h2>$1</h2>")
          .replace(/\*\*([^*]+)\*\*/g, "<b class='f'>$1</b>")
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/^\s*[-•]\s+(.*)$/, "<li>$1</li>") || "<div class='sp'></div>",
      );
    }
    flush();
    return out.join("\n").replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, "<ul>$1</ul>");
  };

  const exportChapterPdf = async () => {
    if (!chapter) return;
    const sheets = SHEET_SECTIONS.map((sec: any) => ({
      sec,
      body: pages[sec.key] || read<string>(cacheKey(chapter, sec.key), ""),
    })).filter((x) => x.body);
    if (!sheets.length) { toast.error("Wait for the formula sheet to finish"); return; }
    const esc = (x: string) => String(x || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const w = window.open("", "_blank");
    if (!w) { toast.error("Allow pop-ups to download the PDF"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(chapter)} — ${esc(s.name)} Formula Sheet</title>
<style>
@page { margin: 15mm 12mm; }
body { font-family: Georgia,'Times New Roman',serif; color:#141414; line-height:1.55; }
.cover { border-radius:18px; padding:26px 22px; background:linear-gradient(135deg,#f3ecff,#e9f4ff); margin-bottom:14px; }
h1 { font-size:30px; margin:0; letter-spacing:-0.6px; }
.sub { color:#5c5c5c; font-size:12px; margin-top:6px; }
.page { page-break-before:always; }
.ptitle { margin:0 0 10px; padding:10px 14px; border-radius:12px; background:linear-gradient(135deg,#efeaff,#f7f2ff); font-size:17px; font-weight:700; }
h2 { font-size:14.5px; margin:16px 0 6px; padding:6px 10px; background:#f4f4f8; border-left:4px solid #7c5cff; border-radius:6px; page-break-after:avoid; }
h3 { font-size:13px; margin:11px 0 4px; }
.f { display:inline-block; background:#fffbe8; border:1px solid #f0e2a8; border-radius:6px; padding:1px 7px; font-size:13.5px; }
code { background:#f2f2f2; border-radius:4px; padding:1px 5px; font-size:12px; }
ul { margin:4px 0 4px 18px; } li { font-size:12.5px; margin:2px 0; }
table { width:100%; border-collapse:collapse; margin:8px 0 12px; font-size:11.5px; page-break-inside:avoid; }
th { background:#efeaff; text-align:left; padding:6px 7px; border:1px solid #ded6f5; }
td { padding:6px 7px; border:1px solid #e6e6ee; vertical-align:top; }
tbody tr:nth-child(even) td { background:#fafaff; }
.sp { height:7px; }
img.poster { width:100%; border-radius:14px; margin:6px 0 0; }
footer { text-align:center; font-size:10px; color:#8b8b8b; margin-top:18px; }
</style></head><body>
<div class="cover"><h1>${esc(chapter)}</h1><div class="sub">${esc(EX.label)} ${esc(s.name)} · ${sheets.length}-page formula sheet · Samsta Academy · ${new Date().toLocaleDateString()}</div></div>
${img?.final ? `<img class="poster" src="${img.url}" alt="${esc(chapter)} formula poster"/>` : ""}
${sheets.map((x: any) => `<div class="page"><div class="ptitle">${x.sec.emoji} ${esc(x.sec.label)}</div>${mdToHtml(x.body)}</div>`).join("")}
<footer>Samsta· Formula Library & Study Coach</footer>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 700);
  };

  const activeSection = SHEET_SECTIONS[page];
  const activeBody = pages[activeSection.key] || "";
  const favId = `${subject}:${chapter}:${activeSection.key}`;

  return (
    <div className="space-y-4">
      <div className="glass-strong relative overflow-hidden rounded-3xl">
        <img src={s.cover} alt={`${s.name} formulas cover`} loading="lazy" width={1024} height={640} className="h-36 w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl text-background" style={{ background: s.gradient }}>
              <s.Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold">{s.name} Formulas Master</h3>
              <p className="text-[11px] text-muted-foreground">{all.length} chapters · Class 11 + 12 · 5-page sheet each</p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Filter ${s.name} chapters…`}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-3 flex gap-2">
          {([["all", "All chapters"], [11, "Class 11"], [12, "Class 12"]] as const).map(([v, label]) => (
            <button
              key={String(v)}
              onClick={() => setCls(v as any)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${cls === v ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {chapters.map((c: any, i: number) => (
            <button
              key={c.name}
              onClick={() => open(c.name)}
              style={{ animationDelay: `${i * 18}ms` }}
              className={`animate-fade-in group flex flex-col gap-1.5 rounded-2xl border border-border/50 bg-card/60 p-3 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
                chapter === c.name ? "ring-2 ring-primary/60" : ""
              }`}
            >
              <span className="flex items-start justify-between gap-1">
                <span className="text-xs font-semibold leading-tight">{c.name}</span>
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="rounded-full bg-muted/70 px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">Class {c.cls}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold capitalize ${WEIGHT_STYLE[c.weight]}`}>{c.weight} weightage</span>
              </span>
            </button>
          ))}
          {!chapters.length && <p className="col-span-2 py-4 text-center text-xs text-muted-foreground">No chapters match that filter.</p>}
        </div>
      </div>

      {chapter && (
        <div className="glass-strong animate-scale-in rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg text-background" style={{ background: s.gradient }}>
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div>
                <h4 className="text-sm font-bold leading-tight">{chapter}</h4>
                <p className="text-[10px] text-muted-foreground">Page {page + 1} of {SHEET_SECTIONS.length} · {activeSection.label}</p>
              </div>
            </div>
            {!!activeBody && (
              <button
                onClick={() => onFav({ id: favId, kind: "formula", subject: s.name, chapter, section: activeSection.label, body: activeBody })}
                className="flex items-center gap-1 rounded-full bg-muted/70 px-3 py-1.5 text-[11px] font-semibold hover:bg-muted"
              >
                <Star className={`h-3.5 w-3.5 ${favs.some((f: any) => f.id === favId) ? "fill-amber-400 text-amber-400" : ""}`} />
                Save
              </button>
            )}
          </div>

          {/* 5 page tabs */}
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SHEET_SECTIONS.map((sec: any, i: number) => {
              const active = i === page;
              const done = !!pages[sec.key];
              return (
                <button
                  key={sec.key}
                  onClick={() => openPage(i)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    active ? "text-background shadow-md" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                  style={active ? { background: s.gradient } : undefined}
                >
                  <span>{sec.emoji}</span>{sec.label}
                  {done && !active && <Check className="h-3 w-3 text-emerald-500" />}
                </button>
              );
            })}
          </div>

          {/* progress dots */}
          <div className="mb-3 flex items-center gap-1.5">
            {SHEET_SECTIONS.map((sec: any, i: number) => (
              <span
                key={sec.key}
                className={`h-1.5 flex-1 rounded-full transition-all ${i === page ? "bg-primary" : pages[sec.key] ? "bg-primary/40" : "bg-muted"}`}
              />
            ))}
          </div>

          {(imgBusy || img) && (
            <div className="mb-3 overflow-hidden rounded-2xl border border-border/50 bg-muted/40">
              {img ? (
                <img src={img.url} alt={`${chapter} formula poster`} className={`w-full transition-[filter] duration-500 ${img.final ? "blur-0" : "blur-xl"}`} />
              ) : (
                <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Painting your visual formula poster…
                </div>
              )}
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button onClick={() => makeVisual(chapter)} disabled={imgBusy}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-muted/60 py-2.5 text-[11px] font-semibold hover:bg-muted disabled:opacity-60">
              {imgBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {img ? "Regenerate image" : "Generate image"}
            </button>
            <button onClick={generateAll} disabled={!!busyKey}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-muted/60 py-2.5 text-[11px] font-semibold hover:bg-muted disabled:opacity-60">
              <Layers className="h-3.5 w-3.5" /> Build all 5 pages
            </button>
            <button onClick={exportChapterPdf}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-2xl bg-primary py-2.5 text-[11px] font-bold text-primary-foreground">
              <FileDown className="h-3.5 w-3.5" /> Download 5-page PDF
            </button>
          </div>

          {/* revision modes */}
          <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {REVISION_MODES.map((m: any) => (
              <button
                key={m.key}
                onClick={() => generate(chapter, m.key, m.prompt(s.name, chapter), "revision")}
                className={`shrink-0 rounded-full border border-border/60 px-3 py-1.5 text-[11px] font-semibold transition ${
                  revision?.mode === m.key ? "bg-foreground text-background" : "bg-card/60 text-muted-foreground hover:bg-muted"
                }`}
              >
                {m.emoji} {m.label}
              </button>
            ))}
          </div>

          {revision && (
            <div className="mb-3 rounded-2xl border border-border/60 bg-card/60 p-3">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {REVISION_MODES.find((m: any) => m.key === revision.mode)?.label} revision
              </p>
              {!revision.text ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Compressing…</div>
              ) : (
                <Rich text={revision.text} />
              )}
              <button onClick={() => setRevision(null)} className="mt-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground">Close revision</button>
            </div>
          )}

          {busyKey === activeSection.key && !activeBody ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Sam is writing page {page + 1}…</div>
          ) : (
            <Rich text={activeBody} />
          )}

          <div className="mt-3 flex gap-2">
            <button onClick={() => openPage(Math.max(0, page - 1))} disabled={page === 0}
              className="flex-1 rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold disabled:opacity-50">← Previous page</button>
            <button onClick={() => openPage(Math.min(SHEET_SECTIONS.length - 1, page + 1))} disabled={page === SHEET_SECTIONS.length - 1}
              className="flex-1 rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold disabled:opacity-50">Next page →</button>
          </div>

          {!!activeBody && onOpen && (
            <button
              onClick={() => onOpen(`${chapter} · Deep dive`, `Explain the chapter "${chapter}" of ${EX.label} ${s.name} with derivations, tricks and PYQ patterns.`)}
              className="mt-2 w-full rounded-2xl bg-muted/60 py-2.5 text-xs font-semibold hover:bg-muted"
            >
              Ask Sam a follow-up →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- 4: search ----------
function SearchPanel({ exam = "jee", recent, setRecent, onFav, onStudy }: any) {
  const EX = EXAMS[exam as ExamKey];
  const SUBJECTS = subjectsOf(exam as ExamKey);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const [chapter, setChapter] = useState<string>("all");
  const { out, busy, run } = useSam();
  const [listening, setListening] = useState(false);

  const chapterOptions = subject === "all" ? [] : SUBJECTS[subject].chapters;

  const search = (term?: string) => {
    const query = (term ?? q).trim();
    if (!query) return;
    setQ(query);
    onStudy?.();
    setRecent((r: string[]) => [query, ...r.filter((x) => x !== query)].slice(0, 8));
    run(
      `Semantic formula search for ${EX.label}. Query: "${query}".
Scope: ${subject === "all" ? EX.subjects.map((k) => SUBJECT_META[k].name).join(", ") : SUBJECTS[subject].name}${chapter !== "all" ? ` → chapter "${chapter}"` : ""}.
Return the 3-6 most relevant formulas. For each: **the formula**, variables + SI units, when to use it, one shortcut, one common mistake, and a 1-line worked example. Markdown only, no preamble. Write every formula in PLAIN READABLE TEXT only — never LaTeX, never $, \\frac{}, \\sqrt{}, markup subscripts or superscripts. Examples: v = u + at, s = ut + (1/2)at², v² = u² + 2as, Fnet = ma. Use / for division, sqrt(x) for roots, and inline names like vmax, x1, KEavg.`
    );
  };

  const voice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice search isn't supported on this browser"); return; }
    const rec = new SR();
    rec.lang = "en-IN"; rec.interimResults = false;
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setListening(false); search(t); };
    rec.onerror = () => { setListening(false); toast.error("Couldn't hear that"); };
    rec.onend = () => setListening(false);
    setListening(true); rec.start();
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center gap-2 rounded-2xl bg-muted/60 px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Describe it — “force on a charge in a magnetic field”"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={voice} className={`grid h-8 w-8 place-items-center rounded-full ${listening ? "bg-red-500/20 text-red-500 animate-pulse" : "bg-muted hover:bg-muted/80"}`}>
            <Mic className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {["all", ...EX.subjects].map((s) => (
            <button
              key={s}
              onClick={() => { setSubject(s); setChapter("all"); }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize ${subject === s ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}
            >
              {s === "all" ? "All subjects" : s}
            </button>
          ))}
        </div>
        {!!chapterOptions.length && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {["all", ...chapterOptions].map((c) => (
              <button key={c} onClick={() => setChapter(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${chapter === c ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"}`}>
                {c === "all" ? "All chapters" : c}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => search()} disabled={busy}
          className="mt-3 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching…</span> : "semantic search"}
        </button>

        {!!recent.length && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Recent searches</p>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((r: string) => (
                <button key={r} onClick={() => search(r)} className="rounded-full bg-muted/60 px-2.5 py-1 text-[11px] hover:bg-muted">{r}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {(busy || out) && (
        <div className="glass-strong animate-scale-in rounded-3xl p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-bold">Results · {q}</h4>
            {!!out && (
              <button onClick={() => onFav({ id: `search:${q}`, kind: "formula", subject: subject === "all" ? "Mixed" : SUBJECTS[subject].name, chapter: q, body: out })}
                className="flex items-center gap-1 rounded-full bg-muted/70 px-3 py-1.5 text-[11px] font-semibold hover:bg-muted">
                <Star className="h-3.5 w-3.5" /> Save
              </button>
            )}
          </div>
          {busy && !out && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
          <Rich text={out} />
        </div>
      )}
    </div>
  );
}

// ---------- 5: flashcards ----------
function FlashcardsPanel({ exam = "jee", cards, setCards, onStudy }: any) {
  const EX = EXAMS[exam as ExamKey];
  const SUBJECTS = useMemo(() => subjectsOf(exam as ExamKey), [exam]);
  const [subject, setSubject] = useState<SubjectKey>("physics");
  const [chapter, setChapter] = useState<string>(SUBJECTS.physics.chapters[0]);
  const [level, setLevel] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [busy, setBusy] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [quiz, setQuiz] = useState(false);

  const deck = useMemo(
    () => cards.filter((c: any) => c.subject === subject && c.chapter === chapter),
    [cards, subject, chapter],
  );
  const card = deck[idx % Math.max(1, deck.length)];
  const wrong = cards.filter((c: any) => c.wrong);
  const learned = cards.filter((c: any) => c.box >= 2).length;

  const generate = async () => {
    setBusy(true);
    try {
      let acc = "";
      await streamSam("formulas", [{
        role: "user",
        content: `Generate 12 ${EX.label} ${SUBJECTS[subject].name} flashcards for the chapter "${chapter}" at ${level} difficulty.
Return ONLY a JSON array, no markdown fences: [{"q":"question or formula name","a":"answer with the formula, units and when to use it","level":"${level}"}]
Write every formula in PLAIN READABLE TEXT only — never LaTeX, never $, \\frac{}, \\sqrt{}, markup subscripts or superscripts. Examples: v = u + at, s = ut + (1/2)at², v² = u² + 2as, Fnet = ma. Use / for division, sqrt(x) for roots, and inline names like vmax, x1, KEavg.`,
      }], (t) => { acc = t; });
      const raw = acc.trim().replace(/^```json\s*|\s*```$/g, "");
      const start = raw.indexOf("["); const end = raw.lastIndexOf("]");
      const parsed = JSON.parse(raw.slice(start, end + 1));
      const next = parsed.slice(0, 20).map((c: any) => ({
        id: uid(), subject, chapter, level: c.level || level,
        q: String(c.q || ""), a: String(c.a || ""), box: 0, wrong: false, bookmark: false,
      }));
      setCards((list: any[]) => [...next, ...list].slice(0, 600));
      setIdx(0); setFlipped(false);
      onStudy?.();
      toast.success(`${next.length} flashcards added`);
    } catch {
      toast.error("Couldn't build the deck — try again");
    } finally { setBusy(false); }
  };

  const mark = (ok: boolean) => {
    if (!card) return;
    setCards((list: any[]) => list.map((c) => c.id === card.id
      ? { ...c, box: ok ? Math.min(5, (c.box || 0) + 1) : 0, wrong: !ok, lastAt: Date.now() }
      : c));
    setFlipped(false);
    setIdx((i) => i + 1);
    onStudy?.();
  };

  return (
    <div className="space-y-4">
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SUBJECTS) as SubjectKey[]).map((s) => (
            <button key={s} onClick={() => { setSubject(s); setChapter(SUBJECTS[s].chapters[0]); setIdx(0); }}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${subject === s ? "text-background" : "bg-muted/60 text-muted-foreground"}`}
              style={subject === s ? { background: SUBJECTS[s].gradient } : undefined}>
              {SUBJECTS[s].name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SUBJECTS[subject].chapters.map((c: string) => (
            <button key={c} onClick={() => { setChapter(c); setIdx(0); setFlipped(false); }}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium ${chapter === c ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {(["Easy", "Medium", "Hard"] as const).map((l) => (
            <button key={l} onClick={() => setLevel(l)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${level === l ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>
              {l}
            </button>
          ))}
          <button onClick={() => setQuiz((v) => !v)}
            className={`ml-auto rounded-full px-3 py-1.5 text-[11px] font-semibold ${quiz ? "bg-emerald-500 text-white" : "bg-muted/60 text-muted-foreground"}`}>
            Quiz mode
          </button>
        </div>
        <button onClick={generate} disabled={busy}
          className="mt-3 w-full rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60">
          {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Building deck…</span> : "Generate 12 flashcards"}
        </button>
      </div>

      {/* card */}
      <div className="glass-strong rounded-3xl p-4">
        {!deck.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No cards yet for {chapter}. Generate a deck above.</p>
        ) : (
          <>
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{(idx % deck.length) + 1} / {deck.length} · {card?.level}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setIdx(Math.floor(Math.random() * deck.length)); setFlipped(false); }} className="rounded-full bg-muted/60 p-1.5"><Shuffle className="h-3.5 w-3.5" /></button>
                <button onClick={() => setCards((l: any[]) => l.map((c) => c.id === card.id ? { ...c, bookmark: !c.bookmark } : c))} className="rounded-full bg-muted/60 p-1.5">
                  <Star className={`h-3.5 w-3.5 ${card?.bookmark ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setFlipped((f) => !f)}
              className="relative block h-56 w-full [perspective:1200px]"
            >
              <div className={`absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
                <div className="absolute inset-0 grid place-items-center rounded-3xl p-5 text-center text-background [backface-visibility:hidden]"
                  style={{ background: SUBJECTS[subject].gradient }}>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest opacity-80">{chapter}</p>
                    <p className="text-base font-extrabold leading-snug">{deLatex(String(card?.q || ""))}</p>
                    <p className="mt-4 text-[11px] opacity-80">Tap to flip</p>
                  </div>
                </div>
                <div className="absolute inset-0 grid place-items-center overflow-auto rounded-3xl border border-border/60 bg-card p-5 text-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                  <p className="text-sm leading-relaxed">{deLatex(String(card?.a || ""))}</p>
                </div>
              </div>
            </button>

            {quiz ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => mark(false)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-500/15 py-3 text-sm font-bold text-red-500">
                  <X className="h-4 w-4" /> Got it wrong
                </button>
                <button onClick={() => mark(true)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/15 py-3 text-sm font-bold text-emerald-600">
                  <Check className="h-4 w-4" /> Knew it
                </button>
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => { setIdx((i) => (i - 1 + deck.length) % deck.length); setFlipped(false); }} className="rounded-2xl bg-muted/60 py-3 text-sm font-semibold">Previous</button>
                <button onClick={() => { setIdx((i) => (i + 1) % deck.length); setFlipped(false); }} className="rounded-2xl bg-muted/60 py-3 text-sm font-semibold">Next</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* progress */}
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span>Progress</span>
          <span className="text-muted-foreground">{learned}/{cards.length} mastered</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${cards.length ? (learned / cards.length) * 100 : 0}%`, background: "linear-gradient(90deg, oklch(0.80 0.13 150), oklch(0.86 0.14 80))" }} />
        </div>
        {!!wrong.length && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-muted-foreground">Wrong answers to revise ({wrong.length})</p>
            <div className="space-y-1.5">
              {wrong.slice(0, 5).map((c: any) => (
                <div key={c.id} className="rounded-2xl bg-muted/50 p-2.5 text-[11px]">
                  <span className="font-semibold">{c.q}</span>
                  <span className="text-muted-foreground"> — {c.chapter}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- 6: favourites ----------
function FavouritesPanel({ favs, setFavs }: any) {
  const [open, setOpen] = useState<string | null>(null);
  const share = async (f: any) => {
    const text = `${f.subject} · ${f.chapter}\n\n${(f.body || "").slice(0, 1200)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${f.subject} formulas`, text });
      else { await navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); }
    } catch { /* cancelled */ }
  };
  if (!favs.length) {
    return <div className="glass-strong rounded-3xl p-8 text-center text-sm text-muted-foreground">No favourites yet — tap ⭐ Save on any formula sheet or search result.</div>;
  }
  return (
    <div className="space-y-3">
      {favs.map((f: any) => (
        <div key={f.id} className="glass-strong animate-fade-in rounded-3xl p-4">
          <div className="flex items-start justify-between gap-2">
            <button onClick={() => setOpen(open === f.id ? null : f.id)} className="text-left">
              <p className="text-sm font-bold">{f.chapter}</p>
              <p className="text-[11px] text-muted-foreground">{f.subject} · saved {new Date(f.at).toLocaleDateString()}</p>
            </button>
            <div className="flex items-center gap-1.5">
              <button onClick={() => share(f)} className="rounded-full bg-muted/60 p-2"><Share2 className="h-3.5 w-3.5" /></button>
              <button onClick={() => setFavs((l: any[]) => l.filter((x) => x.id !== f.id))} className="rounded-full bg-muted/60 p-2"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {open === f.id && (
            <div className="mt-3 animate-fade-in">
              <Rich text={f.body || ""} />
              <textarea
                value={f.note || ""}
                onChange={(e) => setFavs((l: any[]) => l.map((x) => x.id === f.id ? { ...x, note: e.target.value } : x))}
                placeholder="Your note…"
                className="mt-3 w-full resize-none rounded-2xl bg-muted/60 p-3 text-xs outline-none"
                rows={3}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- 7: pdf export ----------
function ExportPanel({ exam = "jee", favs, cards }: any) {
  const [scope, setScope] = useState<"favourites" | "flashcards">("favourites");
  const [title, setTitle] = useState(`${EXAMS[exam as ExamKey].label} Formula Blueprint`);

  const exportPdf = () => {
    const esc = (s: string) => deLatex(String(s || "")).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const body = scope === "favourites"
      ? favs.map((f: any, i: number) => `<section><h2>${i + 1}. ${esc(f.chapter)} <small>${esc(f.subject)}</small></h2><pre>${esc(f.body)}</pre>${f.note ? `<p class="note">Note: ${esc(f.note)}</p>` : ""}</section>`).join("")
      : cards.map((c: any, i: number) => `<div class="card"><b>${i + 1}. ${esc(c.q)}</b><p>${esc(c.a)}</p><small>${esc(c.subject)} · ${esc(c.chapter)} · ${esc(c.level)}</small></div>`).join("");

    if (!body) { toast.error(`Nothing to export in ${scope}`); return; }
    const w = window.open("", "_blank");
    if (!w) { toast.error("Allow pop-ups to export"); return; }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"/><title>${esc(title)}</title>
<style>
@page { margin: 18mm 14mm; }
body { font-family: Georgia, 'Times New Roman', serif; color:#111; line-height:1.55; }
h1 { font-size:30px; text-align:center; margin:0 0 4px; letter-spacing:-0.5px; }
.sub { text-align:center; color:#666; font-size:12px; margin-bottom:22px; }
h2 { font-size:16px; border-bottom:2px solid #111; padding-bottom:4px; margin:22px 0 8px; }
h2 small { float:right; font-weight:400; color:#777; }
pre { white-space:pre-wrap; font-family:inherit; font-size:12.5px; margin:0; }
.note { background:#f5f5f5; padding:8px 10px; border-left:3px solid #999; font-size:12px; }
.card { border:1px solid #ddd; border-radius:8px; padding:10px 12px; margin:8px 0; page-break-inside:avoid; font-size:12.5px; }
.card small { color:#777; }
section { page-break-inside:avoid; }
footer { position:fixed; bottom:0; width:100%; text-align:center; font-size:10px; color:#888; }
</style></head><body>
<h1>${esc(title)}</h1><div class="sub">Samsta Academy · ${scope === "favourites" ? "Favourite formulas" : "Flashcards"} · ${new Date().toLocaleDateString()}</div>
${body}
<footer>Samsta · Formula & Flashcard Studio</footer>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="glass-strong space-y-3 rounded-3xl p-4">
      <h3 className="text-sm font-bold">PDF Export Blueprint</h3>
      <input value={title} onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-2xl bg-muted/60 px-3 py-2.5 text-sm outline-none" placeholder="Document title" />
      <div className="flex gap-2">
        {(["favourites", "flashcards"] as const).map((s) => (
          <button key={s} onClick={() => setScope(s)}
            className={`flex-1 rounded-2xl py-2.5 text-xs font-semibold capitalize ${scope === s ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}`}>
            {s} ({s === "favourites" ? favs.length : cards.length})
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Printable layout with title page header, numbered sections, formula boxes, explanations, examples and page footers.
      </p>
      <button onClick={exportPdf} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground">
        <Printer className="h-4 w-4" /> Export beautiful PDF
      </button>
    </div>
  );
}
