// @ts-nocheck
import { Link } from "@tanstack/react-router";
import { MessageCircle, Phone, Video, UserPlus, Clock, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { useConnection } from "@/hooks/use-connection";
import { requestConnection, cancelRequest } from "@/lib/api/connections";
import { startCall } from "@/components/samsta/IncomingCallListener";

/**
 * Renders ONLY the communication options the peer explicitly approved.
 * Nothing granted -> a single "Request to connect" action.
 */
export function ConnectActions({
  peerId,
  peerName,
  className = "",
}: {
  peerId: string;
  peerName: string;
  className?: string;
}) {
  const { user } = useAuthUser();
  const { perms, status, loading, refetch } = useConnection(user?.id, peerId);

  if (!user || user.id === peerId) return null;

  const call = (kind: "audio" | "video") =>
    startCall({
      callerId: user.id,
      callerName: (user.user_metadata as any)?.full_name || user.email || "Samsta user",
      peerId,
      peerName,
      kind,
    });

  const ask = async () => {
    try {
      await requestConnection(user.id, peerId);
      toast.success("Request sent — waiting for approval");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send request");
    }
  };

  const withdraw = async () => {
    try {
      await cancelRequest(user.id, peerId);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel");
    }
  };

  if (loading) {
    return <div className={`h-9 flex-1 animate-pulse rounded-full bg-foreground/[0.06] ${className}`} />;
  }

  if (status === "blocked") {
    return (
      <div className={`glass flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm text-muted-foreground ${className}`}>
        <ShieldX className="h-4 w-4" /> Unavailable
      </div>
    );
  }

  if (status === "pending") {
    return (
      <button
        onClick={withdraw}
        className={`glass flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium ${className}`}
      >
        <Clock className="h-4 w-4" /> Requested
      </button>
    );
  }

  const anyAllowed = perms.text || perms.voice || perms.video;
  if (!anyAllowed) {
    return (
      <button
        onClick={ask}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium text-white transition-transform active:scale-[0.97] ${className}`}
        style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
      >
        <UserPlus className="h-4 w-4" />
        {status === "declined" ? "Request again" : "Request to connect"}
      </button>
    );
  }

  return (
    <div className={`flex flex-1 gap-2 ${className}`}>
      {perms.text && (
        <Link
          to="/messages"
          search={{ to: peerId }}
          className="glass flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-transform active:scale-[0.97]"
        >
          <MessageCircle className="h-4 w-4" /> Message
        </Link>
      )}
      {perms.voice && (
        <button
          onClick={() => call("audio")}
          aria-label="Voice call"
          className="glass flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium transition-transform active:scale-[0.97]"
        >
          <Phone className="h-4 w-4" /> Voice
        </button>
      )}
      {perms.video && (
        <button
          onClick={() => call("video")}
          aria-label="Video call"
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-2 text-sm font-medium text-white transition-transform active:scale-[0.97]"
          style={{ background: "linear-gradient(135deg, oklch(0.55 0.14 25), oklch(0.35 0.04 20))" }}
        >
          <Video className="h-4 w-4" /> Video
        </button>
      )}
    </div>
  );
}
