// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Crown, Check, ArrowLeft, Sparkles, Wand2, Film, Mic, ImageIcon, Languages,
  BookOpen, Zap, Rocket, ShieldOff, Clapperboard, CloudUpload, X,
  CreditCard, Smartphone, Apple, Globe,
} from "lucide-react";
import { Gift, Copy, Users, Infinity as InfinityIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { PLANS, formatPrice, usePremium, type PlanId, type Currency, getPlan } from "@/lib/premium";
import { REFERRAL_GOAL, ensureReferralCode, claimReferral } from "@/lib/referrals";

export const Route = createFileRoute("/premium")({ component: PremiumPage });

const FEATURES = [
  { icon: Sparkles,    label: "Unlimited Sam Chat" },
  { icon: ImageIcon,   label: "Image Generator" },
  { icon: Film,        label: "Video & Reel Generator" },
  { icon: Mic,         label: "Voice Assistant" },
  { icon: Wand2,       label: "Photo Editor" },
  { icon: BookOpen,    label: "Story & Caption Generator" },
  { icon: Languages,   label: "Translation" },
  { icon: Rocket,      label: "Study & Business Assistant" },
  { icon: Zap,         label: "Priority Processing" },
  { icon: Crown,       label: "Early Access to New Features" },
  { icon: ShieldOff,   label: "Ad-Free Experience" },
  { icon: Clapperboard,label: "4K Content Export" },
  { icon: CloudUpload, label: "Unlimited Cloud Storage" },
];

function PremiumPage() {
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const { currency, setCurrency, isPremium, subscription, daysLeft, refresh } = usePremium();
  const [selected, setSelected] = useState<PlanId>("12m");
  const [showCheckout, setShowCheckout] = useState(false);

  const activePlan = getPlan(selected);

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto"
      style={{ background: "radial-gradient(1200px 600px at 50% -10%, #1a1408 0%, #0a0a0a 40%, #050505 100%)" }}
    >
      {/* Gold aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full blur-3xl opacity-30" style={{ background: "radial-gradient(circle, #d4af37, transparent 65%)" }} />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full blur-3xl opacity-25" style={{ background: "radial-gradient(circle, #f5e6b3, transparent 65%)" }} />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl opacity-20" style={{ background: "radial-gradient(circle, #b8860b, transparent 65%)" }} />
      </div>

      <div className="relative mx-auto w-full max-w-[480px] px-5 pt-4 pb-32 text-white">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate({ to: "/" })} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 backdrop-blur-md border border-white/10 active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <CurrencyToggle currency={currency} onChange={setCurrency} />
        </div>

        {/* Hero */}
        <div className="mt-6 text-center animate-fade-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #d4af37 0%, #f5e6b3 45%, #b8860b 100%)",
              boxShadow: "0 20px 60px -20px rgba(212,175,55,0.6)",
            }}>
            <Crown className="h-10 w-10 text-black" strokeWidth={2.2} />
          </div>
          <h1 className="mt-5 font-display text-4xl italic tracking-tight" style={{ color: "#f5e6b3" }}>
 Samsta Premium
          </h1>
          <p className="mt-2 text-sm text-white/60 max-w-xs mx-auto">
 Unlock every feature. Ad-free. Priority processing. Made for creators who move fast.
          </p>
        </div>

        {/* Active subscription banner */}
        {isPremium && subscription && (
          <div className="mt-6 rounded-2xl border border-[#d4af37]/40 bg-gradient-to-br from-[#1a1408] to-[#0a0a0a] p-5 animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[#f5e6b3] text-xs font-medium tracking-widest">
                  <Crown className="h-4 w-4" /> ACTIVE — {getPlan(subscription.plan).label.toUpperCase()}
                </div>
                <div className="mt-2 font-display text-2xl italic">
                  {daysLeft} <span className="text-sm not-italic text-white/60">days left</span>
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Renews {new Date(subscription.expires_at).toLocaleDateString()}
                  {" · "}{subscription.auto_renew ? "Auto-renew on" : "Auto-renew off"}
                </div>
              </div>
              <ManageMenu subscription={subscription} onChange={refresh} />
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="mt-8 space-y-3">
          {PLANS.map((p) => {
            const price = currency === "INR" ? p.priceINR : p.priceUSD;
            const perMo = currency === "INR" ? p.perMonthINR : p.perMonthUSD;
            const isActive = selected === p.id;
            const isBest = p.badge === "Best Value";
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`relative w-full rounded-2xl p-5 text-left transition-all active:scale-[0.99] ${
                  isActive
                    ? "border-2"
                    : "border border-white/10"
                }`}
                style={{
                  background: isActive
                    ? "linear-gradient(135deg, #1c1508 0%, #0d0906 100%)"
                    : "rgba(255,255,255,0.03)",
                  borderColor: isActive ? "#d4af37" : undefined,
                  boxShadow: isActive ? "0 8px 40px -12px rgba(212,175,55,0.5)" : undefined,
                }}
              >
                {isBest && (
                  <span className="absolute -top-2 right-4 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest text-black"
                    style={{ background: "linear-gradient(135deg, #d4af37, #f5e6b3)" }}>
                    BEST VALUE
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-xl">{p.label}</div>
                    {p.savings && <div className="mt-0.5 text-xs" style={{ color: "#d4af37" }}>{p.savings}</div>}
                    <div className="mt-1 text-[11px] text-white/55">
                      {p.storageGB >= 1000 ? `${p.storageGB / 1000} TB` : `${p.storageGB} GB`} storage · {p.quality} media
                      {(p.id === "6m" || p.id === "12m") && " · photo & video upload"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl">{formatPrice(currency, price)}</div>
                    <div className="text-[11px] text-white/50">{formatPrice(currency, Math.round(perMo * 100) / 100)}/mo</div>
                  </div>
                </div>
                <div className={`mt-3 flex h-4 w-4 items-center justify-center rounded-full ${isActive ? "" : "border border-white/20"}`}
                  style={isActive ? { background: "#d4af37" } : undefined}>
                  {isActive && <Check className="h-3 w-3 text-black" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => user ? setShowCheckout(true) : navigate({ to: "/auth" })}
          className="mt-6 w-full rounded-full py-4 text-sm font-semibold text-black transition active:scale-[0.98] shadow-2xl"
          style={{
            background: "linear-gradient(135deg, #f5e6b3 0%, #d4af37 50%, #b8860b 100%)",
            boxShadow: "0 20px 50px -15px rgba(212,175,55,0.55)",
          }}
        >
          {isPremium ? "Change plan" : `Continue — ${formatPrice(currency, currency === "INR" ? activePlan.priceINR : activePlan.priceUSD)}`}
        </button>
        <p className="mt-2 text-center text-[11px] text-white/40">
          Cancel anytime · Auto-renews · Instant unlock · Secure payment
        </p>

        <ReferralCard />

        {/* Features */}
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl italic" style={{ color: "#f5e6b3" }}>Everything included</h2>
          <div className="grid grid-cols-1 gap-2">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 backdrop-blur-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "linear-gradient(135deg, #d4af37 0%, #f5e6b3 100%)" }}>
                  <f.icon className="h-4 w-4 text-black" strokeWidth={2} />
                </div>
                <span className="text-sm">{f.label}</span>
                <Check className="ml-auto h-4 w-4" style={{ color: "#d4af37" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Payment methods */}
        <div className="mt-8">
          <h3 className="mb-3 text-xs uppercase tracking-widest text-white/40">Payment methods</h3>
          <div className="flex flex-wrap gap-2">
            {(currency === "INR"
              ? [{ i: Smartphone, l: "UPI" }, { i: CreditCard, l: "Cards" }, { i: Globe, l: "Net Banking" }]
              : [{ i: CreditCard, l: "Cards" }, { i: Apple, l: "Apple Pay" }, { i: Globe, l: "Google Pay" }, { i: Sparkles, l: "PayPal" }]
            ).map((m) => (
              <span key={m.l} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70">
                <m.i className="h-3.5 w-3.5" /> {m.l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutSheet
          plan={activePlan}
          currency={currency}
          onClose={() => setShowCheckout(false)}
          onSuccess={async () => {
            setShowCheckout(false);
            await refresh();
            toast.success("Premium unlocked. Welcome to Samsta Premium.");
            navigate({ to: "/" });
          }}
        />
      )}
    </div>
  );
}

function CurrencyToggle({ currency, onChange }: { currency: Currency; onChange: (c: Currency) => void }) {
  return (
    <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md text-xs">
      {(["INR", "USD"] as Currency[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`rounded-full px-3 py-1 transition ${currency === c ? "text-black" : "text-white/70"}`}
          style={currency === c ? { background: "linear-gradient(135deg, #f5e6b3, #d4af37)" } : undefined}
        >
          {c === "INR" ? "🇮🇳 INR" : "🌍 USD"}
        </button>
      ))}
    </div>
  );
}

function ReferralCard() {
  const { user } = useAuthUser();
  const { qualifiedReferrals, unlimitedMedia, refreshReferrals } = usePremium();
  const [code, setCode] = useState<string | null>(null);
  const [entry, setEntry] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    ensureReferralCode(user.id).then(setCode).catch(() => {});
  }, [user?.id]);

  const link = code && typeof window !== "undefined" ? `${window.location.origin}/premium?ref=${code}` : "";
  const progress = Math.min(qualifiedReferrals, REFERRAL_GOAL);

  const share = async () => {
    if (!link) return;
    try {
      if (navigator.share) await navigator.share({ title: "Samsta Premium", text: "Join Samsta Premium with my invite", url: link });
      else { await navigator.clipboard.writeText(link); toast.success("Invite link copied"); }
    } catch { /* dismissed */ }
  };

  const applyCode = async () => {
    if (!user?.id || !entry.trim()) return;
    setBusy(true);
    const ok = await claimReferral(user.id, entry);
    setBusy(false);
    setEntry("");
    if (ok) { toast.success("Invite applied — your friend gets credit when you go 12-month."); await refreshReferrals(); }
    else toast.error("That invite code can't be applied.");
  };

  if (!user) return null;

  return (
    <div className="mt-8 rounded-2xl border border-[#d4af37]/30 bg-white/[0.03] p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4" style={{ color: "#d4af37" }} />
        <h3 className="font-display text-lg italic" style={{ color: "#f5e6b3" }}>Refer 5 · Unlock unlimited</h3>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-white/60">
        Invite friends with your code. When <b>{REFERRAL_GOAL} of them buy the 12 Months plan</b>, you unlock
        unlimited photo & video generation, unlimited storage and 8K uploads — free, forever.
      </p>

      <div className="mt-4 flex items-center gap-1.5">
        {Array.from({ length: REFERRAL_GOAL }).map((_, i) => (
          <div key={i} className="h-1.5 flex-1 rounded-full"
            style={{ background: i < progress ? "linear-gradient(90deg,#d4af37,#f5e6b3)" : "rgba(255,255,255,0.12)" }} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {progress} of {REFERRAL_GOAL} friends on 12 Months</span>
        {unlimitedMedia && (
          <span className="flex items-center gap-1 font-semibold" style={{ color: "#f5e6b3" }}>
            <InfinityIcon className="h-3 w-3" /> Unlimited unlocked
          </span>
        )}
      </div>

      {code && (
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 truncate rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-sm tracking-widest" style={{ color: "#f5e6b3" }}>
            {code}
          </div>
          <button onClick={share} className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-black active:scale-95"
            style={{ background: "linear-gradient(135deg,#f5e6b3,#d4af37)" }}>
            <Copy className="h-3.5 w-3.5" /> Share
          </button>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <input
          value={entry}
          onChange={(e) => setEntry(e.target.value.toUpperCase())}
          placeholder="Have an invite code?"
          className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-white placeholder:text-white/35 outline-none focus:border-[#d4af37]/50"
        />
        <button disabled={busy || !entry.trim()} onClick={applyCode}
          className="rounded-xl border border-white/15 px-3.5 py-2.5 text-xs text-white/80 active:scale-95 disabled:opacity-40">
          Apply
        </button>
      </div>
    </div>
  );
}

function ManageMenu({ subscription, onChange }: { subscription: NonNullable<ReturnType<typeof usePremium>["subscription"]>; onChange: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const toggleRenew = async () => {
    setBusy(true);
    await supabase.from("subscriptions").update({ auto_renew: !subscription.auto_renew }).eq("id", subscription.id);
    await onChange();
    setBusy(false);
    toast.success(subscription.auto_renew ? "Auto-renew turned off" : "Auto-renew turned on");
  };
  const cancel = async () => {
    setBusy(true);
    await supabase.from("subscriptions").update({ status: "cancelled", auto_renew: false, cancelled_at: new Date().toISOString() }).eq("id", subscription.id);
    await onChange();
    setBusy(false);
    toast.success("Subscription cancelled. Access remains until expiry.");
  };
  return (
    <div className="flex flex-col gap-2">
      <button disabled={busy} onClick={toggleRenew} className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/80 active:scale-95">
        {subscription.auto_renew ? "Turn off auto-renew" : "Turn on auto-renew"}
      </button>
      {subscription.status === "active" && (
        <button disabled={busy} onClick={cancel} className="rounded-full border border-red-400/30 px-3 py-1.5 text-[11px] text-red-300 active:scale-95">
          Cancel
        </button>
      )}
    </div>
  );
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function CheckoutSheet({ plan, currency, onClose, onSuccess }: { plan: ReturnType<typeof getPlan>; currency: Currency; onClose: () => void; onSuccess: () => Promise<void> }) {
  const { user } = useAuthUser();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"pay" | "processing" | "done">("pay");

  const price = currency === "INR" ? plan.priceINR : plan.priceUSD;

  const pay = async () => {
    if (!user) return;
    try {
      setProcessing(true);
      setStep("processing");

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Could not load payment gateway");

      const { createRazorpayOrder, verifyRazorpayPayment } = await import("@/lib/razorpay.functions");
      const order = await createRazorpayOrder({ data: { plan: plan.id, currency } });

      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Samsta Premium",
          description: plan.label,
          theme: { color: "#d4af37" },
          prefill: { email: user.email ?? undefined },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
          handler: async (response: any) => {
            try {
              await verifyRazorpayPayment({
                data: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              });
              resolve();
            } catch (e) {
              reject(e);
            }
          },
        });
        rzp.on("payment.failed", (resp: any) => reject(new Error(resp?.error?.description || "Payment failed")));
        rzp.open();
      });

      setStep("done");
      await new Promise((r) => setTimeout(r, 600));
      await onSuccess();
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
      setStep("pay");
    } finally {
      setProcessing(false);
    }
  };

  const methodBadges = currency === "INR"
    ? [{ i: Smartphone, l: "UPI" }, { i: CreditCard, l: "Cards" }, { i: Globe, l: "Net Banking" }]
    : [{ i: CreditCard, l: "Cards" }, { i: Apple, l: "Apple Pay" }, { i: Globe, l: "Google Pay" }];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-t-3xl border-t border-white/10 p-5 text-white animate-fade-up"
        style={{ background: "linear-gradient(180deg, #14100a 0%, #050505 100%)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl italic" style={{ color: "#f5e6b3" }}>Secure Checkout</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 active:scale-95"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-4 rounded-2xl border border-[#d4af37]/30 bg-black/40 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/50 uppercase tracking-widest">Samsta Premium</div>
              <div className="mt-1 font-display text-lg">{plan.label}</div>
            </div>
            <div className="font-display text-2xl" style={{ color: "#f5e6b3" }}>{formatPrice(currency, price)}</div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2">Payment methods</div>
          <div className="flex flex-wrap gap-2">
            {methodBadges.map((m) => (
              <span key={m.l} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70">
                <m.i className="h-3.5 w-3.5" /> {m.l}
              </span>
            ))}
          </div>
        </div>

        <button
          disabled={processing}
          onClick={pay}
          className="mt-6 w-full rounded-full py-4 text-sm font-semibold text-black transition active:scale-[0.98] disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #f5e6b3, #d4af37 50%, #b8860b)" }}
        >
          {step === "pay" && `Pay ${formatPrice(currency, price)}`}
          {step === "processing" && "Opening secure checkout…"}
          {step === "done" && "Unlocking premium…"}
        </button>
        <p className="mt-2 text-center text-[10px] text-white/40">
          Payments processed securely by Razorpay. 256-bit SSL encrypted.
        </p>
      </div>
    </div>
  );
}

