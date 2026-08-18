// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Search, Sparkles, Heart, Users, Eye, GitBranch, Rocket, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import {
  listOrbitProjects, subscribeProjects, PROJECT_CATEGORIES, WORK_STATUS,
  type ProjectLane, type OrbitProject,
} from "@/lib/api/orbit-projects";

export const Route = createFileRoute("/orbit/projects/")({
  component: ProjectHub,
  head: () => ({
    meta: [
      { title: "Orbit Project Hub · Samsta" },
      { name: "description", content: "Build, showcase and collaborate on Orbit Projects — portfolios, progress timelines, collaborators and AI project scores inside Samsta Orbit." },
      { property: "og:title", content: "Orbit Project Hub · Samsta" },
      { property: "og:description", content: "Discover Orbit Projects from students, developers, researchers and founders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const LANES: { key: ProjectLane; label: string }[] = [
  { key: "discover", label: "Discover" },
  { key: "trending", label: "Trending" },
  { key: "mine", label: "My Projects" },
  { key: "following", label: "Following" },
];

function statusLabel(key: string) {
  return WORK_STATUS.find((s) => s.key === key)?.label ?? "Work in Progress";
}

function ProjectCard({ p }: { p: OrbitProject }) {
  const owner = p.owner?.full_name || p.owner?.username || "Samsta member";
  return (
    <Link to="/orbit/projects/$projectId" params={{ projectId: p.id }}
      className="glass feed-card relative block overflow-hidden rounded-3xl p-4 animate-fade-up active:scale-[0.99]">
      <div aria-hidden className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full opacity-40 blur-3xl animate-aurora"
        style={{ background: "oklch(0.85 0.1 260)" }} />
      {p.cover_url && (
        <img src={p.cover_url} alt={`${p.name} cover`} loading="lazy" decoding="async"
          className="mb-3 h-32 w-full rounded-2xl object-cover" />
      )}
      <div className="relative flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg italic leading-snug">{p.name}</h3>
          <p className="truncate text-[11px] text-muted-foreground">
            {owner} · {p.category || "Project"} · {statusLabel(p.work_status)}
          </p>
        </div>
        {typeof p.ai_health_score === "number" && (
          <span className="glass-strong flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold">
            <Sparkles className="h-3 w-3 text-primary" /> {p.ai_health_score}
          </span>
        )}
      </div>

      {p.summary && <p className="relative mt-2 line-clamp-2 text-sm text-muted-foreground">{p.summary}</p>}

      {!!p.tech_stack?.length && (
        <div className="relative mt-2 flex flex-wrap gap-1.5">
          {p.tech_stack.slice(0, 5).map((t) => (
            <span key={t} className="glass rounded-full px-2 py-0.5 text-[10px] font-medium">{t}</span>
          ))}
        </div>
      )}

      <div className="relative mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <span className="block h-full rounded-full transition-all duration-700"
            style={{ width: `${p.progress}%`, background: "linear-gradient(90deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }} />
        </div>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.appreciate_count}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.member_count}</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.view_count}</span>
          <span className="ml-auto font-semibold text-foreground">{p.progress}%</span>
        </div>
      </div>
    </Link>
  );
}

function ProjectHub() {
  const { user } = useAuthUser();
  const [lane, setLane] = useState<ProjectLane>("discover");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ["orbit-projects", lane, user?.id ?? null, search, category],
    queryFn: () => listOrbitProjects({ lane, meId: user?.id ?? null, search, category }),
  });

  useEffect(() => {
    let t: any;
    return subscribeProjects(() => { clearTimeout(t); t = setTimeout(() => refetch(), 600); });
  }, [refetch]);

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title="Project Hub" subtitle="Build in public. Collaborate in orbit."
        right={
          <Link to="/orbit/projects/new" aria-label="New Orbit Project"
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md active:scale-90"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            <Plus className="h-5 w-5" />
          </Link>
        } />

      <div className="relative mt-4 px-4">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, tech, category…"
            className="flex-1 bg-transparent text-sm outline-none" />
          <button onClick={() => setShowFilters((v) => !v)} aria-label="Filters"
            className={cn("flex h-7 w-7 items-center justify-center rounded-full active:scale-90", showFilters && "text-primary")}>
            <Filter className="h-4 w-4" />
          </button>
        </div>

        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-up">
            <button onClick={() => setCategory(null)}
              className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium",
                !category ? "bg-foreground text-background" : "glass text-muted-foreground")}>
              All
            </button>
            {PROJECT_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c === category ? null : c)}
                className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium",
                  category === c ? "bg-foreground text-background" : "glass text-muted-foreground")}>
                {c}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {LANES.map(({ key, label }) => (
            <button key={key} onClick={() => setLane(key)}
              className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                lane === key ? "bg-foreground text-background" : "glass text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="relative mt-3 flex flex-col gap-3 px-4">
        {isLoading && [0, 1, 2].map((i) => <div key={i} className="glass h-40 animate-pulse rounded-3xl" />)}
        {!isLoading && !projects.length && (
          <div className="glass mt-6 rounded-3xl p-6 text-center animate-fade-up">
            <Rocket className="mx-auto h-6 w-6 text-primary" />
            <p className="mt-2 font-display text-lg italic">Nothing in this orbit yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {lane === "mine" ? "Launch your first Orbit Project and let AI write the story." : "Be the first to publish here."}
            </p>
            <Link to="/orbit/projects/new"
              className="mt-4 inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white shadow-md active:scale-95"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
              <GitBranch className="h-4 w-4" /> Create project
            </Link>
          </div>
        )}
        {projects.map((p) => <ProjectCard key={p.id} p={p} />)}
      </main>
    </div>
  );
}
