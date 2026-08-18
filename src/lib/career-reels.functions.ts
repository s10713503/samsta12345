// AI-moderated career/business reel submission.
// Client uploads video to storage, then calls submitCareerReel with caption + hashtags + path.
// Server classifies with Lovable AI Gateway; entertainment reels are auto-rejected and deleted.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SubmitInput = {
  caption: string;
  hashtags: string[];
  category: "career" | "business";
  bucket: string;
  video_path: string;
  thumb_bucket?: string | null;
  thumb_path?: string | null;
  duration_sec?: number | null;
};

type ClassifierResult = {
  career_or_business: boolean;
  score: number;
  labels: string[];
  reason: string;
  confidence: "high" | "medium" | "low";
};

async function classifyCareerBusiness(caption: string, hashtags: string[], category: string): Promise<ClassifierResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return { career_or_business: false, score: 0, labels: [], reason: "moderator unavailable", confidence: "low" };
  }
  const system =
    "You are a strict content moderator for a CAREER & BUSINESS short-video feed. " +
    "Approve ONLY reels whose caption/hashtags clearly indicate career or business value: " +
    "job tips, interviews, hiring, resumes, workplace skills, leadership, entrepreneurship, " +
    "startups, marketing, sales, finance/investing, product, engineering, professional growth, " +
    "industry insights, company culture, case studies, B2B, SaaS, freelancing, side hustles. " +
    "REJECT (this is ENTERTAINMENT): dance, lip-sync, pranks, memes without business insight, " +
    "vlogs, comedy, celebrity gossip, music/movie clips, gaming for fun, thirst traps, " +
    "sexual content, violence, alcohol/drugs, gambling, hate. " +
    "Respond ONLY with valid JSON matching the schema — no prose, no markdown.";
  const user = JSON.stringify({ caption, hashtags, requested_category: category });
  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "moderation",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            career_or_business: { type: "boolean" },
            score: { type: "integer", minimum: 0, maximum: 100 },
            labels: { type: "array", items: { type: "string" } },
            reason: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["career_or_business", "score", "labels", "reason", "confidence"],
        },
      },
    },
    temperature: 0.1,
  };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Career reel moderator HTTP", res.status, txt);
      return { career_or_business: false, score: 0, labels: [], reason: `Moderator error ${res.status}`, confidence: "low" };
    }
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return {
      career_or_business: !!parsed.career_or_business,
      score: Number(parsed.score ?? 0),
      labels: Array.isArray(parsed.labels) ? parsed.labels : [],
      reason: String(parsed.reason ?? ""),
      confidence: (parsed.confidence as ClassifierResult["confidence"]) ?? "low",
    };
  } catch (e: any) {
    console.error("Career reel moderator error", e?.message);
    return { career_or_business: false, score: 0, labels: [], reason: "Moderator crashed", confidence: "low" };
  }
}

export const submitCareerReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const d = input as SubmitInput;
    if (!d || typeof d !== "object") throw new Error("Invalid input");
    if (!d.video_path || typeof d.video_path !== "string") throw new Error("video_path required");
    if (!d.bucket || typeof d.bucket !== "string") throw new Error("bucket required");
    const cat = d.category === "business" ? "business" : "career";
    return {
      caption: String(d.caption ?? ""),
      hashtags: Array.isArray(d.hashtags) ? d.hashtags.map(String) : [],
      category: cat as "career" | "business",
      bucket: d.bucket,
      video_path: d.video_path,
      thumb_bucket: d.thumb_bucket ?? null,
      thumb_path: d.thumb_path ?? null,
      duration_sec: d.duration_sec ?? null,
    } as SubmitInput;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const verdict = await classifyCareerBusiness(data.caption, data.hashtags, data.category);

    // Approve ≥70; reject <40 or off-topic (entertainment); review otherwise
    let status: "approved" | "rejected" | "review" = "review";
    if (verdict.career_or_business && verdict.score >= 70) status = "approved";
    else if (!verdict.career_or_business || verdict.score < 40) status = "rejected";

    // If rejected as entertainment, delete the uploaded video from storage
    if (status === "rejected") {
      try {
        await (supabase as any).storage.from(data.bucket).remove([data.video_path]);
        if (data.thumb_bucket && data.thumb_path) {
          await (supabase as any).storage.from(data.thumb_bucket).remove([data.thumb_path]);
        }
      } catch (e) {
        console.error("Failed to remove rejected career reel storage object", e);
      }
      return { reel: null, verdict, status };
    }

    const { data: row, error } = await (supabase as any)
      .from("career_reels")
      .insert({
        author_id: userId,
        caption: data.caption || null,
        hashtags: data.hashtags,
        category: data.category,
        bucket: data.bucket,
        video_path: data.video_path,
        thumb_bucket: data.thumb_bucket,
        thumb_path: data.thumb_path,
        duration_sec: data.duration_sec,
        moderation_status: status,
        moderation_reason: verdict.reason,
        moderation_score: verdict.score,
        moderation_labels: verdict.labels,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { reel: row, verdict, status };
  });
