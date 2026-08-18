// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type UserSettings = Record<string, any>;

/** Reads (and lazily creates) the signed-in user's settings row. */
export async function getMySettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  await supabase.rpc("ensure_my_settings");
  const again = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (again.error) throw again.error;
  return again.data ?? { user_id: userId };
}

/** Instant, real-time write of one or more settings. */
export async function updateMySettings(userId: string, patch: Partial<UserSettings>) {
  const { data, error } = await supabase
    .from("user_settings")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyAccount(userId: string) {
  // Sensitive columns (email, phone, date_of_birth, gender) are readable only
  // through this security-definer function, which always scopes to auth.uid().
  const { data, error } = await (supabase as any).rpc("my_account");
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) ?? null;
}

export async function updateMyAccount(userId: string, patch: Record<string, any>) {
  const { error } = await supabase
    .from("profiles")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
  return getMyAccount(userId);
}

/** Username uniqueness check before saving. */
export async function isUsernameFree(username: string, myId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .limit(1);
  if (error) throw error;
  return !data?.length || data[0].id === myId;
}

export async function deactivateAccount() {
  const { error } = await supabase.rpc("deactivate_my_account");
  if (error) throw error;
}

export async function reactivateAccount() {
  const { error } = await supabase.rpc("reactivate_my_account");
  if (error) throw error;
}

export async function scheduleDeletion() {
  const { error } = await supabase.rpc("schedule_my_deletion");
  if (error) throw error;
}

/** Verifies the password by re-authenticating with the current email. */
export async function verifyPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

/** Sends a one-time code to the account email for delete confirmation. */
export async function sendDeleteOtp(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) throw error;
}

export async function verifyDeleteOtp(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  return !error;
}

/** Exports everything we hold about this account as a JSON download. */
export async function downloadMyData(userId: string) {
  const tables = [
    "profiles",
    "posts",
    "post_comments",
    "post_likes",
    "stories",
    "follows",
    "messages",
    "notifications",
    "user_settings",
  ] as const;
  const bundle: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: userId };
  for (const t of tables) {
    try {
      const col = t === "profiles" ? "id" : t === "follows" ? "follower_id" : "user_id";
      const { data } = await supabase.from(t).select("*").eq(col, userId);
      bundle[t] = data ?? [];
    } catch {
      bundle[t] = [];
    }
  }
  return bundle;
}
