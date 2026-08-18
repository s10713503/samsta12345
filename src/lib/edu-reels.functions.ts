// AI-moderated educational reel submission.
// Client uploads video to storage, then calls submitEduReel with caption + hashtags + path.
// Server classifies with Lovable AI Gateway (Gemini) and sets moderation_status.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type SubmitInput = {
  caption: string;
  hashtags: string[];
  bucket: string;
  video_path: string;
  thumb_bucket?: string | null;
  thumb_path?: string | null;
  duration_sec?: number | null;
};

type ClassifierResult = {
  educational: boolean;
  score: number; // 0-100
  labels: string[];
  reason: string;
  confidence: "high" | "medium" | "low";
};

async function classifyEducational(caption: string, hashtags: string[]): Promise<ClassifierResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    return { educational: false, score: 0, labels: [], reason: "moderator unavailable", confidence: "low" };
  }
  const system =
    "You are a strict content moderator for an EDUCATION-ONLY short-video feed. " +
    "Approve ONLY reels whose caption/hashtags clearly indicate learning: tutorials, " +
    "explainers, science, math, coding, language, history, career, study tips, DIY skills, " +
    "how-tos, book/knowledge reviews, or lectures. " +
    "REJECT: pranks, dance/lip-sync, thirst traps, gossip, memes without teaching value, " +
    "product-only ads, sexual content, violence, alcohol/drug promotion, gambling, hate. " +
    "Respond ONLY with valid JSON matching the schema — no prose, no markdown.";
  const user = JSON.stringify({ caption, hashtags });
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
            educational: { type: "boolean" },
            score: { type: "integer", minimum: 0, maximum: 100 },
            labels: { type: "array", items: { type: "string" } },
            reason: { type: "string" },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["educational", "score", "labels", "reason", "confidence"],
        },
      },
    },
    temperature: 0.1,
  };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("moderator HTTP", res.status, txt);
      return { educational: false, score: 0, labels: [], reason: `Moderator error ${res.status}`, confidence: "low" };
    }
    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    return {
      educational: !!parsed.educational,
      score: Number(parsed.score ?? 0),
      labels: Array.isArray(parsed.labels) ? parsed.labels : [],
      reason: String(parsed.reason ?? ""),
      confidence: (parsed.confidence as ClassifierResult["confidence"]) ?? "low",
    };
  } catch (e: any) {
    console.error("moderator error", e?.message);
    return { educational: false, score: 0, labels: [], reason: "Moderator crashed", confidence: "low" };
  }
}

export const submitEduReel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const d = input as SubmitInput;
    if (!d || typeof d !== "object") throw new Error("Invalid input");
    if (!d.video_path || typeof d.video_path !== "string") throw new Error("video_path required");
    if (!d.bucket || typeof d.bucket !== "string") throw new Error("bucket required");
    return {
      caption: String(d.caption ?? ""),
      hashtags: Array.isArray(d.hashtags) ? d.hashtags.map(String) : [],
      bucket: d.bucket,
      video_path: d.video_path,
      thumb_bucket: d.thumb_bucket ?? null,
      thumb_path: d.thumb_path ?? null,
      duration_sec: d.duration_sec ?? null,
    } as SubmitInput;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const verdict = await classifyEducational(data.caption, data.hashtags);

    // Approve ≥70 high/medium; review 40-69; reject <40 or non-educational
    let status: "approved" | "rejected" | "review" = "review";
    if (verdict.educational && verdict.score >= 70) status = "approved";
    else if (!verdict.educational || verdict.score < 40) status = "rejected";

    const { data: row, error } = await (supabase as any)
      .from("education_reels")
      .insert({
        author_id: userId,
        caption: data.caption || null,
        hashtags: data.hashtags,
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

// Admin/moderator manual override
export const setEduReelStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const d = input as { id: string; status: string; reason?: string };
    if (!d?.id || !d?.status) throw new Error("id + status required");
    if (!["approved", "rejected", "review", "pending"].includes(d.status)) throw new Error("bad status");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify caller is admin or moderator
    const { data: isAdmin } = await (supabase as any).rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isMod } = await (supabase as any).rpc("has_role", { _user_id: userId, _role: "moderator" });
    if (!isAdmin && !isMod) throw new Error("Forbidden");
    const { error } = await (supabase as any)
      .from("education_reels")
      .update({
        moderation_status: data.status,
        moderation_reason: data.reason ?? null,
        moderator_id: userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
