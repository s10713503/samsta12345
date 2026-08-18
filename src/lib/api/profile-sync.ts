import { supabase } from "@/integrations/supabase/client";

/**
 * Persists the signed-in account into public.profiles (email/password *and*
 * Google sign-ups) and refreshes last_active_at, which is what keeps the
 * account — and everything it posted — alive for 6 months of inactivity.
 * Existing values are never overwritten with nulls.
 */
export async function ensureProfile(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return;

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = (meta.full_name as string) ?? (meta.name as string) ?? null;
  const avatar = (meta.avatar_url as string) ?? (meta.picture as string) ?? null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, username")
    .eq("id", user.id)
    .maybeSingle();

  const row: Record<string, unknown> = {
    id: user.id,
    email: user.email ?? null,
    last_active_at: new Date().toISOString(),
  };
  if (fullName && !existing?.full_name) row.full_name = fullName;
  if (avatar && !existing?.avatar_url) row.avatar_url = avatar;
  if (!existing?.username) {
    const base = (user.email ?? "user").split("@")[0]!.toLowerCase().replace(/[^a-z0-9._]/g, "");
    row.username = existing?.username ?? `${base || "user"}${user.id.slice(0, 4)}`;
  }

  const { error } = await supabase.from("profiles").upsert(row as never, { onConflict: "id" });
  if (error) throw error;
}
