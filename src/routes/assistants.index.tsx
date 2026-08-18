import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft, Lock, MessageSquare, Sparkles, CalendarDays, Mail, GraduationCap,
  Clock, Plane, ShoppingBag, Wallet, HeartPulse, UserCheck,
  ShieldAlert, Newspaper, Search, BookMarked, Bot, Mic,
} from "lucide-react";
import { usePremium } from "@/lib/premium";

export const Route = createFileRoute("/assistants/")({
  component: AssistantsHub,
  head: () => ({
    meta: [
      { title: "Sam Assistants · Samsta" },
      { name: "description", content: "Explore Sam-powered assistants for writing, planning, learning, safety, and memory— all in one calm hub." },
      { property: "og:title", content: "Sam Assistants · Samsta" },
      { property: "og:description", content: "A calm suite of assistants that write, plan, learn, protect, and remember alongside you." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/assistants" },
    ],
    links: [{ rel: "canonical", href: "/assistants" }],
  }),
});

type Category = "personal" | "creator" | "productivity" | "safety" | "advanced";

type Assistant = {
  key: string;
  title: string;
  hint: string;
  placeholder: string;
  accent: string;
  tint: string;
  icon: React.ReactNode;
  category: Category;
};

const ASSISTANTS: Assistant[] = [
  { key: "smart_reply", title: "Smart Reply", hint: "Replies in your voice", placeholder: "Paste the DM or comment…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))", tint: "oklch(0.93 0.05 250)",
    icon: <MessageSquare className="h-5 w-5" />, category: "creator" },
  { key: "content_creator", title: "Content Creator", hint: "Captions · hashtags · reels", placeholder: "Topic, mood, or product…",
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))", tint: "oklch(0.94 0.06 20)",
    icon: <Sparkles className="h-5 w-5" />, category: "creator" },
  { key: "schedule", title: "Schedule Manager", hint: "Meetings · birthdays · tasks", placeholder: "Paste your plans or notes…",
    accent: "linear-gradient(135deg, oklch(0.85 0.11 55), oklch(0.8 0.12 40))", tint: "oklch(0.95 0.05 55)",
    icon: <CalendarDays className="h-5 w-5" />, category: "productivity" },
  { key: "email_assist", title: "Email Assistant", hint: "Professional drafts, fast", placeholder: "What do you want to say?",
    accent: "linear-gradient(135deg, oklch(0.8 0.08 200), oklch(0.76 0.1 220))", tint: "oklch(0.94 0.04 210)",
    icon: <Mail className="h-5 w-5" />, category: "productivity" },
  { key: "learning", title: "Learning", hint: "Explains · summarizes · quizzes", placeholder: "Topic or paste text…",
    accent: "linear-gradient(135deg, oklch(0.82 0.09 130), oklch(0.78 0.11 110))", tint: "oklch(0.94 0.04 125)",
    icon: <GraduationCap className="h-5 w-5" />, category: "personal" },
  { key: "memory_timeline", title: "Memory Timeline", hint: "Searchable memories", placeholder: "Describe memories or paste notes…",
    accent: "linear-gradient(135deg, oklch(0.8 0.1 340), oklch(0.78 0.12 20))", tint: "oklch(0.94 0.05 340)",
    icon: <Clock className="h-5 w-5" />, category: "personal" },
  { key: "travel", title: "Travel Planner", hint: "Trips · budgets · itineraries", placeholder: "Destination, days, budget…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 190), oklch(0.75 0.13 210))", tint: "oklch(0.93 0.05 200)",
    icon: <Plane className="h-5 w-5" />, category: "personal" },
  { key: "shopping", title: "Shopping", hint: "Compares & recommends", placeholder: "What are you shopping for?",
    accent: "linear-gradient(135deg, oklch(0.86 0.09 80), oklch(0.82 0.1 60))", tint: "oklch(0.96 0.04 75)",
    icon: <ShoppingBag className="h-5 w-5" />, category: "personal" },
  { key: "finance", title: "Finance", hint: "Expenses · budgets · watchlist", placeholder: "Income, spend, goals…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 160), oklch(0.72 0.13 180))", tint: "oklch(0.94 0.05 160)",
    icon: <Wallet className="h-5 w-5" />, category: "productivity" },
  { key: "health", title: "Health Coach", hint: "Workouts · water · habits", placeholder: "Your goal or current routine…",
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.78 0.11 40))", tint: "oklch(0.95 0.05 25)",
    icon: <HeartPulse className="h-5 w-5" />, category: "personal" },
  { key: "career_coach_full", title: "Career Coach", hint: "Resume · interviews · roadmap", placeholder: "Your role and goal…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))", tint: "oklch(0.93 0.05 260)",
    icon: <UserCheck className="h-5 w-5" />, category: "productivity" },
  { key: "privacy_guard", title: "Privacy Guardian", hint: "Scam · phishing · fake link check", placeholder: "Paste the message or link…",
    accent: "linear-gradient(135deg, oklch(0.75 0.15 25), oklch(0.65 0.2 20))", tint: "oklch(0.94 0.05 25)",
    icon: <ShieldAlert className="h-5 w-5" />, category: "safety" },
  { key: "news_brief", title: "News Briefing", hint: "Daily brief, your topics", placeholder: "Topics you care about…",
    accent: "linear-gradient(135deg, oklch(0.8 0.08 90), oklch(0.76 0.1 70))", tint: "oklch(0.94 0.05 80)",
    icon: <Newspaper className="h-5 w-5" />, category: "productivity" },
  { key: "ai_search_pro", title: "Search", hint: "Posts · chats · files · memories", placeholder: "Ask in natural language…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 160), oklch(0.72 0.13 180))", tint: "oklch(0.94 0.05 170)",
    icon: <Search className="h-5 w-5" />, category: "advanced" },
  { key: "knowledge_base", title: "Knowledge Base", hint: "Notes · docs · bookmarks", placeholder: "Paste a note or bookmark…",
    accent: "linear-gradient(135deg, oklch(0.82 0.09 130), oklch(0.78 0.11 250))", tint: "oklch(0.94 0.05 200)",
    icon: <BookMarked className="h-5 w-5" />, category: "productivity" },
  { key: "digital_twin", title: "Digital Twin", hint: "Replies in your voice", placeholder: "Paste 2–3 examples of your writing…",
    accent: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.5 0.1 30))", tint: "oklch(0.9 0.05 25)",
    icon: <Bot className="h-5 w-5" />, category: "advanced" },
];

