// @ts-nocheck
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, UserPlus, AtSign, Bell, Loader2, Check, X, ArrowLeft, Trash2, Repeat2, CheckCheck, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import {
  listFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
  type PublicProfile,
} from "@/lib/api/social";
import { listPostThumbs, type PostThumb } from "@/lib/api/feed";
import { deleteComment } from "@/lib/api/interactions";
import { NotificationSettings } from "@/components/samsta/NotificationSettings";

type FilterKind = "all" | "likes" | "comments" | "requests" | "unread";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
  validateSearch: (s: Record<string, unknown>): { filter?: FilterKind } => {
    const f = s.filter;
    const ok = ["likes", "comments", "all", "requests", "unread"];
    return { filter: typeof f === "string" && ok.includes(f) ? (f as FilterKind) : undefined };
  },
  head: () => ({ meta: [{ title: "Activity — Samsta" }] }),
});


type NotifRow = {
  id: string;
  kind: string;
  target_type: string | null;
  target_id: string | null;
  created_at: string;
  is_read: boolean | null;
  preview: Record<string, unknown> | null;
  actor: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

const KIND_LABEL: Record<string, { icon: React.ComponentType<{ className?: string }>; text: string }> = {
  like_post: { icon: Heart, text: "liked your post" },
  like_reel: { icon: Heart, text: "liked your reel" },
  like_story: { icon: Heart, text: "liked your story" },
  like_comment: { icon: Heart, text: "liked your comment" },
  comment_post: { icon: MessageCircle, text: "commented on your post" },
  comment_reel: { icon: MessageCircle, text: "commented on your reel" },
  reply: { icon: MessageCircle, text: "replied to your comment" },
  follow: { icon: UserPlus, text: "started following you" },
  follow_request: { icon: UserPlus, text: "wants to follow you" },
  follow_accepted: { icon: UserPlus, text: "accepted your follow request" },
  follow_declined: { icon: UserPlus, text: "declined your follow request" },
  follow_removed: { icon: UserPlus, text: "removed you from their followers" },
  mention: { icon: AtSign, text: "mentioned you" },
  story_view: { icon: Bell, text: "viewed your story" },
  story_reply: { icon: MessageCircle, text: "replied to your story" },
  repost: { icon: Repeat2, text: "reposted your post" },
};

function NotificationsPage() {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const router = useRouter();
  const search = Route.useSearch();
  const filter: FilterKind = search.filter ?? "all";

  const notifsQ = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id, kind, target_type, target_id, created_at, is_read, preview, actor:profiles!notifications_actor_id_fkey(id, username, full_name, avatar_url)",
        )
        .eq("recipient_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as NotifRow[];
    },
    enabled: !!user,
  });

  const requestsQ = useQuery({
    queryKey: ["follow-requests", user?.id],
    queryFn: () => listFollowRequests(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`notifs-${user.id}`).on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` },
      () => {
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
        qc.invalidateQueries({ queryKey: ["follow-requests", user.id] });
      },
    ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, qc]);

  async function accept(p: PublicProfile) {
    if (!user) return;
    try {
      await acceptFollowRequest(user.id, p.id);
      qc.invalidateQueries({ queryKey: ["follow-requests"] });
      qc.invalidateQueries({ queryKey: ["follow-counts"] });
      toast.success(`Accepted ${p.username ?? "request"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }
  async function reject(p: PublicProfile) {
    if (!user) return;
    try {
      await rejectFollowRequest(user.id, p.id);
      qc.invalidateQueries({ queryKey: ["follow-requests"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function markAllRead() {
    if (!user) return;
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    toast.success("All caught up");
  }

  async function toggleRead(n: NotifRow) {
    if (!user) return;
    const next = !n.is_read;
    qc.setQueryData(["notifications", user.id], (old: NotifRow[] | undefined) =>
      (old ?? []).map((r) => (r.id === n.id ? { ...r, is_read: next } : r)),
    );
    const { error } = await supabase.from("notifications").update({ is_read: next }).eq("id", n.id);
    if (error) qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  }

  const requests = requestsQ.data ?? [];
  const allNotifs = notifsQ.data ?? [];
  const unreadCount = allNotifs.filter((n) => !n.is_read).length;
  const notifs = filter === "likes"
    ? allNotifs.filter((n) => n.kind.startsWith("like_"))
    : filter === "comments"
      ? allNotifs.filter((n) => n.kind.startsWith("comment_") || n.kind === "reply" || n.kind === "story_reply")
      : filter === "requests"
        ? allNotifs.filter((n) => n.kind.startsWith("follow"))
        : filter === "unread"
          ? allNotifs.filter((n) => !n.is_read)
          : allNotifs;

  const thumbIds = notifs
    .filter((n) => n.target_id && (n.target_type === "post" || n.target_type === "reel" || n.target_type === "story"))
    .map((n) => n.target_id as string);
  const thumbsQ = useQuery({
    queryKey: ["notif-thumbs", user?.id, thumbIds.slice(0, 50).join(",")],
    queryFn: () => listPostThumbs(thumbIds),
    enabled: !!user && thumbIds.length > 0,
  });
  const thumbs: Record<string, PostThumb> = thumbsQ.data ?? {};

  // Posts the current user has liked (permanent history)
  const myLikesQ = useQuery({
    queryKey: ["my-likes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_likes")
        .select("post_id, created_at, post:posts!post_likes_post_id_fkey(id, kind, author:profiles!posts_profile_id_fkey(id, username, avatar_url))")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        post_id: string;
        created_at: string;
        post: { id: string; kind: string; author: { id: string; username: string | null; avatar_url: string | null } | null } | null;
      }>;
    },
    enabled: !!user && (filter === "likes" || filter === "all"),
  });
  const myLikes = myLikesQ.data ?? [];
  const myLikeIds = myLikes.map((l) => l.post_id);
  const myLikeThumbsQ = useQuery({
    queryKey: ["my-like-thumbs", user?.id, myLikeIds.slice(0, 50).join(",")],
    queryFn: () => listPostThumbs(myLikeIds),
    enabled: !!user && myLikeIds.length > 0,
  });
  const myLikeThumbs: Record<string, PostThumb> = myLikeThumbsQ.data ?? {};

  // Your recent comments (last 24 hours) — includes comments on your own posts
  const cutoff24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const myCommentsQ = useQuery({
    queryKey: ["my-comments-24h", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("post_comments")
        .select("id, post_id, body, created_at, post:posts!post_comments_post_id_fkey(id, user_id, author:profiles!posts_profile_id_fkey(id, username, avatar_url))")
        .eq("user_id", user!.id)
        .gte("created_at", cutoff24)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        post_id: string;
        body: string;
        created_at: string;
        post: { id: string; user_id: string; author: { id: string; username: string | null; avatar_url: string | null } | null } | null;
      }>;
    },
    enabled: !!user && (filter === "comments" || filter === "all"),
  });
  const myComments = myCommentsQ.data ?? [];
  const myCommentPostIds = myComments.map((c) => c.post_id);
  const myCommentThumbsQ = useQuery({
    queryKey: ["my-comment-thumbs", user?.id, myCommentPostIds.slice(0, 50).join(",")],
    queryFn: () => listPostThumbs(myCommentPostIds),
    enabled: !!user && myCommentPostIds.length > 0,
  });
  const myCommentThumbs: Record<string, PostThumb> = myCommentThumbsQ.data ?? {};

  async function removeMyComment(commentId: string) {
    try {
      await deleteComment(commentId);
      toast.success("Comment deleted");
      qc.invalidateQueries({ queryKey: ["my-comments-24h", user?.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }


  if (!user) return <div className="p-6 text-sm text-muted-foreground">Sign in to see activity.</div>;

  const title =
    filter === "likes" ? "Likes"
    : filter === "comments" ? "Comments"
    : filter === "requests" ? "Follow updates"
    : filter === "unread" ? "Unread"
    : "Activity";

  return (
    <div className="pt-4 pb-24">
      <div className="flex items-center gap-2 px-3">
        <button
          onClick={() => (window.history.length > 1 ? router.history.back() : router.navigate({ to: "/" }))}
          className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="font-display text-2xl italic">{title}</h1>
        {unreadCount > 0 && (
          <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background">
            {unreadCount}
          </span>
        )}
        <button
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="glass ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-40"
        >
          <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
          Mark all read
        </button>
      </div>

      <nav className="mt-3 flex gap-2 px-3 text-sm">
        {(
          filter === "likes"
            ? (["likes"] as const)
            : filter === "comments"
              ? (["comments"] as const)
              : (["all", "unread", "requests", "likes", "comments"] as const)
        ).map((k) => (
          <Link
            key={k}
            to="/notifications"
            search={{ filter: k }}
            className={`glass rounded-full px-3 py-1.5 capitalize ${filter === k ? "bg-foreground text-background" : ""}`}
          >
            {k}
          </Link>
        ))}
      </nav>

      {(filter === "all" || filter === "requests") && requests.length > 0 && (
        <section className="mt-4 px-3">
          <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">Follow requests</div>
          <ul className="flex flex-col gap-1">
            {requests.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                <Avatar src={p.avatar_url} fallback={p.username} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm"><span className="font-semibold">{p.username ?? "user"}</span> wants to follow you</div>
                </div>
                <button onClick={() => accept(p)} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background"><Check className="h-4 w-4" /></button>
                <button onClick={() => reject(p)} className="glass flex h-8 w-8 items-center justify-center rounded-full"><X className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 px-3">
        {(filter === "likes" || filter === "all") && myLikes.length > 0 && (
          <div className="mb-4">
            <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">Posts you liked</div>
            <div className="grid grid-cols-3 gap-1">
              {myLikes.map((l) => {
                const t = myLikeThumbs[l.post_id];
                return (
                  <Link
                    key={l.post_id}
                    to="/profile/$userId"
                    params={{ userId: l.post?.author?.id ?? "" }}
                    className="relative aspect-square overflow-hidden rounded-md ring-1 ring-border"
                  >
                    {t?.url ? (
                      t.type === "video" ? (
                        <video src={t.url} className="h-full w-full object-cover" muted playsInline />
                      ) : (
                        <img src={t.url} alt="" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="h-full w-full bg-muted" />
                    )}
                    <span className="absolute bottom-1 right-1 rounded-full bg-background/80 p-1">
                      <Heart className="h-3 w-3 fill-red-500 text-red-500" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        {(filter === "comments" || filter === "all") && myComments.length > 0 && (
          <div className="mb-4">
            <div className="px-2 pb-2 text-xs font-medium text-muted-foreground">Your comments (last 24h)</div>
            <ul className="flex flex-col gap-2">
              {myComments.map((c) => {
                const t = myCommentThumbs[c.post_id];
                const authorId = c.post?.author?.id ?? c.post?.user_id ?? "";
                return (
                  <li key={c.id} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-foreground/[0.04]">
                    <Link
                      to={authorId ? "/profile/$userId" : "/notifications"}
                      params={authorId ? { userId: authorId } : undefined}
                      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md ring-1 ring-border"
                    >
                      {t?.url ? (
                        t.type === "video" ? (
                          <video src={t.url} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          <img src={t.url} alt="" className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="h-full w-full bg-muted" />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="text-[11px] text-muted-foreground">
                        on <span className="font-semibold text-foreground">@{c.post?.author?.username ?? "user"}</span>'s post · {timeAgo(c.created_at)}
                      </div>
                      <div className="truncate text-foreground/90">"{c.body}"</div>
                    </div>
                    <button
                      onClick={() => removeMyComment(c.id)}
                      className="glass flex h-8 w-8 items-center justify-center rounded-full text-[oklch(0.62_0.22_20)] active:scale-95"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        {notifsQ.isLoading ? (
          <div className="mt-16 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : notifs.length === 0 && !(filter === "comments" && myComments.length > 0) && !(filter === "likes" && myLikes.length > 0) ? (
          <p className="mt-16 text-center text-sm text-muted-foreground">
            {filter === "likes" ? "No likes yet." : filter === "comments" ? "No comments yet." : "You have no activity yet."}
          </p>
        ) : notifs.length === 0 ? null : (
          <ul className="flex flex-col">
            {notifs.map((n) => (
              <NotifItem key={n.id} n={n} thumb={n.target_id ? thumbs[n.target_id] : undefined} onToggleRead={() => toggleRead(n)} />
            ))}
          </ul>
        )}
      </section>

      <NotificationSettings userId={user.id} />
    </div>
  );
}


function NotifItem({ n, thumb, onToggleRead }: { n: NotifRow; thumb?: PostThumb; onToggleRead?: () => void }) {
  const meta = KIND_LABEL[n.kind] ?? { icon: Bell, text: n.kind };
  const Icon = meta.icon;
  const actorId = n.actor?.id;
  return (
    <li className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-foreground/[0.04]">
      <Link to={actorId ? "/profile/$userId" : "/notifications"} params={actorId ? { userId: actorId } : undefined}>
        <div className="relative">
          <Avatar src={n.actor?.avatar_url ?? null} fallback={n.actor?.username} />
          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <Icon className="h-3 w-3" />
          </span>
        </div>
      </Link>
      <div className="min-w-0 flex-1 text-sm">
        <Link to={actorId ? "/profile/$userId" : "/notifications"} params={actorId ? { userId: actorId } : undefined}>
          <span className="font-semibold">{n.actor?.username ?? "someone"}</span>
        </Link>{" "}
        <span className="text-foreground/90">{meta.text}</span>
        {typeof n.preview?.body === "string" && (
          <div className="truncate text-xs text-muted-foreground">"{n.preview.body as string}"</div>
        )}
        <div className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</div>
      </div>
      {thumb?.url ? (
        thumb.type === "video" ? (
          <video src={thumb.url} className="h-11 w-11 rounded-md object-cover ring-1 ring-border" muted playsInline />
        ) : (
          <img src={thumb.url} alt="" className="h-11 w-11 rounded-md object-cover ring-1 ring-border" />
        )
      ) : null}
      <button
        onClick={onToggleRead}
        aria-label={n.is_read ? "Mark as unread" : "Mark as read"}
        className="flex h-6 w-6 items-center justify-center rounded-full transition active:scale-90"
      >
        <span
          className={`rounded-full transition-all ${n.is_read ? "h-2 w-2 bg-muted-foreground/30" : "h-2.5 w-2.5 bg-primary shadow-[0_0_0_4px_color-mix(in_oklab,var(--primary)_20%,transparent)]"}`}
        />
      </button>
    </li>
  );
}

function Avatar({ src, fallback }: { src: string | null; fallback: string | null | undefined }) {
  if (src && src.startsWith("http")) return <img src={src} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />;
  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
      {(fallback ?? "?")[0]?.toUpperCase()}
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}
