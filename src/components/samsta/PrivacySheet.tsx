// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Lock, Globe, Check, UserX, Eye } from "lucide-react";
import {
  getProfile,
  updateProfile,
  listFollowRequests,
  acceptFollowRequest,
  rejectFollowRequest,
} from "@/lib/api/social";
import { listBlocked, unblockUser } from "@/lib/api/safety";
import { toast } from "sonner";

type Audience = "stranger" | "follower" | "me";

const AUDIENCES: Array<{ key: Audience; label: string }> = [
  { key: "stranger", label: "Anyone" },
  { key: "follower", label: "Approved follower" },
  { key: "me", label: "You" },
];

/** What that audience actually sees, mirroring the database privacy rule. */
function visibleToAudience(a: Audience, isPrivate: boolean) {
  if (a === "me" || a === "follower") return true;
  return !isPrivate;
}

/** Privacy settings + pending follower requests for the signed-in user. */
export function PrivacySheet({
  open,
  userId,
  onClose,
}: {
  open: boolean;
  userId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [audience, setAudience] = useState<Audience>("stranger");

  const profileQ = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: open && !!userId,
  });

  const requestsQ = useQuery({
    queryKey: ["follow-requests", userId],
    queryFn: () => listFollowRequests(userId!),
    enabled: open && !!userId,
  });

  const blockedQ = useQuery({
    queryKey: ["blocked-users", userId],
    queryFn: () => listBlocked(userId!),
    enabled: open && !!userId,
  });

  if (!open) return null;

  const isPrivate = !!profileQ.data?.is_private;

  async function setPrivate(next: boolean) {
    if (!userId) return;
    await updateProfile(userId, { is_private: next });
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
  }

  const requests = requestsQ.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85dvh] w-[min(480px,100%)] overflow-y-auto rounded-t-3xl bg-background p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl italic">Privacy</h2>
          <button onClick={onClose} className="glass flex h-9 w-9 items-center justify-center rounded-full" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {([
            { key: false, label: "Public", Icon: Globe, hint: "Anyone on Samsta can see your posts, reels, stories and podcasts." },
            { key: true, label: "Private", Icon: Lock, hint: "Only approved followers can see your posts, reels, stories and podcasts." },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={label}
              onClick={() => setPrivate(key)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 text-sm font-medium transition-all active:scale-95 ${
                isPrivate === key ? "text-white" : "glass text-muted-foreground"
              }`}
              style={
                isPrivate === key
                  ? { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }
                  : undefined
              }
            >
              <Icon className="h-5 w-5" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {isPrivate
            ? "Your account is private. New followers must be approved, and people who don't follow you see a locked profile — in the feed, search, explore and recommendations too."
            : "Your account is public. Everyone on Samsta can see everything you post, and new followers are accepted automatically."}
        </p>

        {/* ---- Privacy preview: exactly what each audience can see ---- */}
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Eye className="h-3.5 w-3.5" /> Preview as
          </div>
          <div className="glass flex gap-1 rounded-full p-1">
            {AUDIENCES.map((a) => (
              <button
                key={a.key}
                onClick={() => setAudience(a.key)}
                className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all active:scale-95 ${
                  audience === a.key ? "text-white shadow-lg" : "text-muted-foreground"
                }`}
                style={
                  audience === a.key
                    ? { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }
                    : undefined
                }
              >
                {a.label}
              </button>
            ))}
          </div>

          <div
            key={`${audience}-${isPrivate}`}
            className="mt-3 overflow-hidden rounded-3xl border border-border/60 bg-background/60 p-4 animate-scale-in"
            style={{ animation: "sheet-up 340ms cubic-bezier(0.22,1,0.36,1) both" }}
          >
            {visibleToAudience(audience, isPrivate) ? (
              <>
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="story-gradient h-9 w-9 rounded-full p-[2px]">
                    <div className="h-full w-full overflow-hidden rounded-full bg-muted">
                      {profileQ.data?.avatar_url && (
                        <img src={profileQ.data.avatar_url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold">{profileQ.data?.username ?? "you"}</div>
                    <div className="text-[11px] text-muted-foreground">Posts · Reels · Stories · Podcasts</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl bg-gradient-to-br from-muted to-muted/40 animate-fade-in"
                      style={{ animationDelay: `${i * 45}ms` }}
                    />
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Everything you post is visible, and your posts appear in their feed, search, explore and
                  recommendations.
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center animate-fade-in">
                <div className="glass flex h-12 w-12 items-center justify-center rounded-full">
                  <Lock className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="text-sm font-semibold">This account is private</div>
                <p className="max-w-[16rem] text-[11px] text-muted-foreground">
                  They see your name and avatar only. Posts, reels, stories and podcasts are hidden here and
                  everywhere else — feed, search, explore and recommendations — until you approve them.
                </p>
              </div>
            )}
          </div>
        </div>


        <div className="mt-6">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Follower requests {requests.length > 0 && `(${requests.length})`}
          </div>

          {requestsQ.isLoading ? (
            <div className="h-14 animate-pulse rounded-2xl bg-muted" />
          ) : requests.length === 0 ? (
            <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              No pending requests right now.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {requests.map((p) => (
                <li key={p.id} className="glass flex items-center gap-3 rounded-2xl p-2.5">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.avatar_url && <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm font-semibold">{p.username ?? "user"}</div>
                    {p.full_name && <div className="truncate text-[11px] text-muted-foreground">{p.full_name}</div>}
                  </div>
                  <button
                    aria-label={`Accept ${p.username}`}
                    onClick={async () => {
                      await acceptFollowRequest(userId!, p.id);
                      qc.invalidateQueries({ queryKey: ["follow-requests", userId] });
                      qc.invalidateQueries({ queryKey: ["follow-counts", userId] });
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white active:scale-90"
                    style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    aria-label={`Reject ${p.username}`}
                    onClick={async () => {
                      await rejectFollowRequest(userId!, p.id);
                      qc.invalidateQueries({ queryKey: ["follow-requests", userId] });
                    }}
                    className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90"
                  >
                    <UserX className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            Blocked accounts {(blockedQ.data?.length ?? 0) > 0 && `(${blockedQ.data!.length})`}
          </div>
          {blockedQ.isLoading ? (
            <div className="h-14 animate-pulse rounded-2xl bg-muted" />
          ) : (blockedQ.data?.length ?? 0) === 0 ? (
            <p className="rounded-2xl bg-muted/40 p-4 text-center text-xs text-muted-foreground">
              You haven't blocked anyone. Blocked people can't see your posts or send requests.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {blockedQ.data!.map((b, i) => (
                <li
                  key={b.blocked?.id ?? i}
                  className="glass animate-fade-up flex items-center gap-3 rounded-2xl p-2.5"
                  style={{ animationDelay: `${i * 40}ms`, animationFillMode: "both" }}
                >
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                    {b.blocked?.avatar_url && (
                      <img src={b.blocked.avatar_url} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate text-sm font-semibold">{b.blocked?.username ?? "user"}</div>
                    {b.blocked?.full_name && (
                      <div className="truncate text-[11px] text-muted-foreground">{b.blocked.full_name}</div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (!userId || !b.blocked) return;
                      try {
                        await unblockUser(userId, b.blocked.id);
                        toast.success("Unblocked");
                        qc.invalidateQueries({ queryKey: ["blocked-users", userId] });
                        qc.invalidateQueries({ queryKey: ["feed"] });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Could not unblock");
                      }
                    }}
                    className="rounded-full border border-border px-3 py-1.5 text-xs transition active:scale-95"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
