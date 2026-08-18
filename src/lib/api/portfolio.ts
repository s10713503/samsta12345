// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export type PortfolioProfile = any;
export type PortfolioProject = any;
export type PortfolioSkill = any;
export type PortfolioExperience = any;
export type PortfolioEducation = any;
export type PortfolioCertificate = any;
export type PortfolioPublication = any;
export type PortfolioResume = any;
export type PortfolioEndorsement = any;
export type PortfolioView = any;
export type PortfolioSettings = any;

/* ---------- profile ---------- */
export async function getMyPortfolio(userId: string) {
  const { data, error } = await supabase.from("portfolio_profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertPortfolio(p: Partial<PortfolioProfile> & { user_id: string }) {
  const { data, error } = await supabase.from("portfolio_profiles").upsert(p, { onConflict: "user_id" }).select().single();
  if (error) throw error;
  return data;
}
export async function getPortfolioByUsername(username: string) {
  const { data, error } = await supabase.from("portfolio_profiles").select("*").eq("username", username).maybeSingle();
  if (error) throw error;
  return data;
}

/* ---------- projects ---------- */
export async function listProjects(userId: string) {
  const { data, error } = await supabase.from("portfolio_projects").select("*").eq("user_id", userId).order("position").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function saveProject(input: Partial<PortfolioProject> & { user_id: string; title: string }) {
  const { data, error } = await supabase.from("portfolio_projects").upsert(input).select().single();
  if (error) throw error;
  return data;
}
export async function deleteProject(id: string) {
  const { error } = await supabase.from("portfolio_projects").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- skills ---------- */
export async function listSkills(userId: string) {
  const { data, error } = await supabase.from("portfolio_skills").select("*").eq("user_id", userId).order("position");
  if (error) throw error;
  return data ?? [];
}
export async function saveSkill(input: Partial<PortfolioSkill> & { user_id: string; name: string }) {
  const { data, error } = await supabase.from("portfolio_skills").upsert(input).select().single();
  if (error) throw error;
  return data;
}
export async function deleteSkill(id: string) {
  const { error } = await supabase.from("portfolio_skills").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- experiences ---------- */
export async function listExperiences(userId: string) {
  const { data, error } = await supabase.from("portfolio_experiences").select("*").eq("user_id", userId).order("started_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
export async function saveExperience(input: Partial<PortfolioExperience> & { user_id: string; title: string; kind: PortfolioExperience["kind"] }) {
  const { data, error } = await supabase.from("portfolio_experiences").upsert(input).select().single();
  if (error) throw error;
  return data;
}
export async function deleteExperience(id: string) {
  const { error } = await supabase.from("portfolio_experiences").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- education ---------- */
export async function listEducation(userId: string) {
  const { data, error } = await supabase.from("portfolio_education").select("*").eq("user_id", userId).order("started_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
export async function saveEducation(input: Partial<PortfolioEducation> & { user_id: string; school: string }) {
  const { data, error } = await supabase.from("portfolio_education").upsert(input).select().single();
  if (error) throw error;
  return data;
}
export async function deleteEducation(id: string) {
  const { error } = await supabase.from("portfolio_education").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- certificates ---------- */
export async function listCertificates(userId: string) {
  const { data, error } = await supabase.from("portfolio_certificates").select("*").eq("user_id", userId).order("issued_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
export async function saveCertificate(input: Partial<PortfolioCertificate> & { user_id: string; title: string }) {
  const { data, error } = await supabase.from("portfolio_certificates").upsert(input).select().single();
  if (error) throw error;
  return data;
}
export async function deleteCertificate(id: string) {
  const { error } = await supabase.from("portfolio_certificates").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- publications ---------- */
export async function listPublications(userId: string) {
  const { data, error } = await supabase.from("portfolio_publications").select("*").eq("user_id", userId).order("published_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}
export async function savePublication(input: Partial<PortfolioPublication> & { user_id: string; title: string }) {
  const { data, error } = await supabase.from("portfolio_publications").upsert(input).select().single();
  if (error) throw error;
  return data;
}
export async function deletePublication(id: string) {
  const { error } = await supabase.from("portfolio_publications").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- resumes ---------- */
export async function listResumes(userId: string) {
  const { data, error } = await supabase.from("portfolio_resumes").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function saveResume(input: Partial<PortfolioResume> & { user_id: string }) {
  const { data, error } = await supabase.from("portfolio_resumes").upsert(input).select().single();
  if (error) throw error;
  return data;
}
export async function deleteResume(id: string) {
  const { error } = await supabase.from("portfolio_resumes").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- endorsements ---------- */
export async function listEndorsements(targetUserId: string) {
  const { data, error } = await supabase.from("portfolio_endorsements").select("*").eq("target_user_id", targetUserId).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function addEndorsement(input: { target_user_id: string; endorser_id: string; kind: "recommendation" | "skill_endorsement"; skill_name?: string | null; message?: string | null }) {
  const { data, error } = await supabase.from("portfolio_endorsements").insert(input).select().single();
  if (error) throw error;
  return data;
}

/* ---------- analytics ---------- */
export async function recordView(input: { owner_id: string; kind?: PortfolioView["kind"]; target_id?: string | null; referrer?: string | null }) {
  const { error } = await supabase.from("portfolio_views").insert({
    owner_id: input.owner_id,
    kind: input.kind ?? "portfolio",
    target_id: input.target_id ?? null,
    referrer: input.referrer ?? (typeof document !== "undefined" ? document.referrer : null),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  });
  if (error) throw error;
}
export async function listViews(ownerId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase.from("portfolio_views").select("*").eq("owner_id", ownerId).gte("created_at", since).order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/* ---------- settings ---------- */
export async function getSettings(userId: string) {
  const { data, error } = await supabase.from("portfolio_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
export async function upsertSettings(s: Partial<PortfolioSettings> & { user_id: string }) {
  const { data, error } = await supabase.from("portfolio_settings").upsert(s, { onConflict: "user_id" }).select().single();
  if (error) throw error;
  return data;
}

/* ---------- scoring ---------- */
export function localScore(bits: {
  profile: PortfolioProfile | null;
  projects: PortfolioProject[];
  skills: PortfolioSkill[];
  experiences: PortfolioExperience[];
  education: PortfolioEducation[];
  certificates: PortfolioCertificate[];
  resume?: PortfolioResume | null;
}) {
  let s = 0;
  const { profile, projects, skills, experiences, education, certificates, resume } = bits;
  if (profile?.tagline) s += 8;
  if (profile?.bio) s += 8;
  if (profile?.avatar_url) s += 4;
  if (profile?.cover_url) s += 4;
  if (profile?.website || (profile?.socials && Object.keys(profile.socials as object).length)) s += 4;
  if (projects.length >= 1) s += 10;
  if (projects.length >= 3) s += 8;
  if (projects.some((p) => p.live_url)) s += 4;
  if (projects.some((p) => p.github_url)) s += 3;
  if (skills.length >= 5) s += 10;
  if (experiences.length >= 1) s += 10;
  if (experiences.length >= 3) s += 5;
  if (education.length >= 1) s += 6;
  if (certificates.length >= 1) s += 5;
  if (resume?.pdf_path || resume?.raw_text) s += 8;
  if (profile?.verified) s += 3;
  return Math.min(100, s);
}