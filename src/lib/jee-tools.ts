// @ts-nocheck
import {
  Trophy, Target, Clock, Flame, Brain, Zap, TrendingUp, Award, BookOpen,
  Calculator, Beaker, Sigma, Video, Mic, PenLine, ScanLine, Timer,
  BarChart3, Rocket, RefreshCw, Play, ClipboardList, FileText, Sparkles,
} from "lucide-react";

type Feature = { label: string; prompt: string };
type ToolDef = {
  title: string;
  emoji: string;
  hint: string;
  Icon: any;
  gradient: string;
  intro: string;
  features: Feature[];
  custom?: "rank-predictor";
};

export const G_BLUE   = "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.72 0.14 280))";
export const G_ORANGE = "linear-gradient(135deg, oklch(0.82 0.13 40),  oklch(0.75 0.15 20))";
export const G_GREEN  = "linear-gradient(135deg, oklch(0.80 0.13 150), oklch(0.72 0.15 130))";
export const G_PINK   = "linear-gradient(135deg, oklch(0.82 0.13 340), oklch(0.75 0.15 320))";
export const G_AMBER  = "linear-gradient(135deg, oklch(0.86 0.14 80),  oklch(0.78 0.16 60))";
export const G_TEAL   = "linear-gradient(135deg, oklch(0.80 0.11 200), oklch(0.72 0.13 220))";
export const G_VIOLET = "linear-gradient(135deg, oklch(0.78 0.14 300), oklch(0.70 0.16 280))";

