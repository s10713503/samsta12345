import { useEffect, useState } from "react";
import { X, Heart, MessageCircle, Film, Image as ImageIcon, Video } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthUser } from "@/hooks/use-auth";
import { listRecentActivity, subscribeActivity, type ActivityRow } from "@/lib/api/activity";

type Tab = "likes" | "comments";

const TargetIcon = ({ target }: { target: string | null }) => {
  const cls = "h-3 w-3";
  if (target === "reel") return <Film className={cls} strokeWidth={2} />;
  if (target === "video") return <Video className={cls} strokeWidth={2} />;
  if (target === "comment") return <MessageCircle className={cls} strokeWidth={2} />;
  return <ImageIcon className={cls} strokeWidth={2} />;
};

const kindLabel = (k: string) => {
  switch (k) {
    case "like_post": return "liked your post";
    case "like_reel": return "liked your reel";
    case "like_story": return "liked your story";
    case "like_comment": return "liked your comment";
    case "comment_post": return "commented on your post";
    case "comment_reel": return "commented on your reel";
    case "reply": return "replied to your comment";
    default: return "interacted";
  }
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
}

const ALL_TABS: Tab[] = ["likes", "comments"];

export function ActivitySheet({
  open,
  initialTab = "likes",
  tabs,
  onClose,
}: {
  open: boolean;
  initialTab?: Tab;
  tabs?: Tab[];
  onClose: () => void;
}) {
  const allowedTabs = tabs ?? ALL_TABS;
  const [tab, setTab] = useState<Tab>(initialTab);
  const { user } = useAuthUser();

  useEffect(() => {
    if (!open) return;
    setTab(allowedTabs.includes(initialTab) ? initialTab : allowedTabs[0]);
  }, [open, initialTab, allowedTabs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const q = useQuery({
    queryKey: ["activity", user?.id, tab],
    queryFn: () => listRecentActivity(user!.id, tab),
    enabled: !!user && open,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!user || !open) return;
    return subscribeActivity(user.id, () => q.refetch());
  }, [user, open, q]);

  if (!open) return null;

  const items = (q.data ?? []) as ActivityRow[];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      <button aria-label="Close activity" onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md animate-fade-in" />

      <div className="relative mt-auto flex h-[88vh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-border/60 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--background) 92%, var(--rose)) 100%)",
          animation: "sheet-up 380ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-foreground/20" />

        <div className="flex items-center justify-between px-5 pt-3">
          <div>
            <h2 className="font-display text-2xl italic tracking-tight text-gradient">
              {allowedTabs.length === 1
                ? allowedTabs[0] === "likes" ? "Likes" : "Comments"
                : "Activity"}
            </h2>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Last 24 hours</p>
          </div>
          <button onClick={onClose} className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95 transition" aria-label="Close">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        {allowedTabs.length > 1 && (
          <div className="mx-5 mt-4 grid grid-cols-2 rounded-full glass p-1">
            {allowedTabs.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  tab === t ? "text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {tab === t && (
                  <span className="absolute inset-0 rounded-full"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.55 0.14 25))",
                      boxShadow: "0 8px 24px -8px oklch(0.5 0.1 20 / 0.35)",
                    }} />
                )}
                <span className="relative flex items-center gap-1.5">
                  {t === "likes" ? <Heart className="h-3.5 w-3.5" strokeWidth={2} /> : <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />}
                  {t === "likes" ? "Likes" : "Comments"}
                </span>
              </button>
            ))}
          </div>
        )}

        <div key={tab} className="flex-1 overflow-y-auto px-3 pb-8 pt-3">
          {!user ? (
            <EmptyState title="Sign in required" body="Sign in to see activity on your posts." tab={tab} />
          ) : q.isLoading ? (
            <div className="flex flex-col gap-2 px-2 pt-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-2xl p-2 animate-pulse">
                  <div className="h-11 w-11 rounded-full bg-foreground/10" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-2/3 rounded bg-foreground/10" />
                    <div className="h-2.5 w-1/3 rounded bg-foreground/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState tab={tab} />
          ) : (
            <ul className="flex flex-col gap-1">
              {items.map((it, i) => {
                const commentBody = (it.preview && typeof it.preview === "object" && "body" in it.preview)
                  ? String((it.preview as { body?: string }).body ?? "") : "";
                const initials = (it.actor?.full_name || it.actor?.username || "?").slice(0, 2).toUpperCase();
                return (
                  <li key={it.id} className="animate-fade-in" style={{ animationDelay: `${i * 30}ms`, animationFillMode: "both" }}>
                    <button className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-foreground/[0.04] active:scale-[0.99]">
                      <div className="relative shrink-0">
                        <span className="absolute inset-0 rounded-full opacity-0 blur-md transition-opacity group-hover:opacity-100"
                          style={{ background: "radial-gradient(circle, var(--rose), transparent 70%)" }} />
                        {it.actor?.avatar_url ? (
                          <img src={it.actor.avatar_url} alt="" width={44} height={44}
                            className="relative h-11 w-11 rounded-full object-cover ring-1 ring-border" />
                        ) : (
                          <div className="relative flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-border text-xs font-semibold"
                            style={{ background: "linear-gradient(135deg, var(--rose), var(--peach))", color: "white" }}>
                            {initials}
                          </div>
                        )}
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full"
                          style={{
                            background: it.kind.startsWith("like")
                              ? "linear-gradient(135deg, oklch(0.78 0.14 20), oklch(0.62 0.2 20))"
                              : "linear-gradient(135deg, oklch(0.86 0.09 55), oklch(0.72 0.14 30))",
                            color: "white", boxShadow: "0 2px 8px oklch(0.6 0.2 20 / 0.4)",
                          }}>
                          {it.kind.startsWith("like")
                            ? <Heart className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
                            : <MessageCircle className="h-2.5 w-2.5 fill-current" strokeWidth={0} />}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-tight">
                          <span className="font-semibold">{it.actor?.username ?? it.actor?.full_name ?? "someone"}</span>
                          <span className="text-foreground/75"> {kindLabel(it.kind)}</span>
                        </p>
                        {commentBody && (
                          <p className="mt-0.5 truncate text-xs italic text-muted-foreground">"{commentBody}"</p>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <TargetIcon target={it.target_type} />
                          <span className="capitalize">{it.target_type ?? "activity"}</span>
                          <span>·</span>
                          <span>{timeAgo(it.created_at)}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <style>{`@keyframes sheet-up{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}

function EmptyState({ tab, title, body }: { tab: Tab; title?: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, var(--rose), var(--peach))" }}>
        {tab === "likes"
          ? <Heart className="h-7 w-7 text-primary-foreground" strokeWidth={1.5} />
          : <MessageCircle className="h-7 w-7 text-primary-foreground" strokeWidth={1.5} />}
      </div>
      <p className="font-display text-xl italic">{title ?? "Nothing yet"}</p>
      <p className="max-w-[240px] text-xs text-muted-foreground">
        {body ?? (tab === "likes"
          ? "New likes from the last 24 hours will land here."
          : "New comments from the last 24 hours will appear here.")}
      </p>
    </div>
  );
}
