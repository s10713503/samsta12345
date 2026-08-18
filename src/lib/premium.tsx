// @ts-nocheck
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { REFERRAL_GOAL, capturePendingReferral, claimReferral, getReferralStats } from "@/lib/referrals";

export type PlanId = "1m" | "3m" | "6m" | "12m";
export type Currency = "INR" | "USD";

export type Plan = {
  id: PlanId;
  months: number;
  label: string;
  priceINR: number;
  priceUSD: number;
  perMonthINR: number;
  perMonthUSD: number;
  savings?: string;
  badge?: string;
  postCap: number;
  reelCap: number;
  storyCap: number;
  fileCap: number;
  /** Cloud storage included with the plan, in GB. */
  storageGB: number;
  /** Max upload quality tier for images/videos. */
  quality: "SD" | "HD" | "4K";
};

export const PLANS: Plan[] = [
  { id: "1m",  months: 1,  label: "1 Month",   priceINR: 1999,  priceUSD: 99.99,  perMonthINR: 1999,   perMonthUSD: 99.99,  postCap: 20, reelCap: 10, storyCap: 15, fileCap: 5,  storageGB: 50,   quality: "SD" },
  { id: "3m",  months: 3,  label: "3 Months",  priceINR: 5499,  priceUSD: 279.99, perMonthINR: 1833,   perMonthUSD: 93.33,  savings: "Save 8%",  postCap: 50, reelCap: 25, storyCap: 30, fileCap: 10, storageGB: 200,  quality: "SD" },
  { id: "6m",  months: 6,  label: "6 Months",  priceINR: 9999,  priceUSD: 549.99, perMonthINR: 1666,   perMonthUSD: 91.66,  savings: "Save 16%", postCap: 50, reelCap: 25, storyCap: 30, fileCap: 25, storageGB: 1000, quality: "HD" },
  { id: "12m", months: 12, label: "12 Months", priceINR: 17999, priceUSD: 999.99, perMonthINR: 1500,   perMonthUSD: 83.33,  savings: "Save 25%", badge: "Best Value", postCap: 50, reelCap: 25, storyCap: 30, fileCap: 65, storageGB: 2000, quality: "4K" },
];

/** Plans that unlock image/video uploads inside study plans (and HD media everywhere). */
export const MEDIA_PLANS: PlanId[] = ["6m", "12m"];

// Free-tier quotas (per rolling month, tracked locally)
export const FREE_QUOTA = { post: 5, reel: 3, story: 5, file: 2 };


export function getPlan(id: PlanId) {
  return PLANS.find((p) => p.id === id)!;
}

// --- Country / currency detection --------------------------------------
export function detectCurrency(): Currency {
  if (typeof window === "undefined") return "USD";
  try {
    const saved = localStorage.getItem("samsta:currency") as Currency | null;
    if (saved === "INR" || saved === "USD") return saved;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = (navigator.language || "").toLowerCase();
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || locale.endsWith("-in") || locale === "hi") return "INR";
    const region = new Intl.Locale(navigator.language || "en-US").maximize().region;
    if (region === "IN") return "INR";
  } catch { /* ignore */ }
  return "USD";
}

