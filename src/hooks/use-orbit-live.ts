// @ts-nocheck
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * One global Orbit realtime bridge: every user's post, reel, podcast, comment,
 * like, bookmark, repost and poll vote is broadcast to all viewers, and the
 * matching Orbit queries are refreshed (debounced) so counters stay live.
 */
const ORBIT_KEY_PREFIXES = [
  "orbit",
  "orbit-feed",
  "orbit-replies",
  "orbit-post",
  "orbit-community-feed",
  "orbit-community-hot",
  "orbit-profile-posts",
  "ex-trending",
  "ex-viral",
  "ex-pods",
  "ex-search",
  "orbit-reels",
  "orbit-podcasts",
];

export function useOrbitLive() {
  const qc = useQueryClient();

  useEffect(() => {
    let timer: any;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey?.[0];
            return typeof k === "string" && ORBIT_KEY_PREFIXES.some((p) => k.startsWith(p));
          },
        });
      }, 350);
    };

    const ch = supabase.channel(`orbit-live-${Math.random().toString(36).slice(2)}`);
    for (const table of ["orbit_posts", "orbit_likes", "orbit_bookmarks", "orbit_poll_votes"]) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, refresh);
    }
    ch.subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [qc]);
}
