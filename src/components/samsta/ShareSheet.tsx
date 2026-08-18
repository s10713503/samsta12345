import { useEffect } from "react";
import { toast } from "sonner";
import {
  X, MessageCircle, Send, Instagram, Facebook, Twitter, Mail,
  Link as LinkIcon, Share2, Download,
} from "lucide-react";
import { recordShare, type ShareDestination, type ShareTargetType } from "@/lib/api/share";
import { watermarkImage } from "@/lib/watermark-export";

export function ShareSheet({
  open,
  onClose,
  title = "Share",
  url,
  text,
  targetType,
  targetId,
  mediaUrl,
  mediaType,
  username,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  url: string;
  text: string;
  targetType?: ShareTargetType;
  targetId?: string;
  /** Media to attach when leaving the app (gets the Samsta watermark burned in). */
  mediaUrl?: string | null;
  mediaType?: "image" | "video";
  username?: string | null;
}) {
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

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  const combined = encodeURIComponent(`${text} ${url}`);

  const options: Array<{
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    destination: ShareDestination;
    href?: string;
    action?: "copy" | "native" | "download";
  }> = [
    { label: "WhatsApp", color: "#25D366", icon: MessageCircle, destination: "whatsapp", href: `https://wa.me/?text=${combined}` },
    { label: "Instagram", color: "#E4405F", icon: Instagram, destination: "instagram", action: "copy" },
    { label: "Facebook", color: "#1877F2", icon: Facebook, destination: "facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Telegram", color: "#229ED9", icon: Send, destination: "telegram", href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}` },
    { label: "X", color: "#000000", icon: Twitter, destination: "x", href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { label: "Email", color: "#EA4335", icon: Mail, destination: "email", href: `mailto:?subject=${encodedText}&body=${encodedUrl}` },
    { label: "Messages", color: "#34C759", icon: MessageCircle, destination: "sms", href: `sms:?&body=${combined}` },
    { label: "Copy link", color: "#6B7280", icon: LinkIcon, destination: "copy_link", action: "copy" },
    { label: "Save", color: "#F59E0B", icon: Download, destination: "download", action: "download" },
    { label: "More", color: "#8B5CF6", icon: Share2, destination: "native", action: "native" },
  ];

  async function handle(o: (typeof options)[number]) {
    try {
      if (targetType && targetId) {
        recordShare({ targetType, targetId, destination: o.destination }).catch(() => {});
      }
      if (o.href) {
        window.open(o.href, "_blank", "noopener,noreferrer");
      } else if (o.action === "copy") {
        await navigator.clipboard.writeText(url);
        toast.success(o.destination === "instagram" ? "Link copied — paste in Instagram" : "Link copied");
      } else if (o.action === "download") {
        const wm = mediaUrl && mediaType !== "video" ? await watermarkImage(mediaUrl, username) : null;
        const blob = wm ?? new Blob([`${text}\n${url}`], { type: "text/plain" });
        const dl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dl;
        a.download = wm ? "samsta-post.jpg" : "samsta-share.txt";
        a.click();
        URL.revokeObjectURL(dl);
        toast.success("Saved");
      } else if (o.action === "native") {
        const wm = mediaUrl && mediaType !== "video" ? await watermarkImage(mediaUrl, username) : null;
        const file = wm ? new File([wm], "samsta-post.jpg", { type: "image/jpeg" }) : null;
        if (file && navigator.canShare?.({ files: [file] })) {
          try { await navigator.share({ title: text, text, files: [file] }); } catch {}
        } else if (navigator.share) {
          try { await navigator.share({ title: text, url }); } catch {}
        } else {
          await navigator.clipboard.writeText(url); toast.success("Link copied");
        }
      }
    } finally {
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center">
      <button aria-label="Close share" onClick={onClose} className="absolute inset-0 bg-foreground/40 backdrop-blur-md animate-fade-in" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(480px,100%)] rounded-t-[28px] border-t border-border/60 bg-background p-5 shadow-2xl"
        style={{ animation: "sheet-up 320ms cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl italic">{title}</h2>
          <button onClick={onClose} className="glass flex h-9 w-9 items-center justify-center rounded-full" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {options.map((o, i) => (
            <button
              key={o.label}
              onClick={() => handle(o)}
              className="flex flex-col items-center gap-1.5 animate-fade-up active:scale-90 transition-transform"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md" style={{ backgroundColor: o.color }}>
                <o.icon className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-[10px] text-muted-foreground">{o.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="glass mt-5 w-full rounded-full py-2.5 text-sm font-medium">Cancel</button>
        <style>{`@keyframes sheet-up{from{transform:translateY(100%);opacity:.6}to{transform:translateY(0);opacity:1}}`}</style>
      </div>
    </div>
  );
}
