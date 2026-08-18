// Single source of truth for the NEET syllabus (Class 11 & 12) — Physics, Chemistry, Biology.
import {
  SYLLABUS as JEE_SYLLABUS,
  SHEET_SECTIONS as JEE_SHEET_SECTIONS,
  REVISION_MODES as JEE_REVISION_MODES,
  type Chapter,
  type Weight,
} from "@/lib/jee-syllabus";

export type NeetSubjectKey = "physics" | "chemistry" | "biology";
export type { Chapter, Weight };

const bio = (names: string[], cls: 11 | 12, high: string[] = []): Chapter[] =>
  names.map((name) => ({ name, cls, weight: (high.includes(name) ? "high" : "medium") as Weight }));

const BIO_11 = bio(
  [
    "The Living World",
    "Biological Classification",
    "Plant Kingdom",
    "Animal Kingdom",
    "Morphology of Flowering Plants",
    "Anatomy of Flowering Plants",
    "Structural Organisation in Animals",
    "Cell: The Unit of Life",
    "Biomolecules",
    "Cell Cycle and Cell Division",
    "Transport in Plants",
    "Mineral Nutrition",
    "Photosynthesis in Higher Plants",
    "Respiration in Plants",
    "Plant Growth and Development",
    "Digestion and Absorption",
    "Breathing and Exchange of Gases",
    "Body Fluids and Circulation",
    "Excretory Products and Their Elimination",
    "Locomotion and Movement",
    "Neural Control and Coordination",
    "Chemical Coordination and Integration",
  ],
  11,
  [
    "Animal Kingdom",
    "Morphology of Flowering Plants",
    "Cell: The Unit of Life",
    "Biomolecules",
    "Cell Cycle and Cell Division",
    "Photosynthesis in Higher Plants",
    "Body Fluids and Circulation",
    "Chemical Coordination and Integration",
  ],
);

const BIO_12 = bio(
  [
    "Sexual Reproduction in Flowering Plants",
    "Human Reproduction",
    "Reproductive Health",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
    "Evolution",
    "Human Health and Disease",
    "Microbes in Human Welfare",
    "Biotechnology: Principles and Processes",
    "Biotechnology and Its Applications",
    "Organisms and Populations",
    "Ecosystem",
    "Biodiversity and Conservation",
    "Environmental Issues",
  ],
  12,
  [
    "Sexual Reproduction in Flowering Plants",
    "Human Reproduction",
    "Principles of Inheritance and Variation",
    "Molecular Basis of Inheritance",
    "Evolution",
    "Human Health and Disease",
    "Biotechnology: Principles and Processes",
    "Ecosystem",
  ],
);

export const SYLLABUS: Record<NeetSubjectKey, { name: string; chapters: Chapter[] }> = {
  physics: { name: "Physics", chapters: JEE_SYLLABUS.physics.chapters },
  chemistry: { name: "Chemistry", chapters: JEE_SYLLABUS.chemistry.chapters },
  biology: { name: "Biology", chapters: [...BIO_11, ...BIO_12] },
};

export const chaptersOf = (s: NeetSubjectKey) => SYLLABUS[s].chapters;
export const chapterNames = (s: NeetSubjectKey) => SYLLABUS[s].chapters.map((c) => c.name);
export const allChapters = () =>
  (Object.keys(SYLLABUS) as NeetSubjectKey[]).flatMap((s) =>
    SYLLABUS[s].chapters.map((c) => ({ ...c, subject: s, subjectName: SYLLABUS[s].name })),
  );

// Reuse the exact same 5-page sheet + revision structure, worded for NEET.
const toNeet = (t: string) =>
  t
    .replace(/JEE Advanced/g, "NEET")
    .replace(/JEE Main\b/g, "NEET")
    .replace(/\bJEE\b/g, "NEET")
    .replace(/Main\/Adv(anced)?/g, "NEET");

export const SHEET_SECTIONS = JEE_SHEET_SECTIONS.map((s) => ({
  ...s,
  prompt: (subject: string, chapter: string) => toNeet(s.prompt(subject, chapter)),
}));

export const REVISION_MODES = JEE_REVISION_MODES.map((m) => ({
  ...m,
  prompt: (subject: string, chapter: string) => toNeet(m.prompt(subject, chapter)),
}));
