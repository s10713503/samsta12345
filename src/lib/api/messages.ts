// @ts-nocheck
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export type ChatRow = {
  id: string;
  is_group: boolean;
  name: string | null;
  created_by: string;
  updated_at: string;
  members: Array<{
    user_id: string;
    last_read_at: string;
    profile: {
      id: string;
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  }>;
  last_message?: MessageRow | null;
};

export type MessageMedia = { path: string; type: "image" | "video" | "audio"; url?: string };

export type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string | null;
  media: MessageMedia[];
  reply_to: string | null;
  deleted_at: string | null;
  created_at: string;
};

const SIGN_TTL = 60 * 60;

async function signChatMedia(list: MessageRow[]): Promise<MessageRow[]> {
  const paths = list.flatMap((m) => (Array.isArray(m.media) ? m.media.map((x) => x.path) : []));
  if (!paths.length) return list;
  const { data } = await supabase.storage
    .from("chat-media")
    .createSignedUrls([...new Set(paths)], SIGN_TTL);
  const map: Record<string, string> = {};
  for (const d of data ?? []) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
  return list.map((m) => ({
    ...m,
    media: (m.media ?? []).map((x) => ({ ...x, url: map[x.path] })),
  }));
}

/** Find or create a 1:1 chat with `otherUserId`. */
export async function getOrCreateDirectChat(currentUserId: string, otherUserId: string): Promise<string> {
  // Look for an existing 1:1 chat with exactly these two members
  const { data: myChats, error } = await supabase
    .from("chat_members")
    .select("chat_id, chats!inner(id, is_group)")
    .eq("user_id", currentUserId);
  if (error) throw error;
  const dmIds = (myChats ?? [])
    .filter((r) => !(r as unknown as { chats: { is_group: boolean } }).chats.is_group)
    .map((r) => r.chat_id as string);
  if (dmIds.length) {
    const { data: matches } = await supabase
      .from("chat_members")
      .select("chat_id")
      .eq("user_id", otherUserId)
      .in("chat_id", dmIds);
    if (matches && matches.length) return matches[0].chat_id as string;
  }
  // Create new
  const { data: chat, error: cErr } = await supabase
    .from("chats")
    .insert({ is_group: false, created_by: currentUserId })
    .select("id")
    .single();
  if (cErr) throw cErr;
  const chatId = chat.id as string;
  const { error: mErr } = await supabase.from("chat_members").insert([
    { chat_id: chatId, user_id: currentUserId },
    { chat_id: chatId, user_id: otherUserId },
  ]);
  if (mErr) throw mErr;
  return chatId;
}

export async function createGroupChat(currentUserId: string, name: string, memberIds: string[]): Promise<string> {
  const { data: chat, error } = await supabase
    .from("chats")
    .insert({ is_group: true, name, created_by: currentUserId })
    .select("id")
    .single();
  if (error) throw error;
  const chatId = chat.id as string;
  const uniq = [...new Set([currentUserId, ...memberIds])];
  const { error: mErr } = await supabase
    .from("chat_members")
    .insert(uniq.map((uid) => ({ chat_id: chatId, user_id: uid })));
  if (mErr) throw mErr;
  return chatId;
}

export async function listChats(currentUserId: string): Promise<ChatRow[]> {
  const { data, error } = await supabase
    .from("chats")
    .select(
      "id, is_group, name, created_by, updated_at, members:chat_members(user_id, last_read_at, profile:profiles!chat_members_profile_id_fkey(id, username, full_name, avatar_url))",
    )
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const chats = (data ?? []) as unknown as ChatRow[];
  // Fetch last message per chat
  const ids = chats.map((c) => c.id);
  if (ids.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, chat_id, sender_id, body, media, reply_to, deleted_at, created_at")
      .in("chat_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    const byChat = new Map<string, MessageRow>();
    for (const m of (msgs ?? []) as unknown as MessageRow[]) {
      if (!byChat.has(m.chat_id)) byChat.set(m.chat_id, m);
    }
    for (const c of chats) c.last_message = byChat.get(c.id) ?? null;
  }
  // Filter to chats the user is a member of (RLS already enforces this but the join can return orphans in edge cases)
  return chats.filter((c) => c.members.some((m) => m.user_id === currentUserId));
}

export async function getChat(chatId: string): Promise<ChatRow | null> {
  const { data, error } = await supabase
    .from("chats")
    .select(
      "id, is_group, name, created_by, updated_at, members:chat_members(user_id, last_read_at, profile:profiles!chat_members_profile_id_fkey(id, username, full_name, avatar_url))",
    )
    .eq("id", chatId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as ChatRow) ?? null;
}

export async function listMessages(chatId: string, limit = 100): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, chat_id, sender_id, body, media, reply_to, deleted_at, created_at")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  const rows = (data ?? []) as unknown as MessageRow[];
  return signChatMedia(rows.map((r) => ({ ...r, media: Array.isArray(r.media) ? r.media : [] })));
}

export async function sendMessage(input: {
  chatId: string;
  senderId: string;
  body?: string;
  media?: MessageMedia[];
  replyTo?: string | null;
}) {
  const { error } = await supabase.from("messages").insert({
    chat_id: input.chatId,
    sender_id: input.senderId,
    body: input.body?.trim() || null,
    media: input.media ?? [],
    reply_to: input.replyTo ?? null,
  });
  if (error) throw error;
}

export async function deleteMessage(messageId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ deleted_at: new Date().toISOString(), body: null, media: [] })
    .eq("id", messageId);
  if (error) throw error;
}

export async function markRead(chatId: string, userId: string) {
  await supabase
    .from("chat_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .eq("user_id", userId);
}

export async function uploadChatMedia(userId: string, file: File): Promise<MessageMedia> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("chat-media").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const type: MessageMedia["type"] = file.type.startsWith("video")
    ? "video"
    : file.type.startsWith("audio")
      ? "audio"
      : "image";
  return { path, type };
}

export async function toggleReaction(messageId: string, userId: string, emoji: string) {
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("emoji")
    .eq("message_id", messageId)
    .eq("user_id", userId)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("emoji", emoji);
  } else {
    await supabase
      .from("message_reactions")
      .insert({ message_id: messageId, user_id: userId, emoji });
  }
}

export async function setTyping(chatId: string, userId: string) {
  await supabase
    .from("typing_status")
    .upsert(
      { chat_id: chatId, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "chat_id,user_id" },
    );
}

export function subscribeChat(chatId: string, cb: () => void) {
  const ch = supabase
    .channel(`chat-${chatId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
      () => cb(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "typing_status", filter: `chat_id=eq.${chatId}` },
      () => cb(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "message_reactions" },
      () => cb(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}

export function subscribeChats(userId: string, cb: () => void) {
  const ch = supabase
    .channel(`chats-${userId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "chats" },
      () => cb(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "messages" },
      () => cb(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
