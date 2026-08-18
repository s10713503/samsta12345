// @ts-nocheck
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { CallModal, type CallKind } from "./CallModal";
import { Phone, PhoneOff } from "lucide-react";

type Invite = { callId: string; peerId: string; peerName: string; kind: CallKind };

/** Global listener for incoming WebRTC calls. Mounted in __root.tsx. */
export function IncomingCallListener() {
  const { user } = useAuthUser();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [active, setActive] = useState<(Invite & { role: "caller" | "callee" }) | null>(null);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`user-call-${user.id}`)
      .on("broadcast", { event: "invite" }, async ({ payload }) => {
        if (active) return;
        // Permission gate: only ring if this caller was granted this call type.
        const kind = payload.kind === "video" ? "video" : "voice";
        const { data: allowed } = await (supabase as any).rpc("can_communicate", {
          _sender: payload.callerId,
          _recipient: user.id,
          _kind: kind,
        });
        if (!allowed) return;
        setInvite({ callId: payload.callId, peerId: payload.callerId, peerName: payload.callerName, kind: payload.kind });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, active]);

  // Listen for programmatic outgoing calls
  useEffect(() => {
    const h = (e: any) => setActive({ ...e.detail, role: "caller" });
    window.addEventListener("samsta:start-call", h);
    return () => window.removeEventListener("samsta:start-call", h);
  }, []);

  if (active && user) {
    return (
      <CallModal
        callId={active.callId}
        selfId={user.id}
        peerId={active.peerId}
        peerName={active.peerName}
        kind={active.kind}
        role={active.role}
        onClose={() => setActive(null)}
      />
    );
  }

  if (invite) {
    return (
      <div className="fixed inset-x-0 top-4 z-[90] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur">
        <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#e8c874] to-[#c9a34a]" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{invite.peerName}</div>
          <div className="text-[11px] text-white/60">Incoming {invite.kind} call…</div>
        </div>
        <button
          onClick={() => { setActive({ ...invite, role: "callee" }); setInvite(null); }}
          className="rounded-full bg-emerald-500 p-2.5 text-white"
        ><Phone className="h-4 w-4" /></button>
        <button onClick={() => setInvite(null)} className="rounded-full bg-rose-500 p-2.5 text-white">
          <PhoneOff className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return null;
}

/** Start an outgoing call from anywhere in the app. Also sends invite broadcast. */
export async function startCall(payload: { callerId: string; callerName: string; peerId: string; peerName: string; kind: CallKind }) {
  const callId = `${payload.callerId}-${payload.peerId}-${Date.now()}`;
  const { inviteToCall } = await import("./CallModal");
  await inviteToCall({ callId, callerId: payload.callerId, callerName: payload.callerName, peerId: payload.peerId, kind: payload.kind });
  window.dispatchEvent(new CustomEvent("samsta:start-call", {
    detail: { callId, peerId: payload.peerId, peerName: payload.peerName, kind: payload.kind },
  }));
}