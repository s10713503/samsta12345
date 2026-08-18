import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the requester when a follow request is approved or declined — but only
 * if that person switched email delivery on for this kind of update.
 * Sending needs RESEND_API_KEY; without it the call is a safe no-op.
 */
export const sendFollowStatusEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        recipientId: z.string().uuid(),
        actorId: z.string().uuid(),
        kind: z.enum(["follow_accepted", "follow_declined"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Only the profile owner who acted may trigger this mail.
    if (data.actorId !== context.userId) return { sent: false, reason: "forbidden" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: prefs } = await supabaseAdmin
      .from("notification_settings")
      .select("follow_approved_email, follow_declined_email")
      .eq("user_id", data.recipientId)
      .maybeSingle();

    const wantsEmail =
      data.kind === "follow_accepted"
        ? !!prefs?.follow_approved_email
        : !!prefs?.follow_declined_email;
    if (!wantsEmail) return { sent: false, reason: "opted_out" };

    const [{ data: recipient }, { data: actor }] = await Promise.all([
      supabaseAdmin.from("profiles").select("email, username").eq("id", data.recipientId).maybeSingle(),
      supabaseAdmin.from("profiles").select("username, full_name").eq("id", data.actorId).maybeSingle(),
    ]);
    if (!recipient?.email) return { sent: false, reason: "no_email" };

    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) return { sent: false, reason: "email_provider_not_configured" };

    const who = actor?.username ?? actor?.full_name ?? "Someone";
    const approved = data.kind === "follow_accepted";
    const subject = approved
      ? `${who} approved your follow request`
      : `${who} declined your follow request`;
    const body = approved
      ? `<p>Good news — <strong>${who}</strong> approved your follow request on Samsta. Their posts, reels and stories are now in your feed.</p>`
      : `<p><strong>${who}</strong> declined your follow request on Samsta. Their posts stay private for now.</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Samsta <onboarding@resend.dev>",
        to: [recipient.email],
        subject,
        html: `${body}<p style="color:#888;font-size:12px">Manage these alerts in Samsta → Activity → Notification settings.</p>`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Resend failed [${res.status}]: ${text}`);
      return { sent: false, reason: `provider_error_${res.status}` };
    }
    return { sent: true };
  });
