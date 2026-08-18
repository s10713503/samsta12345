// Level-wise Physics book roadmap (Level 0 school -> Level 19 Olympiad master)
// with Samsta's own gated level tests. Local-first so it works offline.
import { readLS, writeLS, useStored } from "@/lib/jee-coach";

export type Pattern = "main" | "advanced" | "olympiad";

export type PhysicsLevel = {
  level: number;
  difficulty: string;
  book: string;
  author: string;
  url: string;
  note: string;
  scope: string;          // what the content of this level covers
  pattern: Pattern;       // which Samsta test pattern gates this level
};

export const PHYSICS_LEVELS: PhysicsLevel[] = [
  { level: 0, difficulty: "School", book: "NCERT Physics Class 11 & 12", author: "NCERT", url: "https://ncert.nic.in/textbook.php", note: "Free official textbooks", scope: "School-level Physics: definitions, base formulas, NCERT in-text and exercise questions", pattern: "main" },
  { level: 1, difficulty: "Basic JEE Main", book: "Concepts of Physics Vol. 1 & 2", author: "H. C. Verma", url: "https://www.bharatibhawan.in/", note: "Concept clarity + short objective problems", scope: "Concept-building problems, worked examples, objective I and II", pattern: "main" },
  { level: 2, difficulty: "JEE Main", book: "Understanding Physics series", author: "D. C. Pandey", url: "https://www.arihantbooks.com/", note: "Main-level drill volume", scope: "Full JEE Main level practice with speed and accuracy focus", pattern: "main" },
  { level: 3, difficulty: "JEE Main + Advanced", book: "Cengage Physics series", author: "B. M. Sharma", url: "https://www.cengage.co.in/", note: "Bridge from Main to Advanced", scope: "Mixed Main + Advanced multi-concept problems, JEE Advanced single-correct", pattern: "advanced" },
  { level: 4, difficulty: "Advanced", book: "Physics Galaxy series", author: "Ashish Arora", url: "https://www.physicsgalaxy.com/", note: "Deep Advanced problem sets", scope: "Advanced-level problem solving with multi-step reasoning", pattern: "advanced" },
  { level: 5, difficulty: "Advanced Theory", book: "Fundamentals of Physics", author: "Halliday, Resnick, Walker", url: "https://www.wiley.com/", note: "Rigorous theory foundation", scope: "Rigorous theory, derivations and conceptual checkpoints", pattern: "advanced" },
  { level: 6, difficulty: "University", book: "University Physics", author: "Young & Freedman", url: "https://www.pearson.com/", note: "University treatment of school topics", scope: "University-level treatment with calculus-based derivations", pattern: "advanced" },
  { level: 7, difficulty: "High-Level Problems", book: "Problems in General Physics", author: "I. E. Irodov", url: "https://cbspd.com/", note: "Classic high-difficulty problem book", scope: "High-difficulty numerical problems needing full modelling", pattern: "advanced" },
  { level: 8, difficulty: "Olympiad", book: "Problems in Physics", author: "S. S. Krotov", url: "https://cbspd.com/", note: "Olympiad-grade problems", scope: "Olympiad problems: estimation, symmetry, limiting cases", pattern: "olympiad" },
  { level: 9, difficulty: "Olympiad+", book: "200 Puzzling Physics Problems", author: "Gnadig, Honyek, Riley", url: "https://www.cambridge.org/", note: "Insight-first puzzles", scope: "Insight-based physics puzzles with elegant short solutions", pattern: "olympiad" },
  { level: 10, difficulty: "Advanced Mechanics", book: "An Introduction to Mechanics", author: "Kleppner & Kolenkow", url: "https://www.cambridge.org/", note: "Mechanics done properly", scope: "Rigorous mechanics: rotation, non-inertial frames, central forces", pattern: "olympiad" },
  { level: 11, difficulty: "Classical Mechanics", book: "Classical Mechanics", author: "John R. Taylor", url: "https://uscibooks.aip.org/", note: "Lagrangian and Hamiltonian intro", scope: "Lagrangian/Hamiltonian mechanics, oscillations, chaos basics", pattern: "olympiad" },
  { level: 12, difficulty: "Electromagnetism", book: "Introduction to Electrodynamics", author: "David J. Griffiths", url: "https://www.cambridge.org/", note: "Standard EM text", scope: "Vector-calculus electrodynamics: fields, potentials, Maxwell equations", pattern: "olympiad" },
  { level: 13, difficulty: "Electromagnetism (Advanced)", book: "Electricity and Magnetism", author: "Edward M. Purcell", url: "https://www.cambridge.org/", note: "Relativistic view of EM", scope: "Relativistic and field-line intuition for electricity and magnetism", pattern: "olympiad" },
  { level: 14, difficulty: "Thermodynamics", book: "Heat and Thermodynamics", author: "Zemansky & Dittman", url: "https://www.mheducation.com/", note: "Classical thermodynamics", scope: "Laws of thermodynamics, cycles, entropy, real gases", pattern: "olympiad" },
  { level: 15, difficulty: "Thermal Physics", book: "Thermal Physics", author: "Charles Kittel", url: "https://www.wiley.com/", note: "Statistical viewpoint", scope: "Statistical mechanics basics: partition function, distributions", pattern: "olympiad" },
  { level: 16, difficulty: "Waves", book: "The Physics of Vibrations and Waves", author: "H. J. Pain", url: "https://www.wiley.com/", note: "Waves and oscillations depth", scope: "Coupled oscillators, wave equations, Fourier methods", pattern: "olympiad" },
  { level: 17, difficulty: "Optics", book: "Optics", author: "Eugene Hecht", url: "https://www.pearson.com/", note: "Wave optics reference", scope: "Interference, diffraction, polarisation, coherence", pattern: "olympiad" },
  { level: 18, difficulty: "Modern Physics", book: "Concepts of Modern Physics", author: "Arthur Beiser", url: "https://www.mheducation.com/", note: "Quantum and nuclear intro", scope: "Relativity, quantum basics, atomic and nuclear physics", pattern: "olympiad" },
  { level: 19, difficulty: "Olympiad Master", book: "Pathfinder for Olympiad Physics", author: "Pearson", url: "https://www.pearson.com/", note: "Olympiad capstone", scope: "Full Olympiad-grade mixed problem sets and past IPhO-style questions", pattern: "olympiad" },
];

