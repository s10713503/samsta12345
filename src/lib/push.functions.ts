import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Public VAPID key so the browser can subscribe to push. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: process.env["VAPID_PUBLIC_KEY"] ?? "" };
});

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(str: string): Uint8Array {
  const pad = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

/** Sign a VAPID JWT for one push origin. */
async function vapidHeader(audience: string) {
  const pub = process.env["VAPID_PUBLIC_KEY"]!;
  const priv = process.env["VAPID_PRIVATE_KEY"]!;
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:support@samsta.app";
  const raw = fromB64url(pub);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: priv,
    x: b64url(raw.slice(1, 33)),
    y: b64url(raw.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject }),
    ),
  );
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return { authorization: `vapid t=${header}.${payload}.${b64url(sig)}, k=${pub}` };
}

/**
 * Send a payload-less web push to every device of a user. The service worker
 * shows the alert, so it arrives even when the app is closed.
 */
export const sendFollowPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { recipientId: string; kind: string }) => input)
  .handler(async ({ data }) => {
    if (!process.env["VAPID_PRIVATE_KEY"]) return { sent: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const prefColumn =
      data.kind === "follow_accepted"
        ? "follow_approved_push"
        : data.kind === "follow_declined"
          ? "follow_declined_push"
          : "follow_request_push";

    const { data: prefs } = await supabaseAdmin
      .from("notification_settings")
      .select(prefColumn)
      .eq("user_id", data.recipientId)
      .maybeSingle();
    if (prefs && (prefs as Record<string, unknown>)[prefColumn] === false) return { sent: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint")
      .eq("user_id", data.recipientId);
    if (!subs?.length) return { sent: 0 };

    let sent = 0;
    for (const sub of subs) {
      try {
        const url = new URL(sub.endpoint as string);
        const { authorization } = await vapidHeader(url.origin);
        const res = await fetch(sub.endpoint as string, {
          method: "POST",
          headers: { Authorization: authorization, TTL: "86400", "Content-Length": "0" },
        });
        if (res.status === 404 || res.status === 410) {
          await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id as string);
        } else if (res.ok) {
          sent += 1;
        }
      } catch {
        /* one dead device must not stop the rest */
      }
    }
    return { sent };
  });
