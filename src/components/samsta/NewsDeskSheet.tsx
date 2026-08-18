// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X, Plus, Paperclip, Loader2, Trash2, Send, Link2, FileText, FolderKanban, Sparkles, TrendingUp, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { PremiumBadge } from "@/components/samsta/PremiumLock";
import {
  listDeskStories, createNewsStory, deleteNewsStory, subscribeDeskStories,
  uploadStoryFile, MAX_STORY_FILE_BYTES,
} from "@/lib/api/news-desk";
import { searchOrbit } from "@/lib/api/orbit";
import { listOrbitProjects } from "@/lib/api/orbit-projects";

const fmtSize = (b: number) => (b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Premium composer: headline, story, link and ≤5 MB image/file attachments — desk-scoped. */
function StoryComposer({ desk, uid, onDone }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [headline, setHeadline] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [media, setMedia] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  async function pick(e: any) {
    const files: File[] = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        if (f.size > MAX_STORY_FILE_BYTES) {
          toast.error(`${f.name} is over the 5 MB limit`);
          continue;
        }
        const m = await uploadStoryFile(uid, f);
        setMedia((prev) => [...prev, m]);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!headline.trim()) return toast.error("Add a headline");
    setBusy(true);
    try {
      await createNewsStory({ userId: uid, desk: desk.label, headline, body, link, media });
      setHeadline(""); setBody(""); setLink(""); setMedia([]); setOpen(false);
      toast.success(`Published to the ${desk.label} desk`);
      onDone?.();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not publish");
    } finally {
      setBusy(false);
    }
  }

  if (!uid) {
    return (
      <Link to="/auth" className="glass flex items-center justify-center gap-2 rounded-3xl p-4 text-sm active:scale-[0.99]">
        <Sparkles className="h-4 w-4 text-primary" /> Sign in to add a {desk.label} story
      </Link>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="glass-strong group relative flex w-full items-center gap-3 overflow-hidden rounded-3xl p-4 text-left transition-transform hover:scale-[1.01] active:scale-[0.98]"
      >
        <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl animate-aurora"
          style={{ background: desk.accent }} />
        <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-background"
          style={{ background: "linear-gradient(135deg, oklch(0.74 0.14 300), oklch(0.78 0.12 210))" }}>
          <Plus className="h-4 w-4" />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-sm font-semibold">Add a {desk.label} story</span>
          <span className="block text-[11px] text-muted-foreground">Images & files up to 5 MB · stays in this desk</span>
        </span>
        <PremiumBadge small />
      </button>
    );
  }

  return (
    <div className="glass-strong relative animate-scale-in overflow-hidden rounded-3xl p-4">
      <span aria-hidden className="pointer-events-none absolute -left-10 -bottom-12 h-32 w-32 rounded-full opacity-50 blur-3xl animate-aurora"
        style={{ background: desk.accent }} />
      <div className="relative flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">New {desk.label} story</p>
        <button onClick={() => setOpen(false)} className="glass flex h-7 w-7 items-center justify-center rounded-full active:scale-95">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <input
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder="Headline"
        className="relative mt-3 w-full bg-transparent font-display text-xl italic outline-none placeholder:not-italic placeholder:font-sans placeholder:text-base placeholder:text-muted-foreground"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder={`What's happening in ${desk.label}?`}
        className="relative mt-2 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="glass relative mt-2 flex items-center gap-2 rounded-2xl px-3 py-2">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Source link (optional)"
          className="w-full bg-transparent text-[12px] outline-none" />
      </div>

      {!!media.length && (
        <div className="relative mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {media.map((m, i) => (
            <div key={m.url} className="glass relative h-20 w-20 shrink-0 animate-scale-in overflow-hidden rounded-2xl">
              {m.type.startsWith("image/")
                ? <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
                : <div className="flex h-full flex-col items-center justify-center gap-1 p-1 text-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="line-clamp-2 text-[8px] text-muted-foreground">{m.name}</span>
                  </div>}
              <button onClick={() => setMedia((p) => p.filter((_, x) => x !== i))}
                className="glass-strong absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full">
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative mt-3 flex items-center gap-2">
        <input ref={fileRef} type="file" multiple hidden accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip" onChange={pick} />
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="glass flex items-center gap-2 rounded-full px-3 py-2 text-[11px] active:scale-95 disabled:opacity-50">
          <Paperclip className="h-3.5 w-3.5" /> Attach (≤5 MB)
        </button>
        <button onClick={publish} disabled={busy}
          className="ml-auto flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold text-background transition-transform active:scale-95 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, oklch(0.74 0.14 300), oklch(0.78 0.12 210))" }}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Publish
        </button>
      </div>
    </div>
  );
}

