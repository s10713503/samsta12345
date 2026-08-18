// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Sparkles, Flame, Trophy, Target, Calendar, Award, Brain,
  TrendingUp, Zap, Briefcase, BookOpen, Users, StickyNote, Plus, X,
  Loader2, Send, ChevronRight, Cpu, Database, Code2, Shield, Boxes,
  LineChart, Landmark, Sigma, Beaker, Palette, Megaphone, Languages, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { streamSam } from "@/lib/stream-sam";

export const Route = createFileRoute("/education/$catKey/")({
  component: CategoryPage,
  head: ({ params }) => {
    const cat = CATS[params.catKey as keyof typeof CATS];
    const title = cat ? `${cat.label} · Samsta Academy` : "Samsta Academy";
    return {
      meta: [
        { title },
        { name: "description", content: `powered ${cat?.label ?? "learning"} hub— tools, projects, practice and community inside Samsta.` },
        { property: "og:title", content: title },
      ],
    };
  },
});

type Tool = { key: string; label: string; hint: string; prompt?: string };
type Cat = { label: string; I: any; g: string; tools: Tool[] };

// Helper: build a Tool array from a compact [label, hint, promptSuffix] tuple list
const T = (cat: string, rows: Array<[string, string, string]>): Tool[] =>
  rows.map(([label, hint, p], i) => ({
    key: `${cat}-${i}`,
    label,
    hint,
    prompt: p.startsWith("__RAW__") ? p.slice(7) : `You are Sam, an expert ${cat} tutor. ${p}`,
  }));