export function formatPrice(currency: Currency, amount: number): string {
  if (currency === "INR") {
    return "₹" + amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// --- Subscription context ----------------------------------------------
export type Subscription = {
  id: string;
  plan: PlanId;
  currency: Currency;
  amount: number;
  status: "active" | "cancelled" | "expired";
  auto_renew: boolean;
  started_at: string;
  expires_at: string;
  cancelled_at: string | null;
};

type Ctx = {
  loading: boolean;
  subscription: Subscription | null;
  isPremium: boolean;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  refresh: () => Promise<void>;
  daysLeft: number | null;
  currentPlan: Plan | null;
  quotas: { post: number; reel: number; story: number; file: number };
  usage: { post: number; reel: number; story: number; file: number };
  canCreate: (kind: "post" | "reel" | "story" | "file") => { allowed: boolean; remaining: number; cap: number };
  recordUse: (kind: "post" | "reel" | "story" | "file", n?: number) => void;
  /** True only on 6-month / 12-month plans — unlocks image & video uploads. */
  mediaUnlocked: boolean;
  /** Included cloud storage in GB (0 when not subscribed). */
  storageGB: number;
  /** Max media quality allowed by the current plan. */
  quality: "SD" | "HD" | "4K" | "8K";
  /** Referrals that bought the 12-month plan. */
  qualifiedReferrals: number;
  /** True once 5 referred friends bought 12-month premium — unlimited photos & videos. */
  unlimitedMedia: boolean;
  refreshReferrals: () => Promise<void>;
};


const PremiumCtx = createContext<Ctx | null>(null);

const USAGE_KEY = "samsta:usage";

type UsageBlob = { month: string; post: number; reel: number; story: number; file: number };

function loadUsage(): UsageBlob {
  const month = new Date().toISOString().slice(0, 7);
  if (typeof window === "undefined") return { month, post: 0, reel: 0, story: 0, file: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || "null") as UsageBlob | null;
    if (raw && raw.month === month) return { file: 0, ...raw };
  } catch { /* */ }
  return { month, post: 0, reel: 0, story: 0, file: 0 };
}

function saveUsage(u: UsageBlob) {
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch { /* */ }
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthUser();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrencyState] = useState<Currency>("USD");
  const [usage, setUsage] = useState<UsageBlob>(() => ({
    month: new Date().toISOString().slice(0, 7),
    post: 0,
    reel: 0,
    story: 0,
    file: 0,
  }));
  const [qualifiedReferrals, setQualifiedReferrals] = useState(0);

  useEffect(() => { setCurrencyState(detectCurrency()); }, []);
  useEffect(() => { setUsage(loadUsage()); }, []);
  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    try { localStorage.setItem("samsta:currency", c); } catch { /* */ }
  };

  const refresh = async () => {
    if (!user) { setSubscription(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      const expired = new Date(data.expires_at).getTime() < Date.now();
      setSubscription({
        id: data.id,
        plan: data.plan as PlanId,
        currency: data.currency as Currency,
        amount: Number(data.amount),
        status: expired ? "expired" : (data.status as Subscription["status"]),
        auto_renew: data.auto_renew,
        started_at: data.started_at,
        expires_at: data.expires_at,
        cancelled_at: data.cancelled_at,
      });
    } else {
      setSubscription(null);
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  // Referral program: capture ?ref=, claim it once signed in, then count qualified referrals.
  const refreshReferrals = async () => {
    if (!user?.id) { setQualifiedReferrals(0); return; }
    const { qualified } = await getReferralStats(user.id);
    setQualifiedReferrals(qualified);
  };

  useEffect(() => { capturePendingReferral(); }, []);

  useEffect(() => {
    if (!user?.id) { setQualifiedReferrals(0); return; }
    (async () => {
      await claimReferral(user.id);
      await refreshReferrals();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Real-time: refresh instantly when a subscription or payment_order for this user changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`premium:${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_orders", filter: `user_id=eq.${user.id}` }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "referrals", filter: `referrer_id=eq.${user.id}` }, () => { void refreshReferrals(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isPremium = !!subscription && subscription.status === "active" && new Date(subscription.expires_at).getTime() > Date.now();
  const currentPlan = subscription ? getPlan(subscription.plan) : null;

  const quotas = useMemo(() => {
    // Posts, reels and stories are unlimited for everyone — no monthly caps.
    const file = isPremium && currentPlan ? currentPlan.fileCap : FREE_QUOTA.file;
    return {
      post: Number.POSITIVE_INFINITY,
      reel: Number.POSITIVE_INFINITY,
      story: Number.POSITIVE_INFINITY,
      file,
    };
  }, [isPremium, currentPlan]);

  const daysLeft = subscription
    ? Math.max(0, Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86400000))
    : null;

  const canCreate = (kind: "post" | "reel" | "story" | "file") => {
    const cap = quotas[kind];
    if (!Number.isFinite(cap)) return { allowed: true, remaining: cap, cap };
    const used = usage[kind] ?? 0;
    return { allowed: used < cap, remaining: Math.max(0, cap - used), cap };
  };

  const recordUse = (kind: "post" | "reel" | "story" | "file", n = 1) => {
    setUsage((u) => {
      const next = { ...u, [kind]: (u[kind] ?? 0) + n };
      saveUsage(next);
      return next;
    });
  };


  const unlimitedMedia = qualifiedReferrals >= REFERRAL_GOAL;

  return (
    <PremiumCtx.Provider value={{ loading, subscription, isPremium, currency, setCurrency, refresh, daysLeft, currentPlan, quotas, usage, canCreate, recordUse,
      qualifiedReferrals, unlimitedMedia, refreshReferrals,
      mediaUnlocked: unlimitedMedia || (isPremium && !!currentPlan && MEDIA_PLANS.includes(currentPlan.id)),
      storageGB: unlimitedMedia ? Number.POSITIVE_INFINITY : (isPremium && currentPlan ? currentPlan.storageGB : 0),
      quality: unlimitedMedia ? "8K" : (isPremium && currentPlan ? currentPlan.quality : "SD") }}>

      {children}
    </PremiumCtx.Provider>
  );
}

export function usePremium() {
  const c = useContext(PremiumCtx);
  if (!c) throw new Error("usePremium must be used within PremiumProvider");
  return c;
}
