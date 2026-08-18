// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type EventRow = {
  id: string;
  organizer_id: string;
  company_id: string | null;
  title: string;
  slug: string | null;
  description: string | null;
  kind: string; // online | offline | hybrid
  category: string;
  cover_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number | null;
  price: number | null;
  currency: string | null;
  is_free: boolean;
  is_featured: boolean;
  is_verified: boolean;
  status: string;
  tags: string[];
  agenda: unknown;
  sponsors: unknown;
  materials_url: string | null;
  stream_url: string | null;
  registrations_count: number;
  views_count: number;
  created_at: string;
};

export type EventSession = { id: string; event_id: string; title: string; description: string | null; speaker_ids: string[]; starts_at: string | null; ends_at: string | null; room: string | null; materials_url: string | null; };
export type EventSpeaker = { id: string; event_id: string; user_id: string | null; name: string; title: string | null; bio: string | null; avatar_url: string | null; socials: unknown };
export type EventRegistration = { id: string; event_id: string; user_id: string; ticket_type: string; status: string; qr_code: string; checked_in_at: string | null; price_paid: number | null; currency: string | null; created_at: string };
export type EventReview = { id: string; event_id: string; reviewer_id: string; rating: number | null; title: string | null; body: string | null; created_at: string };
export type EventDiscussion = { id: string; event_id: string; author_id: string; title: string; body: string | null; created_at: string };
export type EventQna = { id: string; event_id: string; asker_id: string; question: string; answer: string | null; upvotes: number; answered: boolean; created_at: string };
export type EventPoll = { id: string; event_id: string; question: string; options: Array<{ id: string; label: string; votes: number }>; is_open: boolean; created_at: string };
export type EventCertificate = { id: string; event_id: string; user_id: string; certificate_url: string | null; serial: string; issued_at: string };
export type EventConnection = { id: string; event_id: string; from_user_id: string; to_user_id: string; note: string | null; status: string; created_at: string };
export type EventNote = { id: string; event_id: string; user_id: string; session_id: string | null; content: string; is_ai: boolean; created_at: string };

const s = supabase as unknown as { from: (t: string) => any; channel: (n: string) => any };

