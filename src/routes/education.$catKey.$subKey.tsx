// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, Loader2, X, ChevronRight, Flame, Trophy, Zap, Star,
  BookOpen, Video, Bot, Mic, HelpCircle, FileText, Zap as Bolt, Layers,
  Puzzle, Terminal, Beaker, FolderKanban, Award, LineChart, Target, Calendar,
  Bell, Bookmark, Download, Languages, Search, Camera, PenLine, FileStack,
  BarChart3, Brain, Route as RouteIcon, RefreshCw, Medal, ShieldCheck, MessageSquare,
  Users, Video as VideoIcon, Radio, Megaphone, Code2, FileBadge2, Map, Handshake,
  Library, Globe, Star as StarIcon, Coins, Lock, Wand2, ScrollText, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { streamSam } from "@/lib/stream-sam";

export const Route = createFileRoute("/education/$catKey/$subKey")({
  component: SubCategoryPage,
  head: ({ params }) => {
    const sub = safeDecode(params.subKey);
    return {
      meta: [
        { title: `${sub} · Samsta Academy` },
        { name: "description", content: `powered ${sub} learning hub— notes, videos, quizzes, mock tests, tutor and more.` },
      ],
    };
  },
});

function safeDecode(v: string) { try { return decodeURIComponent(v); } catch { return v; } }

type Section = {
  key: string;
  label: string;
  emoji: string;
  Icon: any;
  tint: string;
  prompt: (sub: string, cat: string) => string;
};

