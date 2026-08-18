import { createFileRoute } from "@tanstack/react-router";

type Body = {
  skills?: string[];
  suggested_roles?: string[];
  target_role?: string;
  target_location?: string;
  years_experience?: number;
};

const SYSTEM = `You are Samsta's live job matcher. Given a candidate's skills, target role and location, return 6-10 realistic INTERNET/REMOTE-friendly job openings the candidate can apply to today.
For each job produce:
- title (specific, e.g. "Senior React Engineer")
- company (real, well-known company or realistic startup name)
- location (city/country OR "Remote — Worldwide" / "Remote — India" etc.)
- work_type ("remote" | "hybrid" | "onsite")
- place_of_work_required (a short human sentence, e.g. "Remote from India, quarterly on-site in Bangalore" or "On-site — Bangalore HQ")
- joining_time (e.g. "Immediate", "Within 15 days", "Within 30 days", "Flexible — Q2 2026")
- salary (short string, e.g. "₹18–28 LPA" or "$90k–$130k")
- match_score (0-100 integer, how well it fits the candidate)
- apply_url (a real careers page URL or LinkedIn/Wellfound search URL like https://www.linkedin.com/jobs/search/?keywords=... — never invent unreachable URLs)
- summary (one sentence about the role)
Return ONLY a JSON object of shape {"jobs":[...]} — no prose, no markdown fences.`;

export const Route = createFileRoute("/api/career/job-suggest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try { body = (await request.json()) as Body; } catch { return new Response("Invalid JSON", { status: 400 }); }
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const user = `Candidate profile:
- Skills: ${(body.skills ?? []).join(", ") || "(none provided)"}
- Suggested roles: ${(body.suggested_roles ?? []).join(", ") || "(none)"}
- Target role: ${body.target_role || "(open)"}
- Target location: ${body.target_location || "(open — include remote)"}
- Experience: ${body.years_experience ?? 0} yrs

Return the JSON object only.`;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: SYSTEM },
              { role: "user", content: user },
            ],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          let msg = text || "unavailable";
          if (upstream.status === 429) msg = "Too many requests. Please try again shortly.";
          if (upstream.status === 402) msg = "credits exhausted. Please add credits.";
          return new Response(msg, { status: upstream.status });
        }

        const json = await upstream.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
        const raw = json?.choices?.[0]?.message?.content ?? "";
        let parsed: { jobs?: unknown[] } = {};
        try { parsed = JSON.parse(raw); } catch {
          const m = raw.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch { /* ignore */ } }
        }

        const jobs = Array.isArray(parsed.jobs) ? parsed.jobs.slice(0, 10).map((j) => {
          const o = j as Record<string, unknown>;
          return {
            title: String(o.title ?? ""),
            company: String(o.company ?? ""),
            location: String(o.location ?? ""),
            work_type: String(o.work_type ?? "remote"),
            place_of_work_required: String(o.place_of_work_required ?? ""),
            joining_time: String(o.joining_time ?? ""),
            salary: String(o.salary ?? ""),
            match_score: Math.max(0, Math.min(100, Number(o.match_score ?? 0))),
            apply_url: String(o.apply_url ?? ""),
            summary: String(o.summary ?? ""),
          };
        }) : [];

        return Response.json({ jobs });
      },
    },
  },
});
