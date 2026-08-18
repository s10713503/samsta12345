// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

/** How many referred friends must buy the 12-month plan to unlock unlimited media. */
export const REFERRAL_GOAL = 5;
const PENDING_KEY = "samsta:pending-ref";

function makeCode(userId: string) {
  return ("SAM" + userId.replace(/-/g, "").slice(0, 6)).toUpperCase();
}

/** Returns the current user's referral code, creating it if needed. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const { data } = await supabase.from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
  if (data?.code) return data.code;
  const code = makeCode(userId);
  await supabase.from("referral_codes").insert({ user_id: userId, code });
  return code;
}

/** Capture ?ref=CODE from the URL so it can be claimed after sign-in. */
export function capturePendingReferral() {
  if (typeof window === "undefined") return;
  const code = new URLSearchParams(window.location.search).get("ref");
  if (code) {
    try { localStorage.setItem(PENDING_KEY, code.trim().toUpperCase()); } catch { /* */ }
  }
}

/** Link the signed-in user to a referrer. Safe to call repeatedly. */
export async function claimReferral(userId: string, rawCode?: string): Promise<boolean> {
  let code = rawCode?.trim().toUpperCase();
  if (!code && typeof window !== "undefined") {
    try { code = localStorage.getItem(PENDING_KEY) || undefined; } catch { /* */ }
  }
  if (!code) return false;
  const { data: existing } = await supabase.from("referrals").select("id").eq("referred_user_id", userId).maybeSingle();
  if (existing) {
    try { localStorage.removeItem(PENDING_KEY); } catch { /* */ }
    return false;
  }
  const { data: owner } = await supabase.from("referral_codes").select("user_id").eq("code", code).maybeSingle();
  if (!owner || owner.user_id === userId) return false;
  const { error } = await supabase.from("referrals").insert({ referrer_id: owner.user_id, referred_user_id: userId });
  try { localStorage.removeItem(PENDING_KEY); } catch { /* */ }
  return !error;
}

/** How many of my referrals bought the 12-month plan. */
export async function getReferralStats(userId: string): Promise<{ total: number; qualified: number }> {
  const { data } = await supabase.from("referrals").select("qualified").eq("referrer_id", userId);
  const rows = data || [];
  return { total: rows.length, qualified: rows.filter((r) => r.qualified).length };
}
