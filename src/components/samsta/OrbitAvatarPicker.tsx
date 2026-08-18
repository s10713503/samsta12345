// @ts-nocheck
import { useRef, useState } from "react";
import { Camera, Film, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const YEAR = 60 * 60 * 24 * 365;
const MAX_REEL_SECONDS = 10;

async function uploadToMedia(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${userId}/orbit-avatar/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const up = await (supabase as any).storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (up.error) throw up.error;
  const signed = await (supabase as any).storage.from("media").createSignedUrl(path, YEAR);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl as string;
}

function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const el = document.createElement("video");
    const url = URL.createObjectURL(file);
    const done = (v: number | null) => { URL.revokeObjectURL(url); el.removeAttribute("src"); resolve(v); };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(el.duration || null);
    el.onerror = () => done(null);
    el.src = url;
  });
}

/**
 * Orbit profile picture picker — a photo, or a looping profile reel of up to
 * 10 seconds. Files are uploaded to the private media bucket under the
 * signed-in account.
 */
export function OrbitAvatarPicker({
  userId, photoUrl, videoUrl, onChange,
}: {
  userId: string | null;
  photoUrl: string;
  videoUrl: string;
  onChange: (next: { avatar_url: string; avatar_video_url: string }) => void;
}) {
  const photoRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<"photo" | "video" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pick = async (file: File | null, kind: "photo" | "video") => {
    setErr(null);
    if (!file) return;
    if (!userId) { setErr("Sign in to upload a profile photo."); return; }
    if (kind === "video") {
      const dur = await videoDuration(file);
      if (dur && dur > MAX_REEL_SECONDS + 0.5) {
        setErr(`Profile reels must be ${MAX_REEL_SECONDS} seconds or shorter.`);
        return;
      }
    }
    setBusy(kind);
    try {
      const url = await uploadToMedia(userId, file);
      onChange(kind === "photo" ? { avatar_url: url, avatar_video_url: "" } : { avatar_url: photoUrl, avatar_video_url: url });
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setBusy(null);
    }
  };

  const clear = () => onChange({ avatar_url: "", avatar_video_url: "" });
  const has = !!(photoUrl || videoUrl);

  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-background/70">
        {videoUrl ? (
          <video src={videoUrl} className="h-full w-full object-cover" autoPlay muted loop playsInline />
        ) : photoUrl ? (
          <img src={photoUrl} alt="Profile preview" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Camera className="h-5 w-5" />
          </span>
        )}
        {has && (
          <button type="button" onClick={clear} aria-label="Remove profile media"
            className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-background/80">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">Profile photo or 10s reel</p>
        <p className="text-[11px] text-muted-foreground">Uploaded to your Samsta account</p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => photoRef.current?.click()} disabled={!!busy}
            className={cn("glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] active:scale-95 disabled:opacity-60")}>
            {busy === "photo" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />} Photo
          </button>
          <button type="button" onClick={() => videoRef.current?.click()} disabled={!!busy}
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] active:scale-95 disabled:opacity-60">
            {busy === "video" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Film className="h-3 w-3" />} 10s reel
          </button>
        </div>
        {err && <p className="mt-1 text-[11px] text-destructive">{err}</p>}
      </div>

      <input ref={photoRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { void pick(e.target.files?.[0] ?? null, "photo"); e.target.value = ""; }} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => { void pick(e.target.files?.[0] ?? null, "video"); e.target.value = ""; }} />
    </div>
  );
}
