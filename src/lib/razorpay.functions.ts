// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLAN_PRICES: Record<string, { months: number; priceINR: number; priceUSD: number }> = {
  "1m": { months: 1, priceINR: 1999, priceUSD: 99.99 },
  "3m": { months: 3, priceINR: 5499, priceUSD: 279.99 },
  "6m": { months: 6, priceINR: 9999, priceUSD: 549.99 },
  "12m": { months: 12, priceINR: 17999, priceUSD: 999.99 },
};

function basicAuth(id: string, secret: string) {
  return "Basic " + btoa(`${id}:${secret}`);
}

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      plan: z.enum(["1m", "3m", "6m", "12m"]),
      currency: z.enum(["INR", "USD"]),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

    const info = PLAN_PRICES[data.plan];
    const amount = data.currency === "INR" ? info.priceINR : info.priceUSD;
    // Razorpay expects the smallest currency unit
    const amountMinor = Math.round(amount * 100);
    if (!Number.isFinite(amountMinor) || amountMinor < 100) {
      throw new Error("Amount must be at least 100 paise");
    }

    const receipt = `sam_${context.userId.slice(0, 8)}_${Date.now()}`;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: basicAuth(keyId, keySecret),
      },
      body: JSON.stringify({
        amount: amountMinor,
        currency: data.currency,
        receipt,
        notes: { user_id: context.userId, plan: data.plan },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("razorpay create order failed", res.status, text);
      throw new Error("Could not create payment order");
    }
    const order = await res.json();

    // Record pending order (admin so we can write regardless of RLS shape)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payment_orders").insert({
      user_id: context.userId,
      provider: "razorpay",
      plan: data.plan,
      amount,
      currency: data.currency,
      order_id: order.id,
      status: "created",
      meta: { receipt },
    });

    return {
      orderId: order.id as string,
      keyId,
      amount: amountMinor,
      currency: data.currency,
      plan: data.plan,
    };
  });

export const verifyRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay is not configured");

    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Invalid payment signature");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Load the order we recorded on creation
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("payment_orders")
      .select("*")
      .eq("order_id", data.razorpay_order_id)
      .maybeSingle();
    if (orderErr || !order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Order does not belong to user");

    // Idempotency
    if (order.status === "paid") {
      return { ok: true, already: true };
    }

    await supabaseAdmin
      .from("payment_orders")
      .update({
        payment_id: data.razorpay_payment_id,
        signature: data.razorpay_signature,
        status: "paid",
      })
      .eq("id", order.id);

    const info = PLAN_PRICES[order.plan as string];
    const now = new Date();
    const expires = new Date(now.getTime() + info.months * 30 * 24 * 60 * 60 * 1000);

    await supabaseAdmin.from("subscriptions").insert({
      user_id: context.userId,
      plan: order.plan,
      currency: order.currency,
      amount: order.amount,
      status: "active",
      auto_renew: true,
      provider: "razorpay",
      provider_ref: data.razorpay_payment_id,
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    return { ok: true };
  });
