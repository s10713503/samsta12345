import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, Upload, Sparkles, Briefcase, Rocket, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { uploadCareerReelVideo } from "@/lib/api/career-reels";
import { submitCareerReel } from "@/lib/career-reels.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/career/reels/new")({
  component: NewCareerReel,
  head: () => ({
    meta: [
      { title: "Create a Career Reel · Samsta" },
      { name: "description", content: "Share a career or business reel. Only work-related content is approved by Sam." },
    ],
  }),
});

function NewCareerReel() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const submit = useServerFn(submitCareerReel);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<"career" | "business">("career");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; status: string; reason: string } | null>(null);

  function pick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("video/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  async function upload() {
    if (!user || !file || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const { bucket, path } = await uploadCareerReelVideo(user.id, file);
      const hashtags = tags
        .split(/[\s,#]+/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      const res: any = await submit({
        data: { caption, hashtags, category, bucket, video_path: path },
      });
      if (res.status === "approved") {
        setResult({ ok: true, status: "approved", reason: res.verdict?.reason ?? "" });
        setTimeout(() => navigate({ to: "/career" }), 1400);
      } else if (res.status === "rejected") {
        setResult({ ok: false, status: "rejected", reason: res.verdict?.reason ?? "This reel looks like entertainment. Only career or business content is allowed." });
      } else {
        setResult({ ok: true, status: "review", reason: res.verdict?.reason ?? "Held for a quick review." });
      }
    } catch (e: any) {
      setResult({ ok: false, status: "error", reason: e?.message ?? "Upload failed" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, oklch(0.985 0.012 15) 0%, oklch(0.97 0.022 20) 45%, oklch(0.96 0.028 355) 100%)" }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 pb-2 pt-3 backdrop-blur-xl bg-white/60 border-b border-white/60">
        <Link to="/career" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/80 shadow-sm active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-lg italic">Create a Career Reel</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Sparkles className="h-3 w-3" /> Sam approves career & business only</div>
        </div>
      </header>

      <main className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(["career", "business"] as const).map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition-all active:scale-95",
                category === c ? "text-white shadow-md border-transparent" : "border-white/70 bg-white/70 text-foreground/70",
              )}
              style={category === c ? { background: "linear-gradient(135deg, oklch(0.78 0.13 15), oklch(0.72 0.15 355))" } : undefined}>
              {c === "career" ? <Briefcase className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
              {c === "career" ? "Career" : "Business"}
            </button>
          ))}
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex h-64 w-full items-center justify-center rounded-3xl border-2 border-dashed border-white/80 bg-white/60 shadow-inner overflow-hidden active:scale-[0.99]"
        >
          {preview ? (
            <video src={preview} className="h-full w-full object-cover" muted playsInline autoPlay loop />
          ) : (
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <div className="mt-2 text-sm font-semibold">Tap to pick a video</div>
              <div className="text-[11px] text-muted-foreground">MP4/MOV up to ~60s</div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        </button>

        <div className="space-y-2">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's this reel about? (e.g. Resume tips for freshers, How I closed my first B2B deal…)"
            className="w-full rounded-2xl border border-white/70 bg-white/70 p-3 text-sm outline-none placeholder:text-muted-foreground min-h-[90px]"
            maxLength={500}
          />
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="#hiring #startup #interview"
            className="w-full rounded-2xl border border-white/70 bg-white/70 p-3 text-sm outline-none placeholder:text-muted-foreground"
            maxLength={200}
          />
        </div>

        {result && (
          <div className={cn(
            "flex items-start gap-2 rounded-2xl border p-3 text-sm",
            result.status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-900" :
            result.status === "rejected" ? "border-rose-200 bg-rose-50 text-rose-900" :
            "border-amber-200 bg-amber-50 text-amber-900"
          )}>
            {result.status === "approved" ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <AlertCircle className="mt-0.5 h-4 w-4" />}
            <div>
              <div className="font-semibold capitalize">{result.status}</div>
              <div className="text-[12px] opacity-90">{result.reason}</div>
              {result.status === "rejected" && (
                <div className="mt-1 text-[11px]">Your video was removed. Try a reel about your job, industry insights, or a business tip.</div>
              )}
            </div>
          </div>
        )}

        <button
          disabled={!file || busy || !user}
          onClick={upload}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-lg active:scale-95 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.13 15), oklch(0.72 0.15 355))" }}
        >
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Sam is reviewing…</> : <><Sparkles className="h-4 w-4" /> Submit for review</>}
        </button>

        <p className="text-center text-[11px] text-muted-foreground px-6">
 Reels are auto-checked by Sam. Entertainment, dance, memes and non-work content are removed automatically.
        </p>
      </main>
    </div>
  );
}
