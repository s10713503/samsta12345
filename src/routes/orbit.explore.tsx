// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Flame, Users2, Play, Mic, Hash, Newspaper, Star, Rocket, MapPin,
  CalendarDays, Trophy, Briefcase, GraduationCap, Palette, Music4, Bot, Globe2, TrendingUp, Eye, X, Image as ImageIcon,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { cn } from "@/lib/utils";
import { listOrbit, listTopics, listCommunities, searchOrbit } from "@/lib/api/orbit";
import { orbitSuggestions } from "@/lib/api/orbit-identity";
import { NewsDeskSheet } from "@/components/samsta/NewsDeskSheet";

export const Route = createFileRoute("/orbit/explore")({
  component: OrbitExplore,
  head: () => ({
    meta: [
      { title: "Explore — Discover on Samsta Orbit" },
      { name: "description", content: "A discovery engine for Samsta Orbit: trending posts, suggested creators, viral reels, podcasts, communities, hashtags, news and collections." },
      { property: "og:title", content: "Explore — Discover on Samsta Orbit" },
      { property: "og:description", content: "Find new creators, viral reels, podcasts, communities and global trends inside Samsta Orbit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const SCOPES = ["People", "Posts", "Reels", "Communities", "Podcasts", "Hashtags", "Topics", "Businesses", "Jobs", "Events"];

const NEWS = [
  { label: "Technology", accent: "oklch(0.78 0.13 250)" },
  { label: "Business", accent: "oklch(0.8 0.12 90)" },
  { label: "AI", accent: "oklch(0.74 0.15 300)" },
  { label: "Science", accent: "oklch(0.78 0.13 195)" },
  { label: "Education", accent: "oklch(0.8 0.12 150)" },
  { label: "Gaming", accent: "oklch(0.72 0.16 330)" },
  { label: "Movies", accent: "oklch(0.76 0.14 30)" },
  { label: "Sports", accent: "oklch(0.78 0.14 130)" },
];


function Section({ icon: Icon, title, hint, children }: any) {
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center gap-2 px-4">
        <Icon className="h-4 w-4 shrink-0 text-primary" />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
        {hint && <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

const Rail = ({ children }: any) => (
  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
);

function OrbitExplore() {
  const { user } = useAuthUser();
  const uid = user?.id ?? null;
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState("Posts");
  const [desk, setDesk] = useState<any>(null);


  const { data: trending } = useQuery({ queryKey: ["ex-trending", uid], queryFn: () => listOrbit({ lane: "trending", userId: uid }), staleTime: 30_000 });
  const { data: viral } = useQuery({ queryKey: ["ex-viral", uid], queryFn: () => listOrbit({ lane: "viral", userId: uid }), staleTime: 30_000 });
  const { data: pods } = useQuery({ queryKey: ["ex-pods", uid], queryFn: () => listOrbit({ lane: "podcasts", userId: uid }), staleTime: 60_000 });
  const { data: topics = [] } = useQuery({ queryKey: ["ex-topics"], queryFn: () => listTopics(20), staleTime: 60_000 });
  const { data: communities = [] } = useQuery({ queryKey: ["ex-communities"], queryFn: listCommunities, staleTime: 60_000 });
  const { data: people = [] } = useQuery({ queryKey: ["ex-people", uid], queryFn: () => orbitSuggestions(uid, 14), staleTime: 60_000 });
  const { data: results = [] } = useQuery({
    queryKey: ["ex-search", term, uid],
    queryFn: () => searchOrbit(term, uid),
    enabled: term.trim().length > 1,
  });

  const searching = term.trim().length > 1;
  const top100 = useMemo(() => (trending?.items ?? []).slice(0, 100), [trending]);
  const reels = useMemo(() => (viral?.items ?? []).filter((p: any) => p.kind === "video" && p.media_url), [viral]);
  const photos = useMemo(() => (viral?.items ?? []).filter((p: any) => p.kind === "image" && p.media_url), [viral]);
  const rising = useMemo(() => [...people].slice().reverse().slice(0, 8), [people]);

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title="Explore" subtitle="Discovery engine · new creators, trends & communities" />

      {/* discovery search */}
      <div className="relative mt-3 px-4">
        <div className="glass-strong flex items-center gap-2 rounded-full px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Discover people, reels, communities, podcasts, jobs…"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SCOPES.map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all active:scale-95",
                scope === s ? "bg-foreground text-background" : "glass text-muted-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {searching ? (
        <Section icon={Search} title={`Results in ${scope}`} hint={`${results.length} found`}>
          <div className="grid grid-cols-1 gap-3 px-4">
            {!results.length && (
              <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">No discoveries for “{term}” yet.</div>
            )}
            {results.map((p: any) => (
              <Link key={p.id} to="/orbit/$postId" params={{ postId: p.id }} className="glass rounded-3xl p-4 active:scale-[0.99]">
                <p className="text-[11px] text-muted-foreground">@{p.author?.username ?? "orbiter"}</p>
                <p className="mt-1 line-clamp-3 text-sm">{p.body ?? p.title ?? "Media post"}</p>
              </Link>
            ))}
          </div>
        </Section>
      ) : (
        <>
          {/* discover banner */}
          <div className="mt-4 px-4">
            <div className="glass-strong relative overflow-hidden rounded-[28px] p-5">
              <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-70 blur-3xl animate-aurora"
                style={{ background: "radial-gradient(circle, oklch(0.76 0.15 300 / 0.75), transparent 70%)" }} />
              <p className="relative text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Global discovery</p>
              <h2 className="relative mt-1 font-display text-2xl italic leading-tight">What the Orbit is talking about</h2>
              <p className="relative mt-1 text-xs text-muted-foreground">Fresh creators, viral reels and communities — none of your own timeline.</p>
            </div>
          </div>

          {/* 🔥 Trending Now — numbered magazine cards */}
          <Section icon={Flame} title="Trending Now" hint="Top 100 worldwide">
            <Rail>
              {top100.map((p: any, i: number) => (
                <Link key={p.id} to="/orbit/$postId" params={{ postId: p.id }}
                  className="glass relative w-64 shrink-0 snap-start overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.98]">
                  <span className="absolute right-3 top-2 font-display text-4xl italic opacity-15">{i + 1}</span>
                  <p className="text-[11px] font-semibold text-primary">#{i + 1} trending</p>
                  <p className="mt-1.5 line-clamp-4 text-sm leading-snug">{p.body ?? p.title ?? "Media post"}</p>
                  <div className="mt-3 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{Math.round(p.hot_score ?? 0)}</span>
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{p.like_count + p.reply_count}</span>
                    <span className="truncate">@{p.author?.username ?? "orbiter"}</span>
                  </div>
                </Link>
              ))}
              {!top100.length && <div className="glass w-full rounded-3xl p-6 text-center text-sm text-muted-foreground">Trends are still forming.</div>}
            </Rail>
          </Section>

          {/* 👤 Suggested Creators — large creator cards */}
          <Section icon={Users2} title="Suggested Creators" hint="Not yet in your orbit">
            <Rail>
              {people.map((p: any) => (
                <div key={p.id} className="glass relative w-52 shrink-0 snap-start overflow-hidden rounded-3xl">
                  <div className="h-16 w-full" style={{ background: "linear-gradient(135deg, oklch(0.78 0.12 260), oklch(0.74 0.14 305))" }}>
                    {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="-mt-7 px-4 pb-4">
                    <div className="h-14 w-14 overflow-hidden rounded-full bg-muted ring-2 ring-background">
                      {p.avatar_url && <img src={p.avatar_url} alt={p.display_name} className="h-full w-full object-cover" loading="lazy" />}
                    </div>
                    <p className="mt-2 truncate text-sm font-semibold">{p.display_name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">@{p.username}</p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{p.bio ?? p.profession ?? "Orbit creator"}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground">{p.follower_count ?? 0} orbiters · rep {Math.round(p.reputation_score ?? 0)}</p>
                  </div>
                </div>
              ))}
              {!people.length && <div className="glass w-full rounded-3xl p-6 text-center text-sm text-muted-foreground">No creator suggestions yet.</div>}
            </Rail>
          </Section>

          {/* 🖼 Viral Photos — only when photos exist */}
          {photos.length > 0 && (
            <Section icon={ImageIcon} title="Viral Photos" hint="Most viewed today">
              <Rail>
                {photos.map((p: any) => (
                  <Link key={p.id} to="/orbit/$postId" params={{ postId: p.id }}
                    className="relative w-36 shrink-0 snap-start overflow-hidden rounded-3xl bg-black active:scale-[0.98]">
                    <div className="aspect-[9/16] w-full">
                      <img src={p.media_url} alt={p.title ?? "Photo"} className="h-full w-full object-contain" loading="lazy" />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                      <p className="line-clamp-2 text-[11px] font-medium text-white">{p.title ?? p.body ?? "Photo"}</p>
                    </div>
                  </Link>
                ))}
              </Rail>
            </Section>
          )}

          {/* 🎬 Viral Reels — only when real reels exist */}
          {reels.length > 0 && (
            <Section icon={Play} title="Viral Reels" hint="Most watched today">
              <Rail>
                {reels.map((p: any) => (
                  <Link key={p.id} to="/orbit/reels" className="relative w-36 shrink-0 snap-start overflow-hidden rounded-3xl bg-black active:scale-[0.98]">
                    <div className="aspect-[9/16] w-full">
                      {p.poster_url ? (
                        <img src={p.poster_url} alt={p.title ?? "Reel"} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <video src={p.media_url} muted playsInline preload="metadata" className="h-full w-full object-contain" />
                      )}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5">
                      <p className="line-clamp-2 text-[11px] font-medium text-white">{p.title ?? p.body ?? "Reel"}</p>
                    </div>
                    <span className="glass-strong absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full"><Play className="h-3 w-3" /></span>
                  </Link>
                ))}
              </Rail>
            </Section>
          )}

          {/* 🎙 Trending Podcasts — only when podcasts exist */}
          {(pods?.items ?? []).length > 0 && (
            <Section icon={Mic} title="Trending Podcasts" hint="Voice & long-form">
              <Rail>
                {(pods?.items ?? []).map((p: any) => (
                  <Link key={p.id} to="/orbit/$postId" params={{ postId: p.id }} className="glass w-60 shrink-0 snap-start rounded-3xl p-4 active:scale-[0.98]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white"
                        style={{ background: "linear-gradient(135deg, oklch(0.74 0.14 300), oklch(0.78 0.12 210))" }}>
                        <Mic className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.title ?? "Orbit episode"}</p>
                        <p className="truncate text-[11px] text-muted-foreground">@{p.author?.username ?? "orbiter"}</p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">{p.body ?? "Listen on Orbit"}</p>
                  </Link>
                ))}
              </Rail>
            </Section>
          )}

          {/* 👥 Popular Communities */}
          <Section icon={Users2} title="Popular Communities" hint="Join a circle">
            <div className="grid grid-cols-2 gap-3 px-4">
              {communities.map((c: any) => (
                <Link key={c.id} to="/orbit/c/$slug" params={{ slug: c.slug }}
                  className="glass relative overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.98]">
                  <span aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-60 blur-2xl"
                    style={{ background: c.accent ?? "oklch(0.8 0.12 290)" }} />
                  <p className="relative truncate text-sm font-semibold">{c.name}</p>
                  <p className="relative line-clamp-2 text-[11px] text-muted-foreground">{c.description ?? "Orbit community"}</p>
                  <p className="relative mt-2 text-[10px] text-muted-foreground">{c.member_count} orbiting</p>
                </Link>
              ))}
              {!communities.length && <div className="glass col-span-2 rounded-3xl p-6 text-center text-sm text-muted-foreground">No communities yet.</div>}
            </div>
          </Section>

          {/* 🏷 Trending Hashtags */}
          <Section icon={Hash} title="Trending Hashtags" hint="Live counts">
            <div className="flex flex-wrap gap-2 px-4">
              {topics.map((t: any) => (
                <span key={t.id} className="glass rounded-full px-3 py-1.5 text-[11px]">
                  #{t.label} <span className="text-muted-foreground">{t.post_count ?? 0}</span>
                </span>
              ))}
              {!topics.length && <span className="text-xs text-muted-foreground">Hashtags will appear as Orbit grows.</span>}
            </div>
          </Section>

          {/* 📰 News desks */}
          <Section icon={Newspaper} title="News Desks" hint="8 desks">
            <div className="grid grid-cols-2 gap-3 px-4">
              {NEWS.map((n) => (
                <button
                  key={n.label}
                  onClick={() => setDesk(n)}
                  className="glass relative overflow-hidden rounded-3xl p-4 text-left transition-transform hover:scale-[1.02] active:scale-[0.97]"
                >
                  <span aria-hidden className="absolute -bottom-8 -left-6 h-24 w-24 rounded-full opacity-50 blur-2xl" style={{ background: n.accent }} />
                  <p className="relative text-sm font-semibold">{n.label}</p>
                  <p className="relative text-[11px] text-muted-foreground">Top Stories Today</p>
                </button>
              ))}
            </div>
          </Section>


          {/* 🚀 Rising Creators */}
          <Section icon={Rocket} title="Rising Creators" hint="Momentum this week">
            <Rail>
              {rising.map((p: any) => (
                <div key={`r_${p.id}`} className="glass flex w-44 shrink-0 snap-start items-center gap-3 rounded-3xl p-3">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.avatar_url && <img src={p.avatar_url} alt={p.display_name} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{p.display_name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">@{p.username}</p>
                  </div>
                </div>
              ))}
              {!rising.length && <div className="glass w-full rounded-3xl p-6 text-center text-sm text-muted-foreground">Nobody rising yet.</div>}
            </Rail>
          </Section>

        </>
      )}

      {desk && <NewsDeskSheet desk={desk} uid={uid} onClose={() => setDesk(null)} />}
    </div>
  );
}