const CATS: Record<string, Cat> = {
  upsc: { label: "UPSC / IAS", I: Landmark, g: "linear-gradient(135deg, oklch(0.78 0.13 30), oklch(0.72 0.15 10))", tools: T("UPSC", [
    ["Study Planner", "Personalized roadmap", "Ask my target attempt & optional subject, then build a full study planner: weekly targets, revision loops, mock schedule."],
    ["Daily Current Affairs", "Today's brief", "Give today's top 12 current affairs relevant to UPSC Prelims + Mains with 'why it matters'."],
    ["Personalized Roadmap", "0 → Prelims → Mains", "Build a 12-month UPSC roadmap tailored to a beginner, milestone by milestone."],
    ["Exam Countdown", "Days to go", "Given a UPSC exam date I'll supply, produce a countdown-driven 90-day sprint plan."],
    ["Learning Streak", "Habit engine", "Design a daily UPSC habit stack: morning news, evening MCQs, night notes — with time-boxes."],
    ["Progress Analytics", "What to fix", "Ask my last 3 test scores subject-wise, then tell me weak areas & the fix plan."],
    ["NCERT Library", "Class 6→12 map", "List NCERTs to read for UPSC in order, with why each matters and reading time."],
    ["Standard Books", "Curated stack", "Recommend the essential standard books (Laxmikanth, Spectrum, etc.) with when to read each."],
    ["PYQs Analyzer", "Trend hunter", "Analyse last 10 years of Prelims for high-yield topics with weightage table."],
    ["Government Reports", "Must-read digests", "Summarise the latest ARC, NITI Aayog & key ministry reports in bullets."],
    ["Maps & Atlas", "Geo drills", "Give me 15 UPSC-style map-based questions with answers and mnemonics."],
    ["Budget & Economic Survey", "Key takeaways", "Summarise this year's Union Budget + Economic Survey in 20 UPSC-ready bullets."],
    ["PIB Updates", "Policy pulse", "Give this week's top 10 PIB releases with UPSC angle."],
    ["Yojana & Kurukshetra", "Monthly gist", "Summarise the latest Yojana + Kurukshetra issues with themes and quotes."],
    ["Answer Writing Evaluation", "Mains scorer", "I'll paste my Mains answer — score it UPSC-style (structure, content, presentation) and rewrite the model answer."],
    ["Essay Checker", "Essay coach", "I'll paste my essay — give a rubric-based score, strengths, weaknesses and a rewritten intro + conclusion."],
    ["Interview Simulator", "Panel drill", "Simulate a UPSC personality test panel; ask me 10 questions across DAF, current affairs and ethics."],
    ["Doubt Solver", "Ask anything", "I'll ask UPSC doubts — answer with concept, example and PYQ link."],
    ["Notes Generator", "Crisp notes", "Ask me a topic then produce UPSC-quality notes with headings, keywords and diagrams-as-text."],
    ["Flashcards", "Spaced repetition", "Ask a topic then generate 15 flashcards (Q → A) ready for spaced repetition."],
    ["Mind Maps", "Visual recall", "Produce an ASCII mind map on any topic I give — with branches and sub-branches."],
    ["Revision Planner", "48-hr sprint", "Design a 48-hour revision sprint before an exam I supply the date for."],
    ["Weak Topic Analysis", "Deep diagnostic", "Ask my last 3 mocks, then diagnose the 5 weakest topics and a fix plan for each."],
    ["Rank Predictor", "Score → rank", "Ask my Prelims/Mains score estimates and predict a rank band with confidence."],
    ["Prelims Mock Tests", "10-Q burst", "Give a 10-question UPSC Prelims mock across GS with detailed answers."],
    ["Mains Answer Writing", "Structured drill", "Give me one Mains-style question and coach me through a 200-word answer."],
    ["CSAT Practice", "Reason & comp", "Give 5 CSAT problems (reasoning + comprehension) with detailed solutions."],
    ["Daily MCQs", "5 a day", "Give today's 5 UPSC MCQs across polity, geography, economy, environment, current affairs."],
    ["Subject-wise Tests", "Focused drill", "Ask my subject then give a 10-Q focused test with explanations."],
    ["Timed Exams", "Full mock", "Design a 2-hour full-length mock structure with sectional timing rules."],
    ["Mentor Sessions", "Talk to a topper", "Play a top-100 rank holder and mentor me on strategy, notes and burnout."],
    ["Live Class Notes", "Lecture recap", "I'll describe a lecture topic — build clean revision notes as if from a live class."],
    ["Group Discussion Prep", "GD drill", "Give a 5-round GD simulation on a current-affairs topic with feedback."],
    ["Peer Review", "Answer swap", "Coach me on how to peer-review UPSC answers with a repeatable rubric."],
    ["Career Paths (IAS/IPS/IFS/IRS/PSC)", "Life inside", "Explain a day in the life of IAS, IPS, IFS, IRS, State PSC officers + pros/cons."],
  ])},

  jee: { label: "IIT JEE", I: Sigma, g: "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.72 0.14 280))", tools: T("JEE", [
    ["JEE Rank Predictor", "Score → AIR", "Ask my Main/Advanced score and predict AIR + likely IIT-branch options."],
    ["Daily Questions", "3-a-day", "Give 3 daily JEE problems (easy/med/hard) across P/C/M with full solutions."],
    ["Chapter Progress Coach", "Track chapters", "Ask my chapter completion % and prioritise the next 2 weeks of study."],
    ["Exam Countdown", "Sprint mode", "Given JEE date, design a countdown sprint (long + revision + mock cadence)."],
    ["Weak Topic Analysis", "Fix the leaks", "Ask my last 3 mock scores by chapter and give a fix plan."],
    ["Physics Deep Dive", "Concepts first", "Pick a Physics chapter and teach it JEE-depth with derivations and 3 solved problems."],
    ["Chemistry Deep Dive", "P/O/I mastery", "Pick a Chemistry chapter (Physical/Organic/Inorganic) and teach with mechanisms + mnemonics."],
    ["Mathematics Deep Dive", "Rigor + tricks", "Pick a Maths chapter and teach with theorems, tricks, and 5 JEE problems."],
    ["Formula Library", "All-in-one sheet", "Give a compact JEE formula sheet across a chapter I pick, with usage tips."],
    ["Concept Videos (Sam)", "Voice-style lesson", "Deliver a scripted concept lecture (as if narrated) on a topic I pick."],
    ["Notes Generator", "Revision-ready", "Ask a chapter, then generate crisp revision notes with all key results."],
    ["PYQs", "Recent + trend", "Give 5 recent JEE PYQs on a chapter I pick, with step-by-step solutions."],
    ["Physics Solver", "Step-by-step", "I'll paste a physics problem — solve step-by-step, then generalise the method."],
    ["Chemistry Visualizer", "See mechanisms", "Explain an organic mechanism as an ASCII arrow-push visualization."],
    ["Math Solver", "Every step shown", "I'll paste a maths problem — solve line-by-line with justification."],
    ["Formula Generator", "On demand", "Ask a scenario, then derive the applicable formula from first principles."],
    ["Mistake Analysis", "Root cause", "I'll paste my wrong attempts — diagnose the concept gap and give 3 practice problems."],
    ["Personalized Revision", "Loop it", "Design a 14-day personalised revision loop for chapters I list."],
    ["Voice Tutor", "Talk it out", "Explain a concept as if speaking aloud, with pauses and questions to me."],
    ["Whiteboard", "Drawn-out steps", "Simulate a whiteboard: text-drawing + step-by-step derivation on a topic I pick."],
    ["3D Physics Simulations", "Visualise", "Describe projectile, rotation, EM waves as vivid 3D mental animations."],
    ["Chemistry Virtual Lab", "Safe experiments", "Walk me through a virtual titration & electrochemistry setup step-by-step."],
    ["Graph Plotter (mental)", "Sketch curves", "Given a function, describe its graph shape, key points and transformations."],
    ["Formula Visualizer", "Feel the formula", "Pick a formula and describe how each variable changes the output visually."],
    ["Adaptive Mock Tests", "Grows with me", "Design a 30-Q adaptive mock structure that gets harder with each right answer."],
    ["Chapter Tests", "Focused drill", "Pick a chapter and give a 10-Q chapter test with solutions."],
    ["Speed Tests", "Beat the clock", "Give 10 speed-drill JEE questions with target time per question."],
    ["Time Management Practice", "Strategy", "Coach me on a JEE 3-hour paper strategy: skip rules, order, review cycles."],
    ["Daily Challenge", "1 killer Q", "Give today's flagship JEE challenge problem with hint ladder + solution."],
    ["AIR Prediction", "Where can I land", "Ask my score band and estimate AIR + college/branch fit."],
    ["Topic Accuracy", "By chapter", "Ask my accuracy per chapter and rank topics by ROI (score gain per hour)."],
    ["Speed Analysis", "Where I'm slow", "Ask my per-question times and identify slow topics + drills."],
    ["Coaching Classes", "Lecture series", "Upload and organise coaching lecture videos series-wise (premium cloud storage)."],
    ["Sam Suggest", "Fix my gaps", "Analyse my weak Physics/Chemistry/Maths sub-topics and suggest the exact YouTube videos to watch."],
    ["Rank Comparison", "vs cohort", "Compare a score against typical JEE percentiles with realistic advice."],
  ])},

  neet: { label: "NEET", I: Beaker, g: "linear-gradient(135deg, oklch(0.80 0.13 140), oklch(0.72 0.15 120))", tools: T("NEET", [
    ["3D Human Anatomy", "Guided tour", "Walk me through human anatomy system-by-system with mnemonics."],
    ["Organ Explorer", "Deep dive", "Pick an organ and teach structure, function, disorders NEET-style."],
    ["Biology Animations", "See processes", "Describe mitosis, meiosis, photosynthesis, Krebs cycle as step-by-step animations."],
    ["Medical Case Studies", "Clinical vibes", "Give 5 NEET clinical MCQ cases with reasoning."],
    ["Diagnosis Simulator", "Educational", "Present a patient vignette and coach me through differential diagnosis (educational)."],
    ["Virtual Biology Lab", "Do experiments", "Walk through 5 virtual biology experiments step-by-step."],
    ["Virtual Chemistry Lab", "Safe practice", "Guide a virtual titration + qualitative analysis experiment."],
    ["Physics Experiments", "Class 11-12", "Explain 5 NEET-level physics experiments with observations & errors."],
    ["NCERT Line-by-Line Practice", "Sacred text", "Give 10 NCERT Biology line-by-line MCQs with page references (approx)."],
    ["Biology Tutor", "Ask anything", "I'll paste Biology doubts — teach with concept + diagram-as-text + MCQ."],
    ["Medical Quiz Arena", "Rapid fire", "Give a 15-Q rapid-fire NEET quiz across Bio/Chem/Phys with answers."],
    ["Previous Year Questions", "Recent years", "Give 10 NEET PYQs across subjects with detailed solutions."],
    ["Rank Predictor", "Score → rank", "Ask my NEET score band and predict rank + college tier options."],
    ["Chapter Tests", "Bite-sized", "Pick a NEET chapter, give a 10-Q test with answers."],
    ["Revision Tracker", "Loop plan", "Build a 30-day NEET revision loop with spaced repetition."],
    ["Weak Topic Analysis", "Fix leaks", "Ask my mock scores by chapter and give a fix plan."],
    ["Formula Sheets", "Physics + Chem", "Give NEET Physics + Physical Chemistry formula sheet with tips."],
    ["Daily MCQs", "5 a day", "Give today's 5 NEET MCQs across subjects with brief explanations."],
  ])},

  biz: { label: "Business", I: Briefcase, g: "linear-gradient(135deg, oklch(0.78 0.12 40), oklch(0.72 0.14 20))", tools: T("Business", [
    ["Startup Builder", "0 → 1", "Ask my idea then produce a full startup build plan: problem, ICP, MVP, launch."],
    ["Business Model Canvas", "Fill live", "Ask my idea then fill the 9 blocks of the Business Model Canvas."],
    ["Pitch Deck Builder", "10 slides", "Ask my startup details then draft a 10-slide investor pitch outline."],
    ["CEO Coach", "Push me", "Be my CEO coach; ask 3 sharp questions then give ruthless, specific advice."],
    ["Company Simulator", "Run 5 rounds", "Simulate 5 rounds of running my company with decision trees & outcomes."],
    ["Market Research", "Signals fast", "Ask my niche then produce a market research template + 3-day signal plan."],
    ["Financial Planning", "Runway math", "Ask my metrics then compute burn, runway, CAC, LTV, payback with rules of thumb."],
    ["Case Studies", "Top 10 lessons", "Break down 10 legendary business case studies with 3-line lessons."],
    ["Investment Analysis", "VC lens", "Analyse a startup I describe from a VC perspective (moat, TAM, team, risk)."],
    ["Negotiation Simulator", "Roleplay", "Simulate a hard negotiation (partner/investor/customer) and coach me each turn."],
  ])},

  fin: { label: "Finance", I: LineChart, g: "linear-gradient(135deg, oklch(0.80 0.12 150), oklch(0.72 0.14 130))", tools: T("Finance", [
    ["Virtual Stock Market", "Paper trade", "Design a paper-trading exercise: pick 5 stocks, thesis, size, review plan."],
    ["Portfolio Tracker", "Rebalance rules", "Give a simple portfolio rebalancing framework by risk profile."],
    ["Mutual Fund Simulator", "SIP power", "Simulate SIP outcomes for 3 fund categories over 10/20/30 years."],
    ["Risk Calculator", "Know your risk", "Teach VaR, drawdown & Sharpe with tiny worked examples."],
    ["Budget Planner", "50/30/20+", "Ask my income & goals then build a monthly budget with allocation logic."],
    ["Investment Coach", "Personalised", "Ask my age, goals, risk appetite then design a personal investment blueprint."],
    ["Financial Statement Analyzer", "P&L / BS / CF", "I'll paste key figures — analyse profitability, liquidity, leverage."],
    ["Trading Simulator", "Trade drills", "Design 5 trade setups with entry, stop, target, thesis and post-mortem template."],
    ["Excel Practice", "Must-have templates", "Give 8 must-have finance Excel templates + how to build each."],
    ["DCF Calculator", "Value it", "Walk through a DCF for a company I name: assumptions, WACC, terminal, sensitivity."],
  ])},

  ai: { label: "Artificial Intelligence", I: Cpu, g: "linear-gradient(135deg, oklch(0.78 0.13 260), oklch(0.72 0.15 290))", tools: T("", [
    ["Prompt Engineering Lab", "Elite prompts", "Teach 10 pro prompt patterns with before/after examples."],
    ["Agent Builder", "Design an agent", "Ask my use case then design an agent: tools, memory, guardrails, evals."],
    ["Model Playground", "Compare models", "Compare 6 leading models by strengths, cost, latency, use cases."],
    ["LLM Playground", "Hands-on", "Design a hands-on LLM exercise I can do in chat right now."],
    ["Computer Vision Lab", "Vision basics", "Explain CNNs, detection, segmentation with 3 project ideas each."],
    ["NLP Lab", "Text tasks", "Explain tokenization, embeddings, RAG, fine-tuning with mini-projects."],
    ["Research Papers", "Curated reads", "List 8 must-read papers with 3-line summaries and why they matter."],
    ["Kaggle Projects", "Compete smart", "Pick 5 Kaggle competitions to level up + how to attack each."],
    ["GPU Cloud Practice", "Ship a model", "Walk me through training + deploying on a GPU cloud (Colab/RunPod)."],
    ["Hackathons", "Win one", "How to prepare for an hackathon: team, idea shortlist, 48-hour execution plan."],
  ])},

  prog: { label: "Programming", I: Code2, g: "linear-gradient(135deg, oklch(0.80 0.13 160), oklch(0.72 0.15 180))", tools: T("Programming", [
    ["Live Code Editor", "Write & explain", "I'll paste code — you review, refactor, explain like a senior dev."],
    ["Compiler", "Trace it", "I'll paste code — mentally 'compile' and trace its execution step-by-step."],
    ["Debugger", "Find the bug", "I'll paste code + error — locate the bug and explain the fix."],
    ["GitHub Integration", "Portfolio", "Design a GitHub portfolio strategy: repos, READMEs, pinned order, contribution graph."],
    ["Code Review", "Senior lens", "Review the code I paste for bugs, perf, security and readability."],
    ["LeetCode Practice", "Pattern-based", "Give me today's LeetCode-style problem grouped by pattern with a hint ladder."],
    ["HackerRank Challenges", "Warm-ups", "Recommend 5 HackerRank challenges to warm up daily with why each."],
    ["Project Builder", "Ship it", "Ask my level then propose 3 portfolio projects with milestone breakdowns."],
    ["API Testing", "Contract-first", "Teach API testing patterns with a real REST example and edge cases."],
    ["System Design Practice", "L5+ interviews", "Give a system-design problem and coach me through requirements → HLD → deep dives."],
  ])},

  cyber: { label: "Cyber Security", I: Shield, g: "linear-gradient(135deg, oklch(0.72 0.14 20), oklch(0.68 0.16 10))", tools: T("Cybersecurity", [
    ["Virtual Hacking Lab", "Guided labs", "Design a beginner-friendly virtual hacking lab with 6 exercises (ethical only)."],
    ["Capture The Flag", "CTF drills", "Recommend beginner→intermediate CTFs with categories & tips."],
    ["Malware Sandbox", "Safe intro", "Explain safe malware analysis: static vs dynamic, sandbox setup, first 5 steps."],
    ["Network Analyzer", "Read pcaps", "Teach me to read Wireshark captures — common protocols & red flags."],
    ["Digital Forensics", "Fundamentals", "Teach digital forensics fundamentals in 10 crisp bullets."],
    ["Penetration Testing", "Methodology", "Walk me through a pentest methodology (recon → report) with tools per phase."],
    ["Security Challenges", "Weekly", "Give this week's security challenge with hint ladder & solution."],
    ["Bug Bounty Practice", "Real reports", "Break down 5 famous bug bounty write-ups with lessons."],
    ["SOC Dashboard", "Blue team", "Explain a SOC analyst's daily workflow + tools + alert triage."],
    ["Linux Lab", "Shell fluency", "Give 15 essential Linux commands with real security use cases."],
  ])},

  block: { label: "Blockchain", I: Boxes, g: "linear-gradient(135deg, oklch(0.80 0.13 80), oklch(0.75 0.15 60))", tools: T("Blockchain", [
    ["Smart Contract IDE", "Write live", "Give 5 Solidity mini-challenges with expected output & security notes."],
    ["Solidity Playground", "Teach & test", "Teach Solidity via 5 progressively harder contracts with tests."],
    ["Wallet Simulator", "Wallet 101", "Walk through Web3 wallet setup, seed hygiene and what NOT to do."],
    ["NFT Studio", "Mint safely", "How NFTs work + safe minting checklist + common contract pitfalls."],
    ["Token Creator", "Design a token", "Design a fictional ERC-20: supply, utility, distribution, risks, launch plan."],
    ["DeFi Lab", "AMMs & lending", "Explain AMMs, lending protocols, staking, LPs with plain-English examples."],
    ["Blockchain Explorer", "Read a tx", "Teach me to read Etherscan — a real transaction breakdown line-by-line."],
    ["DAO Simulator", "Governance", "Simulate a DAO proposal & voting cycle with realistic edge cases."],
    ["Gas Fee Calculator", "Cost math", "Explain gas math with 3 worked examples across network conditions."],
    ["Security Audit", "Find flaws", "I'll paste a Solidity snippet — audit for reentrancy, overflow, access control."],
  ])},

  design: { label: "Design", I: Palette, g: "linear-gradient(135deg, oklch(0.82 0.12 320), oklch(0.75 0.14 340))", tools: T("Design", [
    ["Figma Workspace", "Curated", "Recommend 8 essential Figma templates & plugins for portfolio + product designers."],
    ["UI Challenge", "Today's brief", "Give a UI challenge for today with brief, constraints & rubric."],
    ["UX Case Studies", "Learn from top", "Break down 5 famous UX case studies (Airbnb, Duolingo, Notion, Figma, Stripe)."],
    ["Color Palette Generator", "Vibe-based", "Ask my brand vibe then generate 3 palettes with hex codes & usage rules."],
    ["Typography Lab", "Pair fonts", "Suggest 6 killer typography pairings with when to use each."],
    ["Logo Generator", "Brief → concept", "Ask my brand brief then produce 3 logo concept directions (described)."],
    ["Wireframe Builder", "Sketch first", "Given a product idea, sketch a wireframe in ASCII with annotations."],
    ["Portfolio Builder", "Story-first", "Structure a designer portfolio: sections, case study format, order."],
    ["3D Design Viewer", "Basics", "Teach 3D design fundamentals + free tools & 3 mini projects."],
    ["Animation Playground", "Motion craft", "Teach 6 UI motion principles with when to use each + Framer Motion snippets."],
  ])},

  mkt: { label: "Marketing", I: Megaphone, g: "linear-gradient(135deg, oklch(0.80 0.13 60), oklch(0.72 0.15 40))", tools: T("Marketing", [
    ["SEO Dashboard", "Site tips", "Ask my site + niche then produce an SEO action plan (tech, on-page, off-page)."],
    ["Social Media Planner", "30-day plan", "Ask my brand then build a 30-day social calendar (IG, X, LinkedIn)."],
    ["Ad Campaign Builder", "Plan a launch", "Ask my product then simulate a 4-week paid launch across Meta & Google."],
    ["Brand Analyzer", "Positioning", "Ask my product then draft brand positioning, tagline options & voice guide."],
    ["Email Marketing", "Sequence maker", "Ask my funnel then draft a 5-email nurture sequence with subject lines."],
    ["Copywriter", "Sharp copy", "I'll paste rough copy — rewrite in 3 tones: bold, warm, premium."],
    ["Analytics Dashboard", "KPIs to watch", "Define KPIs for a growth dashboard with formulas & benchmarks."],
    ["Content Calendar", "Never dry up", "Design a repeatable content calendar (pillars, formats, cadence)."],
    ["Influencer Research", "Find the right ones", "Teach how to find, vet and negotiate with influencers for a niche I supply."],
    ["Marketing Case Studies", "Winning campaigns", "Break down 5 famous marketing campaigns with lessons."],
  ])},

  lang: { label: "Languages", I: Languages, g: "linear-gradient(135deg, oklch(0.80 0.12 220), oklch(0.72 0.14 240))", tools: T("Languages", [
    ["Speaking Partner", "Roleplay", "Ask my target language then roleplay a coffee-shop conversation."],
    ["Pronunciation Analysis", "Say it back", "Give 10 tongue-twisters with IPA + tips per line for a language I pick."],
    ["Grammar Checker", "Fix mine", "I'll paste text — correct grammar + explain each fix."],
    ["Vocabulary Builder", "Learn fast", "Design 3 quick vocab games with 10 words each in my target language."],
    ["Live Translation", "Any language", "I'll paste text + target language — translate + explain idioms."],
    ["Conversation Practice", "Daily dialog", "Give today's short dialogue with translation & role-play prompts."],
    ["Listening Tests", "Podcasts", "Recommend 6 podcasts by language & level with why each."],
    ["Writing Evaluation", "Score it", "I'll paste writing in my target language — score with CEFR + rewrite better."],
    ["Speaking Score", "Rate me", "Design a 5-question speaking test with rubric & sample answers."],
    ["Language Games", "Fun drills", "Give 3 game-style drills for vocab, grammar and listening."],
  ])},

  pd: { label: "Personal Growth", I: Rocket, g: "linear-gradient(135deg, oklch(0.82 0.12 100), oklch(0.75 0.14 80))", tools: T("Personal Growth", [
    ["Habit Tracker", "Start small", "Design a 21-day habit plan — ask my goal first."],
    ["Goal Planner", "OKR-style", "Ask my 3-month vision then draft OKRs with weekly checkpoints."],
    ["Productivity Dashboard", "System", "Design a personal productivity dashboard (metrics + rituals)."],
    ["Time Tracker", "Where it goes", "Coach me on time-tracking: tools, categories, weekly review."],
    ["Journal", "Prompt me", "Give 7 killer journaling prompts, one per day for a week."],
    ["Meditation", "5-min reset", "Guide a 5-minute meditation script I can read now."],
    ["Reading Tracker", "Book plan", "Design a 12-book reading plan for skill growth with why & order."],
    ["Life Skills Courses", "Curated", "Recommend 6 life-skill mini-courses (topics + free sources)."],
    ["Leadership Training", "Lead better", "Teach 8 leadership principles with real-life micro-drills."],
    ["Public Speaking Coach", "Speak with power", "Coach me through a 3-minute talk: structure, opening, delivery drill."],
  ])},
};

