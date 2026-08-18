import { createFileRoute } from "@tanstack/react-router";

type Body = {
  file_data: string; // data URL: data:<mime>;base64,....
  filename: string;
  mime: string;
  target_role?: string;
  target_location?: string;
};

const SYSTEM = `You are Samsta's AI Resume Verifier & Matcher. Analyze the uploaded resume for authenticity and extract structured data.
You verify: authenticity (is this a real resume with coherent, verifiable-looking content?), forgery signals (mismatched fonts, obvious template placeholders, contradictory dates, fake companies, AI-generated boilerplate with no specifics), completeness (contact, experience, skills), and match to the user's target role/location.
RULES:
- If the document is not a resume, or is blank, garbled, template placeholder text, or clearly fabricated, mark authentic=false and verdict="reject".
- Otherwise compute authenticity_score 0-100 (100 = fully coherent original resume). Accept only when authenticity_score >= 80 AND the document is a genuine resume.
- Extract 6-15 concrete skills (technologies, tools, domains) as short lowercase tokens.
- Suggest 5-8 job titles that match this candidate.
- Return ONLY a single JSON object, no prose, no markdown fences.
JSON shape: {"authentic":bool,"authenticity_score":int,"verdict":"accept"|"reject","reason":string,"candidate_name":string,"headline":string,"years_experience":number,"extracted_skills":string[],"suggested_roles":string[],"match_summary":string}`;

export const Route = createFileRoute("/api/career/resume-match")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try { body = (await request.json()) as Body; } catch { return new Response("Invalid JSON", { status: 400 }); }
        if (!body?.file_data || !body?.mime) return new Response("file_data and mime required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const userInstruction = `Verify this resume and match it to:\nTarget role: ${body.target_role || "(not specified)"}\nTarget location: ${body.target_location || "(not specified)"}\nRespond with the JSON object only.`;

        const isImage = body.mime.startsWith("image/");
        const contentBlock = isImage
          ? { type: "image_url", image_url: { url: body.file_data } }
          : { type: "file", file: { filename: body.filename || "resume.pdf", file_data: body.file_data } };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: [{ type: "text", text: userInstruction }, contentBlock] },
            ],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          let msg = text || "unavailable";
          if (upstream.status === 429) msg = "Too many scans. Please try again shortly.";
          if (upstream.status === 402) msg = "credits exhausted. Please add credits.";
          return new Response(msg, { status: upstream.status });
        }

        const json = await upstream.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
        const raw = json?.choices?.[0]?.message?.content ?? "";
        let parsed: Record<string, unknown> = {};
        try { parsed = JSON.parse(raw); } catch {
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
        }

        const score = Math.max(0, Math.min(100, Number(parsed.authenticity_score ?? 0)));
        const authentic = parsed.authentic === true && score >= 80;
        const verdict = authentic ? "accept" : "reject";

        return Response.json({
          authentic,
          authenticity_score: score,
          verdict,
          reason: String(parsed.reason ?? ""),
          candidate_name: String(parsed.candidate_name ?? ""),
          headline: String(parsed.headline ?? ""),
          years_experience: Number(parsed.years_experience ?? 0),
          extracted_skills: Array.isArray(parsed.extracted_skills) ? (parsed.extracted_skills as unknown[]).map(String).slice(0, 15) : [],
          suggested_roles: Array.isArray(parsed.suggested_roles) ? (parsed.suggested_roles as unknown[]).map(String).slice(0, 8) : [],
          match_summary: String(parsed.match_summary ?? ""),
        });
      },
    },
  },
});