// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, MessageCircle, Phone, Video, Check, X, ShieldX, Flag, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import {
  listIncoming,
  listOutgoing,
  setPermissions,
  approveWith,
  declineRequest,
  blockUser,
  unblockUser,
  cancelRequest,
  reportUser,
  subscribeConnections,
} from "@/lib/api/connections";

export const Route = createFileRoute("/connections")({
  head: () => ({
    meta: [
      { title: "Connection permissions · Samsta" },
      { name: "description", content: "Approve, adjust or revoke who can message, voice call or video call you on Samsta." },
      { property: "og:title", content: "Connection permissions · Samsta" },
      { property: "og:description", content: "Granular, per-person control over messaging and calling on Samsta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectionsPage,
});

function Toggle({ on, onClick, Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 ${
        on ? "text-white" : "glass text-muted-foreground"
      }`}
      style={on ? { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" } : undefined}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

function ConnectionsPage() {
  const { user } = useAuthUser();
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");

  const inQ = useQuery({
    queryKey: ["connections-in", user?.id],
    enabled: !!user,
    queryFn: () => listIncoming(user!.id),
  });
  const outQ = useQuery({
    queryKey: ["connections-out", user?.id],
    enabled: !!user,
    queryFn: () => listOutgoing(user!.id),
  });

  useEffect(() => {
    if (!user) return;
    return subscribeConnections(user.id, () => { inQ.refetch(); outQ.refetch(); });
  }, [user?.id]);

  const act = async (fn: () => Promise<void>, msg?: string) => {
    try {
      await fn();
      if (msg) toast.success(msg);
      inQ.refetch();
      outQ.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const name = (r: any) => r.peer?.username || r.peer?.full_name || "user";

  return (
    <div className="min-h-screen pb-24">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 px-4 py-3">
        <Link to="/messages" aria-label="Back" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-base font-semibold">Connection permissions</h1>
      </header>

      <div className="flex gap-2 px-4 py-3">
        {(["incoming", "outgoing"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-medium capitalize transition-all ${
              tab === t ? "text-white" : "glass text-muted-foreground"
            }`}
            style={tab === t ? { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" } : undefined}
          >
            {t === "incoming" ? "Requests to me" : "My requests"}
          </button>
        ))}
      </div>

      <div className="space-y-3 px-4 animate-fade-in" key={tab}>
        {tab === "incoming" &&
          (inQ.data ?? []).map((r: any) => (
            <div key={r.id} className="glass rounded-2xl p-3">
              <div className="flex items-center gap-3">
                {r.peer?.avatar_url ? (
                  <img src={r.peer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted ring-1 ring-border" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{name(r)}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{r.status}</div>
                </div>
                {r.status === "blocked" ? (
                  <button
                    onClick={() => act(() => unblockUser(r.id), "Unblocked")}
                    className="glass rounded-full px-3 py-1.5 text-xs font-medium"
                  >
                    Unblock
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => act(() => declineRequest(r.id), "Access revoked")}
                      aria-label="Decline"
                      className="glass rounded-full p-2"
                    ><X className="h-4 w-4" /></button>
                    <button
                      onClick={() => act(() => blockUser(r.id), "User blocked")}
                      aria-label="Block"
                      className="rounded-full bg-rose-500/90 p-2 text-white"
                    ><ShieldX className="h-4 w-4" /></button>
                  </>
                )}
              </div>

              {r.status !== "blocked" && (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Toggle
                      on={r.status === "approved" && r.allow_text}
                      Icon={MessageCircle}
                      label="Text"
                      onClick={() => act(() => setPermissions(r.id, { text: !(r.status === "approved" && r.allow_text), status: "approved" }))}
                    />
                    <Toggle
                      on={r.status === "approved" && r.allow_voice}
                      Icon={Phone}
                      label="Voice"
                      onClick={() => act(() => setPermissions(r.id, { voice: !(r.status === "approved" && r.allow_voice), status: "approved" }))}
                    />
                    <Toggle
                      on={r.status === "approved" && r.allow_video}
                      Icon={Video}
                      label="Video"
                      onClick={() => act(() => setPermissions(r.id, { video: !(r.status === "approved" && r.allow_video), status: "approved" }))}
                    />
                    <button
                      onClick={() => act(() => approveWith(r.id, { text: true, voice: true, video: true }), "All access granted")}
                      className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
                    >
                      <Check className="h-3.5 w-3.5" /> Allow all
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      act(() => reportUser(user!.id, r.requester_id, "abuse_or_spam"), "Report submitted")
                    }
                    className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground"
                  >
                    <Flag className="h-3 w-3" /> Report abuse or spam
                  </button>
                </>
              )}
            </div>
          ))}

        {tab === "outgoing" &&
          (outQ.data ?? []).map((r: any) => (
            <div key={r.id} className="glass flex items-center gap-3 rounded-2xl p-3">
              {r.peer?.avatar_url ? (
                <img src={r.peer.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-border" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted ring-1 ring-border" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{name(r)}</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {r.status === "approved" ? (
                    <>
                      <ShieldCheck className="h-3 w-3" />
                      {[r.allow_text && "Text", r.allow_voice && "Voice", r.allow_video && "Video"].filter(Boolean).join(" · ") || "No access"}
                    </>
                  ) : r.status === "blocked" ? (
                    "Unavailable"
                  ) : (
                    <span className="capitalize">{r.status}</span>
                  )}
                </div>
              </div>
              {r.status !== "blocked" && (
                <button
                  onClick={() => act(() => cancelRequest(user!.id, r.target_id), "Request removed")}
                  className="glass rounded-full px-3 py-1.5 text-xs font-medium"
                >
                  Remove
                </button>
              )}
            </div>
          ))}

        {((tab === "incoming" && !(inQ.data ?? []).length) || (tab === "outgoing" && !(outQ.data ?? []).length)) && (
          <p className="py-16 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </div>
    </div>
  );
}
