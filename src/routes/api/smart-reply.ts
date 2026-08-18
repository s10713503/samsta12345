import { createFileRoute } from "@tanstack/react-router";

// Non-streaming JSON endpoint for Smart Reply intelligence:
//   mode = "analyze"   -> conversation type, tone, safety, suggested actions
//   mode = "followups" -> follow-up messages to keep the thread alive
//   mode = "quality"   -> quality scores for a draft reply

type Body = {
  mode: "analyze" | "followups" | "quality";
  incoming?: string;
  history?: string;
  draft?: string;
  attachment?: { data_url: string } | null;
};

const SYS_ANALYZE = `You are Samsta's Conversation Intelligence Engine.
Analyze the incoming message (and optional image) and return STRICT JSON only, no prose, no code fences.
Schema:
{
  "conversation_type": "friend" | "family" | "business" | "creator" | "customer",
  "tone": "happy" | "sad" | "angry" | "excited" | "confused" | "thankful" | "neutral",
  "language": "<ISO language name detected>",
  "summary": "<one short sentence describing what they said>",
  "suggested_actions": ["Agree" | "Decline" | "Thank You" | "Apologize" | "Congratulate" | "Schedule Meeting", ...],
  "safety": {
    "risk": "low" | "medium" | "high",
    "signals": ["<short reason>", "..."],
    "advice": "<one crisp sentence, empty string if risk=low>"
  }
}
Rules: pick 2-4 suggested_actions that fit. safety.risk is "high" for scams/phishing/leaked-secrets, "medium" for aggressive/manipulative content, otherwise "low".`;

const SYS_FOLLOWUPS = `You are Samsta's Smart Reply follow-up engine. Given the incoming message and (optionally) the reply the user is about to send, propose 4 short, natural next-message suggestions the user could send AFTER the reply to keep the conversation alive.
Return STRICT JSON only:
{ "followups": ["<= 12 words each", "...", "...", "..."] }`;

const SYS_QUALITY = `You are Samsta's Smart Reply quality grader. Grade the DRAFT reply against the incoming message on four axes 0-100 and return STRICT JSON only:
{ "politeness": <int>, "clarity": <int>, "confidence": <int>, "professionalism": <int>, "note": "<one sentence of feedback>" }`;

function userContent(body: Body): unknown {
  const parts: Array<Record<string, unknown>> = [];
  const label =
    body.mode === "analyze" ? "Incoming message" :
    body.mode === "followups" ? "Incoming message + our draft reply" :
    "Incoming message + our draft reply";
  const text =
    body.mode === "analyze"
      ? `${label}:\n${body.incoming ?? ""}\n\nRecent history (may be empty):\n${body.history ?? ""}`
      : body.mode === "followups"
        ? `Incoming:\n${body.incoming ?? ""}\n\nOur draft reply:\n${body.draft ?? ""}`
        : `Incoming:\n${body.incoming ?? ""}\n\nDraft reply:\n${body.draft ?? ""}`;
  parts.push({ type: "text", text });
  if (body.attachment?.data_url && body.mode === "analyze") {
    parts.push({ type: "image_url", image_url: { url: body.attachment.data_url } });
  }
  return parts;
}

export const Route = createFileRoute("/api/smart-reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as Body;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const system =
          body.mode === "analyze" ? SYS_ANALYZE :
          body.mode === "followups" ? SYS_FOLLOWUPS :
          body.mode === "quality" ? SYS_QUALITY :
          null;
        if (!system) return new Response("bad mode", { status: 400 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: system },
              { role: "user", content: userContent(body) },
            ],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          const status = upstream.status;
          let msg = text || "Smart Reply is unavailable";
          if (status === 429) msg = "Smart Reply is a little busy — try again in a moment.";
          if (status === 402) msg = "credits are exhausted. Please add credits to continue.";
          return new Response(msg, { status });
        }

        const json = (await upstream.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        // The model was asked for strict JSON; parse defensively.
        let parsed: unknown = {};
        try { parsed = JSON.parse(raw); } catch { parsed = { error: "parse_failed", raw }; }
        return new Response(JSON.stringify(parsed), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
