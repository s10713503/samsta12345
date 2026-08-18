// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

export type Trip = {
  id: string; user_id: string; title: string; destination: string; origin: string | null;
  start_date: string | null; end_date: string | null; travelers: number | null;
  budget: number | null; currency: string | null; style: string | null; interests: string[];
  itinerary: unknown[]; packing: unknown[]; documents: unknown[]; notes: string | null;
  status: string; cover_url: string | null; created_at: string; updated_at: string;
};
export type Favorite = {
  id: string; user_id: string; kind: string; title: string; subtitle: string | null;
  url: string | null; provider: string | null; price: number | null; currency: string | null;
  meta: Record<string, unknown>; folder: string; created_at: string;
};

export async function listTrips(userId: string) {
  const { data } = await sb.from("travel_trips").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  return (data as Trip[]) ?? [];
}
export async function saveTrip(t: Partial<Trip> & { user_id: string; title: string; destination: string }) {
  const { data, error } = await sb.from("travel_trips").insert(t).select().single();
  if (error) throw error;
  return data as Trip;
}
export async function updateTrip(id: string, patch: Partial<Trip>) {
  const { data, error } = await sb.from("travel_trips").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw error;
  return data as Trip;
}
export async function deleteTrip(id: string) {
  await sb.from("travel_trips").delete().eq("id", id);
}

export async function listFavorites(userId: string, kind?: string) {
  let q = sb.from("travel_favorites").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return (data as Favorite[]) ?? [];
}
export async function addFavorite(f: Partial<Favorite> & { user_id: string; kind: string; title: string }) {
  const { data, error } = await sb.from("travel_favorites").insert(f).select().single();
  if (error) throw error;
  return data as Favorite;
}
export async function removeFavorite(id: string) {
  await sb.from("travel_favorites").delete().eq("id", id);
}

export async function pushHistory(userId: string, kind: string, query: string, meta: Record<string, unknown> = {}) {
  await sb.from("travel_history").insert({ user_id: userId, kind, query, meta });
}
export async function listHistory(userId: string, limit = 20) {
  const { data } = await sb.from("travel_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

// Provider deep-link helpers (redirect only — never process payments in-app).
export function providerLinks(kind: "flight" | "hotel" | "train" | "bus", opts: {
  from?: string; to?: string; date?: string; ret?: string; travelers?: number; query?: string;
}) {
  const q = encodeURIComponent;
  const to = opts.to ?? opts.query ?? "";
  const from = opts.from ?? "";
  const date = opts.date ?? "";
  const ret = opts.ret ?? "";
  if (kind === "flight") {
    return [
      { name: "Ixigo Flights", url: `https://www.ixigo.com/search/result/flight?from=${q(from)}&to=${q(to)}&date=${q(date)}${ret ? `&returnDate=${q(ret)}` : ""}&adults=${opts.travelers ?? 1}&class=e` },
      { name: "Google Flights", url: `https://www.google.com/travel/flights?q=${q(`Flights from ${from} to ${to} on ${date}`)}` },
      { name: "Skyscanner", url: `https://www.skyscanner.com/transport/flights/${q(from)}/${q(to)}/${q(date)}/` },
      { name: "Kayak", url: `https://www.kayak.com/flights/${q(from)}-${q(to)}/${q(date)}${ret ? `/${q(ret)}` : ""}` },
      { name: "Expedia", url: `https://www.expedia.com/Flights-Search?leg1=from:${q(from)},to:${q(to)},departure:${q(date)}` },
      { name: "Booking.com", url: `https://flights.booking.com/flights/${q(from)}.AIRPORT-${q(to)}.AIRPORT` },
    ];
  }
  if (kind === "hotel") {
    return [
      { name: "Ixigo Hotels", url: `https://www.ixigo.com/hotels/search?destination=${q(to)}&checkIn=${q(date)}&checkOut=${q(ret)}&rooms=1&adults=${opts.travelers ?? 2}` },
      { name: "Booking.com", url: `https://www.booking.com/searchresults.html?ss=${q(to)}&checkin=${q(date)}&checkout=${q(ret)}` },
      { name: "Airbnb", url: `https://www.airbnb.com/s/${q(to)}/homes?checkin=${q(date)}&checkout=${q(ret)}` },
      { name: "Agoda", url: `https://www.agoda.com/search?city=${q(to)}&checkIn=${q(date)}&checkOut=${q(ret)}` },
      { name: "Hotels.com", url: `https://www.hotels.com/Hotel-Search?destination=${q(to)}&startDate=${q(date)}&endDate=${q(ret)}` },
      { name: "Trivago", url: `https://www.trivago.com/?query=${q(to)}` },
    ];
  }
  if (kind === "train") {
    return [
      { name: "Ixigo Trains", url: `https://www.ixigo.com/search/result/train?from=${q(from)}&to=${q(to)}&date=${q(date)}&class=SL` },
      { name: "Trainline", url: `https://www.thetrainline.com/book/results?origin=${q(from)}&destination=${q(to)}&outwardDate=${q(date)}` },
      { name: "Rail Europe", url: `https://www.raileurope.com/en/search?origin=${q(from)}&destination=${q(to)}&departureDate=${q(date)}` },
      { name: "IRCTC (India)", url: `https://www.irctc.co.in/nget/train-search` },
      { name: "Amtrak (US)", url: `https://www.amtrak.com/tickets/departure.html?from=${q(from)}&to=${q(to)}&depart=${q(date)}` },
      { name: "Omio", url: `https://www.omio.com/search-frontend/en/results/${q(from)}/${q(to)}/${q(date)}?userId=&transportType=train` },
    ];
  }
  return [
    { name: "Omio", url: `https://www.omio.com/search-frontend/en/results/${q(from)}/${q(to)}/${q(date)}?transportType=bus` },
    { name: "FlixBus", url: `https://www.flixbus.com/bus/${q(from)}/${q(to)}` },
    { name: "RedBus", url: `https://www.redbus.in/bus-tickets/${q(from)}-to-${q(to)}` },
    { name: "BusBud", url: `https://www.busbud.com/en/bus-schedules/${q(from)}/${q(to)}` },
    { name: "Rome2Rio", url: `https://www.rome2rio.com/s/${q(from)}/${q(to)}` },
  ];
}
