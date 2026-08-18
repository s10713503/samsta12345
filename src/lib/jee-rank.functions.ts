// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";

export type JeeRankInput = {
  exam: "main" | "advanced";
  score: number;          // marks obtained (raw or percentile)
  scoreType: "marks" | "percentile";
  category: "General" | "OBC" | "EWS" | "SC" | "ST" | "PwD";
  gender: "Male" | "Female";
  homeState: string;
  attempt: number;
  pdfBase64?: string;     // optional question paper (base64, no data: prefix)
  pdfName?: string;
};

export type JeeRankResult = {
  predictedAIR: { low: number; high: number };
  categoryRank: { low: number; high: number };
  percentile: number;
  confidence: number;                       // 0-100
  verdict: "🎯 Very Strong" | "✅ Strong" | "⚠️ Borderline" | "❌ Weak";
  paperDifficulty?: "Very Easy" | "Easy" | "Moderate" | "Hard" | "Very Hard";
  paperInsight?: string;
  historicalTrend: string[];                // 3-5 short bullets vs previous years
  topColleges: Array<{ name: string; branch: string; chance: string }>;
  possibleBranches: string[];
  improvementPlan: string[];
  savePayload: string;                      // JSON string for local save
};

const SYSTEM = `You are Samsta's IIT JEE Rank Predictor — an expert quant model trained on JOSAA + JEE trend data (2015-2025).
You output ONLY valid JSON matching the schema. No prose, no markdown, no code fences.
Be realistic and conservative. Base predictions on: score, category, gender quota, home-state quota, exam difficulty, and previous-year cutoffs.
If a question paper PDF is provided, analyse its overall difficulty vs previous years and let that shift the predicted AIR band accordingly (harder paper → better rank at same marks, easier paper → worse rank).
Always mention 4-6 realistic IIT/NIT/IIIT college+branch options with their opening/closing rank bands and admission chance ("High" / "Moderate" / "Low").
verdict must match confidence: >=80 "🎯 Very Strong", >=60 "✅ Strong", >=40 "⚠️ Borderline", else "❌ Weak".`;

function schema() {
  return `{
  "predictedAIR": {"low": number, "high": number},
  "categoryRank": {"low": number, "high": number},
  "percentile": number,
  "confidence": number 0-100,
  "verdict": "🎯 Very Strong"|"✅ Strong"|"⚠️ Borderline"|"❌ Weak",
  "paperDifficulty": "Very Easy"|"Easy"|"Moderate"|"Hard"|"Very Hard",
  "paperInsight": string,
  "historicalTrend": string[],
  "topColleges": [{"name": string, "branch": string, "chance": string}],
  "possibleBranches": string[],
  "improvementPlan": string[]
}`;
}

export const predictJeeRank = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => {
    const d = raw as JeeRankInput;
    if (!d) throw new Error("Invalid input");
    return {
      exam: d.exam === "advanced" ? "advanced" : "main",
      score: Math.max(0, Number(d.score) || 0),
      scoreType: d.scoreType === "percentile" ? "percentile" : "marks",
      category: (["General","OBC","EWS","SC","ST","PwD"].includes(d.category as any) ? d.category : "General") as any,
      gender: d.gender === "Female" ? "Female" : "Male",
      homeState: String(d.homeState || "—").slice(0, 60),
      attempt: Math.max(1, Math.min(3, Number(d.attempt) || 1)),
      pdfBase64: d.pdfBase64 ? String(d.pdfBase64).slice(0, 8_000_000) : undefined,
      pdfName: d.pdfName ? String(d.pdfName).slice(0, 120) : undefined,
    } satisfies JeeRankInput;
  })
  .handler(async ({ data }): Promise<JeeRankResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const userText = `Predict IIT JEE ${data.exam.toUpperCase()} rank.
Score: ${data.score} (${data.scoreType})
Category: ${data.category}
Gender: ${data.gender}
Home state: ${data.homeState}
Attempt: ${data.attempt}
Paper attached: ${data.pdfBase64 ? `YES — ${data.pdfName || "paper.pdf"}. Analyse its difficulty vs previous years and factor into the rank band.` : "no"}

Return JSON only. Schema:
${schema()}`;

    const content: any[] = [{ type: "text", text: userText }];
    if (data.pdfBase64) {
      content.push({
        type: "file",
        file: {
          filename: data.pdfName || "paper.pdf",
          file_data: `data:application/pdf;base64,${data.pdfBase64}`,
        },
      });
    }

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
    if (r.status === 429) throw new Error("Rate limit — try again shortly.");
    if (r.status === 402) throw new Error("credits exhausted. Add credits in workspace billing.");
    if (!r.ok) throw new Error(`error ${r.status}: ${await r.text().catch(() => "")}`);

    const json = await r.json();
    const text = String(json.choices?.[0]?.message?.content ?? "").trim().replace(/^```json\s*|\s*```$/g, "");
    let p: any;
    try { p = JSON.parse(text); } catch { throw new Error("returned invalid JSON"); }

    const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
    const clamp = (v: any, lo: number, hi: number) => Math.max(lo, Math.min(hi, num(v, lo)));
    const arr = (v: any, cap: number) => Array.isArray(v) ? v.slice(0, cap) : [];

    const confidence = clamp(p.confidence, 0, 100);
    const verdict =
      confidence >= 80 ? "🎯 Very Strong" :
      confidence >= 60 ? "✅ Strong" :
      confidence >= 40 ? "⚠️ Borderline" : "❌ Weak";

    const result: JeeRankResult = {
      predictedAIR: { low: Math.max(1, Math.round(num(p?.predictedAIR?.low, 1))), high: Math.max(1, Math.round(num(p?.predictedAIR?.high, 100))) },
      categoryRank: { low: Math.max(1, Math.round(num(p?.categoryRank?.low, 1))), high: Math.max(1, Math.round(num(p?.categoryRank?.high, 100))) },
      percentile: clamp(p.percentile, 0, 100),
      confidence,
      verdict,
      paperDifficulty: p.paperDifficulty && ["Very Easy","Easy","Moderate","Hard","Very Hard"].includes(p.paperDifficulty) ? p.paperDifficulty : undefined,
      paperInsight: p.paperInsight ? String(p.paperInsight).slice(0, 800) : undefined,
      historicalTrend: arr(p.historicalTrend, 6).map((x: any) => String(x).slice(0, 240)),
      topColleges: arr(p.topColleges, 8).map((c: any) => ({
        name: String(c?.name || "").slice(0, 100),
        branch: String(c?.branch || "").slice(0, 100),
        chance: String(c?.chance || "").slice(0, 30),
      })),
      possibleBranches: arr(p.possibleBranches, 10).map((x: any) => String(x).slice(0, 60)),
      improvementPlan: arr(p.improvementPlan, 8).map((x: any) => String(x).slice(0, 240)),
      savePayload: "",
    };
    result.savePayload = JSON.stringify({ input: data, output: result, at: Date.now() });
    return result;
  });