// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Upload, X, Loader2, FileText, ImageIcon, Video, FileType2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { createKnowledgePost, uploadKnowledgeFile } from "@/lib/api/knowledge-feed";

export const Route = createFileRoute("/knowledge-feed/new")({
  component: NewKnowledge,
  head: () => ({ meta: [{ title: "New knowledge post · Samsta" }] }),
});

const CATEGORIES = ["Tech", "Business", "Science", "Design", "Health", "Career", "Study"];

function NewKnowledge() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <Link to="/auth" className="rounded-full bg-foreground text-background px-4 py-2 text-sm">Sign in first</Link>
      </div>
    );
  }

  async function onSubmit() {
    if (!title.trim()) { toast.error("Title required"); return; }
    setBusy(true);
    try {
      let coverInfo = null;
      if (cover) {
        const u = await uploadKnowledgeFile(user.id, cover);
        coverInfo = { bucket: u.bucket, path: u.path };
      }
      const uploaded = [];
      for (const f of files) {
        const u = await uploadKnowledgeFile(user.id, f);
        uploaded.push({ bucket: u.bucket, path: u.path, kind: u.kind, mime: u.mime, size: u.size });
      }
      const tags = tagsRaw.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
      const post = await createKnowledgePost({
        authorId: user.id,
        title: title.trim(),
        body: body.trim() || undefined,
        category: category || undefined,
        tags,
        cover: coverInfo,
        media: uploaded,
      });
      toast.success("Published");
      navigate({ to: "/knowledge-feed/$postId", params: { postId: post.id } });
    } catch (e: any) {
      toast.error(e.message || "Failed to publish");
    } finally { setBusy(false); }
  }

  function iconFor(f: File) {
    if (f.type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (f.type.startsWith("video/")) return <Video className="h-4 w-4" />;
    if (f.type === "application/pdf") return <FileType2 className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  }

  return (
    <div className="min-h-dvh pb-32">
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-background/60 border-b border-foreground/5 px-4 py-3 flex items-center gap-3">
        <Link to="/knowledge-feed" className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1 font-display italic text-lg">New knowledge post</div>
        <button onClick={onSubmit} disabled={busy} className="rounded-full bg-foreground text-background px-4 py-2 text-sm disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
          className="w-full text-xl font-display italic bg-transparent border-b border-foreground/10 py-2 outline-none" />

        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your article (markdown supported)…"
          rows={10} className="w-full rounded-2xl bg-background/50 border border-foreground/10 p-3 text-sm outline-none resize-none" />

        <div>
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Category</div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(category === c ? "" : c)}
                className={`px-3 py-1.5 rounded-full text-[11px] border ${category === c ? "bg-foreground text-background border-foreground" : "bg-background/50 border-foreground/10"}`}>{c}</button>
            ))}
          </div>
        </div>

        <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="Tags (comma-separated, e.g. ai, react, learning)"
          className="w-full rounded-full bg-background/50 border border-foreground/10 px-4 py-2 text-sm outline-none" />

        <label className="block">
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Cover image</div>
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-foreground/20 p-3 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span className="text-sm text-foreground/70 truncate flex-1">{cover ? cover.name : "Choose an image"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </div>
        </label>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Attachments (PDFs, images, video, docs)</div>
          <label className="flex items-center gap-3 rounded-2xl border border-dashed border-foreground/20 p-3 cursor-pointer">
            <Upload className="h-4 w-4" />
            <span className="text-sm text-foreground/70">Add files</span>
            <input type="file" multiple className="hidden"
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.md,audio/*"
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                setFiles((f) => [...f, ...list]);
                e.currentTarget.value = "";
              }} />
          </label>
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-background/50 border border-foreground/10 px-3 py-2 text-sm">
                  {iconFor(f)}
                  <span className="flex-1 truncate">{f.name}</span>
                  <button onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}><X className="h-4 w-4 opacity-60" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
