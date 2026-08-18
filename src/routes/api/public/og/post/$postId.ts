import { createFileRoute } from "@tanstack/react-router";

/** Escape text for inline SVG. */
function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function card(title: string, subtitle: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#120d06"/><stop offset="60%" stop-color="#1c1508"/><stop offset="100%" stop-color="#2a1d0a"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1050" cy="120" r="220" fill="#d4af37" opacity="0.13"/>
  <text x="80" y="150" fill="#d4af37" font-family="Georgia,serif" font-size="42" font-style="italic">Samsta</text>
  <text x="80" y="300" fill="#ffffff" font-family="Georgia,serif" font-size="66">${esc(title).slice(0, 46)}</text>
  <text x="80" y="380" fill="#cbbf9d" font-family="Helvetica,Arial,sans-serif" font-size="34">${esc(subtitle).slice(0, 80)}</text>
  <rect x="80" y="470" width="260" height="70" rx="35" fill="#d4af37"/>
  <text x="130" y="516" fill="#120d06" font-family="Helvetica,Arial,sans-serif" font-size="28">View on Samsta</text>
</svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
}

export const Route = createFileRoute("/api/public/og/post/$postId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: post } = await supabaseAdmin
            .from("posts")
            .select("id, caption, kind, media, user_id")
            .eq("id", params.postId)
            .maybeSingle();
          if (!post) return card("Post not found", "This link is no longer available");

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("username, full_name, is_private")
            .eq("id", post.user_id as string)
            .maybeSingle();

          if (profile?.is_private) {
            return card("Private account", "Follow to see this post on Samsta");
          }

          const media = (Array.isArray(post.media) ? post.media : []) as Array<Record<string, string>>;
          const first = media[0];
          const path = first?.poster ?? (first?.type === "image" ? first?.path : undefined);
          const bucket = first?.posterBucket ?? first?.bucket ?? "posts";

          if (path) {
            const { data: signed } = await supabaseAdmin.storage
              .from(bucket)
              .createSignedUrl(path, 60 * 60 * 24 * 7);
            if (signed?.signedUrl) {
              return new Response(null, {
                status: 302,
                headers: { location: signed.signedUrl, "cache-control": "public, max-age=3600" },
              });
            }
          }

          const who = profile?.username ? `@${profile.username}` : (profile?.full_name ?? "A Samsta member");
          return card((post.caption as string) || `${post.kind} on Samsta`, `Shared by ${who}`);
        } catch {
          return card("Samsta", "Moments, reels and podcasts");
        }
      },
    },
  },
});
