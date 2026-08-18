import { Plus, X, Image as ImageIcon, Film } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MediaViewer, type ViewerItem } from "@/components/samsta/MediaViewer";
import { listStories, listUserStories, uploadMedia, createPost, signOne } from "@/lib/api/feed";
import { useAuthUser } from "@/hooks/use-auth";
import { getProfile } from "@/lib/api/social";
import { usePremium } from "@/lib/premium";
import { StoryRing } from "@/components/samsta/StoryRing";


const SEEN_KEY = "samsta:seen-stories";
function getSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); }
}
function saveSeen(set: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
}

export function StoryRail() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ file: File; url: string; type: "image" | "video" } | null>(null);
  const [viewer, setViewer] = useState<{ items: ViewerItem[]; index: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);
  const [seen, setSeen] = useState<Set<string>>(() => (typeof window !== "undefined" ? getSeen() : new Set()));
  const { user } = useAuthUser();

  const { isPremium, canCreate, recordUse, unlimitedMedia } = usePremium();
  const queryClient = useQueryClient();


  useEffect(() => { setSeen(getSeen()); }, []);

  const { data: groups = [] } = useQuery({
    queryKey: ["stories"],
    queryFn: listStories,
    // Stories change slowly; poll less often and never while the tab is
    // backgrounded so idle tabs stop burning requests and battery.
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
  });

  const { data: myStories = [] } = useQuery({
    queryKey: ["user-stories", user?.id],
    queryFn: () => listUserStories(user!.id),
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: me } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: () => getProfile(user!.id),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });


  const { data: myAvatar } = useQuery({
    queryKey: ["avatar-url", me?.avatar_url],
    queryFn: () => signOne(me!.avatar_url as string),
    enabled: !!me?.avatar_url,
    staleTime: 50 * 60_000,
  });

  function openPicker() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreview({
      file: f,
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" : "image",
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function shareStory() {
    if (!user || !preview) return;
    const q = canCreate("story");
    if (!q.allowed) {
      toast.error(`You've used all ${q.cap} stories this month. Upgrade for more.`);
      return;
    }
    setUploading(true);
    try {
      const item = await uploadMedia(user.id, preview.file, "story", { isPremium, unlimited: unlimitedMedia });
      await createPost({ userId: user.id, caption: "", kind: "story", media: [item] });
      recordUse("story", 1);
      toast.success("Story shared");
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      setJustUploaded(true);
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["user-stories", user.id] });

    } catch (err) {

      const msg =
        (err as { message?: string })?.message ||
        (typeof err === "string" ? err : "") ||
        "Couldn't share your story. Please try again.";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }


  const myAvatarSrc = myAvatar ?? "";
  const myName = me?.username ?? "you";

  const otherGroups = user
    ? groups.filter((g) => g.user?.id !== user.id)
    : groups;

  const hasMyStories = myStories.length > 0;

  function openMyStories() {
    if (!hasMyStories) { openPicker(); return; }
    if (justUploaded) setJustUploaded(false);
    const items: ViewerItem[] = myStories.map((it) => ({
      id: it.id,
      ownerId: user?.id,
      image: it.media[0]?.url ?? "",
      type: (it.media[0]?.type === "video" ? "video" : "image") as "image" | "video",
      targetType: "story",
      user: { name: myName, avatar: myAvatarSrc },
      caption: it.caption ?? "",
    }));
    setViewer({ items, index: 0 });
  }




  return (
    <>
      <div className="scrollbar-none flex gap-4 overflow-x-auto px-5 py-3">
        <button
          onClick={openMyStories}
          className="flex w-14 flex-shrink-0 flex-col items-center gap-1.5 active:scale-95 transition-transform"
        >
          <div className="relative">
            <StoryRing size={56} active={hasMyStories} isNew={justUploaded}>
              {myAvatarSrc ? (
                <img src={myAvatarSrc} alt="" width={56} height={56} decoding="async"
                  className="h-full w-full rounded-full object-cover" />
              ) : (
                <div className="h-full w-full rounded-full bg-muted" />
              )}
            </StoryRing>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); openPicker(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); openPicker(); } }}
              className="absolute -bottom-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-foreground text-background border-2 border-background cursor-pointer"
              aria-label="Add to your story"
            >
              <Plus className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
          </div>
          <span className="w-full truncate text-center text-[11px] text-muted-foreground">
            {hasMyStories ? "Your story" : "Add story"}
          </span>
        </button>



        {otherGroups.map((g, i) => {
          const first = g.items[0];
          const name = g.user?.username ?? "user";
          const avatar = g.user?.avatar_url ?? "";
          const allSeen = g.items.every((it) => seen.has(it.id));
          return (
            <button
              key={g.user?.id ?? i}
              onClick={() => {
                const items: ViewerItem[] = g.items.map((it) => ({
                  id: it.id,
                  ownerId: g.user?.id,
                  image: it.media[0]?.url ?? "",
                  type: (it.media[0]?.type === "video" ? "video" : "image") as "image" | "video",
                  targetType: "story",
                  user: { name, avatar },
                  caption: it.caption ?? "",
                }));
                setViewer({ items, index: 0 });
                const next = new Set(seen);
                g.items.forEach((it) => next.add(it.id));
                setSeen(next);
                saveSeen(next);
              }}

              className="flex w-14 flex-shrink-0 flex-col items-center gap-1.5 active:scale-95 transition-transform animate-fade-up"
              style={{ animationDelay: `${i * 45}ms` }}
            >
              <StoryRing size={56} active={!allSeen}>
                {avatar ? (
                  <img src={avatar} alt={name} width={56} height={56} loading="lazy" decoding="async"
                    className="h-full w-full rounded-full object-cover" />
                ) : (
                  <div className="h-full w-full rounded-full bg-muted" />
                )}
              </StoryRing>
              <span className="w-full truncate text-center text-[11px] text-muted-foreground">{name}</span>
              {first ? null : null}
            </button>

          );
        })}
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFile} />

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl animate-fade-in">
          <div className="relative w-[min(420px,92vw)] rounded-3xl bg-background p-4 shadow-2xl animate-scale-in">
            <button onClick={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} aria-label="Close story preview"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur">
              <X className="h-4 w-4" />
            </button>
            <div className="overflow-hidden rounded-2xl bg-muted">
              {preview.type === "video" ? (
                <video src={preview.url} controls className="h-[60vh] w-full object-cover" />
              ) : (
                <img src={preview.url} alt="Story photo preview before posting" className="h-[60vh] w-full object-cover" />
              )}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {preview.type === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              Story expires in 24h
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={openPicker} disabled={uploading} className="glass flex-1 rounded-full py-2.5 text-sm font-medium">Change</button>
              <button onClick={shareStory} disabled={uploading} className="flex-1 rounded-full py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, oklch(0.78 0.15 20), oklch(0.72 0.14 30))" }}>
                {uploading ? "Sharing…" : "Share to story"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewer && (
        <MediaViewer items={viewer.items} startIndex={viewer.index} mode="story" onClose={() => setViewer(null)} />
      )}
    </>
  );
}