const WIDGETS = [
  { key: "trending", label: "Trending Today", icon: "🔥", prompt: (c: string) => `What's trending in ${c} today? Top 6 items, 1-line each.` },
  { key: "recommended", label: "Recommended for You", icon: "⭐", prompt: (c: string) => `Recommend 5 resources in ${c} tailored for an ambitious learner.` },
  { key: "sam", label: "Ask Sam", icon: "🤖", prompt: (c: string) => `You are Sam. Ask me one crisp question about ${c} to get me started.` },
  { key: "progress", label: "Weekly Progress", icon: "📈", prompt: (c: string) => `Give a sample Weekly Progress report for a learner in ${c}: hours studied, topics covered, quiz accuracy, streak, and 3 concrete next steps.` },
  { key: "leader", label: "Leaderboard", icon: "🏆", prompt: (c: string) => `Simulate a top-10 ${c} learner leaderboard for this week with usernames, XP, streaks and 1-line highlights. End with where an average learner ranks and how to climb.` },
  { key: "daily", label: "Daily Challenge", icon: "🎯", prompt: (c: string) => `Today's ${c} challenge — problem, hint, and solution behind a spoiler.` },
  { key: "planner", label: "Study Planner", icon: "📅", prompt: (c: string) => `Build a 14-day study planner for ${c} with daily 30-min blocks.` },
  { key: "career", label: "Career Opportunities", icon: "💼", prompt: (c: string) => `Top 6 career paths inside ${c} with roles, skills & salary bands.` },
  { key: "assess", label: "Skill Assessment", icon: "🧠", prompt: (c: string) => `Assess my ${c} skill with 8 targeted questions, then score me.` },
  { key: "certs", label: "Certificates Progress", icon: "📜", prompt: (c: string) => `List the 6 most valuable certificates in ${c}, with issuer, difficulty, time to complete, cost range, and how each helps a career. End with a suggested order.` },
];

