import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "./execute";

export type ActionRow = {
  id: string;
  utterance: string;
  capability: string;
  provider: string | null;
  params: Record<string, string>;
  risk: string;
  confirmed: boolean;
  state: string;
  result: string | null;
  error: string | null;
  created_at: string;
};

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/* ---------- audit trail (never stores credentials) ---------- */

const SENSITIVE = /(pin|cvv|otp|password|passcode|token|secret|biometric)/i;
function scrub(params: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params ?? {})) {
    if (SENSITIVE.test(k)) continue;
    out[k] = String(v).slice(0, 400);
  }
  return out;
}

export async function recordAction(
  utterance: string,
  plan: Plan,
  state: "completed" | "failed" | "cancelled" | "blocked",
  confirmed: boolean,
  result?: string,
  error?: string,
) {
  const user_id = await uid();
  if (!user_id) return;
  await supabase.from("agent_actions").insert({
    user_id,
    utterance: utterance.slice(0, 500),
    capability: plan.capability,
    provider: plan.provider ?? null,
    params: scrub(plan.params),
    risk: plan.risk,
    confirmed,
    state,
    result: result ?? null,
    error: error ?? null,
  });
}

export async function listActions(): Promise<ActionRow[]> {
  const { data } = await supabase
    .from("agent_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as ActionRow[];
}

export async function deleteAction(id: string) {
  await supabase.from("agent_actions").delete().eq("id", id);
}

export async function clearActions() {
  const user_id = await uid();
  if (!user_id) return;
  await supabase.from("agent_actions").delete().eq("user_id", user_id);
}

/* ---------- memory ---------- */

export type MemoryRow = { id: string; key: string; value: string };

export async function listMemory(): Promise<MemoryRow[]> {
  const { data } = await supabase.from("agent_memory").select("id,key,value").order("key");
  return (data ?? []) as MemoryRow[];
}

export async function saveMemory(key: string, value: string) {
  const user_id = await uid();
  if (!user_id) throw new Error("Sign in first.");
  if (SENSITIVE.test(key) || SENSITIVE.test(value)) throw new Error("Samsta never stores PINs, OTPs or passwords.");
  const { error } = await supabase
    .from("agent_memory")
    .upsert({ user_id, key: key.trim().slice(0, 80), value: value.trim().slice(0, 300) }, { onConflict: "user_id,key" });
  if (error) throw error;
}

export async function deleteMemory(id: string) {
  await supabase.from("agent_memory").delete().eq("id", id);
}

/* ---------- permissions ---------- */

export async function listPermissions(): Promise<Record<string, boolean>> {
  const { data } = await supabase.from("agent_permissions").select("scope,granted");
  const map: Record<string, boolean> = {};
  for (const r of data ?? []) map[(r as { scope: string }).scope] = (r as { granted: boolean }).granted;
  return map;
}

export async function setPermission(scope: string, granted: boolean) {
  const user_id = await uid();
  if (!user_id) throw new Error("Sign in first.");
  const { error } = await supabase
    .from("agent_permissions")
    .upsert({ user_id, scope, granted }, { onConflict: "user_id,scope" });
  if (error) throw error;
}
