// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

export type PollTally = { total: number; counts: Record<number, number>; myChoice: number | null };

export async function getPollTally(storyId: string, voterId?: string | null): Promise<PollTally> {
  const { data } = await supabase
    .from("story_poll_votes")
    .select("option_index, voter_id")
    .eq("story_id", storyId);
  const counts: Record<number, number> = {};
  let myChoice: number | null = null;
  for (const r of data ?? []) {
    counts[r.option_index] = (counts[r.option_index] ?? 0) + 1;
    if (voterId && r.voter_id === voterId) myChoice = r.option_index;
  }
  return { total: (data ?? []).length, counts, myChoice };
}

export async function castPollVote(storyId: string, voterId: string, optionIndex: number) {
  const { error } = await supabase
    .from("story_poll_votes")
    .upsert(
      { story_id: storyId, voter_id: voterId, option_index: optionIndex },
      { onConflict: "story_id,voter_id" },
    );
  if (error) throw error;
}

export function subscribePoll(storyId: string, cb: () => void) {
  const ch = supabase
    .channel(`poll-${storyId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "story_poll_votes", filter: `story_id=eq.${storyId}` },
      () => cb(),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(ch);
  };
}
