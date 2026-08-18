// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, Users2, Sparkles, MapPin, BadgeCheck, Flame, Radio } from "lucide-react";
import { CircleShell, CircleCard, CircleAvatar } from "@/components/samsta/CircleShell";
import { listCommunities } from "@/lib/api/communities";
import { CIRCLE_CATEGORY_META, CIRCLE_GROUPS, circleMeta, verificationLabel } from "@/lib/circles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/communities/")({
  component: CirclesPage,
  head: () => {
    const title = "Samsta Circles — purpose-built communities";
    const description =
      "Discover Samsta Circles for your college, city, career, startup and interests. Join verified circles, share knowledge and grow together.";
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

function CirclesPage() {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sort, setSort] = useState<"trending" | "new" | "members">("trending");

  const { data: circles = [], isLoading } = useQuery({
    queryKey: ["communities", category, term, sort],
    queryFn: () => listCommunities({ category, term: term || null, sort }),
    staleTime: 30_000,
  });

  const featured = useMemo(() => (sort === "trending" && !category && !term ? circles.slice(0, 1)[0] : null), [circles, sort, category, term]);
  const rest = featured ? circles.slice(1) : circles;

  return (
    <CircleShell
      title="Samsta Circles"
      subtitle="Purpose-driven circles for your city, college, career and interests — organised, verified and quiet by design."
      back="/"
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-3 backdrop-blur-xl">
          <Search className="h-4 w-4 text-[#1f1b16]/45" />
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search circles, colleges, cities…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#1f1b16]/40"
          />
        </div>
        <Link
          to="/communities/new"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f7cff] to-[#e08a4a] text-white shadow-[0_10px_30px_-10px_rgba(224,138,74,0.55)] active:scale-90"
          aria-label="Create a circle"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {/* Category groups */}
      <div className="mt-6 space-y-5">
        {CIRCLE_GROUPS.map((group) => {
          const items = CIRCLE_CATEGORY_META.filter((c) => c.group === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-[10px] font-semibold tracking-[0.24em] text-[#1f1b16]/40">{group.toUpperCase()}</p>
                <div className="h-px flex-1 bg-black/10" />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {items.map((c) => {
                  const active = category === c.key;
                  return (
                    <button
                      key={c.key}
                      onClick={() => setCategory(active ? null : c.key)}
                      style={{ boxShadow: `0 18px 34px -20px ${c.glow}` }}
                      className={cn(
                        "group relative overflow-hidden rounded-2xl p-3 text-left text-[#1f1b16] transition-all duration-300 active:scale-[0.97]",
                        "bg-gradient-to-br hover:-translate-y-1",
                        c.gradient,
                        active ? "ring-2 ring-[#e08a4a]/60" : "ring-1 ring-black/[0.06]",
                      )}
                    >
                      <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-20 w-20 rounded-full bg-white/60 blur-2xl" />
                      <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,.55)_50%,transparent_65%)] bg-[length:220%_100%] animate-shimmer opacity-60" />
                      <span className={cn("relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/70 text-xl backdrop-blur-sm ring-1 ring-black/[0.05]", c.anim)}>
                        {c.emoji}
                      </span>
                      <span className="relative mt-1.5 block text-[13px] font-bold">{c.label}</span>
                      <span className="relative mt-0.5 block text-[10px] text-[#1f1b16]/55">{c.blurb}</span>
                    </button>

                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-7 flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.24em] text-[#1f1b16]/40">
          {category ? circleMeta(category).label.toUpperCase() : "ALL CIRCLES"}
        </p>
        <div className="flex gap-1.5">
          {(["trending", "new", "members"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[10px] font-medium capitalize transition active:scale-95",
                sort === s ? "bg-[#1f1b16] text-white" : "border border-black/10 bg-white/80 text-[#1f1b16]/55",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {isLoading && <CircleCard className="p-6 text-center text-sm text-[#1f1b16]/50">Loading circles…</CircleCard>}

        {!isLoading && !circles.length && (
          <CircleCard className="p-8 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-[#b25f19]" />
            <p className="mt-3 text-sm font-semibold">No circles here yet</p>
            <p className="mt-1 text-xs text-[#1f1b16]/50">Be the first to start one for your city or college.</p>
            <Link
              to="/communities/new"
              className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#e08a4a] to-[#f0a868] px-4 py-2 text-xs font-semibold"
            >
              Create a circle
            </Link>
          </CircleCard>
        )}

        {featured && <FeaturedCircle circle={featured} />}
        {rest.map((c) => <CircleRow key={c.id} circle={c} />)}
      </div>
    </CircleShell>
  );
}

function FeaturedCircle({ circle }: { circle: any }) {
  const meta = circleMeta(circle.category);
  const verified = verificationLabel(circle.verification);
  return (
    <Link to="/communities/$slug" params={{ slug: circle.slug }}>
      <CircleCard className="relative overflow-hidden p-5">
        <span className={cn("absolute inset-0 bg-gradient-to-br opacity-70", meta.gradient)} />
        <span className="relative flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#b25f19]">
          <Flame className="h-3 w-3 animate-pulse" /> TRENDING NOW
        </span>
        <div className="relative mt-3 flex items-start gap-3">
          <CircleAvatar name={circle.name} gradient={meta.gradient} size="lg" logoUrl={circle.logo_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-lg font-semibold">{circle.name}</p>
              {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#4f7cff]" />}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-[#1f1b16]/60">{circle.description || "A Samsta circle."}</p>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap items-center gap-3 text-[10px] text-[#1f1b16]/60">
          <span className="flex items-center gap-1"><Users2 className="h-3 w-3" />{circle.member_count} members</span>
          <span className="flex items-center gap-1"><Radio className="h-3 w-3 text-emerald-500 animate-pulse" />{circle.online_count ?? 0} online</span>
          <span>Level {circle.level}</span>
        </div>
      </CircleCard>
    </Link>
  );
}

function CircleRow({ circle }: { circle: any }) {
  const meta = circleMeta(circle.category);
  const verified = verificationLabel(circle.verification);
  return (
    <Link to="/communities/$slug" params={{ slug: circle.slug }}>
      <CircleCard className="p-4">
        <div className="flex items-start gap-3">
          <CircleAvatar name={circle.name} gradient={meta.gradient} logoUrl={circle.logo_url} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{circle.name}</p>
              {verified && <BadgeCheck className="h-4 w-4 shrink-0 text-[#4f7cff]" />}
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-[#1f1b16]/55">{circle.description || "A Samsta circle."}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#1f1b16]/45">
              <span className="rounded-full border border-black/10 bg-white/80 px-2 py-0.5">
                {meta.emoji} {meta.label}
              </span>
              <span className="flex items-center gap-1"><Users2 className="h-3 w-3" />{circle.member_count}</span>
              {circle.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{circle.city}</span>}
              <span className="capitalize">{circle.privacy}</span>
            </div>
          </div>
        </div>
      </CircleCard>
    </Link>
  );
}
