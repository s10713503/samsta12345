import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Role = "student" | "professional" | "entrepreneur" | "general";
export type Goal = "exams" | "job" | "business" | "skills" | "entertainment" | "connect";
export type CategoryKey = "education" | "career" | "knowledge" | "social";
export type Mode = "study" | "work" | "business" | "fun";

export type Personalization = {
  onboarded: boolean;
  role: Role | null;
  interests: string[];
  goal: Goal | null;
  unlocked: CategoryKey[];
  mode: Mode;
  affinity: Record<string, number>;
};

const KEY = "samsta.personalization.v1";

const DEFAULTS: Personalization = {
  onboarded: false,
  role: null,
  interests: [],
  goal: null,
  unlocked: [],
  mode: "study",
  affinity: {},
};

export const ROLES: Array<{ key: Role; label: string; emoji: string; hint: string }> = [
  { key: "student", label: "Student", emoji: "👨‍🎓", hint: "Exams, notes, tutoring" },
  { key: "professional", label: "Professional", emoji: "💼", hint: "Jobs, upskilling, tools" },
  { key: "entrepreneur", label: "Entrepreneur", emoji: "🚀", hint: "Startups, funding, finance" },
  { key: "general", label: "General User", emoji: "👤", hint: "Social, fun, discovery" },
];

export const INTERESTS = [
  "Education", "Career", "Business", "Investing", "Technology",
  "Knowledge", "Social", "Entertainment", "Health", "Sports",
];

export const GOALS: Array<{ key: Goal; label: string; emoji: string }> = [
  { key: "exams", label: "Crack Exams", emoji: "📚" },
  { key: "job", label: "Get a Job", emoji: "💼" },
  { key: "business", label: "Build a Business", emoji: "🚀" },
  { key: "skills", label: "Learn New Skills", emoji: "🧠" },
  { key: "entertainment", label: "Stay Entertained", emoji: "🎬" },
  { key: "connect", label: "Connect with People", emoji: "🤝" },
];

export const CATEGORIES: Array<{
  key: CategoryKey; label: string; hint: string; to: string; accent: string; tint: string;
}> = [
  { key: "education", label: "Education Purpose", hint: "Academy · practice · certify", to: "/education",
    accent: "linear-gradient(135deg, oklch(0.78 0.13 150), oklch(0.72 0.14 170))", tint: "oklch(0.93 0.06 150)" },
  { key: "career", label: "Career & Business", hint: "Jobs · network · opportunities", to: "/career",
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))", tint: "oklch(0.94 0.06 20)" },
  { key: "knowledge", label: "Knowledge Feed", hint: "Articles · notes · PDFs", to: "/knowledge-feed",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))", tint: "oklch(0.93 0.04 250)" },
  { key: "social", label: "Fun & Social", hint: "Reels · stories · friends", to: "/reels",
    accent: "linear-gradient(135deg, oklch(0.86 0.11 55), oklch(0.82 0.13 20))", tint: "oklch(0.95 0.06 60)" },
];

export const MODES: Array<{ key: Mode; label: string; emoji: string; category: CategoryKey }> = [
  { key: "study", label: "Study", emoji: "📚", category: "education" },
  { key: "work", label: "Work", emoji: "💼", category: "career" },
  { key: "business", label: "Business", emoji: "🚀", category: "career" },
  { key: "fun", label: "Fun", emoji: "🎬", category: "social" },
];

/** Route prefixes that belong to each lockable category. */
const ROUTE_MAP: Array<{ prefix: string; key: CategoryKey }> = [
  { prefix: "/education", key: "education" },
  { prefix: "/edu-reels", key: "education" },
  { prefix: "/learn", key: "education" },
  { prefix: "/career", key: "career" },
  { prefix: "/knowledge-feed", key: "knowledge" },
  { prefix: "/knowledge", key: "knowledge" },
  { prefix: "/reels", key: "social" },
];

export function categoryForPath(pathname: string): CategoryKey | null {
  const hit = ROUTE_MAP.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  return hit?.key ?? null;
}

type Ctx = {
  p: Personalization;
  ready: boolean;
  save: (patch: Partial<Personalization>) => void;
  reset: () => void;
  isUnlocked: (k: CategoryKey) => boolean;
  toggleUnlock: (k: CategoryKey) => void;
  setMode: (m: Mode) => void;
  track: (tag: string, weight?: number) => void;
};

const PCtx = createContext<Ctx | null>(null);

