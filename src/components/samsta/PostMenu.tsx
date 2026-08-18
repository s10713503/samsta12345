import { useState } from "react";
import { MoreHorizontal, Flag, UserX, VolumeX, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { blockUser, muteUser, reportContent, type ReportReason } from "@/lib/api/safety";

type TargetType = "post" | "reel" | "story" | "comment" | "profile";

export function PostMenu({
  targetType,
  targetId,
  authorId,
  onBlocked,
}: {
  targetType: TargetType;
  targetId: string;
  authorId?: string;
  onBlocked?: () => void;
}) {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const isSelf = !!user && !!authorId && user.id === authorId;

  async function handleBlock() {
    if (!user || !authorId) return;
    setBusy("block");
    try {
      await blockUser(user.id, authorId);
      toast.success("User blocked");
      setOpen(false);
      onBlocked?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to block");
    } finally {
      setBusy(null);
    }
  }

  async function handleMute() {
    if (!user || !authorId) return;
    setBusy("mute");
    try {
      await muteUser(user.id, authorId, "all");
      toast.success("User muted");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to mute");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <button aria-label="More options" className="p-1" onClick={() => setOpen(true)}>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(440px,100%)] rounded-t-3xl bg-background p-4 animate-slide-in-right sm:animate-scale-in">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="divide-y divide-border">
              <button
                onClick={() => { setOpen(false); setReportOpen(true); }}
                className="flex w-full items-center gap-3 py-3.5 text-left text-sm text-destructive"
              >
                <Flag className="h-5 w-5" /> Report
              </button>
              {!isSelf && authorId && (
                <>
                  <button
                    onClick={handleMute}
                    disabled={busy === "mute"}
                    className="flex w-full items-center gap-3 py-3.5 text-left text-sm"
                  >
                    {busy === "mute" ? <Loader2 className="h-5 w-5 animate-spin" /> : <VolumeX className="h-5 w-5" />}
                    Mute this user
                  </button>
                  <button
                    onClick={handleBlock}
                    disabled={busy === "block"}
                    className="flex w-full items-center gap-3 py-3.5 text-left text-sm text-destructive"
                  >
                    {busy === "block" ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserX className="h-5 w-5" />}
                    Block this user
                  </button>
                </>
              )}
              <button onClick={() => setOpen(false)} className="flex w-full items-center justify-center py-3.5 text-sm text-muted-foreground">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {reportOpen && (
        <ReportSheet
          targetType={targetType}
          targetId={targetId}
          ownerId={authorId}
          onClose={() => setReportOpen(false)}
        />
      )}
    </>
  );
}

const REASONS: { key: ReportReason; label: string }[] = [
  { key: "spam", label: "Spam or misleading" },
  { key: "harassment", label: "Harassment or bullying" },
  { key: "hate", label: "Hate speech" },
  { key: "nudity", label: "Nudity or sexual content" },
  { key: "violence", label: "Violence or threats" },
  { key: "self-harm", label: "Self-harm" },
  { key: "scam", label: "Scam or fraud" },
  { key: "impersonation", label: "Impersonation" },
  { key: "other", label: "Something else" },
];

function ReportSheet({
  targetType,
  targetId,
  ownerId,
  onClose,
}: {
  targetType: TargetType;
  targetId: string;
  ownerId?: string;
  onClose: () => void;
}) {
  const { user } = useAuthUser();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!user || !reason) return;
    setSubmitting(true);
    try {
      await reportContent({
        reporterId: user.id,
        ownerId,
        targetType,
        targetId,
        reason,
        details: details.trim() || undefined,
      });
      toast.success("Report submitted — thank you");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-[min(480px,100%)] rounded-t-3xl bg-background p-5 animate-slide-in-right sm:animate-scale-in">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl italic">Report {targetType}</h2>
          <button onClick={onClose} className="glass flex h-9 w-9 items-center justify-center rounded-full"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-1.5">
          {REASONS.map((r) => (
            <button
              key={r.key}
              onClick={() => setReason(r.key)}
              className={`w-full rounded-2xl border px-4 py-2.5 text-left text-sm transition ${reason === r.key ? "border-foreground bg-foreground/5" : "border-border"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          placeholder="Extra details (optional)"
          className="mt-3 w-full resize-none rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <button
          onClick={submit}
          disabled={!reason || submitting}
          className="mt-3 w-full rounded-full bg-foreground py-2.5 text-sm font-medium text-background disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </div>
  );
}
