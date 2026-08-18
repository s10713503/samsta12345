// @ts-nocheck
/** Per-community identity for Samsta Orbit circles: unique purpose, palette and inside-sections. */
export type CommunityDef = {
  slug: string;
  name: string;
  emoji: string;
  purpose: string;
  tagline: string;
  accent: string;
  cover: string;
  rules: string[];
  moderators: string[];
  aiSummary: string;
  sections: Array<{ label: string; blurb: string }>;
  cta: string;
};

export const COMMUNITIES: Record<string, CommunityDef> = {
  "night-owls": {
    slug: "night-owls",
    name: "Night Owls",
    emoji: "🌙",
    purpose: "Late-night discussions & casual conversations",
    tagline: "The Orbit that wakes up after midnight.",
    accent: "oklch(0.62 0.16 285)",
    cover: "linear-gradient(135deg, oklch(0.32 0.09 285), oklch(0.5 0.14 265), oklch(0.62 0.12 215))",
    moderators: ["@lunar", "@quietstorm", "@2amclub"],
    rules: ["Kindness after dark — no pile-ons.", "Confessions stay anonymous, always.", "No screenshots out of the room.", "Crisis talk gets support, not jokes."],
    aiSummary: "Tonight the room is leaning into slow talks: sleep struggles, one long thread on long-distance love, and a midnight voice room about starting over.",
    cta: "Join Voice Chat",
    sections: [
      { label: "Late Night Feed", blurb: "Everything posted after 11 PM" },
      { label: "Anonymous Confessions", blurb: "Say it without your handle" },
      { label: "Deep Talks", blurb: "Long threads, no small talk" },
      { label: "Relationship Advice", blurb: "Ask the night shift" },
      { label: "Mental Wellness", blurb: "Check-ins and gentle support" },
      { label: "Midnight Voice Rooms", blurb: "Live audio until sunrise" },
      { label: "Late-night Reels", blurb: "Low-light, slow-scroll clips" },
      { label: "Music Sharing", blurb: "3 AM playlists" },
      { label: "Book Discussions", blurb: "One chapter a night" },
      { label: "Night Polls", blurb: "Quick votes before you sleep" },
      { label: "Active Members", blurb: "Who is awake right now" },
    ],
  },
  "frame-by-frame": {
    slug: "frame-by-frame",
    name: "Frame by Frame",
    emoji: "📸",
    purpose: "Photography & video creators",
    tagline: "Shot, edited, critiqued — frame by frame.",
    accent: "oklch(0.72 0.13 205)",
    cover: "linear-gradient(135deg, oklch(0.42 0.08 230), oklch(0.66 0.12 200), oklch(0.82 0.09 175))",
    moderators: ["@apertura", "@grainlab", "@cutroom"],
    rules: ["Credit every photographer and editor.", "Critique the frame, not the person.", "Disclose AI-generated images.", "No stolen or reposted work."],
    aiSummary: "This week is heavy on natural-light portraits, a Lightroom preset drop, and a short-film showcase with three new submissions.",
    cta: "Upload Photos / Videos",
    sections: [
      { label: "Photo Gallery", blurb: "Latest frames from the circle" },
      { label: "Editing Tutorials", blurb: "Step-by-step grade breakdowns" },
      { label: "Camera Tips", blurb: "Glass, light and settings" },
      { label: "Lightroom Presets", blurb: "Community preset drops" },
      { label: "Video Editing", blurb: "Cuts, transitions, sound design" },
      { label: "Short Film Showcase", blurb: "Premieres and feedback" },
      { label: "AI Image Prompts", blurb: "Prompt craft, labelled as AI" },
      { label: "Creator Portfolio", blurb: "Browse full bodies of work" },
      { label: "Weekly Photo Contest", blurb: "One theme, seven days" },
      { label: "Featured Creators", blurb: "Chosen by the mods" },
    ],
  },
  "sound-check": {
    slug: "sound-check",
    name: "Sound Check",
    emoji: "🎵",
    purpose: "Music, podcasts & audio",
    tagline: "Everything Orbit sounds like.",
    accent: "oklch(0.74 0.15 40)",
    cover: "linear-gradient(135deg, oklch(0.4 0.11 20), oklch(0.68 0.15 45), oklch(0.84 0.11 85))",
    moderators: ["@mixdown", "@onairhost", "@vinylkid"],
    rules: ["No leaks or pirated audio.", "Tag explicit tracks.", "Feedback with timestamps.", "Self-promo only in the drop threads."],
    aiSummary: "Trending right now: two indie releases climbing fast, a long podcast on producing at home, and a karaoke challenge with 40 entries.",
    cta: "Upload Podcast",
    sections: [
      { label: "Trending Songs", blurb: "What the circle is replaying" },
      { label: "Podcasts", blurb: "Episodes posted this week" },
      { label: "Voice Notes", blurb: "Short spoken drops" },
      { label: "Audio Rooms", blurb: "Live listening sessions" },
      { label: "Music Reviews", blurb: "Track-by-track takes" },
      { label: "Artist Profiles", blurb: "Creators behind the sound" },
      { label: "Playlist Sharing", blurb: "Swap sets and moods" },
      { label: "Karaoke Challenges", blurb: "Sing it, post it" },
      { label: "Album Discussions", blurb: "Full-length deep dives" },
      { label: "Live Audio Events", blurb: "Scheduled on-air shows" },
    ],
  },
  "build-mode": {
    slug: "build-mode",
    name: "Build Mode",
    emoji: "🚀",
    purpose: "Startups, business & technology",
    tagline: "Ship in public. Get roasted kindly.",
    accent: "oklch(0.72 0.14 150)",
    cover: "linear-gradient(135deg, oklch(0.34 0.08 165), oklch(0.6 0.13 155), oklch(0.8 0.11 130))",
    moderators: ["@shipfast", "@zerotoone", "@devrel"],
    rules: ["Show the product, not just the pitch.", "No unverified fundraising claims.", "Disclose your own product in feedback threads.", "Hiring posts need pay ranges."],
    aiSummary: "Founders are shipping AI tooling this week; the loudest threads are a pricing teardown, a hackathon signup, and 12 open engineering roles.",
    cta: "Share Product for Feedback",
    sections: [
      { label: "Startup Ideas", blurb: "Raw concepts, open critique" },
      { label: "AI Tools", blurb: "What builders actually use" },
      { label: "Programming", blurb: "Code, stacks and patterns" },
      { label: "App Showcase", blurb: "Launches from the circle" },
      { label: "Business News", blurb: "Signals worth reading" },
      { label: "Investor Discussions", blurb: "Raising, terms, traction" },
      { label: "Hackathons", blurb: "Teams and deadlines" },
      { label: "Jobs & Hiring", blurb: "Roles with pay ranges" },
      { label: "Founder Profiles", blurb: "Who is building what" },
      { label: "Pitch Decks", blurb: "Decks shared for review" },
      { label: "Product Feedback", blurb: "Honest first impressions" },
      { label: "Coding Challenges", blurb: "Weekly problem drops" },
    ],
  },
  "city-pulse": {
    slug: "city-pulse",
    name: "City Pulse",
    emoji: "🌆",
    purpose: "Local communities & events",
    tagline: "What is happening around you, right now.",
    accent: "oklch(0.7 0.16 15)",
    cover: "linear-gradient(135deg, oklch(0.36 0.1 300), oklch(0.6 0.16 10), oklch(0.82 0.12 60))",
    moderators: ["@citydesk", "@meetups", "@localguide"],
    rules: ["Verify alerts before posting.", "No doxxing addresses of individuals.", "Marketplace posts need a price.", "Keep listings local."],
    aiSummary: "Around you today: three meetups tonight, a new street-food opening, moderate traffic on the ring road, and two neighbourhood alerts.",
    cta: "Post a Local Update",
    sections: [
      { label: "Local News", blurb: "Neighbourhood headlines" },
      { label: "Events Near You", blurb: "Tonight and this weekend" },
      { label: "Restaurants", blurb: "Openings and honest reviews" },
      { label: "Traffic Updates", blurb: "Live road conditions" },
      { label: "Weather", blurb: "What to expect outside" },
      { label: "Meetups", blurb: "Small groups, real places" },
      { label: "Sports Events", blurb: "Local matches and runs" },
      { label: "Local Businesses", blurb: "Shops worth supporting" },
      { label: "Marketplace", blurb: "Buy, sell, give away" },
      { label: "Emergency Alerts", blurb: "Verified urgent notices" },
      { label: "Nearby Communities", blurb: "Circles next door" },
    ],
  },
};

export const communityBySlug = (slug: string) => COMMUNITIES[slug] ?? null;
export const slugify = (name: string) => String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