// Stable slugs so each JEE tool opens its own dedicated dashboard page
// (see src/routes/education.jee.$toolKey.tsx). Any tool label not in this map
// falls back to the generic sub-category page.
// JEE tools that are fully built. Everything else shows a premium "Coming soon" card.
const JEE_LIVE = new Set<string>([
  "JEE Rank Predictor",
  "Exam Countdown",
  "Chapter Progress Coach",
  "Formula Library",
  "Concept Videos (Sam)",
  "Coaching Classes",
  "Sam Suggest",
]);

const JEE_SLUGS: Record<string, string> = {
  "JEE Rank Predictor": "rank-predictor",
  "Daily Questions": "daily-questions",
  "Chapter Progress Coach": "chapter-progress",
  "Exam Countdown": "exam-countdown",
  "Weak Topic Analysis": "weak-topics",
  "Physics Deep Dive": "physics",
  "Chemistry Deep Dive": "chemistry",
  "Mathematics Deep Dive": "mathematics",
  "Formula Library": "formulas",
  "Concept Videos (Sam)": "concept-videos",
  "Notes Generator": "notes-gen",
  "PYQs": "pyqs",
  "Physics Solver": "physics-solver",
  "Chemistry Visualizer": "chem-visualizer",
  "Math Solver": "math-solver",
  "Formula Generator": "formula-gen",
  "Mistake Analysis": "mistake-analysis",
  "Personalized Revision": "revision",
  "Voice Tutor": "voice-tutor",
  "Whiteboard": "whiteboard",
  "3D Physics Simulations": "sims-3d",
  "Chemistry Virtual Lab": "chem-lab",
  "Graph Plotter (mental)": "graph-plotter",
  "Formula Visualizer": "formula-viz",
  "Adaptive Mock Tests": "adaptive-mock",
  "Chapter Tests": "chapter-tests",
  "Speed Tests": "speed-tests",
  "Time Management Practice": "time-mgmt",
  "Daily Challenge": "daily-challenge",
  "AIR Prediction": "air-predict",
  "Topic Accuracy": "topic-accuracy",
  "Speed Analysis": "speed-analysis",
  "Coaching Classes": "coaching-classes",
  "Sam Suggest": "sam-suggest",
};

