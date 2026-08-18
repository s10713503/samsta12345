// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// Types are loose to survive types.ts regeneration timing.
export type Company = {
  id: string;
  owner_id: string;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  description?: string | null;
  industry?: string | null;
  size?: string | null;
  founded_year?: number | null;
  headquarters?: string | null;
  website?: string | null;
  socials?: Record<string, string> | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  tech_stack?: string[] | null;
  benefits?: string[] | null;
  offices?: string[] | null;
  verification?: string | null;
  is_hiring?: boolean | null;
  created_at?: string;
};

export type CompanyReview = {
  id: string; company_id: string; reviewer_id: string; kind: string;
  title: string | null; body: string | null; pros: string | null; cons: string | null;
  rating: number | null; ceo_rating: number | null; culture_rating: number | null;
  diversity_rating: number | null; wlb_rating: number | null; growth_rating: number | null;
  is_anonymous: boolean; interview_stage: string | null; interview_outcome: string | null;
  employment_status: string | null; created_at: string;
};
export type CompanyUpdate = { id: string; company_id: string; author_id: string; kind: string; title: string | null; body: string; media: unknown; created_at: string; };
export type CompanyRecruiter = { id: string; company_id: string; user_id: string; title: string | null; bio: string | null; verified: boolean; created_at: string };
export type CompanyEvent = { id: string; company_id: string; title: string; description: string | null; kind: string; starts_at: string | null; ends_at: string | null; location: string | null; url: string | null; created_at: string };
export type CompanyDiscussion = { id: string; company_id: string; author_id: string; title: string; body: string | null; tags: string[]; created_at: string };
export type CompanyPartnershipReq = { id: string; company_id: string; from_user_id: string; kind: string; message: string; budget: number | null; currency: string | null; status: string; created_at: string };
export type CompanyMetric = { id: string; company_id: string; period_start: string; employees: number | null; hires: number | null; openings: number | null; revenue_usd: number | null; funding_usd: number | null; extra: Record<string, unknown>; created_at: string };

const s = supabase as unknown as { from: (t: string) => any; channel: (n: string) => any };

// ---------- Companies ----------
export async function listCompanies(q?: string, industry?: string) {
  let query = s.from("companies").select("*").order("created_at", { ascending: false }).limit(60);
  if (q) query = query.ilike("name", `%${q}%`);
  if (industry) query = query.eq("industry", industry);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Company[];
}
export async function getCompany(id: string) {
  const { data, error } = await s.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Company | null;
}
export async function upsertCompany(input: Partial<Company> & { owner_id: string; name: string }) {
  const { data, error } = await s.from("companies").upsert(input).select().single();
  if (error) throw error;
  return data as Company;
}
export async function logCompanyView(companyId: string, viewerId: string | null, path?: string) {
  await s.from("company_page_views").insert({ company_id: companyId, viewer_id: viewerId, path: path ?? null });
}

// ---------- Follows ----------
export async function listFollowing(userId: string) {
  const { data, error } = await s.from("company_follows").select("company_id").eq("user_id", userId);
  if (error) throw error;
  return new Set(((data ?? []) as { company_id: string }[]).map((r) => r.company_id));
}
export async function follow(companyId: string, userId: string) {
  const { error } = await s.from("company_follows").insert({ company_id: companyId, user_id: userId });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function unfollow(companyId: string, userId: string) {
  await s.from("company_follows").delete().eq("company_id", companyId).eq("user_id", userId);
}
export async function followerCount(companyId: string) {
  const { count } = await s.from("company_follows").select("id", { count: "exact", head: true }).eq("company_id", companyId);
  return count ?? 0;
}

// ---------- Reviews ----------
export async function listReviews(companyId: string) {
  const { data, error } = await s.from("company_reviews").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as CompanyReview[];
}
export async function postReview(input: Partial<CompanyReview> & { company_id: string; reviewer_id: string }) {
  const { data, error } = await s.from("company_reviews").insert(input).select().single();
  if (error) throw error;
  return data as CompanyReview;
}
export function ratingSummary(reviews: CompanyReview[]) {
  if (!reviews.length) return null;
  const avg = (f: keyof CompanyReview) => {
    const vals = reviews.map((r) => r[f] as number | null).filter((v): v is number => typeof v === "number");
    return vals.length ? +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
  };
  return {
    overall: avg("rating"),
    ceo: avg("ceo_rating"),
    culture: avg("culture_rating"),
    diversity: avg("diversity_rating"),
    wlb: avg("wlb_rating"),
    growth: avg("growth_rating"),
    total: reviews.length,
  };
}

// ---------- Updates ----------
export async function listUpdates(companyId: string) {
  const { data, error } = await s.from("company_updates").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []) as CompanyUpdate[];
}
export async function postUpdate(input: { company_id: string; author_id: string; kind?: string; title?: string | null; body: string; media?: unknown }) {
  const { data, error } = await s.from("company_updates").insert(input).select().single();
  if (error) throw error;
  return data as CompanyUpdate;
}

