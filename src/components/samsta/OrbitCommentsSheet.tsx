// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { X, MessageCircle, Send, Heart, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  listReplies, createOrbitPost, toggleOrbitLike, deleteOrbitPost, subscribeOrbit,
  type OrbitPost,
} from "@/lib/api/orbit";

function ago(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

/** Live comment sheet for a single Orbit post — replies stream in real time. */
export function OrbitCommentsSheet({
  open, onClose, post, meId,
}: { open: boolean; onClose: () => void; post: OrbitPost | null; meId: string | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const postId = post?.id ?? null;

  const { data: replies = [], refetch } = useQuery({
    queryKey: ["orbit-replies", postId, meId],
    queryFn: () => listReplies(postId!, meId),
    enabled: open && !!postId,
  });

  useEffect(() => {
    if (!open || !postId) return;
    let t: any;
    return subscribeOrbit(() => { clearTimeout(t); t = setTimeout(() => refetch(), 500); });
  }, [open, postId, refetch]);

  const sorted = useMemo(
    () => [...replies].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [replies],
  );

  if (!open || !post) return null;

  const send = async () => {
    if (!meId) { setErr("Sign in to comment."); return; }
    if (!text.trim()) return;
    setBusy(true); setErr(null);
    try {
      await createOrbitPost({
        userId: meId, kind: "text", body: text.trim(),
        parentId: post.id, rootId: post.root_id ?? post.id,
      });
      setText("");
      await refetch();
      qc.invalidateQueries({ queryKey: ["orbit-feed"] });
    } catch (e: any) {
      setErr(e?.message ?? "Could not comment.");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-up"
      onClick={onClose}>
      <div className="glass-strong relative flex max-h-[82dvh] w-full max-w-[480px] flex-col rounded-t-3xl px-4 pb-6 pt-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} aria-label="Close comments"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 font-display text-lg italic">
          <MessageCircle className="h-4 w-4" /> Comments
          <span className="text-xs not-italic text-muted-foreground">{sorted.length}</span>
        </div>

        <div className="mt-3 flex-1 space-y-3 overflow-y-auto pb-2">
          {!sorted.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">Be the first to reply in this orbit.</p>
          )}
          {sorted.map((r) => {
            const n = r.author?.full_name || r.author?.username || "Samsta member";
            return (
              <div key={r.id} className="glass flex gap-2.5 rounded-2xl p-3 animate-fade-up">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                  {r.author?.avatar_url ? (
                    <img src={r.author.avatar_url} alt={n} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
                      {n.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="truncate font-semibold">{n}</span>
                    <span className="text-muted-foreground">· {ago(r.created_at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{r.body}</p>
                  <div className="mt-1.5 flex items-center gap-4">
                    <button
                      onClick={async () => {
                        if (!meId) return;
                        await toggleOrbitLike(r.id, meId, !r.liked);
                        refetch();
                      }}
                      className={cn("flex items-center gap-1 text-[11px] active:scale-90", r.liked && "text-primary")}>
                      <Heart className={cn("h-3.5 w-3.5", r.liked && "fill-current")} /> {r.like_count || ""}
                    </button>
                    {meId === r.user_id && (
                      <button onClick={async () => { await deleteOrbitPost(r.id); refetch(); }}
                        className="flex items-center gap-1 text-[11px] text-destructive active:scale-90">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {err && <div className="pb-1 text-xs text-destructive">{err}</div>}
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
          <input
            value={text} onChange={(e) => setText(e.target.value)} maxLength={800}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Add a comment…"
            className="flex-1 bg-transparent text-sm outline-none" />
          <button onClick={send} disabled={busy || !text.trim()} aria-label="Send comment"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md active:scale-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
