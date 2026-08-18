// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export type ProfessionalProfile = any;
export type Company = any;
export type Job = any;
export type JobApplication = any;
export type Opportunity = any;
export type Proposal = any;

// -------- Professional profile --------
export async function getMyProfProfile(userId: string) {
  // Contact details / resume are owner-only; fetched via security-definer fn.
  const { data, error } = await (supabase as any).rpc("my_professional_profile");
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) ?? null;
}

export async function upsertProfProfile(patch: Partial<ProfessionalProfile> & { user_id: string }) {
  const { error } = await supabase
    .from("professional_profiles")
    .upsert(patch, { onConflict: "user_id" });
  if (error) throw error;
  return getMyProfProfile(patch.user_id);
}

export function computeStrength(p: ProfessionalProfile | null): number {
  if (!p) return 0;
  let s = 0;
  if (p.headline) s += 10;
  if (p.summary) s += 10;
  if ((p.skills?.length ?? 0) >= 3) s += 15;
  if (Array.isArray(p.experience) && (p.experience as unknown[]).length > 0) s += 20;
  if (Array.isArray(p.education) && (p.education as unknown[]).length > 0) s += 10;
  if (p.resume_url) s += 15;
  if (p.location) s += 5;
  if (p.contact_email) s += 5;
  if ((p.languages?.length ?? 0) > 0) s += 5;
  if (Array.isArray(p.portfolio) && (p.portfolio as unknown[]).length > 0) s += 5;
  return Math.min(100, s);
}

// -------- Companies --------
export async function listMyCompanies(userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCompany(input: Partial<Company> & { owner_id: string; name: string }) {
  const { data, error } = await supabase.from("companies").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function getCompany(id: string) {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

// -------- Jobs --------
export type JobFilter = {
  kind?: string;
  work_type?: string;
  q?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  skills?: string[];
};

export async function listJobs(filter: JobFilter = {}) {
  let q = supabase
    .from("jobs")
    .select("*, companies(id, name, logo_url, verification)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);
  if (filter.kind) q = q.eq("kind", filter.kind);
  if (filter.work_type) q = q.eq("work_type", filter.work_type);
  if (filter.location) q = q.ilike("location", `%${filter.location}%`);
  if (filter.q) q = q.ilike("title", `%${filter.q}%`);
  if (typeof filter.salary_min === "number") q = q.gte("salary_max", filter.salary_min);
  if (typeof filter.salary_max === "number") q = q.lte("salary_min", filter.salary_max);
  if (filter.skills && filter.skills.length) q = q.overlaps("skills", filter.skills);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getJob(id: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, companies(id, name, logo_url, verification, description, website)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createJob(input: any) {
  const { data, error } = await supabase.from("jobs").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function listMyPostedJobs(userId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select("*, companies(name, logo_url)")
    .eq("poster_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// -------- Applications --------
export async function applyToJob(input: {
  job_id: string;
  applicant_id: string;
  resume_url?: string | null;
  cover_letter?: string;
}) {
  const { data, error } = await supabase
    .from("job_applications")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * External apply: the poster published an application URL on their own site.
 * We record the application (so both sides get realtime tracking) and the
 * caller opens the destination.
 */
export async function applyExternally(input: { job_id: string; applicant_id: string; apply_url: string }) {
  const existing = await supabase
    .from("job_applications")
    .select("id, status")
    .eq("job_id", input.job_id)
    .eq("applicant_id", input.applicant_id)
    .maybeSingle();
  if (existing.data) return existing.data;
  const { data, error } = await supabase
    .from("job_applications")
    .insert({
      job_id: input.job_id,
      applicant_id: input.applicant_id,
      status: "applied",
      cover_letter: `Applied on the company website: ${input.apply_url}`,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listMyApplications(userId: string) {
  const { data, error } = await supabase
    .from("job_applications")
    .select("*, jobs(id, title, location, kind, work_type, companies(name, logo_url))")
    .eq("applicant_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listJobApplications(jobId: string) {
  const { data, error } = await supabase
    .from("job_applications")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.applicant_id)));
  if (!ids.length) return rows.map((r) => ({ ...r, applicant: null as null | { id: string; username: string | null; full_name: string | null; avatar_url: string | null } }));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, applicant: map.get(r.applicant_id) ?? null }));
}

export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  notes?: string,
) {
  const { data, error } = await supabase
    .from("job_applications")
    .update({ status, recruiter_notes: notes })
    .eq("id", applicationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getContactReveal(applicationId: string) {
  const { data, error } = await supabase
    .from("job_contact_reveals")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// -------- Opportunities --------
export async function listOpportunities(kind?: string) {
  let q = supabase
    .from("business_opportunities")
    .select("*, companies(id, name, logo_url, verification)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getOpportunity(id: string) {
  const { data, error } = await supabase
    .from("business_opportunities")
    .select("*, companies(id, name, logo_url, verification, description)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createOpportunity(input: any) {
  const { data, error } = await supabase.from("business_opportunities").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function submitProposal(input: {
  opportunity_id: string;
  proposer_id: string;
  message: string;
  proposed_amount?: number | null;
}) {
  const { data, error } = await supabase.from("business_proposals").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function listOpportunityProposals(oppId: string) {
  const { data, error } = await supabase
    .from("business_proposals")
    .select("*")
    .eq("opportunity_id", oppId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((r) => r.proposer_id)));
  if (!ids.length) return rows.map((r) => ({ ...r, proposer: null as null | { id: string; username: string | null; full_name: string | null; avatar_url: string | null } }));
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  const map = new Map((profs ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, proposer: map.get(r.proposer_id) ?? null }));
}

// -------- Storage uploads --------
export async function uploadResume(userId: string, file: File): Promise<string> {
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("resumes").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export async function signedResumeUrl(path: string, seconds = 300) {
  const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function uploadCompanyLogo(userId: string, file: File): Promise<string> {
  const path = `${userId}/logo-${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("company-logos").upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

// -------- Report --------
export async function reportCareer(input: {
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details?: string;
}) {
  const { error } = await supabase.from("career_reports").insert(input);
  if (error) throw error;
}

// -------- Saved jobs --------
export async function listSavedJobs(userId: string) {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("job_id, created_at, jobs(*, companies(id, name, logo_url, verification))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.jobs).filter(Boolean) as unknown as Job[];
}

export async function listSavedJobIds(userId: string) {
  const { data, error } = await supabase.from("saved_jobs").select("job_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.job_id));
}

export async function saveJob(userId: string, jobId: string) {
  const { error } = await supabase.from("saved_jobs").insert({ user_id: userId, job_id: jobId });
  if (error && !String(error.message).includes("duplicate")) throw error;
}

export async function unsaveJob(userId: string, jobId: string) {
  const { error } = await supabase.from("saved_jobs").delete().eq("user_id", userId).eq("job_id", jobId);
  if (error) throw error;
}

// -------- Job alerts --------
export type JobAlertInput = {
  user_id: string;
  name: string;
  query?: string | null;
  skills?: string[];
  work_type?: string | null;
  kind?: string | null;
  location?: string | null;
  salary_min?: number | null;
};

export async function listJobAlerts(userId: string) {
  const { data, error } = await supabase
    .from("job_alerts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createJobAlert(input: JobAlertInput) {
  const { data, error } = await supabase.from("job_alerts").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function toggleJobAlert(id: string, active: boolean) {
  const { error } = await supabase.from("job_alerts").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function deleteJobAlert(id: string) {
  const { error } = await supabase.from("job_alerts").delete().eq("id", id);
  if (error) throw error;
}