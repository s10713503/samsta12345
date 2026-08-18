// @ts-nocheck
import { useState } from "react";
import { X, Send, Type, Mic, BarChart3, Image as ImageIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createOrbitPost, type OrbitKind } from "@/lib/api/orbit";

const KINDS: { key: OrbitKind; label: string; icon: any }[] = [
  { key: "text", label: "Thought", icon: Type },
  { key: "poll", label: "Poll", icon: BarChart3 },
  { key: "voice", label: "Voice", icon: Mic },
  { key: "photo", label: "Photo", icon: ImageIcon },
];

export function OrbitComposer({
  open, onClose, userId, parentId, rootId, quoteOf, communityId, onDone,
}: {
  open: boolean; onClose: () => void; userId: string | null;
  parentId?: string | null; rootId?: string | null; quoteOf?: string | null;
  communityId?: string | null; onDone: () => void;
}) {
  const [kind, setKind] = useState<OrbitKind>("text");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    if (!userId) { setErr("Sign in to post in Orbit."); return; }
    if (!body.trim() && !mediaUrl.trim()) { setErr("Say something first."); return; }
    setBusy(true); setErr(null);
    try {
      await createOrbitPost({
        userId, kind, body,
        mediaUrl: mediaUrl.trim() || null,
        parentId: parentId ?? null, rootId: rootId ?? null,
        quoteOf: quoteOf ?? null, communityId: communityId ?? null,
        pollOptions: kind === "poll" ? options : undefined,
      });
      setBody(""); setMediaUrl(""); setOptions(["", ""]);
      onDone(); onClose();
    } catch (e: any) {
      setErr(e?.message ?? "Could not post.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl px-5 pb-8 pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60">
          <X className="h-4 w-4" />
        </button>
        <div className="font-display text-lg italic">
          {parentId ? "Reply in orbit" : quoteOf ? "Quote this" : "Drop into Orbit"}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {KINDS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setKind(key)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                kind === key ? "bg-foreground text-background" : "glass text-muted-foreground",
              )}>
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <textarea
          value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000}
          placeholder={kind === "poll" ? "Ask the orbit something…" : "What's orbiting your mind? #hashtags work"}
          className="glass mt-3 w-full resize-none rounded-2xl bg-transparent p-3 text-[15px] outline-none"
        />

        {(kind === "photo" || kind === "video" || kind === "voice" || kind === "podcast") && (
          <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Media link (https://…)"
            className="glass mt-2 w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
        )}

        {kind === "poll" && (
          <div className="mt-2 flex flex-col gap-2">
            {options.map((o, i) => (
              <input key={i} value={o} maxLength={60}
                onChange={(e) => setOptions((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                placeholder={`Option ${i + 1}`}
                className="glass w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
            ))}
            {options.length < 4 && (
              <button onClick={() => setOptions((p) => [...p, ""])}
                className="flex items-center gap-1 text-xs text-muted-foreground">
                <Plus className="h-3 w-3" /> Add option
              </button>
            )}
          </div>
        )}

        {err && <div className="mt-2 text-xs text-destructive">{err}</div>}

        <button onClick={submit} disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white shadow-md transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
          <Send className="h-4 w-4" /> {busy ? "Sending…" : "Post to Orbit"}
        </button>
      </div>
    </div>
  );
}