// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// Types are intentionally loose here — the generated Database types haven't
// been refreshed yet for the new ai_career_* tables. Everything is scoped
// through RLS by user_id.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type CareerGoal = { id: string; user_id: string; title: string; description: string | null; target_role: string | null; target_date: string | null; priority: string; status: string; progress: number; meta: unknown; created_at: string; updated_at: string };
export type CareerTask = { id: string; user_id: string; goal_id: string | null; title: string; details: string | null; due_date: string | null; status: string; priority: string; cadence: string; completed_at: string | null; created_at: string; updated_at: string };
export type CareerMilestone = { id: string; user_id: string; title: string; category: string | null; achieved_at: string | null; achieved: boolean; notes: string | null };
export type CareerReport = { id: string; user_id: string; week_start: string; summary: unknown; score: number | null; created_at: string };
export type CareerReminder = { id: string; user_id: string; title: string; remind_at: string; channel: string; recurrence: string | null; active: boolean };
export type CareerRoadmap = { id: string; user_id: string; title: string; from_role: string | null; target_role: string | null; plan: unknown; active: boolean };
export type CareerResume = { id: string; user_id: string; title: string; template: string; language: string; content: unknown; ats_score: number | null; version: number; pdf_url: string | null };
export type CareerCoverLetter = { id: string; user_id: string; job_title: string | null; company: string | null; body: string; created_at: string };
export type CareerInterview = { id: string; user_id: string; kind: string; role: string | null; company: string | null; mode: string; transcript: unknown; scores: unknown; feedback: string | null; duration_sec: number | null; created_at: string };
export type CareerApplication = { id: string; user_id: string; job_title: string; company: string; source: string | null; external_url: string | null; status: string; applied_at: string; notes: string | null };
export type CareerLearningPath = { id: string; user_id: string; title: string; target_role: string | null; path: unknown; progress: number };
export type CareerScore = { id: string; user_id: string; kind: string; score: number; breakdown: unknown; captured_at: string };
export type CareerMentor = { id: string; user_id: string; mentor_name: string; mentor_role: string | null; expertise: string[] | null; status: string; contact: string | null; notes: string | null };
export type CareerNotification = { id: string; user_id: string; title: string; body: string | null; kind: string; read: boolean; created_at: string };

async function list<R>(table: string, userId: string, orderCol = "created_at"): Promise<R[]> {
  const { data, error } = await sb.from(table).select("*").eq("user_id", userId).order(orderCol, { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as R[];
}

export const listGoals = (u: string) => list<CareerGoal>("ai_career_goals", u);
export const listTasks = (u: string) => list<CareerTask>("ai_career_tasks", u, "due_date");
export const listMilestones = (u: string) => list<CareerMilestone>("ai_career_milestones", u);
export const listReports = (u: string) => list<CareerReport>("ai_career_reports", u);
export const listReminders = (u: string) => list<CareerReminder>("ai_career_reminders", u, "remind_at");
export const listRoadmaps = (u: string) => list<CareerRoadmap>("ai_career_roadmaps", u);
export const listResumes = (u: string) => list<CareerResume>("ai_career_resumes", u);
export const listCoverLetters = (u: string) => list<CareerCoverLetter>("ai_career_cover_letters", u);
export const listInterviews = (u: string) => list<CareerInterview>("ai_career_interviews", u);
export const listApplications = (u: string) => list<CareerApplication>("ai_career_applications", u, "applied_at");
export const listLearningPaths = (u: string) => list<CareerLearningPath>("ai_career_learning_paths", u);
export const listScores = (u: string) => list<CareerScore>("ai_career_scores", u, "captured_at");
export const listMentors = (u: string) => list<CareerMentor>("ai_career_mentors", u);
export const listNotifications = (u: string) => list<CareerNotification>("ai_career_notifications", u);

async function ins<R>(table: string, input: Record<string, unknown>): Promise<R> {
  const { data, error } = await sb.from(table).insert(input).select().single();
  if (error) throw error; return data as R;
}
async function upd(table: string, id: string, patch: Record<string, unknown>) {
  const { error } = await sb.from(table).update(patch).eq("id", id); if (error) throw error;
}
async function del(table: string, id: string) {
  const { error } = await sb.from(table).delete().eq("id", id); if (error) throw error;
}

export const createGoal = (i: Partial<CareerGoal> & { user_id: string; title: string }) => ins<CareerGoal>("ai_career_goals", i);
export const updateGoal = (id: string, p: Partial<CareerGoal>) => upd("ai_career_goals", id, p);
export const deleteGoal = (id: string) => del("ai_career_goals", id);

export const createTask = (i: Partial<CareerTask> & { user_id: string; title: string }) => ins<CareerTask>("ai_career_tasks", i);
export const toggleTask = (id: string, done: boolean) => upd("ai_career_tasks", id, { status: done ? "done" : "pending", completed_at: done ? new Date().toISOString() : null });
export const deleteTask = (id: string) => del("ai_career_tasks", id);

export const createMilestone = (i: Partial<CareerMilestone> & { user_id: string; title: string }) => ins<CareerMilestone>("ai_career_milestones", i);
export const achieveMilestone = (id: string, achieved: boolean) => upd("ai_career_milestones", id, { achieved, achieved_at: achieved ? new Date().toISOString().slice(0, 10) : null });

export const saveRoadmap = (i: Partial<CareerRoadmap> & { user_id: string; title: string }) => ins<CareerRoadmap>("ai_career_roadmaps", i);
export const saveResume = (i: Partial<CareerResume> & { user_id: string; title: string }) => ins<CareerResume>("ai_career_resumes", i);
export const saveCoverLetter = (i: Partial<CareerCoverLetter> & { user_id: string; body: string }) => ins<CareerCoverLetter>("ai_career_cover_letters", i);
export const saveInterview = (i: Partial<CareerInterview> & { user_id: string }) => ins<CareerInterview>("ai_career_interviews", i);
export const trackApplication = (i: Partial<CareerApplication> & { user_id: string; job_title: string; company: string }) => ins<CareerApplication>("ai_career_applications", i);
export const updateApplication = (id: string, p: Partial<CareerApplication>) => upd("ai_career_applications", id, p);
export const saveLearningPath = (i: Partial<CareerLearningPath> & { user_id: string; title: string }) => ins<CareerLearningPath>("ai_career_learning_paths", i);
export const recordScore = (i: Partial<CareerScore> & { user_id: string; kind: string; score: number }) => ins<CareerScore>("ai_career_scores", i);
export const addReminder = (i: Partial<CareerReminder> & { user_id: string; title: string; remind_at: string }) => ins<CareerReminder>("ai_career_reminders", i);
export const addMentor = (i: Partial<CareerMentor> & { user_id: string; mentor_name: string }) => ins<CareerMentor>("ai_career_mentors", i);

export async function markNotificationRead(id: string) {
  const { error } = await sb.from("ai_career_notifications").update({ read: true }).eq("id", id);
  if (error) throw error;
}

export async function logActivity(user_id: string, action: string, meta: Record<string, unknown> = {}) {
  await sb.from("ai_career_activity_logs").insert({ user_id, action, meta });
}

export function computeGrowthScore(input: {
  goals: number; tasksDone: number; milestones: number; applications: number; interviews: number; learningPaths: number;
}): number {
  const s =
    Math.min(20, input.goals * 5) +
    Math.min(25, input.tasksDone * 2) +
    Math.min(20, input.milestones * 5) +
    Math.min(15, input.applications * 3) +
    Math.min(10, input.interviews * 3) +
    Math.min(10, input.learningPaths * 5);
  return Math.min(100, s);
}