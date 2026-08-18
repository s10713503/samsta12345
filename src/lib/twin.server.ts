// @ts-nocheck
export async function callGateway(system: string, messages: Array<{ role: "user" | "assistant" | "system"; content: string }>) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!r.ok) throw new Error(`error ${r.status}`);
  const data = await r.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

export async function buildPersona(supabase: any, userId: string) {
  const { data: twin } = await supabase.from("digital_twins").select("*").eq("user_id", userId).maybeSingle();
  const { data: routines } = await supabase.from("twin_routines").select("title,schedule,instructions").eq("user_id", userId);
  const { data: profile } = await supabase.from("profiles").select("full_name,username,bio").eq("id", userId).maybeSingle();
  const name = profile?.full_name || profile?.username || "the user";
  const persona = twin?.persona_prompt?.trim() || `You are ${name}'s Digital Twin. Reply in first person as ${name}, warm and human.`;
  const routineTxt = (routines ?? []).map((r: any) =>
    `• ${r.title}${r.schedule ? ` (${r.schedule})` : ""}: ${r.instructions}`).join("\n") || "(no routines yet)";
  return `${persona}\n\nTone: ${twin?.tone || "friendly"}.\nBio: ${profile?.bio ?? "—"}.\nRoutines the twin knows about:\n${routineTxt}\n\nRules: Never break character. Keep replies under 140 words. If asked something the routines don't cover, answer plausibly in-voice or gently defer.`;
}


type BusyWindow = { days?: number[]; from?: string; to?: string; label?: string };

/** Compute Available/Busy privately from schedule + focus + presence. */
export function computeStatus(twin: {
  manual_status?: string; focus_mode?: boolean; busy_schedule?: BusyWindow[] | null;
  availability_detection?: boolean;
}, presence: { last_seen?: string | null } | null): { status: "available" | "busy"; reason: string } {
  const manual = twin.manual_status || "auto";
  if (manual === "available") return { status: "available", reason: "Manual: available" };
  if (manual === "busy") return { status: "busy", reason: "Manual: busy" };
  if (twin.focus_mode) return { status: "busy", reason: "Focus mode" };

  const now = new Date();
  const hhmm = now.toTimeString().slice(0, 5); // "HH:MM"
  const dow = now.getDay();
  const windows = Array.isArray(twin.busy_schedule) ? twin.busy_schedule : [];
  for (const w of windows) {
    const daysOk = !w.days || w.days.length === 0 || w.days.includes(dow);
    if (daysOk && w.from && w.to && hhmm >= w.from && hhmm <= w.to) {
      return { status: "busy", reason: w.label ? `Scheduled: ${w.label}` : "Scheduled busy window" };
    }
  }

  if (twin.availability_detection === false) return { status: "available", reason: "Detection off" };

  const offline = !presence?.last_seen || (Date.now() - new Date(presence.last_seen).getTime()) > 5 * 60 * 1000;
  return offline
    ? { status: "busy", reason: "Away — no recent activity" }
    : { status: "available", reason: "Active on device" };
}