export const TRACKS = [
  { key: "main", label: "JEE Main", range: "Levels 0–3", max: 3 },
  { key: "adv1000", label: "JEE Advanced (AIR < 1000)", range: "Levels 0–7", max: 7 },
  { key: "adv100", label: "JEE Advanced (AIR < 100)", range: "Levels 0–9", max: 9 },
  { key: "olympiad", label: "Olympiad / UG depth", range: "Levels 10–19", max: 19 },
] as const;

// ---- Test patterns (Samsta's own tests) ----
export const PATTERNS: Record<Pattern, {
  label: string; papers: number; perPaperMarks: number; totalMarks: number;
  passMarks: number; minutesPerPaper: number; questionsPerPaper: number;
}> = {
  main:     { label: "JEE Main pattern", papers: 1, perPaperMarks: 300, totalMarks: 300, passMarks: 260, minutesPerPaper: 180, questionsPerPaper: 20 },
  advanced: { label: "JEE Advanced pattern", papers: 2, perPaperMarks: 180, totalMarks: 360, passMarks: 300, minutesPerPaper: 180, questionsPerPaper: 12 },
  olympiad: { label: "Olympiad pattern", papers: 2, perPaperMarks: 180, totalMarks: 360, passMarks: 300, minutesPerPaper: 180, questionsPerPaper: 10 },
};

export const PL_KEYS = {
  state: "samsta:jee:physics-levels",
} as const;

export type LevelAttempt = {
  level: number; pattern: Pattern; marks: number; total: number; passed: boolean; at: number;
};

export type LevelState = {
  unlocked: number;                   // highest unlocked level
  contentDone: Record<string, true>;  // level -> content marked complete
  attempts: LevelAttempt[];
};

export const EMPTY_LEVEL_STATE: LevelState = { unlocked: 0, contentDone: {}, attempts: [] };

export function useLevelState() {
  return useStored<LevelState>(PL_KEYS.state, EMPTY_LEVEL_STATE);
}

export function bestMarks(state: LevelState, level: number) {
  const a = state.attempts.filter((x) => x.level === level);
  return a.length ? Math.max(...a.map((x) => x.marks)) : null;
}

export function recordAttempt(attempt: LevelAttempt): LevelState {
  const s = readLS<LevelState>(PL_KEYS.state, EMPTY_LEVEL_STATE);
  const next: LevelState = {
    ...s,
    attempts: [attempt, ...s.attempts].slice(0, 200),
    unlocked: attempt.passed ? Math.max(s.unlocked, Math.min(19, attempt.level + 1)) : s.unlocked,
  };
  writeLS(PL_KEYS.state, next);
  return next;
}

// +4 correct, -1 wrong (JEE marking), scaled to the pattern's marks.
export function scoreToMarks(correct: number, wrong: number, questions: number, patternTotal: number) {
  const raw = correct * 4 - wrong;
  const maxRaw = questions * 4;
  return Math.max(0, Math.round((raw / maxRaw) * patternTotal));
}

export function levelPrompt(l: PhysicsLevel) {
  return `You are Samsta, a JEE + Olympiad physics coach. Teach LEVEL ${l.level} (${l.difficulty}) of the level-wise physics ladder.
Reference book for this level: "${l.book}" by ${l.author}. Level scope: ${l.scope}.
Write the study content at exactly this difficulty — not easier, not harder. Use these sections:
1. What this level is about
2. Core concepts to master (bullet list)
3. Formula sheet for this level (plain text formulas only)
4. Worked examples (3 examples at this exact difficulty, full steps)
5. Practice set (8 problems with final answers at the end)
6. Traps at this level
7. How to know you are ready for the level test
Plain text math only: no LaTeX, no $, no \\frac, no \\sqrt. Write things like v = u + at, s = ut + (1/2)at^2, v^2 = u^2 + 2as, Fnet = ma.`;
}

export function testPrompt(l: PhysicsLevel, paper: number) {
  const p = PATTERNS[l.pattern];
  return `Create Samsta's own Level ${l.level} physics test (${p.label}${p.papers > 1 ? `, Paper ${paper} of ${p.papers}` : ""}).
Difficulty must match Level ${l.level} — ${l.difficulty} — based on the style of "${l.book}" by ${l.author}. Scope: ${l.scope}.
Return ONLY a JSON array of exactly ${p.questionsPerPaper} objects, no prose, no code fence:
[{"q":"question text","choices":["A","B","C","D"],"answer":0,"explain":"short solution"}]
"answer" is the 0-based index of the correct choice. Plain text math only (no LaTeX, no $, no \\frac): write v^2 = u^2 + 2as style. Keep each question self-contained and solvable without a figure.`;
}

export function parseQuestions(raw: string) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) return [];
  try {
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x: any) => x && typeof x.q === "string" && Array.isArray(x.choices) && x.choices.length >= 2)
      .map((x: any) => ({
        q: String(x.q),
        choices: x.choices.map((c: any) => String(c)),
        answer: Number(x.answer) || 0,
        explain: x.explain ? String(x.explain) : "",
      }));
  } catch {
    return [];
  }
}