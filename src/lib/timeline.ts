/**
 * Apple Photos-style timeline grouping.
 *
 * Every calculation is done in the *viewer's* local timezone (never the server's),
 * so a user in Asia/Kolkata, America/New_York or Australia/Sydney all see their own
 * "Today" flip at their own local 00:00:00.
 */

export const localTimeZone = () =>
  (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "UTC";

/** YYYY-MM-DD in the user's local timezone. */
export function localDayKey(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: localTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts; // en-CA => 2026-08-06
}

export function localParts(d: Date | string) {
  const key = localDayKey(d);
  const [y, m, day] = key.split("-").map(Number);
  return { key, year: y, month: m, day };
}

/** Milliseconds until the next local midnight (min 1s to avoid tight loops). */
export function msUntilLocalMidnight(now = new Date()): number {
  const key = localDayKey(now);
  // Build "tomorrow" by walking forward until the local day key changes.
  let probe = now.getTime() + 60 * 60 * 1000;
  // binary-ish search over the next 48h
  let lo = now.getTime();
  let hi = now.getTime() + 48 * 60 * 60 * 1000;
  while (hi - lo > 500) {
    probe = Math.floor((lo + hi) / 2);
    if (localDayKey(new Date(probe)) === key) lo = probe;
    else hi = probe;
  }
  return Math.max(1000, hi - now.getTime());
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEKDAY = (d: Date) =>
  new Intl.DateTimeFormat(undefined, { timeZone: localTimeZone(), weekday: "long" }).format(d);

export type Bucket = {
  /** stable id used for scroll anchors */
  id: string;
  label: string;
  /** sort value: newest first */
  sort: number;
  year: number;
  month: number;
  day: number;
};

/**
 * Today / Yesterday / weekday (last 7 days) / "6 August 2026" (last 30 days) /
 * "July 2026" (same year) / "2025" (older).
 */
export function bucketFor(created: string, now = new Date()): Bucket {
  const d = new Date(created);
  const p = localParts(d);
  const today = localParts(now);
  const dayNo = (x: { year: number; month: number; day: number }) =>
    Date.UTC(x.year, x.month - 1, x.day) / 86400000;
  const diff = dayNo(today) - dayNo(p);
  const sort = Date.UTC(p.year, p.month - 1, p.day);

  const base = { year: p.year, month: p.month, day: p.day, sort };
  if (diff <= 0) return { ...base, id: `d-${p.key}`, label: "Today" };
  if (diff === 1) return { ...base, id: `d-${p.key}`, label: "Yesterday" };
  if (diff < 7) return { ...base, id: `d-${p.key}`, label: WEEKDAY(d) };
  if (diff < 30)
    return { ...base, id: `d-${p.key}`, label: `${p.day} ${MONTHS[p.month - 1]} ${p.year}` };
  if (p.year === today.year)
    return {
      ...base,
      day: 0,
      id: `m-${p.year}-${String(p.month).padStart(2, "0")}`,
      label: `${MONTHS[p.month - 1]} ${p.year}`,
      sort: Date.UTC(p.year, p.month - 1, 1),
    };
  return {
    ...base,
    month: 0,
    day: 0,
    id: `y-${p.year}`,
    label: `${p.year}`,
    sort: Date.UTC(p.year, 0, 1),
  };
}

export const monthName = (m: number) => MONTHS[m - 1];
export const monthNames = MONTHS;

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 1) return null;
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/** Media classification — new kinds/extensions fall through to sensible defaults. */
export type MediaCategory = "images" | "reels" | "videos" | "podcasts" | "pdfs" | "documents" | "posts";

const DOC_EXT = ["doc", "docx", "txt", "ppt", "pptx", "xls", "xlsx", "csv", "md"];

export function categorize(post: {
  kind?: string | null;
  media_url?: string | null;
  duration_seconds?: number | null;
}): MediaCategory {
  const url = (post.media_url ?? "").split("?")[0].toLowerCase();
  const ext = url.includes(".") ? url.slice(url.lastIndexOf(".") + 1) : "";
  if (ext === "pdf") return "pdfs";
  if (DOC_EXT.includes(ext)) return "documents";
  const kind = post.kind ?? "text";
  if (kind === "photo" || ["jpg", "jpeg", "png", "webp", "gif", "avif", "heic"].includes(ext))
    return "images";
  if (kind === "podcast" || kind === "voice" || ["mp3", "m4a", "wav", "ogg"].includes(ext))
    return "podcasts";
  if (kind === "video") {
    // Portrait-first uploads are reels; long-form landscape clips are videos.
    const d = post.duration_seconds ?? 0;
    return d > 180 ? "videos" : "reels";
  }
  return "posts";
}
