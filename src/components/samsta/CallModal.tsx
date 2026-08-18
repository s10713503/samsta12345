// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";

// Minimal WebRTC 1:1 caller/callee. Signaling over Supabase Realtime broadcast
// channel `call-<callId>`. STUN only; strict NATs will need TURN (paid).

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type CallKind = "audio" | "video";

export function CallModal({
  callId,
  selfId,
  peerId,
  peerName,
  kind,
  role,
  onClose,
}: {
  callId: string;
  selfId: string;
  peerId: string;
  peerName: string;
  kind: CallKind;
  role: "caller" | "callee";
  onClose: () => void;
}) {
  const [status, setStatus] = useState<string>(role === "caller" ? "Ringing…" : "Connecting…");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(kind === "audio");
  const localVideo = useRef<HTMLVideoElement | null>(null);
  const remoteVideo = useRef<HTMLVideoElement | null>(null);
  const remoteAudio = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;
    const remoteStream = new MediaStream();
    if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
    if (remoteAudio.current) remoteAudio.current.srcObject = remoteStream;

    pc.ontrack = (e) => {
      e.streams[0].getTracks().forEach((t) => remoteStream.addTrack(t));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") setStatus("Connected");
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") setStatus("Disconnected");
    };

    const channel = supabase.channel(`call-${callId}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        channel.send({ type: "broadcast", event: "ice", payload: { from: selfId, candidate: e.candidate } });
      }
    };

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (payload.from === selfId || role !== "callee") return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({ type: "broadcast", event: "answer", payload: { from: selfId, sdp: answer } });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (payload.from === selfId || role !== "caller") return;
        if (pc.signalingState !== "stable") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        }
      })
      .on("broadcast", { event: "ice" }, async ({ payload }) => {
        if (payload.from === selfId) return;
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
      })
      .on("broadcast", { event: "hangup" }, () => { onClose(); })
      .on("broadcast", { event: "ready" }, async ({ payload }) => {
        if (payload.from === selfId || role !== "caller") return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({ type: "broadcast", event: "offer", payload: { from: selfId, sdp: offer } });
      })
      .subscribe(async (s) => {
        if (s !== "SUBSCRIBED" || cancelled) return;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: kind === "video",
          });
          if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
          localStream.current = stream;
          if (localVideo.current) localVideo.current.srcObject = stream;
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
          // Announce readiness so caller creates offer (avoids race)
          channel.send({ type: "broadcast", event: "ready", payload: { from: selfId } });
        } catch (err) {
          setStatus("Mic/camera blocked");
        }
      });

    return () => {
      cancelled = true;
      try { channel.send({ type: "broadcast", event: "hangup", payload: { from: selfId } }); } catch {}
      try { pc.close(); } catch {}
      localStream.current?.getTracks().forEach((t) => t.stop());
      supabase.removeChannel(channel);
    };
  }, [callId, selfId, kind, role]);

  const toggleMute = () => {
    const s = localStream.current;
    if (!s) return;
    s.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted((m) => !m);
  };
  const toggleCam = () => {
    const s = localStream.current;
    if (!s) return;
    s.getVideoTracks().forEach((t) => (t.enabled = camOff));
    setCamOff((c) => !c);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-white">
      <div className="relative flex-1 overflow-hidden">
        {kind === "video" ? (
          <>
            <video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-cover" />
            <video ref={localVideo} autoPlay playsInline muted className="absolute right-3 top-3 h-32 w-24 rounded-xl border border-white/10 object-cover" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <audio ref={remoteAudio} autoPlay />
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-3xl">🎧</div>
              <div className="text-lg font-semibold">{peerName}</div>
            </div>
          </div>
        )}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-center gap-2 bg-gradient-to-b from-black/60 to-transparent px-4 pt-6 pb-8 text-sm">
          <span className="opacity-80">{peerName}</span>
          <span className="opacity-60">· {status}</span>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 bg-black/80 py-6">
        <button onClick={toggleMute} className="rounded-full bg-white/10 p-4">
          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>
        {kind === "video" && (
          <button onClick={toggleCam} className="rounded-full bg-white/10 p-4">
            {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>
        )}
        <button onClick={onClose} className="rounded-full bg-rose-500 p-4"><PhoneOff className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

/** Invite a peer to a call. Peer must be listening on `user-call-${peerId}`. */
export async function inviteToCall(input: {
  callId: string;
  callerId: string;
  callerName: string;
  peerId: string;
  kind: CallKind;
}) {
  const ch = supabase.channel(`user-call-${input.peerId}`);
  await new Promise<void>((res) => {
    ch.subscribe((s) => { if (s === "SUBSCRIBED") res(); });
  });
  await ch.send({
    type: "broadcast",
    event: "invite",
    payload: {
      callId: input.callId,
      callerId: input.callerId,
      callerName: input.callerName,
      kind: input.kind,
    },
  });
  setTimeout(() => supabase.removeChannel(ch), 500);
}