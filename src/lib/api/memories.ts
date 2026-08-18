// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

export type MemoryKind = "note" | "photo" | "video" | "voice" | "file" | "bookmark" | "person" | "place" | "project";

export type Memory = {
  id: string;
  user_id: string;
  kind: MemoryKind;
  title: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  tags: string[];
  people: string[];
  location: string | null;
  mood: string | null;
  ai_summary: string | null;
  memory_date: string | null;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string; memory_id: string | null; remind_at: string; note: string | null; done: boolean; created_at: string;
};

export async function listMemories(userId: string, opts: { kind?: MemoryKind; tag?: string; favorite?: boolean; limit?: number } = {}) {
  let q = sb.from("memories").select("*").eq("user_id", userId).order("memory_date", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.tag) q = q.contains("tags", [opts.tag]);
  if (opts.favorite) q = q.eq("favorite", true);
  q = q.limit(opts.limit ?? 200);
  const { data } = await q;
  return (data as Memory[]) ?? [];
}

export async function searchMemories(userId: string, term: string) {
  const like = `%${term.replace(/[%_]/g, "")}%`;
  const { data } = await sb
    .from("memories").select("*").eq("user_id", userId)
    .or(`title.ilike.${like},content.ilike.${like},location.ilike.${like},ai_summary.ilike.${like}`)
    .order("created_at", { ascending: false }).limit(60);
  return (data as Memory[]) ?? [];
}

export async function createMemory(userId: string, input: Partial<Memory> & { title: string; kind: MemoryKind }) {
  const { data, error } = await sb.from("memories").insert({ user_id: userId, ...input }).select().single();
  if (error) throw error;
  return data as Memory;
}

export async function updateMemory(id: string, patch: Partial<Memory>) {
  const { data, error } = await sb.from("memories").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Memory;
}

export async function deleteMemory(id: string) {
  await sb.from("memories").delete().eq("id", id);
}

export async function toggleFavorite(id: string, v: boolean) {
  await sb.from("memories").update({ favorite: v }).eq("id", id);
}

export async function allTags(userId: string): Promise<Array<{ tag: string; count: number }>> {
  const { data } = await sb.from("memories").select("tags").eq("user_id", userId).limit(500);
  const counts: Record<string, number> = {};
  ((data as Array<{ tags: string[] }>) ?? []).forEach((r) => r.tags?.forEach((t) => { counts[t] = (counts[t] ?? 0) + 1; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
}

export async function findDuplicates(userId: string): Promise<Array<[Memory, Memory]>> {
  const all = await listMemories(userId, { limit: 300 });
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const pairs: Array<[Memory, Memory]> = [];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      if (norm(all[i].title) === norm(all[j].title)) pairs.push([all[i], all[j]]);
    }
  }
  return pairs.slice(0, 20);
}

export async function listReminders(userId: string): Promise<Reminder[]> {
  const { data } = await sb.from("memory_reminders").select("*").eq("user_id", userId).eq("done", false).order("remind_at", { ascending: true }).limit(50);
  return (data as Reminder[]) ?? [];
}

export async function addReminder(userId: string, memoryId: string | null, remind_at: string, note?: string) {
  const { data, error } = await sb.from("memory_reminders").insert({ user_id: userId, memory_id: memoryId, remind_at, note }).select().single();
  if (error) throw error;
  return data as Reminder;
}

export async function completeReminder(id: string) {
  await sb.from("memory_reminders").update({ done: true }).eq("id", id);
}

export function exportJSON(memories: Memory[]) {
  return JSON.stringify(memories, null, 2);
}
