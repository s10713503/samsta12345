import { useEffect, useState } from "react";
import { Heart, MessageCircle, Sun, Moon, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { useRealtimeNotifications } from "@/hooks/use-realtime";

const LIKE_KINDS = ["like_post", "like_reel", "like_story", "like_comment"];
const COMMENT_KINDS = ["comment_post", "comment_reel", "reply", "mention"];

function useUnreadCounts(userId: string | undefined) {
  const [counts, setCounts] = useState<{ likes: number; comments: number }>({ likes: 0, comments: 0 });

  async function load() {
    if (!userId) {
      setCounts({ likes: 0, comments: 0 });
      return;
    }
    const [likes, comments] = await Promise.all([
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false)
        .in("kind", LIKE_KINDS),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false)
        .in("kind", COMMENT_KINDS),
    ]);
    setCounts({ likes: likes.count ?? 0, comments: comments.count ?? 0 });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useRealtimeNotifications(userId, load);
  return counts;
}

function Badge({ n }: { n: number }) {
  if (!n) {
    return (
      <span
        className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background opacity-0"
        aria-hidden
      />
    );
  }
  return (
    <span
      className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-background bg-red-500 animate-pulse"
      aria-label={`${n} unread`}
    />
  );
}

export function TopBar({ title = "Samsta" }: { title?: string }) {
  const { theme, cycle } = useTheme();
  const { user } = useAuthUser();
  const { likes, comments } = useUnreadCounts(user?.id);
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Sparkles;
  const label = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Rose";

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-5 pt-5 pb-3 backdrop-blur-xl"
      style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}
    >
      <Link to="/" className="font-display text-3xl italic tracking-tight text-gradient">
        {title}
      </Link>
      <div className="flex items-center gap-2">
        <button
          onClick={cycle}
          className="glass flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium"
          aria-label={`Theme: ${label}. Tap to change`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
          <span>{label}</span>
        </button>
        <Link
          to="/notifications"
          search={{ filter: "likes" }}
          className="glass relative flex h-10 w-10 items-center justify-center rounded-full active:scale-95 transition"
          aria-label={`Activity${likes ? `, ${likes} unread` : ""}`}
        >
          <Heart className="h-5 w-5" strokeWidth={1.8} />
          <Badge n={likes} />
        </Link>
        <Link
          to="/notifications"
          search={{ filter: "comments" }}
          className="glass relative flex h-10 w-10 items-center justify-center rounded-full active:scale-95 transition"
          aria-label={`Comments${comments ? `, ${comments} unread` : ""}`}
        >
          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
          <Badge n={comments} />
        </Link>
      </div>
    </header>
  );
}
