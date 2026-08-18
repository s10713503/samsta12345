// @ts-nocheck
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Settings, Grid3x3, Film, Heart, LogOut, X, Share2, MessageCircle, Send, Mail, Link as LinkIcon, Facebook, Twitter, Instagram, Camera } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MediaViewer, type ViewerItem } from "@/components/samsta/MediaViewer";
import { FollowSheet } from "@/components/samsta/FollowSheet";
import { PrivacySheet } from "@/components/samsta/PrivacySheet";
import { useAuthUser } from "@/hooks/use-auth";
import { useRealtimeFollows } from "@/hooks/use-realtime";
import { getProfile, getFollowCounts, updateProfile } from "@/lib/api/social";
import { listUserPosts, listUserStories, listUserUploads, uploadAvatar, signOne, listLikedPosts } from "@/lib/api/feed";
import { deletePost } from "@/lib/api/interactions";
import { HighlightRail } from "@/components/samsta/HighlightRail";
import { GridMediaTile } from "@/components/samsta/GridMediaTile";


export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab === "reels" || s.tab === "likes" || s.tab === "grid" ? s.tab : undefined) as
      | "grid"
      | "reels"
      | "likes"
      | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Your profile · Samsta" },
      { name: "description", content: "Manage your Samsta profile, posts, reels, and likes — all in one calm space." },
      { property: "og:title", content: "Your profile · Samsta" },
      { property: "og:description", content: "Manage your Samsta profile, posts, reels, and likes." },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: "/profile" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "/profile" }],
  }),
});


