// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search as SearchIcon, Hash, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchProfiles, searchByHashtag, type PublicProfile } from "@/lib/api/social";
import { signOne } from "@/lib/api/feed";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () => ({ meta: [{ title: "Explore — Samsta" }] }),
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 220);
    return () => clearTimeout(t);
  }, [q]);

  const isTag = debounced.startsWith("#");
  const usersQ = useQuery({
    queryKey: ["search-users", debounced],
    queryFn: () => searchProfiles(debounced),
    enabled: !!debounced && !isTag,
  });
  const tagQ = useQuery({
    queryKey: ["search-tag", debounced],
    queryFn: () => searchByHashtag(debounced),
    enabled: !!debounced && isTag,
  });

  const trendingQ = useQuery({
    queryKey: ["trending-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, user_id, media, kind")
        .eq("is_archived", false)
        .eq("is_draft", false)
        .in("kind", ["post", "reel"])
        .order("created_at", { ascending: false })
        .limit(24);
      return data ?? [];
    },
    enabled: !debounced,
  });

  return (
    <div className="pt-4 pb-24">
      <div className="px-4">
        <div className="glass flex items-center gap-2 rounded-full px-4 py-2.5">
          <SearchIcon className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search people or #hashtags"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="mt-4 px-4">
        {!debounced ? (
          <TrendingGrid data={trendingQ.data ?? []} loading={trendingQ.isLoading} />
        ) : isTag ? (
          <HashtagResults tag={debounced} data={tagQ.data ?? []} loading={tagQ.isLoading} />
        ) : (
          <UserResults data={usersQ.data ?? []} loading={usersQ.isLoading} />
        )}
      </div>
    </div>
  );
}

function UserResults({ data, loading }: { data: PublicProfile[]; loading: boolean }) {
  if (loading) return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  if (!data.length) return <p className="mt-16 text-center text-sm text-muted-foreground">No people match</p>;
  return (
    <ul className="flex flex-col gap-1">
      {data.map((u) => <UserRow key={u.id} u={u} />)}
    </ul>
  );
}

function UserRow({ u }: { u: PublicProfile }) {
  const avQ = useQuery({
    queryKey: ["avatar-url", u.avatar_url],
    queryFn: () => signOne(u.avatar_url as string),
    enabled: !!u.avatar_url && !u.avatar_url.startsWith("http"),
  });
  const src = u.avatar_url?.startsWith("http") ? u.avatar_url : avQ.data;
  return (
    <li>
      <Link
        to="/profile/$userId"
        params={{ userId: u.id }}
        className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-foreground/[0.04]"
      >
        {src ? (
          <img src={src} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {(u.username ?? "?")[0]?.toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {u.username ?? "user"}
            {u.is_verified && <span className="ml-1 text-primary">✓</span>}
          </div>
          <div className="truncate text-xs text-muted-foreground">{u.full_name ?? ""}</div>
        </div>
      </Link>
    </li>
  );
}

type MediaItem = { path: string; bucket?: string; type: "image" | "video" };
type PostLite = { id: string; user_id: string; media: unknown; kind: string };

function HashtagResults({ tag, data, loading }: { tag: string; data: PostLite[]; loading: boolean }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <Hash className="h-4 w-4" /> <span className="font-semibold">{tag.replace(/^#/, "")}</span>
        <span className="text-muted-foreground">· {data.length} posts</span>
      </div>
      {loading ? <Center><Loader2 className="h-5 w-5 animate-spin" /></Center> :
        !data.length ? <p className="mt-16 text-center text-sm text-muted-foreground">No posts with this tag yet</p> :
        <PostGrid posts={data} />}
    </div>
  );
}

function TrendingGrid({ data, loading }: { data: PostLite[]; loading: boolean }) {
  if (loading) return <Center><Loader2 className="h-5 w-5 animate-spin" /></Center>;
  if (!data.length) return <p className="mt-16 text-center text-sm text-muted-foreground">Nothing here yet — start sharing.</p>;
  return <PostGrid posts={data} />;
}

function PostGrid({ posts }: { posts: PostLite[] }) {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {posts.map((p) => <GridTile key={p.id} post={p} />)}
    </div>
  );
}

function GridTile({ post }: { post: PostLite }) {
  const media = Array.isArray(post.media) ? (post.media as MediaItem[]) : [];
  const first = media[0];
  const bucket = first?.bucket ?? (post.kind === "reel" ? "reels" : post.kind === "story" ? "stories" : "posts");
  const q = useQuery({
    queryKey: ["thumb", bucket, first?.path],
    queryFn: () => signOne(first!.path, bucket),
    enabled: !!first?.path,
  });
  return (
    <Link to="/" className="relative block aspect-square overflow-hidden bg-muted">
      {q.data && (first?.type === "video" ? (
        <video src={q.data} className="h-full w-full object-cover" muted playsInline preload="metadata" />
      ) : (
        <img src={q.data} alt="" loading="lazy" className="h-full w-full object-cover" />
      ))}
    </Link>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="mt-16 flex justify-center text-muted-foreground">{children}</div>;
}
