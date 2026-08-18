import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Image as ImageIcon, Film, Sparkles, MapPin, X, Upload, Lock, Crown, FileText, File as FileIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/samsta/TopBar";
import { usePremium } from "@/lib/premium";
import { useAuthUser } from "@/hooks/use-auth";
import { uploadMedia, uploadDocumentFile, getMonthlyFileUploadCount, createPost, type MediaItem } from "@/lib/api/feed";
import { uploadMediaTracked, processPostMedia } from "@/lib/api/upload";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ViralPredictor } from "@/components/samsta/ViralPredictor";
import { formatBytes } from "@/lib/media-compress";




export const Route = createFileRoute("/create")({
  component: CreatePage,
  validateSearch: (search: Record<string, unknown>) => ({
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create — Post, Reel, Story · Samsta" },
      { name: "description", content: "Compose a photo post, short reel, or 24-hour story on Samsta— with Sam captions and location tagging." },
      { property: "og:title", content: "Create — Post, Reel, Story · Samsta" },
      { property: "og:description", content: "Compose a photo post, short reel, or 24-hour story on Samsta." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/create" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/create" }],
  }),
});

type Mode = "Post" | "Reel" | "Story" | "Files" | "Live";

function modeToKind(m: Mode): "post" | "reel" | "story" | "file" | null {
  if (m === "Post") return "post";
  if (m === "Reel") return "reel";
  if (m === "Story") return "story";
  if (m === "Files") return "file";
  return null;
}

type Draft = { file: File; previewUrl: string; type: "image" | "video" | "file" };

const ATTACH_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip";

/** Default premium aspect ratio per mode. Auto-only — no manual picker. */
function defaultRatio(mode: Mode): string {
  // Post: 4:5 (1080×1350) — premium and fills the screen nicely
  // Reel / Story: 9:16 (1080×1920)
  if (mode === "Reel" || mode === "Story") return "9 / 16";
  return "4 / 5";
}

