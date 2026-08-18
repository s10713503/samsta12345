// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Rocket, Loader2 } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import { createOrbitProject, PROJECT_CATEGORIES, WORK_STATUS } from "@/lib/api/orbit-projects";
import { enhanceProject } from "@/lib/orbit-projects.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orbit/projects/new")({
  component: NewProject,
  head: () => ({
    meta: [
      { title: "Create an Orbit Project · Samsta" },
      { name: "description", content: "Launch a new Orbit Project with AI-written summary, description, documentation and project scores." },
      { property: "og:title", content: "Create an Orbit Project · Samsta" },
      { property: "og:description", content: "Publish your work with AI-generated docs and project scores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const field = "glass mt-1 w-full rounded-2xl bg-transparent px-3 py-2 text-sm outline-none";

function NewProject() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [f, setF] = useState({
    name: "", summary: "", description: "", category: "Web App",
    tech_stack: "", goals: "", roadmap: "", docs_url: "", demo_url: "",
    source_url: "", download_url: "", website_url: "",
    progress: 0, work_status: "in_progress", visibility: "public",
    ai_health_score: null, ai_innovation_score: null, ai_notes: "",
  });
  const [ai, setAi] = useState<any>(null);
  const [busy, setBusy] = useState<null | "ai" | "save">(null);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const runAI = async () => {
    if (!f.name.trim()) { setErr("Name your project first."); return; }
    setBusy("ai"); setErr(null);
    try {
      const r = await enhanceProject({
        data: {
          name: f.name, category: f.category, summary: f.summary, description: f.description,
          techStack: f.tech_stack.split(",").map((s) => s.trim()).filter(Boolean),
          goals: f.goals, progress: Number(f.progress),
        },
      });
      setAi(r);
      setF((p) => ({
        ...p,
        summary: r.summary || p.summary,
        description: r.description || p.description,
        roadmap: r.roadmap || p.roadmap,
        ai_health_score: r.healthScore,
        ai_innovation_score: r.innovationScore,
        ai_notes: r.notes,
      }));
    } catch (e: any) {
      setErr(e?.message ?? "AI could not enhance this project.");
    } finally { setBusy(null); }
  };

  const save = async () => {
    if (!user?.id) { setErr("Sign in to create a project."); return; }
    setBusy("save"); setErr(null);
    try {
      const p = await createOrbitProject(user.id, {
        ...f,
        progress: Number(f.progress) || 0,
        tech_stack: f.tech_stack,
        ai_notes: ai ? `${f.ai_notes}${ai.docs ? `\n\n${ai.docs}` : ""}` : f.ai_notes,
      });
      navigate({ to: "/orbit/projects/$projectId", params: { projectId: p.id } });
    } catch (e: any) {
      setErr(e?.message ?? "Could not create the project.");
      setBusy(null);
    }
  };

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title="New Orbit Project" subtitle="AI helps you tell the story" backTo="/orbit/projects" />

      <main className="relative mt-4 flex flex-col gap-3 px-4">
        <div className="glass rounded-3xl p-4">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project name</label>
          <input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={120}
            placeholder="Samsta Study Twin" className={field} />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Category</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {PROJECT_CATEGORIES.map((c) => (
              <button key={c} onClick={() => set("category", c)}
                className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium",
                  f.category === c ? "bg-foreground text-background" : "glass text-muted-foreground")}>
                {c}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Short summary</label>
          <input value={f.summary} onChange={(e) => set("summary", e.target.value)} maxLength={180}
            placeholder="One line that sells it" className={field} />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Full description</label>
          <textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={5}
            placeholder="What it does, who it's for, how it works" className={cn(field, "resize-none")} />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Technology stack (comma separated)</label>
          <input value={f.tech_stack} onChange={(e) => set("tech_stack", e.target.value)}
            placeholder="React, TypeScript, Postgres, Lovable AI" className={field} />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Goals</label>
          <textarea value={f.goals} onChange={(e) => set("goals", e.target.value)} rows={3}
            placeholder="What success looks like" className={cn(field, "resize-none")} />

          <button onClick={runAI} disabled={busy === "ai"}
            className="glass mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-60">
            {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
            {busy === "ai" ? "AI is writing…" : "AI Project Builder — write & score it"}
          </button>

          {ai && (
            <div className="glass-strong mt-3 rounded-2xl p-3 text-xs animate-fade-up">
              <div className="flex gap-3 font-semibold">
                <span>Health {ai.healthScore}</span>
                <span>Innovation {ai.innovationScore}</span>
                <span>Career {ai.careerReadiness}</span>
              </div>
              {!!ai.strengths?.length && (
                <ul className="mt-2 list-disc pl-4 text-muted-foreground">
                  {ai.strengths.map((s: string) => <li key={s}>{s}</li>)}
                </ul>
              )}
              {!!ai.risks?.length && (
                <ul className="mt-1 list-disc pl-4 text-destructive/80">
                  {ai.risks.map((s: string) => <li key={s}>{s}</li>)}
                </ul>
              )}
              {ai.notes && <p className="mt-2">{ai.notes}</p>}
            </div>
          )}
        </div>

        <div className="glass rounded-3xl p-4">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Links</label>
          <input value={f.demo_url} onChange={(e) => set("demo_url", e.target.value)} placeholder="Live demo (https://…)" className={field} />
          <input value={f.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder="Source files (https://…)" className={field} />
          <input value={f.docs_url} onChange={(e) => set("docs_url", e.target.value)} placeholder="Documentation (https://…)" className={field} />
          <input value={f.download_url} onChange={(e) => set("download_url", e.target.value)} placeholder="App / APK download (https://…)" className={field} />
          <input value={f.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="Website (https://…)" className={field} />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Progress · {f.progress}%
          </label>
          <input type="range" min={0} max={100} value={f.progress}
            onChange={(e) => set("progress", Number(e.target.value))} className="mt-2 w-full" />

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {WORK_STATUS.map((s) => (
              <button key={s.key} onClick={() => set("work_status", s.key)}
                className={cn("rounded-full px-2.5 py-1 text-[11px] font-medium",
                  f.work_status === s.key ? "bg-foreground text-background" : "glass text-muted-foreground")}>
                {s.label}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Visibility</label>
          <div className="mt-1 flex gap-1.5">
            {["public", "private"].map((v) => (
              <button key={v} onClick={() => set("visibility", v)}
                className={cn("rounded-full px-3 py-1 text-[11px] font-medium capitalize",
                  f.visibility === v ? "bg-foreground text-background" : "glass text-muted-foreground")}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {err && <div className="text-xs text-destructive">{err}</div>}

        <button onClick={save} disabled={busy === "save"}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white shadow-md active:scale-[0.98] disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {busy === "save" ? "Launching…" : "Launch project"}
        </button>
      </main>
    </div>
  );
}
