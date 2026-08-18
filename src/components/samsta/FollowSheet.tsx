import { useEffect, useMemo, useState } from "react";
import { X, Search, Check, UserPlus, BadgeCheck, Loader2, UserMinus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listFollowers,
  listFollowing,
  getFollowingMap,
  follow,
  unfollow,
  removeFollower,
  type PublicProfile,
} from "@/lib/api/social";

type Tab = "followers" | "following";

export function FollowSheet({
  open,
  userId,
  currentUserId,
  initialTab = "followers",
  onClose,
}: {
  open: boolean;
  /** Profile whose lists are being shown. */
  userId: string | null;
  /** Currently signed-in user (for follow buttons). */
  currentUserId: string | null;
  initialTab?: Tab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setQ("");
    }
  }, [open, initialTab]);

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

  const followersQ = useQuery({
    queryKey: ["followers", userId],
    queryFn: () => listFollowers(userId!),
    enabled: !!userId && open,
  });
  const followingQ = useQuery({
    queryKey: ["following", userId],
    queryFn: () => listFollowing(userId!),
    enabled: !!userId && open,
  });

  const source: PublicProfile[] = (tab === "followers" ? followersQ.data : followingQ.data) ?? [];
  const loading = tab === "followers" ? followersQ.isLoading : followingQ.isLoading;

  const followingMapQ = useQuery({
    queryKey: ["follow-map", currentUserId, source.map((p) => p.id).sort().join(",")],
    queryFn: () => getFollowingMap(currentUserId!, source.map((p) => p.id)),
    enabled: !!currentUserId && source.length > 0,
  });

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return source;
    return source.filter(
      (u) =>
        (u.username ?? "").toLowerCase().includes(needle) ||
        (u.full_name ?? "").toLowerCase().includes(needle),
    );
  }, [q, source]);

  const isFollowing = (u: PublicProfile) => !!followingMapQ.data?.[u.id];

  async function toggle(u: PublicProfile) {
    if (!currentUserId || u.id === currentUserId) return;
    setPending((s) => ({ ...s, [u.id]: true }));
    try {
      if (isFollowing(u)) await unfollow(currentUserId, u.id);
      else await follow(currentUserId, u.id, u.is_private);
      qc.invalidateQueries({ queryKey: ["follow-map"] });
      qc.invalidateQueries({ queryKey: ["follow-counts"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending((s) => ({ ...s, [u.id]: false }));
    }
  }

  const isOwnFollowers = tab === "followers" && !!currentUserId && currentUserId === userId;

  async function remove(u: PublicProfile) {
    if (!currentUserId) return;
    setPending((p) => ({ ...p, [u.id]: true }));
    try {
      await removeFollower(currentUserId, u.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["followers", userId] }),
        qc.invalidateQueries({ queryKey: ["follow-counts"] }),
      ]);
      toast.success(`${u.username ?? "Follower"} removed — they can no longer see your private posts`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove follower");
    } finally {
      setPending((p) => ({ ...p, [u.id]: false }));
    }
  }

  if (!open) return null;

  const counts = {
    followers: followersQ.data?.length ?? 0,
    following: followingQ.data?.length ?? 0,
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md animate-fade-in"
      />

      <div
        className="relative mt-auto flex h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] border-t border-border/60 shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--background) 92%, var(--rose)) 100%)",
          animation: "sheet-up 380ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-foreground/20" />

        <div className="flex items-center justify-between px-5 pt-3">
          <h2 className="font-display text-2xl italic tracking-tight text-gradient">
            {tab === "followers" ? "Followers" : "Following"}
          </h2>
          <button
            onClick={onClose}
            className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-95 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <div className="mx-5 mt-4 grid grid-cols-2 rounded-full glass p-1">
          {(["followers", "following"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                tab === t ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {tab === t && (
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.55 0.14 25))",
                    boxShadow: "0 8px 24px -8px oklch(0.5 0.1 20 / 0.35)",
                  }}
                />
              )}
              <span className="relative">
                {t === "followers" ? "Followers" : "Following"} · {counts[t]}
              </span>
            </button>
          ))}
        </div>

        <div className="mx-5 mt-3">
          <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div key={tab} className="flex-1 overflow-y-auto px-3 pb-8 pt-3">
          {loading ? (
            <div className="mt-16 flex justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="mt-16 text-center text-sm text-muted-foreground">
              {q ? "No matches" : tab === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {list.map((u, i) => {
                const following = isFollowing(u);
                const isSelf = u.id === currentUserId;
                const busy = pending[u.id];
                return (
                  <li
                    key={u.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${i * 35}ms`, animationFillMode: "both" }}
                  >
                    <div className="group flex w-full items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-foreground/[0.04]">
                      <div className="relative shrink-0">
                        <span
                          className="absolute -inset-0.5 rounded-full opacity-0 blur-md transition-opacity group-hover:opacity-100"
                          style={{ background: "radial-gradient(circle, var(--rose), transparent 70%)" }}
                        />
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt=""
                            width={44}
                            height={44}
                            className="relative h-11 w-11 rounded-full object-cover ring-1 ring-border"
                          />
                        ) : (
                          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
                            {(u.username ?? u.full_name ?? "?")[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1 text-sm font-semibold leading-tight">
                          <span className="truncate">{u.username ?? "user"}</span>
                          {u.is_verified && (
                            <BadgeCheck
                              className="h-3.5 w-3.5 fill-current"
                              style={{ color: "oklch(0.62 0.18 25)" }}
                              strokeWidth={0}
                            />
                          )}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {u.full_name ?? ""}
                        </p>
                      </div>

                      {isOwnFollowers && !isSelf && (
                        <button
                          onClick={() => remove(u)}
                          disabled={busy}
                          className="glass flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-foreground transition-all active:scale-95 disabled:opacity-60"
                          aria-label={`Remove ${u.username ?? "follower"}`}
                        >
                          <UserMinus className="h-3.5 w-3.5" strokeWidth={2.4} />
                          Remove
                        </button>
                      )}

                      {!isSelf && (
                        <button
                          onClick={() => toggle(u)}
                          disabled={busy}
                          className={`relative overflow-hidden rounded-full px-4 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-60 ${
                            following ? "glass text-foreground" : "text-primary-foreground"
                          }`}
                          style={
                            following
                              ? undefined
                              : {
                                  background:
                                    "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.55 0.14 25))",
                                  boxShadow: "0 6px 18px -6px oklch(0.5 0.1 20 / 0.4)",
                                }
                          }
                        >
                          <span className="relative flex items-center gap-1">
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : following ? (
                              <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
                            ) : (
                              <UserPlus className="h-3.5 w-3.5" strokeWidth={2.4} />
                            )}
                            {following ? "Following" : "Follow"}
                          </span>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); opacity: 0.6; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