function CreatePage() {
  const { mode: modeParam } = Route.useSearch();
  const [mode, setMode] = useState<Mode>(modeParam === "reel" ? "Reel" : "Post");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [attachments, setAttachments] = useState<Draft[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [storyTtl, setStoryTtl] = useState<number>(24);
  const [closeFriendsOnly, setCloseFriendsOnly] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<{ label: string; pct: number } | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const attachRef = useRef<HTMLInputElement | null>(null);
  const { isPremium, canCreate, recordUse, currentPlan, unlimitedMedia } = usePremium();
  const { user } = useAuthUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const kind = modeToKind(mode);
  const accept =
    mode === "Reel" ? "video/*" :
    mode === "Story" ? "image/*,video/*" :
    mode === "Files" ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip" :
    "image/*";
  const quota = kind ? canCreate(kind) : { allowed: true, remaining: 999, cap: 999 };

  const fileQuota = canCreate("file");
  // Live server-side count for Files quota (this-month) — used for both Files mode and attachments on Post/Reel
  const { data: serverFileCount = 0 } = useQuery({
    queryKey: ["file-uploads-month", user?.id],
    queryFn: () => getMonthlyFileUploadCount(user!.id),
    enabled: !!user,
    refetchOnWindowFocus: false,
  });
  const fileCapNow = fileQuota.cap;
  const fileRemaining = Math.max(0, fileCapNow - serverFileCount);
  const fileAllowed = kind === "file" ? fileRemaining > 0 : quota.allowed;

  function openPicker(next: Mode) {
    setMode(next);
    const k = modeToKind(next);
    if (k) {
      const q = canCreate(k);
      if (!q.allowed || (k === "file" && !fileAllowed)) {
        toast.error(
          k === "file"
            ? `You've used all ${q.cap} file uploads this month. Upgrade for more.`
            : `You've used all ${q.cap} ${k}s this month. Unlock premium for more.`,
        );
        return;
      }
    }
    requestAnimationFrame(() => inputRef.current?.click());
  }

  const autoOpened = useRef(false);
  useEffect(() => {
    if (modeParam === "reel" && !autoOpened.current) {
      autoOpened.current = true;
      setMode("Reel");
      requestAnimationFrame(() => inputRef.current?.click());
    }
  }, [modeParam]);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next: Draft[] = Array.from(files).map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      type: mode === "Files"
        ? "file"
        : f.type.startsWith("video") ? "video" : "image",
    }));
    const limit = mode === "Files" ? Math.max(1, fileRemaining) : 10;
    setDrafts((prev) => [...next, ...prev].slice(0, limit));
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeDraft(i: number) {
    setDrafts((prev) => {
      const next = prev.slice();
      const [removed] = next.splice(i, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function handleAttachments(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = Math.max(0, fileRemaining - attachments.length);
    if (room <= 0) {
      toast.error(`You've used all ${fileCapNow} file uploads this month. Upgrade for more.`);
      if (attachRef.current) attachRef.current.value = "";
      return;
    }
    const next: Draft[] = Array.from(files).slice(0, room).map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      type: "file",
    }));
    setAttachments((prev) => [...prev, ...next]);
    if (attachRef.current) attachRef.current.value = "";
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => {
      const next = prev.slice();
      const [removed] = next.splice(i, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  async function publish() {
    if (!user) {
      toast.error("Please sign in to post");
      return;
    }
    if (!kind) return;
    if (drafts.length === 0) {
      toast.error(mode === "Files" ? "Choose a file to upload" : "Add at least one photo or video");
      return;
    }
    setUploading(true);
    try {
      if (kind === "file") {
        // File uploads: upload to `files` bucket, don't create a feed post
        if (drafts.length > fileRemaining) {
          throw new Error(`Only ${fileRemaining} file upload${fileRemaining === 1 ? "" : "s"} left this month.`);
        }
        await Promise.all(
          drafts.map(async (d) => {
            await uploadDocumentFile(user.id, d.file, isPremium);
            recordUse("file", 1);
          }),
        );
        toast.success(`${drafts.length} file${drafts.length === 1 ? "" : "s"} uploaded`);
        drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
        setDrafts([]);
        await queryClient.invalidateQueries({ queryKey: ["file-uploads-month", user.id] });
        return;
      }
      // Attachments must fit remaining file quota
      if (attachments.length > fileRemaining) {
        throw new Error(`Only ${fileRemaining} file attachment${fileRemaining === 1 ? "" : "s"} left this month. Upgrade for more.`);
      }
      // Upload everything in parallel — dramatically faster than one-by-one.
      setProgress({});
      setPhase({ label: "Uploading…", pct: 0 });
      const [mediaItems, attachItems] = await Promise.all([
        Promise.all(
          drafts.map((d, i) =>
            uploadMediaTracked(user.id, d.file, kind as "post" | "reel" | "story", (pct) => {
              setProgress((prev) => {
                const next = { ...prev, [i]: pct };
                const values = drafts.map((_, k) => next[k] ?? 0);
                const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
                setPhase({ label: avg < 100 ? "Uploading…" : "Finishing upload…", pct: avg });
                return next;
              });
            }),
          ),
        ),
        Promise.all(attachments.map((a) => uploadDocumentFile(user.id, a.file, isPremium))),
      ]);
      attachments.forEach(() => recordUse("file", 1));
      const media: MediaItem[] = [...mediaItems, ...attachItems];
      const needsProcessing = mediaItems.some((m) => m.type === "video" || m.type === "audio");
      if (needsProcessing) setPhase({ label: "Processing media…", pct: 10 });
      const postId = await createPost({
        userId: user.id,
        caption,
        kind: kind as "post" | "reel" | "story",
        media,
        ttlHours: kind === "story" ? storyTtl : undefined,
        location: location.trim() || null,
        closeFriendsOnly: kind === "story" ? closeFriendsOnly : undefined,
        needsProcessing,
      });

      // Poster frames + duration are built in the background so the person
      // posting can keep browsing; the feed shows a "Processing" chip meanwhile.
      if (needsProcessing && postId) {
        const sourceFiles = drafts.map((d) => d.file);
        void processPostMedia(postId, user.id, sourceFiles, mediaItems, (pct, label) => setPhase({ label, pct }))
          .then(() => {
            toast.success("Processing complete — your upload is ready");
            void queryClient.invalidateQueries({ queryKey: ["feed"] });
            void queryClient.invalidateQueries({ queryKey: ["reels"] });
            void queryClient.invalidateQueries({ queryKey: ["user-posts"] });
          })
          .catch(() => toast.error("Media processing failed — the original file is still posted"))
          .finally(() => setPhase(null));
      } else {
        setPhase(null);
      }

      recordUse(kind, 1);
      toast.success(`${kind === "story" ? "Story" : kind === "reel" ? "Reel" : "Post"} shared`);
      drafts.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      attachments.forEach((d) => URL.revokeObjectURL(d.previewUrl));
      setDrafts([]);
      setAttachments([]);
      setCaption("");
      setLocation("");
      // Navigate immediately; refresh the relevant lists in the background.
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      void queryClient.invalidateQueries({ queryKey: ["reels"] });
      void queryClient.invalidateQueries({ queryKey: ["stories"] });
      void queryClient.invalidateQueries({ queryKey: ["user-uploads"] });
      if (kind === "reel") navigate({ to: "/reels" });
      else navigate({ to: "/profile", search: { tab: "grid" } as any });

    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to upload");
    } finally {
      setUploading(false);
    }
  }


  return (
    <>
      <TopBar title="Create" />
      <div className="px-5 pt-2 pb-28">
        <Link
          to="/premium"
          className="mb-4 flex items-center justify-between rounded-2xl border p-3 transition active:scale-[0.99]"
          style={{
            background: isPremium
              ? "linear-gradient(135deg, #14100a, #1c1508)"
              : "linear-gradient(135deg, oklch(0.96 0.03 30), oklch(0.94 0.04 55))",
            borderColor: isPremium ? "rgba(212,175,55,0.4)" : "transparent",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: "linear-gradient(135deg, #d4af37, #f5e6b3)" }}>
              <Crown className="h-4 w-4 text-black" />
            </div>
            <div>
              <div className={`text-sm font-medium ${isPremium ? "text-[#f5e6b3]" : ""}`}>
                {isPremium ? `Premium · ${currentPlan?.label}` : "Free plan"}
              </div>
              <div className={`text-[11px] ${isPremium ? "text-white/50" : "text-muted-foreground"}`}>
                {isPremium ? `${currentPlan?.postCap} posts · ${currentPlan?.reelCap} reels · ${currentPlan?.storyCap} stories / month` : "Unlock unlimited & higher upload caps"}
              </div>
            </div>
          </div>
          <span className={`text-xs font-medium ${isPremium ? "text-[#d4af37]" : "text-primary"}`}>
            {isPremium ? "Manage" : "Upgrade →"}
          </span>
        </Link>

        <div className="grid grid-cols-5 gap-2">


          {([
            { icon: ImageIcon, label: "Post" as Mode },
            { icon: Film, label: "Reel" as Mode },
            { icon: Sparkles, label: "Story" as Mode },
            { icon: FileText, label: "Files" as Mode },
            { icon: MapPin, label: "Live" as Mode },
          ]).map((o) => {
            const active = mode === o.label;
            const k = modeToKind(o.label);
            const q = k ? canCreate(k) : null;
            const locked = q ? !q.allowed : false;
            const premiumOnly = o.label === "Files" && !isPremium;
            return (
              <button
                key={o.label}
                onClick={() => {
                  if (o.label === "Live") { toast("Live is coming soon"); return; }
                  openPicker(o.label);
                }}
                className={`glass relative flex flex-col items-center gap-1.5 rounded-2xl p-3 active:scale-95 transition-transform ${active ? "ring-2 ring-primary/60" : ""}`}
                aria-label={`Create ${o.label}`}
              >
                {(locked || premiumOnly) && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#f5e6b3] text-black shadow">
                    <Lock className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
                <o.icon className="h-5 w-5" strokeWidth={1.6} />
                <span className="text-xs">{o.label}</span>
              </button>
            );
          })}
        </div>

        <div className="glass-strong mt-4 rounded-3xl p-5 animate-fade-up">
          <div className="text-center">
            <h2 className="font-display text-xl italic">
              {mode === "Story" ? "Share to your story" :
               mode === "Reel" ? "New reel" :
               mode === "Files" ? "Upload files" : "New post"}
            </h2>
            {kind === "file" && (
              <p className="mt-1 text-xs" style={{ color: fileAllowed ? "var(--muted-foreground, #666)" : "#c0392b" }}>
                {`${fileRemaining} of ${fileCapNow} file uploads left this month`}
              </p>
            )}
            {mode === "Files" && !isPremium && (
              <p className="mt-1 text-[11px] text-[#c9a34a]">Free plan: 2 files / month · Upgrade for 10–65</p>
            )}
          </div>


          {drafts.length > 0 && mode !== "Files" && (
            <div className="mt-4">
              <div
                className="relative overflow-hidden rounded-[26px] bg-muted/40 ring-1 ring-[#d4af37]/35 shadow-[0_10px_30px_-12px_hsl(var(--foreground)/0.35)]"
                style={{ aspectRatio: defaultRatio(mode), maxHeight: "60vh" }}
              >
                {drafts[0].type === "image" ? (
                  <>
                    <div aria-hidden className="absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-2xl"
                      style={{ backgroundImage: `url(${drafts[0].previewUrl})` }} />
                    <img src={drafts[0].previewUrl} alt=""
                      className="relative mx-auto block h-full w-full object-contain" />
                  </>
                ) : (
                  <video src={drafts[0].previewUrl} muted playsInline
                    className="relative mx-auto block h-full w-full object-contain" />
                )}
                <div className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset ring-white/15" />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {mode === "Post" ? "4:5 · 1080 × 1350 px — premium feed ratio" : "9:16 · 1080 × 1920 px — full-screen ratio"}
              </p>
            </div>
          )}

          {drafts.length > 0 ? (
            mode === "Files" ? (
              <div className="mt-4 space-y-2">
                {drafts.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-background/40 p-3 animate-fade-in">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37]/20 to-transparent">
                      <FileIcon className="h-5 w-5 text-[#d4af37]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{d.file.name}</div>
                      <div className="text-[11px] text-muted-foreground">{formatBytes(d.file.size)}</div>
                    </div>
                    <button onClick={() => removeDraft(i)} aria-label="Remove"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-muted active:scale-90">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => openPicker(mode)}
                  className="w-full rounded-2xl border-2 border-dashed border-border py-3 text-xs text-muted-foreground hover:border-foreground/40"
                >
                  + Add another file
                </button>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {drafts.map((d, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-muted animate-fade-in">
                    {d.type === "image" ? (
                      <img src={d.previewUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <video src={d.previewUrl} className="h-full w-full object-cover" muted playsInline />
                    )}
                    <button onClick={() => removeDraft(i)} aria-label="Remove"
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm active:scale-90">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div
              onClick={() => openPicker(mode)}
              className="mt-4 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground transition hover:border-foreground/40"
            >
              <Upload className="h-8 w-8" strokeWidth={1.5} />
              <span className="mt-2 text-sm">
                {mode === "Files" ? "Tap to choose files" : "Tap to select from library"}
              </span>
              <span className="text-[11px]">
                {mode === "Reel" ? "Video only" :
                 mode === "Story" ? "Photo or video" :
                 mode === "Files" ? "PDF, DOC, XLS, PPT, ZIP…" : "Photos"}
              </span>
            </div>
          )}

          {mode === "Story" && (
            <div className="mt-4">
              <div className="mb-2 text-xs text-muted-foreground">Disappears after</div>
              <div className="flex flex-wrap gap-2">
                {[
                  { h: 1, label: "1h" },
                  { h: 6, label: "6h" },
                  { h: 12, label: "12h" },
                  { h: 24, label: "24h" },
                  { h: 48, label: "48h" },
                ].map((o) => (
                  <button
                    key={o.h}
                    onClick={() => setStoryTtl(o.h)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${storyTtl === o.h ? "border-foreground bg-foreground text-background" : "border-border text-foreground/80"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCloseFriendsOnly((v) => !v)}
                className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${closeFriendsOnly ? "border-emerald-500 bg-emerald-500/10" : "border-border"}`}
              >
                <div>
                  <div className="text-sm font-medium">Close friends only</div>
                  <div className="text-[11px] text-muted-foreground">Only people on your close friends list will see it</div>
                </div>
                <span className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${closeFriendsOnly ? "bg-emerald-500 justify-end" : "bg-muted justify-start"}`}>
                  <span className="h-5 w-5 rounded-full bg-white shadow" />
                </span>
              </button>
            </div>
          )}


          {mode !== "Story" && mode !== "Files" && (
            <>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="Write a caption… use #hashtags and @mentions"
                className="mt-3 w-full resize-none rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
              />
              <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-transparent px-3 py-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              {kind && kind !== "file" && (
                <ViralPredictor
                  input={{
                    kind: kind as "post" | "reel" | "story",
                    caption,
                    hasMedia: drafts.length > 0,
                    mediaCount: drafts.length,
                    hasVideo: drafts.some((d) => d.type === "video"),
                    location,
                  }}
                  onApplyCaption={(c) => setCaption(c)}
                />
              )}
              {/* Attachments (Post / Reel) */}
              <div className="mt-4 rounded-2xl border border-border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <FileIcon className="h-4 w-4 text-[#d4af37]" />
                    <span className="font-medium">Attach files</span>
                    <span className="text-[11px] text-muted-foreground">
                      · {fileRemaining} of {fileCapNow} left {isPremium ? "" : "(Free 2/mo)"}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const room = Math.max(0, fileRemaining - attachments.length);
                      if (room <= 0) {
                        toast.error(`You've used all ${fileCapNow} file uploads this month. Upgrade for more.`);
                        return;
                      }
                      attachRef.current?.click();
                    }}
                    className="rounded-full border border-border px-3 py-1 text-xs active:scale-95"
                  >
                    + Add file
                  </button>
                </div>
                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl bg-background/40 p-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#d4af37]/20 to-transparent">
                          <FileIcon className="h-4 w-4 text-[#d4af37]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs">{d.file.name}</div>
                          <div className="text-[10px] text-muted-foreground">{formatBytes(d.file.size)}</div>
                        </div>
                        <button onClick={() => removeAttachment(i)} aria-label="Remove"
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-muted active:scale-90">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">PDF, DOC, XLS, PPT, ZIP… viewers can open them from your post.</p>
                )}
              </div>
            </>
          )}




          {(uploading || phase) && (
            <div className="mt-4 rounded-2xl border border-border p-3 animate-fade-up">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{phase?.label ?? "Uploading…"}</span>
                <span className="tabular-nums text-muted-foreground">{phase?.pct ?? 0}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${phase?.pct ?? 0}%`,
                    background: "linear-gradient(90deg, #d4af37, oklch(0.78 0.15 20))",
                  }}
                />
              </div>
              {drafts.length > 1 && (
                <div className="mt-2 space-y-1">
                  {drafts.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="w-24 truncate">{d.file.name}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-foreground/50 transition-all" style={{ width: `${progress[i] ?? 0}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums">{progress[i] ?? 0}%</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[10px] text-muted-foreground">
                Videos and podcasts keep processing in the background — you can leave this screen.
              </p>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => openPicker(mode)}
              disabled={uploading}
              className="glass flex-1 rounded-full py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {drafts.length > 0 ? "Add more" : "Choose files"}
            </button>
            <button
              onClick={publish}
              disabled={uploading || drafts.length === 0 || (kind === "file" ? !fileAllowed : !quota.allowed)}
              className="flex-1 rounded-full py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.15 20), oklch(0.72 0.14 30))" }}
            >
              {uploading ? "Uploading…" : mode === "Story" ? "Share story" : mode === "Files" ? "Upload" : "Share"}
            </button>
          </div>
        </div>

        <input ref={inputRef} type="file" accept={accept} multiple={mode === "Post" || mode === "Files"} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <input ref={attachRef} type="file" accept={ATTACH_ACCEPT} multiple className="hidden" onChange={(e) => handleAttachments(e.target.files)} />

      </div>

    </>
  );
}