export const TOOLS: Record<string, ToolDef> = {
  "rank-predictor": {
    title: "JEE Rank Predictor",
    emoji: "🎯", Icon: Trophy, gradient: G_AMBER, hint: "Score → AIR with paper-difficulty analysis",
    intro: "Enter your JEE Main/Advanced marks or percentile — Sam predicts AIR, category rank, and college options. Optionally upload the question paper PDF to factor in this year's difficulty vs previous years.",
    custom: "rank-predictor",
    features: [
      { label: "College Predictor", prompt: "Given the predicted AIR just shown, list the top 10 IITs/NITs/IIITs the student is likely to get with branch options (JOSAA 2024 cutoffs)." },
      { label: "Branch Predictor", prompt: "Suggest 8 best-fit branches based on the predicted AIR and typical opening/closing ranks — include why each fits." },
      { label: "Previous Year Trends", prompt: "Show last 5 years of AIR-vs-marks trend for JEE Main/Advanced with a short takeaway on how this year compares." },
      { label: "Admission Probability", prompt: "Compute admission probability (High/Moderate/Low) for the top 6 IITs at the predicted AIR band. Justify each in one line." },
      { label: "Compare Attempts", prompt: "Compare this predicted rank with a hypothetical +20 marks and −20 marks scenario. Show new AIR band + college shifts." },
    ],
  },

  "daily-questions": {
    title: "Daily Questions", emoji: "📅", Icon: Target, gradient: G_BLUE,
    hint: "3 fresh questions every day — Physics · Chemistry · Maths",
    intro: "A fresh timed drill every day across P/C/M with instant solutions, explanation, and daily streak tracking.",
    features: [
      { label: "Today's Physics Q (Med)", prompt: "Generate ONE fresh JEE-Main-style Physics question (medium difficulty) with a 3-minute timer suggestion, full step-by-step solution and a common-mistake note." },
      { label: "Today's Chemistry Q (Med)", prompt: "Generate ONE fresh JEE-style Chemistry question (mix Physical/Organic/Inorganic randomly) with solution + 1 memory hook." },
      { label: "Today's Maths Q (Hard)", prompt: "Generate ONE fresh JEE-Advanced-style Maths question (hard) with elegant solution and an alternate faster method." },
      { label: "Easy Warm-up (3)", prompt: "Give 3 quick easy warm-up questions (1 each P/C/M) with concise solutions." },
      { label: "Hard Killer Set (3)", prompt: "Give 3 JEE-Advanced killer problems (1 each P/C/M) with detailed reasoning + concept behind each." },
      { label: "Instant Explanation", prompt: "I'll paste a JEE question — explain it like a 1:1 tutor with concept, formula, and step-by-step derivation." },
      { label: "Accuracy Report", prompt: "Ask my last 7-day accuracy for P/C/M then generate an accuracy report with strong/weak subjects and a corrective plan." },
      { label: "Leaderboard Simulation", prompt: "Simulate today's top-20 JEE Daily Questions leaderboard with usernames, streak days, XP, and where an average learner ranks." },
    ],
  },

  "chapter-progress": {
    title: "Chapter Progress Coach", emoji: "📈", Icon: TrendingUp, gradient: G_GREEN,
    hint: "Chapter-by-chapter completion, strengths & weak zones",
    intro: "Track every JEE chapter with completion %, time spent, and driven priority ordering.",
    features: [
      { label: "Strong Chapters", prompt: "Ask my top-scoring chapters and design a strategy to convert them into scoring goldmines (>=90% accuracy)." },
      { label: "Weak Chapters Fix Plan", prompt: "Ask my weakest 5 chapters, then build a 21-day fix plan with daily 45-min blocks and revision loops." },
      { label: "Recommendations", prompt: "Based on typical JEE aspirants at this stage, recommend the 8 highest-ROI chapters to focus on right now." },
      { label: "Revision Status Tracker", prompt: "Design a 3-tier revision tracker (First Read / Practice / Mastery) with checkpoints for all JEE chapters." },
      { label: "Set Target Date", prompt: "Ask my target JEE date + current completion, then compute realistic pace (chapters/week) needed to finish syllabus + 2 revision loops." },
    ],
  },

  "exam-countdown": {
    title: "Exam Countdown", emoji: "⏳", Icon: Clock, gradient: G_ORANGE,
    hint: "Countdown-driven sprint plan",
    intro: "A day-by-day countdown planner with daily targets, revision calendar, and motivation blocks.",
    features: [
      { label: "90-Day Sprint Plan", prompt: "Build a 90-day JEE sprint plan — week-by-week theme, daily 6-hour block breakdown, mock cadence, and buffer weeks." },
      { label: "60-Day Crash Plan", prompt: "Build a 60-day JEE crash plan optimising for chapters with highest weightage and fastest recall." },
      { label: "30-Day Final Push", prompt: "Build a 30-day final push plan — revision loops, PYQ marathon, 3 full-length mocks/week, and mental-health check-ins." },
      { label: "Daily Target Setter", prompt: "Ask days remaining + subject weakness, then generate today's exact daily target with hours per subject." },
      { label: "Mock Schedule", prompt: "Design a mock-test schedule for the last 90 days — full/sectional/chapter mix with analysis time built in." },
      { label: "Revision Calendar", prompt: "Build a 4-loop revision calendar (30/15/7/3 day) across all chapters with priority weighting." },
      { label: "Motivation Boost", prompt: "Write a 200-word premium, no-fluff motivation message for a JEE aspirant on day X — realistic, warm, actionable." },
      { label: "Progress Timeline", prompt: "Design a visual (ASCII) progress timeline showing the last 30 days of study hours, mock scores, and streak." },
    ],
  },

  "weak-topics": {
    title: "Weak Topic Analysis", emoji: "🧠", Icon: Brain, gradient: G_PINK,
    hint: "Find leaks · fix concepts · retest",
    intro: "Pinpoint weak concepts, map mistakes to root causes, and generate a personalised improvement plan.",
    features: [
      { label: "Weak Concept Finder", prompt: "Ask my last 3 mock scores chapter-wise, then identify the 5 weakest concepts and root cause of each." },
      { label: "Mistake History Log", prompt: "Design a mistake-log template for JEE with columns: chapter · question · mistake type · fix action · retested? · date." },
      { label: "Improvement Plan", prompt: "For 5 weak topics I provide, build a 14-day improvement plan with daily micro-actions, revision, and a retest at day 7 and 14." },
      { label: "Recommended Videos", prompt: "Recommend the best 5 concept video creators/playlists (Physics/Chem/Maths) for the topic I name." },
      { label: "Focused Practice Set", prompt: "Ask my weakest topic, then generate a 10-question focused practice set with graded difficulty + solutions." },
      { label: "Topic Strength Score", prompt: "Ask my accuracy + speed on a topic, then compute a Topic Strength Score /100 with a 1-line improvement lever." },
      { label: "Retest Now", prompt: "Give a fresh 5-question retest on the topic I name, timed 12 minutes. Provide answers separately." },
    ],
  },

  "physics": {
    title: "Physics Deep Dive", emoji: "⚛️", Icon: Zap, gradient: G_BLUE,
    hint: "Theory · derivations · numericals · simulations",
    intro: "Master a Physics chapter end-to-end— concept, derivation, PYQs, and tutor.",
    features: [
      { label: "Theory Explainer", prompt: "Ask which Physics chapter, then teach the theory JEE-depth with intuition, key results, and 3 solved examples." },
      { label: "ASCII Animation", prompt: "Ask a physics phenomenon (projectile / SHM / EM waves / rotation), then describe it as a vivid ASCII animation frame-by-frame." },
      { label: "Formula Sheet", prompt: "Ask a Physics chapter, then give a compact JEE formula sheet with usage rules & pitfalls." },
      { label: "Derivations", prompt: "Ask a topic, then derive the main formulas from first principles with clear steps and diagrams-as-text." },
      { label: "Numericals Set", prompt: "Ask a Physics chapter, then give 8 numericals (easy→hard) with full solutions and a shortcut per problem." },
      { label: "Simulations", prompt: "Design 3 mental simulations for the physics topic I name — inputs, expected observations, common misconceptions." },
      { label: "PYQs", prompt: "Ask a chapter, then give 6 recent JEE Main + Advanced PYQs with detailed solutions." },
      { label: "Mock Quiz (10Q)", prompt: "Give a 10-question Physics chapter mock (chapter I name) with negative marking. Provide answer key + explanations." },
      { label: "Sam Physics Tutor", prompt: "Act as my 1:1 Physics tutor. Ask what topic I'm stuck on and teach interactively with mini-quizzes." },
    ],
  },

  "chemistry": {
    title: "Chemistry Deep Dive", emoji: "🧪", Icon: Beaker, gradient: G_GREEN,
    hint: "Physical · Organic · Inorganic",
    intro: "Full Chemistry mastery— mechanisms, 3D molecules, named reactions, and tutor.",
    features: [
      { label: "Physical Chemistry", prompt: "Ask a Physical Chemistry chapter, teach with derivations + 5 numericals + shortcuts." },
      { label: "Organic Mechanisms", prompt: "Ask an organic reaction (or class), then explain the mechanism as ASCII arrow-push diagrams step-by-step." },
      { label: "Inorganic Reactions", prompt: "Ask a block/topic in Inorganic (s/p/d/f), then produce a reaction table + trend chart + PYQ hits." },
      { label: "3D Molecules", prompt: "Ask a molecule, describe its 3D geometry, hybridization, VSEPR shape, and dipole with ASCII sketch." },
      { label: "Periodic Trends", prompt: "Explain 6 periodic trends with ASCII graphs and 2 PYQs each." },
      { label: "Named Reactions Vault", prompt: "List 20 must-know JEE named reactions with reactants → product, mechanism gist, and JEE frequency." },
      { label: "PYQs", prompt: "Ask a Chemistry chapter, then give 6 recent PYQs with full solutions and mechanisms where relevant." },
      { label: "Sam Chemistry Tutor", prompt: "Act as my Chemistry tutor. Ask my weakest topic and teach with visualisation + practice." },
    ],
  },

  "mathematics": {
    title: "Mathematics Deep Dive", emoji: "➗", Icon: Sigma, gradient: G_VIOLET,
    hint: "Concepts · tricks · graphs · PYQs",
    intro: "Build Maths intuition + speed. Concept, formula, tricks, graph visualiser, PYQs, and timed drills.",
    features: [
      { label: "Concept Builder", prompt: "Ask a Maths chapter, then teach the concept with proofs, geometric intuition, and 3 elegant examples." },
      { label: "Formula Library", prompt: "Ask a chapter, then give a compact Maths formula sheet with signs, edge cases, and pitfalls." },
      { label: "Tricks & Shortcuts", prompt: "Ask a chapter, then give 8 legit JEE shortcuts (with proof sketch) and when NOT to use each." },
      { label: "Graph Visualiser", prompt: "Ask a function or transformation, then describe the graph shape, key points, asymptotes and how each parameter changes it." },
      { label: "Step-by-step Solutions", prompt: "I'll paste a Maths problem — solve line-by-line with justification and an alternate method." },
      { label: "PYQs", prompt: "Ask a chapter, then give 6 recent Maths PYQs with elegant solutions." },
      { label: "Timed Practice (15 min)", prompt: "Give 8 JEE-Advanced Maths questions timed at 15 minutes with an answer key + solutions." },
      { label: "Sam Maths Tutor", prompt: "Act as my Maths tutor. Ask a chapter, teach interactively with tiny quizzes every 2 minutes." },
    ],
  },

  "formulas": {
    title: "Formula Library", emoji: "📚", Icon: BookOpen, gradient: G_TEAL,
    hint: "All formulas · flashcards · PDF-ready",
    intro: "Search any JEE formula across Physics, Chemistry, Maths. Save favourites, generate flashcards, or export.",
    features: [
      { label: "Physics Formulas Master", prompt: "Give the complete JEE Physics formula master list grouped by chapter, with units and use cases." },
      { label: "Chemistry Formulas Master", prompt: "Give the JEE Chemistry formula list (Physical + reactions) chapter-wise, with units." },
      { label: "Maths Formulas Master", prompt: "Give the complete JEE Maths formula list chapter-wise with domain/range notes." },
      { label: "Search a Formula", prompt: "I'll describe a scenario — recall the formula, list variables, units, and 2 usage examples." },
      { label: "Flashcards (20)", prompt: "Generate 20 formula flashcards (Q: formula name → A: formula + when to use) across P/C/M." },
      { label: "Favourite Formulas", prompt: "Ask my 10 favourite formulas by name, then build a laminated-card style cheat sheet with color-coded groups (described in text)." },
      { label: "PDF Export Blueprint", prompt: "Design a clean PDF export layout for a JEE formula book — sections, columns, index, and a memory-hook column." },
    ],
  },

  "concept-videos": {
    title: "Concept Videos", emoji: "🎥", Icon: Video, gradient: G_PINK,
    hint: "Scripted lessons + notes + quiz",
    intro: "Sam-scripted narrated concept lessons with notes, 2x playback tips, and post-video quizzes.",
    features: [
      { label: "HD Video Script", prompt: "Ask a topic, then write a 5-minute narrated HD-video script with scene descriptions and on-screen text overlays." },
      { label: "Short Revision Video", prompt: "Ask a topic, then write a 90-second short revision video script — hook, 3 beats, recall line." },
      { label: "2x Playback Notes", prompt: "Give a hyper-condensed note version of a topic optimised for 2x playback learners — key results only." },
      { label: "Summary", prompt: "I'll paste a topic— give a 6-bullet summary + a 3-line TL;DR." },
      { label: "Notes from Video", prompt: "Ask a topic, then produce clean tutor-quality notes as if written while watching the lecture." },
      { label: "Quiz After Video", prompt: "Ask a topic, then give a 6-question quiz to run after the video, with answers." },
      { label: "Bookmark Highlights", prompt: "Suggest 8 timestamps a student should bookmark for the topic (with 1-line rationale each)." },
    ],
  },

  "notes-gen": {
    title: "Notes Generator", emoji: "📝", Icon: PenLine, gradient: G_AMBER,
    hint: "notes· handwritten style· mind maps",
    intro: "Generate premium study notes in multiple styles — handwritten, one-page revision, or mind map.",
    features: [
      { label: "Notes (Full)", prompt: "Ask a chapter, then produce full study notes with headings, sub-headings, key terms bolded, formulas boxed, and TL;DR at top." },
      { label: "Handwritten Style", prompt: "Ask a chapter, then produce short handwritten-style notes (as text) with abbreviations, arrows, and margin doodle descriptions." },
      { label: "Mind Map", prompt: "Ask a chapter, then build a 3-level indented mind map covering all key concepts and their connections." },
      { label: "Flowcharts", prompt: "Ask a topic, then build a decision-tree / flowchart (ASCII) with branches for each condition." },
      { label: "One-Page Revision", prompt: "Ask a chapter, then produce a strict one-page revision note (~500 words) — all key formulas + 3 killer takeaways." },
      { label: "Export PDF Blueprint", prompt: "Design a premium PDF layout for revision notes — cover, index, chapter sections, formula boxes, margin space." },
    ],
  },

  "pyqs": {
    title: "Previous Year Papers", emoji: "⚡", Icon: FileText, gradient: G_ORANGE,
    hint: "Year-wise· chapter-wise· solved",
    intro: "PYQs sliced by year, chapter, difficulty— each with solutions and a personal performance report.",
    features: [
      { label: "Year-wise (last 5)", prompt: "Ask which year, then list 6 iconic questions from JEE Main + Advanced of that year with solutions." },
      { label: "Chapter-wise PYQs", prompt: "Ask a chapter, then give 8 JEE PYQs across years (Main + Adv) with solutions and yearly trend note." },
      { label: "Difficulty Filter (Hard)", prompt: "Give 6 JEE-Advanced-level HARD PYQs across P/C/M with detailed solutions." },
      { label: "Solutions Only", prompt: "I'll paste a PYQ— give the cleanest step-by-step solution + shortcut + concept behind it." },
      { label: "Bookmark for Revision", prompt: "Ask a chapter, then curate the 5 must-bookmark PYQs with reasoning." },
      { label: "Performance Report", prompt: "Ask my accuracy across 10 PYQ sets, then generate a performance report with strong/weak chapters + fix plan." },
    ],
  },

  "physics-solver": {
    title: "Physics Solver", emoji: "🔬", Icon: Calculator, gradient: G_BLUE,
    hint: "Camera · voice · step-by-step",
    intro: "Paste, type or describe any Physics problem — Sam solves it with the formula used, diagram, and similar practice.",
    features: [
      { label: "Solve a Problem", prompt: "I'll paste a Physics problem. Solve step-by-step. State given/find, list the formulas, work out algebraically, then numerically. End with a 1-line concept recall." },
      { label: "From Text/Voice Input", prompt: "I'll describe a problem in words — reconstruct the problem statement then solve step-by-step." },
      { label: "Formula Used Highlight", prompt: "After I paste a problem, list ONLY the formulas used and why each one applies, before the full solution." },
      { label: "Diagram as Text", prompt: "I'll paste a problem — sketch its diagram as ASCII (forces, angles, distances) before solving." },
      { label: "3 Similar Questions", prompt: "After I paste a problem, generate 3 similar questions of same concept (easy/med/hard) with answers." },
    ],
  },

  "chem-visualizer": {
    title: "Chemistry Visualizer", emoji: "🧪", Icon: Beaker, gradient: G_GREEN,
    hint: "Reactions animated · 3D molecules · mechanisms",
    intro: "Visualise reactions, mechanisms and molecular geometry step-by-step as text-animations.",
    features: [
      { label: "Reaction Animation", prompt: "Ask a chemical reaction, then describe its animation frame-by-frame: reactants approach → transition state → products, with electron movement." },
      { label: "3D Molecule", prompt: "Ask a molecule, describe its 3D geometry, hybridization, bond angles, and draw ASCII 3D projection." },
      { label: "Mechanism Builder", prompt: "Ask an organic mechanism, then build the arrow-push mechanism step-by-step with ASCII arrows and intermediate structures." },
      { label: "Color Changes", prompt: "Ask an inorganic test / reaction, then explain the color change with reasoning (electronic transitions or oxidation state)." },
      { label: "Lab Simulation", prompt: "Ask a lab experiment, then walk through the setup, procedure, observations, and expected result with safety notes." },
    ],
  },

  "math-solver": {
    title: "Math Solver", emoji: "➕", Icon: Calculator, gradient: G_VIOLET,
    hint: "Whiteboard-style solutions · graph plotter · alt methods",
    intro: "Solve any JEE Maths problem step-by-step with alternate methods and a video-style explanation.",
    features: [
      { label: "Solve a Problem", prompt: "I'll paste a Maths problem — solve line-by-line, justify each step, box the final answer." },
      { label: "Whiteboard Solution", prompt: "I'll paste a problem — solve as if on a whiteboard: numbered steps, side-notes, and boxed final answer." },
      { label: "Graph Plotter", prompt: "I'll give a function — describe its graph, roots, extrema, asymptotes, and sketch key points as an ASCII plot." },
      { label: "Alternate Method", prompt: "I'll paste a problem — solve it 2 different ways and compare which is faster for JEE." },
      { label: "Video Explanation Script", prompt: "I'll paste a problem — write a 3-minute video explanation script with scene direction." },
    ],
  },

  "formula-gen": {
    title: "Formula Generator", emoji: "🧮", Icon: Sigma, gradient: G_TEAL,
    hint: "Search · derive · related · units",
    intro: "Ask for any formula — Sam finds it, derives it, gives units, related formulas and worked examples.",
    features: [
      { label: "Search a Formula", prompt: "I'll name a scenario or law — return the formula, define each variable, give units, and 2 usage examples." },
      { label: "Full Derivation", prompt: "I'll name a formula — derive it from first principles with clear intermediate steps." },
      { label: "Unit Converter", prompt: "Explain SI ↔ CGS ↔ practical unit conversion for a topic I name, with 5 worked examples." },
      { label: "Related Formulas", prompt: "I'll name a formula — list 6 related/derived formulas with when to switch between them." },
      { label: "Solved Examples", prompt: "I'll name a formula — give 3 solved examples of increasing difficulty." },
    ],
  },

  "mistake-analysis": {
    title: "Mistake Analysis", emoji: "📊", Icon: BarChart3, gradient: G_PINK,
    hint: "Root-cause every mistake",
    intro: "Log mistakes, tag them, get root-cause + improvement graph.",
    features: [
      { label: "Log New Mistake", prompt: "Coach me on logging a mistake — ask chapter, question, mistake type, root cause and fix action. Then produce the log entry." },
      { label: "Error Type Classifier", prompt: "I'll paste 5 mistakes — classify each as Concept / Calculation / Silly / Misreading / Time / Formula, and give an overall pattern." },
      { label: "Suggestions", prompt: "I'll list my last 10 mistakes — suggest the top 3 systemic fixes with weekly drills." },
      { label: "Weak Topics from Mistakes", prompt: "I'll list mistakes with chapter tags — rank the 5 weakest topics by mistake density." },
      { label: "Improvement Graph", prompt: "I'll paste weekly mistake counts — describe the improvement graph as ASCII + a 1-line trend takeaway." },
    ],
  },

  "revision": {
    title: "Personalized Revision", emoji: "🔄", Icon: RefreshCw, gradient: G_TEAL,
    hint: "Smart · spaced · reminders",
    intro: "Build a personalised revision schedule (SM-2 spaced repetition), flashcards, and daily nudges.",
    features: [
      { label: "Smart Revision Plan (30d)", prompt: "Ask my subjects + weak chapters, then build a 30-day spaced-repetition revision plan with daily 45-min blocks." },
      { label: "Flashcards Set (20)", prompt: "Ask a chapter, then generate 20 flashcards (Q → A) for spaced repetition." },
      { label: "Today's Revision", prompt: "Suggest today's revision menu (3 chapters, 40 min total) based on typical JEE spaced-repetition schedule." },
      { label: "Spaced Repetition Explained", prompt: "Explain SM-2 spaced repetition applied to JEE prep with a concrete 30-day schedule." },
      { label: "Reminder Copy", prompt: "Write 6 crisp reminder messages (morning/afternoon/night) to nudge a JEE aspirant on revision without guilt." },
    ],
  },

  "voice-tutor": {
    title: "Voice Tutor", emoji: "🎙️", Icon: Mic, gradient: G_ORANGE,
    hint: "Ask by voice · explain again · language choice",
    intro: "Talk to Sam like a tutor — ask doubts, get explanations, take voice quizzes.",
    features: [
      { label: "Voice-style Explanation", prompt: "Ask a topic, then explain as if speaking aloud — pauses, rhetorical Qs, analogies. Format as narration lines." },
      { label: "Explain Again (Simpler)", prompt: "I'll name a topic — explain it TWICE: once deep, then simpler like I'm 15." },
      { label: "Language Selection", prompt: "Ask my preferred language (English / Hindi / Hinglish / Tamil / Telugu / Marathi), then give a bilingual mini-lesson on a topic I pick." },
      { label: "Quiz by Voice (5Q)", prompt: "Give 5 voice-style quiz questions on a topic I name, with pauses for me to answer, then reveal answers." },
      { label: "Ask a Doubt", prompt: "I have a doubt on a JEE topic. Ask what it is, then explain with concept + example + 1 practice question." },
    ],
  },

  "whiteboard": {
    title: "Whiteboard", emoji: "✍️", Icon: PenLine, gradient: G_VIOLET,
    hint: "Live-draw derivations · save notes",
    intro: "Text-based whiteboard — Sam draws steps, equations and graphs you can save.",
    features: [
      { label: "Live Derivation", prompt: "Ask a derivation topic, then simulate a whiteboard live-drawing: numbered steps, boxed intermediates, boxed final." },
      { label: "Equations Panel", prompt: "Ask a problem — set up all equations on the whiteboard (one per line) before solving." },
      { label: "Graph Sketch", prompt: "Ask a function — sketch it on the whiteboard with axes, key points, and behaviour." },
      { label: "Recording (script)", prompt: "Ask a topic — produce a 3-minute whiteboard-explanation script with what to draw and what to say." },
      { label: "Save Notes Blueprint", prompt: "Design a save-notes template for whiteboard sessions — topic, key steps, formula box, and 3 recall Qs at bottom." },
    ],
  },

  "sims-3d": {
    title: "3D Physics Simulations", emoji: "🌌", Icon: Play, gradient: G_BLUE,
    hint: "Mechanics · EM · Optics · Waves · Modern",
    intro: "Vivid text-based 3D simulations to feel each Physics chapter.",
    features: [
      { label: "Mechanics Sim", prompt: "Describe a 3D mechanics simulation (projectile / collisions / rotation): inputs, expected motion, forces, and observations frame-by-frame." },
      { label: "Electricity Sim", prompt: "Describe an electric circuit simulation with current flow, voltage drops, and Kirchhoff verification step-by-step." },
      { label: "Magnetism Sim", prompt: "Describe a 3D magnetism simulation (charged particle in field / EM induction / solenoid) with vector directions frame-by-frame." },
      { label: "Optics Sim", prompt: "Describe a ray-optics simulation (lens / mirror / prism / interference) with path diagrams and observed image." },
      { label: "Waves Sim", prompt: "Describe a wave simulation (standing waves / beats / Doppler): parameters and observed pattern." },
      { label: "Modern Physics Sim", prompt: "Describe a modern-physics simulation (photoelectric / Bohr atom / nuclear decay) with numbers and graph." },
    ],
  },

  "chem-lab": {
    title: "Chemistry Virtual Lab", emoji: "🧪", Icon: Beaker, gradient: G_GREEN,
    hint: "Safe virtual experiments",
    intro: "Run virtual JEE chemistry experiments — procedure, observations, viva.",
    features: [
      { label: "Virtual Titration", prompt: "Walk through a virtual acid-base titration: apparatus, procedure, indicator choice, observation table, calculations, and errors." },
      { label: "Salt Analysis", prompt: "Walk through a qualitative salt analysis for a cation + anion mix — dry tests + wet tests + confirmatory tests." },
      { label: "Safety Guide", prompt: "Give a JEE-relevant chemistry lab safety guide — 10 rules + 5 emergency drills." },
      { label: "Observation Table Template", prompt: "Design a clean observation-table template for a chemistry experiment — with columns and sample entries." },
      { label: "Viva Questions", prompt: "Give 15 likely viva questions on a chemistry experiment I name with model answers." },
      { label: "Result Analysis", prompt: "I'll paste my titration readings — analyse errors, compute mean, and give a % accuracy note." },
    ],
  },

  "graph-plotter": {
    title: "Graph Plotter", emoji: "📉", Icon: TrendingUp, gradient: G_TEAL,
    hint: "2D/3D · transformations · calculus",
    intro: "Sketch and study any function — transformations, calculus visualisation, ASCII plots.",
    features: [
      { label: "2D Graph", prompt: "I'll give a function y = f(x) — describe roots, extrema, asymptotes, monotonicity, and sketch ASCII plot." },
      { label: "3D Graph", prompt: "I'll give z = f(x,y) — describe surface shape, key sections, and level curves." },
      { label: "Transformations", prompt: "Explain 6 graph transformations (shift/stretch/reflect/mod/inverse) with before/after ASCII sketches." },
      { label: "Calculus Visualiser", prompt: "I'll give a function — visualise its derivative and integral with ASCII plots side by side." },
      { label: "Functions Library", prompt: "Give the shape + key features of 15 must-know JEE functions (polynomial, trig, log, exp, mod, greatest integer)." },
    ],
  },

  "formula-viz": {
    title: "Formula Visualizer", emoji: "🌀", Icon: Sparkles, gradient: G_PINK,
    hint: "See each variable move · real-life apps",
    intro: "Feel formulas — Sam animates each variable and grounds it in real-life examples.",
    features: [
      { label: "Animate a Formula", prompt: "Ask a formula, then describe how the output changes as each variable moves — with 5 numeric scenarios." },
      { label: "Variable Meaning", prompt: "Ask a formula, then explain what each variable physically means with an analogy." },
      { label: "Real-life Applications", prompt: "Ask a formula, then give 6 real-life applications (with numbers where possible)." },
      { label: "Examples (Numeric)", prompt: "Ask a formula, then give 5 numeric plug-and-solve examples with answers." },
    ],
  },

  "adaptive-mock": {
    title: "Adaptive Mock Tests", emoji: "🎯", Icon: Target, gradient: G_AMBER,
    hint: "Difficulty grows with you",
    intro: "Full JEE mocks that adapt difficulty as you go, with detailed analysis and rank prediction.",
    features: [
      { label: "Design 30-Q Adaptive Mock", prompt: "Design a 30-question adaptive JEE mock structure: rules for difficulty escalation, scoring, and adaptive logic." },
      { label: "Full Mock Blueprint", prompt: "Design a 3-hour full JEE Main mock blueprint — section split (P/C/M), question count, marks, negative marking." },
      { label: "Chapter-focused Mock", prompt: "Ask 3 chapters, then design a 15-Q mock across those chapters with adaptive difficulty and answer key." },
      { label: "Detailed Analysis", prompt: "I'll paste my mock scores per section + time per question — produce a full analytical report with weak areas + fix plan." },
      { label: "Rank Prediction from Mock", prompt: "I'll give my mock score — predict AIR band and likely college fit. Use realistic ranges." },
    ],
  },

  "chapter-tests": {
    title: "Chapter Tests", emoji: "📄", Icon: ClipboardList, gradient: G_BLUE,
    hint: "Easy · Medium · Hard · Retry",
    intro: "Chapter-wise timed tests with 3 difficulty tiers, solutions and retry mode.",
    features: [
      { label: "Easy Chapter Test", prompt: "Ask a chapter, then give a 10-Q EASY test with answers." },
      { label: "Medium Chapter Test", prompt: "Ask a chapter, then give a 10-Q MEDIUM test with detailed solutions." },
      { label: "Hard Chapter Test", prompt: "Ask a chapter, then give a 10-Q HARD JEE-Advanced-style test with detailed solutions." },
      { label: "Timer Strategy", prompt: "Suggest a timer strategy for a 20-Q chapter test with 30-minute cap — split, pace, review cycles." },
      { label: "Solutions Only", prompt: "I'll paste a chapter test— give clean solutions for each question." },
      { label: "Retry Weak Ones", prompt: "I'll list which Qs I got wrong — regenerate a 5-Q retry set on those concepts with fresh questions." },
    ],
  },

  "speed-tests": {
    title: "Speed Tests", emoji: "⚡", Icon: Timer, gradient: G_ORANGE,
    hint: "15-min bursts · accuracy · ranking",
    intro: "Rapid speed drills to build JEE pace + accuracy.",
    features: [
      { label: "15-min Physics Burst", prompt: "Give 10 Physics MCQs designed to complete in 15 minutes with target time per Q + answer key." },
      { label: "15-min Chemistry Burst", prompt: "Give 10 Chemistry MCQs for 15 minutes with target time per Q + answers." },
      { label: "15-min Maths Burst", prompt: "Give 10 Maths MCQs for 15 minutes with target time per Q + answers." },
      { label: "Accuracy Feedback", prompt: "I'll paste my score + time — give accuracy vs speed feedback with 3 tactical fixes." },
      { label: "Time-per-Question Analysis", prompt: "I'll give per-Q times for 10 questions — identify slow questions, root cause, and drills." },
      { label: "Speed Ranking Sim", prompt: "Simulate today's top-15 speed-test leaderboard with accuracy + avg time. Show where an average aspirant lands." },
    ],
  },

  "time-mgmt": {
    title: "Time Management Practice", emoji: "⏱️", Icon: Timer, gradient: G_VIOLET,
    hint: "Strategy · skip · pacing",
    intro: "Coach yourself on JEE paper strategy — order, skip rules, review loops.",
    features: [
      { label: "3-hour Paper Strategy", prompt: "Coach me on JEE Main 3-hour paper strategy — subject order, skip rule, first-pass / second-pass, review cycle." },
      { label: "Question Selection Drill", prompt: "Simulate a 30-Q paper with mixed difficulty — teach me how to pick the right 20 in 90 minutes." },
      { label: "Skip Strategy", prompt: "Give a decision tree for when to skip a question in JEE (based on read-time / concept familiarity / branching)." },
      { label: "Feedback on Attempt", prompt: "I'll describe how I attempted a mock — give feedback on time distribution + skip decisions + improvements." },
    ],
  },

  "daily-challenge": {
    title: "Daily Challenge", emoji: "🔥", Icon: Flame, gradient: G_ORANGE,
    hint: "One killer Q + bonus + rewards",
    intro: "Today's flagship JEE problem + bonus challenge + reward + leaderboard.",
    features: [
      { label: "Today's Killer Problem", prompt: "Give today's flagship JEE-Advanced-level killer problem across P/C/M with hint ladder (3 hints) + full solution." },
      { label: "Bonus Challenge", prompt: "Give a bonus JEE brain-teaser problem with an elegant one-line solution." },
      { label: "Rewards System", prompt: "Design a rewards system for JEE Daily Challenges — XP, coins, streak bonuses, badges, and spend menu." },
      { label: "Leaderboard Simulation", prompt: "Simulate today's top-10 Daily Challenge leaderboard with usernames, streak days and points." },
    ],
  },

  "air-predict": {
    title: "AIR Prediction", emoji: "🏆", Icon: Award, gradient: G_AMBER,
    hint: "Expected AIR · college chances · improvement",
    intro: "Estimate AIR from your current mock scores and get an improvement roadmap.",
    features: [
      { label: "Expected AIR", prompt: "Ask my mock score band, then predict AIR range with reasoning." },
      { label: "College Chances", prompt: "Ask my predicted AIR + home state + category, then list 8 IIT/NIT/IIIT choices with High/Med/Low chance." },
      { label: "Improvement Suggestions", prompt: "Ask my current AIR band and target AIR — give a chapter-priority improvement plan to close the gap in 90 days." },
      { label: "Trend Analysis", prompt: "Show 5-year AIR-vs-marks trend for JEE Main + Advanced with commentary on what shifted each year." },
    ],
  },

  "topic-accuracy": {
    title: "Topic Accuracy", emoji: "🎯", Icon: Target, gradient: G_TEAL,
    hint: "By chapter · attempts · weakness",
    intro: "Track accuracy per topic, weakness score, and improvement chart.",
    features: [
      { label: "Topic-wise Accuracy", prompt: "I'll list my chapters + accuracy % — build a topic accuracy table with High/Med/Low tags." },
      { label: "Speed by Topic", prompt: "I'll list my avg time per topic — flag slow topics and suggest speed drills." },
      { label: "Attempts Log", prompt: "Design an attempts log template — chapter, mock #, marks, accuracy %, weakness score." },
      { label: "Weakness Score", prompt: "Compute a Weakness Score (0-100) for chapters I list, using accuracy + speed + PYQ frequency." },
      { label: "Improvement Chart", prompt: "I'll give weekly accuracy — describe the improvement chart as ASCII and 1-line trend." },
    ],
  },

  "speed-analysis": {
    title: "Speed Analysis", emoji: "⚡", Icon: Zap, gradient: G_BLUE,
    hint: "Avg time · slow chapters · fast tips",
    intro: "Deep speed analytics per chapter with tactical fixes.",
    features: [
      { label: "Average Time per Question", prompt: "I'll paste per-Q times for a mock — compute average, median, and stddev per subject." },
      { label: "Slow Chapters", prompt: "I'll list per-chapter avg time — flag the 3 slowest chapters with fix drills." },
      { label: "Fastest Topics", prompt: "I'll list per-chapter avg time — flag the 3 fastest topics I can convert into scoring goldmines." },
      { label: "Speed Tips", prompt: "Give 10 concrete speed-boosting tips for JEE (reading, computation, elimination, shortcuts)." },
    ],
  },
  "coaching-classes": {
    title: "Coaching Classes", emoji: "🎥", Icon: Video, gradient: G_VIOLET,
    hint: "Upload lecture series · premium cloud",
    intro: "Build your own coaching library — create a series per chapter and upload lecture videos in order. Video uploads unlock with 6-month (1 TB · HD) or 12-month (2 TB · 4K) premium.",
    features: [],
  },

  "sam-suggest": {
    title: "Sam Suggest", emoji: "🧭", Icon: Brain, gradient: G_TEAL,
    hint: "Weak topics → advice → YouTube plan",
    intro: "Rate every Physics, Chemistry and Maths sub-topic. Sam analyses your weak zones, tells you exactly what knowledge is missing, and generates the YouTube lectures worth watching first.",
    features: [],
  },
};

export type { Feature, ToolDef };
