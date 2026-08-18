import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://samstaofficial.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/welcome", changefreq: "monthly", priority: "0.8" },
          { path: "/auth", changefreq: "monthly", priority: "0.6" },
          { path: "/assistants", changefreq: "weekly", priority: "0.8" },
          { path: "/premium", changefreq: "monthly", priority: "0.7" },
          { path: "/privacy", changefreq: "monthly", priority: "0.5" },
          { path: "/create", changefreq: "monthly", priority: "0.5" },
          { path: "/career/hub", changefreq: "weekly", priority: "0.8" },
          { path: "/career/jobs", changefreq: "daily", priority: "0.9" },
          { path: "/career/business", changefreq: "daily", priority: "0.8" },
          { path: "/career/companies", changefreq: "weekly", priority: "0.7" },
          { path: "/career/events", changefreq: "weekly", priority: "0.7" },
          { path: "/career/portfolio", changefreq: "weekly", priority: "0.6" },
          { path: "/learn", changefreq: "weekly", priority: "0.6" },
          { path: "/travel", changefreq: "weekly", priority: "0.5" },
          { path: "/shopping", changefreq: "weekly", priority: "0.5" },
          { path: "/news", changefreq: "daily", priority: "0.6" },
          { path: "/health", changefreq: "weekly", priority: "0.7" },
          { path: "/finance", changefreq: "weekly", priority: "0.6" },
          { path: "/future", changefreq: "monthly", priority: "0.5" },
          { path: "/edu-reels", changefreq: "daily", priority: "0.7" },
          { path: "/knowledge-feed", changefreq: "daily", priority: "0.7" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