const SECTIONS: Section[] = [
  { key: "notes",       label: "Notes + Handwritten", emoji: "📖", Icon: BookOpen,     tint: "oklch(0.92 0.06 260)", prompt: (s,c)=>`You are Sam, an elite ${c} tutor. Produce clean study notes for "${s}" — headings, key terms bolded (**), formulas, diagrams-as-text, a 3-line TL;DR at top, and 5 memory hooks at the end.` },
  { key: "videos",      label: "HD Video Lessons",       emoji: "🎥", Icon: Video,        tint: "oklch(0.92 0.06 300)", prompt: (s,c)=>`Plan a 5-part HD video series on "${s}" (${c}). For each: title, 90-sec hook, chapter list, on-screen visuals, script highlights, and quiz at end.` },
  { key: "tutor",       label: "Sam Tutor· 24×7",    emoji: "🧠", Icon: Bot,          tint: "oklch(0.92 0.07 220)", prompt: (s,c)=>`Act as my 24×7 ${c} tutor for "${s}". Give a warm intro, ask what I know, then teach interactively with mini-examples. Assume I'll reply and continue.` },
  { key: "voice",       label: "Voice Tutor",         emoji: "🎙️", Icon: Mic,          tint: "oklch(0.93 0.06 30)",  prompt: (s,c)=>`Deliver a spoken-style lesson on "${s}" (${c}) — pauses, rhetorical questions, analogies. Format as narration lines.` },
  { key: "practice",    label: "Practice Questions",     emoji: "❓", Icon: HelpCircle,   tint: "oklch(0.93 0.07 140)", prompt: (s,c)=>`Give 10 practice questions on "${s}" (${c}) mixed difficulty. Include full solutions after all 10.` },
  { key: "mock",        label: "Mock Tests",             emoji: "📝", Icon: FileText,     tint: "oklch(0.93 0.06 20)",  prompt: (s,c)=>`Design a timed 20-question mock test for "${s}" (${c}). Include marking scheme, negative marking rule, and answer key with explanations.` },
  { key: "daily-quiz",  label: "Daily Quiz",             emoji: "⚡", Icon: Bolt,         tint: "oklch(0.94 0.08 90)",  prompt: (s,c)=>`Today's 5-question rapid quiz on "${s}" (${c}). One killer bonus question at the end. Provide answers separately.` },
  { key: "flash",       label: "Flashcards",             emoji: "📚", Icon: Layers,       tint: "oklch(0.93 0.06 200)", prompt: (s,c)=>`Generate 15 spaced-repetition flashcards for "${s}" (${c}) — format each as "Q: ... / A: ...".` },
  { key: "exercises",   label: "Interactive Exercises",  emoji: "🧩", Icon: Puzzle,       tint: "oklch(0.93 0.06 320)", prompt: (s,c)=>`Design 6 interactive exercises for "${s}" (${c}) — fill in the blanks, match, drag-order, mini-scenarios. Include answers.` },
  { key: "playground",  label: "Coding / Virtual Lab",   emoji: "💻", Icon: Terminal,     tint: "oklch(0.93 0.06 180)", prompt: (s,c)=>`Design a hands-on lab for "${s}" (${c}) — setup, 4 exercises with expected output, and a stretch challenge.` },
  { key: "sims",        label: "Science Simulations",    emoji: "🧪", Icon: Beaker,       tint: "oklch(0.93 0.07 150)", prompt: (s,c)=>`Describe 3 vivid simulations for "${s}" (${c}) — inputs, what to observe, expected results, common misconceptions.` },
  { key: "projects",    label: "Projects & Assignments", emoji: "📂", Icon: FolderKanban, tint: "oklch(0.93 0.06 40)",  prompt: (s,c)=>`Propose 5 portfolio projects on "${s}" (${c}) with scope, milestones, deliverables, and rubric.` },
  { key: "cert",        label: "Certificates",           emoji: "🏆", Icon: Award,        tint: "oklch(0.94 0.09 80)",  prompt: (s,c)=>`Design a certification path for "${s}" (${c}) — 3 tiers (Bronze/Silver/Gold), criteria for each, and sample exam blueprint.` },
  { key: "progress",    label: "Progress Tracker",       emoji: "📈", Icon: LineChart,    tint: "oklch(0.93 0.06 220)", prompt: (s,c)=>`Build a progress tracker template for "${s}" (${c}) — weekly goals, KPIs, review checkpoints, and a plateau-buster plan.` },
  { key: "streak",      label: "Learning Streak",        emoji: "🔥", Icon: Flame,        tint: "oklch(0.94 0.09 30)",  prompt: (s,c)=>`Design a 30-day learning streak habit for "${s}" (${c}) — daily micro-actions (≤15 min), triggers, rewards.` },
  { key: "goals",       label: "Daily Study Goals",      emoji: "🎯", Icon: Target,       tint: "oklch(0.93 0.07 10)",  prompt: (s,c)=>`Set today's 3 SMART study goals for "${s}" (${c}) with time-boxes and a self-check.` },
  { key: "planner",     label: "Study Planner",          emoji: "📅", Icon: Calendar,     tint: "oklch(0.93 0.06 260)", prompt: (s,c)=>`Create a 4-week study planner for "${s}" (${c}) — daily 90-min blocks, revision loops, mock cadence.` },
  { key: "reminders",   label: "Smart Reminders",        emoji: "⏰", Icon: Bell,         tint: "oklch(0.94 0.07 60)",  prompt: (s,c)=>`Suggest a smart-reminder schedule for "${s}" (${c}) with copywriting for each nudge (morning/afternoon/night).` },
  { key: "bookmarks",   label: "Bookmarks & Notes",      emoji: "📌", Icon: Bookmark,     tint: "oklch(0.93 0.06 340)", prompt: (s,c)=>`Give a bookmark + note-taking system for "${s}" (${c}) — tags, review cadence, and Zettelkasten template.` },
  { key: "offline",     label: "Offline Downloads",      emoji: "📥", Icon: Download,     tint: "oklch(0.93 0.05 190)", prompt: (s,c)=>`Recommend the top 10 resources to download for offline "${s}" (${c}) study, sized S/M/L with rationale.` },
  { key: "lang",        label: "Multi-language",         emoji: "🌐", Icon: Languages,    tint: "oklch(0.93 0.06 250)", prompt: (s,c)=>`Give a bilingual (English + Hindi) mini-lesson on "${s}" (${c}) with key terms glossary.` },
  { key: "voice-search",label: "Voice Search",           emoji: "🎤", Icon: Search,       tint: "oklch(0.93 0.06 280)", prompt: (s,c)=>`Suggest 12 voice-search queries a student would ask on "${s}" (${c}) and give crisp spoken-style answers.` },
  { key: "ocr",         label: "Scan Question (OCR)",    emoji: "📷", Icon: Camera,       tint: "oklch(0.93 0.06 300)", prompt: (s,c)=>`I'll describe a scanned question on "${s}" (${c}). For now, generate a realistic worked example question + step-by-step solution as if scanned from a textbook.` },
  { key: "eval",        label: "Answer Evaluator",    emoji: "✍️", Icon: PenLine,      tint: "oklch(0.93 0.06 100)", prompt: (s,c)=>`I'll paste my answer on "${s}" (${c}). Evaluate with a rubric (structure/content/presentation), score /10, and rewrite the model answer. First, invite me to paste.` },
  { key: "pyq",         label: "Previous Year Papers",   emoji: "📄", Icon: FileStack,    tint: "oklch(0.93 0.06 20)",  prompt: (s,c)=>`Give 8 PYQ-style questions on "${s}" (${c}) with year tags (illustrative) and full solutions.` },
  { key: "analytics",   label: "Performance Analytics",  emoji: "📊", Icon: BarChart3,    tint: "oklch(0.93 0.06 240)", prompt: (s,c)=>`Design a performance analytics dashboard for "${s}" (${c}) — metrics, formulas, thresholds, and insights template.` },
  { key: "weak",        label: "Weak Topic Detection",   emoji: "🧠", Icon: Brain,        tint: "oklch(0.93 0.06 280)", prompt: (s,c)=>`Ask me my last 3 scores on sub-topics of "${s}" (${c}), then pinpoint weak areas and give a 7-day fix plan.` },
  { key: "path",        label: "Personalized Path",      emoji: "🎯", Icon: RouteIcon,    tint: "oklch(0.93 0.06 160)", prompt: (s,c)=>`Design a personalised learning path for "${s}" (${c}) — from beginner to mastery in 8 milestones with checkpoints.` },
  { key: "revision",    label: "Smart Revision",         emoji: "🔄", Icon: RefreshCw,    tint: "oklch(0.93 0.06 200)", prompt: (s,c)=>`Build a spaced-repetition revision schedule (SM-2 style) for "${s}" (${c}) over 30 days.` },
  { key: "leaderboard", label: "Global Leaderboard",     emoji: "🏅", Icon: Medal,        tint: "oklch(0.94 0.08 60)",  prompt: (s,c)=>`Design a fair global leaderboard for "${s}" (${c}) — scoring, tiers, anti-cheat, weekly resets.` },
  { key: "badges",      label: "Badges & Achievements",  emoji: "🎖️", Icon: ShieldCheck,  tint: "oklch(0.93 0.06 40)",  prompt: (s,c)=>`Design 12 badges & achievements for "${s}" (${c}) with unlock criteria and pixel-art description.` },
  { key: "community",   label: "Discussion Community",   emoji: "👥", Icon: MessageSquare,tint: "oklch(0.93 0.06 220)", prompt: (s,c)=>`Draft 5 great community discussion prompts on "${s}" (${c}) that spark quality debate — not toxicity.` },
  { key: "doubt",       label: "Live Doubt Solving",     emoji: "💬", Icon: Users,        tint: "oklch(0.93 0.06 260)", prompt: (s,c)=>`I have doubts on "${s}" (${c}). Ask me my top 3 doubts one by one and solve each with a concept-first explanation.` },
  { key: "live",        label: "Live Classes",           emoji: "👨‍🏫", Icon: VideoIcon,   tint: "oklch(0.93 0.06 300)", prompt: (s,c)=>`Plan a 60-minute live class on "${s}" (${c}) — hook, teach, practice, Q&A. Include slide bullets and demos.` },
  { key: "recorded",    label: "Recorded Classes",       emoji: "🎥", Icon: Radio,        tint: "oklch(0.93 0.06 250)", prompt: (s,c)=>`Curate a 6-lecture recorded series on "${s}" (${c}) with titles, learning outcomes, and prerequisites.` },
  { key: "announce",    label: "Course Announcements",   emoji: "📢", Icon: Megaphone,    tint: "oklch(0.94 0.08 40)",  prompt: (s,c)=>`Write 3 crisp course announcements for "${s}" (${c}) — a launch, a live session, and a completion reminder.` },
  { key: "hack",        label: "Hackathons & Contests",  emoji: "💻", Icon: Code2,        tint: "oklch(0.93 0.06 160)", prompt: (s,c)=>`Design a 48-hour hackathon for "${s}" (${c}) — theme, tracks, judging rubric, prize ideas, and starter kits.` },
  { key: "resume",      label: "Resume Builder",      emoji: "📜", Icon: FileBadge2,   tint: "oklch(0.93 0.06 40)",  prompt: (s,c)=>`Build a role-ready resume section highlighting "${s}" (${c}) skills — bullet formulas + 5 impact-driven examples.` },
  { key: "roadmap",     label: "Career Roadmap",         emoji: "🎯", Icon: Map,          tint: "oklch(0.93 0.06 20)",  prompt: (s,c)=>`Draft a 24-month career roadmap using "${s}" (${c}) — skills stack, projects, portfolio, interviews, comp target.` },
  { key: "mentor",      label: "Mentor Connect",         emoji: "🤝", Icon: Handshake,    tint: "oklch(0.93 0.06 220)", prompt: (s,c)=>`Play a senior mentor in "${s}" (${c}). Ask my current level and give 3 tailored 1:1 mentor moves this week.` },
  { key: "books",       label: "Recommended Books",      emoji: "📚", Icon: Library,      tint: "oklch(0.93 0.06 260)", prompt: (s,c)=>`Recommend the top 8 books/pdfs for "${s}" (${c}) with reading order, why each matters, and time to read.` },
  { key: "resources",   label: "Learning Resources",     emoji: "🌍", Icon: Globe,        tint: "oklch(0.93 0.06 200)", prompt: (s,c)=>`Curate 15 top free + paid resources for "${s}" (${c}) — videos, blogs, courses, communities. Group by type.` },
  { key: "reviews",     label: "Reviews & Ratings",      emoji: "⭐", Icon: StarIcon,     tint: "oklch(0.94 0.08 80)",  prompt: (s,c)=>`Write 6 realistic short reviews (5/4/3 star mix) for a "${s}" (${c}) course. Include what worked and what didn't.` },
  { key: "rewards",     label: "Rewards · Coins · XP",   emoji: "🎁", Icon: Coins,        tint: "oklch(0.94 0.08 70)",  prompt: (s,c)=>`Design an XP + coins reward system for "${s}" (${c}) — earn table, spend menu, weekly quests.` },
  { key: "premium",     label: "Premium Exclusive",      emoji: "🔐", Icon: Lock,         tint: "oklch(0.93 0.05 300)", prompt: (s,c)=>`List 8 premium-only "${s}" (${c}) features worth paying for — with a 1-line value pitch each.` },
  { key: "proj-gen",    label: "Project Generator",   emoji: "🤖", Icon: Wand2,        tint: "oklch(0.93 0.06 280)", prompt: (s,c)=>`Generate 5 unique end-to-end project ideas on "${s}" (${c}) with tech stack, timeline, and stretch goals.` },
  { key: "summarize",   label: "Notes Summarizer",    emoji: "🧾", Icon: ScrollText,   tint: "oklch(0.93 0.06 220)", prompt: (s,c)=>`I'll paste raw notes on "${s}" (${c}) — summarise into a crisp cheat-sheet with sections and 5 must-remember lines. Invite me to paste first.` },
  { key: "exam-gen",    label: "Exam Generator",      emoji: "📝", Icon: ClipboardList,tint: "oklch(0.93 0.06 40)",  prompt: (s,c)=>`Generate a full exam blueprint for "${s}" (${c}) — sections, question types, marks distribution, and a 25-question paper with answer key.` },
];

