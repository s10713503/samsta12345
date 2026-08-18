// @ts-nocheck
/**
 * Samsta Orbit — Workspace tools for Orbit Projects.
 * Original Samsta terminology: Task Board, Work Streams, Merge Proposals,
 * Knowledge Hub, Labels, Analytics Dashboard.
 */
import { supabase as raw } from "@/integrations/supabase/client";

const sb = raw as any;

export const TASK_STATUS = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export const TASK_PRIORITY = ["low", "normal", "high", "urgent"];

export type ProjectTask = {
  id: string; project_id: string; user_id: string; stream_id: string | null;
  title: string; details: string | null; status: string; priority: string;
  assignee_id: string | null; labels: string[]; due_at: string | null;
  sort_order: number; created_at: string; updated_at: string;
};

export type WorkStream = {
  id: string; project_id: string; user_id: string; name: string;
  description: string | null; status: string; is_primary: boolean;
  created_at: string; updated_at: string;
};

export type MergeProposal = {
  id: string; project_id: string; user_id: string;
  from_stream_id: string | null; into_stream_id: string | null;
  title: string; notes: string | null; state: string;
  reviewer_id: string | null; reviewed_at: string | null; created_at: string;
};

export type KnowledgeNote = {
  id: string; project_id: string; user_id: string; title: string;
  body: string; pinned: boolean; created_at: string; updated_at: string;
};

export type ProjectLabel = {
  id: string; project_id: string; name: string; color: string; created_at: string;
};

/* ---------------- Task Board ---------------- */

export async function listTasks(projectId: string): Promise<ProjectTask[]> {
  const { data, error } = await sb.from("orbit_project_tasks").select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return data ?? [];
}

export async function createTask(projectId: string, userId: string, task: {
  title: string; details?: string | null; status?: string; priority?: string;
  stream_id?: string | null; assignee_id?: string | null; labels?: string[]; due_at?: string | null;
}) {
  if (!userId) throw new Error("Sign in to add tasks.");
  if (!task.title?.trim()) throw new Error("Give the task a title.");
  const { error } = await sb.from("orbit_project_tasks").insert({
    project_id: projectId, user_id: userId, title: task.title.trim(),
    details: task.details?.trim() || null, status: task.status ?? "backlog",
    priority: task.priority ?? "normal", stream_id: task.stream_id ?? null,
    assignee_id: task.assignee_id ?? null, labels: task.labels ?? [],
    due_at: task.due_at || null,
  });
  if (error) throw error;
}