// ---------- Recruiters ----------
export async function listRecruiters(companyId: string) {
  const { data, error } = await s.from("company_recruiters").select("*").eq("company_id", companyId);
  if (error) throw error;
  return (data ?? []) as CompanyRecruiter[];
}
export async function upsertRecruiter(input: { company_id: string; user_id: string; title?: string; bio?: string }) {
  const { data, error } = await s.from("company_recruiters").upsert(input, { onConflict: "company_id,user_id" }).select().single();
  if (error) throw error;
  return data as CompanyRecruiter;
}

// ---------- Events ----------
export async function listEvents(companyId: string) {
  const { data, error } = await s.from("company_events").select("*").eq("company_id", companyId).order("starts_at", { ascending: true }).limit(30);
  if (error) throw error;
  return (data ?? []) as CompanyEvent[];
}
export async function postEvent(input: Partial<CompanyEvent> & { company_id: string; author_id: string; title: string }) {
  const { data, error } = await s.from("company_events").insert(input).select().single();
  if (error) throw error;
  return data as CompanyEvent;
}

// ---------- Discussions ----------
export async function listDiscussions(companyId: string) {
  const { data, error } = await s.from("company_discussions").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as CompanyDiscussion[];
}
export async function postDiscussion(input: { company_id: string; author_id: string; title: string; body?: string; tags?: string[] }) {
  const { data, error } = await s.from("company_discussions").insert(input).select().single();
  if (error) throw error;
  return data as CompanyDiscussion;
}

// ---------- Partnership requests ----------
export async function listPartnershipRequests(companyId: string) {
  const { data, error } = await s.from("company_partnership_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CompanyPartnershipReq[];
}
export async function sendPartnershipRequest(input: { company_id: string; from_user_id: string; kind: string; message: string; budget?: number; currency?: string }) {
  const { data, error } = await s.from("company_partnership_requests").insert(input).select().single();
  if (error) throw error;
  return data as CompanyPartnershipReq;
}

// ---------- Metrics ----------
export async function listMetrics(companyId: string) {
  const { data, error } = await s.from("company_metrics").select("*").eq("company_id", companyId).order("period_start", { ascending: true }).limit(24);
  if (error) throw error;
  return (data ?? []) as CompanyMetric[];
}
export async function upsertMetric(input: Partial<CompanyMetric> & { company_id: string; period_start: string }) {
  const { data, error } = await s.from("company_metrics").upsert(input, { onConflict: "company_id,period_start" }).select().single();
  if (error) throw error;
  return data as CompanyMetric;
}

// ---------- Analytics ----------
export async function pageViewsCount(companyId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { count } = await s.from("company_page_views").select("id", { count: "exact", head: true }).eq("company_id", companyId).gte("created_at", since);
  return count ?? 0;
}

// ---------- Live jobs on a company ----------
export async function listCompanyJobs(companyId: string) {
  const { data, error } = await s.from("jobs").select("*").eq("company_id", companyId).eq("status", "active").order("created_at", { ascending: false }).limit(30);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; title: string; location: string | null; kind: string; work_type: string; created_at: string }>;
}

// ---------- Verifications ----------
export async function submitVerification(input: { company_id: string; submitted_by: string; kind: string; doc_url?: string; notes?: string }) {
  const { data, error } = await s.from("company_verifications").insert(input).select().single();
  if (error) throw error;
  return data;
}