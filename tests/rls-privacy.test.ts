/**
 * RLS regression tests: a private account's posts must be invisible to
 * non-followers on EVERY read path (feed, search, explore, recommendations),
 * and become visible only after the owner approves the follow request.
 *
 * Runs against the live backend with the public (anon) key only — exactly the
 * key the browser uses — so it proves the database rules, not client filters.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"]!;
const KEY =
  process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"]!;

function client(): SupabaseClient {
  const key = KEY;
  return createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input as any, { ...init, headers: h });
      },
    },
  });
}

async function signUp(tag: string) {
  const sb = client();
  const email = `rls-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = `Pw!${Math.random().toString(36).slice(2)}A1`;
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  const id = data.user!.id;
  await sb.from("profiles").upsert({ id, username: `rls_${tag}_${id.slice(0, 6)}`, email });
  return { sb, id, email, password };
}

let owner: Awaited<ReturnType<typeof signUp>>;
let viewer: Awaited<ReturnType<typeof signUp>>;
let anon: SupabaseClient;
let postId: string;

beforeAll(async () => {
  owner = await signUp("owner");
  viewer = await signUp("viewer");
  anon = client();

  // Owner goes private and publishes one post.
  const up = await owner.sb.from("profiles").update({ is_private: true }).eq("id", owner.id);
  expect(up.error).toBeNull();

  const { data, error } = await owner.sb
    .from("posts")
    .insert({ user_id: owner.id, kind: "post", caption: "rls-secret-post", is_archived: false, is_draft: false })
    .select("id")
    .single();
  if (error) throw error;
  postId = data!.id as string;
}, 60_000);

/** Every read path the app uses, expressed as the same queries the UI runs. */
const readPaths: Array<{ name: string; run: (sb: SupabaseClient) => Promise<unknown[]> }> = [
  {
    name: "feed",
    run: async (sb) =>
      (await sb.from("posts").select("id").eq("kind", "post").order("created_at", { ascending: false }).limit(200))
        .data ?? [],
  },
  {
    name: "search",
    run: async (sb) => (await sb.from("posts").select("id").ilike("caption", "%rls-secret-post%").limit(50)).data ?? [],
  },
  {
    name: "explore",
    run: async (sb) =>
      (await sb.from("posts").select("id").eq("is_archived", false).eq("is_draft", false).limit(200)).data ?? [],
  },
  {
    name: "recommendations",
    run: async (sb) => (await sb.from("posts").select("id").eq("user_id", owner.id).limit(100)).data ?? [],
  },
];

function has(rows: unknown[]) {
  return (rows as Array<{ id: string }>).some((r) => r.id === postId);
}

describe("private posts are excluded by RLS", () => {
  for (const path of readPaths) {
    it(`hides the post from a signed-out visitor on ${path.name}`, async () => {
      expect(has(await path.run(anon))).toBe(false);
    });

    it(`hides the post from a non-follower on ${path.name}`, async () => {
      expect(has(await path.run(viewer.sb))).toBe(false);
    });
  }

  it("shows the post to its owner", async () => {
    expect(has(await readPaths[3]!.run(owner.sb))).toBe(true);
  });

  it("keeps the post hidden while the follow request is pending", async () => {
    const { error } = await viewer.sb
      .from("follows")
      .upsert(
        { follower_id: viewer.id, following_id: owner.id, status: "pending" },
        { onConflict: "follower_id,following_id" },
      );
    expect(error).toBeNull();
    for (const path of readPaths) expect(has(await path.run(viewer.sb))).toBe(false);
  });

  it("reveals the post on every path once the owner approves", async () => {
    const { error } = await owner.sb
      .from("follows")
      .update({ status: "accepted" })
      .eq("follower_id", viewer.id)
      .eq("following_id", owner.id);
    expect(error).toBeNull();
    for (const path of readPaths) expect(has(await path.run(viewer.sb))).toBe(true);
  });

  it("hides it again when the owner rejects/removes the follower", async () => {
    const { error } = await owner.sb
      .from("follows")
      .delete()
      .eq("follower_id", viewer.id)
      .eq("following_id", owner.id);
    expect(error).toBeNull();
    for (const path of readPaths) expect(has(await path.run(viewer.sb))).toBe(false);
  });
});
