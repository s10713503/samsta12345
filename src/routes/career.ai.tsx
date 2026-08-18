import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CareerShell, GlassCard } from "@/components/samsta/CareerShell";
import { streamSam } from "@/lib/stream-sam";
import { Sparkles, Send, FileText, MessageSquare, Target, Route as RouteIcon, ScanLine, MessagesSquare, GitBranch, DollarSign } from "lucide-react";

export const Route = createFileRoute("/career/ai")({ component: AI });

const TOOLS = [
  { id: "career_coach", label: "Career Coach", icon: Target, placeholder: "Describe your role and goal…" },
  { id: "career_ats", label: "ATS Resume Score", icon: ScanLine, placeholder: "Paste your resume text (and target job title)…" },
  { id: "career_roadmap", label: "90-Day Roadmap", icon: RouteIcon, placeholder: "Current role → target role" },
  { id: "career_interview", label: "Interview Prep", icon: MessagesSquare, placeholder: "Role, company, level" },
  { id: "career_skill_gap", label: "Skill Gap", icon: GitBranch, placeholder: "Current skills → target role" },
  { id: "career_salary", label: "Salary Predictor", icon: DollarSign, placeholder: "Role, years, location, key skills" },
  { id: "career_pitch", label: "Outreach Pitch", icon: Send, placeholder: "Who are you contacting and why?" },
  { id: "career_bio", label: "Pro Bio Rewrite", icon: FileText, placeholder: "Paste your current bio…" },
  { id: "future_sim", label: "Career Simulator", icon: RouteIcon, placeholder: "Describe a career scenario…" },
] as const;

function AI() {
  const [tool, setTool] = useState<(typeof TOOLS)[number]["id"]>("career_coach");
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!input.trim()) return;
    setBusy(true); setOut("");
    try {
      await streamSam(tool, [{ role: "user", content: input }], (acc) => setOut(acc));
    } catch (e) {
      setOut(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  const cur = TOOLS.find((t) => t.id === tool)!;
  return (
    <CareerShell title="Career Tools" subtitle="Powered by Sam.">
      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TOOLS.map((t) => (
          <button key={t.id} onClick={() => { setTool(t.id); setOut(""); }} className={`shrink-0 rounded-full border px-3 py-2 text-xs transition ${tool === t.id ? "border-[#e8c874]/60 bg-[#e8c874]/15 text-[#e8c874]" : "border-white/10 bg-white/[0.03] text-white/70"}`}>
            <t.icon className="mr-1 inline h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>
      <GlassCard className="space-y-3 p-4">
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={4} placeholder={cur.placeholder} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm outline-none placeholder:text-white/30" />
        <button onClick={run} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60">
          <Sparkles className="h-4 w-4" /> {busy ? "Thinking…" : "Generate"}
        </button>
      </GlassCard>
      {out && (
        <GlassCard className="mt-4 whitespace-pre-wrap p-4 text-sm text-white/85"><MessageSquare className="mr-1 inline h-3.5 w-3.5 text-[#e8c874]" />{out}</GlassCard>
      )}
    </CareerShell>
  );
}