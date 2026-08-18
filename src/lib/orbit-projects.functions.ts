// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";

export type ProjectBrief = {
  name: string;
  category?: string;
  summary?: string;
  description?: string;
  techStack?: string[];
  goals?: string;
  progress?: number;
};

export type ProjectAIResult = {
  summary: string;
  description: string;
  docs: string;
  roadmap: string;
  healthScore: number;
  innovationScore: number;
  careerReadiness: number;
  strengths: string[];
  risks: string[];
  suggestedTech: string[];
  notes: string;
};

const SYSTEM = `You are Samsta Orbit's AI Project Engine — it helps creators, students, researchers
and founders present their projects at a world-class standard.
Output ONLY valid JSON matching the requested schema. No prose, no markdown fences.
Write in confident, concrete, non-buzzword English.
- summary: one punchy line, max 140 chars.
- description: 3 short paragraphs separated by \\n\\n (problem, what it does, how it is built).
- docs: markdown documentation with ## Overview, ## Features, ## Tech, ## Getting Started, ## Roadmap.
- roadmap: 4-6 markdown bullet lines of next milestones.
- healthScore / innovationScore / careerReadiness: honest integers 0-100. Thin input means low scores.
- strengths: 2-4 short bullets. risks: 2-4 short bullets. suggestedTech: 3-6 concrete tools/libraries.
- notes: 1-2 sentences of the single highest-leverage improvement.`;

const SCHEMA = `{
  "summary": string,
  "description": string,
  "docs": string,
  "roadmap": string,
  "healthScore": number,
  "innovationScore": number,
  "careerReadiness": number,
  "strengths": string[],
  "risks": string[],
  "suggestedTech": string[],
  "notes": string
}`;

export const enhanceProject = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const d = (input ?? {}) as ProjectBrief;
    if (!d.name || !String(d.name).trim()) throw new Error("Project name is required");
    return {
      name: String(d.name).slice(0, 160),
      category: String(d.category ?? "").slice(0, 80),
      summary: String(d.summary ?? "").slice(0, 400),
      description: String(d.description ?? "").slice(0, 4000),
      techStack: Array.isArray(d.techStack) ? d.techStack.map(String).slice(0, 30) : [],
      goals: String(d.goals ?? "").slice(0, 1200),
      progress: Math.max(0, Math.min(100, Number(d.progress ?? 0))),
    } satisfies ProjectBrief;
  })
  .handler(async ({ data }): Promise<ProjectAIResult> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const user = `Polish and score this Orbit Project.
Name: ${data.name}
Category: ${data.category || "—"}
Current summary: ${data.summary || "(none)"}
Current description: ${data.description || "(none)"}
Tech stack: ${data.techStack?.length ? data.techStack.join(", ") : "(not specified)"}
Goals: ${data.goals || "(none)"}
Progress: ${data.progress}%

Return JSON only. Schema:
${SCHEMA}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (r.status === 429) throw new Error("AI is busy right now — try again in a moment.");
    if (r.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
    if (!r.ok) throw new Error(`AI error ${r.status}`);

    const json = await r.json();
    const text = String(json.choices?.[0]?.message?.content ?? "").trim().replace(/^```json\s*|\s*```$/g, "");
    let p: any;
    try { p = JSON.parse(text); } catch { throw new Error("AI returned an unreadable response."); }

    const clamp = (n: any) => {
      const v = Number(n);
      return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
    };
    const arr = (a: any, cap: number) =>
      Array.isArray(a) ? a.filter((x) => typeof x === "string" && x.trim()).slice(0, cap) : [];

    return {
      summary: String(p.summary ?? "").slice(0, 200),
      description: String(p.description ?? "").slice(0, 6000),
      docs: String(p.docs ?? "").slice(0, 12000),
      roadmap: String(p.roadmap ?? "").slice(0, 3000),
      healthScore: clamp(p.healthScore),
      innovationScore: clamp(p.innovationScore),
      careerReadiness: clamp(p.careerReadiness),
      strengths: arr(p.strengths, 4),
      risks: arr(p.risks, 4),
      suggestedTech: arr(p.suggestedTech, 6),
      notes: String(p.notes ?? "").slice(0, 600),
    };
  });