export function PersonalizationProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Personalization>(DEFAULTS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setP({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
    setReady(true);
  }, []);

  const persist = (next: Personalization) => {
    setP(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const value = useMemo<Ctx>(() => ({
    p,
    ready,
    save: (patch) => persist({ ...p, ...patch }),
    reset: () => persist({ ...DEFAULTS }),
    isUnlocked: (k) => p.unlocked.includes(k),
    toggleUnlock: (k) =>
      persist({ ...p, unlocked: p.unlocked.includes(k) ? p.unlocked.filter((x) => x !== k) : [...p.unlocked, k] }),
    setMode: (m) => persist({ ...p, mode: m }),
    track: (tag, weight = 1) =>
      persist({ ...p, affinity: { ...p.affinity, [tag]: (p.affinity?.[tag] ?? 0) + weight } }),
  }), [p, ready]);

  return <PCtx.Provider value={value}>{children}</PCtx.Provider>;
}

export function usePersonalization() {
  const c = useContext(PCtx);
  if (!c) throw new Error("usePersonalization must be used inside PersonalizationProvider");
  return c;
}

/** Home shortcut tiles ranked by role, goal, interests and observed affinity. */
export type Shortcut = { label: string; hint: string; to: string; emoji: string; tags: string[] };

const SHORTCUTS: Shortcut[] = [
  { label: "Study Planner", hint: "Plan today's chapters", to: "/assistants/schedule", emoji: "🗓️", tags: ["education", "exams", "student"] },
  { label: "Tutor", hint: "Ask any doubt", to: "/education", emoji: "🧑‍🏫", tags: ["education", "exams", "student", "skills"] },
  { label: "Mock Tests", hint: "Timed practice", to: "/education", emoji: "📝", tags: ["education", "exams", "student"] },
  { label: "Notes & Flashcards", hint: "Revise faster", to: "/knowledge-feed", emoji: "🃏", tags: ["education", "knowledge", "student"] },
  { label: "Jobs", hint: "Verified openings", to: "/career/jobs", emoji: "💼", tags: ["career", "job", "professional"] },
  { label: "Upskilling", hint: "Grow your craft", to: "/learn", emoji: "📈", tags: ["career", "skills", "professional"] },
  { label: "Pro Tools", hint: "Resume · interview", to: "/career/ai", emoji: "🛠️", tags: ["career", "job", "professional"] },
  { label: "Productivity", hint: "Assistants & inbox", to: "/assistants", emoji: "⚡", tags: ["career", "professional", "skills"] },
  { label: "Opportunities", hint: "Deals & partners", to: "/career/business", emoji: "🚀", tags: ["business", "entrepreneur"] },
  { label: "Finance", hint: "Track & forecast", to: "/finance", emoji: "💰", tags: ["business", "investing", "entrepreneur"] },
  { label: "Startup News", hint: "What's moving", to: "/news", emoji: "📰", tags: ["business", "entrepreneur", "technology"] },
  { label: "Knowledge Feed", hint: "Deep reads", to: "/knowledge-feed", emoji: "📚", tags: ["knowledge", "skills", "technology"] },
  { label: "Reels", hint: "Fresh & fun", to: "/reels", emoji: "🎬", tags: ["social", "entertainment"] },
  { label: "Explore", hint: "Trending everywhere", to: "/explore", emoji: "🧭", tags: ["social", "entertainment", "connect"] },
  { label: "Messages", hint: "Your people", to: "/messages", emoji: "💬", tags: ["social", "connect"] },
  { label: "Health", hint: "Balance & habits", to: "/health", emoji: "🫀", tags: ["health", "general"] },
];

const MODE_TAGS: Record<Mode, string[]> = {
  study: ["education", "exams", "knowledge"],
  work: ["career", "job", "professional"],
  business: ["business", "entrepreneur", "investing"],
  fun: ["social", "entertainment", "connect"],
};

export function rankShortcuts(p: Personalization, limit = 6): Shortcut[] {
  const weights = new Map<string, number>();
  const bump = (t: string, w: number) => weights.set(t, (weights.get(t) ?? 0) + w);
  MODE_TAGS[p.mode]?.forEach((t) => bump(t, 5));
  if (p.role) bump(p.role, 3);
  if (p.goal) bump(p.goal, 4);
  p.interests.forEach((i) => bump(i.toLowerCase(), 2));
  Object.entries(p.affinity ?? {}).forEach(([t, v]) => bump(t, Math.min(v, 6) * 0.5));

  return [...SHORTCUTS]
    .map((s) => ({ s, score: s.tags.reduce((acc, t) => acc + (weights.get(t) ?? 0), 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.s);
}
