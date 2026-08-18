// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitCard } from "@/components/samsta/OrbitCard";
import { OrbitComposer } from "@/components/samsta/OrbitComposer";
import {
  getOrbitPost, listReplies, toggleOrbitLike, toggleOrbitBookmark, repostOrbit,
  voteOrbitPoll, deleteOrbitPost, subscribeOrbit,
} from "@/lib/api/orbit";

export const Route = createFileRoute("/orbit/$postId")({
  component: OrbitThread,
  head: () => ({
    meta: [
      { title: "Orbit conversation · Samsta" },
      { name: "description", content: "Follow the full Samsta Orbit conversation thread with replies, quotes and live reactions." },
      { property: "og:title", content: "Orbit conversation · Samsta" },
      { property: "og:description", content: "Replies, quotes and live reactions inside Samsta Orbit." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function OrbitThread() {
  const { postId } = Route.useParams();
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const [reply, setReply] = useState(false);

  const { data: post } = useQuery({
    queryKey: ["orbit-post", postId, user?.id ?? null],
    queryFn: () => getOrbitPost(postId, user?.id ?? null),
  });
  const { data: replies = [] } = useQuery({
    queryKey: ["orbit-replies", postId, user?.id ?? null],
    queryFn: () => listReplies(postId, user?.id ?? null),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["orbit-post", postId] });
    qc.invalidateQueries({ queryKey: ["orbit-replies", postId] });
  };

  useEffect(() => {
    let t: any;
    return subscribeOrbit(() => { clearTimeout(t); t = setTimeout(refresh, 700); });
  }, [postId]);

  const act = async (fn: () => Promise<any>) => { try { await fn(); } finally { refresh(); } };
  const handlers = {
    meId: user?.id ?? null,
    onLike: (x) => act(() => toggleOrbitLike(x.id, user.id, !x.liked)),
    onBookmark: (x) => act(() => toggleOrbitBookmark(x.id, user.id, !x.bookmarked)),
    onRepost: (x) => act(() => repostOrbit(x.id, user.id)),
    onQuote: () => setReply(true),
    onVote: (x, o) => act(() => voteOrbitPoll(x.id, o, user.id)),
    onDelete: (x) => act(() => deleteOrbitPost(x.id)),
  };

  return (
    <div className="relative min-h-dvh pb-28">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-60 opacity-60 blur-3xl animate-aurora"
        style={{ background: "radial-gradient(200px 130px at 75% 0%, oklch(0.8 0.13 300 / 0.5), transparent 70%)" }} />
      <header className="relative flex items-center gap-3 px-4 pt-4">
        <Link to="/orbit" aria-label="Back" className="glass flex h-9 w-9 items-center justify-center rounded-full">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-display text-lg italic">Conversation</h1>
      </header>

      <main className="relative mt-4 flex flex-col gap-3 px-4">
        {post ? <OrbitCard post={post} {...handlers} /> : <div className="glass h-28 animate-pulse rounded-3xl" />}
        <div className="flex items-center gap-2 pl-1 text-xs text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" /> {replies.length} replies
        </div>
        <div className="flex flex-col gap-3 border-l border-border/60 pl-3">
          {replies.map((r) => <OrbitCard key={r.id} post={r} {...handlers} compact />)}
        </div>
      </main>

      <button onClick={() => setReply(true)}
        className="fixed bottom-8 left-1/2 z-40 -translate-x-1/2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-xl transition-transform active:scale-95"
        style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
        Reply in orbit
      </button>

      <OrbitComposer open={reply} onClose={() => setReply(false)} userId={user?.id ?? null}
        parentId={postId} rootId={post?.root_id ?? postId} onDone={refresh} />
    </div>
  );
}