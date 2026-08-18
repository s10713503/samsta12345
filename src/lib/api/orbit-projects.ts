// @ts-nocheck
/**
 * Samsta Orbit — Project Hub data layer.
 * Original Samsta terminology: Orbit Projects, Appreciations, Progress Updates,
 * Collaborators, Project Assets.
 */
import { supabase as raw } from "@/integrations/supabase/client";

const sb = raw as any;

export type OrbitProjectVisibility = "public" | "private";

export type OrbitProject = {
  id: string;
  user_id: string;
  name: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  category: string | null;
  tech_stack: string[];
  languages: string[];
  frameworks: string[];
  libraries: string[];
  databases: string[];
  ai_models: string[];
  apis: string[];
  cover_url: string | null;
  demo_url: string | null;
  website_url: string | null;
  download_url: string | null;
  source_url: string | null;
  docs_url: string | null;
  timeline_start: string | null;
  timeline_end: string | null;
  deadline: string | null;
  progress: number;
  goals: string | null;
  roadmap: string | null;
  visibility: OrbitProjectVisibility;
  work_status: string;
  appreciate_count: number;
  follower_count: number;
  member_count: number;
  view_count: number;
  ai_health_score: number | null;
  ai_innovation_score: number | null;
  ai_notes: string | null;
  created_at: string;
  updated_at: string;
  owner?: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
  appreciated?: boolean;
  following?: boolean;
};

export type OrbitProjectAsset = {
  id: string; project_id: string; kind: string; title: string | null; url: string; sort_order: number; created_at: string;
};

export type OrbitProjectUpdate = {
  id: string; project_id: string; user_id: string; title: string | null; body: string; progress: number | null; created_at: string;
};

export const PROJECT_CATEGORIES = [
  "Web App", "Mobile App", "AI / ML", "Data Science", "Research", "Game",
  "Hardware / IoT", "Design", "Startup", "Open Knowledge", "Automation", "Other",
];

export const WORK_STATUS = [
  { key: "idea", label: "Idea" },
  { key: "in_progress", label: "Work in Progress" },
  { key: "review", label: "Project Review" },
  { key: "launched", label: "Launched" },
  { key: "paused", label: "Paused" },
];

const COLS = "*";

async function withOwners(rows: any[], meId: string | null): Promise<OrbitProject[]> {
  if (!rows?.length) return [];
  const ids = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await sb
    .from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
  const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  let appreciated = new Set<string>();
  let following = new Set<string>();
  if (meId) {
    const projectIds = rows.map((r) => r.id);
    const [a, f] = await Promise.all([
      sb.from("orbit_project_appreciations").select("project_id").eq("user_id", meId).in("project_id", projectIds),
      sb.from("orbit_project_follows").select("project_id").eq("user_id", meId).in("project_id", projectIds),
    ]);
    appreciated = new Set((a.data ?? []).map((r: any) => r.project_id));
    following = new Set((f.data ?? []).map((r: any) => r.project_id));
  }

  return rows.map((r) => ({
    ...r,
    owner: map.get(r.user_id) ?? null,
    appreciated: appreciated.has(r.id),
    following: following.has(r.id),
  }));
}

export type ProjectLane = "discover" | "trending" | "mine" | "following";