export async function updateTask(id: string, patch: Partial<ProjectTask>) {
  const { error } = await sb.from("orbit_project_tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await sb.from("orbit_project_tasks").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Work Streams ---------------- */

export async function listStreams(projectId: string): Promise<WorkStream[]> {
  const { data, error } = await sb.from("orbit_project_streams").select("*")
    .eq("project_id", projectId).order("created_at", { ascending: true }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createStream(projectId: string, userId: string, name: string, description?: string) {
  if (!userId) throw new Error("Sign in to open a work stream.");
  if (!name.trim()) throw new Error("Name your work stream.");
  const { error } = await sb.from("orbit_project_streams").insert({
    project_id: projectId, user_id: userId, name: name.trim(),
    description: description?.trim() || null,
  });
  if (error) throw error;
}

export async function updateStream(id: string, patch: Partial<WorkStream>) {
  const { error } = await sb.from("orbit_project_streams").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteStream(id: string) {
  const { error } = await sb.from("orbit_project_streams").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Merge Proposals ---------------- */

export async function listMerges(projectId: string): Promise<MergeProposal[]> {
  const { data, error } = await sb.from("orbit_project_merges").select("*")
    .eq("project_id", projectId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createMerge(projectId: string, userId: string, m: {
  title: string; notes?: string; from_stream_id?: string | null; into_stream_id?: string | null;
}) {
  if (!userId) throw new Error("Sign in to raise a merge proposal.");
  if (!m.title.trim()) throw new Error("Describe what you're merging.");
  const { error } = await sb.from("orbit_project_merges").insert({
    project_id: projectId, user_id: userId, title: m.title.trim(),
    notes: m.notes?.trim() || null,
    from_stream_id: m.from_stream_id ?? null, into_stream_id: m.into_stream_id ?? null,
  });
  if (error) throw error;
}

export async function reviewMerge(id: string, state: "accepted" | "declined", reviewerId: string) {
  const { error } = await sb.from("orbit_project_merges")
    .update({ state, reviewer_id: reviewerId, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMerge(id: string) {
  const { error } = await sb.from("orbit_project_merges").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Knowledge Hub ---------------- */

export async function listNotes(projectId: string): Promise<KnowledgeNote[]> {
  const { data, error } = await sb.from("orbit_project_notes").select("*")
    .eq("project_id", projectId)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function createNote(projectId: string, userId: string, title: string, body: string) {
  if (!userId) throw new Error("Sign in to write in the Knowledge Hub.");
  if (!title.trim()) throw new Error("Give this entry a title.");
  const { error } = await sb.from("orbit_project_notes").insert({
    project_id: projectId, user_id: userId, title: title.trim(), body: body.trim(),
  });
  if (error) throw error;
}

export async function updateNote(id: string, patch: Partial<KnowledgeNote>) {
  const { error } = await sb.from("orbit_project_notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string) {
  const { error } = await sb.from("orbit_project_notes").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Labels ---------------- */

export async function listLabels(projectId: string): Promise<ProjectLabel[]> {
  const { data } = await sb.from("orbit_project_labels").select("*")
    .eq("project_id", projectId).order("created_at").limit(60);
  return data ?? [];
}

export async function createLabel(projectId: string, userId: string, name: string, color = "primary") {
  if (!name.trim()) throw new Error("Name the label.");
  const { error } = await sb.from("orbit_project_labels")
    .insert({ project_id: projectId, user_id: userId, name: name.trim(), color });
  if (error && !`${error.message}`.includes("duplicate")) throw error;
}

export async function deleteLabel(id: string) {
  const { error } = await sb.from("orbit_project_labels").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- Analytics Dashboard ---------------- */

export type ProjectAnalytics = {
  views: number; appreciations: number; followers: number; collaborators: number;
  tasksDone: number; tasksTotal: number; completion: number;
  openStreams: number; openProposals: number; knowledgeEntries: number;
  updatesThisWeek: number; updatesThisMonth: number;
  weekly: { day: string; updates: number }[];
  techUsage: { name: string; count: number }[];
};

export async function getProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
  const [pRes, tasks, streams, merges, notes, updates] = await Promise.all([
    sb.from("orbit_projects")
      .select("view_count, appreciate_count, follower_count, member_count, tech_stack")
      .eq("id", projectId).maybeSingle(),
    listTasks(projectId),
    listStreams(projectId),
    listMerges(projectId),
    listNotes(projectId),
    sb.from("orbit_project_updates").select("created_at").eq("project_id", projectId).limit(500),
  ]);
  const p = pRes?.data ?? {};
  const rows = updates?.data ?? [];
  const now = Date.now();
  const within = (days: number) =>
    rows.filter((r: any) => now - new Date(r.created_at).getTime() < days * 86400_000).length;

  const weekly = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86400_000);
    const key = d.toDateString();
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      updates: rows.filter((r: any) => new Date(r.created_at).toDateString() === key).length,
    };
  });

  const tasksDone = tasks.filter((t) => t.status === "done").length;

  return {
    views: p.view_count ?? 0,
    appreciations: p.appreciate_count ?? 0,
    followers: p.follower_count ?? 0,
    collaborators: p.member_count ?? 0,
    tasksDone,
    tasksTotal: tasks.length,
    completion: tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0,
    openStreams: streams.filter((s) => s.status === "active").length,
    openProposals: merges.filter((m) => m.state === "open").length,
    knowledgeEntries: notes.length,
    updatesThisWeek: within(7),
    updatesThisMonth: within(30),
    weekly,
    techUsage: (p.tech_stack ?? []).map((name: string) => ({ name, count: 1 })),
  };
}

/** Shared realtime channel for every workspace tool. */
export function subscribeWorkspace(projectId: string, onChange: () => void) {
  const ch = sb
    .channel(`orbit-workspace-${projectId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_project_tasks" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_project_streams" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_project_merges" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_project_notes" }, onChange)
    .subscribe();
  return () => { sb.removeChannel(ch); };
}
