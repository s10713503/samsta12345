// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mic, Plus, Play } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { OrbitStudio } from "@/components/samsta/OrbitStudio";
import { listOrbit, subscribeOrbit } from "@/lib/api/orbit";

export const Route = createFileRoute("/orbit/podcasts")({
  component: OrbitPodcasts,
  head: () => ({
    meta: [
      { title: "Podcasts — Samsta Orbit" },
      { name: "description", content: "Listen to every Samsta Orbit podcast episode and publish your own audio show in seconds." },
      { property: "og:title", content: "Podcasts — Samsta Orbit" },
      { property: "og:description", content: "Every Orbit audio episode from creators across Samsta, in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function fmt(sec?: number | null) {
  if (!sec) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function OrbitPodcasts() {
  const { user } = useAuthUser();
  const [studio, setStudio] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["orbit-podcasts", user?.id ?? null],
    queryFn: () => listOrbit({ lane: "podcasts", userId: user?.id ?? null }),
    staleTime: 20_000,
  });
  const items = data?.items ?? [];

  // Live: new Orbit media appears without a manual refresh.
  useEffect(() => {
    let t: any;
    return subscribeOrbit(() => { clearTimeout(t); t = setTimeout(() => refetch(), 500); });
  }, [refetch]);


  return (
    <div className="relative min-h-dvh pb-28">
      <OrbitHeader title="Orbit Podcasts" subtitle="Every creator on Samsta · Listen & publish"
        right={
          <button onClick={() => setStudio(true)} aria-label="Create podcast"
            className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold text-white shadow-md active:scale-95"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            <Plus className="h-3.5 w-3.5" /> Episode
          </button>
        } />

      <main className="relative mt-4 space-y-3 px-4">
        {!items.length && (
          <div className="glass rounded-3xl p-6 text-center text-sm text-muted-foreground">
            No episodes yet — record the first Orbit podcast.
          </div>
        )}
        {items.map((p: any) => (
          <article key={p.id} className="glass-strong rounded-3xl p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
                <Mic className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{p.title || "Untitled episode"}</h2>
                <p className="truncate text-[11px] text-muted-foreground">
                  @{p.author?.username ?? "orbit"} {p.duration_seconds ? `· ${fmt(p.duration_seconds)}` : ""}
                </p>
              </div>
              <Play className="mt-1 h-4 w-4 text-muted-foreground" />
            </div>
            {p.body && <p className="mt-2 line-clamp-3 text-[13px] text-muted-foreground">{p.body}</p>}
            {p.media_url && (
              <audio controls preload="none" src={p.media_url} className="mt-3 w-full" />
            )}
          </article>
        ))}
      </main>

      <OrbitStudio open={studio} onClose={() => setStudio(false)} userId={user?.id ?? null}
        initialKind="podcast" onDone={() => refetch()} />
    </div>
  );
}
