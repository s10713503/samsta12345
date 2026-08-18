import { useEffect, useState } from "react";
import { X, Repeat2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { repostPost } from "@/lib/api/feed";
import { useQueryClient } from "@tanstack/react-query";

export function RepostSheet({
  open,
  onClose,
  postId,
  authorName,
}: {
  open: boolean;
  onClose: () => void;
  postId: string;
  authorName: string;
}) {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

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

  if (!open) return null;

  const submit = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      await repostPost({ userId: user.id, originalPostId: postId, caption: caption.trim() });
      toast.success("Reposted to your feed");
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["user-uploads"] });
      setCaption("");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to repost");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] flex flex-col">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-md animate-fade-in" />
      <div
        className="relative mt-auto flex w-full flex-col overflow-hidden rounded-t-[28px] border-t border-border/60 shadow-2xl bg-background"
        style={{ animation: "sheet-up 300ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-foreground/20" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <Repeat2 className="h-5 w-5" />
            <h2 className="font-display text-xl italic tracking-tight">Repost</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-95">
            <X className="h-5 w-5" strokeWidth={1.8} />
          </button>
        </div>
        <div className="px-5 pb-4">
          <p className="text-xs text-muted-foreground mb-3">
            Reposting <span className="font-semibold text-foreground">@{authorName}</span>'s post to your feed.
          </p>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 500))}
            placeholder="Add a caption (optional)…"
            rows={4}
            className="w-full resize-none rounded-2xl bg-foreground/[0.06] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
          <div className="mt-1 text-right text-[11px] text-muted-foreground">{caption.length}/500</div>
          <button
            onClick={submit}
            disabled={busy || !user}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, oklch(0.55 0.14 25), oklch(0.35 0.04 20))" }}
          >
            <Repeat2 className="h-4 w-4" />
            {busy ? "Reposting…" : "Repost"}
          </button>
        </div>
      </div>
      <style>{`@keyframes sheet-up{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
    </div>
  );
}
