import { createFileRoute, Link } from "@tanstack/react-router";

import { TopBar } from "@/components/samsta/TopBar";
import { StoryRail } from "@/components/samsta/StoryRail";
import { FeedPost } from "@/components/samsta/FeedPost";
import { UniverseMenu } from "@/components/samsta/UniverseMenu";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { listFeedPage } from "@/lib/api/feed";
import { useRealtimeFeed } from "@/hooks/use-realtime";
import { WelcomeVoice } from "@/components/samsta/WelcomeVoice";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Samsta — Your beautifully quiet social feed" },
      { name: "description", content: "Browse a calm, ad-light social feed on Samsta. Share photos, reels, and stories with the people you actually care about." },
      { property: "og:title", content: "Samsta — Your beautifully quiet social feed" },
      { property: "og:description", content: "Browse a calm, ad-light social feed on Samsta. Share photos, reels, and stories with the people you actually care about." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Samsta",
          url: "/",
          potentialAction: {
            "@type": "SearchAction",
            target: "/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Samsta",
          url: "/",
          description: "A luxury social network for sharing life's best moments, with Sam built in.",
        }),
      },
    ],
  }),
});

function Home() {
  const {
    data,
    isLoading,
    isError,
    error,

    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed", "post"],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => listFeedPage("post", { before: pageParam }),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 30_000,
    retry: 2,
  });
  const posts = useMemo(() => (data?.pages ?? []).flatMap((p) => p.items), [data]);
  const sentinel = useRef<HTMLDivElement | null>(null);
  useRealtimeFeed("post", ["feed", "post"]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <h1 className="sr-only">Samsta — your beautifully quiet social feed</h1>
      <WelcomeVoice />
      <TopBar />
      <UniverseMenu />



      <StoryRail />
      <div className="mx-4 mb-4 h-px bg-border" />
      {isLoading ? (
        <div className="flex flex-col gap-6 px-4">
          {[0, 1].map((i) => (
            <div key={i} className="glass h-[420px] animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="mx-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-10 text-center">
          <div className="font-display text-xl italic">Couldn’t load your feed</div>
          <p className="max-w-xs text-sm text-muted-foreground">
            We couldn’t reach your feed just now. Refresh to try again — your posts are safe.
          </p>
          {error instanceof Error && error.message && (
            <p className="max-w-xs break-words text-xs text-muted-foreground/70">
              {error.message}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
            >
              Refresh feed
            </button>
            <Link
              to="/create"
              search={{} as any}
              className="rounded-full border border-border px-5 py-2 text-sm font-medium"
            >
              Go to uploads
            </Link>
          </div>
        </div>
      ) : posts.length === 0 ? (

        <div className="mx-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-10 text-center">
          <div className="font-display text-xl italic">Your feed is quiet</div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Share your first photo, reel, or story. Follow people to see theirs here.
          </p>
          <Link to="/create" search={{} as any} className="mt-2 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">
            Create a post
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {posts.map((post, i) => <FeedPost key={post.id} post={post} index={i} />)}
          <div ref={sentinel} className="h-px" />
          {isFetchingNextPage && (
            <div className="glass mx-4 h-[320px] animate-pulse rounded-3xl" />
          )}
        </div>
      )}
    </>
  );
}
