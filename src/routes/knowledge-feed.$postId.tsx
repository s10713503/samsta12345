// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Heart, MessageCircle, Bookmark, Send, Flag, Trash2, FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import {
  getKnowledgePost, listComments, addComment, toggleKnowledgeLike, toggleKnowledgeSave,
  deleteKnowledgePost, reportContent,
} from "@/lib/api/knowledge-feed";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/knowledge-feed/$postId")({
  component: KnowledgePostDetail,
  loader: async ({ params }) => {
    try {
      const post: any = await getKnowledgePost(params.postId, null);
      if (!post) return { seo: null };
      return {
        seo: {
          title: (post.title as string) ?? "Knowledge post",
          body: (post.body as string) ?? (post.content as string) ?? null,
          author: (post.author?.full_name as string) ?? null,
          created_at: (post.created_at as string) ?? null,
          cover: (post.cover_url as string) ?? null,
        },
      };
    } catch {
      return { seo: null };
    }
  },
  head: ({ params, loaderData }) => {
    const seo = loaderData?.seo;
    const url = `https://samstaofficial.lovable.app/knowledge-feed/${params.postId}`;
    if (!seo) {
      return {
        meta: [
          { title: "Knowledge post — Samsta" },
          { name: "description", content: "Read this knowledge post on Samsta — a calm feed for ideas, insights and long-form thinking." },
          { property: "og:title", content: "Knowledge post — Samsta" },
          { property: "og:description", content: "Read this knowledge post on Samsta — a calm feed for ideas, insights and long-form thinking." },
          { property: "og:type", content: "article" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const titleLine = `${seo.title} — Samsta Knowledge`;
    const desc = (seo.body ?? `Read "${seo.title}" on Samsta Knowledge.`).replace(/\s+/g, " ").slice(0, 300);
    const meta: any[] = [
      { title: titleLine },
      { name: "description", content: desc },
      { property: "og:title", content: titleLine },
      { property: "og:description", content: desc },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
    ];
    if (seo.cover) {
      meta.push({ property: "og:image", content: seo.cover });
      meta.push({ name: "twitter:image", content: seo.cover });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: seo.title,
          datePublished: seo.created_at,
          author: seo.author ? { "@type": "Person", name: seo.author } : undefined,
          image: seo.cover ?? undefined,
        }),
      }],
    };
  },
});

