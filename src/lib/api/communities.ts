// @ts-nocheck
/**
 * Samsta Global Communities — discovery, membership and community feed.
 */
import { supabase as rawSupabase } from "@/integrations/supabase/client";

const supabase = rawSupabase as any;

export type Community = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  subcategory: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  languages: string[];
  rules: string;
  privacy: "public" | "private" | "invite";
  verification: string;
  member_count: number;
  post_count: number;
  online_count: number;
  reputation_score: number;
  level: number;
  logo_url: string | null;
  cover_url: string | null;
  owner_id: string;
  created_at: string;
};

export const COMMUNITY_CATEGORIES = [
  "education",
  "career",
  "startup",
  "technology",
  "location",
  "college",
  "hobby",
  "health",
  "finance",
  "creative",
] as const;

export function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

export async function listCommunities(opts: {
  category?: string | null;
  term?: string | null;
  city?: string | null;
  sort?: "trending" | "new" | "members";
  limit?: number;
} = {}): Promise<Community[]> {
  let q = supabase.from("communities").select("*").limit(opts.limit ?? 40);
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.city) q = q.eq("city", opts.city);
  if (opts.term) q = q.ilike("name", `%${opts.term}%`);
  if (opts.sort === "new") q = q.order("created_at", { ascending: false });
  else if (opts.sort === "members") q = q.order("member_count", { ascending: false });
  else q = q.order("reputation_score", { ascending: false }).order("member_count", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Community[];
}

export async function getCommunity(slug: string): Promise<Community | null> {
  const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Community | null;
}

export async function myCommunityIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const { data, error } = await supabase.from("community_members").select("community_id").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.community_id);
}

export async function myMembership(communityId: string, userId: string | null) {
  if (!userId) return null;
  const { data } = await supabase
    .from("community_members")
    .select("*")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

export async function joinCommunity(communityId: string, userId: string) {
  const { error } = await supabase
    .from("community_members")
    .insert({ community_id: communityId, user_id: userId, role: "member" });
  if (error) throw error;
}

export async function leaveCommunity(communityId: string, userId: string) {
  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", communityId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function requestToJoin(communityId: string, userId: string, message: string) {
  const { error } = await supabase
    .from("community_join_requests")
    .insert({ community_id: communityId, user_id: userId, message });
  if (error) throw error;
}

export type CommunityPost = {
  id: string;
  community_id: string;
  author_id: string;
  kind: string;
  title: string | null;
  body: string;
  media_url: string | null;
  media_type: string | null;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_announcement: boolean;
  created_at: string;
  author?: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

export async function listCommunityPosts(communityId: string, kind?: string | null): Promise<CommunityPost[]> {
  let q = supabase
    .from("community_posts")
    .select("*")
    .eq("community_id", communityId)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) throw error;
  const posts = (data ?? []) as CommunityPost[];
  const ids = [...new Set(posts.map((p) => p.author_id))];
  if (!ids.length) return posts;
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", ids);
  const map = new Map((authors ?? []).map((a: any) => [a.id, a]));
  return posts.map((p) => ({ ...p, author: map.get(p.author_id) ?? null }));
}

export async function createCommunityPost(input: {
  communityId: string;
  authorId: string;
  body: string;
  title?: string | null;
  kind?: string;
}) {
  const { error } = await supabase.from("community_posts").insert({
    community_id: input.communityId,
    author_id: input.authorId,
    body: input.body,
    title: input.title ?? null,
    kind: input.kind ?? "text",
  });
  if (error) throw error;
}

export async function listMembers(communityId: string, limit = 30) {
  const { data, error } = await supabase
    .from("community_members")
    .select("user_id, role, reputation")
    .eq("community_id", communityId)
    .order("reputation", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url")
    .in("id", rows.map((r: any) => r.user_id));
  const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  return rows.map((r: any) => ({ ...r, profile: map.get(r.user_id) ?? null }));
}

export async function createCommunity(input: {
  ownerId: string;
  name: string;
  description: string;
  category: string;
  privacy: "public" | "private" | "invite";
  country?: string | null;
  state?: string | null;
  city?: string | null;
  rules?: string;
}): Promise<Community> {
  const base = slugify(input.name) || "community";
  const slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await supabase
    .from("communities")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      slug,
      description: input.description,
      category: input.category,
      privacy: input.privacy,
      country: input.country ?? null,
      state: input.state ?? null,
      city: input.city ?? null,
      rules: input.rules ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Community;
}