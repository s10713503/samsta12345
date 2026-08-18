// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";

export type PredictInput = {
  kind: "post" | "reel" | "story";
  caption: string;
  hasMedia: boolean;
  mediaCount: number;
  hasVideo: boolean;
  location?: string;
  niche?: string;
};

export type PredictResult = {
  viralProbability: number; // 0-100
  reachEstimate: { low: number; high: number };
  captionScore: number; // 0-100
  hookScore: number; // 0-100
  thumbnailScore: number; // 0-100
  bestPostTime: { weekday: string; time: string };
  tier: "Very Low" | "Low" | "Moderate" | "Strong" | "Very Strong";
  strengths: string[];
  improvements: string[];
  betterCaption: string;
};

const SYSTEM = `You are Samsta's AI Future+ engine — a viral-prediction model for social media posts.
You output ONLY valid JSON matching the requested schema, no prose, no markdown, no code fences.
Estimate honestly. If the caption is empty or the post is thin, give low scores.
Reach estimates should be conservative ranges for a small/medium creator (0-50k followers).
bestPostTime.weekday must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
bestPostTime.time must be 24h HH:MM in IST.
tier must exactly match the viralProbability band: 0-19 Very Low, 20-39 Low, 40-59 Moderate, 60-79 Strong, 80-100 Very Strong.
strengths: 2-4 short bullets. improvements: 3-5 short actionable bullets.
betterCaption: a rewritten caption <= 220 chars, punchier hook, 2-4 relevant hashtags.`;

function schemaHint() {
  return `{
  "viralProbability": number 0-100,
  "reachEstimate": { "low": number, "high": number },
  "captionScore": number 0-100,
  "hookScore": number 0-100,
  "thumbnailScore": number 0-100,
  "bestPostTime": { "weekday": string, "time": "HH:MM" },
  "tier": "Very Low"|"Low"|"Moderate"|"Strong"|"Very Strong",
  "strengths": string[],
  "improvements": string[],
  "betterCaption": string
}`;
}

export const predictPost = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = input as PredictInput;
    if (!d || typeof d !== "object") throw new Error("Invalid input");
    return {
      kind: d.kind === "reel" || d.kind === "story" ? d.kind : "post",
      caption: String(d.caption ?? "").slice(0, 2000),
      hasMedia: !!d.hasMedia,
      mediaCount: Math.max(0, Math.min(20, Number(d.mediaCount ?? 0))),
      hasVideo: !!d.hasVideo,
      location: d.location ? String(d.location).slice(0, 120) : "",
      niche: d.niche ? String(d.niche).slice(0, 60) : "",
    } satisfies PredictInput;
  })
  .handler(async ({ data }): Promise<PredictResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const user = `Predict virality for this ${data.kind}.
Caption: """${data.caption || "(empty)"}"""
Media attached: ${data.hasMedia ? `${data.mediaCount} file(s), ${data.hasVideo ? "video" : "image only"}` : "none"}
Location: ${data.location || "—"}
Niche: ${data.niche || "general"}

Return JSON only. Schema:
${schemaHint()}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) throw new Error("Rate limit — try again in a moment.");
    if (r.status === 402) throw new Error("credits exhausted. Add credits in workspace billing.");
    if (!r.ok) throw new Error(`error ${r.status}`);
    const json = await r.json();
    const text = String(json.choices?.[0]?.message?.content ?? "").trim();
    const cleaned = text.replace(/^```json\s*|\s*```$/g, "");
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("returned invalid JSON");
    }

    const clamp = (n: any, lo = 0, hi = 100) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return lo;
      return Math.max(lo, Math.min(hi, Math.round(v)));
    };
    const vp = clamp(parsed.viralProbability);
    const tier =
      vp >= 80 ? "Very Strong" :
      vp >= 60 ? "Strong" :
      vp >= 40 ? "Moderate" :
      vp >= 20 ? "Low" : "Very Low";

    const toArr = (a: any, cap: number) =>
      Array.isArray(a) ? a.filter((x) => typeof x === "string").slice(0, cap) : [];

    return {
      viralProbability: vp,
      reachEstimate: {
        low: Math.max(0, Math.round(Number(parsed?.reachEstimate?.low ?? 0))),
        high: Math.max(0, Math.round(Number(parsed?.reachEstimate?.high ?? 0))),
      },
      captionScore: clamp(parsed.captionScore),
      hookScore: clamp(parsed.hookScore),
      thumbnailScore: clamp(parsed.thumbnailScore),
      bestPostTime: {
        weekday: String(parsed?.bestPostTime?.weekday ?? "Friday").slice(0, 12),
        time: String(parsed?.bestPostTime?.time ?? "19:30").slice(0, 5),
      },
      tier,
      strengths: toArr(parsed.strengths, 4),
      improvements: toArr(parsed.improvements, 5),
      betterCaption: String(parsed.betterCaption ?? "").slice(0, 400),
    };
  });