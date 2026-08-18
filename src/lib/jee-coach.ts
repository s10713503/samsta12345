// Local-first store for the JEE Study Coach (offline capable, no server round-trip).
import { useCallback, useEffect, useState } from "react";

export const CK = {
  goal: "samsta:jee:goal",
  roadmap: "samsta:jee:roadmap",
  planner: "samsta:jee:planner",
  mistakes: "samsta:jee:mistakes",
  goals: "samsta:jee:goalplanner",
  reminders: "samsta:jee:reminders",
  progress: "samsta:jee:progress",
  sheets: "samsta:jee:sheets",
} as const;

export type GoalSetup = {
  exam: "main" | "advanced" | "both";
  year: string;
  percentile: string;
  marks: string;
  rank: string;
  hours: number;
  level: "weak" | "average" | "good" | "excellent";
  savedAt: number;
};

export type MistakeEntry = {
  id: string; subject: string; chapter: string; question: string;
  mistakeType: string; fix: string; retested: boolean; at: number;
};

export type PlannerGoal = { id: string; title: string; due: string; done: boolean; at: number };

export type ReminderPrefs = Record<string, { on: boolean; at: string }>;

export const DEFAULT_REMINDERS: ReminderPrefs = {
  study: { on: true, at: "17:00" },
  revision: { on: true, at: "21:00" },
  mock: { on: false, at: "10:00" },
  pyq: { on: false, at: "19:00" },
  sleep: { on: true, at: "23:00" },
  water: { on: false, at: "12:00" },
  break: { on: false, at: "16:00" },
};

export type ProgressState = {
  studied: Record<string, number>;   // "subject:chapter" -> mastery 0..100
  minutes: Record<string, number>;   // "YYYY-MM-DD" -> minutes
  streak: { day: string; count: number };
};

export const EMPTY_PROGRESS: ProgressState = { studied: {}, minutes: {}, streak: { day: "", count: 0 } };

export function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
export function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => { setValue(readLS<T>(key, initial)); setReady(true); /* eslint-disable-next-line */ }, [key]);
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const out = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      writeLS(key, out);
      return out;
    });
  }, [key]);
  return [value, set, ready] as const;
}

export const today = () => new Date().toISOString().slice(0, 10);

export function markStudied(subjectChapter: string, minutes = 20, mastery = 15) {
  const p = readLS<ProgressState>(CK.progress, EMPTY_PROGRESS);
  const d = today();
  const y = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const next: ProgressState = {
    studied: { ...p.studied, [subjectChapter]: Math.min(100, (p.studied[subjectChapter] ?? 0) + mastery) },
    minutes: { ...p.minutes, [d]: (p.minutes[d] ?? 0) + minutes },
    streak: p.streak.day === d ? p.streak : { day: d, count: p.streak.day === y ? p.streak.count + 1 : 1 },
  };
  writeLS(CK.progress, next);
  return next;
}

// Rough estimates so the dashboard can show something meaningful offline.
export function estimate(progress: ProgressState, totalChapters: number) {
  const values = Object.values(progress.studied);
  const mastered = values.filter((v) => v >= 80).length;
  const coverage = totalChapters ? Math.round((values.length / totalChapters) * 100) : 0;
  const mastery = totalChapters ? Math.round((values.reduce((a, b) => a + b, 0) / (totalChapters * 100)) * 100) : 0;
  const percentile = Math.min(99.9, Math.round((60 + mastery * 0.39) * 10) / 10);
  const air = Math.max(1, Math.round(250_000 * Math.pow(1 - mastery / 100, 2.2)) || 1);
  return { mastered, coverage, mastery, percentile, air };
}

export const BOOKS: Record<string, Array<{ title: string; author: string; url: string; note: string }>> = {
  Physics: [
    { title: "NCERT Physics XI & XII", author: "NCERT", url: "https://ncert.nic.in/textbook.php", note: "Free official textbooks — start here" },
    { title: "Concepts of Physics", author: "H. C. Verma", url: "https://www.bharatibhawan.in/", note: "Publisher page (Bharati Bhawan)" },
    { title: "Understanding Physics series", author: "D. C. Pandey", url: "https://www.arihantbooks.com/", note: "Publisher page (Arihant)" },
    { title: "Problems in General Physics", author: "I. E. Irodov", url: "https://cbspd.com/", note: "Publisher page — Advanced only" },
    { title: "Fundamentals of Physics", author: "Resnick, Halliday, Walker", url: "https://www.wiley.com/", note: "Publisher page (Wiley)" },
    { title: "Physics Galaxy", author: "Ashish Arora", url: "https://www.physicsgalaxy.com/", note: "Official site + free lecture library" },
  ],
  Chemistry: [
    { title: "NCERT Chemistry XI & XII", author: "NCERT", url: "https://ncert.nic.in/textbook.php", note: "Free official textbooks — non-negotiable for Inorganic" },
    { title: "Advanced Problems in Organic Chemistry", author: "M. S. Chauhan", url: "https://www.balaji-publications.com/", note: "Publisher page (Balaji)" },
    { title: "Problems in Physical Chemistry", author: "N. Awasthi", url: "https://www.balaji-publications.com/", note: "Publisher page (Balaji)" },
    { title: "Problems in Inorganic Chemistry", author: "V. K. Jaiswal", url: "https://www.balaji-publications.com/", note: "Publisher page (Balaji)" },
    { title: "Concise Inorganic Chemistry", author: "J. D. Lee", url: "https://www.wiley.com/", note: "Publisher page (Wiley)" },
    { title: "Organic Chemistry", author: "Solomons & Fryhle", url: "https://www.wiley.com/", note: "Publisher page (Wiley)" },
  ],
  Mathematics: [
    { title: "NCERT Mathematics XI & XII", author: "NCERT", url: "https://ncert.nic.in/textbook.php", note: "Free official textbooks" },
    { title: "Cengage JEE Mathematics series", author: "G. Tewani", url: "https://www.cengage.co.in/", note: "Publisher page (Cengage)" },
    { title: "Problems Plus in IIT Mathematics", author: "A. Das Gupta", url: "https://www.bharatibhawan.in/", note: "Publisher page" },
    { title: "Skills in Mathematics series", author: "Amit M. Agarwal", url: "https://www.arihantbooks.com/", note: "Publisher page (Arihant)" },
    { title: "Black Book of Mathematics", author: "Vikas Gupta", url: "https://www.vikaspublishinghouse.com/", note: "Publisher page" },
    { title: "Problems in Calculus of One Variable", author: "Sameer Bansal / I. A. Maron", url: "https://cbspd.com/", note: "Publisher page — Advanced only" },
  ],
};