// ---------- Events ----------
export async function listEvents(opts?: { q?: string; category?: string; kind?: string; city?: string; upcoming?: boolean; featured?: boolean; limit?: number }) {
  let q = s.from("events").select("*").eq("status", "published").order("starts_at", { ascending: true }).limit(opts?.limit ?? 60);
  if (opts?.q) q = q.ilike("title", `%${opts.q}%`);
  if (opts?.category) q = q.eq("category", opts.category);
  if (opts?.kind) q = q.eq("kind", opts.kind);
  if (opts?.city) q = q.ilike("city", `%${opts.city}%`);
  if (opts?.upcoming) q = q.gte("starts_at", new Date().toISOString());
  if (opts?.featured) q = q.eq("is_featured", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EventRow[];
}
export async function getEvent(id: string) {
  const { data, error } = await s.from("events").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as EventRow | null;
}
export async function upsertEvent(input: Partial<EventRow> & { organizer_id: string; title: string }) {
  const { data, error } = await s.from("events").upsert(input).select().single();
  if (error) throw error;
  return data as EventRow;
}
export async function deleteEvent(id: string) { await s.from("events").delete().eq("id", id); }
export async function logEventView(eventId: string, viewerId: string | null, referrer?: string) {
  await s.from("event_views").insert({ event_id: eventId, viewer_id: viewerId, referrer: referrer ?? null });
}

// ---------- Sessions ----------
export async function listSessions(eventId: string) {
  const { data, error } = await s.from("event_sessions").select("*").eq("event_id", eventId).order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventSession[];
}
export async function upsertSession(input: Partial<EventSession> & { event_id: string; title: string }) {
  const { data, error } = await s.from("event_sessions").upsert(input).select().single();
  if (error) throw error;
  return data as EventSession;
}

// ---------- Speakers ----------
export async function listSpeakers(eventId: string) {
  const { data, error } = await s.from("event_speakers").select("*").eq("event_id", eventId);
  if (error) throw error;
  return (data ?? []) as EventSpeaker[];
}
export async function upsertSpeaker(input: Partial<EventSpeaker> & { event_id: string; name: string }) {
  const { data, error } = await s.from("event_speakers").upsert(input).select().single();
  if (error) throw error;
  return data as EventSpeaker;
}

// ---------- Registrations ----------
export async function register(input: { event_id: string; user_id: string; ticket_type?: string; price_paid?: number; currency?: string; payment_ref?: string }) {
  const { data, error } = await s.from("event_registrations").insert(input).select().single();
  if (error) throw error;
  return data as EventRegistration;
}
export async function myRegistration(eventId: string, userId: string) {
  const { data } = await s.from("event_registrations").select("*").eq("event_id", eventId).eq("user_id", userId).maybeSingle();
  return data as EventRegistration | null;
}
export async function myRegistrations(userId: string) {
  const { data, error } = await s.from("event_registrations").select("*, events(*)").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<EventRegistration & { events: EventRow }>;
}
export async function cancelRegistration(id: string) { await s.from("event_registrations").update({ status: "cancelled" }).eq("id", id); }
export async function checkIn(id: string) {
  const { data, error } = await s.from("event_registrations").update({ checked_in_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data as EventRegistration;
}
export async function listAttendees(eventId: string) {
  const { data, error } = await s.from("event_registrations").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventRegistration[];
}

// ---------- Waitlist ----------
export async function joinWaitlist(input: { event_id: string; user_id: string }) {
  const { error } = await s.from("event_waitlist").insert(input);
  if (error && !String(error.message).includes("duplicate")) throw error;
}

// ---------- Saves ----------
export async function saveEvent(input: { event_id: string; user_id: string }) {
  const { error } = await s.from("event_saves").insert(input);
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function unsaveEvent(input: { event_id: string; user_id: string }) {
  await s.from("event_saves").delete().eq("event_id", input.event_id).eq("user_id", input.user_id);
}
export async function listSaved(userId: string) {
  const { data, error } = await s.from("event_saves").select("event_id, events(*)").eq("user_id", userId);
  if (error) throw error;
  return ((data ?? []) as Array<{ event_id: string; events: EventRow }>).map((r) => r.events).filter(Boolean);
}

// ---------- Reviews ----------
export async function listReviews(eventId: string) {
  const { data, error } = await s.from("event_reviews").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventReview[];
}
export async function postReview(input: Partial<EventReview> & { event_id: string; reviewer_id: string }) {
  const { data, error } = await s.from("event_reviews").upsert(input, { onConflict: "event_id,reviewer_id" }).select().single();
  if (error) throw error;
  return data as EventReview;
}

// ---------- Discussions ----------
export async function listDiscussions(eventId: string) {
  const { data, error } = await s.from("event_discussions").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventDiscussion[];
}
export async function postDiscussion(input: { event_id: string; author_id: string; title: string; body?: string }) {
  const { data, error } = await s.from("event_discussions").insert(input).select().single();
  if (error) throw error;
  return data as EventDiscussion;
}

// ---------- Q&A ----------
export async function listQna(eventId: string) {
  const { data, error } = await s.from("event_qna").select("*").eq("event_id", eventId).order("upvotes", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventQna[];
}
export async function askQuestion(input: { event_id: string; asker_id: string; question: string; session_id?: string }) {
  const { data, error } = await s.from("event_qna").insert(input).select().single();
  if (error) throw error;
  return data as EventQna;
}
export async function upvoteQuestion(id: string, current: number) {
  await s.from("event_qna").update({ upvotes: current + 1 }).eq("id", id);
}

// ---------- Polls ----------
export async function listPolls(eventId: string) {
  const { data, error } = await s.from("event_polls").select("*").eq("event_id", eventId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventPoll[];
}
export async function createPoll(input: { event_id: string; question: string; options: Array<{ id: string; label: string; votes: number }> }) {
  const { data, error } = await s.from("event_polls").insert(input).select().single();
  if (error) throw error;
  return data as EventPoll;
}
export async function votePoll(input: { poll_id: string; user_id: string; option_id: string }) {
  const { error } = await s.from("event_poll_votes").upsert(input, { onConflict: "poll_id,user_id" });
  if (error) throw error;
}

// ---------- Certificates ----------
export async function myCertificates(userId: string) {
  const { data, error } = await s.from("event_certificates").select("*, events(title, starts_at)").eq("user_id", userId).order("issued_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<EventCertificate & { events: { title: string; starts_at: string | null } }>;
}
export async function issueCertificate(input: { event_id: string; user_id: string; certificate_url?: string }) {
  const { data, error } = await s.from("event_certificates").insert(input).select().single();
  if (error) throw error;
  return data as EventCertificate;
}

// ---------- Connections (networking) ----------
export async function myConnections(userId: string, eventId?: string) {
  let q = s.from("event_connections").select("*").or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`).order("created_at", { ascending: false });
  if (eventId) q = q.eq("event_id", eventId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EventConnection[];
}
export async function sendConnection(input: { event_id: string; from_user_id: string; to_user_id: string; note?: string }) {
  const { data, error } = await s.from("event_connections").insert(input).select().single();
  if (error) throw error;
  return data as EventConnection;
}
export async function respondConnection(id: string, status: "accepted" | "declined") {
  await s.from("event_connections").update({ status }).eq("id", id);
}

// ---------- AI Notes ----------
export async function listNotes(eventId: string, userId: string) {
  const { data, error } = await s.from("event_notes").select("*").eq("event_id", eventId).eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventNote[];
}
export async function saveNote(input: { event_id: string; user_id: string; content: string; session_id?: string; is_ai?: boolean }) {
  const { data, error } = await s.from("event_notes").insert(input).select().single();
  if (error) throw error;
  return data as EventNote;
}

// ---------- Analytics ----------
export async function eventAnalytics(eventId: string) {
  const [{ count: views }, { count: regs }, { count: checkedIn }, { count: reviews }] = await Promise.all([
    s.from("event_views").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    s.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    s.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).not("checked_in_at", "is", null),
    s.from("event_reviews").select("id", { count: "exact", head: true }).eq("event_id", eventId),
  ]);
  return { views: views ?? 0, registrations: regs ?? 0, checked_in: checkedIn ?? 0, reviews: reviews ?? 0 };
}

export const EVENT_CATEGORIES = [
  "technology","ai_ml","startup","business","career","education","government","hackathon","workshop","seminar","conference","networking","college","cultural","sports","music","health","community","other",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  technology: "Technology", ai_ml: "& ML", startup: "Startup", business: "Business & Finance",
  career: "Career & Jobs", education: "Education", government: "Government", hackathon: "Hackathon",
  workshop: "Workshop", seminar: "Seminar", conference: "Conference", networking: "Networking",
  college: "College", cultural: "Cultural", sports: "Sports & Fitness", music: "Music",
  health: "Health & Wellness", community: "Community", other: "Other",
};