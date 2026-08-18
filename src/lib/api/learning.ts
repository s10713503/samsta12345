// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

export type LearningProfile = {
  user_id: string;
  education_level: string | null;
  interests: string[];
  goals: string | null;
  daily_goal_minutes: number;
  preferred_language: string | null;
  streak_days: number;
  last_active_date: string | null;
  xp: number;
};

export async function getProfile(userId: string): Promise<LearningProfile | null> {
  const { data } = await sb.from("learning_profile").select("*").eq("user_id", userId).maybeSingle();
  return data ?? null;
}

export async function upsertProfile(userId: string, patch: Partial<LearningProfile>) {
  const { data, error } = await sb
    .from("learning_profile")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data as LearningProfile;
}

export async function bumpStreakAndXp(userId: string, minutes: number, xp: number) {
  const profile = await getProfile(userId);
  const today = new Date().toISOString().slice(0, 10);
  const last = profile?.last_active_date ?? null;
  let streak = profile?.streak_days ?? 0;
  if (last !== today) {
    const yest = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    streak = last === yest ? streak + 1 : 1;
  }
  await upsertProfile(userId, {
    streak_days: streak,
    last_active_date: today,
    xp: (profile?.xp ?? 0) + xp,
  });
  await sb.from("learning_progress").insert({ user_id: userId, minutes, score: xp });
  return { streak, xp: (profile?.xp ?? 0) + xp };
}

export type LessonRow = {
  id: string; topic: string; category: string | null; kind: string; content: string; created_at: string;
};

export async function saveLesson(
  userId: string,
  input: { topic: string; category?: string; kind: string; content: string; source_meta?: Record<string, unknown> },
): Promise<LessonRow> {
  const { data, error } = await sb.from("learning_lessons").insert({ user_id: userId, ...input }).select().single();
  if (error) throw error;
  return data as LessonRow;
}

export async function listLessons(userId: string, limit = 20): Promise<LessonRow[]> {
  const { data } = await sb.from("learning_lessons").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return (data as LessonRow[]) ?? [];
}

export type Flashcard = {
  id: string; topic: string | null; front: string; back: string; ease: number; interval_days: number;
  next_review: string; correct_count: number; wrong_count: number;
};

export async function listDueFlashcards(userId: string): Promise<Flashcard[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await sb.from("learning_flashcards").select("*").eq("user_id", userId).lte("next_review", today).order("next_review", { ascending: true }).limit(50);
  return (data as Flashcard[]) ?? [];
}

export async function insertFlashcards(userId: string, topic: string, cards: Array<{ front: string; back: string }>) {
  if (!cards.length) return;
  const rows = cards.map((c) => ({ user_id: userId, topic, front: c.front, back: c.back }));
  await sb.from("learning_flashcards").insert(rows);
}

export async function reviewFlashcard(id: string, quality: "again" | "hard" | "good" | "easy") {
  const { data } = await sb.from("learning_flashcards").select("*").eq("id", id).single();
  if (!data) return;
  const card = data as Flashcard;
  let ease = card.ease;
  let interval = card.interval_days;
  let correct = card.correct_count;
  let wrong = card.wrong_count;
  if (quality === "again") { ease = Math.max(1.3, ease - 0.2); interval = 1; wrong += 1; }
  else if (quality === "hard") { ease = Math.max(1.3, ease - 0.1); interval = Math.max(1, Math.round(interval * 1.2)); correct += 1; }
  else if (quality === "good") { interval = Math.max(1, Math.round(interval * ease)); correct += 1; }
  else { ease = ease + 0.15; interval = Math.max(1, Math.round(interval * ease * 1.3)); correct += 1; }
  const next = new Date(Date.now() + interval * 86_400_000).toISOString().slice(0, 10);
  await sb.from("learning_flashcards").update({ ease, interval_days: interval, next_review: next, correct_count: correct, wrong_count: wrong }).eq("id", id);
}

export type QuizRow = {
  id: string; topic: string; kind: string; questions: Array<{ q: string; choices: string[]; answer: number; explain?: string; difficulty?: string }>;
  answers: number[] | null; score: number | null; total: number | null; taken_at: string;
};

export async function saveQuiz(userId: string, topic: string, kind: "quiz" | "mock_test", questions: QuizRow["questions"]) {
  const { data, error } = await sb.from("learning_quizzes").insert({ user_id: userId, topic, kind, questions, total: questions.length }).select().single();
  if (error) throw error;
  return data as QuizRow;
}

export async function finishQuiz(id: string, answers: number[], score: number) {
  await sb.from("learning_quizzes").update({ answers, score }).eq("id", id);
}

export async function listQuizzes(userId: string, limit = 10): Promise<QuizRow[]> {
  const { data } = await sb.from("learning_quizzes").select("*").eq("user_id", userId).order("taken_at", { ascending: false }).limit(limit);
  return (data as QuizRow[]) ?? [];
}

export type Badge = { id: string; badge_key: string; title: string; description: string | null; earned_at: string };

export async function grantBadge(userId: string, key: string, title: string, description?: string) {
  await sb.from("learning_badges").upsert({ user_id: userId, badge_key: key, title, description }, { onConflict: "user_id,badge_key" });
}

export async function listBadges(userId: string): Promise<Badge[]> {
  const { data } = await sb.from("learning_badges").select("*").eq("user_id", userId).order("earned_at", { ascending: false });
  return (data as Badge[]) ?? [];
}

export type Goal = { id: string; title: string; detail: string | null; target_date: string | null; progress: number; done: boolean; created_at: string };

export async function listGoals(userId: string): Promise<Goal[]> {
  const { data } = await sb.from("learning_goals").select("*").eq("user_id", userId).order("done", { ascending: true }).order("created_at", { ascending: false });
  return (data as Goal[]) ?? [];
}

export async function addGoal(userId: string, title: string, detail?: string, target_date?: string) {
  const { data, error } = await sb.from("learning_goals").insert({ user_id: userId, title, detail, target_date }).select().single();
  if (error) throw error;
  return data as Goal;
}

export async function updateGoal(id: string, patch: Partial<Goal>) {
  await sb.from("learning_goals").update(patch).eq("id", id);
}

export async function deleteGoal(id: string) {
  await sb.from("learning_goals").delete().eq("id", id);
}

export async function progressStats(userId: string) {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: recent }, { data: all }] = await Promise.all([
    sb.from("learning_progress").select("minutes, completed_at, score").eq("user_id", userId).gte("completed_at", since),
    sb.from("learning_progress").select("minutes, score").eq("user_id", userId),
  ]);
  const week = (recent ?? []) as Array<{ minutes: number; completed_at: string; score: number | null }>;
  const total = (all ?? []) as Array<{ minutes: number; score: number | null }>;
  const byDay: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    byDay[d] = 0;
  }
  week.forEach((r) => {
    const d = r.completed_at.slice(0, 10);
    if (d in byDay) byDay[d] += r.minutes || 0;
  });
  return {
    minutesTotal: total.reduce((s, r) => s + (r.minutes || 0), 0),
    sessionsTotal: total.length,
    weekChart: byDay,
    weekMinutes: Object.values(byDay).reduce((s, v) => s + v, 0),
  };
}
