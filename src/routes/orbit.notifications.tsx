// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, UserPlus, Sparkles } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { listOrbitNotifications } from "@/lib/api/orbit-identity";

export const Route = createFileRoute("/orbit/notifications")({
  component: OrbitNotifications,
  head: () => ({
    meta: [
      { title: "Activity — Samsta Orbit" },
      { name: "description", content: "Orbit activity: likes, replies, mentions, reposts, new followers and AI suggestions." },
      { property: "og:title", content: "Activity — Samsta Orbit" },
      { property: "og:description", content: "Everything happening around your Orbit identity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const ICONS: any = { like: Heart, reply: MessageCircle, repost: Sparkles, follow: UserPlus };

function OrbitNotifications() {
  const { user } = useAuthUser();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["orbit-notifications", user?.id ?? null],
    queryFn: () => listOrbitNotifications(user?.id ?? null),
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title="Activity" subtitle="Likes · Replies · Followers · AI" />
      <main className="relative mt-4 flex flex-col gap-2 px-4">
        {isLoading && <div className="glass h-16 animate-pulse rounded-3xl" />}
        {!isLoading && !items.length && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">Quiet orbit — no activity yet.</div>
        )}
        {items.map((n) => {
          const Icon = ICONS[n.kind] ?? Sparkles;
          const body = (
            <article className="glass flex items-center gap-3 rounded-3xl p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold">{n.actor?.display_name ?? n.actor?.username ?? "Someone"}</span>{" "}
                <span className="text-muted-foreground">{n.text}</span>
              </p>
            </article>
          );
          return n.postId
            ? <Link key={n.id} to="/orbit/$postId" params={{ postId: n.postId }}>{body}</Link>
            : <div key={n.id}>{body}</div>;
        })}
      </main>
    </div>
  );
}
