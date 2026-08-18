import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sam/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prompt, size = "1024x1024" } = (await request.json()) as { prompt?: string; size?: string };
        if (!prompt || typeof prompt !== "string") return new Response("prompt required", { status: 400 });
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-image-2",
            prompt,
            size,
            quality: "low",
            n: 1,
            stream: true,
            partial_images: 2,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          let msg = text || "Image generation failed";
          if (upstream.status === 429) msg = "Sam is a little busy — try again in a moment.";
          if (upstream.status === 402) msg = "AI credits are exhausted. Please add credits to continue.";
          return new Response(msg, { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
