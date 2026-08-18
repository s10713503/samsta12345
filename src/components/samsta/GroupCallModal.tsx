// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Track, createLocalTracks } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import { mintLivekitToken } from "@/lib/livekit.functions";
import { useAuthUser } from "@/hooks/use-auth";

/**
 * Group audio/video call powered by LiveKit SFU.
 * Any number of accepted users can join the same `roomName`.
 */
export function GroupCallModal({
  roomName,
  displayName,
  kind,
  onClose,
}: {
  roomName: string;
  displayName?: string;
  kind: "audio" | "video";
  onClose: () => void;
}) {
  const { user } = useAuthUser();
  const [status, setStatus] = useState("Connecting…");
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(kind === "audio");
  const [participants, setParticipants] = useState<string[]>([]);
  const roomRef = useRef<Room | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let room: Room | null = null;

    (async () => {
      if (!user) return;
      const res = await mintLivekitToken({
        data: { room: roomName, name: displayName || user.email || user.id },
      });
      if (cancelled) return;
      if (!("ok" in res) || !res.ok) {
        setStatus("Group calls are not configured yet. Ask the admin to add LiveKit credentials.");
        return;
      }

      room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;

      const attach = (track: any, id: string, isLocal = false) => {
        if (!stageRef.current) return;
        const el = track.attach();
        el.dataset.pid = id;
        el.className = isLocal
          ? "absolute right-3 top-3 h-32 w-24 rounded-xl border border-white/10 object-cover z-10"
          : "h-full w-full object-cover bg-black";
        if (track.kind === "audio") el.className = "hidden";
        if (!isLocal) {
          const wrap = document.createElement("div");
          wrap.dataset.pid = id;
          wrap.className = "relative min-h-40 flex-1";
          wrap.appendChild(el);
          stageRef.current.appendChild(wrap);
        } else {
          stageRef.current.appendChild(el);
        }
      };
      const detachByPid = (pid: string) => {
        if (!stageRef.current) return;
        stageRef.current.querySelectorAll(`[data-pid="${pid}"]`).forEach((n) => n.remove());
      };

      room
        .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          attach(track, participant.identity);
          setParticipants((p) => Array.from(new Set([...p, participant.identity])));
        })
        .on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
          track.detach();
          detachByPid(participant.identity);
        })
        .on(RoomEvent.ParticipantDisconnected, (p) => {
          detachByPid(p.identity);
          setParticipants((cur) => cur.filter((x) => x !== p.identity));
        })
        .on(RoomEvent.Connected, () => setStatus("Live"))
        .on(RoomEvent.Disconnected, () => setStatus("Disconnected"));

      try {
        await room.connect(res.url, res.token);
        const tracks = await createLocalTracks({
          audio: true,
          video: kind === "video" ? { resolution: { width: 640, height: 480 } } : false,
        });
        for (const t of tracks) {
          await room.localParticipant.publishTrack(t);
          attach(t, "local", true);
        }
        setParticipants([room.localParticipant.identity]);
      } catch (e: any) {
        setStatus(e?.message || "Failed to connect");
      }
    })();

    return () => {
      cancelled = true;
      try { room?.disconnect(); } catch {}
    };
  }, [user, roomName, kind, displayName]);

  const toggleMute = async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setMicrophoneEnabled(muted);
    setMuted((m) => !m);
  };
  const toggleCam = async () => {
    const lp = roomRef.current?.localParticipant;
    if (!lp) return;
    await lp.setCameraEnabled(camOff);
    setCamOff((c) => !c);
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black text-white">
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-4 pt-6 pb-8 text-sm">
        <Users className="h-4 w-4 opacity-80" />
        <span className="opacity-90">Room · {roomName.slice(0, 24)}</span>
        <span className="opacity-60">· {participants.length} in call · {status}</span>
      </div>
      <div ref={stageRef} className="relative flex flex-1 flex-wrap gap-1 overflow-hidden bg-black" />
      <div className="flex items-center justify-center gap-4 bg-black/85 py-6">
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