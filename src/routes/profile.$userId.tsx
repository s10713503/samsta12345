// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Grid3x3, Film, ArrowLeft, MessageCircle, Bot, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaViewer, type ViewerItem } from "@/components/samsta/MediaViewer";
import { useAuthUser } from "@/hooks/use-auth";
import { getProfile, getFollowCounts, getFollowStatus, follow, unfollow } from "@/lib/api/social";
import { listUserPosts, signOne } from "@/lib/api/feed";
import { GridMediaTile } from "@/components/samsta/GridMediaTile";
import { ConnectActions } from "@/components/samsta/ConnectActions";

export const Route = createFileRoute("/profile/$userId")({
  component: PublicProfilePage,
  // Deep link: /profile/<id>?post=<postId> opens and highlights that post.
  validateSearch: (s: Record<string, unknown>) => ({
    post: typeof s.post === "string" && s.post ? s.post : undefined,
  }),
  head: ({ params }) => ({
    meta: [
      { title: "Profile — Samsta" },
      { name: "description", content: "View this Samsta member's posts, reels, and public activity." },
      { property: "og:title", content: "Profile — Samsta" },
      { property: "og:description", content: "View this Samsta member's posts, reels, and public activity." },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: `/profile/${params.userId}` },
      { property: "og:site_name", content: "Samsta" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Profile — Samsta" },
      { name: "twitter:description", content: "View this Samsta member's posts, reels, and public activity." },
    ],
    links: [{ rel: "canonical", href: `/profile/${params.userId}` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: { "@type": "Person", identifier: params.userId },
        }),
      },
    ],
  }),
});

