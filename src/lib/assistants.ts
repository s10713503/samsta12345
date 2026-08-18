import type { ReactNode } from "react";
import {
  MessageSquare, Sparkles, CalendarDays, Mail, GraduationCap, Clock,
  Plane, ShoppingBag, Wallet, HeartPulse, Briefcase, UserCheck,
  ShieldAlert, Users, Newspaper, Search, BookMarked, Video, Bot,
} from "lucide-react";
import { createElement } from "react";

export type ToolKey =
  | "smart_reply" | "content_creator" | "schedule" | "email_assist" | "learning"
  | "memory_timeline" | "travel" | "shopping" | "finance" | "health" | "business"
  | "career_coach_full" | "privacy_guard" | "relationship" | "news_brief"
  | "ai_search_pro" | "knowledge_base" | "ai_avatar" | "digital_twin";

export type UiShape =
  | "composer"        // context + tone → streamed reply
  | "planner"         // structured form (multi-field) → rich plan
  | "scheduler"       // form + saved items
  | "learning"        // topic + tabs (Explain/Summary/Quiz)
  | "timeline"        // add item + searchable list
  | "scanner"         // paste → risk badge
  | "search"          // NL search over content
  | "avatar"          // script → placeholder video card
  | "twin";           // digital twin (own route, not $tool)

export type Assistant = {
  key: ToolKey;
  title: string;
  hint: string;
  placeholder: string;
  accent: string;
  tint: string;
  icon: ReactNode;
  category: "personal" | "creator" | "productivity" | "safety" | "advanced";
  shape: UiShape;
  fields?: Array<{ id: string; label: string; type: "text" | "textarea" | "select"; options?: string[]; placeholder?: string }>;
  tones?: string[];
};

const ic = (Icon: typeof MessageSquare) => createElement(Icon, { className: "h-5 w-5" });

