// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

export type WishItem = {
  id: string; user_id: string; title: string; brand: string | null; category: string | null;
  price: number | null; currency: string | null; image_url: string | null; url: string | null;
  platform: string | null; rating: number | null; meta: Record<string, unknown>;
  folder: string; favorite: boolean; price_alert: number | null;
  created_at: string; updated_at: string;
};

export async function listWishlist(userId: string, opts: { folder?: string; favorite?: boolean } = {}) {
  let q = sb.from("shopping_wishlist").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (opts.folder) q = q.eq("folder", opts.folder);
  if (opts.favorite) q = q.eq("favorite", true);
  const { data } = await q;
  return (data as WishItem[]) ?? [];
}
export async function addWish(w: Partial<WishItem> & { user_id: string; title: string }) {
  const { data, error } = await sb.from("shopping_wishlist").insert(w).select().single();
  if (error) throw error;
  return data as WishItem;
}
export async function updateWish(id: string, patch: Partial<WishItem>) {
  const { data, error } = await sb.from("shopping_wishlist").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data as WishItem;
}
export async function removeWish(id: string) { await sb.from("shopping_wishlist").delete().eq("id", id); }

export async function pushShopHistory(userId: string, kind: "search" | "view", query: string, meta: Record<string, unknown> = {}) {
  await sb.from("shopping_history").insert({ user_id: userId, kind, query, meta });
}
export async function listShopHistory(userId: string, limit = 20) {
  const { data } = await sb.from("shopping_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

// Redirect-only search links across major shopping platforms.
export function shopLinks(query: string, region: "global" | "in" | "us" | "uk" = "global") {
  const q = encodeURIComponent(query);
  const all = [
    { name: "Amazon", url: region === "in" ? `https://www.amazon.in/s?k=${q}` : region === "uk" ? `https://www.amazon.co.uk/s?k=${q}` : `https://www.amazon.com/s?k=${q}` },
    { name: "Flipkart", url: `https://www.flipkart.com/search?q=${q}`, only: "in" },
    { name: "eBay", url: `https://www.ebay.com/sch/i.html?_nkw=${q}` },
    { name: "Walmart", url: `https://www.walmart.com/search?q=${q}`, only: "us" },
    { name: "Best Buy", url: `https://www.bestbuy.com/site/searchpage.jsp?st=${q}`, only: "us" },
    { name: "Target", url: `https://www.target.com/s?searchTerm=${q}`, only: "us" },
    { name: "Myntra", url: `https://www.myntra.com/${q}`, only: "in" },
    { name: "Ajio", url: `https://www.ajio.com/search/?text=${q}`, only: "in" },
    { name: "Nykaa", url: `https://www.nykaa.com/search/result/?q=${q}`, only: "in" },
    { name: "AliExpress", url: `https://www.aliexpress.com/w/wholesale-${q}.html` },
    { name: "Etsy", url: `https://www.etsy.com/search?q=${q}` },
    { name: "Google Shopping", url: `https://www.google.com/search?tbm=shop&q=${q}` },
    { name: "Argos", url: `https://www.argos.co.uk/search/${q}/`, only: "uk" },
  ];
  return all.filter((s) => !s.only || region === "global" || s.only === region);
}
