import { createFileRoute } from "@tanstack/react-router";

// Returns a short, calm spoken welcome line as MP3 audio.
// Cached hard at the edge/browser — the line is static so it never needs regenerating.
const LINE = "Welcome to Samsta. Every story starts here.";

export const Route = createFileRoute("/api/welcome-voice")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: LINE,
            voice: "alloy",
            response_format: "mp3",
            speed: 1.2,
            instructions:
              "Speak like a warm, real human host: calm, soft, unhurried and welcoming. Gentle breath before the sentence, a soft natural pause after 'Samsta', and a smooth, reassuring fall at the end. No announcer energy, no excitement, no robotic cadence.",
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Voice unavailable", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
