// Coaching video library (IIT JEE / NEET): institutes, chapter tree, lecture types + local library state.
export type Subject = "Physics" | "Chemistry" | "Mathematics" | "Biology";
export type Cls = 11 | 12;
export type Exam = "jee" | "neet";

export type Institute = { key: string; name: string; short: string; tag: string };

export const INSTITUTES: Institute[] = [
  { key: "allen", name: "ALLEN Career Institute", short: "ALLEN", tag: "Kota classics" },
  { key: "fiitjee", name: "FIITJEE", short: "FIITJEE", tag: "Advanced depth" },
  { key: "aakash", name: "Aakash Institute", short: "Aakash", tag: "Concept first" },
  { key: "resonance", name: "Resonance", short: "Resonance", tag: "Sheet culture" },
  { key: "motion", name: "Motion Education", short: "Motion", tag: "Kota faculty" },
  { key: "pw", name: "Physics Wallah (PW)", short: "PW", tag: "Hinglish king" },
  { key: "vmc", name: "Vidyamandir Classes (VMC)", short: "VMC", tag: "Delhi rigour" },
  { key: "narayana", name: "Narayana", short: "Narayana", tag: "South pattern" },
  { key: "srichaitanya", name: "Sri Chaitanya", short: "Sri Chaitanya", tag: "Drill heavy" },
  { key: "careerpoint", name: "Career Point", short: "Career Point", tag: "Balanced" },
  { key: "bansal", name: "Bansal Classes", short: "Bansal", tag: "Legacy Kota" },
  { key: "vibrant", name: "Vibrant Academy", short: "Vibrant", tag: "Advanced only" },
  { key: "matrix", name: "Matrix Academy", short: "Matrix", tag: "Kota new-gen" },
  { key: "pace", name: "PACE IIT & Medical", short: "PACE", tag: "Mumbai" },
  { key: "iitianspace", name: "IITIANS PACE", short: "IITIANS PACE", tag: "IITian faculty" },
  { key: "unacademy", name: "Unacademy", short: "Unacademy", tag: "Educator packs" },
  { key: "infinitylearn", name: "Infinity Learn", short: "Infinity Learn", tag: "Sri Chaitanya online" },
  { key: "vedantu", name: "Vedantu", short: "Vedantu", tag: "Live energy" },
  { key: "iquanta", name: "iQuanta", short: "iQuanta", tag: "Concept drills" },
  { key: "esaral", name: "eSaral", short: "eSaral", tag: "Free full course" },
];

export const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Mathematics"];
export const NEET_SUBJECTS: Subject[] = ["Physics", "Chemistry", "Biology"];
export const subjectsFor = (exam: Exam = "jee") => (exam === "neet" ? NEET_SUBJECTS : SUBJECTS);

