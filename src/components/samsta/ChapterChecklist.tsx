import { useEffect, useMemo, useState } from "react";
import { Check, Search, Star, Save, RotateCcw, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";

type Subject = {
  key: "physics" | "chemistry" | "maths";
  name: string;
  emoji: string;
  icon: string;
  gradient: string;
  classes: { label: string; chapters: string[] }[];
};

const SUBJECTS: Subject[] = [
  {
    key: "physics",
    name: "Physics",
    emoji: "⚛️",
    icon: "🟦",
    gradient: "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.72 0.14 280))",
    classes: [
      {
        label: "Class 11",
        chapters: [
          "Physical World",
          "Units and Measurements",
          "Motion in a Straight Line",
          "Motion in a Plane",
          "Laws of Motion",
          "Work, Energy and Power",
          "System of Particles and Rotational Motion",
          "Gravitation",
          "Mechanical Properties of Solids",
          "Mechanical Properties of Fluids",
          "Thermal Properties of Matter",
          "Thermodynamics",
          "Kinetic Theory",
          "Oscillations",
          "Waves",
        ],
      },
      {
        label: "Class 12",
        chapters: [
          "Electric Charges and Fields",
          "Electrostatic Potential and Capacitance",
          "Current Electricity",
          "Moving Charges and Magnetism",
          "Magnetism and Matter",
          "Electromagnetic Induction",
          "Alternating Current",
          "Electromagnetic Waves",
          "Ray Optics and Optical Instruments",
          "Wave Optics",
          "Dual Nature of Radiation and Matter",
          "Atoms",
          "Nuclei",
          "Semiconductor Electronics",
        ],
      },
    ],
  },
  {
    key: "chemistry",
    name: "Chemistry",
    emoji: "🧪",
    icon: "🟩",
    gradient: "linear-gradient(135deg, oklch(0.80 0.13 150), oklch(0.72 0.15 130))",
    classes: [
      {
        label: "Class 11",
        chapters: [
          "Some Basic Concepts of Chemistry",
          "Structure of Atom",
          "Classification of Elements and Periodicity",
          "Chemical Bonding and Molecular Structure",
          "States of Matter",
          "Thermodynamics",
          "Equilibrium",
          "Redox Reactions",
          "Hydrogen",
          "The s-Block Elements",
          "The p-Block Elements",
          "Organic Chemistry – Some Basic Principles",
          "Hydrocarbons",
          "Environmental Chemistry",
        ],
      },
      {
        label: "Class 12",
        chapters: [
          "Solutions",
          "Electrochemistry",
          "Chemical Kinetics",
          "d- and f-Block Elements",
          "Coordination Compounds",
          "Haloalkanes and Haloarenes",
          "Alcohols, Phenols and Ethers",
          "Aldehydes, Ketones and Carboxylic Acids",
          "Amines",
          "Biomolecules",
          "Polymers",
          "Chemistry in Everyday Life",
          "Surface Chemistry",
          "General Principles and Processes of Isolation of Elements",
          "Solid State",
          "p-Block Elements",
        ],
      },
    ],
  },
  {
    key: "maths",
    name: "Mathematics",
    emoji: "📐",
    icon: "🟨",
    gradient: "linear-gradient(135deg, oklch(0.86 0.14 80), oklch(0.78 0.16 60))",
    classes: [
      {
        label: "Class 11",
        chapters: [
          "Sets",
          "Relations and Functions",
          "Trigonometric Functions",
          "Principle of Mathematical Induction",
          "Complex Numbers and Quadratic Equations",
          "Linear Inequalities",
          "Permutations and Combinations",
          "Binomial Theorem",
          "Sequences and Series",
          "Straight Lines",
          "Conic Sections",
          "Introduction to Three-Dimensional Geometry",
          "Limits and Derivatives",
          "Mathematical Reasoning",
          "Statistics",
          "Probability",
        ],
      },
      {
        label: "Class 12",
        chapters: [
          "Relations and Functions",
          "Inverse Trigonometric Functions",
          "Matrices",
          "Determinants",
          "Continuity and Differentiability",
          "Application of Derivatives",
          "Integrals",
          "Application of Integrals",
          "Differential Equations",
          "Vector Algebra",
          "Three-Dimensional Geometry",
          "Linear Programming",
          "Probability",
        ],
      },
    ],
  },
];

const idOf = (s: Subject, cls: string, ch: string) => `${s.key}|${cls}|${ch}`;
const ALL_IDS = SUBJECTS.flatMap((s) => s.classes.flatMap((c) => c.chapters.map((ch) => idOf(s, c.label, ch))));
const TOTAL = ALL_IDS.length;

const SEL_KEY = "samsta.jee.chapters.selected";
const FAV_KEY = "samsta.jee.chapters.fav";

function useStoredSet(key: string) {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setSet(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, [key]);
  const save = (next: Set<string>) => {
    setSet(next);
    try { localStorage.setItem(key, JSON.stringify([...next])); } catch { /* ignore */ }
  };
  return [set, save] as const;
}

function Box({ checked, partial }: { checked: boolean; partial?: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[7px] border transition-all ${
        checked || partial ? "border-transparent text-white shadow-sm" : "border-foreground/25"
      }`}
      style={checked || partial ? { background: "linear-gradient(135deg, oklch(0.72 0.16 265), oklch(0.66 0.18 295))" } : undefined}
    >
      {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : partial ? <span className="h-0.5 w-2.5 rounded-full bg-white" /> : null}
    </span>
  );
}

export default function ChapterChecklist() {
  const [selected, setSelected] = useStoredSet(SEL_KEY);
  const [favs, setFavs] = useStoredSet(FAV_KEY);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({ physics: true, chemistry: false, maths: false });

  const query = q.trim().toLowerCase();

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const toggleFav = (id: string) => {
    const next = new Set(favs);
    next.has(id) ? next.delete(id) : next.add(id);
    setFavs(next);
  };
  const setMany = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    ids.forEach((i) => (on ? next.add(i) : next.delete(i)));
    setSelected(next);
  };

  const subjectIds = useMemo(
    () => Object.fromEntries(SUBJECTS.map((s) => [s.key, s.classes.flatMap((c) => c.chapters.map((ch) => idOf(s, c.label, ch)))])) as Record<string, string[]>,
    [],
  );

  const pct = Math.round((selected.size / TOTAL) * 100);

  return (
    <section className="px-4 mt-5">
      <div className="glass-strong rounded-3xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-display italic text-lg leading-tight">📚 Chapter Checklist</div>
            <div className="text-[11px] text-muted-foreground">Class 11 + 12 · NCERT full syllabus</div>
          </div>
          <div className="text-right">
            <div className="font-display text-xl leading-none">{selected.size}<span className="text-muted-foreground text-sm">/{TOTAL}</span></div>
            <div className="text-[10px] text-muted-foreground">chapters</div>
          </div>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg, oklch(0.72 0.16 265), oklch(0.66 0.18 295))" }} />
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search chapter…"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {SUBJECTS.map((s) => {
          const ids = subjectIds[s.key];
          const selCount = ids.filter((i) => selected.has(i)).length;
          const allOn = selCount === ids.length;
          const sPct = Math.round((selCount / ids.length) * 100);
          const isOpen = query ? true : !!open[s.key];
          const visibleClasses = s.classes
            .map((c) => ({ ...c, chapters: c.chapters.filter((ch) => !query || ch.toLowerCase().includes(query)) }))
            .filter((c) => c.chapters.length > 0);
          if (query && visibleClasses.length === 0) return null;

          return (
            <div key={s.key} className="glass overflow-hidden rounded-3xl">
              <div className="flex items-center gap-3 p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-lg text-white shadow-md" style={{ background: s.gradient }}>
                  {s.emoji}
                </div>
                <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => ({ ...o, [s.key]: !o[s.key] }))}>
                  <div className="font-display italic text-base leading-tight">{s.icon} {s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{selCount} / {ids.length} selected · {sPct}%</div>
                </button>
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>

              <div className="px-4 pb-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/10">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sPct}%`, background: s.gradient }} />
                </div>
              </div>

              {isOpen && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => setMany(ids, !allOn)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors active:bg-foreground/5"
                  >
                    <Box checked={allOn} partial={!allOn && selCount > 0} />
                    <span className="text-[13px] font-semibold">Select All Chapters</span>
                  </button>

                  {visibleClasses.map((c) => {
                    const cIds = c.chapters.map((ch) => idOf(s, c.label, ch));
                    const cSel = cIds.filter((i) => selected.has(i)).length;
                    return (
                      <div key={c.label} className="mt-1">
                        <button
                          onClick={() => setMany(cIds, cSel !== cIds.length)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
                        >
                          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{c.label}</span>
                          <span className="text-[10px] text-muted-foreground">· {cSel}/{cIds.length}</span>
                        </button>
                        {c.chapters.map((ch) => {
                          const id = idOf(s, c.label, ch);
                          const on = selected.has(id);
                          return (
                            <div key={id} className="flex items-center gap-2 rounded-2xl px-3 py-2 transition-colors active:bg-foreground/5">
                              <button onClick={() => toggle(id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                                <Box checked={on} />
                                <span className={`text-[13px] leading-snug ${on ? "text-foreground" : "text-foreground/80"}`}>{ch}</span>
                              </button>
                              <button onClick={() => toggleFav(id)} aria-label="Favourite chapter" className="p-1">
                                <Star className={`h-4 w-4 ${favs.has(id) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/50"}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-3 z-20 mt-4">
        <div className="glass-strong grid grid-cols-2 gap-2 rounded-3xl p-3">
          <button
            onClick={() => { setSelected(new Set(ALL_IDS)); toast.success("All subjects selected"); }}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-foreground/8 px-3 py-2.5 text-[12.5px] font-semibold active:scale-[0.98]"
          >
            <RotateCcw className="h-4 w-4" /> Select All Subjects
          </button>
          <button
            onClick={() => { setSelected(new Set()); toast("Selection cleared"); }}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-foreground/8 px-3 py-2.5 text-[12.5px] font-semibold active:scale-[0.98]"
          >
            Deselect All
          </button>
          <button
            onClick={() => toast.success(`Saved · ${selected.size}/${TOTAL} chapters`)}
            className="col-span-2 flex items-center justify-center gap-2 rounded-2xl py-3 text-[13px] font-semibold text-white shadow-lg active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.16 265), oklch(0.66 0.18 295))" }}
          >
            <Save className="h-4 w-4" /> Save Selection · {selected.size}/{TOTAL}
          </button>
        </div>
      </div>
    </section>
  );
}
