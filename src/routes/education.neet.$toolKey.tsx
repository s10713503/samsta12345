// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Loader2, X, ChevronRight } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { streamSam } from "@/lib/stream-sam";
import ExamCountdownPlans from "@/components/samsta/ExamCountdownPlans";
import ToolWorkspace from "@/components/samsta/ToolWorkspace";
import CoachingClasses from "@/components/samsta/CoachingClasses";
import FormulaLibrary from "@/components/samsta/FormulaLibrary";
import VideoLibrary from "@/components/samsta/jee/VideoLibrary";
import { TOOLS } from "@/lib/neet-tools";

export const Route = createFileRoute("/education/neet/$toolKey")({
  component: NeetToolPage,
  head: ({ params }) => {
    const t = TOOLS[params.toolKey as keyof typeof TOOLS];
    const title = t ? `${t.title} · NEET · Samsta Academy` : "NEET Tool · Samsta Academy";
    const description = t?.hint ?? "Premium powered NEET prep tool— Physics, Chemistry, Biology.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

const FORMULA_SECTIONS = [
  { tab: "physics", label: "Physics Formulas Master", hint: "Only Physics chapters · 5-page sheets" },
  { tab: "chemistry", label: "Chemistry Formulas Master", hint: "Only Chemistry chapters · 5-page sheets" },
  { tab: "biology", label: "Biology Concepts Master", hint: "Class 11 + 12 Biology · 5-page sheets" },
  { tab: "search", label: "Search a Formula", hint: "Search inside a chosen subject" },
  { tab: "flashcards", label: "Flashcards", hint: "Subject + chapter scoped cards" },
  { tab: "favourites", label: "Favourite Formulas", hint: "Everything you starred" },
  { tab: "export", label: "PDF Export", hint: "Printable formula book" },
];

function NeetToolPage() {
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
          <Link to="/education/$catKey" params={{ catKey: "neet" }} className="text-primary underline text-sm">Back to NEET</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{
      background: "radial-gradient(1000px 600px at 10% -10%, oklch(0.94 0.06 150 / 0.55), transparent 60%), radial-gradient(800px 500px at 100% 0%, oklch(0.93 0.07 120 / 0.5), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/education/$catKey" params={{ catKey: "neet" }} aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">NEET</div>
          <h1 className="font-display text-lg italic leading-tight truncate">{tool.title}</h1>
        </div>
        <div className="glass rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Premium
        </div>
      </header>

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

      {toolKey === "exam-countdown" && (
        <ExamCountdownPlans onOpen={(title, prompt) => setSheet({ title, prompt })} />
      )}
      {toolKey === "coaching-classes" && <CoachingClasses />}
      {toolKey === "concept-videos" && (
        <VideoLibrary exam="neet" onOpen={(title, prompt) => setSheet({ title, prompt })} />
      )}
      {toolKey === "formulas" && (
        <div className="px-4">
          <div id="formula-studio">
            <FormulaLibrary
              exam="neet"
              tab={libTab}
              onTabChange={setLibTab}
              onOpen={(title, prompt) => setSheet({ title, prompt })}
            />
          </div>
        </div>
      )}

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

      {toolKey !== "exam-countdown" && toolKey !== "formulas" && tool.features.length > 0 && (
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

      <ToolWorkspace toolKey={`neet-${toolKey}`} toolTitle={tool.title} gradient={tool.gradient} />

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
        await streamSam("chat", [{ role: "user", content: `You are Sam, an elite NEET tutor (Physics, Chemistry, Biology). ${prompt}` }], (a) => setOut(a), ctrl.signal);
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