function KnowledgePostDetail() {
  const { postId } = Route.useParams();
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const postKey = ["knowledge-post", postId, user?.id ?? null];
  const commentsKey = ["knowledge-comments", postId];

  const { data: post } = useQuery({
    queryKey: postKey,
    queryFn: () => getKnowledgePost(postId, user?.id ?? null),
    enabled: !!user,
  });
  const { data: comments = [] } = useQuery({
    queryKey: commentsKey,
    queryFn: () => listComments(postId),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`kpost-${postId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "knowledge_comments", filter: `knowledge_post_id=eq.${postId}` },
        () => qc.invalidateQueries({ queryKey: commentsKey }))
      .on("postgres_changes", { event: "*", schema: "public", table: "knowledge_likes", filter: `knowledge_post_id=eq.${postId}` },
        () => qc.invalidateQueries({ queryKey: postKey }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user, postId]);

  if (!user) {
    return <div className="min-h-dvh grid place-items-center p-6"><Link to="/auth" className="rounded-full bg-foreground text-background px-4 py-2 text-sm">Sign in</Link></div>;
  }
  if (!post) {
    return <div className="min-h-dvh grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const isMine = post.author_id === user.id;

  async function submitComment() {
    if (!text.trim()) return;
    const v = text.trim();
    setText("");
    const { error } = await addComment(postId, user.id, v);
    if (error) toast.error(error.message);
  }

  async function onLike() {
    await toggleKnowledgeLike(post.id, user.id, !!post.liked_by_me);
    qc.invalidateQueries({ queryKey: postKey });
  }
  async function onSave() {
    await toggleKnowledgeSave(post.id, user.id, !!post.saved_by_me);
    qc.invalidateQueries({ queryKey: postKey });
  }
  async function onDelete() {
    if (!confirm("Delete this post?")) return;
    const { error } = await deleteKnowledgePost(post.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/knowledge-feed" });
  }
  async function onReport() {
    const reason = prompt("Reason for reporting?");
    if (!reason) return;
    const { error } = await reportContent(user.id, "knowledge_post", post.id, reason);
    if (error) return toast.error(error.message);
    toast.success("Report submitted");
  }

  return (
    <div className="min-h-dvh pb-32">
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-background/60 border-b border-foreground/5 px-4 py-3 flex items-center gap-3">
        <Link to="/knowledge-feed" className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1 font-display italic text-lg truncate">{post.title}</div>
        {isMine ? (
          <button onClick={onDelete} className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><Trash2 className="h-4 w-4" /></button>
        ) : (
          <button onClick={onReport} className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><Flag className="h-4 w-4" /></button>
        )}
      </div>

      <article className="p-4 space-y-4">
        {post.cover_url && <img src={post.cover_url} className="w-full rounded-2xl border border-foreground/10" alt="" />}

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-foreground/10">
            {post.author?.avatar_url && <img src={post.author.avatar_url} alt="" className="w-full h-full object-cover" />}
          </div>
          <div>
            <div className="text-sm font-semibold">{post.author?.full_name || post.author?.username || "Anonymous"}</div>
            <div className="text-[11px] text-foreground/50">{new Date(post.created_at).toLocaleString()}{post.category ? ` · ${post.category}` : ""}</div>
          </div>
        </div>

        <h1 className="font-display italic text-2xl leading-tight">{post.title}</h1>

        {post.body && <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/85">{post.body}</div>}

        {post.tags?.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {post.tags.map((t: string) => <span key={t} className="text-[11px] rounded-full bg-foreground/5 px-2 py-0.5">#{t}</span>)}
          </div>
        )}

        {post.media && post.media.length > 0 && (
          <div className="space-y-2">
            {post.media.map((m: any) => (
              <div key={m.id}>
                {m.kind === "image" && m.url && <img src={m.url} className="w-full rounded-2xl border border-foreground/10" alt="" />}
                {m.kind === "video" && m.url && <video src={m.url} controls className="w-full rounded-2xl border border-foreground/10" />}
                {m.kind === "audio" && m.url && <audio src={m.url} controls className="w-full" />}
                {(m.kind === "pdf" || m.kind === "doc") && m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl border border-foreground/10 bg-background/50 p-3 text-sm">
                    <FileText className="h-4 w-4" />
                    <span className="flex-1 truncate">{m.path.split("/").pop()}</span>
                    <Download className="h-4 w-4 opacity-70" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-5 border-y border-foreground/10 py-3">
          <button onClick={onLike} className="flex items-center gap-1 active:scale-95">
            <Heart className={cn("h-5 w-5", post.liked_by_me && "fill-rose-500 text-rose-500")} />
            <span className="text-sm">{post.likes_count || 0}</span>
          </button>
          <div className="flex items-center gap-1">
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm">{comments.length}</span>
          </div>
          <button onClick={onSave} className="ml-auto active:scale-95">
            <Bookmark className={cn("h-5 w-5", post.saved_by_me && "fill-foreground")} />
          </button>
        </div>

        <div>
          <div className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">Comments</div>
          <ul className="space-y-3">
            {comments.map((c: any) => (
              <li key={c.id} className="flex gap-2">
                <div className="h-8 w-8 rounded-full overflow-hidden bg-foreground/10 shrink-0">
                  {c.author?.avatar_url && <img src={c.author.avatar_url} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-foreground/60">
                    <span className="font-semibold text-foreground">{c.author?.full_name || c.author?.username || "User"}</span>
                    {" · "}{new Date(c.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm">{c.body}</div>
                </div>
              </li>
            ))}
            {comments.length === 0 && <li className="text-sm text-foreground/50">Be the first to comment.</li>}
          </ul>
        </div>
      </article>

      <div className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-2xl bg-background/70 border-t border-foreground/10 p-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitComment(); }}
            placeholder="Add a comment…" className="flex-1 rounded-full bg-background/70 border border-foreground/10 px-4 py-2 text-sm outline-none" />
          <button onClick={submitComment} className="grid place-items-center h-9 w-9 rounded-full bg-foreground text-background"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}
