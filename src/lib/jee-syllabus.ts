// Single source of truth for the JEE Main + Advanced syllabus (Class 11 & 12).
export type SubjectKey = "physics" | "chemistry" | "maths";
export type Weight = "high" | "medium" | "low";
export type Chapter = { name: string; cls: 11 | 12; weight: Weight };

export const SYLLABUS: Record<SubjectKey, { name: string; chapters: Chapter[] }> = {
  physics: {
    name: "Physics",
    chapters: [
      { name: "Units, Dimensions & Measurement", cls: 11, weight: "medium" },
      { name: "Kinematics (1D & 2D)", cls: 11, weight: "high" },
      { name: "Laws of Motion & Friction", cls: 11, weight: "high" },
      { name: "Work, Power & Energy", cls: 11, weight: "high" },
      { name: "Centre of Mass & Collisions", cls: 11, weight: "medium" },
      { name: "Rotational Motion", cls: 11, weight: "high" },
      { name: "Gravitation", cls: 11, weight: "medium" },
      { name: "Mechanical Properties of Solids", cls: 11, weight: "low" },
      { name: "Fluid Mechanics", cls: 11, weight: "medium" },
      { name: "Thermal Properties & Calorimetry", cls: 11, weight: "medium" },
      { name: "Kinetic Theory of Gases", cls: 11, weight: "medium" },
      { name: "Thermodynamics", cls: 11, weight: "high" },
      { name: "Simple Harmonic Motion", cls: 11, weight: "high" },
      { name: "Waves & Sound", cls: 11, weight: "high" },
      { name: "Electrostatics", cls: 12, weight: "high" },
      { name: "Capacitance", cls: 12, weight: "high" },
      { name: "Current Electricity", cls: 12, weight: "high" },
      { name: "Moving Charges & Magnetism", cls: 12, weight: "high" },
      { name: "Magnetism & Matter", cls: 12, weight: "low" },
      { name: "Electromagnetic Induction", cls: 12, weight: "high" },
      { name: "Alternating Current", cls: 12, weight: "medium" },
      { name: "Electromagnetic Waves", cls: 12, weight: "low" },
      { name: "Ray Optics & Optical Instruments", cls: 12, weight: "high" },
      { name: "Wave Optics", cls: 12, weight: "high" },
      { name: "Dual Nature of Matter & Radiation", cls: 12, weight: "medium" },
      { name: "Atoms & Nuclei", cls: 12, weight: "medium" },
      { name: "Semiconductor Electronics", cls: 12, weight: "medium" },
      { name: "Experimental Physics & Error Analysis", cls: 12, weight: "medium" },
    ],
  },
  chemistry: {
    name: "Chemistry",
    chapters: [
      { name: "Some Basic Concepts & Mole Concept", cls: 11, weight: "high" },
      { name: "Atomic Structure", cls: 11, weight: "high" },
      { name: "Classification of Elements & Periodicity", cls: 11, weight: "medium" },
      { name: "Chemical Bonding & Molecular Structure", cls: 11, weight: "high" },
      { name: "States of Matter (Gaseous & Liquid)", cls: 11, weight: "medium" },
      { name: "Thermodynamics & Thermochemistry", cls: 11, weight: "high" },
      { name: "Chemical & Ionic Equilibrium", cls: 11, weight: "high" },
      { name: "Redox Reactions", cls: 11, weight: "medium" },
      { name: "Hydrogen & s-Block Elements", cls: 11, weight: "low" },
      { name: "p-Block Elements (Group 13 & 14)", cls: 11, weight: "medium" },
      { name: "General Organic Chemistry (GOC)", cls: 11, weight: "high" },
      { name: "Hydrocarbons", cls: 11, weight: "high" },
      { name: "Environmental Chemistry", cls: 11, weight: "low" },
      { name: "Solid State", cls: 12, weight: "high" },
      { name: "Solutions & Colligative Properties", cls: 12, weight: "high" },
      { name: "Electrochemistry", cls: 12, weight: "high" },
      { name: "Chemical Kinetics", cls: 12, weight: "high" },
      { name: "Surface Chemistry", cls: 12, weight: "low" },
      { name: "Metallurgy (General Principles)", cls: 12, weight: "low" },
      { name: "p-Block Elements (Group 15-18)", cls: 12, weight: "medium" },
      { name: "d- & f-Block Elements", cls: 12, weight: "medium" },
      { name: "Coordination Compounds", cls: 12, weight: "high" },
      { name: "Haloalkanes & Haloarenes", cls: 12, weight: "medium" },
      { name: "Alcohols, Phenols & Ethers", cls: 12, weight: "high" },
      { name: "Aldehydes, Ketones & Carboxylic Acids", cls: 12, weight: "high" },
      { name: "Amines & Diazonium Salts", cls: 12, weight: "medium" },
      { name: "Biomolecules", cls: 12, weight: "low" },
      { name: "Polymers", cls: 12, weight: "low" },
      { name: "Chemistry in Everyday Life", cls: 12, weight: "low" },
      { name: "Practical & Salt Analysis", cls: 12, weight: "medium" },
    ],
  },
  maths: {
    name: "Mathematics",
    chapters: [
      { name: "Sets, Relations & Functions", cls: 11, weight: "medium" },
      { name: "Complex Numbers", cls: 11, weight: "high" },
      { name: "Quadratic Equations", cls: 11, weight: "high" },
      { name: "Sequences & Series", cls: 11, weight: "high" },
      { name: "Permutations & Combinations", cls: 11, weight: "medium" },
      { name: "Binomial Theorem", cls: 11, weight: "medium" },
      { name: "Trigonometric Ratios & Identities", cls: 11, weight: "high" },
      { name: "Trigonometric Equations", cls: 11, weight: "medium" },
      { name: "Solution of Triangles", cls: 11, weight: "low" },
      { name: "Straight Lines", cls: 11, weight: "high" },
      { name: "Circles", cls: 11, weight: "high" },
      { name: "Parabola, Ellipse & Hyperbola", cls: 11, weight: "high" },
      { name: "Limits, Continuity & Differentiability", cls: 11, weight: "high" },
      { name: "Mathematical Reasoning", cls: 11, weight: "low" },
      { name: "Statistics", cls: 11, weight: "medium" },
      { name: "Inverse Trigonometric Functions", cls: 12, weight: "medium" },
      { name: "Matrices", cls: 12, weight: "high" },
      { name: "Determinants", cls: 12, weight: "high" },
      { name: "Methods of Differentiation", cls: 12, weight: "high" },
      { name: "Applications of Derivatives", cls: 12, weight: "high" },
      { name: "Indefinite Integration", cls: 12, weight: "high" },
      { name: "Definite Integration", cls: 12, weight: "high" },
      { name: "Area Under Curves", cls: 12, weight: "medium" },
      { name: "Differential Equations", cls: 12, weight: "high" },
      { name: "Vectors", cls: 12, weight: "high" },
      { name: "Three Dimensional Geometry", cls: 12, weight: "high" },
      { name: "Probability", cls: 12, weight: "high" },
    ],
  },
};