export const CHAPTERS: Record<Subject, Record<Cls, string[]>> = {
  Physics: {
    11: [
      "Units & Dimensions", "Motion in One Dimension", "Motion in Two Dimensions", "Laws of Motion",
      "Work, Energy & Power", "Circular Motion", "Center of Mass", "Rotational Motion", "Gravitation",
      "Mechanical Properties of Solids", "Mechanical Properties of Fluids", "Thermal Properties of Matter",
      "Thermodynamics", "Kinetic Theory", "Oscillations", "Waves",
    ],
    12: [
      "Electrostatics", "Current Electricity", "Capacitors", "Moving Charges & Magnetism", "Magnetism",
      "Electromagnetic Induction", "Alternating Current", "Electromagnetic Waves", "Ray Optics",
      "Wave Optics", "Dual Nature", "Atoms", "Nuclei", "Semiconductor Electronics", "Communication Systems",
    ],
  },
  Chemistry: {
    11: [
      "Some Basic Concepts", "Structure of Atom", "Periodic Table", "Chemical Bonding", "States of Matter",
      "Thermodynamics", "Equilibrium", "Redox", "Hydrogen", "s-Block", "p-Block", "Organic Chemistry",
      "Hydrocarbons", "Environmental Chemistry",
    ],
    12: [
      "Solid State", "Solutions", "Electrochemistry", "Chemical Kinetics", "Surface Chemistry", "Metallurgy",
      "p-Block", "d & f Block", "Coordination Compounds", "Haloalkanes", "Alcohols", "Aldehydes & Ketones",
      "Amines", "Biomolecules", "Polymers", "Chemistry in Everyday Life",
    ],
  },
  Mathematics: {
    11: [
      "Sets", "Relations & Functions", "Trigonometry", "Complex Numbers", "Quadratic Equations",
      "Permutations & Combinations", "Binomial Theorem", "Sequences & Series", "Straight Line", "Circle",
      "Conic Sections", "Limits", "Statistics", "Probability",
    ],
    12: [
      "Relations & Functions", "Inverse Trigonometric Functions", "Matrices", "Determinants", "Continuity",
      "Differentiability", "Applications of Derivatives", "Integrals", "Differential Equations",
      "Vector Algebra", "3D Geometry", "Linear Programming", "Probability",
    ],
  },
  Biology: {
    11: [
      "The Living World", "Biological Classification", "Plant Kingdom", "Animal Kingdom",
      "Morphology of Flowering Plants", "Anatomy of Flowering Plants", "Structural Organisation in Animals",
      "Cell: The Unit of Life", "Biomolecules", "Cell Cycle and Cell Division", "Transport in Plants",
      "Mineral Nutrition", "Photosynthesis in Higher Plants", "Respiration in Plants",
      "Plant Growth and Development", "Digestion and Absorption", "Breathing and Exchange of Gases",
      "Body Fluids and Circulation", "Excretory Products and Their Elimination", "Locomotion and Movement",
      "Neural Control and Coordination", "Chemical Coordination and Integration",
    ],
    12: [
      "Sexual Reproduction in Flowering Plants", "Human Reproduction", "Reproductive Health",
      "Principles of Inheritance and Variation", "Molecular Basis of Inheritance", "Evolution",
      "Human Health and Disease", "Microbes in Human Welfare", "Biotechnology: Principles and Processes",
      "Biotechnology and Its Applications", "Organisms and Populations", "Ecosystem",
      "Biodiversity and Conservation", "Environmental Issues",
    ],
  },
};

export type VideoCategory = { key: string; label: string; emoji: string; q: string; hint: string };

export const VIDEO_CATEGORIES: VideoCategory[] = [
  { key: "detailed", label: "Detailed Lecture", emoji: "🎓", q: "detailed lecture", hint: "Full concept build-up" },
  { key: "oneshot", label: "One Shot", emoji: "🎯", q: "one shot", hint: "Whole chapter in one go" },
  { key: "quick", label: "Quick Revision", emoji: "⚡", q: "quick revision", hint: "Fast recall pass" },
  { key: "short", label: "Short Lecture", emoji: "⏱️", q: "short lecture 20 minutes", hint: "10–20 min" },
  { key: "marathon", label: "Marathon Revision", emoji: "🏃", q: "marathon revision", hint: "Long-format grind" },
  { key: "pyq", label: "PYQ Discussion", emoji: "📜", q: "PYQ previous year questions", hint: "Past papers solved" },
  { key: "advanced", label: "Advanced Problems", emoji: "🏆", q: "JEE Advanced level problems", hint: "Hard set" },
  { key: "main", label: "JEE Main Practice", emoji: "📘", q: "JEE Main practice questions", hint: "Main pattern" },
  { key: "advpractice", label: "JEE Advanced Practice", emoji: "📕", q: "JEE Advanced practice questions", hint: "Advanced pattern" },
  { key: "formula", label: "Formula Revision", emoji: "📐", q: "formula revision", hint: "Formulas only" },
  { key: "doubt", label: "Doubt Session", emoji: "❓", q: "doubt solving session", hint: "Live doubts" },
  { key: "important", label: "Important Questions", emoji: "⭐", q: "most important questions", hint: "High-yield Qs" },
  { key: "crash", label: "Crash Course", emoji: "🚀", q: "crash course", hint: "Last-mile sprint" },
];

