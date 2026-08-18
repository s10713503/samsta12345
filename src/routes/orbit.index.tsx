// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Orbit, Search, Plus, Flame, Users, Radio, Mic, Sparkles, MapPin, Bookmark, Bell } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitCard } from "@/components/samsta/OrbitCard";
import { OrbitComposer } from "@/components/samsta/OrbitComposer";
import { cn } from "@/lib/utils";
import {
  listOrbit, listTopics, listCommunities, toggleOrbitLike, toggleOrbitBookmark,
  repostOrbit, voteOrbitPoll, deleteOrbitPost, searchOrbit, subscribeOrbit,
  type OrbitLane, type OrbitPost,
} from "@/lib/api/orbit";

export const Route = createFileRoute("/orbit/")({
  component: OrbitHome,
  head: () => ({
    meta: [
      { title: "Samsta Orbit — Real-time Conversations & Podcasts" },
      { name: "description", content: "Samsta Orbit is a premium real-time space for conversations, trends, podcasts, communities and creator voices." },
      { property: "og:title", content: "Samsta Orbit — Real-time Conversations & Podcasts" },
      { property: "og:description", content: "Conversations, trends, podcasts and communities — live inside Samsta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const LANES: { key: OrbitLane; label: string; icon: any }[] = [
  { key: "foryou", label: "For you", icon: Sparkles },
  { key: "following", label: "Following", icon: Users },
  { key: "trending", label: "Trending", icon: Flame },
  { key: "live", label: "Live", icon: Radio },
  { key: "podcasts", label: "Podcasts", icon: Mic },
  { key: "new", label: "New", icon: Orbit },
  { key: "local", label: "Nearby", icon: MapPin },
  { key: "bookmarks", label: "Saved", icon: Bookmark },
];

function OrbitHome() {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const [lane, setLane] = useState<OrbitLane>("foryou");
  const [topic, setTopic] = useState<string | null>(null);
  const [community, setCommunity] = useState<string | null>(null);
  const [term, setTerm] = useState("");
  const [composer, setComposer] = useState<{ open: boolean; quoteOf?: string | null }>({ open: false });
  const sentinel = useRef<HTMLDivElement | null>(null);

  const key = ["orbit", lane, topic, community, user?.id ?? null];

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: key,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      listOrbit({ lane, userId: user?.id ?? null, cursor: pageParam, topic, communityId: community }),
    getNextPageParam: (last) => last.nextCursor,
  });

  const { data: topics = [] } = useQuery({ queryKey: ["orbit-topics"], queryFn: () => listTopics(), staleTime: 60_000 });
  const { data: communities = [] } = useQuery({ queryKey: ["orbit-communities"], queryFn: listCommunities, staleTime: 60_000 });
  const { data: results = [] } = useQuery({
    queryKey: ["orbit-search", term, user?.id ?? null],
    queryFn: () => searchOrbit(term, user?.id ?? null),
    enabled: term.trim().length > 1,
  });

  const posts: OrbitPost[] = useMemo(
    () => (term.trim().length > 1 ? results : (data?.pages ?? []).flatMap((p) => p.items)),
    [data, results, term],
  );

  useEffect(() => {
    let t: any;
    return subscribeOrbit(() => {
      clearTimeout(t);
      t = setTimeout(() => qc.invalidateQueries({ queryKey: ["orbit"] }), 700);
    });
  }, [qc]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const refresh = useCallback(() => qc.invalidateQueries({ queryKey: ["orbit"] }), [qc]);

  const act = async (fn: () => Promise<any>) => { try { await fn(); } finally { refresh(); } };

  return (
    <div className="relative min-h-dvh pb-28">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-72 opacity-70 blur-3xl animate-aurora"
        style={{ background: "radial-gradient(220px 140px at 80% 0%, oklch(0.8 0.13 300 / 0.55), transparent 70%), radial-gradient(240px 160px at 5% 20%, oklch(0.82 0.12 210 / 0.5), transparent 70%)" }} />

      <header className="relative px-4 pt-4">
        <div className="flex items-center gap-3">
          <Link to="/" aria-label="Back" className="glass flex h-9 w-9 items-center justify-center rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
              <Orbit className="h-5 w-5 animate-orbit-spin" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-xl italic leading-none">Samsta Orbit</h1>
              <p className="truncate text-[11px] text-muted-foreground">Real-time · Podcasts · Communities</p>
            </div>
          </div>
          <Link to="/notifications" aria-label="Notifications" className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <Bell className="h-4 w-4" />
          </Link>
          <Link to="/sam" aria-label="AI assistant" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            <Sparkles className="h-4 w-4" />
          </Link>
          <button onClick={() => setComposer({ open: true })} aria-label="Create Orbit post"
            className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="glass-strong mt-3 flex items-center gap-2 rounded-full px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search conversations, topics, voices"
            className="w-full bg-transparent text-sm outline-none" />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {LANES.map(({ key: k, label, icon: Icon }) => (
            <button key={k} onClick={() => { setLane(k); setTopic(null); setCommunity(null); }}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                lane === k && !topic && !community ? "bg-foreground text-background" : "glass text-muted-foreground",
              )}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {!!topics.length && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {topics.map((t) => (
              <button key={t.id} onClick={() => setTopic(topic === t.slug ? null : t.slug)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[11px] transition-all active:scale-95",
                  topic === t.slug ? "bg-primary text-primary-foreground" : "glass text-muted-foreground",
                )}>
                #{t.label}
              </button>
            ))}
          </div>
        )}

        {!!communities.length && (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {communities.map((c) => (
              <button key={c.id} onClick={() => setCommunity(community === c.id ? null : c.id)}
                className={cn(
                  "glass relative shrink-0 overflow-hidden rounded-2xl px-3 py-2 text-left transition-all active:scale-95",
                  community === c.id && "ring-1 ring-primary/60",
                )}>
                <span aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl"
                  style={{ background: c.accent ?? "oklch(0.85 0.1 290)" }} />
                <span className="relative block text-xs font-semibold">{c.name}</span>
                <span className="relative block text-[10px] text-muted-foreground">{c.member_count} orbiting</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="relative mt-4 flex flex-col gap-3 px-4">
        {isLoading && <div className="glass h-32 animate-pulse rounded-3xl" />}
        {!isLoading && !posts.length && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">
            Nothing in this orbit yet — be the first voice.
          </div>
        )}
        {posts.map((p) => (
          <OrbitCard key={p.id} post={p} meId={user?.id ?? null} compact
            onLike={(x) => act(() => toggleOrbitLike(x.id, user.id, !x.liked))}
            onBookmark={(x) => act(() => toggleOrbitBookmark(x.id, user.id, !x.bookmarked))}
            onRepost={(x) => act(() => repostOrbit(x.id, user.id))}
            onQuote={(x) => setComposer({ open: true, quoteOf: x.id })}
            onVote={(x, o) => act(() => voteOrbitPoll(x.id, o, user.id))}
            onDelete={(x) => act(() => deleteOrbitPost(x.id))}
          />
        ))}
        <div ref={sentinel} className="h-8" />
      </main>

      <button onClick={() => setComposer({ open: true })} aria-label="New Orbit post"
        className="fixed bottom-8 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-90 animate-orb"
        style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
        <Plus className="h-6 w-6" />
      </button>

      <OrbitComposer open={composer.open} quoteOf={composer.quoteOf ?? null} communityId={community}
        userId={user?.id ?? null} onClose={() => setComposer({ open: false })} onDone={refresh} />
    </div>
  );
}