// ── NEET mirrors the whole IIT JEE tool hub, with Biology instead of Maths ──
export const neetize = (s: string) =>
  String(s || "")
    .replace(/IIT JEE/g, "NEET")
    .replace(/\bJEE\b/g, "NEET")
    .replace(/Mathematics/g, "Biology")
    .replace(/\bMaths\b/g, "Biology")
    .replace(/\bmaths\b/g, "biology")
    .replace(/\bMath\b/g, "Biology")
    .replace(/P\/C\/M/g, "P\/C\/B")
    .replace(/Physics\/Chemistry\/Biology/g, "Physics\/Chemistry\/Biology")
    .replace(/Main\/Advanced|Main\/Adv/g, "NEET")
    .replace(/IIT-branch/g, "MBBS\/BDS college")
    .replace(/IITs?\/NITs?\/IIITs?/g, "AIIMS \/ Govt medical colleges");

const NEET_SLUGS: Record<string, string> = Object.fromEntries(
  Object.entries(JEE_SLUGS).map(([label, slug]) => [
    neetize(label),
    slug === "mathematics" ? "biology" : slug === "math-solver" ? "bio-solver" : slug,
  ]),
);

const NEET_LIVE = new Set<string>([
  "Exam Countdown",
  "Formula Library",
  "Concept Videos (Sam)",
  "Coaching Classes",
]);

