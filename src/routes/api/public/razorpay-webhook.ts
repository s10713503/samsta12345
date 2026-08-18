// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/razorpay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) return new Response("Not configured", { status: 500 });

        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400 }); }

        const event: string = payload.event;
        const paymentEntity = payload?.payload?.payment?.entity;
        const orderId: string | undefined = paymentEntity?.order_id;
        const paymentId: string | undefined = paymentEntity?.id;

        if (!orderId) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let status: string | null = null;
        if (event === "payment.captured") status = "paid";
        else if (event === "payment.failed") status = "failed";
        else if (event === "refund.processed" || event === "refund.created") status = "refunded";

        if (status) {
          const { data: order } = await supabaseAdmin
            .from("payment_orders")
            .update({
              status,
              payment_id: paymentId ?? null,
              refund_status: status === "refunded" ? "refunded" : null,
              meta: { webhook_event: event },
            })
            .eq("order_id", orderId)
            .select("*")
            .maybeSingle();

          // On captured payment, activate premium immediately (idempotent).
          // Community creation fees are one-off and must never grant premium.
          if (status === "paid" && order && order.plan !== "community") {
            const PLAN_MONTHS: Record<string, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };
            const months = PLAN_MONTHS[order.plan as string] ?? 1;

            const { data: existing } = await supabaseAdmin
              .from("subscriptions")
              .select("id")
              .eq("provider_ref", paymentId ?? "")
              .maybeSingle();

            if (!existing) {
              const now = new Date();
              const expires = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);
              await supabaseAdmin.from("subscriptions").insert({
                user_id: order.user_id,
                plan: order.plan,
                currency: order.currency,
                amount: order.amount,
                status: "active",
                auto_renew: true,
                provider: "razorpay",
                provider_ref: paymentId,
                started_at: now.toISOString(),
                expires_at: expires.toISOString(),
              });
            }
          }

          if (status === "refunded" && order) {
            await supabaseAdmin
              .from("subscriptions")
              .update({ status: "cancelled", auto_renew: false, cancelled_at: new Date().toISOString() })
              .eq("provider_ref", paymentId ?? "");
          }
        }

        return new Response("ok");
      },
    },
  },
});
