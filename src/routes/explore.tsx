// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Compass, Film, Hash, TrendingUp, Flame, Search, Sparkles, Users, Radio,
  Mic, Camera, MessageSquareText, Play, Crown, Zap, Lock, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { getExplore, getTrendingHashtags } from "@/lib/api/explore";
import { searchProfiles } from "@/lib/api/social";


export const Route = createFileRoute("/explore")({
  component: DiscoverPage,
  head: () => ({
    meta: [
      { title: "Discover · culture, creators & communities on Samsta" },
      { name: "description", content: "Discover viral reels, photo drops, threads and interest communities on Samsta — ranked live by what the world is watching right now." },
      { property: "og:title", content: "Discover · Samsta" },
      { property: "og:description", content: "Viral reels, photo drops, threads and interest communities, ranked live." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/explore" },
    ],
    links: [{ rel: "canonical", href: "/explore" }],
  }),
});

const SIGN_TTL = 60 * 60;

/** Non-academic interest universe. Each lane matches captions/hashtags. */
const LANES = [
  { key: "all", label: "For you", match: [] as string[], tint: "oklch(0.88 0.10 300)" },
  { key: "memes", label: "Memes", match: ["meme", "funny", "lol"], tint: "oklch(0.88 0.12 90)" },
  { key: "travel", label: "Travel", match: ["travel", "trip", "wanderlust"], tint: "oklch(0.86 0.10 220)" },
  { key: "food", label: "Food", match: ["food", "recipe", "foodie"], tint: "oklch(0.86 0.12 60)" },
  { key: "fitness", label: "Fitness", match: ["fitness", "gym", "workout"], tint: "oklch(0.86 0.12 150)" },
  { key: "fashion", label: "Fashion", match: ["fashion", "ootd", "style"], tint: "oklch(0.86 0.12 350)" },
  { key: "photo", label: "Photography", match: ["photo", "photography", "shot"], tint: "oklch(0.85 0.08 260)" },
  { key: "gaming", label: "Gaming", match: ["gaming", "game", "esports"], tint: "oklch(0.84 0.12 280)" },
  { key: "music", label: "Music", match: ["music", "song", "beats"], tint: "oklch(0.85 0.12 320)" },
  { key: "film", label: "Movies & TV", match: ["movie", "film", "series"], tint: "oklch(0.84 0.10 20)" },
  { key: "sports", label: "Sports", match: ["sport", "football", "cricket"], tint: "oklch(0.86 0.12 140)" },
  { key: "startup", label: "Startups", match: ["startup", "founder", "business"], tint: "oklch(0.86 0.10 240)" },
  { key: "pets", label: "Pets", match: ["pet", "dog", "cat"], tint: "oklch(0.88 0.10 70)" },
  { key: "auto", label: "Auto", match: ["car", "auto", "bike"], tint: "oklch(0.83 0.10 250)" },
  { key: "home", label: "Interiors", match: ["home", "interior", "decor"], tint: "oklch(0.88 0.07 120)" },
  { key: "art", label: "Art & Design", match: ["art", "design", "sketch"], tint: "oklch(0.86 0.12 330)" },
];

const CREATE_LANES = [
  { icon: MessageSquareText, label: "Thread", tint: "oklch(0.80 0.11 250)" },
  { icon: Camera, label: "Photo", tint: "oklch(0.82 0.12 330)" },
  { icon: Play, label: "Reel", tint: "oklch(0.82 0.13 20)" },
  { icon: Mic, label: "Voice", tint: "oklch(0.82 0.12 150)" },
];

const GRADIENTS = [
  "linear-gradient(135deg, oklch(0.75 0.14 20), oklch(0.70 0.16 340))",
  "linear-gradient(135deg, oklch(0.72 0.14 280), oklch(0.68 0.15 240))",
  "linear-gradient(135deg, oklch(0.75 0.13 160), oklch(0.70 0.14 200))",
  "linear-gradient(135deg, oklch(0.78 0.12 80), oklch(0.74 0.13 50))",
  "linear-gradient(135deg, oklch(0.73 0.14 220), oklch(0.69 0.15 200))",
  "linear-gradient(135deg, oklch(0.76 0.12 30), oklch(0.72 0.13 10))",
];

async function signItems(items: { media_first: any }[]) {
  const byBucket = new Map<string, string[]>();
  for (const it of items) {
    const m = it.media_first;
    if (!m?.path) continue;
    const bucket = m.bucket || (m.type === "video" ? "reels" : "posts");
    const list = byBucket.get(bucket) ?? [];
    list.push(m.path);
    byBucket.set(bucket, list);
  }
  const map: Record<string, string> = {};
  await Promise.all(
    [...byBucket].map(async ([bucket, paths]) => {
      const { data } = await supabase.storage.from(bucket).createSignedUrls([...new Set(paths)], SIGN_TTL);
      for (const d of data ?? []) if (d.path && d.signedUrl) map[`${bucket}::${d.path}`] = d.signedUrl;
    }),
  );
  return map;
}

type Tab = "foryou" | "viral" | "vibes" | "circles";

function DiscoverPage() {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("foryou");
  const [lane, setLane] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [closing, setClosing] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  // Tap anywhere outside the search input / results → clear + close (never on results).
  useEffect(() => {
    if (!q.trim()) return;
    const onDown = (e: Event) => {
      const el = e.target as Node | null;
      if (el && searchRef.current?.contains(el)) return;
      setClosing(true);
      inputRef.current?.blur();
      window.setTimeout(() => {
        setQ("");
        setClosing(false);
      }, 180);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [q]);


  const peopleQ = useQuery({
    queryKey: ["explore-people", debouncedQ],
    queryFn: () => searchProfiles(debouncedQ, 12),
    enabled: debouncedQ.length > 0,
    staleTime: 15_000,
  });
  const people = peopleQ.data ?? [];


  const exploreQ = useQuery({
    queryKey: ["explore", user?.id ?? "anon"],
    queryFn: () => getExplore(user?.id),
    staleTime: 30_000,
  });

  const tagsQ = useQuery({ queryKey: ["explore-tags"], queryFn: getTrendingHashtags, staleTime: 60_000 });

  const urlsQ = useQuery({
    queryKey: ["explore-urls", exploreQ.data?.map((i) => i.id).join(",")],
    queryFn: () => signItems(exploreQ.data ?? []),
    enabled: !!exploreQ.data?.length,
  });

  const items = useMemo(() => {
    let list = exploreQ.data ?? [];
    const laneDef = LANES.find((l) => l.key === lane);
    if (laneDef?.match.length) {
      list = list.filter((i) => {
        const c = (i.caption ?? "").toLowerCase();
        return laneDef.match.some((m) => c.includes(m));
      });
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((i) => (i.caption ?? "").toLowerCase().includes(s));
    }
    if (tab === "vibes") list = list.filter((i) => i.kind === "reel");
    if (tab === "viral") list = [...list].sort((a, b) => b.score - a.score);
    return list;
  }, [exploreQ.data, lane, q, tab]);

  useEffect(() => {
    const ch = supabase
      .channel("explore-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () =>
        qc.invalidateQueries({ queryKey: ["explore"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, () =>
        qc.invalidateQueries({ queryKey: ["explore"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const url = (item: any) => {
    const m = item.media_first;
    if (!m?.path) return undefined;
    const bucket = m.bucket || (m.type === "video" ? "reels" : "posts");
    return urlsQ.data?.[`${bucket}::${m.path}`];
  };

  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background:
          "radial-gradient(1100px 620px at 10% -12%, oklch(0.93 0.07 320 / 0.55), transparent 62%), radial-gradient(880px 480px at 110% 4%, oklch(0.93 0.07 220 / 0.5), transparent 60%), var(--background)",
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 pb-3 pt-4 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.80 0.13 320), oklch(0.80 0.13 30))" }}>
            <Compass className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-xl italic leading-tight">Discover</h1>
            <p className="text-[11px] leading-tight text-muted-foreground">Culture, creators & circles — live</p>
          </div>
          <Link to="/reels" className="glass flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium">
            <Zap className="h-3.5 w-3.5" /> Vibes
          </Link>
        </div>

        {/* AI search */}
        <div className="relative" ref={searchRef}>
          <div className="glass mt-3 flex items-center gap-2 rounded-2xl px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) navigate({ to: "/search" }); }}
              placeholder="Search"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Sparkles className="h-4 w-4 opacity-60" />
          </div>

          {/* People results — tap opens that member's profile (view-only) */}
          {!!q.trim() && (
            <div
              className={`absolute left-0 right-0 top-full z-40 mt-3 max-h-[28rem] overflow-hidden rounded-3xl border border-border/40 bg-background/98 shadow-2xl transition-all duration-200 ${closing ? "pointer-events-none scale-95 opacity-0" : "animate-scale-in opacity-100"}`}
              style={{ transformOrigin: "top center" }}
            >

              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-2.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> People
                </span>
                {!peopleQ.isLoading && people.length > 0 && (
                  <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {people.length}
                  </span>
                )}
              </div>

              <div className="max-h-[22rem] overflow-y-auto p-2">
                {peopleQ.isLoading && (
                  <div className="space-y-2 p-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-2xl px-3 py-2.5"
                      >
                        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-muted" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
                          <div className="h-2.5 w-20 animate-pulse rounded-full bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!peopleQ.isLoading && !people.length && (
                  <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
                      <Search className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="mt-3 text-sm font-medium">No members found</p>
                    <p className="max-w-[16rem] text-[11px] leading-relaxed text-muted-foreground">
                      Try a different name or username. People with private profiles appear only to approved followers.
                    </p>
                  </div>
                )}

                {people.map((p: any, i: number) => {
                  const initial = (p.username ?? p.full_name ?? "?").charAt(0).toUpperCase();
                  const gradient = GRADIENTS[i % GRADIENTS.length];
                  return (
                    <Link
                      key={p.id}
                      to="/profile/$userId"
                      params={{ userId: p.id }}
                      onClick={() => setQ("")}
                      className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl px-3 py-2.5 transition-all duration-300 active:scale-[0.98] hover:bg-foreground/[0.04] animate-fade-in"
                      style={{ animationDelay: `${i * 45}ms` }}
                    >
                      {/* subtle hover glow */}
                      <span
                        aria-hidden
                        className="absolute -left-8 -top-8 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-60"
                        style={{ background: gradient }}
                      />

                      {/* Avatar */}
                      <span className="relative shrink-0">
                        <span
                          className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-white/60 shadow-sm transition-shadow duration-300 group-hover:ring-primary/30"
                        >
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt={p.username ?? "Member"}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = "none";
                                const fallback = target.nextElementSibling as HTMLElement | null;
                                if (fallback) fallback.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <span
                            className="h-full w-full items-center justify-center text-sm font-bold text-white"
                            style={{ background: gradient, display: p.avatar_url ? "none" : "flex" }}
                          >
                            {initial}
                          </span>
                        </span>
                        {p.is_verified && (
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[8px] text-white shadow-sm"
                            style={{ background: "linear-gradient(135deg, oklch(0.70 0.14 85), oklch(0.75 0.12 55))" }}>
                            <Crown className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </span>

                      {/* Text */}
                      <span className="relative min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-[13px] font-semibold">
                          <span className="truncate">{p.username ?? "member"}</span>
                          {p.is_verified && (
                            <span className="hidden rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white sm:inline-block"
                              style={{ background: "linear-gradient(135deg, oklch(0.70 0.14 85), oklch(0.75 0.12 55))" }}>
                              Verified
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                          <span className="truncate">{p.full_name ?? ""}</span>
                          {p.is_private && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-foreground/5 px-1.5 py-0.5 text-[9px] font-medium">
                              <Lock className="h-2.5 w-2.5" /> Private
                            </span>
                          )}
                        </span>
                      </span>

                      {/* View action */}
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground transition-all duration-300 group-hover:bg-foreground group-hover:text-background group-hover:scale-110 group-hover:shadow-md">
                        <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Footer hint */}
              {!peopleQ.isLoading && people.length > 0 && (
                <div className="border-t border-border/40 px-4 py-2 text-center text-[10px] text-muted-foreground animate-fade-in">
                  Tap a member to preview their public profile.
                </div>
              )}
            </div>
          )}
        </div>


        {/* Tabs */}
        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
          {([
            { k: "foryou", label: "For you", I: Sparkles },
            { k: "viral", label: "Viral", I: Flame },
            { k: "vibes", label: "Vibes", I: Film },
            { k: "circles", label: "Circles", I: Users },
          ] as const).map(({ k, label, I }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-300 ${
                tab === k ? "bg-foreground text-background shadow-md" : "glass text-muted-foreground"
              }`}
            >
              <I className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </header>

      {/* Interest lanes */}
      {tab !== "circles" && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 pt-1">
          {LANES.map((l) => (
            <button
              key={l.key}
              onClick={() => setLane(l.key)}
              className={`relative shrink-0 overflow-hidden rounded-full px-3 py-1.5 text-[11px] font-medium transition-transform active:scale-95 ${
                lane === l.key ? "text-background" : "glass text-foreground/80"
              }`}
              style={lane === l.key ? { background: "var(--foreground)" } : undefined}
            >
              {lane !== l.key && (
                <span aria-hidden className="absolute -right-4 -top-4 h-10 w-10 rounded-full opacity-70 blur-xl"
                  style={{ background: l.tint }} />
              )}
              <span className="relative">{l.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Create shortcuts */}
      <div className="flex gap-2 px-4 pb-3 pt-1">
        {CREATE_LANES.map(({ icon: I, label, tint }, i) => (
          <Link
            key={label}
            to="/create"
            className="glass relative flex flex-1 flex-col items-center gap-1 overflow-hidden rounded-2xl py-2.5 transition-transform active:scale-95 animate-fade-up"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <span aria-hidden className="absolute -top-6 h-12 w-12 rounded-full opacity-70 blur-xl" style={{ background: tint }} />
            <I className="relative h-4 w-4" />
            <span className="relative text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>

      {tab === "circles" ? (
        <Circles tags={tagsQ.data ?? []} onPick={(t) => { setQ(t); setTab("foryou"); }} />
      ) : (
        <div className="px-4">
          {/* Trending topics */}
          {!!tagsQ.data?.length && (
            <div className="mb-3 flex items-center gap-2 overflow-x-auto">
              <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Today
              </span>
              {tagsQ.data.slice(0, 12).map((t) => (
                <button key={t.tag} onClick={() => setQ(`#${t.tag}`)}
                  className="glass shrink-0 rounded-full px-2.5 py-1 text-[11px]">
                  <Hash className="mr-0.5 inline h-3 w-3 opacity-60" />{t.tag}
                </button>
              ))}
            </div>
          )}

          {exploreQ.isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="mt-20 text-center text-sm text-muted-foreground">
              <Radio className="mx-auto mb-2 h-8 w-8 opacity-40" />
              Nothing here yet — be the first to post this vibe.
            </div>
          ) : (
            <div className="columns-2 gap-2 [column-fill:_balance]">
              {items.map((item, idx) => {
                const src = url(item);
                const tall = idx % 5 === 1 || item.kind === "reel";
                return (
                  <Link
                    key={item.id}
                    to={item.kind === "reel" ? "/reels" : "/profile/$userId"}
                    params={item.kind === "reel" ? undefined : { userId: item.user_id }}
                    search={item.kind === "reel" ? undefined : ({ post: item.id } as any)}
                    className="group relative mb-2 block break-inside-avoid overflow-hidden rounded-2xl bg-muted shadow-sm transition-transform duration-300 active:scale-[0.98] animate-fade-up"
                    style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }}
                  >
                    <div className={tall ? "aspect-[9/14]" : "aspect-square"}>
                      {src ? (
                        item.media_first?.type === "video" ? (
                          <video src={src} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        ) : (
                          <img src={src} alt={item.caption ?? "Samsta post"} loading="lazy" decoding="async"
                            className="h-full w-full object-cover" />
                        )
                      ) : (
                        <div className="h-full w-full animate-pulse bg-muted" />
                      )}
                    </div>
                    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5"
                      style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)" }} />
                    {item.kind === "reel" && (
                      <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/45 px-1.5 py-0.5 backdrop-blur">
                        <Film className="h-3 w-3 text-white" />
                      </span>
                    )}
                    {tab === "viral" && idx < 3 && (
                      <span className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white backdrop-blur"
                        style={{ background: "linear-gradient(135deg, oklch(0.65 0.18 20), oklch(0.60 0.16 350))" }}>
                        <Crown className="h-3 w-3" /> #{idx + 1}
                      </span>
                    )}
                    {item.caption && (
                      <span className="absolute inset-x-2 bottom-1.5 line-clamp-1 text-[10px] text-white/90">
                        {item.caption}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Circles({ tags, onPick }: { tags: Array<{ tag: string; count: number }>; onPick: (t: string) => void }) {
  if (!tags.length) {
    return (
      <div className="mt-20 text-center text-sm text-muted-foreground">
        <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
        Circles form around hashtags — post one to start yours.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {tags.map((t, i) => (
        <button
          key={t.tag}
          onClick={() => onPick(`#${t.tag}`)}
          className="glass relative overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.97] animate-fade-up"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <span aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
            style={{ background: LANES[(i % (LANES.length - 1)) + 1].tint }} />
          <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-md"
            style={{ background: "linear-gradient(135deg, oklch(0.80 0.12 300), oklch(0.80 0.12 30))" }}>
            <Hash className="h-4 w-4" />
          </div>
          <div className="relative mt-2 font-display text-base italic leading-tight">#{t.tag}</div>
          <div className="relative text-[10px] text-muted-foreground">{t.count} posts this week</div>
        </button>
      ))}
    </div>
  );
}
