// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type ShareTargetType = "post" | "reel" | "story";
export type ShareDestination =
  | "whatsapp" | "telegram" | "instagram" | "facebook"
  | "x" | "email" | "sms" | "copy_link" | "native" | "download";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function recordShare(params: {
  targetType: ShareTargetType;
  targetId: string;
  destination: ShareDestination;
}) {
  if (!UUID_RE.test(params.targetId)) return; // skip demo/non-uuid ids
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("shares").insert({
    user_id: user?.id ?? null,
    target_type: params.targetType,
    target_id: params.targetId,
    destination: params.destination,
  });
}

export async function getShareCount(targetType: ShareTargetType, targetId: string) {
  if (!UUID_RE.test(targetId)) return 0;
  const { count } = await supabase
    .from("shares")
    .select("*", { count: "exact", head: true })
    .eq("target_type", targetType)
    .eq("target_id", targetId);
  return count ?? 0;
}