export const chaptersOf = (s: SubjectKey) => SYLLABUS[s].chapters;
export const chapterNames = (s: SubjectKey) => SYLLABUS[s].chapters.map((c) => c.name);
export const allChapters = () =>
  (Object.keys(SYLLABUS) as SubjectKey[]).flatMap((s) =>
    SYLLABUS[s].chapters.map((c) => ({ ...c, subject: s, subjectName: SYLLABUS[s].name })),
  );

// The 5 pages of every chapter formula sheet.
export type SheetSection = { key: string; label: string; emoji: string; prompt: (subject: string, chapter: string) => string };

const PLAIN = `Write every formula in PLAIN READABLE TEXT only — never LaTeX, never $, \\frac{}, \\sqrt{}, markup subscripts or superscripts. Examples: v = u + at, s = ut + (1/2)at², v² = u² + 2as, Fnet = ma. Use / for division, sqrt(x) for roots, and inline names like vmax, x1, KEavg. Markdown headings and tables are allowed. No preamble.`;

export const SHEET_SECTIONS: SheetSection[] = [
  {
    key: "formulas", label: "Formula Sheet", emoji: "📐",
    prompt: (s, c) => `Act as a JEE ${s} formula master. Give the COMPLETE formula sheet for "${c}".
Group by sub-topic with ## headings. For EVERY formula give labelled lines: Formula (bold), Meaning, Variables, Units, Conditions, Shortcut version, Memory trick, Importance (must-know / good-to-know), Difficulty.
Cover the full chapter — nothing skipped. ${PLAIN}`,
  },
  {
    key: "tables", label: "Formula Tables", emoji: "🧾",
    prompt: (s, c) => `Build colour-codeable markdown TABLES of every important formula in JEE ${s} chapter "${c}".
Columns: Formula | Variables | Units | Special cases | Shortcut | Common mistake | JEE Level (Main/Adv) | PYQ frequency.
Split into 2-4 tables by sub-topic with ## headings. ${PLAIN}`,
  },
  {
    key: "derivations", label: "Derivations", emoji: "✍️",
    prompt: (s, c) => `For JEE ${s} chapter "${c}", derive the main results.
For each key formula: simple one-line intuition, assumptions, step-by-step derivation, a shortcut derivation, and an advanced (JEE Advanced) derivation where it exists. Use ## headings per formula. ${PLAIN}`,
  },
  {
    key: "mistakes", label: "Mistakes & Traps", emoji: "⚠️",
    prompt: (s, c) => `For JEE ${s} chapter "${c}", list the mistakes students actually make.
Sections: Wrong formulas, Sign errors, Unit mistakes, Approximation mistakes, Calculator mistakes, Graph mistakes, JEE traps.
Each item: what goes wrong → why → the fix in one line. ${PLAIN}`,
  },
  {
    key: "advanced", label: "Advanced + PYQ", emoji: "🏆",
    prompt: (s, c) => `For JEE ${s} chapter "${c}", give an Advanced-level pack.
Sections: Advanced tricks, Hidden concepts, Mixed-chapter formulas, Rare formulas, Olympiad-flavoured ideas, Concept connections, Advanced applications.
Then a PYQ Formula Analysis table: Topic | Years asked | Times asked | Difficulty | Probability this year | Priority. ${PLAIN}`,
  },
];