function SubCategoryPage() {
  const { catKey, subKey } = Route.useParams();
  const sub = safeDecode(subKey);
  const catLabel = useMemo(() => prettyCatLabel(catKey), [catKey]);
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [sheet, setSheet] = useState<{ title: string; prompt: string } | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return SECTIONS;
    return SECTIONS.filter((x) => x.label.toLowerCase().includes(s));
  }, [q]);

  if (loading || !user) return null;

  const progress = 0.34;

  return (
    <div className="min-h-screen pb-24" style={{
      background: "radial-gradient(1000px 600px at 10% -10%, oklch(0.94 0.06 260 / 0.55), transparent 60%), radial-gradient(800px 500px at 100% 0%, oklch(0.93 0.07 20 / 0.5), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/education/$catKey" params={{ catKey }} aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{catLabel}</div>
          <div className="font-display text-lg italic leading-tight truncate">{sub}</div>
        </div>
        <div className="glass rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Premium
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 pt-3">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-70 blur-3xl animate-aurora"
            style={{ background: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.78 0.13 260))" }} />
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg animate-orb"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.13 260), oklch(0.82 0.13 20))" }}>
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Sub-topic</div>
              <div className="font-display italic text-xl leading-tight truncate">{sub}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Chip icon={<Flame className="h-3 w-3 text-orange-500" />} label="Streak 3d" />
                <Chip icon={<Zap className="h-3 w-3 text-primary" />} label="XP 240" />
                <Chip icon={<Trophy className="h-3 w-3 text-amber-500" />} label={`${Math.round(progress * 100)}% mastered`} />
                <Chip icon={<Star className="h-3 w-3 text-amber-500" />} label="Level 4" />
              </div>
            </div>
          </div>
          <div className="relative mt-4 flex gap-2">
            <button
              onClick={() => setSheet({ title: `Sam Tutor · ${sub}`, prompt: SECTIONS.find(s=>s.key==="tutor")!.prompt(sub, catLabel) })}
              className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white shadow-md active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.13 260), oklch(0.82 0.13 20))" }}>
              Ask Sam Tutor
            </button>
            <button
              onClick={() => setSheet({ title: `Daily Quiz · ${sub}`, prompt: SECTIONS.find(s=>s.key==="daily-quiz")!.prompt(sub, catLabel) })}
              className="flex-1 rounded-full py-2.5 text-sm font-semibold glass active:scale-[0.98]">
              ⚡ Daily Quiz
            </button>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="px-4 mt-4">
        <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notes, videos, tutor, quizzes…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && <button onClick={() => setQ("")}><X className="h-4 w-4 text-muted-foreground" /></button>}
        </div>
      </section>

      {/* Sections grid */}
      <section className="px-4 mt-4">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="font-display italic text-lg">Everything for {sub}</div>
          <span className="text-[10px] text-muted-foreground">{filtered.length} features</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((s) => (
            <button
              key={s.key}
              onClick={() => setSheet({ title: s.label, prompt: s.prompt(sub, catLabel) })}
              className="glass group relative overflow-hidden rounded-2xl p-3 text-left transition-transform active:scale-[0.97]"
            >
              <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-70 blur-2xl" style={{ background: s.tint }} />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl shadow-sm mb-2"
                style={{ background: s.tint }}>
                <s.Icon className="h-4 w-4 text-foreground/80" />
              </div>
              <div className="relative font-medium text-[12.5px] leading-tight">{s.label}</div>
              <div className="relative text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{s.emoji} powered</div>
              <div className="relative mt-2 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider rounded-full bg-foreground/10 px-1.5 py-0.5">Open</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      </section>

      {sheet && <SamSheet title={sheet.title} prompt={sheet.prompt} onClose={() => setSheet(null)} />}
    </div>
  );
}

