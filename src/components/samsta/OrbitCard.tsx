// @ts-nocheck
import { memo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Heart, MessageCircle, Repeat2, Bookmark, Share2, BadgeCheck, Radio,
  Mic, Play, BarChart3, MoreHorizontal, Quote, Pin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OrbitCommentsSheet } from "@/components/samsta/OrbitCommentsSheet";
import { OrbitReshareSheet } from "@/components/samsta/OrbitReshareSheet";
import type { OrbitPost } from "@/lib/api/orbit";


function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function renderBody(text: string) {
  return text.split(/(\s+)/).map((tok, i) =>
    tok.startsWith("#") || tok.startsWith("@") ? (
      <span key={i} className="font-medium text-primary">{tok}</span>
    ) : (
      <span key={i}>{tok}</span>
    ),
  );
}

export const OrbitCard = memo(function OrbitCard({
  post, meId, onLike, onBookmark, onRepost, onQuote, onVote, onDelete, compact,
}: {
  post: OrbitPost;
  meId: string | null;
  onLike: (p: OrbitPost) => void;
  onBookmark: (p: OrbitPost) => void;
  onRepost: (p: OrbitPost) => void;
  onQuote: (p: OrbitPost) => void;
  onVote: (p: OrbitPost, optionId: string) => void;
  onDelete?: (p: OrbitPost) => void;
  compact?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<null | "comments" | "reshare">(null);

  const a = post.author;
  const name = a?.full_name || a?.username || "Samsta member";
  const totalVotes = (post.options ?? []).reduce((n, o) => n + o.vote_count, 0);

  return (
    <article
      className={cn(
        "glass feed-card relative overflow-hidden rounded-3xl p-4 animate-fade-up",
        post.is_live && "ring-1 ring-primary/40",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-40 blur-3xl animate-aurora"
        style={{ background: "oklch(0.85 0.1 290)" }}
      />

      <header className="relative flex items-center gap-3">
        <Link to="/profile/$userId" params={{ userId: post.user_id }} className="shrink-0">
          <div className="h-10 w-10 overflow-hidden rounded-full bg-muted ring-1 ring-border">
            {a?.avatar_url ? (
              <img src={a.avatar_url} alt={name} width={40} height={40} loading="lazy" decoding="async"
                className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold">{name}</span>
            {a?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-primary" />}
            <span className="text-[11px] text-muted-foreground">· {timeAgo(post.created_at)}</span>
            {post.is_edited && <span className="text-[10px] text-muted-foreground">· edited</span>}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {a?.username && <span className="truncate">@{a.username}</span>}
            {post.city && <span>· {post.city}</span>}
            {post.is_pinned && <Pin className="h-3 w-3" />}
          </div>
        </div>
        {post.is_live && (
          <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary-foreground">
            <Radio className="h-3 w-3 animate-pulse" /> live
          </span>
        )}
        {meId === post.user_id && onDelete && (
          <div className="relative">
            <button onClick={() => setMenu((v) => !v)} aria-label="Post options"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:scale-90">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menu && (
              <div className="glass-strong absolute right-0 top-9 z-20 w-32 overflow-hidden rounded-2xl animate-scale-in">
                <button className="w-full px-3 py-2 text-left text-xs text-destructive"
                  onClick={() => { setMenu(false); onDelete(post); }}>Delete</button>
              </div>
            )}
          </div>
        )}
      </header>

      <Link to="/orbit/$postId" params={{ postId: post.id }} className="relative mt-3 block">
        {post.title && <h3 className="font-display text-lg italic leading-snug">{post.title}</h3>}
        {post.body && (
          <p className={cn("whitespace-pre-wrap text-[15px] leading-relaxed", compact && "line-clamp-6")}>
            {renderBody(post.body)}
          </p>
        )}

        {post.kind === "photo" && post.media_url && (
          <img src={post.media_url} alt={post.body ?? "Orbit photo"} loading="lazy" decoding="async"
            className="mt-3 w-full rounded-2xl object-cover" />
        )}

        {post.kind === "video" && post.media_url && (
          <video src={post.media_url} poster={post.poster_url ?? undefined} controls preload="none"
            className="mt-3 w-full rounded-2xl" />
        )}

        {(post.kind === "voice" || post.kind === "podcast") && (
          <div className="glass-strong mt-3 flex items-center gap-3 rounded-2xl p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
              {post.kind === "podcast" ? <Play className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold">{post.kind === "podcast" ? "Podcast episode" : "Voice drop"}</div>
              <div className="mt-1.5 flex h-6 items-end gap-[3px]">
                {Array.from({ length: 26 }).map((_, i) => (
                  <span key={i} className="w-[3px] rounded-full bg-primary/60 animate-wave"
                    style={{ height: `${8 + ((i * 37) % 16)}px`, animationDelay: `${i * 40}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </Link>

      {post.kind === "poll" && !!post.options?.length && (
        <div className="relative mt-3 flex flex-col gap-2">
          {post.options.map((o) => {
            const pct = totalVotes ? Math.round((o.vote_count / totalVotes) * 100) : 0;
            const mine = post.myVote === o.id;
            return (
              <button key={o.id} onClick={() => onVote(post, o.id)}
                className={cn(
                  "relative overflow-hidden rounded-2xl border px-3 py-2 text-left text-sm transition-all active:scale-[0.98]",
                  mine ? "border-primary/60" : "border-border",
                )}>
                <span className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500"
                  style={{ width: `${pct}%` }} />
                <span className="relative flex items-center justify-between">
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{pct}%</span>
                </span>
              </button>
            );
          })}
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <BarChart3 className="h-3 w-3" /> {totalVotes} votes
          </div>
        </div>
      )}

      {post.quoted && (
        <div className="relative mt-3 rounded-2xl border border-border/70 p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Quote className="h-3 w-3" />
            {post.quoted.author?.full_name || post.quoted.author?.username || "member"}
          </div>
          <p className="mt-1 line-clamp-4 text-sm">{post.quoted.body}</p>
        </div>
      )}

      <footer className="relative mt-3 flex items-center justify-between text-muted-foreground">
        <button onClick={() => onLike(post)} aria-label="Like"
          className={cn("flex items-center gap-1.5 text-xs transition-transform active:scale-90", post.liked && "text-primary")}>
          <Heart className={cn("h-[18px] w-[18px]", post.liked && "fill-current")} /> {post.like_count || ""}
        </button>
        <button onClick={() => setSheet("comments")} aria-label="Comments"
          className="flex items-center gap-1.5 text-xs transition-transform active:scale-90">
          <MessageCircle className="h-[18px] w-[18px]" /> {post.reply_count || ""}
        </button>
        <button onClick={() => setSheet("reshare")} aria-label="Reshare"
          className="flex items-center gap-1.5 text-xs transition-transform active:scale-90">
          <Repeat2 className="h-[18px] w-[18px]" /> {post.repost_count || ""}
        </button>
        <button onClick={() => onQuote(post)} aria-label="Quote"
          className="flex items-center gap-1.5 text-xs transition-transform active:scale-90">
          <Quote className="h-[18px] w-[18px]" />
        </button>
        <button onClick={() => onBookmark(post)} aria-label="Bookmark"
          className={cn("transition-transform active:scale-90", post.bookmarked && "text-primary")}>
          <Bookmark className={cn("h-[18px] w-[18px]", post.bookmarked && "fill-current")} />
        </button>
        <button
          aria-label="Share"
          onClick={() => {
            const url = `${window.location.origin}/orbit/${post.id}`;
            if (navigator.share) navigator.share({ url, text: post.body ?? "Samsta Orbit" }).catch(() => {});
            else setSheet("reshare");
          }}
          className="transition-transform active:scale-90">
          <Share2 className="h-[18px] w-[18px]" />
        </button>
      </footer>

      <OrbitCommentsSheet open={sheet === "comments"} onClose={() => setSheet(null)} post={post} meId={meId} />
      <OrbitReshareSheet open={sheet === "reshare"} onClose={() => setSheet(null)} post={post} meId={meId}
        onQuote={() => onQuote(post)} />
    </article>

  );
});