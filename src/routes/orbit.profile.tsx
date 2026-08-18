// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Globe, MapPin, Briefcase, GraduationCap, QrCode, Share2, Pencil, Sparkles, Image as ImageIcon, Film, Mic, Plus } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { OrbitCard } from "@/components/samsta/OrbitCard";
import { OrbitStudio } from "@/components/samsta/OrbitStudio";
import { OrbitTimeline } from "@/components/samsta/OrbitTimeline";
import { subscribeOrbit } from "@/lib/api/orbit";
import { getMyOrbitProfile } from "@/lib/api/orbit-identity";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orbit/profile")({
  component: OrbitProfilePage,
  head: () => ({
    meta: [
      { title: "Your Orbit profile — Samsta Orbit" },
      { name: "description", content: "Your Orbit identity: posts, replies, media, videos, likes, saved, communities, badges and reputation score." },
      { property: "og:title", content: "Your Orbit profile — Samsta Orbit" },
      { property: "og:description", content: "A social identity that is separate from your Samsta profile." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TABS = ["Timeline", "Posts", "Replies", "Media", "Videos", "Likes", "Saved", "Podcasts", "Communities"] as const;

function OrbitProfilePage() {
  const { user } = useAuthUser();
  const [tab, setTab] = useState<typeof TABS[number]>("Timeline");
  const [studioKind, setStudioKind] = useState<null | "photo" | "video" | "podcast">(null);

  const { data: profile } = useQuery({
    queryKey: ["orbit-profile", user?.id ?? null],
    queryFn: () => getMyOrbitProfile(user?.id ?? null),
    enabled: !!user?.id,
  });

  const { data: posts = [], refetch } = useQuery({
    queryKey: ["orbit-profile-posts", user?.id ?? null, tab],
    queryFn: async () => {
      const sb = supabase as any;
      if (tab === "Likes" || tab === "Saved") {
        const table = tab === "Likes" ? "orbit_likes" : "orbit_bookmarks";
        const { data: rows } = await sb.from(table).select("post_id").eq("user_id", user.id).limit(50);
        const ids = (rows ?? []).map((r: any) => r.post_id);
        if (!ids.length) return [];
        const { data } = await sb.from("orbit_posts").select("*").in("id", ids).is("deleted_at", null);
        return data ?? [];
      }
      let q = sb.from("orbit_posts").select("*").eq("user_id", user.id).is("deleted_at", null)
        .order("created_at", { ascending: false }).limit(50);
      if (tab === "Posts") q = q.is("parent_id", null);
      if (tab === "Replies") q = q.not("parent_id", "is", null);
      if (tab === "Media") q = q.in("kind", ["photo", "video"]);
      if (tab === "Videos") q = q.eq("kind", "video");
      if (tab === "Podcasts") q = q.in("kind", ["podcast", "voice"]);
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!user?.id && tab !== "Timeline",
  });

  // Live: new Orbit media appears without a manual refresh.
  useEffect(() => {
    let t: any;
    return subscribeOrbit(() => { clearTimeout(t); t = setTimeout(() => refetch(), 500); });
  }, [refetch]);


  if (!profile) {
    return (
      <div className="min-h-dvh pb-32">
        <OrbitHeader title="Orbit profile" />
        <div className="glass mx-4 mt-6 rounded-3xl p-6 text-center text-sm text-muted-foreground">
          You don’t have an Orbit identity yet.{" "}
          <Link to="/orbit/setup" className="font-semibold text-primary">Create it</Link>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Posts", value: profile.post_count },
    { label: "Followers", value: profile.follower_count },
    { label: "Following", value: profile.following_count },
  ];

  const uploads: Array<{ kind: "photo" | "video" | "podcast"; label: string; icon: any; grad: string }> = [
    { kind: "photo", label: "Upload photo", icon: ImageIcon, grad: "linear-gradient(135deg, oklch(0.8 0.12 330), oklch(0.82 0.11 20))" },
    { kind: "video", label: "Upload reel", icon: Film, grad: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" },
    { kind: "podcast", label: "Upload podcast", icon: Mic, grad: "linear-gradient(135deg, oklch(0.78 0.13 210), oklch(0.8 0.12 160))" },
  ];
  const tabKind: "photo" | "video" | "podcast" =
    tab === "Videos" ? "video" : tab === "Podcasts" ? "podcast" : tab === "Media" ? "photo" : "photo";

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title="Orbit profile" subtitle={`@${profile.username}`}
        right={
          <div className="flex gap-2">
            <button aria-label="QR code" className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90"><QrCode className="h-4 w-4" /></button>
            <button aria-label="Share profile" className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90"><Share2 className="h-4 w-4" /></button>
          </div>
        } />

      <div className="relative mx-4 mt-4 overflow-hidden rounded-[2rem]">
        <div className="h-28 w-full" style={{ background: profile.cover_url ? undefined : "linear-gradient(135deg, oklch(0.78 0.13 300), oklch(0.82 0.11 210))" }}>
          {profile.cover_url && <img src={profile.cover_url} alt="Cover" className="h-full w-full object-cover" />}
        </div>
        <div className="glass-strong -mt-8 rounded-[2rem] p-4 pt-0">
          <div className="-mt-8 h-16 w-16 overflow-hidden rounded-full ring-4 ring-background/80 bg-muted">
            {profile.avatar_video_url ? (
              <video src={profile.avatar_video_url} className="h-full w-full object-cover" autoPlay muted loop playsInline />
            ) : profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <h2 className="text-base font-semibold">{profile.display_name}</h2>
            {profile.is_verified && <BadgeCheck className="h-4 w-4 text-primary" />}
            {profile.creator_category && <span className="glass rounded-full px-2 py-0.5 text-[10px]">{profile.creator_category}</span>}
          </div>
          <p className="text-xs text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}

          <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
            {profile.website && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{profile.website}</span>}
            {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location}</span>}
            {profile.profession && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{profile.profession}</span>}
            {profile.education && <span className="flex items-center gap-1"><GraduationCap className="h-3 w-3" />{profile.education}</span>}
          </div>

          <div className="mt-3 flex gap-4">
            {stats.map((s) => (
              <div key={s.label}><span className="text-sm font-semibold">{s.value}</span> <span className="text-[11px] text-muted-foreground">{s.label}</span></div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]">
              <Sparkles className="h-3 w-3 text-primary" /> AI reputation {Math.round(profile.reputation_score)}
            </span>
            <Link to="/orbit/setup" className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] active:scale-95">
              <Pencil className="h-3 w-3" /> Edit profile
            </Link>
          </div>

          {!!profile.interests?.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.interests.map((i: string) => (
                <span key={i} className="glass rounded-full px-2.5 py-1 text-[10px] text-muted-foreground">{i}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
              tab === t ? "bg-foreground text-background" : "glass text-muted-foreground")}>
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        {uploads.map(({ kind, label, icon: Icon, grad }) => (
          <button key={kind} onClick={() => setStudioKind(kind)}
            className="glass-strong flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-medium active:scale-95">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md" style={{ background: grad }}>
              <Icon className="h-4 w-4" />
            </span>
            {label}
          </button>
        ))}
      </div>

      {tab === "Timeline" ? (
        <main className="relative mt-3">
          <OrbitTimeline userId={user?.id ?? null} profile={profile} />
        </main>
      ) : (
      <main className="relative mt-3 flex flex-col gap-3 px-4">
        {!posts.length && (
          <div className="glass rounded-3xl p-6 text-center">
            <p className="text-sm text-muted-foreground">Nothing in {tab.toLowerCase()} yet.</p>
            <button onClick={() => setStudioKind(tabKind)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-md active:scale-95"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
              <Plus className="h-3.5 w-3.5" /> Upload {tabKind === "video" ? "reel" : tabKind === "podcast" ? "podcast" : "photo"}
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">Everything you publish appears here and in the Orbit feed for other Samsta users.</p>
          </div>
        )}
        {posts.map((p: any) => (
          <OrbitCard key={p.id} post={p} meId={user?.id ?? null} compact
            onLike={() => {}} onBookmark={() => {}} onRepost={() => {}} onQuote={() => {}} onVote={() => {}} />
        ))}
      </main>
      )}

      <OrbitStudio key={studioKind ?? "none"} open={!!studioKind} onClose={() => setStudioKind(null)}
        userId={user?.id ?? null} initialKind={studioKind ?? "video"} onDone={() => refetch()} />
    </div>
  );
}