type TabKey = "grid" | "reels" | "likes";

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthUser();
  const search = Route.useSearch();
  const [tab, setTab] = useState<TabKey>((search?.tab as TabKey) ?? "grid");

  const [viewer, setViewer] = useState<{ items: ViewerItem[]; index: number; mode: "photo" | "reel" | "story" } | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ username: "", full_name: "", bio: "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);
  const [followTab, setFollowTab] = useState<null | "followers" | "following">(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const profileQ = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
  });
  const countsQ = useQuery({
    queryKey: ["follow-counts", user?.id],
    queryFn: () => getFollowCounts(user!.id),
    enabled: !!user,
  });
  const uploadsQ = useQuery({
    queryKey: ["user-posts", user?.id, "post"],
    queryFn: () => listUserPosts(user!.id, "post"),
    enabled: !!user,
  });

  const reelsQ = useQuery({
    queryKey: ["user-posts", user?.id, "reel"],
    queryFn: () => listUserPosts(user!.id, "reel"),
    enabled: !!user,
  });
  const storiesQ = useQuery({
    queryKey: ["user-stories", user?.id],
    queryFn: () => listUserStories(user!.id),
    enabled: !!user,
  });
  const likedQ = useQuery({
    queryKey: ["liked-posts", user?.id],
    queryFn: () => listLikedPosts(user!.id),
    enabled: !!user && tab === "likes",
  });

  const avatarSignedQ = useQuery({
    queryKey: ["avatar-url", profileQ.data?.avatar_url],
    queryFn: () => signOne(profileQ.data!.avatar_url as string),
    enabled: !!profileQ.data?.avatar_url,
  });

  // Realtime: follow counts + own posts refresh live
  useRealtimeFollows(user?.id, () => {
    queryClient.invalidateQueries({ queryKey: ["follow-counts", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["followers", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["following", user?.id] });
  });
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profile-posts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-posts", user.id, "post"] });
          queryClient.invalidateQueries({ queryKey: ["user-posts", user.id, "reel"] });
          queryClient.invalidateQueries({ queryKey: ["user-stories", user.id] });
          queryClient.invalidateQueries({ queryKey: ["follow-counts", user.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, queryClient]);

  const displayAvatar = avatarPreview ?? avatarSignedQ.data ?? "";
  const displayName = profileQ.data?.full_name ?? "";
  const username = profileQ.data?.username ?? user?.email?.split("@")[0] ?? "you";
  const bio = profileQ.data?.bio ?? "";

  const uploads = uploadsQ.data ?? [];
  const reels = reelsQ.data ?? [];
  const liked = likedQ.data ?? [];
  const activeItems = tab === "reels" ? reels : tab === "likes" ? liked : uploads;

  const viewerItems: ViewerItem[] = useMemo(
    () =>
      activeItems.map((p) => ({
        id: p.id,
        image: p.media[0]?.url ?? "",
        type: p.media[0]?.type ?? "image",
        targetType: p.kind,
        user: {
          name: p.author?.username ?? username,
          avatar: displayAvatar,
        },
        caption: p.caption ?? "",
      })),
    [activeItems, username, displayAvatar],
  );

  async function handleDeleteUpload(item: ViewerItem) {
    if (!item.id || !user) return;
    try {
      await deletePost(item.id);
      toast.success("Upload deleted");
      setViewer(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["user-uploads", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["user-posts", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["user-stories", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["follow-counts", user.id] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/welcome", replace: true });
  }

  function openEdit() {
    setDraft({
      username: profileQ.data?.username ?? "",
      full_name: profileQ.data?.full_name ?? "",
      bio: profileQ.data?.bio ?? "",
    });
    setAvatarFile(null);
    setAvatarPreview(null);
    setShowEdit(true);
  }

  function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    try {
      const patch: Parameters<typeof updateProfile>[1] = {
        username: draft.username || null,
        full_name: draft.full_name || null,
        bio: draft.bio || null,
      };
      if (avatarFile) {
        patch.avatar_url = await uploadAvatar(user.id, avatarFile);
      }
      await updateProfile(user.id, patch);
      toast.success("Profile updated");
      setShowEdit(false);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const shareText = `Check out ${displayName || username} on Samsta`;
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";

  const shareOptions = [
    { label: "WhatsApp", color: "#25D366", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}` },
    { label: "Telegram", color: "#229ED9", icon: Send, href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
    { label: "Instagram", color: "#E4405F", icon: Instagram, action: "copy" as const },
    { label: "Facebook", color: "#1877F2", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { label: "X", color: "#000", icon: Twitter, href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { label: "Email", color: "#EA4335", icon: Mail, href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(shareUrl)}` },
    { label: "Copy link", color: "#6B7280", icon: LinkIcon, action: "copy" as const },
    { label: "More", color: "#8B5CF6", icon: Share2, action: "native" as const },
  ];

  async function handleShare(opt: (typeof shareOptions)[number]) {
    if ("href" in opt && opt.href) {
      window.open(opt.href, "_blank");
      setShowShare(false);
      return;
    }
    if (opt.action === "copy") {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } else if (opt.action === "native") {
      if (navigator.share) {
        try { await navigator.share({ title: shareText, url: shareUrl }); } catch {}
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied");
      }
    }
    setShowShare(false);
  }

  return (
    <div className="pt-5">
      <div className="flex items-center justify-between px-5">
        <h1 className="font-display text-2xl italic">{username}</h1>
        <div className="flex items-center gap-2">
          <button onClick={signOut} className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Sign out">
            <LogOut className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <button onClick={() => navigate({ to: "/settings" })} className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Settings">
            <Settings className="h-5 w-5" strokeWidth={1.8} />
          </button>

        </div>
      </div>

      <div className="mt-5 flex items-center gap-5 px-5">
        <button onClick={openEdit} className="story-gradient h-24 w-24 rounded-full p-[3px]" aria-label="Change avatar">
          <div className="h-full w-full rounded-full bg-background p-[2px]">
            {displayAvatar ? (
              <img src={displayAvatar} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                {username.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
        </button>
        <div className="flex flex-1 justify-around text-center">
          {[
            { n: countsQ.data?.posts ?? 0, l: "posts", onClick: () => setTab("grid") },
            { n: countsQ.data?.followers ?? 0, l: "followers", onClick: () => setFollowTab("followers") },
            { n: countsQ.data?.following ?? 0, l: "following", onClick: () => setFollowTab("following") },
          ].map((s) => (
            <button key={s.l} onClick={s.onClick} className="rounded-2xl px-3 py-1 active:scale-95">
              <div className="font-semibold tabular-nums">{s.n}</div>
              <div className="text-xs text-muted-foreground">{s.l}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 px-5">
        {displayName && <div className="text-sm font-semibold">{displayName}</div>}
        {bio && <p className="mt-0.5 whitespace-pre-line text-sm text-foreground/80">{bio}</p>}
      </div>

      <div className="mt-4 flex gap-2 px-5">
        <button onClick={openEdit} className="glass flex-1 rounded-full py-2 text-sm font-medium">Edit profile</button>
        <button onClick={() => setShowShare(true)} className="glass flex-1 rounded-full py-2 text-sm font-medium">Share</button>
      </div>

      {(storiesQ.data?.length ?? 0) > 0 && (
        <div className="mt-5 px-5">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Your stories</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {storiesQ.data!.map((s) => {
              const m = s.media[0];
              return (
                <button
                  key={s.id}
                  onClick={() => setViewer({
                    items: storiesQ.data!.map((x) => ({
                      id: x.id,
                      image: x.media[0]?.url ?? "",
                      type: x.media[0]?.type ?? "image",
                      targetType: "story",
                      user: { name: username, avatar: displayAvatar },
                      caption: x.caption ?? "",
                    })),
                    index: storiesQ.data!.indexOf(s),
                    mode: "story",
                  })}
                  className="story-gradient shrink-0 rounded-2xl p-[2px]"
                >
                  <div className="h-20 w-16 overflow-hidden rounded-2xl bg-background p-[2px]">
                    {m?.type === "video" ? (
                      <video src={m.url} className="h-full w-full rounded-xl object-cover" muted playsInline preload="metadata" />
                    ) : m?.url ? (
                      <img src={m?.url} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-xl bg-muted text-[10px] text-muted-foreground">Missing</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {user && <HighlightRail userId={user.id} canEdit={true} />}




      <div className="mt-6 flex items-center justify-around border-y border-border">
        {([
          { key: "grid", Icon: Grid3x3 },
          { key: "reels", Icon: Film },
          { key: "likes", Icon: Heart },
        ] as const).map(({ key, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 flex justify-center ${tab === key ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground"}`}>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </button>
        ))}
      </div>

      <div key={tab} className="animate-fade-in">
        {tab === "likes" && likedQ.isLoading ? (
          <div className="grid grid-cols-3 gap-[6px] px-[6px] pt-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : activeItems.length === 0 ? (
          <EmptyTab label={tab === "likes" ? "Posts you like will appear here" : tab === "reels" ? "No reels yet. Share your first reel." : "No uploads yet. Share your first photo, reel, or story."} cta={tab !== "likes"} />
        ) : (
          <div className="grid grid-cols-3 gap-[6px] px-[6px] pt-1">
            {activeItems.map((p, i) => {
              const m = p.media[0];
              return (
                <button
                  key={p.id}
                  onClick={() => setViewer({ items: viewerItems, index: i, mode: tab === "reels" ? "reel" : "photo" })}
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                  className="group relative aspect-square animate-fade-in overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border/40 transition-all duration-300 active:scale-[0.98] active:opacity-90"
                >
                  <GridMediaTile media={m} count={p.media?.length ?? 1} isReel={tab === "reels" || p.kind === "reel"} />


                  {tab === "reels" && (
                    <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 backdrop-blur">
                      <Film className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {p.kind === "story" && tab !== "reels" && (
                    <div className="absolute left-1.5 top-1.5 rounded-full bg-foreground/50 px-1.5 py-0.5 text-[10px] font-medium text-background backdrop-blur">
                      Story
                    </div>
                  )}
                  {p.kind === "reel" && tab !== "reels" && (
                    <div className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-foreground/50 px-1.5 py-0.5 text-background backdrop-blur">
                      <Film className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {viewer && (
        <MediaViewer items={viewer.items} startIndex={viewer.index} mode={viewer.mode} onClose={() => setViewer(null)} onDelete={tab === "likes" ? undefined : handleDeleteUpload} />
      )}

      <PrivacySheet open={showPrivacy} userId={user?.id ?? null} onClose={() => setShowPrivacy(false)} />

      <FollowSheet
        open={followTab !== null}
        userId={user?.id ?? null}
        currentUserId={user?.id ?? null}
        initialTab={followTab ?? "followers"}
        onClose={() => setFollowTab(null)}
      />

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setShowEdit(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(480px,100%)] rounded-t-3xl bg-background p-5 shadow-2xl animate-slide-in-right sm:animate-scale-in">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl italic">Edit profile</h2>
              <button onClick={() => setShowEdit(false)} className="glass flex h-9 w-9 items-center justify-center rounded-full"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="story-gradient h-24 w-24 rounded-full p-[3px]">
                  <div className="h-full w-full rounded-full bg-background p-[2px]">
                    {(avatarPreview || displayAvatar) ? (
                      <img src={avatarPreview ?? displayAvatar} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <div className="h-full w-full rounded-full bg-muted" />
                    )}
                  </div>
                </div>
                <button onClick={() => avatarRef.current?.click()} className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-lg">
                  <Camera className="h-4 w-4" />
                </button>
                <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
              </div>
              <button onClick={() => avatarRef.current?.click()} className="text-xs text-primary">Change photo</button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs text-muted-foreground">Name</span>
                <input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Username</span>
                <input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} className="mt-1 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground" />
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Bio</span>
                <textarea value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} rows={3} className="mt-1 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground" />
              </label>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowEdit(false)} className="glass flex-1 rounded-full py-2.5 text-sm font-medium">Cancel</button>
              <button onClick={saveProfile} disabled={saving} className="flex-1 rounded-full py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, oklch(0.78 0.15 20), oklch(0.72 0.14 30))" }}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showShare && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setShowShare(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(480px,100%)] rounded-t-3xl bg-background p-5 shadow-2xl animate-fade-up">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <h2 className="mb-4 text-center font-display text-xl italic">Share profile</h2>
            <div className="grid grid-cols-4 gap-3">
              {shareOptions.map((o, i) => (
                <button key={o.label} onClick={() => handleShare(o)}
                  className="flex flex-col items-center gap-1.5 animate-fade-up active:scale-90 transition-transform"
                  style={{ animationDelay: `${i * 35}ms` }}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-md" style={{ backgroundColor: o.color }}>
                    <o.icon className="h-5 w-5 text-white" strokeWidth={2} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{o.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowShare(false)} className="glass mt-5 w-full rounded-full py-2.5 text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyTab({ label, cta = false }: { label: string; cta?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="text-sm text-muted-foreground max-w-xs">{label}</div>
      {cta && (
        <Link to="/create" className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">
          Create
        </Link>
      )}
    </div>
  );
}