export async function listOrbitProjects(opts: {
  lane: ProjectLane;
  meId: string | null;
  search?: string;
  category?: string | null;
  tech?: string | null;
  limit?: number;
}): Promise<OrbitProject[]> {
  const limit = opts.limit ?? 24;
  if (opts.lane === "following" && opts.meId) {
    const { data: f } = await sb.from("orbit_project_follows").select("project_id").eq("user_id", opts.meId);
    const ids = (f ?? []).map((r: any) => r.project_id);
    if (!ids.length) return [];
    const { data } = await sb.from("orbit_projects").select(COLS).in("id", ids)
      .order("updated_at", { ascending: false }).limit(limit);
    return withOwners(data ?? [], opts.meId);
  }

  let q = sb.from("orbit_projects").select(COLS).limit(limit);
  if (opts.lane === "mine") {
    if (!opts.meId) return [];
    q = q.eq("user_id", opts.meId).order("updated_at", { ascending: false });
  } else {
    q = q.eq("visibility", "public");
    q = opts.lane === "trending"
      ? q.order("appreciate_count", { ascending: false }).order("created_at", { ascending: false })
      : q.order("created_at", { ascending: false });
  }
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.tech) q = q.contains("tech_stack", [opts.tech]);
  if (opts.search?.trim()) {
    const s = opts.search.trim();
    q = q.or(`name.ilike.%${s}%,summary.ilike.%${s}%,category.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return withOwners(data ?? [], opts.meId);
}

export async function getOrbitProject(id: string, meId: string | null): Promise<OrbitProject | null> {
  const { data } = await sb.from("orbit_projects").select(COLS).eq("id", id).maybeSingle();
  if (!data) return null;
  const [p] = await withOwners([data], meId);
  return p;
}

export async function listProjectAssets(projectId: string): Promise<OrbitProjectAsset[]> {
  const { data } = await sb.from("orbit_project_assets").select("*")
    .eq("project_id", projectId).order("sort_order").limit(60);
  return data ?? [];
}

export async function listProjectUpdates(projectId: string): Promise<OrbitProjectUpdate[]> {
  const { data } = await sb.from("orbit_project_updates").select("*")
    .eq("project_id", projectId).order("created_at", { ascending: false }).limit(60);
  return data ?? [];
}

export type ProjectMember = {
  id: string; project_id: string; user_id: string; role: string; created_at: string;
  profile?: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data } = await sb.from("orbit_project_members").select("*").eq("project_id", projectId).limit(60);
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: profiles } = await sb.from("profiles").select("id, username, full_name, avatar_url")
    .in("id", rows.map((r: any) => r.user_id));
  const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return rows.map((r: any) => ({ ...r, profile: map.get(r.user_id) ?? null }));
}

export type ProjectDraft = Partial<Omit<OrbitProject, "id" | "user_id" | "created_at" | "updated_at">> & {
  name: string;
};

function cleanArrays(patch: any) {
  const arrays = ["tech_stack", "languages", "frameworks", "libraries", "databases", "ai_models", "apis"];
  const out = { ...patch };
  for (const k of arrays) {
    if (out[k] === undefined) continue;
    out[k] = Array.isArray(out[k])
      ? out[k].map((x: string) => String(x).trim()).filter(Boolean).slice(0, 30)
      : String(out[k]).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 30);
  }
  for (const k of ["timeline_start", "timeline_end", "deadline"]) {
    if (out[k] === "") out[k] = null;
  }
  return out;
}

export async function createOrbitProject(userId: string, draft: ProjectDraft): Promise<OrbitProject> {
  if (!userId) throw new Error("Sign in to create an Orbit Project.");
  if (!draft.name?.trim()) throw new Error("Give your project a name.");
  const slug = draft.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  const payload = cleanArrays({ ...draft, name: draft.name.trim(), slug, user_id: userId });
  const { data, error } = await sb.from("orbit_projects").insert(payload).select(COLS).single();
  if (error) throw error;
  await sb.from("orbit_project_members").insert({ project_id: data.id, user_id: userId, role: "owner" });
  const [p] = await withOwners([data], userId);
  return p;
}

export async function updateOrbitProject(id: string, patch: Partial<OrbitProject>) {
  const { error } = await sb.from("orbit_projects").update(cleanArrays(patch)).eq("id", id);
  if (error) throw error;
}

export async function deleteOrbitProject(id: string) {
  const { error } = await sb.from("orbit_projects").delete().eq("id", id);
  if (error) throw error;
}

export async function duplicateOrbitProject(project: OrbitProject, userId: string) {
  const {
    id, user_id, created_at, updated_at, owner, appreciated, following,
    appreciate_count, follower_count, member_count, view_count, ...rest
  } = project as any;
  return createOrbitProject(userId, { ...rest, name: `${project.name} (copy)` });
}

export async function addProjectAsset(projectId: string, userId: string, asset: {
  kind: string; url: string; title?: string | null; sort_order?: number;
}) {
  const { error } = await sb.from("orbit_project_assets").insert({
    project_id: projectId, user_id: userId, kind: asset.kind, url: asset.url,
    title: asset.title ?? null, sort_order: asset.sort_order ?? 0,
  });
  if (error) throw error;
}

export async function removeProjectAsset(assetId: string) {
  const { error } = await sb.from("orbit_project_assets").delete().eq("id", assetId);
  if (error) throw error;
}

export async function addProjectUpdate(projectId: string, userId: string, body: string, opts?: {
  title?: string | null; progress?: number | null;
}) {
  if (!body.trim()) throw new Error("Write your progress update first.");
  const { error } = await sb.from("orbit_project_updates").insert({
    project_id: projectId, user_id: userId, body: body.trim(),
    title: opts?.title?.trim() || null, progress: opts?.progress ?? null,
  });
  if (error) throw error;
  if (typeof opts?.progress === "number") {
    await sb.from("orbit_projects").update({ progress: opts.progress }).eq("id", projectId);
  }
}

export async function toggleAppreciate(projectId: string, userId: string, on: boolean) {
  if (!userId) throw new Error("Sign in to appreciate this project.");
  if (on) {
    const { error } = await sb.from("orbit_project_appreciations").insert({ project_id: projectId, user_id: userId });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    const { error } = await sb.from("orbit_project_appreciations")
      .delete().eq("project_id", projectId).eq("user_id", userId);
    if (error) throw error;
  }
}

export async function toggleProjectFollow(projectId: string, userId: string, on: boolean) {
  if (!userId) throw new Error("Sign in to follow this project.");
  if (on) {
    const { error } = await sb.from("orbit_project_follows").insert({ project_id: projectId, user_id: userId });
    if (error && !`${error.message}`.includes("duplicate")) throw error;
  } else {
    const { error } = await sb.from("orbit_project_follows")
      .delete().eq("project_id", projectId).eq("user_id", userId);
    if (error) throw error;
  }
}

export async function inviteCollaborator(projectId: string, username: string, role = "contributor") {
  const handle = username.trim().replace(/^@/, "");
  if (!handle) throw new Error("Enter a Samsta username.");
  const { data: p } = await sb.from("profiles").select("id").ilike("username", handle).maybeSingle();
  if (!p?.id) throw new Error(`No Samsta member called @${handle}.`);
  const { error } = await sb.from("orbit_project_members")
    .insert({ project_id: projectId, user_id: p.id, role });
  if (error && !`${error.message}`.includes("duplicate")) throw error;
}

export async function removeCollaborator(memberId: string) {
  const { error } = await sb.from("orbit_project_members").delete().eq("id", memberId);
  if (error) throw error;
}

export async function bumpProjectView(projectId: string, current: number) {
  await sb.from("orbit_projects").update({ view_count: current + 1 }).eq("id", projectId);
}

/** One shared realtime channel for the whole Project Hub surface. */
export function subscribeProjects(onChange: () => void) {
  const ch = sb
    .channel("orbit-projects-rt")
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_projects" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_project_updates" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_project_appreciations" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "orbit_project_follows" }, onChange)
    .subscribe();
  return () => { sb.removeChannel(ch); };
}

/** Upload a project image/file to the media bucket and return a signed URL. */
export async function uploadProjectFile(userId: string, file: File, folder = "projects") {
  const ext = (file.name.split(".").pop() ?? "bin").toLowerCase();
  const path = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await sb.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = await sb.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
  return data?.signedUrl as string;
}