function prettyCatLabel(key: string) {
  const map: Record<string, string> = {
    upsc: "UPSC / IAS", jee: "IIT JEE", neet: "NEET", biz: "Business", fin: "Finance",
    ai: "Artificial Intelligence", prog: "Programming", cyber: "Cyber Security",
  };
  if (map[key]) return map[key];
  return key.replace(/(^|[-_])(\w)/g, (_, __, c) => " " + c.toUpperCase()).trim();
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="glass rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
      {icon}{label}
    </span>
  );
}

function SamSheet({ title, prompt, onClose }: { title: string; prompt: string; onClose: () => void }) {
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    (async () => {
      try { await streamSam("chat", [{ role: "user", content: prompt }], (a) => setOut(a), ctrl.signal); }
      catch (e: any) { if (e?.name !== "AbortError") setOut(`Sam couldn't finish: ${e?.message || "error"}`); }
      finally { setLoading(false); }
    })();
    return () => ctrl.abort();
  }, [prompt]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(out); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl pb-6 pt-4 max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60 backdrop-blur">
          <X className="h-4 w-4" />
        </button>
        <div className="px-5 pb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display italic text-lg leading-tight truncate">{title}</div>
            <div className="text-[11px] text-muted-foreground">Powered by Sam· streaming</div>
          </div>
        </div>
        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-2">
          {!out && loading && (
            <div className="space-y-2 py-2">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Sam is preparing your answer…
              </div>
              {[92, 78, 88, 60, 82, 55].map((w, i) => (
                <div key={i} className="h-3 rounded-full bg-foreground/10 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
              ))}
            </div>
          )}
          {out && (
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
              {out}
              {loading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
            </div>
          )}
        </div>
        {!loading && out && (
          <div className="px-5 pt-2">
            <button onClick={copy} className="w-full rounded-full glass py-2.5 text-sm font-medium active:scale-[0.98]">
              Copy answer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}