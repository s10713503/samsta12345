// @ts-nocheck
import { useRef, useState } from "react";
import { X, Upload, Film, Image as ImageIcon, Mic, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { createOrbitPost } from "@/lib/api/orbit";

type StudioKind = "video" | "photo" | "podcast";

const TABS: { key: StudioKind; label: string; icon: any; accept: string; hint: string }[] = [
  { key: "video", label: "Reel", icon: Film, accept: "video/*", hint: "Vertical video up to 3 minutes" },
  { key: "photo", label: "Post", icon: ImageIcon, accept: "image/*", hint: "Photo post with caption" },
  { key: "podcast", label: "Podcast", icon: Mic, accept: "audio/*", hint: "Audio episode everyone on Samsta can hear" },
];

const YEAR = 60 * 60 * 24 * 365;

/** Uploads to the private media bucket and returns a long-lived signed URL. */
async function uploadMedia(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  // Storage policies require the user id as the first folder segment.
  const path = `${userId}/orbit/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

function readDuration(file: File, kind: StudioKind): Promise<number | null> {
  if (kind === "photo") return Promise.resolve(null);
  return new Promise((resolve) => {
    const el = document.createElement(kind === "video" ? "video" : "audio");
    const objectUrl = URL.createObjectURL(file);
    const finish = (value: number | null) => {
      URL.revokeObjectURL(objectUrl);
      el.removeAttribute("src");
      resolve(value);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => finish(Math.round(el.duration) || null);
    el.onerror = () => finish(null);
    el.src = objectUrl;
  });
}

/**
 * Orbit Studio — one creator sheet for reels, photo posts and podcasts.
 * Everything is stored against the signed-in account, so it follows the user
 * across log-outs and is removed by the 6-month inactivity cleanup.
 */
export function OrbitStudio({
  open, onClose, userId, initialKind = "video", communityId, onDone,
}: {
  open: boolean; onClose: () => void; userId: string | null;
  initialKind?: StudioKind; communityId?: string | null; onDone?: () => void;
}) {
  const [kind, setKind] = useState<StudioKind>(initialKind);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;
  const tab = TABS.find((t) => t.key === kind)!;

  const submit = async () => {
    if (!userId) { setErr("Sign in to create in Orbit."); return; }
    if (!file) { setErr(`Pick a ${kind === "podcast" ? "audio" : kind === "video" ? "video" : "photo"} file first.`); return; }
    if (kind === "podcast" && !title.trim()) { setErr("Podcasts need a title."); return; }
    setBusy(true); setErr(null);
    try {
      const [url, duration] = await Promise.all([
        uploadMedia(userId, file),
        readDuration(file, kind),
      ]);
      await createOrbitPost({
        userId, kind, body, title: title || undefined,
        mediaUrl: url, durationSeconds: duration,
        communityId: communityId ?? null,
      });
      setFile(null); setTitle(""); setBody("");
      onDone?.(); onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} aria-label="Close studio"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60">
          <X className="h-4 w-4" />
        </button>
        <div className="font-display text-lg italic">Orbit Studio</div>
        <p className="text-[11px] text-muted-foreground">{tab.hint}</p>

        <div className="mt-3 flex gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setKind(key); setFile(null); }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all active:scale-95",
                kind === key ? "bg-foreground text-background" : "glass text-muted-foreground",
              )}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <input ref={inputRef} type="file" accept={tab.accept} className="hidden"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(null); }} />
        <button onClick={() => inputRef.current?.click()}
          className="glass mt-3 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left active:scale-[0.99]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            <Upload className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{file ? file.name : `Choose ${tab.label.toLowerCase()} file`}</span>
            <span className="block text-[11px] text-muted-foreground">
              {file ? `${(file.size / 1048576).toFixed(1)} MB` : "Saved to your Samsta account"}
            </span>
          </span>
        </button>

        {kind === "podcast" && (
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="Episode title" className="glass mt-2 w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
        )}

        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={2000}
          placeholder={kind === "podcast" ? "Episode notes… #hashtags work" : "Write a caption… #hashtags work"}
          className="glass mt-2 w-full resize-none rounded-2xl bg-transparent p-3 text-[15px] outline-none" />

        {err && <div className="mt-2 text-xs text-destructive">{err}</div>}

        <button onClick={submit} disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
          <Send className="h-4 w-4" /> {busy ? "Publishing…" : `Publish ${tab.label}`}
        </button>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Stored on your signed-in account. Content is removed automatically after 6 months of inactivity.
        </p>
      </div>
    </div>
  );
}
