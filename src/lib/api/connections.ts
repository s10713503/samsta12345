// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export type ConnStatus = "pending" | "approved" | "declined" | "blocked";

export type ConnectionRow = {
  id: string;
  requester_id: string;
  target_id: string;
  status: ConnStatus;
  allow_text: boolean;
  allow_voice: boolean;
  allow_video: boolean;
  created_at: string;
  updated_at: string;
};

export type Perms = { text: boolean; voice: boolean; video: boolean };

export const NO_PERMS: Perms = { text: false, voice: false, video: false };

export function permsOf(row: ConnectionRow | null | undefined): Perms {
  if (!row || row.status !== "approved") return NO_PERMS;
  return { text: !!row.allow_text, voice: !!row.allow_voice, video: !!row.allow_video };
}

/** The row describing what `peerId` grants ME (I am the requester). */
export async function getMyAccessTo(myId: string, peerId: string): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_id", myId)
    .eq("target_id", peerId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** The row describing what I grant `peerId` (I am the target). */
export async function getTheirAccessToMe(myId: string, peerId: string): Promise<ConnectionRow | null> {
  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_id", peerId)
    .eq("target_id", myId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function requestConnection(myId: string, peerId: string) {
  const { error } = await supabase
    .from("connection_requests")
    .upsert(
      { requester_id: myId, target_id: peerId, status: "pending", allow_text: false, allow_voice: false, allow_video: false },
      { onConflict: "requester_id,target_id" },
    );
  if (error) throw error;
}

export async function cancelRequest(myId: string, peerId: string) {
  const { error } = await supabase
    .from("connection_requests")
    .delete()
    .eq("requester_id", myId)
    .eq("target_id", peerId);
  if (error) throw error;
}

/** As the target: grant / revoke granular permissions. */
export async function setPermissions(rowId: string, perms: Partial<Perms> & { status?: ConnStatus }) {
  const patch: Record<string, unknown> = {};
  if (perms.text !== undefined) patch.allow_text = perms.text;
  if (perms.voice !== undefined) patch.allow_voice = perms.voice;
  if (perms.video !== undefined) patch.allow_video = perms.video;
  if (perms.status) patch.status = perms.status;
  const { error } = await supabase.from("connection_requests").update(patch).eq("id", rowId);
  if (error) throw error;
}

export async function approveWith(rowId: string, perms: Perms) {
  return setPermissions(rowId, { ...perms, status: "approved" });
}

export async function declineRequest(rowId: string) {
  return setPermissions(rowId, { text: false, voice: false, video: false, status: "declined" });
}

export async function blockUser(rowId: string) {
  return setPermissions(rowId, { text: false, voice: false, video: false, status: "blocked" });
}

export async function unblockUser(rowId: string) {
  return setPermissions(rowId, { status: "pending" });
}

type PeerProfile = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

async function attachProfiles(rows: ConnectionRow[], key: "requester_id" | "target_id") {
  const ids = [...new Set(rows.map((r) => r[key]))];
  if (!ids.length) return [] as Array<ConnectionRow & { peer: PeerProfile | null }>;
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  const map: Record<string, PeerProfile> = {};
  for (const p of data ?? []) map[p.id] = p;
  return rows.map((r) => ({ ...r, peer: map[r[key]] ?? null }));
}

/** Requests other people sent to me (I decide). */
export async function listIncoming(myId: string) {
  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("target_id", myId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return attachProfiles((data ?? []) as ConnectionRow[], "requester_id");
}

/** Requests I sent to other people. */
export async function listOutgoing(myId: string) {
  const { data, error } = await supabase
    .from("connection_requests")
    .select("*")
    .eq("requester_id", myId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return attachProfiles((data ?? []) as ConnectionRow[], "target_id");
}

export async function reportUser(reporterId: string, reportedId: string, reason: string, details?: string) {
  const { error } = await supabase
    .from("abuse_reports")
    .insert({ reporter_id: reporterId, reported_id: reportedId, reason, details: details ?? null });
  if (error) throw error;
}

/** Realtime: fire `cb` whenever any connection row touching me changes. */
export function subscribeConnections(myId: string, cb: () => void) {
  const ch = supabase
    .channel(`connections-${myId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "connection_requests", filter: `target_id=eq.${myId}` }, cb)
    .on("postgres_changes", { event: "*", schema: "public", table: "connection_requests", filter: `requester_id=eq.${myId}` }, cb)
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}
