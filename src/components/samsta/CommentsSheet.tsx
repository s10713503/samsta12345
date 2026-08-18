// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Send, Heart, Trash2, Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/hooks/use-auth";
import {
  listComments,
  addComment,
  deleteComment,
  updateComment,
  toggleCommentLike,
  type CommentRow,
} from "@/lib/api/interactions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function CommentsSheet({
  open,
  onClose,
  postId,
  postAuthor,
  postAvatar,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  postAuthor: string;
  postAvatar: string;
}) {
  const { user } = useAuthUser();
  const [items, setItems] = useState<CommentRow[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [kbInset, setKbInset] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the composer above the on-screen keyboard
  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbInset(inset);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [open]);

  // Autofocus composer and keep the newest comment in view
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 380);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, items.length, kbInset]);



  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !postId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const rows = await listComments(postId);
        if (!cancelled) setItems(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_comments", filter: `post_id=eq.${postId}` },
        load,
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [open, postId]);

  if (!open) return null;

  const send = async () => {
    const body = draft.trim();
    if (!body || !user) return;
    setDraft("");
    inputRef.current?.focus();
    try {
      await addComment(postId, user.id, body);
      requestAnimationFrame(() => {
        const el = listRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to comment");
    }
  };

  const total = items.length;

  const sheet = (
    <div className="fixed inset-0 z-[120] flex flex-col" style={{ paddingBottom: kbInset }}>
      <button aria-label="Close comments" onClick={onClose}
        className="absolute inset-0 bg-foreground/40 backdrop-blur-md animate-fade-in" />
      <div
        className="relative mt-auto flex max-h-[86dvh] min-h-[60dvh] w-full flex-1 flex-col overflow-hidden rounded-t-[28px] border-t border-border/60 shadow-2xl"
        style={{
          background: "linear-gradient(180deg, var(--background) 0%, color-mix(in oklab, var(--background) 92%, var(--rose)) 100%)",
          animation: "sheet-up 340ms cubic-bezier(0.22, 1, 0.36, 1) both",
        }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-foreground/20" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div>
            <h2 className="font-display text-xl italic tracking-tight text-gradient">Comments</h2>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{total} total</p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-95">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>

        <ul ref={listRef} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 space-y-4">
          {loading && items.length === 0 && (
            <li className="text-center text-xs text-muted-foreground py-8">Loading…</li>
          )}
          {!loading && items.length === 0 && (
            <li className="text-center text-xs text-muted-foreground py-8">Be the first to comment</li>
          )}
          {items.map((c) => {
            const isMine = user?.id === c.user_id;
            const authorName =
              c.author?.username || c.author?.full_name || (isMine ? "you" : "user");
            const initial = authorName.charAt(0).toUpperCase();
            const avatar = c.author?.avatar_url || (isMine ? postAvatar : "");
            return (
              <li key={c.id} className="flex gap-3 animate-fade-in">
                {avatar ? (
                  <img
                    src={avatar}
                    alt={`${authorName} profile photo`}
                    loading="lazy"
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-1 ring-border">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-sm font-semibold">{authorName}</span>
                    {isMine && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">you</span>
                    )}
                    <span className="text-[11px] text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  {editing === c.id ? (
                    <div className="mt-1 flex gap-2">
                      <input
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        className="flex-1 rounded-xl bg-foreground/[0.06] px-3 py-1.5 text-sm outline-none"
                        autoFocus
                      />
                      <button
                        onClick={async () => {
                          try {
                            await updateComment(c.id, editDraft.trim());
                            setEditing(null);
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : "Update failed");
                          }
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm leading-snug text-foreground/90 break-words">{c.body}</p>
                  )}
                  {isMine && editing !== c.id && (
                    <div className="mt-1 flex gap-3 text-[11px] text-muted-foreground">
                      <button onClick={() => { setEditing(c.id); setEditDraft(c.body); }} className="flex items-center gap-1 hover:text-foreground">
                        <Pencil className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={async () => {
                          try { await deleteComment(c.id); } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
                        }}
                        className="flex items-center gap-1 hover:text-[oklch(0.62_0.22_20)]"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (!user) return;
                    const next = !liked[c.id];
                    setLiked((m) => ({ ...m, [c.id]: next }));
                    try { await toggleCommentLike(c.id, user.id, next); }
                    catch { setLiked((m) => ({ ...m, [c.id]: !next })); }
                  }}
                  className="self-start p-1 active:scale-90"
                  aria-label="Like comment"
                >
                  <Heart
                    className={cn("h-4 w-4", liked[c.id] ? "fill-[oklch(0.62_0.22_20)] text-[oklch(0.62_0.22_20)]" : "text-muted-foreground")}
                    strokeWidth={liked[c.id] ? 0 : 1.8}
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur-xl px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-2">
            {postAvatar ? (
              <img src={postAvatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted" />
            )}
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={`Comment on @${postAuthor}...`}
              className="flex-1 rounded-full bg-foreground/[0.06] px-4 py-2 text-base outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={send}
              disabled={!draft.trim() || !user}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary-foreground disabled:opacity-40 active:scale-90"
              style={{ background: "linear-gradient(135deg, oklch(0.55 0.14 25), oklch(0.35 0.04 20))" }}
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes sheet-up{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );

  if (typeof document === "undefined") return sheet;
  return createPortal(sheet, document.body);
}

