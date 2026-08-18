/**
 * Samsta Circles — presentation metadata for circle categories.
 * Category keys match the values stored in the database (`communities.category`).
 */

export type CircleCategoryMeta = {
  key: string;
  label: string;
  group: string;
  emoji: string;
  gradient: string;
  blurb: string;
  anim: string;
  glow: string;
};

export const CIRCLE_CATEGORY_META: CircleCategoryMeta[] = [
  {
    key: "education",
    label: "Education",
    group: "Learn",
    emoji: "🎓",
    gradient: "from-[#dbe6ff] via-[#e7edff] to-[#f2f6ff]",
    blurb: "Exams, notes, study rooms",
    anim: "animate-icon-tilt",
    glow: "#b9c9f2",
  },
  {
    key: "college",
    label: "Colleges",
    group: "Learn",
    emoji: "🏛️",
    gradient: "from-[#e6ddff] via-[#efe8ff] to-[#f7f3ff]",
    blurb: "Campus, placements, alumni",
    anim: "animate-bounce-soft",
    glow: "#c9bcf0",
  },
  {
    key: "career",
    label: "Career",
    group: "Build",
    emoji: "💼",
    gradient: "from-[#d6f2ec] via-[#e4f7f2] to-[#f1fbf8]",
    blurb: "Jobs, mentors, portfolios",
    anim: "animate-icon-swing",
    glow: "#aedbd0",
  },
  {
    key: "startup",
    label: "Startups",
    group: "Build",
    emoji: "🚀",
    gradient: "from-[#ffe3d2] via-[#ffeee2] to-[#fff6ef]",
    blurb: "Founders, funding, feedback",
    anim: "animate-pulse-up",
    glow: "#f3c3a3",
  },
  {
    key: "technology",
    label: "Technology",
    group: "Build",
    emoji: "⚙️",
    gradient: "from-[#d8e8ff] via-[#e3f2fb] to-[#f0f9fd]",
    blurb: "AI, code, product",
    anim: "animate-orbit-spin",
    glow: "#b3cfec",
  },
  {
    key: "finance",
    label: "Finance",
    group: "Build",
    emoji: "📈",
    gradient: "from-[#f8ead0] via-[#fbf2e0] to-[#fdf8ee]",
    blurb: "Markets, money, planning",
    anim: "animate-icon-ping",
    glow: "#e6cd9c",
  },
  {
    key: "location",
    label: "Local",
    group: "Belong",
    emoji: "📍",
    gradient: "from-[#d9f0e3] via-[#e7f7ed] to-[#f3fbf6]",
    blurb: "Your city, area, village",
    anim: "animate-bounce-soft",
    glow: "#aeddc2",
  },
  {
    key: "health",
    label: "Health",
    group: "Belong",
    emoji: "🩺",
    gradient: "from-[#fbdfe8] via-[#fdebf1] to-[#fef5f8]",
    blurb: "Fitness, wellbeing, care",
    anim: "animate-icon-ping",
    glow: "#f0bcce",
  },
  {
    key: "hobby",
    label: "Interests",
    group: "Play",
    emoji: "🎯",
    gradient: "from-[#e4dcf9] via-[#eee9fc] to-[#f7f4fe]",
    blurb: "Sports, gaming, travel",
    anim: "animate-icon-tilt",
    glow: "#c6b8ea",
  },
  {
    key: "creative",
    label: "Creative",
    group: "Play",
    emoji: "🎨",
    gradient: "from-[#fadfe9] via-[#fceadd] to-[#fdf6ec]",
    blurb: "Music, film, photography",
    anim: "animate-icon-swing",
    glow: "#eebfd0",
  },
];

export const CIRCLE_GROUPS = ["Learn", "Build", "Belong", "Play"] as const;

export function circleMeta(key: string | null | undefined): CircleCategoryMeta {
  return (
    CIRCLE_CATEGORY_META.find((c) => c.key === key) ?? {
      key: key ?? "other",
      label: key ?? "Other",
      group: "Play",
      emoji: "✨",
      gradient: "from-[#e8e4fb] via-[#f1eefd] to-[#f9f5fe]",
      blurb: "A Samsta circle",
      anim: "animate-bounce-soft",
      glow: "#cabff0",
    }
  );
}

export function verificationLabel(verification: string | null | undefined) {
  switch (verification) {
    case "government":
      return "Government verified";
    case "education":
    case "educational":
      return "Institution verified";
    case "business":
      return "Business verified";
    case "nonprofit":
      return "Non-profit verified";
    case "none":
    case null:
    case undefined:
      return null;
    default:
      return "Official verified";
  }
}