export const NEET_VIDEO_CATEGORIES: VideoCategory[] = VIDEO_CATEGORIES.map((c) => ({
  ...c,
  label: c.label.replace(/JEE Advanced/g, "NEET Advanced").replace(/JEE Main/g, "NEET"),
  q: c.q.replace(/JEE Advanced/g, "NEET tough").replace(/JEE Main/g, "NEET"),
  hint: c.hint.replace(/Main pattern/g, "NEET pattern").replace(/Advanced pattern/g, "NEET hard pattern"),
})).filter((c, i, arr) => arr.findIndex((x) => x.label === c.label) === i);

export const categoriesFor = (exam: Exam = "jee") => (exam === "neet" ? NEET_VIDEO_CATEGORIES : VIDEO_CATEGORIES);

export type Filters = {
  language: "any" | "english" | "hinglish" | "hindi";
  duration: "any" | "short" | "medium" | "long";
  sort: "relevance" | "latest";
  exam: "any" | "main" | "advanced";
  teacher: string;
};

export const DEFAULT_FILTERS: Filters = {
  language: "any", duration: "any", sort: "relevance", exam: "any", teacher: "",
};

export function buildQuery(
  institute: Institute, subject: Subject, cls: Cls, chapter: string, cat: VideoCategory, f: Filters, exam: Exam = "jee",
) {
  const examName = exam === "neet" ? "NEET" : "JEE";
  const bits = [institute.short, chapter, cat.q, subject === "Mathematics" ? "Maths" : subject, `class ${cls}`, examName];
  if (exam === "jee" && f.exam === "main") bits.push("JEE Main");
  if (exam === "jee" && f.exam === "advanced") bits.push("JEE Advanced");
  if (f.language !== "any") bits.push(f.language);
  if (f.duration === "short") bits.push("short");
  if (f.duration === "long") bits.push("full length");
  if (f.teacher.trim()) bits.push(f.teacher.trim());
  return bits.join(" ");
}

export function youtubeSearchUrl(query: string, f: Filters) {
  // sp filters: relevance default; CAI%3D = sort by upload date
  const sp = f.sort === "latest" ? "&sp=CAI%253D" : "";
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}${sp}`;
}

/* ---------------- local library state ---------------- */
const KEY = "samsta.jee.videos.v1";
const keyFor = (exam: Exam = "jee") => (exam === "neet" ? "samsta.neet.videos.v1" : KEY);

export type WatchEntry = {
  id: string;              // institute|subject|cls|chapter|cat
  institute: string;
  subject: Subject;
  cls: Cls;
  chapter: string;
  category: string;
  query: string;
  url: string;
  at: number;
  seconds: number;         // resume timestamp
  done: boolean;
};

export type VideoState = {
  history: WatchEntry[];
  bookmarks: WatchEntry[];
  completed: string[];     // `${subject}|${cls}|${chapter}`
  weak: string[];
  filters: Filters;
};

const EMPTY: VideoState = { history: [], bookmarks: [], completed: [], weak: [], filters: DEFAULT_FILTERS };

export function loadVideoState(exam: Exam = "jee"): VideoState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(keyFor(exam));
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch { return EMPTY; }
}

export function saveVideoState(s: VideoState, exam: Exam = "jee") {
  try { localStorage.setItem(keyFor(exam), JSON.stringify(s)); } catch { /* ignore */ }
}

export const chapterId = (subject: Subject, cls: Cls, chapter: string) => `${subject}|${cls}|${chapter}`;

export function nextChapter(subject: Subject, cls: Cls, chapter: string) {
  const list = CHAPTERS[subject][cls];
  const i = list.indexOf(chapter);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
}

export function searchChapters(term: string, exam: Exam = "jee") {
  const t = term.trim().toLowerCase();
  if (!t) return [] as Array<{ subject: Subject; cls: Cls; chapter: string }>;
  const out: Array<{ subject: Subject; cls: Cls; chapter: string }> = [];
  for (const s of subjectsFor(exam)) for (const c of [11, 12] as Cls[])
    for (const ch of CHAPTERS[s][c]) if (ch.toLowerCase().includes(t)) out.push({ subject: s, cls: c, chapter: ch });
  return out.slice(0, 30);
}
