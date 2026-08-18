// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** One-time fee (in INR) that unlocks unlimited role/opportunity publishing. */
export const PUBLISH_UNLOCK_INR = 250;

function basicAuth(id: string, secret: string) {
  return "Basic " + btoa(`${id}:${secret}`);
}

/** Has this account already paid the one-time publish fee? */
export const getPublishAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("publisher_unlocks")
      .select("created_at, amount, currency")
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      unlocked: !!data,
      since: data?.created_at ?? null,
      priceINR: PUBLISH_UNLOCK_INR,
    };
  });

export const createPublishUnlockOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !keySecret) throw new Error("Razorpay is not configured");

    const { data: existing } = await context.supabase
      .from("publisher_unlocks")
      .select("id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) return { already: true as const };

    const amountMinor = PUBLISH_UNLOCK_INR * 100;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: basicAuth(keyId, keySecret) },
      body: JSON.stringify({
        amount: amountMinor,
        currency: "INR",
        receipt: `pub_${context.userId.slice(0, 8)}_${Date.now()}`,
        notes: { user_id: context.userId, plan: "publish_unlock" },
      }),
    });
    if (!res.ok) {
      console.error("razorpay publish order failed", res.status, await res.text());
      throw new Error("Could not create payment order");
    }
    const order = await res.json();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payment_orders").insert({
      user_id: context.userId,
      provider: "razorpay",
      plan: "publish_unlock",
      amount: PUBLISH_UNLOCK_INR,
      currency: "INR",
      order_id: order.id,
      status: "created",
      meta: { kind: "publish_unlock" },
    });

    return {
      already: false as const,
      orderId: order.id as string,
      keyId,
      amount: amountMinor,
      currency: "INR" as const,
    };
  });

export const verifyPublishUnlockPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        razorpay_order_id: z.string(),
        razorpay_payment_id: z.string(),
        razorpay_signature: z.string(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keySecret) throw new Error("Razorpay is not configured");

    const { createHmac, timingSafeEqual } = await import("crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpay_order_id}|${data.razorpay_payment_id}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpay_signature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid payment signature");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("payment_orders")
      .select("*")
      .eq("order_id", data.razorpay_order_id)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.user_id !== context.userId) throw new Error("Order does not belong to user");
    if (order.plan !== "publish_unlock") throw new Error("Wrong order type");

    await supabaseAdmin
      .from("payment_orders")
      .update({ payment_id: data.razorpay_payment_id, signature: data.razorpay_signature, status: "paid" })
      .eq("id", order.id);

    await supabaseAdmin.from("publisher_unlocks").upsert(
      {
        user_id: context.userId,
        email: context.claims?.email ?? null,
        amount: PUBLISH_UNLOCK_INR,
        currency: "INR",
        provider: "razorpay",
        provider_ref: data.razorpay_payment_id,
      },
      { onConflict: "user_id" }
    );

    return { ok: true as const };
  });
