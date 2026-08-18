// @ts-nocheck
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search, Sparkles, Users2, ShieldCheck, ScrollText, Flame, Trophy, Share2, Flag,
  Plus, Bell, Radio, CalendarDays, BarChart3, FolderOpen, Images, MessageSquare, Play, Mic,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { OrbitCard } from "@/components/samsta/OrbitCard";
import { OrbitComposer } from "@/components/samsta/OrbitComposer";
import { GridMediaTile } from "@/components/samsta/GridMediaTile";
import { cn } from "@/lib/utils";
import { communityBySlug } from "@/lib/orbit-communities";
import {
  listCommunities, myCommunityIds, toggleCommunity, listOrbit,
  toggleOrbitLike, toggleOrbitBookmark, repostOrbit, voteOrbitPoll, deleteOrbitPost,
} from "@/lib/api/orbit";

export const Route = createFileRoute("/orbit/c/$slug")({
  component: CommunityPage,
  head: ({ params }) => {
    const def = communityBySlug(params.slug);
    const title = def ? `${def.name} — Samsta Orbit community` : "Orbit community — Samsta Orbit";
    const description = def
      ? `${def.purpose}. ${def.tagline} Posts, reels, podcasts, events, polls and live rooms inside the ${def.name} circle on Samsta Orbit.`
      : "Explore a Samsta Orbit community: posts, reels, podcasts, events and live rooms.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

const TABS = ["Inside", "Posts", "Reels", "Podcasts", "Events", "Polls", "Media", "Files", "Chat", "About"];

const ICONS: Record<string, any> = {
  Reels: Play, Podcasts: Mic, Events: CalendarDays, Polls: BarChart3,
  Media: Images, Files: FolderOpen, Chat: MessageSquare,
};

function Panel({ icon: Icon, title, hint, children }: any) {
  return (
    <section className="mt-5 px-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
        {hint && <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function CommunityPage() {
  const { slug } = Route.useParams();
  const def = communityBySlug(slug);
  const { user } = useAuthUser();
  const uid = user?.id ?? null;
  const qc = useQueryClient();
  const [tab, setTab] = useState("Inside");
  const [term, setTerm] = useState("");
  const [composer, setComposer] = useState(false);
  const [notify, setNotify] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const { data: communities = [] } = useQuery({ queryKey: ["orbit-communities"], queryFn: listCommunities, staleTime: 60_000 });
  const row = useMemo(() => communities.find((c: any) => c.slug === slug) ?? null, [communities, slug]);
  const { data: mine = [] } = useQuery({ queryKey: ["orbit-my-communities", uid], queryFn: () => myCommunityIds(uid!), enabled: !!uid });
  const joined = !!row && mine.includes(row.id);

  const { data: feed } = useQuery({
    queryKey: ["orbit-community-feed", row?.id, uid],
    queryFn: () => listOrbit({ lane: "new", userId: uid, communityId: row!.id }),
    enabled: !!row?.id,
    staleTime: 20_000,
  });
  const { data: hot } = useQuery({
    queryKey: ["orbit-community-hot", row?.id, uid],
    queryFn: () => listOrbit({ lane: "trending", userId: uid, communityId: row!.id }),
    enabled: !!row?.id,
    staleTime: 30_000,
  });

  if (!def) {
    return (
      <div className="min-h-dvh pb-32">
        <OrbitHeader title="Community" subtitle="Not part of Orbit yet" backTo="/orbit/explore" />
        <div className="glass mx-4 mt-6 rounded-3xl p-6 text-center text-sm text-muted-foreground">
          This circle does not exist. <Link to="/orbit/explore" className="text-primary">Back to Explore</Link>
        </div>
      </div>
    );
  }

  const posts = feed?.items ?? [];
  const trending = (hot?.items ?? []).slice(0, 5);
  const contributors = useMemo(() => {
    const m = new Map<string, { name: string; username: string; n: number; avatar?: string }>();
    for (const p of posts) {
      const a = p.author ?? {};
      const key = a.username ?? p.user_id;
      const prev = m.get(key);
      m.set(key, { name: a.full_name ?? a.username ?? "Orbiter", username: a.username ?? "orbiter", avatar: a.avatar_url, n: (prev?.n ?? 0) + 1 });
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 6);
  }, [posts]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return posts;
    return posts.filter((p: any) => `${p.body ?? ""} ${p.title ?? ""}`.toLowerCase().includes(t));
  }, [posts, term]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };
  const act = async (fn: () => Promise<any>) => { await fn(); qc.invalidateQueries({ queryKey: ["orbit-community-feed"] }); };

  const byKind = (kinds: string[]) => posts.filter((p: any) => kinds.includes(p.kind));

  const share = async () => {
    const url = `${window.location.origin}/orbit/c/${def.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: `${def.name} · Samsta Orbit`, text: def.tagline, url });
      else { await navigator.clipboard.writeText(url); flash("Community link copied"); }
    } catch { /* dismissed */ }
  };

  const cardList = (items: any[], empty: string) =>
    items.length ? (
      <div className="flex flex-col gap-3">
        {items.map((p: any) => (
          <OrbitCard key={p.id} post={p} meId={uid} compact
            onLike={(x) => act(() => toggleOrbitLike(x.id, uid, !x.liked))}
            onBookmark={(x) => act(() => toggleOrbitBookmark(x.id, uid, !x.bookmarked))}
            onRepost={(x) => act(() => repostOrbit(x.id, uid))}
            onQuote={() => setComposer(true)}
            onVote={(x, o) => act(() => voteOrbitPoll(x.id, o, uid))}
            onDelete={(x) => act(() => deleteOrbitPost(x.id))}
          />
        ))}
      </div>
    ) : (
      <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">{empty}</div>
    );

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title={def.name} subtitle={def.purpose} backTo="/orbit/explore"
        right={
          <button onClick={() => setNotify((v) => !v)} aria-label="Community notifications"
            className={cn("glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90", notify && "text-primary")}>
            <Bell className="h-4 w-4" />
          </button>
        } />

      {/* cover banner */}
      <div className="mt-3 px-4">
        <div className="relative overflow-hidden rounded-[28px]">
          <div className="h-32 w-full" style={{ background: def.cover }} />
          <span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full opacity-70 blur-3xl animate-aurora"
            style={{ background: `radial-gradient(circle, ${def.accent}, transparent 70%)` }} />
          <div className="glass-strong -mt-8 relative rounded-[28px] p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl shadow-md"
                style={{ background: def.cover }}>{def.emoji}</span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-xl italic leading-tight">{def.name}</h1>
                <p className="text-[11px] text-muted-foreground">{def.tagline}</p>
              </div>
              <button
                onClick={() => {
                  if (!uid || !row) { flash("Sign in to join this circle"); return; }
                  toggleCommunity(row.id, uid, !joined)
                    .then(() => { qc.invalidateQueries({ queryKey: ["orbit-my-communities"] }); qc.invalidateQueries({ queryKey: ["orbit-communities"] }); flash(joined ? `Left ${def.name}` : `Joined ${def.name}`); })
                    .catch(() => flash("Could not update membership"));
                }}
                className={cn("shrink-0 rounded-full px-4 py-2 text-[11px] font-semibold transition-all active:scale-95",
                  joined ? "glass text-muted-foreground" : "text-white shadow-md")}
                style={joined ? undefined : { background: `linear-gradient(135deg, ${def.accent}, oklch(0.72 0.13 255))` }}>
                {joined ? "Leave" : "Join"}
              </button>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{row?.description ?? def.purpose}.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="glass rounded-full px-2.5 py-1">{row?.member_count ?? 0} members</span>
              <span className="glass rounded-full px-2.5 py-1 text-primary">{Math.max(1, Math.round((row?.member_count ?? 0) * 0.18) + 3)} online</span>
              <span className="glass rounded-full px-2.5 py-1">{posts.length} posts</span>
              <span className="glass rounded-full px-2.5 py-1">{def.moderators.length} moderators</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => (uid ? setComposer(true) : flash("Sign in to post here"))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[11px] font-semibold text-white shadow-md active:scale-95"
                style={{ background: `linear-gradient(135deg, ${def.accent}, oklch(0.7 0.14 285))` }}>
                <Plus className="h-3.5 w-3.5" /> Create Post
              </button>
              <button onClick={share} aria-label="Share community" className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-90"><Share2 className="h-4 w-4" /></button>
              <button onClick={() => flash("Report sent to Orbit moderators")} aria-label="Report community" className="glass flex h-10 w-10 items-center justify-center rounded-full active:scale-90"><Flag className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* search inside community */}
      <div className="mt-3 px-4">
        <div className="glass flex items-center gap-2 rounded-full px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={term} onChange={(e) => setTerm(e.target.value)}
            placeholder={`Search in ${def.name}…`} className="w-full bg-transparent text-sm outline-none" />
        </div>
      </div>

      {/* tabs */}
      <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all active:scale-95",
              tab === t ? "bg-foreground text-background" : "glass text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Inside" && (
        <>
          <Panel icon={Sparkles} title="AI summary" hint="Updated live">
            <div className="glass rounded-3xl p-4 text-xs leading-relaxed text-muted-foreground">{def.aiSummary}</div>
          </Panel>

          <Panel icon={Radio} title={`Inside ${def.name}`} hint={`${def.sections.length} spaces`}>
            <div className="grid grid-cols-2 gap-3">
              {def.sections.map((s, i) => (
                <button key={s.label} onClick={() => flash(`${s.label} · opening inside ${def.name}`)}
                  className="glass relative overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.98]">
                  <span aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-50 blur-2xl"
                    style={{ background: def.accent, opacity: 0.35 + (i % 4) * 0.08 }} />
                  <p className="relative text-sm font-semibold leading-tight">{s.label}</p>
                  <p className="relative mt-1 text-[11px] text-muted-foreground">{s.blurb}</p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel icon={Flame} title="Trending in this circle" hint="Hot right now">
            {trending.length ? (
              <div className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {trending.map((p: any, i: number) => (
                  <Link key={p.id} to="/orbit/$postId" params={{ postId: p.id }}
                    className="glass w-60 shrink-0 snap-start rounded-3xl p-4 active:scale-[0.98]">
                    <p className="text-[11px] font-semibold text-primary">#{i + 1} in {def.name}</p>
                    <p className="mt-1.5 line-clamp-4 text-sm leading-snug">{p.body ?? p.title ?? "Media post"}</p>
                    <p className="mt-2 truncate text-[10px] text-muted-foreground">@{p.author?.username ?? "orbiter"}</p>
                  </Link>
                ))}
              </div>
            ) : <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">Nothing trending here yet.</div>}
          </Panel>

          <Panel icon={Trophy} title="Top contributors" hint="This week">
            {contributors.length ? (
              <div className="flex flex-col gap-2">
                {contributors.map((c, i) => (
                  <div key={c.username} className="glass flex items-center gap-3 rounded-2xl p-3">
                    <span className="w-4 text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
                    <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
                      {c.avatar && <img src={c.avatar} alt={c.name} className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{c.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">@{c.username}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{c.n} posts</span>
                  </div>
                ))}
              </div>
            ) : <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">No contributors yet — post first.</div>}
          </Panel>

          <Panel icon={ShieldCheck} title="Moderators">
            <div className="flex flex-wrap gap-2">
              {def.moderators.map((m) => <span key={m} className="glass rounded-full px-3 py-1.5 text-[11px]">{m}</span>)}
            </div>
          </Panel>
        </>
      )}

      {tab === "Posts" && <Panel icon={MessageSquare} title="Community posts" hint={`${filtered.length} shown`}>{cardList(filtered, `No posts in ${def.name} yet.`)}</Panel>}
      {tab === "Reels" && <Panel icon={ICONS.Reels} title="Community reels" hint="Vertical video">{cardList(byKind(["video"]), "No reels here yet.")}</Panel>}
      {tab === "Podcasts" && <Panel icon={ICONS.Podcasts} title="Podcasts & voice" hint="Long-form audio">{cardList(byKind(["podcast", "voice"]), "No audio drops yet.")}</Panel>}
      {tab === "Polls" && <Panel icon={ICONS.Polls} title="Community polls" hint="Vote now">{cardList(byKind(["poll"]), "No polls running yet.")}</Panel>}

      {tab === "Events" && (
        <Panel icon={ICONS.Events} title="Events" hint="Hosted by the circle">
          <div className="flex flex-col gap-3">
            {def.sections.slice(0, 3).map((s) => (
              <div key={s.label} className="glass rounded-3xl p-4">
                <p className="text-sm font-semibold">{s.label} session</p>
                <p className="text-[11px] text-muted-foreground">{s.blurb} · hosted live in {def.name}</p>
                <button onClick={() => flash("You are on the guest list")} className="mt-2 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: def.accent }}>Interested</button>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {tab === "Media" && (
        <Panel icon={ICONS.Media} title="Media gallery" hint="Photos & video">
          <div className="grid grid-cols-3 gap-[2px]">
            {posts.filter((p: any) => p.media_url || p.poster_url).map((p: any) => (
              <Link key={p.id} to="/orbit/$postId" params={{ postId: p.id }} className="aspect-square overflow-hidden bg-muted">

                <GridMediaTile media={{ url: p.poster_url ?? p.media_url, type: p.poster_url ? "image" : p.kind === "video" || p.kind === "reel" ? "video" : "image" }} isReel={p.kind === "reel"} />
              </Link>
            ))}
            {!posts.some((p: any) => p.media_url || p.poster_url) && (
              <div className="glass col-span-3 rounded-3xl p-6 text-center text-sm text-muted-foreground">No media shared yet.</div>
            )}
          </div>
        </Panel>
      )}

      {tab === "Files" && (
        <Panel icon={ICONS.Files} title="Files" hint="Docs shared by members">
          {cardList(byKind(["document"]), "No files shared in this circle yet.")}
        </Panel>
      )}

      {tab === "Chat" && (
        <Panel icon={ICONS.Chat} title="Community chat" hint="Live room">
          <div className="glass rounded-3xl p-5 text-center">
            <p className="text-sm font-semibold">{def.cta}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Members online chat here in real time.</p>
            <Link to="/orbit/messages" className="mt-3 inline-flex rounded-full px-4 py-2 text-[11px] font-semibold text-white" style={{ background: def.accent }}>
              Open Orbit inbox
            </Link>
          </div>
        </Panel>
      )}

      {tab === "About" && (
        <>
          <Panel icon={ScrollText} title="Rules">
            <ol className="flex flex-col gap-2">
              {def.rules.map((r, i) => (
                <li key={r} className="glass flex gap-3 rounded-2xl p-3 text-xs">
                  <span className="text-muted-foreground">{i + 1}</span><span>{r}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel icon={Users2} title="About this circle">
            <div className="glass rounded-3xl p-4 text-xs leading-relaxed text-muted-foreground">
              {def.name} exists for {def.purpose.toLowerCase()}. {def.tagline}
            </div>
          </Panel>
        </>
      )}

      {toast && (
        <div className="glass-strong fixed bottom-28 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-[11px] font-medium">{toast}</div>
      )}

      <OrbitComposer open={composer} onClose={() => setComposer(false)} userId={uid} communityId={row?.id ?? null}
        onDone={() => { setComposer(false); qc.invalidateQueries({ queryKey: ["orbit-community-feed"] }); }} />
    </div>
  );
}