export const ASSISTANTS: Assistant[] = [
  { key: "smart_reply", title: "Smart Reply", hint: "Replies in your voice",
    placeholder: "Paste the DM or comment…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))",
    tint: "oklch(0.93 0.05 250)", icon: ic(MessageSquare), category: "creator",
    shape: "composer", tones: ["Warm", "Playful", "Professional", "Flirty", "Short"] },

  { key: "content_creator", title: "Content Creator", hint: "Captions · hashtags · reels",
    placeholder: "Topic, mood, or product…",
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))",
    tint: "oklch(0.94 0.06 20)", icon: ic(Sparkles), category: "creator",
    shape: "composer", tones: ["Editorial", "Playful", "Bold", "Poetic"] },

  { key: "schedule", title: "Schedule Manager", hint: "Meetings · birthdays · tasks",
    placeholder: "e.g. Coffee with Aarav, Tuesday 4pm",
    accent: "linear-gradient(135deg, oklch(0.85 0.11 55), oklch(0.8 0.12 40))",
    tint: "oklch(0.95 0.05 55)", icon: ic(CalendarDays), category: "productivity",
    shape: "scheduler" },

  { key: "email_assist", title: "Email Assistant", hint: "Professional drafts, fast",
    placeholder: "Who is it to, and what's the ask?",
    accent: "linear-gradient(135deg, oklch(0.8 0.08 200), oklch(0.76 0.1 220))",
    tint: "oklch(0.94 0.04 210)", icon: ic(Mail), category: "productivity",
    shape: "composer", tones: ["Warm", "Formal", "Concise", "Persuasive", "Apologetic"] },

  { key: "learning", title: "Learning", hint: "Explains · summarizes · quizzes",
    placeholder: "Topic or paste text…",
    accent: "linear-gradient(135deg, oklch(0.82 0.09 130), oklch(0.78 0.11 110))",
    tint: "oklch(0.94 0.04 125)", icon: ic(GraduationCap), category: "personal",
    shape: "learning" },

  { key: "memory_timeline", title: "Memory Timeline", hint: "Searchable memories",
    placeholder: "A memory or moment…",
    accent: "linear-gradient(135deg, oklch(0.8 0.1 340), oklch(0.78 0.12 20))",
    tint: "oklch(0.94 0.05 340)", icon: ic(Clock), category: "personal",
    shape: "timeline" },

  { key: "travel", title: "Travel Planner", hint: "Trips · budgets · itineraries",
    placeholder: "Destination…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 190), oklch(0.75 0.13 210))",
    tint: "oklch(0.93 0.05 200)", icon: ic(Plane), category: "personal",
    shape: "planner",
    fields: [
      { id: "destination", label: "Destination", type: "text", placeholder: "e.g. Kyoto" },
      { id: "days", label: "Days", type: "text", placeholder: "e.g. 5" },
      { id: "budget", label: "Budget", type: "text", placeholder: "e.g. $1500" },
      { id: "style", label: "Style", type: "select", options: ["Relaxed", "Adventurous", "Cultural", "Luxury", "Backpacker"] },
    ] },

  { key: "shopping", title: "Shopping", hint: "Compares & recommends",
    placeholder: "What are you shopping for?",
    accent: "linear-gradient(135deg, oklch(0.86 0.09 80), oklch(0.82 0.1 60))",
    tint: "oklch(0.96 0.04 75)", icon: ic(ShoppingBag), category: "personal",
    shape: "planner",
    fields: [
      { id: "item", label: "Product", type: "text", placeholder: "e.g. wireless earbuds" },
      { id: "budget", label: "Budget", type: "text" },
      { id: "priority", label: "Priority", type: "select", options: ["Value", "Premium", "Eco", "Portable"] },
    ] },

  { key: "finance", title: "Finance", hint: "Expenses · budgets · watchlist",
    placeholder: "e.g. income $4k, rent $1.2k, food $500…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 160), oklch(0.72 0.13 180))",
    tint: "oklch(0.94 0.05 160)", icon: ic(Wallet), category: "productivity",
    shape: "planner",
    fields: [
      { id: "income", label: "Monthly income", type: "text" },
      { id: "spend", label: "Rough spend", type: "textarea", placeholder: "Rent, food, subs, transport…" },
      { id: "goal", label: "Goal", type: "text", placeholder: "Save $10k this year" },
    ] },

  { key: "health", title: "Health Coach", hint: "Workouts · water · habits",
    placeholder: "Your goal or current routine…",
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.78 0.11 40))",
    tint: "oklch(0.95 0.05 25)", icon: ic(HeartPulse), category: "personal",
    shape: "planner",
    fields: [
      { id: "goal", label: "Goal", type: "select", options: ["Lose weight", "Build muscle", "More energy", "Better sleep", "Reduce stress"] },
      { id: "current", label: "Current routine", type: "textarea" },
      { id: "constraints", label: "Constraints", type: "text", placeholder: "Knee injury, no gym…" },
    ] },

  { key: "business", title: "Business", hint: "Invoices · reports · decks",
    placeholder: "What do you need to produce?",
    accent: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.28 0.03 20))",
    tint: "oklch(0.9 0.03 30)", icon: ic(Briefcase), category: "productivity",
    shape: "composer", tones: ["Invoice", "Report", "Deck outline", "Marketing angles", "Pitch"] },

  { key: "career_coach_full", title: "Career Coach", hint: "Resume · interviews · roadmap",
    placeholder: "Your role and next goal…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))",
    tint: "oklch(0.93 0.05 260)", icon: ic(UserCheck), category: "productivity",
    shape: "composer", tones: ["Resume", "Interview prep", "90-day plan", "Salary talk"] },

  { key: "privacy_guard", title: "Privacy Guardian", hint: "Scam · phishing · fake link check",
    placeholder: "Paste the message, link, or account handle…",
    accent: "linear-gradient(135deg, oklch(0.75 0.15 25), oklch(0.65 0.2 20))",
    tint: "oklch(0.94 0.05 25)", icon: ic(ShieldAlert), category: "safety",
    shape: "scanner" },

  { key: "relationship", title: "Relationships", hint: "Dates · context · warm messages",
    placeholder: "Notes about the person…",
    accent: "linear-gradient(135deg, oklch(0.85 0.1 340), oklch(0.8 0.12 350))",
    tint: "oklch(0.95 0.05 340)", icon: ic(Users), category: "personal",
    shape: "scheduler" },

  { key: "news_brief", title: "News Briefing", hint: "Daily brief, your topics",
    placeholder: "Topics you care about (comma separated)…",
    accent: "linear-gradient(135deg, oklch(0.8 0.08 90), oklch(0.76 0.1 70))",
    tint: "oklch(0.94 0.05 80)", icon: ic(Newspaper), category: "productivity",
    shape: "composer", tones: ["Neutral", "Optimistic", "Deep-dive", "Bullet"] },

  { key: "ai_search_pro", title: "Search", hint: "Posts · chats · files · memories",
    placeholder: "Ask in natural language…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 160), oklch(0.72 0.13 180))",
    tint: "oklch(0.94 0.05 170)", icon: ic(Search), category: "advanced",
    shape: "search" },

  { key: "knowledge_base", title: "Knowledge Base", hint: "Notes · docs · bookmarks",
    placeholder: "Paste a note, quote, or bookmark…",
    accent: "linear-gradient(135deg, oklch(0.82 0.09 130), oklch(0.78 0.11 250))",
    tint: "oklch(0.94 0.05 200)", icon: ic(BookMarked), category: "productivity",
    shape: "timeline" },

  { key: "ai_avatar", title: "Avatar", hint: "Video · voice · presentations",
    placeholder: "What should your avatar say?",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 290), oklch(0.75 0.13 320))",
    tint: "oklch(0.94 0.05 300)", icon: ic(Video), category: "advanced",
    shape: "avatar" },

  { key: "digital_twin", title: "Digital Twin", hint: "Talks to others when you're offline",
    placeholder: "",
    accent: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.5 0.1 30))",
    tint: "oklch(0.9 0.05 25)", icon: ic(Bot), category: "advanced",
    shape: "twin" },
];

export function getAssistant(key: string): Assistant | undefined {
  return ASSISTANTS.find((a) => a.key === key);
}
