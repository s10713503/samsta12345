// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles, Youtube, Check, Gauge, Wand2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type Level = 0 | 1 | 2; // 0 = weak, 1 = average, 2 = strong

const SUBJECTS: Record<string, { g: string; topics: string[] }> = {
  Physics: {
    g: "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.72 0.14 280))",
    topics: [
      "Kinematics", "Laws of Motion", "Work Power Energy", "Rotational Motion", "Gravitation",
      "SHM & Waves", "Thermodynamics", "Kinetic Theory", "Electrostatics", "Current Electricity",
      "Magnetism & EMI", "AC & EM Waves", "Ray Optics", "Wave Optics", "Modern Physics", "Semiconductors",
    ],
  },
  Chemistry: {
    g: "linear-gradient(135deg, oklch(0.80 0.13 150), oklch(0.72 0.15 130))",
    topics: [
      "Mole Concept", "Atomic Structure", "Chemical Bonding", "Thermodynamics (Chem)", "Equilibrium",
      "Electrochemistry", "Chemical Kinetics", "Solutions", "p-Block", "d & f Block",
      "Coordination Compounds", "GOC", "Hydrocarbons", "Haloalkanes & Alcohols", "Aldehydes & Ketones",
      "Amines & Biomolecules",
    ],
  },
  Mathematics: {
    g: "linear-gradient(135deg, oklch(0.82 0.13 340), oklch(0.75 0.15 320))",
    topics: [
      "Quadratic Equations", "Sequences & Series", "Complex Numbers", "Binomial Theorem", "Permutation & Combination",
      "Matrices & Determinants", "Trigonometry", "Inverse Trigonometry", "Straight Lines", "Circles",
      "Conic Sections", "Functions & Limits", "Continuity & Differentiability", "Application of Derivatives",
      "Integration", "Definite Integrals & Area", "Differential Equations", "Vectors & 3D", "Probability", "Statistics",
    ],
  },
};

const KEY = "samsta:jee:sam-suggest";