/** Full-screen premium desk view — stories, Orbit posts and projects for one category only. */
export function NewsDeskSheet({ desk, uid, onClose }: any) {
  const qc = useQueryClient();

  const { data: stories = [], isLoading, refetch } = useQuery({
    queryKey: ["desk-stories", desk.label],
    queryFn: () => listDeskStories(desk.label),
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["desk-posts", desk.label, uid],
    queryFn: () => searchOrbit(desk.label, uid),
    staleTime: 30_000,
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["desk-projects", desk.label, uid],
    queryFn: () => listOrbitProjects({ lane: "discover", meId: uid, search: desk.label, limit: 8 }),
    staleTime: 60_000,
  });

  useEffect(() => subscribeDeskStories(desk.label, () => {
    qc.invalidateQueries({ queryKey: ["desk-stories", desk.label] });
  }), [desk.label, qc]);

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-background/70 backdrop-blur-xl" />
      <div className="glass-strong absolute inset-x-0 bottom-0 top-8 animate-scale-in overflow-hidden rounded-t-[36px]">
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-70 blur-3xl animate-aurora"
          style={{ background: `radial-gradient(circle, ${desk.accent}, transparent 70%)` }} />

        <div className="relative flex items-start justify-between px-5 pt-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Samsta news desk</p>
            <h2 className="font-display text-3xl italic leading-tight">{desk.label}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Top Stories Today</p>
          </div>
          <button onClick={onClose} className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full active:scale-95">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative mt-4 h-[calc(100%-7.5rem)] space-y-3 overflow-y-auto px-5 pb-28">
          <StoryComposer desk={desk} uid={uid} onDone={refetch} />

          {isLoading && <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">Curating {desk.label} stories…</div>}

          {stories.map((s: any, i: number) => (
            <article key={s.id} style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              className="glass animate-fade-in rounded-3xl p-4">
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground/80"
                  style={{ background: desk.accent, opacity: 0.65 }}>{desk.label}</span>
                <span className="truncate">@{s.author?.username ?? "orbiter"}</span>
                <span className="ml-auto shrink-0">{new Date(s.created_at).toLocaleDateString()}</span>
                {uid === s.user_id && (
                  <button onClick={async () => { await deleteNewsStory(s.id); refetch(); }} className="shrink-0 active:scale-90">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <h3 className="mt-2 font-display text-lg italic leading-snug">{s.headline}</h3>
              {s.body && <p className="mt-1 whitespace-pre-wrap text-sm leading-snug text-muted-foreground">{s.body}</p>}

              {!!(s.media ?? []).length && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {s.media.map((m: any) => m.type?.startsWith("image/") ? (
                    <img key={m.url} src={m.url} alt={m.name} loading="lazy"
                      className="h-32 w-full rounded-2xl object-cover transition-transform hover:scale-[1.02]" />
                  ) : (
                    <a key={m.url} href={m.url} target="_blank" rel="noreferrer"
                      className="glass flex items-center gap-2 rounded-2xl p-3 text-[11px] active:scale-[0.98]">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground">{fmtSize(m.size ?? 0)}</span>
                      </span>
                    </a>
                  ))}
                </div>
              )}

              {s.link && (
                <a href={s.link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] text-primary">
                  <Link2 className="h-3 w-3" /> Source
                </a>
              )}
            </article>
          ))}

          {!isLoading && !stories.length && (
            <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">
              No {desk.label} stories yet — publish the first one above.
            </div>
          )}

          {!!posts.length && (
            <>
              <p className="pt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">From the Orbit feed</p>
              {posts.map((p: any) => (
                <Link key={p.id} to="/orbit/$postId" params={{ postId: p.id }} onClick={onClose}
                  className="glass block animate-fade-in rounded-3xl p-4 active:scale-[0.99]">
                  <p className="text-[10px] text-muted-foreground">@{p.author?.username ?? "orbiter"}</p>
                  <p className="mt-1.5 line-clamp-3 text-sm leading-snug">{p.title ?? p.body ?? "Media story"}</p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{Math.round(p.hot_score ?? 0)}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{(p.like_count ?? 0) + (p.reply_count ?? 0)}</span>
                  </div>
                </Link>
              ))}
            </>
          )}

          {!!projects.length && (
            <>
              <p className="pt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{desk.label} projects</p>
              <div className="grid grid-cols-2 gap-3">
                {projects.map((pr: any) => (
                  <Link key={pr.id} to="/orbit/projects/$projectId" params={{ projectId: pr.id }} onClick={onClose}
                    className="glass relative overflow-hidden rounded-3xl p-4 active:scale-[0.98]">
                    <FolderKanban className="h-4 w-4 text-primary" />
                    <p className="mt-2 truncate text-sm font-semibold">{pr.name}</p>
                    <p className="line-clamp-2 text-[11px] text-muted-foreground">{pr.summary ?? "Orbit project"}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