type TabKey = "grid" | "reels";

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { post: deepPostId } = Route.useSearch();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthUser();
  const [tab, setTab] = useState<TabKey>("grid");
  const [viewer, setViewer] = useState<{ items: ViewerItem[]; index: number; mode: "photo" | "reel" } | null>(null);
  const [openedDeepLink, setOpenedDeepLink] = useState(false);

  const isMe = currentUser?.id === userId;

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId),
    enabled: !!userId,
  });

  const countsQ = useQuery({
    queryKey: ["follow-counts", userId],
    queryFn: () => getFollowCounts(userId),
    enabled: !!userId,
  });

  const followQ = useQuery({
    queryKey: ["follow-status", currentUser?.id, userId],
    queryFn: () => getFollowStatus(currentUser!.id, userId),
    enabled: !!currentUser?.id && !!userId && !isMe,
  });
  const followStatus = followQ.data ?? "none";
  const isFollowing = followStatus === "accepted";
  const isPending = followStatus === "pending";

  // Live status: the moment the owner approves or rejects, this screen updates.
  useEffect(() => {
    if (!currentUser?.id || isMe) return;
    const ch = supabase
      .channel(`follow-status-${currentUser.id}-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "follows", filter: `follower_id=eq.${currentUser.id}` },
        () => followQ.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, userId, isMe]);
  const isPrivate = !!profileQ.data?.is_private;
  const canView = isMe || !isPrivate || isFollowing;

  const postsQ = useQuery({
    queryKey: ["user-posts", userId, "post"],
    queryFn: () => listUserPosts(userId, "post"),
    enabled: !!userId && canView,
  });

  const reelsQ = useQuery({
    queryKey: ["user-posts", userId, "reel"],
    queryFn: () => listUserPosts(userId, "reel"),
    enabled: !!userId && canView,
  });

  // Live: this member's new/removed posts and privacy changes appear instantly.
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`user-live-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${userId}` },
        () => {
          postsQ.refetch();
          reelsQ.refetch();
          countsQ.refetch();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => profileQ.refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const avatarSignedQ = useQuery({
    queryKey: ["avatar-url", profileQ.data?.avatar_url],
    queryFn: () => signOne(profileQ.data!.avatar_url as string),
    enabled: !!profileQ.data?.avatar_url,
  });


  const displayAvatar = avatarSignedQ.data ?? "";
  const displayName = profileQ.data?.full_name ?? "";
  const username = profileQ.data?.username ?? "user";
  const bio = profileQ.data?.bio ?? "";

  const posts = postsQ.data ?? [];
  const reels = reelsQ.data ?? [];
  const activeItems = tab === "reels" ? reels : posts;

  const viewerItems: ViewerItem[] = useMemo(
    () =>
      activeItems.map((p) => ({
        id: p.id,
        image: p.media[0]?.url ?? "",
        type: p.media[0]?.type ?? "image",
        targetType: p.kind,
        user: { name: username, avatar: displayAvatar },
        caption: p.caption ?? "",
      })),
    [activeItems, username, displayAvatar],
  );

  // Deep link: switch to the right tab, scroll the post into view and open it.
  useEffect(() => {
    if (!deepPostId || openedDeepLink || !canView) return;
    const inReels = reels.some((p) => p.id === deepPostId);
    const inPosts = posts.some((p) => p.id === deepPostId);
    if (!inReels && !inPosts) return;
    const wanted: TabKey = inReels ? "reels" : "grid";
    if (tab !== wanted) {
      setTab(wanted);
      return;
    }
    const idx = activeItems.findIndex((p) => p.id === deepPostId);
    if (idx < 0) return;
    setOpenedDeepLink(true);
    document.getElementById(`post-${deepPostId}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    setViewer({ items: viewerItems, index: idx, mode: wanted === "reels" ? "reel" : "photo" });
  }, [deepPostId, openedDeepLink, canView, posts, reels, tab, activeItems, viewerItems]);


  if (!userId) return <div className="p-6 text-sm text-muted-foreground">User not found.</div>;

  return (
    <div className="pt-5">
      <div className="flex items-center justify-between px-5">
        <button
          onClick={() => navigate({ to: "/" })}
          className="glass flex h-10 w-10 items-center justify-center rounded-full"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={1.8} />
        </button>
        <h1 className="font-display text-2xl italic">{username}</h1>
        <div className="w-10" />
      </div>

      <div className="mt-5 flex items-center gap-5 px-5">
        <div className="story-gradient h-24 w-24 rounded-full p-[3px]">
          <div className="h-full w-full rounded-full bg-background p-[2px]">
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                {username.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-1 justify-around text-center">
          {[
            { n: countsQ.data?.posts ?? 0, l: "posts" },
            { n: countsQ.data?.followers ?? 0, l: "followers" },
            { n: countsQ.data?.following ?? 0, l: "following" },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl px-3 py-1">
              <div className="font-semibold tabular-nums">{s.n}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 px-5">
        {displayName && <div className="text-sm font-semibold">{displayName}</div>}
        {bio && <p className="mt-0.5 whitespace-pre-line text-sm text-foreground/80">{bio}</p>}
      </div>

      <div className="mt-4 flex gap-2 px-5">
        {isMe ? (
          <Link to="/profile" className="glass flex-1 rounded-full py-2 text-center text-sm font-medium">
            Edit profile
          </Link>
        ) : (
          <>
            <button
              onClick={async () => {
                if (!currentUser) return;
                if (isFollowing || isPending) await unfollow(currentUser.id, userId);
                else await follow(currentUser.id, userId, isPrivate);
                followQ.refetch();
              }}
              className={`flex-1 rounded-full py-2 text-sm font-medium ${isFollowing || isPending ? "glass" : "text-white"}`}
              style={isFollowing || isPending ? undefined : { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
            >
              {isFollowing ? "Following" : isPending ? "Requested" : isPrivate ? "Request" : "Follow"}
            </button>
            <ConnectActions peerId={userId} peerName={username || "user"} />
            <Link
              to="/twin/$userId"
              params={{ userId }}
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.5 0.1 30))" }}
            >
              <Bot className="h-4 w-4" />
              Twin
            </Link>
          </>
        )}
      </div>

      {!canView ? (
        <div className="mt-10 flex flex-col items-center gap-2 px-8 text-center">
          <div className="glass flex h-14 w-14 items-center justify-center rounded-full">
            <Lock className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <div className="text-sm font-semibold">This account is private</div>
          <p className="text-xs text-muted-foreground">
            Follow @{username} to see their photos, reels, podcasts and stories.
          </p>
        </div>
      ) : (
      <>
      <div className="mt-6 flex items-center justify-around border-y border-border">
        {([
          { key: "grid", Icon: Grid3x3 },
          { key: "reels", Icon: Film },
        ] as const).map(({ key, Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-1 justify-center py-3 ${tab === key ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}
          >
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {activeItems.length === 0 ? (
          <div className="mt-16 text-center text-sm text-muted-foreground">No {tab} yet.</div>
        ) : (
          <div className="grid grid-cols-3 gap-[6px] px-[6px] pt-1">
            {activeItems.map((p, i) => {
              const m = p.media[0];
              return (
                <button
                  key={p.id}
                  id={`post-${p.id}`}
                  onClick={() => setViewer({ items: viewerItems, index: i, mode: tab === "reels" ? "reel" : "photo" })}
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  className={`group relative aspect-square animate-fade-in overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border/40 transition-all duration-300 active:scale-[0.98] active:opacity-90 ${
                    deepPostId === p.id ? "ring-2 ring-primary ring-inset z-10" : ""
                  }`}
                >

                  <GridMediaTile media={m} count={p.media?.length ?? 1} isReel={tab === "reels" || p.kind === "reel"} />

                  {tab === "reels" && (
                    <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 backdrop-blur">
                      <Film className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {viewer && <MediaViewer items={viewer.items} startIndex={viewer.index} mode={viewer.mode} onClose={() => setViewer(null)} />}
    </div>
  );
}
