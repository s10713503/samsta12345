// @ts-nocheck
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Lock, Loader2, Infinity as InfinityIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";

export const PUBLISH_FEE_INR = 250;

function loadRazorpay(): Promise<boolean> {
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

/** One-time ₹250 publish unlock, tied to the signed-in account. */
export function usePublishAccess() {
  const { user, loading: authLoading } = useAuthUser();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setUnlocked(false); setLoading(false); return; }
    try {
      const { getPublishAccess } = await import("@/lib/publish-access.functions");
      const res = await getPublishAccess();
      setUnlocked(!!res?.unlocked);
    } catch {
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { if (!authLoading) refresh(); }, [authLoading, refresh]);

  const purchase = useCallback(async () => {
    if (!user) { toast.error("Sign in first"); return; }
    setPaying(true);
    try {
      const mod = await import("@/lib/publish-access.functions");
      const order = await mod.createPublishUnlockOrder();
      if (order.already) { setUnlocked(true); return; }

      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load payment gateway");

      await new Promise<void>((resolve, reject) => {
        const rzp = new (window as any).Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          order_id: order.orderId,
          name: "Samsta Publisher Access",
          description: `One-time ₹${PUBLISH_FEE_INR} — unlimited role & opportunity publishing`,
          theme: { color: "#c9a34a" },
          prefill: { email: user.email ?? undefined },
          modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          handler: async (r: any) => {
            try {
              await mod.verifyPublishUnlockPayment({
                data: {
                  razorpay_order_id: r.razorpay_order_id,
                  razorpay_payment_id: r.razorpay_payment_id,
                  razorpay_signature: r.razorpay_signature,
                },
              });
              resolve();
            } catch (e) { reject(e); }
          },
        });
        rzp.on("payment.failed", (resp: any) => reject(new Error(resp?.error?.description || "Payment failed")));
        rzp.open();
      });

      setUnlocked(true);
      toast.success("Publisher access unlocked — publish unlimited roles.");
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  }, [user?.id]);

  return { unlocked, loading, paying, purchase, refresh };
}

/** Paywall card shown in place of publish forms until the fee is paid. */
export function PublishUnlockCard({
  paying,
  onPay,
  title = "Unlock publishing",
  note = "Publish job roles and business opportunities officially on Samsta.",
}: { paying: boolean; onPay: () => void; title?: string; note?: string }) {
  return (
    <div className="rounded-3xl border border-[#c9a34a]/40 bg-gradient-to-b from-[#1a1408]/80 to-black/40 p-6 text-center backdrop-blur-md animate-fade-up">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl shadow-xl"
        style={{ background: "linear-gradient(135deg,#f5e6b3,#c9a34a)" }}>
        <Lock className="h-7 w-7 text-black" strokeWidth={2.2} />
      </div>
      <h2 className="mt-4 font-display text-2xl italic" style={{ color: "#f5e6b3" }}>{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-xs text-white/60">{note}</p>

      <div className="mt-5 flex items-end justify-center gap-1">
        <span className="font-display text-4xl" style={{ color: "#f5e6b3" }}>₹{PUBLISH_FEE_INR}</span>
        <span className="pb-1 text-xs text-white/50">one-time</span>
      </div>

      <div className="mt-5 space-y-2 text-left">
        {[
          { I: InfinityIcon, t: "Unlimited role & opportunity posts — forever" },
          { I: BadgeCheck, t: "Official Samsta publisher badge on your listings" },
          { I: ShieldCheck, t: "Paid once for this account — never charged again" },
        ].map((f) => (
          <div key={f.t} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
            <f.I className="h-4 w-4 shrink-0" style={{ color: "#c9a34a" }} />
            <span className="text-xs text-white/80">{f.t}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onPay}
        disabled={paying}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-[#05070f] transition active:scale-[0.98] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#f5e6b3,#c9a34a)" }}
      >
        {paying ? <><Loader2 className="h-4 w-4 animate-spin" /> Opening secure checkout…</> : <>Pay ₹{PUBLISH_FEE_INR} & unlock</>}
      </button>
      <p className="mt-2 text-[10px] text-white/40">Secure payment · UPI, cards & net banking</p>
    </div>
  );
}
