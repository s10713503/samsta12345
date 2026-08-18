// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { createHmac } from "crypto";

export type VerifyResult = {
  ok: boolean;
  confidence: number; // 0-100
  reason: string;
  extracted?: Record<string, string>;
};

const SYSTEM = `You are Samsta's identity & credential verification engine.
You receive claimed details typed by a user and (optionally) an uploaded document/photo image.
Read the document carefully (OCR) and decide if the claimed details truly match the document.
Rules:
- If no image is provided, ok must be false with reason "Document image required".
- Names match if they are the same person allowing for case, middle names, initials and spacing.
- ID numbers must match after removing spaces/dashes. A single wrong character means NO match.
- If the image is not a real credential/document (screenshot, meme, blank, unreadable), ok=false.
Output ONLY valid JSON: {"ok":boolean,"confidence":number 0-100,"reason":"short user-facing sentence","extracted":{"name":string,"idNumber":string,"dob":string,"expiry":string,"issuer":string}}`;

function secret() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.LOVABLE_API_KEY ||
    "samsta-verify-fallback"
  );
}

function codeFor(target: string, slot: number) {
  const h = createHmac("sha256", secret()).update(`${target}|${slot}`).digest("hex");
  return String(parseInt(h.slice(0, 8), 16) % 1000000).padStart(6, "0");
}

const SLOT_MS = 5 * 60 * 1000; // code valid for current + previous 5-min slot

/** Verify typed credentials against an uploaded document image. */
export const verifyCredential = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = (input ?? {}) as any;
    const image = typeof d.image === "string" ? d.image : "";
    return {
      step: String(d.step ?? "gov").slice(0, 24),
      label: String(d.label ?? "Credential").slice(0, 60),
      fields: (Array.isArray(d.fields) ? d.fields : [])
        .slice(0, 8)
        .map((f: any) => ({ label: String(f?.label ?? "").slice(0, 60), value: String(f?.value ?? "").slice(0, 200) })),
      image: image.startsWith("data:image/") && image.length < 8_000_000 ? image : "",
    };
  })
  .handler(async ({ data }): Promise<VerifyResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Verification service unavailable");

    const claimed = data.fields.filter((f) => f.value.trim()).map((f) => `${f.label}: ${f.value}`).join("\n");
    if (!claimed) return { ok: false, confidence: 0, reason: "Please enter your details first." };
    if (!data.image) return { ok: false, confidence: 0, reason: "Upload a clear photo of your document." };

    const content: any[] = [
      { type: "text", text: `Verification type: ${data.label}\nClaimed details:\n${claimed}\n\nCompare with the attached document image and return JSON only.` },
      { type: "image_url", image_url: { url: data.image } },
    ];

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) throw new Error("Too many attempts — try again in a moment.");
    if (r.status === 402) throw new Error("Verification credits exhausted.");
    if (!r.ok) throw new Error(`Verification failed (${r.status})`);

    const json = await r.json();
    const text = String(json.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
    let p: any = {};
    try {
      p = JSON.parse(text);
    } catch {
      return { ok: false, confidence: 0, reason: "Could not read the document. Try a sharper photo." };
    }
    const conf = Math.max(0, Math.min(100, Math.round(Number(p.confidence) || 0)));
    const ok = !!p.ok && conf >= 60;
    return {
      ok,
      confidence: conf,
      reason: String(p.reason ?? (ok ? "Credentials match the document." : "Details do not match the document.")).slice(0, 240),
      extracted: p.extracted && typeof p.extracted === "object"
        ? Object.fromEntries(Object.entries(p.extracted).slice(0, 6).map(([k, v]) => [k, String(v ?? "").slice(0, 120)]))
        : undefined,
    };
  });

/** Issue a 6-digit OTP for a phone or email. */
export const requestOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = (input ?? {}) as any;
    return {
      channel: d.channel === "email" ? "email" : "phone",
      target: String(d.target ?? "").trim().slice(0, 160),
    };
  })
  .handler(async ({ data }) => {
    const t = data.target;
    const valid = data.channel === "email"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)
      : /^\+?\d{8,15}$/.test(t.replace(/[\s-]/g, ""));
    if (!valid) throw new Error(data.channel === "email" ? "Enter a valid email address." : "Enter a valid mobile number.");
    const norm = data.channel === "email" ? t.toLowerCase() : t.replace(/[\s-]/g, "");
    const code = codeFor(`${data.channel}:${norm}`, Math.floor(Date.now() / SLOT_MS));
    // No SMS/email provider is connected yet, so the code is surfaced in-app.
    return { sent: true, target: norm, code, expiresInSec: 300 };
  });

/** Confirm an OTP issued by requestOtp. */
export const confirmOtp = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = (input ?? {}) as any;
    return {
      channel: d.channel === "email" ? "email" : "phone",
      target: String(d.target ?? "").trim().slice(0, 160),
      code: String(d.code ?? "").replace(/\D/g, "").slice(0, 6),
    };
  })
  .handler(async ({ data }): Promise<VerifyResult> => {
    const norm = data.channel === "email" ? data.target.toLowerCase() : data.target.replace(/[\s-]/g, "");
    if (data.code.length !== 6) return { ok: false, confidence: 0, reason: "Enter the 6-digit code." };
    const slot = Math.floor(Date.now() / SLOT_MS);
    const ok = data.code === codeFor(`${data.channel}:${norm}`, slot) || data.code === codeFor(`${data.channel}:${norm}`, slot - 1);
    return {
      ok,
      confidence: ok ? 100 : 0,
      reason: ok ? "Code verified." : "Wrong or expired code.",
    };
  });
