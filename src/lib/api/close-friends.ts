// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export async function listCloseFriends(userId: string) {
  const { data, error } = await supabase
    .from("close_friends")
    .select("friend:profiles!close_friends_friend_id_fkey(id, username, full_name, avatar_url)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.friend).filter(Boolean);
}

export async function addCloseFriend(userId: string, friendId: string) {
  const { error } = await supabase
    .from("close_friends")
    .upsert({ user_id: userId, friend_id: friendId }, { onConflict: "user_id,friend_id" });
  if (error) throw error;
}

export async function removeCloseFriend(userId: string, friendId: string) {
  const { error } = await supabase
    .from("close_friends")
    .delete()
    .eq("user_id", userId)
    .eq("friend_id", friendId);
  if (error) throw error;
}
