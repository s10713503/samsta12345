// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, Loader2, X, ChevronRight, Upload, FileText, Trash2,
  Trophy, Target, Clock, Flame, Brain, Zap, TrendingUp, Award, BookOpen,
  Calculator, Beaker, Sigma, Video, Mic, PenLine, ScanLine, Timer,
  BarChart3, Rocket, RefreshCw, Play, Save, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { streamSam } from "@/lib/stream-sam";
import { predictJeeRank, type JeeRankResult } from "@/lib/jee-rank.functions";
import ChapterChecklist from "@/components/samsta/ChapterChecklist";
import ExamCountdownPlans from "@/components/samsta/ExamCountdownPlans";
import ToolWorkspace from "@/components/samsta/ToolWorkspace";
import CoachingClasses from "@/components/samsta/CoachingClasses";
import SamSuggest from "@/components/samsta/SamSuggest";
import FormulaLibrary from "@/components/samsta/FormulaLibrary";
import VideoLibrary from "@/components/samsta/jee/VideoLibrary";
import { TOOLS, G_BLUE, G_GREEN, G_AMBER, G_PINK, G_VIOLET, type ToolDef } from "@/lib/jee-tools";



export const Route = createFileRoute("/education/jee/$toolKey")({
  component: JeeToolPage,
  head: ({ params }) => {
    const t = TOOLS[params.toolKey as keyof typeof TOOLS];
    const title = t ? `${t.title} · IIT JEE · Samsta Academy` : "IIT JEE Tool";
    return {
      meta: [
        { title },
        { name: "description", content: t?.hint ?? "Premium powered IIT JEE prep tool" },
      ],
    };
  },
});



function safeDecode(v: string) { try { return decodeURIComponent(v); } catch { return v; } }

const FORMULA_SECTIONS: { tab: string; label: string; hint: string }[] = [
  { tab: "physics", label: "Physics Formulas Master", hint: "Only Physics chapters · 5-page sheets" },
  { tab: "chemistry", label: "Chemistry Formulas Master", hint: "Only Chemistry chapters · 5-page sheets" },
  { tab: "maths", label: "Maths Formulas Master", hint: "Only Maths chapters · 5-page sheets" },
  { tab: "search", label: "Search a Formula", hint: "Search inside a chosen subject" },
  { tab: "flashcards", label: "Flashcards", hint: "Subject + chapter scoped cards" },
  { tab: "favourites", label: "Favourite Formulas", hint: "Everything you starred" },
  { tab: "export", label: "PDF Export", hint: "Printable formula book" },
];