const CATEGORIES: Array<{ key: Category; label: string }> = [
  { key: "personal", label: "Personal" },
  { key: "creator", label: "Creator" },
  { key: "productivity", label: "Productivity" },
  { key: "safety", label: "Safety" },
  { key: "advanced", label: "Advanced" },
];

function AssistantsHub() {
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Category | "all">("all");

  const visible = filter === "all" ? ASSISTANTS : ASSISTANTS.filter((a) => a.category === filter);

  const open = (a: Assistant) => {
    if (!isPremium) { navigate({ to: "/premium" }); return; }
    if (a.key === "digital_twin") { navigate({ to: "/assistants/digital-twin" }); return; }
    if (a.key === "smart_reply") { navigate({ to: "/assistants/smart-reply" }); return; }
    if (a.key === "content_creator") { navigate({ to: "/assistants/content-creator" }); return; }
    if (a.key === "schedule") { navigate({ to: "/assistants/schedule" }); return; }
    if (a.key === "email_assist") { navigate({ to: "/assistants/email" }); return; }
    if (a.key === "learning") { navigate({ to: "/learn" }); return; }
    if (a.key === "memory_timeline") { navigate({ to: "/memory" }); return; }
    if (a.key === "travel") { navigate({ to: "/travel" }); return; }
    if (a.key === "shopping") { navigate({ to: "/shopping" }); return; }
    if (a.key === "finance") { navigate({ to: "/finance" }); return; }
    if (a.key === "health") { navigate({ to: "/health" }); return; }
    if (a.key === "privacy_guard") { navigate({ to: "/privacy" }); return; }
    if (a.key === "news_brief") { navigate({ to: "/news" }); return; }
    if (a.key === "knowledge_base") { navigate({ to: "/knowledge" }); return; }
    navigate({ to: "/assistants/$tool", params: { tool: a.key } });
  };




  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/sam" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-lg italic">Sam Assistants— your toolkit for life & work</h1>
          <div className="text-[11px] text-muted-foreground">{ASSISTANTS.length} Sam-powered helpers</div>
        </div>
      </header>

      <Link
        to="/agent"
        className="glass mx-4 mt-3 mb-1 flex items-center gap-3 rounded-3xl p-4 transition-transform active:scale-[0.99]"
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg, oklch(0.86 0.10 25), oklch(0.80 0.12 340))" }}
        >
          <Mic className="h-5 w-5 text-primary-foreground" strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-lg leading-tight">What do you need?</span>
          <span className="block text-xs text-muted-foreground">Tell Samsta. Get it done.</span>
        </span>
      </Link>

      <section className="px-4 pt-2 pb-3 animate-fade-up">
        <div className="glass-strong rounded-3xl p-4">
          <div className="font-display text-2xl italic text-gradient">Your, everywhere.</div>
          <p className="mt-1 text-xs text-muted-foreground">
            A calm suite of assistants that write, plan, learn, protect, and remember alongside you.
          </p>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {(["all", ...CATEGORIES.map((c) => c.key)] as const).map((c) => {
          const label = c === "all" ? "All" : CATEGORIES.find((x) => x.key === c)!.label;
          const on = filter === c;
          return (
            <button key={c} onClick={() => setFilter(c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs transition ${on ? "bg-foreground text-background" : "glass"}`}>
              {label}
            </button>
          );
        })}
      </div>

      <section className="px-4">
        <div className="grid grid-cols-2 gap-3">
          {visible.map((a, i) => (
            <button
              key={a.key}
              onClick={() => open(a)}
              className="glass group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.97] animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
                style={{ background: a.tint }} />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: a.accent }}>
                {a.icon}
              </div>
              {!isPremium && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white">
                  <Lock className="h-3 w-3" />
                </span>
              )}
              <div className="relative">
                <div className="font-display text-base leading-tight italic">{a.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{a.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