export const REVISION_MODES = [
  { key: "r30", label: "30-second", emoji: "⚡", prompt: (s: string, c: string) => `Ultra-compressed 30-second revision of JEE ${s} "${c}": only the 6-8 formulas that matter most, one line each. ${PLAIN}` },
  { key: "r2", label: "2-minute", emoji: "⏱️", prompt: (s: string, c: string) => `2-minute revision of JEE ${s} "${c}": all key formulas grouped by sub-topic, one line each, plus 3 traps. ${PLAIN}` },
  { key: "r5", label: "5-minute", emoji: "🕐", prompt: (s: string, c: string) => `5-minute revision of JEE ${s} "${c}": every formula with its condition and one usage hint, plus 5 mistakes to avoid. ${PLAIN}` },
  { key: "night", label: "Night revision", emoji: "🌙", prompt: (s: string, c: string) => `Calm night-before-bed revision of JEE ${s} "${c}": soft tone, formulas as memory hooks and rhymes, easy to read in bed. ${PLAIN}` },
  { key: "exam", label: "Exam day", emoji: "🎯", prompt: (s: string, c: string) => `Exam-hall last-look sheet for JEE ${s} "${c}": only high-yield formulas, shortcut forms, unit checks and the 5 deadliest traps. ${PLAIN}` },
] as const;