function JeeToolPage() {
  const { toolKey } = Route.useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const tool = TOOLS[toolKey];
  const [sheet, setSheet] = useState<{ title: string; prompt: string } | null>(null);
  const [libTab, setLibTab] = useState<string>("physics");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);
  if (loading || !user) return null;

  if (!tool) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-lg font-display italic mb-2">Tool not found</div>
          <Link to="/education/$catKey" params={{ catKey: "jee" }} className="text-primary underline text-sm">Back to IIT JEE</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{
      background: "radial-gradient(1000px 600px at 10% -10%, oklch(0.94 0.06 260 / 0.55), transparent 60%), radial-gradient(800px 500px at 100% 0%, oklch(0.93 0.07 20 / 0.5), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/education/$catKey" params={{ catKey: "jee" }} aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">IIT JEE</div>
          <div className="font-display text-lg italic leading-tight truncate">{tool.title}</div>
        </div>
        <div className="glass rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Premium
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-3">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="absolute -right-20 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl animate-aurora" style={{ background: tool.gradient }} />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg animate-orb text-2xl" style={{ background: tool.gradient }}>
              <tool.Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Tool</div>
              <div className="font-display italic text-xl leading-tight truncate">{tool.title}</div>
              <div className="text-[11px] text-muted-foreground truncate">{tool.hint}</div>
            </div>
          </div>
          <p className="relative mt-4 text-[13px] text-foreground/80 leading-relaxed">{tool.intro}</p>
        </div>
      </section>

      {/* Custom module (rank predictor) */}
      {tool.custom === "rank-predictor" && <RankPredictorPanel />}
      {toolKey === "chapter-progress" && <ChapterChecklist />}
      {toolKey === "exam-countdown" && (
        <ExamCountdownPlans onOpen={(title, prompt) => setSheet({ title, prompt })} />
      )}
      {toolKey === "coaching-classes" && <CoachingClasses />}
      {toolKey === "concept-videos" && (
        <VideoLibrary onOpen={(title, prompt) => setSheet({ title, prompt })} />
      )}
      {toolKey === "sam-suggest" && (
        <SamSuggest onOpen={(title, prompt) => setSheet({ title, prompt })} />
      )}
      {toolKey === "formulas" && (
        <div className="px-4">
          <div id="formula-studio">
            <FormulaLibrary
              tab={libTab}
              onTabChange={setLibTab}
              onOpen={(title, prompt) => setSheet({ title, prompt })}
            />
          </div>
        </div>
      )}


      {/* Feature grid */}
      {toolKey === "formulas" && (
        <section className="px-4 mt-5">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="font-display italic text-lg">Everything inside</div>
            <span className="text-[10px] text-muted-foreground">{FORMULA_SECTIONS.length} sections</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {FORMULA_SECTIONS.map((f) => (
              <button
                key={f.tab}
                onClick={() => {
                  setLibTab(f.tab);
                  document.getElementById("formula-studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="glass group relative overflow-hidden rounded-2xl p-3 text-left transition-transform active:scale-[0.97]"
              >
                <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: tool.gradient }} />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md mb-2" style={{ background: tool.gradient }}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="relative font-medium text-[12.5px] leading-tight">{f.label}</div>
                <div className="relative mt-1 text-[10px] text-muted-foreground leading-tight">{f.hint}</div>
                <div className="relative mt-2 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider rounded-full bg-foreground/10 px-1.5 py-0.5">Open</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {toolKey !== "chapter-progress" && toolKey !== "exam-countdown" && toolKey !== "formulas" && tool.features.length > 0 && (
        <section className="px-4 mt-5">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="font-display italic text-lg">Everything inside</div>
            <span className="text-[10px] text-muted-foreground">{tool.features.length} features</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {tool.features.map((f) => (
              <button
                key={f.label}
                onClick={() => setSheet({ title: `${f.label} · ${tool.title}`, prompt: f.prompt })}
                className="glass group relative overflow-hidden rounded-2xl p-3 text-left transition-transform active:scale-[0.97]"
              >
                <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: tool.gradient }} />
                <div className="relative flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md mb-2" style={{ background: tool.gradient }}>
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="relative font-medium text-[12.5px] leading-tight">{f.label}</div>
                <div className="relative mt-2 flex items-center justify-between">
                  <span className="text-[9px] uppercase tracking-wider rounded-full bg-foreground/10 px-1.5 py-0.5"></span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Notes · Saved · Links for every category */}
      <ToolWorkspace toolKey={toolKey} toolTitle={tool.title} gradient={tool.gradient} />

      {sheet && <SamSheet title={sheet.title} prompt={sheet.prompt} onClose={() => setSheet(null)} />}
    </div>
  );
}

function SamSheet({ title, prompt, onClose }: { title: string; prompt: string; onClose: () => void }) {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    (async () => {
      try {
        await streamSam("chat", [{ role: "user", content: `You are Sam, an elite IIT JEE tutor. ${prompt}` }], (a) => setOut(a), ctrl.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") setOut(`Sam couldn't finish: ${e?.message || "error"}`);
      } finally { setLoading(false); }
    })();
    return () => ctrl.abort();
  }, [prompt]);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl pb-8 pt-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60 backdrop-blur"><X className="h-4 w-4" /></button>
        <div className="px-5 pb-2">
          <div className="font-display italic text-lg leading-tight truncate">{title}</div>
          <div className="text-[11px] text-muted-foreground">Powered by Sam </div>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-2">
          {!out && loading && (
            <div className="space-y-2 py-2">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Sam is preparing your answer…
              </div>
              {[92, 78, 88, 60, 82, 55].map((w, i) => (
                <div key={i} className="h-3 rounded-full bg-foreground/10 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          )}
          {out && (
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
              {out}{loading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── Rank Predictor ───────────────────────────
function RankPredictorPanel() {
  const call = useServerFn(predictJeeRank);
  const [exam, setExam] = useState<"main" | "advanced">("main");
  const [scoreType, setScoreType] = useState<"marks" | "percentile">("marks");
  const [score, setScore] = useState("");
  const [category, setCategory] = useState<"General" | "OBC" | "EWS" | "SC" | "ST" | "PwD">("General");
  const [gender, setGender] = useState<"Male" | "Female">("Male");
  const [homeState, setHomeState] = useState("Gujarat");
  const [attempt, setAttempt] = useState(1);
  const [pdf, setPdf] = useState<{ name: string; base64: string; size: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<JeeRankResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPickPdf = async (f: File | null) => {
    if (!f) return;
    if (f.size > 12 * 1024 * 1024) { toast.error("PDF too large (max 12 MB)"); return; }
    if (!/pdf$/i.test(f.type)) { toast.error("Upload a PDF file"); return; }
    const buf = await f.arrayBuffer();
    let bin = ""; const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk) as any);
    const base64 = btoa(bin);
    setPdf({ name: f.name, base64, size: f.size });
    toast.success(`Paper attached · ${(f.size / 1024).toFixed(0)} KB`);
  };

  const submit = async () => {
    const n = Number(score);
    if (!Number.isFinite(n) || n <= 0) { toast.error("Enter a valid score"); return; }
    setBusy(true); setResult(null);
    try {
      const r = await call({ data: {
        exam, score: n, scoreType, category, gender, homeState, attempt,
        pdfBase64: pdf?.base64, pdfName: pdf?.name,
      }});
      setResult(r);
      toast.success("Rank predicted");
    } catch (e: any) {
      toast.error(e?.message || "Prediction failed");
    } finally { setBusy(false); }
  };

  const savePrediction = () => {
    if (!result) return;
    try {
      const key = "samsta:jee-rank-history";
      const prev = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [{ id: crypto.randomUUID(), at: Date.now(), payload: result }, ...prev].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(next));
      toast.success("Saved to your predictions");
    } catch { toast.error("Couldn't save"); }
  };

  return (
    <section className="px-4 mt-4">
      <div className="glass-strong rounded-3xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl text-white shadow" style={{ background: G_AMBER }}>
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display italic text-lg leading-tight">Enter your details</div>
            <div className="text-[11px] text-muted-foreground"> predicts AIR, category rank, and colleges</div>
          </div>
        </div>

        {/* Exam toggle */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["main", "advanced"] as const).map((e) => (
            <button key={e} onClick={() => setExam(e)}
              className={`rounded-full py-2 text-[12px] font-semibold ${exam === e ? "text-white shadow" : "glass"}`}
              style={exam === e ? { background: G_AMBER } : undefined}>
              JEE {e === "main" ? "Main" : "Advanced"}
            </button>
          ))}
        </div>

        {/* Score + type */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <input value={score} onChange={(e) => setScore(e.target.value)} inputMode="decimal"
            placeholder={scoreType === "marks" ? (exam === "main" ? "Marks / 300" : "Marks / 360") : "Percentile"}
            className="col-span-2 rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <select value={scoreType} onChange={(e) => setScoreType(e.target.value as any)}
            className="rounded-2xl border border-foreground/10 bg-background/60 px-2 py-2 text-sm outline-none">
            <option value="marks">Marks</option>
            <option value="percentile">Percentile</option>
          </select>
        </div>

        {/* Category/gender/state/attempt */}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value as any)}
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm outline-none">
            {["General","OBC","EWS","SC","ST","PwD"].map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={gender} onChange={(e) => setGender(e.target.value as any)}
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm outline-none">
            <option>Male</option><option>Female</option>
          </select>
          <input value={homeState} onChange={(e) => setHomeState(e.target.value)} placeholder="Home state"
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm outline-none" />
          <select value={attempt} onChange={(e) => setAttempt(Number(e.target.value))}
            className="rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-sm outline-none">
            <option value={1}>Attempt 1</option><option value={2}>Attempt 2</option><option value={3}>Attempt 3</option>
          </select>
        </div>

        {/* PDF upload */}
        <div className="mt-3">
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
            onChange={(e) => onPickPdf(e.target.files?.[0] ?? null)} />
          {!pdf ? (
            <button onClick={() => fileRef.current?.click()}
              className="glass w-full rounded-2xl py-3 flex items-center justify-center gap-2 text-[12.5px] font-medium">
              <Upload className="h-4 w-4" /> Upload question paper PDF (optional)
            </button>
          ) : (
            <div className="glass rounded-2xl px-3 py-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-medium truncate">{pdf.name}</div>
                <div className="text-[10px] text-muted-foreground">{(pdf.size/1024).toFixed(0)} KB — Sam will analyse difficulty vs previous years</div>
              </div>
              <button onClick={() => setPdf(null)} className="text-muted-foreground hover:text-foreground"><Trash2 className="h-4 w-4" /></button>
            </div>
          )}
        </div>

        <button onClick={submit} disabled={busy}
          className="mt-3 w-full rounded-full py-3 text-sm font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
          style={{ background: G_AMBER }}>
          {busy ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Predicting…</span>
                : <span className="inline-flex items-center gap-2"><Rocket className="h-4 w-4" /> Predict my rank</span>}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="glass-strong rounded-3xl p-5 mt-3 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Prediction</div>
              <div className="font-display italic text-lg">{result.verdict}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Confidence</div>
              <div className="font-display italic text-xl">{result.confidence}%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Predicted AIR" value={`${result.predictedAIR.low.toLocaleString()} – ${result.predictedAIR.high.toLocaleString()}`} tint={G_AMBER} />
            <StatCard label="Category Rank" value={`${result.categoryRank.low.toLocaleString()} – ${result.categoryRank.high.toLocaleString()}`} tint={G_BLUE} />
            <StatCard label="Percentile" value={`${result.percentile.toFixed(2)}`} tint={G_GREEN} />
            {result.paperDifficulty && <StatCard label="Paper Difficulty" value={result.paperDifficulty} tint={G_PINK} />}
          </div>

          {result.paperInsight && (
            <div className="mt-3 rounded-2xl bg-background/50 border border-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Paper insight</div>
              <p className="text-[12.5px] leading-relaxed text-foreground/85">{result.paperInsight}</p>
            </div>
          )}

          {result.historicalTrend.length > 0 && (
            <div className="mt-3">
              <div className="font-display italic text-base mb-1">Previous year trends</div>
              <ul className="space-y-1">
                {result.historicalTrend.map((t, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-foreground/85"><span className="text-primary">•</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          )}

          {result.topColleges.length > 0 && (
            <div className="mt-3">
              <div className="font-display italic text-base mb-1">Likely colleges</div>
              <div className="space-y-2">
                {result.topColleges.map((c, i) => (
                  <div key={i} className="glass rounded-2xl p-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow" style={{ background: G_AMBER }}>
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium leading-tight truncate">{c.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{c.branch}</div>
                    </div>
                    <div className={`text-[10px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 ${
                      /high/i.test(c.chance) ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                      : /mod/i.test(c.chance) ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      : "bg-rose-500/15 text-rose-700 dark:text-rose-300"}`}>{c.chance}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.improvementPlan.length > 0 && (
            <div className="mt-3">
              <div className="font-display italic text-base mb-1">Improvement plan</div>
              <ul className="space-y-1">
                {result.improvementPlan.map((t, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-foreground/85"><span className="text-primary">✓</span><span>{t}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button onClick={savePrediction} className="glass flex-1 rounded-full py-2.5 text-[12.5px] font-semibold flex items-center justify-center gap-1.5">
              <Save className="h-4 w-4" /> Save prediction
            </button>
            <button onClick={submit} className="rounded-full py-2.5 px-4 text-[12.5px] font-semibold text-white shadow" style={{ background: G_AMBER }}>
              <RefreshCw className="h-4 w-4 inline mr-1" /> Retry
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-foreground/10 bg-background/50 p-3">
      <div aria-hidden className="absolute -right-4 -top-4 h-14 w-14 rounded-full opacity-40 blur-2xl" style={{ background: tint }} />
      <div className="relative text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="relative font-display italic text-lg leading-tight">{value}</div>
    </div>
  );
}