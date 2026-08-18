// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquarePlus, Pin } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { listOrbitThreads } from "@/lib/api/orbit-identity";

export const Route = createFileRoute("/orbit/messages")({
  component: OrbitMessages,
  head: () => ({
    meta: [
      { title: "Inbox — Samsta Orbit" },
      { name: "description", content: "Your Orbit inbox: one-to-one and group conversations kept separate from Samsta chats." },
      { property: "og:title", content: "Inbox — Samsta Orbit" },
      { property: "og:description", content: "A separate Orbit inbox for your Orbit identity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function OrbitMessages() {
  const { user } = useAuthUser();
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["orbit-threads", user?.id ?? null],
    queryFn: () => listOrbitThreads(user?.id ?? null),
    enabled: !!user?.id,
  });

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title="Orbit Inbox" subtitle="Separate from Samsta chats"
        right={<button aria-label="New conversation" className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90"><MessageSquarePlus className="h-4 w-4" /></button>} />

      <main className="relative mt-4 flex flex-col gap-2 px-4">
        {isLoading && <div className="glass h-20 animate-pulse rounded-3xl" />}
        {!isLoading && !threads.length && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">
            No Orbit conversations yet — start one from a creator's profile.
          </div>
        )}
        {threads.map((t) => (
          <article key={t.id} className="glass flex items-center gap-3 rounded-3xl p-3">
            <div className="h-11 w-11 shrink-0 rounded-full" style={{ background: "linear-gradient(135deg, oklch(0.8 0.11 300), oklch(0.84 0.1 210))" }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{t.title ?? (t.is_group ? "Group" : "Conversation")}</p>
              <p className="truncate text-xs text-muted-foreground">{t.preview ?? "No messages yet"}</p>
            </div>
            {t.is_pinned && <Pin className="h-3.5 w-3.5 text-muted-foreground" />}
          </article>
        ))}
      </main>
    </div>
  );
}