function ytSearch(q: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

/**
 * Sam Suggest — analyses weak sub-topics across Physics / Chemistry / Maths,
 * then advises what to study and generates the exact YouTube searches to watch.
 */
export default function SamSuggest({ onOpen }: { onOpen: (title: string, prompt: string) => void }) {
  const [subject, setSubject] = useState<keyof typeof SUBJECTS>("Physics");
  const [levels, setLevels] = useState<Record<string, Level>>({});

  useEffect(() => {
    try { setLevels(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { /* noop */ }
  }, []);

  const set = (topic: string, lv: Level) => {
    setLevels((prev) => {
      const next = { ...prev, [topic]: lv };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  };

  const weakAll = useMemo(
    () => Object.entries(levels).filter(([, v]) => v === 0).map(([k]) => k),
    [levels],
  );
  const rated = Object.keys(levels).length;
  const totalTopics = Object.values(SUBJECTS).reduce((n, s) => n + s.topics.length, 0);

  const analyse = () => {
    if (!weakAll.length) { toast.error("Mark at least one weak topic"); return; }
    const strong = Object.entries(levels).filter(([, v]) => v === 2).map(([k]) => k);
    onOpen(
      "Sam Suggest · Weakness analysis",
      `You are Sam, an elite IIT JEE mentor. The student marked these sub-topics WEAK: ${weakAll.join(", ")}.` +
      (strong.length ? ` Strong: ${strong.join(", ")}.` : "") +
      ` Do a full diagnosis: 1) group the weak topics by root cause (concept gap, formula recall, problem-solving speed, or lack of practice), 2) rank them by JEE weightage × ROI, 3) for the top 8, give exactly what knowledge is missing and the fix in 2 lines each, 4) give a 21-day repair schedule with daily blocks, 5) list the best YouTube search queries and well-known Indian JEE channels (Physics Wallah, Unacademy JEE, Vedantu JEE, NV Sir, Pahul Sir, Neha Agrawal, etc.) for each weak topic with why that video helps, 6) end with 5 must-solve PYQ patterns. Be specific, no filler.`,
    );
  };

  const videoPlan = () => {
    if (!weakAll.length) { toast.error("Mark at least one weak topic"); return; }
    onOpen(
      "Sam Suggest · YouTube watch plan",
      `You are Sam. For these weak IIT JEE sub-topics: ${weakAll.join(", ")} — build a YouTube watch plan. For EACH topic give: the single most important lecture to watch first (channel + likely title), a one-line reason, an estimated watch time, the exact YouTube search query to use, and what to practise immediately after watching. Order the plan so the highest-weightage gaps are closed first. Finish with a 7-day watch calendar.`,
    );
  };

  const s = SUBJECTS[subject];

  return (
    <section className="px-4 mt-5">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-3xl animate-aurora" style={{ background: s.g }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg animate-orb" style={{ background: s.g }}>
            <Brain className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display italic text-xl leading-tight">Sam Suggest</div>
            <div className="text-[11px] text-muted-foreground">Rate your sub-topics — Sam finds the gaps and the videos</div>
          </div>
        </div>

        <div className="relative mt-4 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{rated}/{totalTopics} rated</span>
          <span className="font-semibold text-foreground">{weakAll.length} weak</span>
        </div>
        <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${(rated / totalTopics) * 100}%`, background: s.g }} />
        </div>

        <div className="relative mt-3 grid grid-cols-3 gap-1 rounded-full bg-foreground/5 p-1">
          {Object.keys(SUBJECTS).map((k) => (
            <button key={k} onClick={() => setSubject(k as any)}
              className={`rounded-full py-1.5 text-[11.5px] font-semibold ${subject === k ? "text-white shadow" : "text-muted-foreground"}`}
              style={subject === k ? { background: SUBJECTS[k].g } : undefined}>{k}</button>
          ))}
        </div>
      </div>

      {/* Topic rating */}
      <div className="mt-3 space-y-2">
        {s.topics.map((t, i) => {
          const lv = levels[t];
          return (
            <div key={t} className="glass flex items-center gap-2 rounded-2xl p-2.5 animate-fade-up" style={{ animationDelay: `${i * 25}ms` }}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium">{t}</div>
                {lv === 0 && <div className="text-[10px] text-rose-500">Weak — Sam will fix this</div>}
              </div>
              <div className="flex gap-1">
                {([[0, "Weak"], [1, "OK"], [2, "Strong"]] as const).map(([v, label]) => (
                  <button key={v} onClick={() => set(t, v as Level)}
                    className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${lv === v ? "text-white shadow" : "bg-foreground/5 text-muted-foreground"}`}
                    style={lv === v ? { background: v === 0 ? "linear-gradient(135deg,oklch(0.72 0.17 20),oklch(0.65 0.19 10))" : v === 1 ? "linear-gradient(135deg,oklch(0.84 0.14 80),oklch(0.78 0.16 60))" : s.g } : undefined}>
                    {lv === v && v === 2 ? <Check className="inline h-3 w-3" /> : label}
                  </button>
                ))}
              </div>
              <a href={ytSearch(`${t} JEE full concept one shot`)} target="_blank" rel="noreferrer" aria-label="YouTube"
                className="text-red-500/80 hover:text-red-500"><Youtube className="h-4 w-4" /></a>
            </div>
          );
        })}
      </div>

      {/* Weak summary + actions */}
      <div className="glass-strong mt-3 rounded-3xl p-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4" />
          <div className="text-[13px] font-semibold">Your weak zone</div>
        </div>
        {weakAll.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted-foreground">Mark topics as Weak above — Sam then analyses the gap and builds a video plan.</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {weakAll.map((t) => (
              <span key={t} className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-500">{t}</span>
            ))}
          </div>
        )}

        <div className="mt-3 grid gap-2">
          <button onClick={analyse} className="rounded-full py-2.5 text-[12.5px] font-semibold text-white shadow active:scale-[0.98]" style={{ background: s.g }}>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Analyse my weak topics</span>
          </button>
          <button onClick={videoPlan} className="glass rounded-full py-2.5 text-[12.5px] font-semibold active:scale-[0.98]">
            <span className="inline-flex items-center gap-1.5"><Wand2 className="h-4 w-4" /> Generate YouTube watch plan</span>
          </button>
          {weakAll.length > 0 && (
            <a href={ytSearch(`${weakAll.slice(0, 3).join(" ")} JEE one shot revision`)} target="_blank" rel="noreferrer"
              className="glass flex items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-semibold">
              <Youtube className="h-4 w-4 text-red-500" /> Open YouTube for top 3 gaps <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
