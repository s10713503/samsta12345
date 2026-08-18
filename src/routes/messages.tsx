import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { TopBar } from "@/components/samsta/TopBar";
import { useAuthUser } from "@/hooks/use-auth";
import { listChats, subscribeChats } from "@/lib/api/messages";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
  head: () => ({
    meta: [
      { title: "Messages · Samsta" },
      { name: "description", content: "Direct messages, group chats, and Sam-assisted smart replies on Samsta." },
      { property: "og:title", content: "Messages · Samsta" },
      { property: "og:description", content: "Direct messages and group chats on Samsta." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/messages" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/messages" }],
  }),
});

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function MessagesPage() {
  const { user } = useAuthUser();
  const q = useQuery({
    queryKey: ["chats", user?.id],
    queryFn: () => listChats(user!.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeChats(user.id, () => q.refetch());
    return unsub;
  }, [user?.id]);

  const chats = q.data ?? [];

  return (
    <>
      <TopBar title="Messages" />
      <div className="px-4 pt-2 pb-32">
        <Link
          to="/connections"
          className="glass mb-3 flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-transform active:scale-[0.99]"
        >
          <span>Connection permissions</span>
          <span className="text-xs text-muted-foreground">Manage who can message or call you</span>
        </Link>
        {q.isLoading && <div className="mt-10 text-center text-sm text-muted-foreground">Loading…</div>}
        {!q.isLoading && chats.length === 0 && (
          <div className="glass mt-8 flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground" />
            <div className="font-display text-lg">No conversations yet</div>
            <p className="text-xs text-muted-foreground">Start a chat from someone's profile.</p>
          </div>
        )}
        <ul className="mt-2 space-y-1">
          {chats.map((c) => {
            const other = c.is_group
              ? null
              : c.members.find((m) => m.user_id !== user?.id)?.profile;
            const title = c.is_group ? c.name || "Group" : other?.username || other?.full_name || "user";
            const preview = c.last_message?.body
              || (c.last_message?.media?.length ? "📎 Attachment" : "Say hello");
            return (
              <li key={c.id}>
                <Link
                  to="/messages/$chatId"
                  params={{ chatId: c.id }}
                  className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-foreground/5"
                >
                  {other?.avatar_url ? (
                    <img src={other.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-muted ring-1 ring-border" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="truncate text-sm font-semibold">{title}</div>
                      {c.last_message && (
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(c.last_message.created_at)}
                        </div>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{preview}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
