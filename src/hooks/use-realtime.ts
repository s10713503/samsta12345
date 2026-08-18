// @ts-nocheck
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to realtime changes on `posts` filtered by kind (post/reel/story).
 * Invalidates the feed query so the list refetches with signed URLs.
 */
export function useRealtimeFeed(kind: "post" | "reel" | "story", queryKey: unknown[]) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`feed-${kind}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `kind=eq.${kind}` },
        () => qc.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, JSON.stringify(queryKey)]);
}

/** Realtime for a single post's likes + comments. */
export function useRealtimePost(postId: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!postId) return;
    const ch = supabase
      .channel(`post-rt-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${postId}` },
        onChange,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        onChange,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);
}

/** Realtime for notifications targeted at a user. */
export function useRealtimeNotifications(userId: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notif-rt-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        onChange,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}

/** Realtime for follows involving this user (as follower OR followed). */
export function useRealtimeFollows(userId: string | null | undefined, onChange: () => void) {
  useEffect(() => {
    if (!userId) return;
    const chA = supabase
      .channel(`follows-a-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${userId}` },
        onChange,
      )
      .subscribe();
    const chB = supabase
      .channel(`follows-b-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows", filter: `following_id=eq.${userId}` },
        onChange,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(chA);
      supabase.removeChannel(chB);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}