CATS.neet.tools = CATS.jee.tools.map((t: any, i: number) => ({
  key: `NEET-${i}`,
  label: neetize(t.label),
  hint: neetize(t.hint),
  prompt: neetize(t.prompt).replace("expert NEET tutor", "expert NEET tutor"),
}));

function CategoryPage() {
  const { catKey } = Route.useParams();
  const cat = CATS[catKey];
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [sheet, setSheet] = useState<{ title: string; prompt: string } | null>(null);
  const [notes, setNotes] = useState<Array<{ id: string; text: string; at: number }>>([]);
  const [noteText, setNoteText] = useState("");
  const notesKey = `samsta:edu-notes:${catKey}`;

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    try { setNotes(JSON.parse(localStorage.getItem(notesKey) || "[]")); } catch { /* noop */ }
  }, [notesKey]);

  const saveNote = () => {
    if (!noteText.trim()) return;
    const next = [{ id: crypto.randomUUID(), text: noteText.trim(), at: Date.now() }, ...notes].slice(0, 100);
    setNotes(next);
    localStorage.setItem(notesKey, JSON.stringify(next));
    setNoteText("");
    toast.success("Note saved");
  };
  const delNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    localStorage.setItem(notesKey, JSON.stringify(next));
  };

  if (!cat) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <div className="text-lg font-display italic mb-2">Category not found</div>
          <Link to="/education" className="text-primary underline text-sm">Back to Academy</Link>
        </div>
      </div>
    );
  }
  if (loading || !user) return null;

  const progress = 0.42; // demo — could be wired to real stats later

  return (
    <div className="min-h-screen pb-24" style={{
      background: "radial-gradient(1000px 600px at 10% -10%, oklch(0.94 0.06 260 / 0.55), transparent 60%), radial-gradient(800px 500px at 100% 0%, oklch(0.93 0.07 150 / 0.5), transparent 60%), var(--background)",
    }}>
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/education" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-display text-lg italic leading-tight truncate">{cat.label}</div>
          <div className="text-[11px] text-muted-foreground">powered category· Samsta Academy</div>
        </div>
        <div className="glass rounded-full px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1">
          <Sparkles className="h-3 w-3" /> Premium
        </div>
      </header>

      {/* Hero with progress ring */}
      <section className="px-4 pt-3">
        <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
          <div aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-70 blur-3xl animate-aurora" style={{ background: cat.g }} />
          <div className="relative flex items-center gap-5">
            <Ring progress={progress} size={112}>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Skill</div>
                <div className="font-display text-2xl italic leading-none">{Math.round(progress * 100)}%</div>
                <div className="text-[10px] text-muted-foreground">this month</div>
              </div>
            </Ring>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Track</div>
              <div className="font-display italic text-xl leading-tight">{cat.label}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip icon={<Flame className="h-3 w-3 text-orange-500" />} label="Streak 3d" />
                <Chip icon={<Zap className="h-3 w-3 text-primary" />} label="XP 120" />
                <Chip icon={<Trophy className="h-3 w-3 text-amber-500" />} label="Rank #142" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {(catKey === "jee" || catKey === "neet") && (
        <section className="px-4 pt-4">
          <Link
            to="/education/study/$exam"
            params={{ exam: catKey }}
            className="group relative block overflow-hidden rounded-3xl p-[1.5px] shadow-[0_24px_60px_-24px_rgba(201,82,122,0.45)] transition active:scale-[0.99]"
            style={{ background: "linear-gradient(135deg, rgba(232,200,116,0.9), rgba(201,82,122,0.6) 45%, rgba(255,255,255,0.9))" }}
          >
            <div
              className="relative overflow-hidden rounded-[calc(1.5rem-1.5px)] p-5"
              style={{ background: "linear-gradient(140deg, #fff6f2 0%, #fde3e0 45%, #f6d3d9 100%)" }}
            >
              <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full opacity-70 blur-3xl" style={{ background: "radial-gradient(circle, rgba(232,200,116,0.55), transparent 70%)" }} />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-44 w-44 rounded-full opacity-60 blur-3xl" style={{ background: "radial-gradient(circle, rgba(201,82,122,0.35), transparent 70%)" }} />
              <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(rgba(58,31,43,0.9) 1px, transparent 1px)", backgroundSize: "3px 3px" }} />

              <div className="relative" style={{ color: "#3a1f2b" }}>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#c48a3a]/40 bg-white/60 px-2 py-0.5 text-[10px] font-semibold tracking-[0.18em] text-[#a67326] backdrop-blur">
                    <Sparkles className="h-3 w-3" /> PREMIUM
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.18em] opacity-60">Notes & Saved Links</span>
                </div>
                <div className="mt-2 font-display text-2xl italic leading-tight bg-gradient-to-r from-[#3a1f2b] via-[#a63a63] to-[#c48a3a] bg-clip-text text-transparent">
                  Your {cat.label} Study Hub
                </div>
                <div className="mt-1.5 text-xs leading-relaxed opacity-70">
                  Notes, folders, PDFs, YouTube & web bookmarks — organized by subject.
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_22px_-10px_rgba(201,82,122,0.9)]"
                  style={{ background: "linear-gradient(135deg, #c9527a 0%, #a63a63 55%, #c48a3a 100%)" }}
                >
                  Open study hub <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Premium widgets rail */}
      <section className="mt-4">
        <div className="flex items-center justify-between px-5 mb-2">
          <div className="font-display italic text-base">Premium widgets</div>
          <span className="text-[10px] text-muted-foreground">Tap to open</span>
        </div>
        <div className="overflow-x-auto no-scrollbar px-4">
          <div className="flex gap-2.5 pb-1">
            {WIDGETS.map((w) => (
              <button
                key={w.key}
                onClick={() => setSheet({ title: w.label, prompt: (w as any).prompt(cat.label) })}
                className="glass shrink-0 flex flex-col items-start gap-1 rounded-2xl px-3 py-2.5 min-w-[128px] active:scale-95 transition-transform"
              >
                <div className="text-lg leading-none">{w.icon}</div>
                <div className="text-[11px] font-semibold leading-tight">{w.label}</div>
                <div className="text-[9px] text-muted-foreground">powered</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Category tools grid */}
      <section className="px-4 mt-5">
        {catKey === "jee" && (
          <Link
            to="/education/jee/levels"
            className="glass-strong mb-3 flex items-center gap-3 rounded-3xl p-4 transition-transform active:scale-[0.98]"
          >
            <span aria-hidden className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md" style={{ background: cat.g }}>
              🧬
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[15px] italic leading-tight">Physics Level Ladder 0 → 19</span>
              <span className="block text-[10.5px] text-muted-foreground">
                NCERT to Olympiad, one level at a time — Samsta teaches the level, then tests you on the real Main (300) / Advanced (360) pattern to unlock the next
              </span>
            </span>
          </Link>
        )}
        {catKey === "jee" && (
          <Link
            to="/education/jee-coach"
            className="glass-strong mb-4 flex items-center gap-3 rounded-3xl p-4 transition-transform active:scale-[0.98]"
          >
            <span aria-hidden className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-md" style={{ background: cat.g }}>
              🧭
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[15px] italic leading-tight"> JEE Study Coach</span>
              <span className="block text-[10.5px] text-muted-foreground">
                Set your percentile, marks & AIR targets — get a roadmap, daily planner, mistake notebook and progress tracking
              </span>
            </span>
          </Link>
        )}
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="font-display italic text-lg">Inside {cat.label}</div>
          <span className="text-[10px] text-muted-foreground">{cat.tools.length} tools</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {cat.tools.map((t) => {
            const jeeSlug =
              catKey === "jee" ? JEE_SLUGS[t.label] : catKey === "neet" ? NEET_SLUGS[t.label] : undefined;
            const soon =
              (catKey === "jee" && !JEE_LIVE.has(t.label)) ||
              (catKey === "neet" && !NEET_LIVE.has(t.label));
            if (soon) {
              return (
                <div
                  key={t.key}
                  role="button"
                  aria-disabled="true"
                  tabIndex={-1}
                  onClick={(e) => e.preventDefault()}
                  className="glass relative overflow-hidden rounded-2xl p-3 text-left cursor-not-allowed select-none"
                >
                  <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-40 blur-2xl" style={{ background: cat.g }} />
                  <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{ background: "linear-gradient(140deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))", backdropFilter: "blur(6px)" }} />
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md mb-2 opacity-80" style={{ background: cat.g }}>
                    <cat.I className="h-4 w-4" />
                  </div>
                  <div className="relative font-medium text-[12.5px] leading-tight opacity-80">{t.label}</div>
                  <div className="relative text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Preparing content
                  </div>
                  <span className="absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white shadow-lg border border-white/30 overflow-hidden"
                    style={{ background: "linear-gradient(135deg, oklch(0.72 0.16 260), oklch(0.82 0.17 320), oklch(0.78 0.15 290))", boxShadow: "0 4px 14px oklch(0.6 0.18 300 / 0.35)" }}>
                    <span className="relative z-10 flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      Coming soon
                    </span>
                    <span aria-hidden className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{ backgroundSize: "200% 100%" }} />
                  </span>
                </div>
              );
            }
            const linkProps = jeeSlug
              ? catKey === "neet"
                ? { to: "/education/neet/$toolKey" as const, params: { toolKey: jeeSlug } }
                : { to: "/education/jee/$toolKey" as const, params: { toolKey: jeeSlug } }
              : { to: "/education/$catKey/$subKey" as const, params: { catKey, subKey: t.label } };
            return (
            <Link
              key={t.key}
              {...(linkProps as any)}
              className="glass group relative overflow-hidden rounded-2xl p-3 text-left transition-transform active:scale-[0.97]"
            >
              <div aria-hidden className="absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: cat.g }} />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md mb-2" style={{ background: cat.g }}>
                <cat.I className="h-4 w-4" />
              </div>
              <div className="relative font-medium text-[12.5px] leading-tight">{t.label}</div>
              <div className="relative text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{t.hint}</div>
              <div className="relative mt-2 flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider rounded-full bg-foreground/10 px-1.5 py-0.5">{jeeSlug ? "OPEN" : ""}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </Link>
            );
          })}
        </div>
      </section>

      {/* Notes */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="font-display italic text-lg flex items-center gap-2"><StickyNote className="h-4 w-4" /> My notes</div>
          <span className="text-[10px] text-muted-foreground">{notes.length} saved</span>
        </div>
        <div className="glass rounded-2xl p-3">
          <div className="flex gap-2">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={`Jot a ${cat.label} insight…`}
              className="flex-1 rounded-full bg-background/60 border border-foreground/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              onKeyDown={(e) => { if (e.key === "Enter") saveNote(); }}
            />
            <button onClick={saveNote} className="rounded-full bg-foreground text-background px-3 py-2 text-sm font-semibold flex items-center gap-1">
              <Plus className="h-4 w-4" /> Save
            </button>
          </div>
          {notes.length > 0 && (
            <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
              {notes.map((n) => (
                <div key={n.id} className="flex items-start gap-2 rounded-xl bg-background/50 border border-foreground/5 p-2">
                  <div className="text-[12.5px] flex-1 whitespace-pre-wrap">{n.text}</div>
                  <button onClick={() => delNote(n.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Community */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="font-display italic text-lg flex items-center gap-2"><Users className="h-4 w-4" /> Community</div>
          <Link to="/knowledge-feed" className="text-[11px] text-primary">Open feed</Link>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Link to="/knowledge-feed" className="glass rounded-2xl p-3 flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium leading-tight">Knowledge feed · {cat.label}</div>
              <div className="text-[11px] text-muted-foreground">Articles, notes & discussions</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/edu-reels" className="glass rounded-2xl p-3 flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium leading-tight">Education reels</div>
              <div className="text-[11px] text-muted-foreground">Bite-sized lessons from creators</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/career" className="glass rounded-2xl p-3 flex items-center gap-3">
            <Briefcase className="h-4 w-4 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium leading-tight">Career & jobs in {cat.label}</div>
              <div className="text-[11px] text-muted-foreground">Roles, portfolios & mentors</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {sheet && <SamSheet title={sheet.title} prompt={sheet.prompt} onClose={() => setSheet(null)} />}
    </div>
  );
}

function Chip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="glass rounded-full px-2 py-0.5 text-[10px] font-medium flex items-center gap-1">
      {icon}{label}
    </span>
  );
}

function Ring({ progress, size = 100, children }: { progress: number; size?: number; children?: React.ReactNode }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="currentColor" strokeOpacity="0.1" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#ring2)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))} className="transition-all duration-700" />
        <defs>
          <linearGradient id="ring2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.78 0.13 260)" />
            <stop offset="100%" stopColor="oklch(0.82 0.13 20)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
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
      try {
        await streamSam("chat", [{ role: "user", content: prompt }], (a) => setOut(a), ctrl.signal);
      } catch (e: any) {
        if (e?.name !== "AbortError") setOut(`Sam couldn't finish: ${e?.message || "error"}`);
      } finally { setLoading(false); }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl pb-8 pt-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
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
            <div className="text-[11px] text-muted-foreground">Powered by Sam </div>
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
          {!loading && !out && (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              Sam didn't return anything. Tap again to retry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
