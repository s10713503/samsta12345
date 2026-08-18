// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users2, MapPin, Send, Pin, Megaphone, Sparkles, BadgeCheck, Flame, Trophy, Check, MessageCircle, BookOpen, Info } from "lucide-react";
import { CircleShell, CircleCard, CircleAvatar } from "@/components/samsta/CircleShell";
import { verificationLabel, circleMeta } from "@/lib/circles";
import { useAuthUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  getCommunity, listCommunityPosts, listMembers, myMembership,
  joinCommunity, leaveCommunity, createCommunityPost,
} from "@/lib/api/communities";

export const Route = createFileRoute("/communities/$slug")({
  component: CommunityDetail,
  head: ({ params }) => {
    const title = `${params.slug} Circle — Samsta`;
    const description = `Join the ${params.slug} circle on Samsta: feed, knowledge hub, events and members.`;
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

const TABS = ["Feed", "Knowledge", "Members", "About"];
const TAB_ICONS: Record<string, any> = { Feed: MessageCircle, Knowledge: BookOpen, Members: Users2, About: Info };

function Stat({ icon, value, label }: { icon: React.ReactNode; value: any; label: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.07] bg-white/85 px-3 py-2 text-center transition duration-300 hover:-translate-y-0.5 hover:border-[#e08a4a]/45">
      <span className="mx-auto flex items-center justify-center gap-1 text-[#1f1b16]/70">{icon}</span>
      <p className="mt-1 text-sm font-semibold leading-none">{value ?? 0}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[#1f1b16]/40">{label}</p>
    </div>
  );
}

function CommunityDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuthUser();
  const uid = user?.id ?? null;
  const qc = useQueryClient();
  const [tab, setTab] = useState("Feed");
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", slug],
    queryFn: () => getCommunity(slug),
  });
  const cid = community?.id ?? null;

  const { data: membership } = useQuery({
    queryKey: ["community-membership", cid, uid],
    queryFn: () => myMembership(cid!, uid),
    enabled: !!cid && !!uid,
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["community-posts", cid, tab],
    queryFn: () => listCommunityPosts(cid!, tab === "Knowledge" ? "knowledge" : null),
    enabled: !!cid && (tab === "Feed" || tab === "Knowledge"),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["community-members", cid],
    queryFn: () => listMembers(cid!),
    enabled: !!cid && tab === "Members",
  });

  const joined = !!membership;

  if (isLoading) {
    return (
      <CircleShell title="Circle" back="/communities">
        <CircleCard className="p-6 text-center text-sm text-[#1f1b16]/50">Loading…</CircleCard>
      </CircleShell>
    );
  }
  if (!community) {
    return (
      <CircleShell title="Circle" back="/communities">
        <CircleCard className="p-6 text-center text-sm text-[#1f1b16]/60">
          This circle does not exist. <Link to="/communities" className="text-[#4f7cff]">Browse circles</Link>
        </CircleCard>
      </CircleShell>
    );
  }

  const toggleJoin = async () => {
    if (!uid) { flash("Sign in to join this circle"); return; }
    try {
      if (joined) await leaveCommunity(community.id, uid);
      else await joinCommunity(community.id, uid);
      qc.invalidateQueries({ queryKey: ["community-membership"] });
      qc.invalidateQueries({ queryKey: ["community", slug] });
      flash(joined ? `Left ${community.name}` : `Joined ${community.name}`);
    } catch {
      flash("Could not update membership");
    }
  };

  const post = async () => {
    if (!uid) { flash("Sign in to post"); return; }
    if (!joined) { flash("Join this circle to post"); return; }
    const body = draft.trim();
    if (!body) return;
    try {
      await createCommunityPost({
        communityId: community.id,
        authorId: uid,
        body,
        kind: tab === "Knowledge" ? "knowledge" : "text",
      });
      setDraft("");
      qc.invalidateQueries({ queryKey: ["community-posts"] });
    } catch {
      flash("Could not publish post");
    }
  };

  const verified = verificationLabel(community.verification);
  const meta = circleMeta(community.category);
  return (
    <CircleShell title={community.name} subtitle={community.description || "Samsta circle"} back="/communities">
      {/* Hero */}
      <CircleCard className="animate-fade-up p-0">
        <div className={cn("relative h-24 w-full overflow-hidden bg-gradient-to-br", meta.gradient)}>
          <span className="absolute -left-8 -top-10 h-32 w-32 rounded-full bg-white/25 blur-2xl animate-orb" />
          <span className="absolute right-6 top-4 h-20 w-20 rounded-full bg-white/20 blur-xl animate-orb" style={{ animationDelay: "1.8s" }} />
          <span className="absolute right-4 bottom-3 text-3xl animate-bounce-soft">{meta.emoji}</span>
          <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,.35)_45%,transparent_65%)] bg-[length:220%_100%] animate-shine" />
        </div>
        <div className="-mt-8 flex items-end gap-3 px-4">
          <CircleAvatar name={community.name} gradient={meta.gradient} size="lg" logoUrl={community.logo_url} />
          <button
            onClick={toggleJoin}
            className={cn(
              "mb-1 ml-auto shrink-0 rounded-full px-5 py-2 text-[11px] font-semibold transition-all duration-300 active:scale-95",
              joined
                ? "border border-black/10 bg-white/90 text-[#1f1b16]/70 hover:border-[#e08a4a]/50"
                : "bg-gradient-to-r from-[#4f7cff] to-[#e08a4a] text-white shadow-[0_14px_30px_-14px_rgba(224,138,74,.9)] hover:brightness-110",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {joined ? <Check className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 animate-pulse" />}
              {joined ? "Joined" : "Join circle"}
            </span>
          </button>
        </div>

        <div className="px-4 pb-4 pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-lg font-semibold tracking-tight">{community.name}</p>
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#4f7cff]/30 bg-[#4f7cff]/12 px-2 py-0.5 text-[10px] font-medium text-[#3b62d6]">
                <BadgeCheck className="h-3 w-3" /> {verified}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#1f1b16]/55">{community.description || "A Samsta circle."}</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat icon={<Users2 className="h-3.5 w-3.5 animate-bounce-soft" />} value={community.member_count} label="members" />
            <Stat icon={<Flame className="h-3.5 w-3.5 text-[#e08a4a] animate-pulse" />} value={community.post_count} label="posts" />
            <Stat icon={<Trophy className="h-3.5 w-3.5 text-[#c9a34a] animate-icon-tilt" />} value={community.level} label="level" />
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-[#1f1b16]/55">
            <span className="rounded-full border border-black/10 bg-white/85 px-2 py-0.5 capitalize">{meta.emoji} {community.category}</span>
            {community.city && (
              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/85 px-2 py-0.5">
                <MapPin className="h-3 w-3 animate-bounce-soft" />{community.city}
              </span>
            )}
          </div>
        </div>
      </CircleCard>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t];
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "group/tab shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-medium transition-all duration-300 active:scale-95",
                active
                  ? "bg-[#1f1b16] text-white shadow-[0_12px_26px_-16px_rgba(31,27,22,.9)]"
                  : "border border-black/10 bg-white/85 text-[#1f1b16]/60 hover:border-[#e08a4a]/50",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon className={cn("h-3.5 w-3.5 transition-transform duration-300 group-hover/tab:scale-110", active && "animate-bounce-soft")} />
                {t}
              </span>
            </button>
          );
        })}
      </div>

      {(tab === "Feed" || tab === "Knowledge") && (
        <>
          <CircleCard className="mt-4 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder={tab === "Knowledge" ? "Share knowledge with this circle…" : `Post in ${community.name}…`}
                className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#1f1b16]/40"
              />
              <button
                onClick={post}
                aria-label="Publish post"
                className="group/send flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f7cff] to-[#e08a4a] text-white shadow-[0_14px_28px_-14px_rgba(79,124,255,.9)] transition active:scale-90"
              >
                <Send className="h-4 w-4 transition-transform duration-300 group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5" />
              </button>
            </div>
          </CircleCard>

          <div className="mt-4 flex flex-col gap-3">
            {!posts.length && (
              <CircleCard className="p-8 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-[#b25f19] animate-pulse" />
                <p className="mt-3 text-sm font-semibold">Nothing posted here yet</p>
                <p className="mt-1 text-xs text-[#1f1b16]/50">Start the first conversation in this circle.</p>
              </CircleCard>
            )}
            {posts.map((p, i) => (
              <CircleCard key={p.id} className="animate-fade-up p-4" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-105">
                    {p.author?.avatar_url && (
                      <img src={p.author.avatar_url} alt={p.author.full_name ?? "Member"} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{p.author?.full_name ?? p.author?.username ?? "Member"}</p>
                    <p className="text-[10px] text-[#1f1b16]/40">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  {p.is_pinned && <Pin className="h-3.5 w-3.5 text-[#b25f19] animate-icon-tilt" />}
                  {p.is_announcement && <Megaphone className="h-3.5 w-3.5 text-[#4f7cff] animate-bounce-soft" />}
                </div>
                {p.title && <p className="mt-2 text-sm font-semibold">{p.title}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#1f1b16]/80">{p.body}</p>
              </CircleCard>
            ))}
          </div>
        </>
      )}

      {tab === "Members" && (
        <div className="mt-4 flex flex-col gap-2">
          {!members.length && <CircleCard className="p-6 text-center text-sm text-[#1f1b16]/50">No members loaded.</CircleCard>}
          {members.map((m, i) => (
            <CircleCard key={m.user_id} className="flex animate-fade-up items-center gap-3 p-3" style={{ animationDelay: `${i * 35}ms` }}>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-105">
                {m.profile?.avatar_url && <img src={m.profile.avatar_url} alt={m.profile.full_name ?? "Member"} className="h-full w-full object-cover" loading="lazy" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">{m.profile?.full_name ?? m.profile?.username ?? "Member"}</p>
                <p className="text-[10px] capitalize text-[#1f1b16]/45">{String(m.role).replace("_", " ")}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#c9a34a]/35 bg-[#fdf3dd] px-2 py-0.5 text-[10px] font-medium text-[#8a6b1c]">
                <Trophy className="h-3 w-3 animate-icon-tilt" />{m.reputation}
              </span>
            </CircleCard>
          ))}
        </div>
      )}

      {tab === "About" && (
        <div className="mt-4 flex flex-col gap-3">
          <CircleCard className="p-4">
            <p className="text-xs font-semibold">About</p>
            <p className="mt-1 text-xs leading-relaxed text-[#1f1b16]/60">{community.description || "No description yet."}</p>
          </CircleCard>
          <CircleCard className="p-4">
            <p className="text-xs font-semibold">Rules</p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-[#1f1b16]/60">
              {community.rules || "Be respectful. Stay on topic. No spam."}
            </p>
          </CircleCard>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full border border-black/10 bg-black/70 px-4 py-2 text-[11px] backdrop-blur-xl">
          {toast}
        </div>
      )}
    </CircleShell>
  );
}