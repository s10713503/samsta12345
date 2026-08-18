// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { ArrowLeft, Upload, Loader2, Sparkles, ShieldCheck, Video } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { uploadReelVideo } from "@/lib/api/edu-reels";
import { submitEduReel } from "@/lib/edu-reels.functions";

export const Route = createFileRoute("/edu-reels/new")({
  component: NewEduReel,
  head: () => ({ meta: [{ title: "Upload educational reel · Samsta" }] }),
});

function NewEduReel() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const submit = useServerFn(submitEduReel);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ status: string; verdict: any } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState<number | null>(null);

  if (!user) {
    return <div className="min-h-dvh grid place-items-center p-6"><Link to="/auth" className="rounded-full bg-foreground text-background px-4 py-2 text-sm">Sign in</Link></div>;
  }

  async function onSubmit() {
    if (!file) { toast.error("Choose a video"); return; }
    if (!caption.trim()) { toast.error("Add a caption so can classify it"); return; }
    setBusy(true); setResult(null);
    try {
      const up = await uploadReelVideo(user.id, file);
      const hashtags = tags.split(/[\s,]+/).map((h) => h.replace(/^#/, "").trim()).filter(Boolean);
      const res: any = await submit({
        data: {
          caption: caption.trim(),
          hashtags,
          bucket: up.bucket,
          video_path: up.path,
          duration_sec: duration,
        },
      });
      setResult({ status: res.status, verdict: res.verdict });
      if (res.status === "approved") {
        toast.success("Approved — live now");
        setTimeout(() => navigate({ to: "/edu-reels" }), 1200);
      } else if (res.status === "rejected") {
        toast.error("Rejected by— content not educational");
      } else {
        toast.info("Pending human review");
      }
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-dvh pb-32">
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-background/60 border-b border-foreground/5 px-4 py-3 flex items-center gap-3">
        <Link to="/edu-reels" className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1 font-display italic text-lg">Upload educational reel</div>
        <button onClick={onSubmit} disabled={busy || !file} className="rounded-full bg-foreground text-background px-4 py-2 text-sm disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        <label className="block rounded-3xl border border-dashed border-foreground/20 bg-background/40 p-4 cursor-pointer">
          {file ? (
            <div className="space-y-2">
              <video
                ref={videoRef}
                src={URL.createObjectURL(file)}
                className="w-full rounded-2xl aspect-[9/16] object-cover"
                onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration)}
                controls
              />
              <div className="text-xs text-foreground/60 flex items-center gap-1"><Video className="h-3.5 w-3.5" /> {file.name} {duration ? `· ${Math.round(duration)}s` : ""}</div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Upload className="h-6 w-6 mx-auto opacity-70" />
              <div className="mt-2 text-sm">Tap to choose a video</div>
              <div className="text-[11px] text-foreground/50">Only educational content is approved by </div>
            </div>
          )}
          <input type="file" accept="video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>

        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4}
          placeholder="Caption — describe what you're teaching (e.g. 'How pointers work in C — 60-second explainer')"
          className="w-full rounded-2xl bg-background/50 border border-foreground/10 p-3 text-sm outline-none resize-none" />

        <input value={tags} onChange={(e) => setTags(e.target.value)}
          placeholder="Hashtags: #coding #learn #tutorial"
          className="w-full rounded-full bg-background/50 border border-foreground/10 px-4 py-2 text-sm outline-none" />

        <div className="rounded-2xl border border-foreground/10 bg-background/40 p-3 text-xs text-foreground/70 flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
          <div>
            <div className="font-semibold text-foreground"> moderation</div>
            <div>Every upload is scored by. Only clearly educational reels are approved. Borderline goes to human review; non-educational is rejected.</div>
          </div>
        </div>

        {result && (
          <div className="rounded-2xl border border-foreground/10 bg-background/40 p-4 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4 text-[#e8c874]" />
              Verdict: <span className={`uppercase text-xs ${result.status === "approved" ? "text-emerald-500" : result.status === "rejected" ? "text-rose-500" : "text-amber-500"}`}>{result.status}</span>
            </div>
            <div className="text-xs text-foreground/70">Score: {result.verdict.score}/100 · {result.verdict.confidence}</div>
            <div className="text-xs text-foreground/70">{result.verdict.reason}</div>
            {result.verdict.labels?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {result.verdict.labels.map((l: string) => <span key={l} className="text-[10px] rounded-full bg-foreground/5 px-2 py-0.5">{l}</span>)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
