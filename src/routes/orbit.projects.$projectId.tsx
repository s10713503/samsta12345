// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Heart, Users, Eye, Bell, Sparkles, ExternalLink, Download, FileText,
  GitBranch, Copy, Trash2, Send, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/hooks/use-auth";
import { OrbitHeader } from "@/components/samsta/OrbitHeader";
import {
  getOrbitProject, listProjectAssets, listProjectUpdates, listProjectMembers,
  toggleAppreciate, toggleProjectFollow, addProjectUpdate, inviteCollaborator,
  duplicateOrbitProject, deleteOrbitProject, subscribeProjects, WORK_STATUS,
} from "@/lib/api/orbit-projects";
import { enhanceProject } from "@/lib/orbit-projects.functions";
import { subscribeWorkspace } from "@/lib/api/orbit-workspace";
import { TaskBoard, StreamsPanel } from "@/components/samsta/project/ProjectBoards";
import { KnowledgeHub, AnalyticsPanel } from "@/components/samsta/project/ProjectKnowledge";

export const Route = createFileRoute("/orbit/projects/$projectId")({
  component: ProjectWorkspace,
  head: () => ({
    meta: [
      { title: "Orbit Project workspace · Samsta" },
      { name: "description", content: "Project overview, progress timeline, collaborators and AI project scores inside the Samsta Orbit Project Hub." },
      { property: "og:title", content: "Orbit Project workspace · Samsta" },
      { property: "og:description", content: "Overview, progress timeline, collaborators and AI scores for this Orbit Project." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const TABS = ["Overview", "Board", "Streams", "Timeline", "Knowledge", "Analytics", "Team", "AI"] as const;

function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const { user } = useAuthUser();
  const meId = user?.id ?? null;
  const [tab, setTab] = useState<typeof TABS[number]>("Overview");
  const [update, setUpdate] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ai, setAi] = useState<any>(null);

  const { data: p, refetch } = useQuery({
    queryKey: ["orbit-project", projectId, meId],
    queryFn: () => getOrbitProject(projectId, meId),
  });
  const { data: assets = [] } = useQuery({
    queryKey: ["orbit-project-assets", projectId],
    queryFn: () => listProjectAssets(projectId),
  });
  const { data: updates = [], refetch: refetchUpdates } = useQuery({
    queryKey: ["orbit-project-updates", projectId],
    queryFn: () => listProjectUpdates(projectId),
  });
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ["orbit-project-members", projectId],
    queryFn: () => listProjectMembers(projectId),
  });

  useEffect(() => {
    let t: any;
    return subscribeProjects(() => {
      clearTimeout(t);
      t = setTimeout(() => { refetch(); refetchUpdates(); refetchMembers(); }, 600);
    });
  }, [refetch, refetchUpdates, refetchMembers]);

  const qc = useQueryClient();
  useEffect(() => {
    let t: any;
    return subscribeWorkspace(projectId, () => {
      clearTimeout(t);
      t = setTimeout(() => {
        for (const k of ["orbit-project-tasks", "orbit-project-streams", "orbit-project-merges",
          "orbit-project-notes", "orbit-project-analytics"]) {
          qc.invalidateQueries({ queryKey: [k, projectId] });
        }
      }, 400);
    });
  }, [projectId, qc]);

  const mine = !!p && p.user_id === meId;
  const canEdit = mine || (!!meId && members.some((m: any) => m.user_id === meId));


  const act = async (key: string, fn: () => Promise<any>) => {
    setBusy(key); setErr(null);
    try { await fn(); await refetch(); }
    catch (e: any) { setErr(e?.message ?? "Something went wrong."); }
    finally { setBusy(null); }
  };

  if (!p) {
    return (
      <div className="min-h-dvh pb-32">
        <OrbitHeader title="Project" backTo="/orbit/projects" />
        <div className="glass mx-4 mt-6 h-40 animate-pulse rounded-3xl" />
      </div>
    );
  }

  const status = WORK_STATUS.find((s) => s.key === p.work_status)?.label ?? "Work in Progress";

  return (
    <div className="relative min-h-dvh pb-32">
      <OrbitHeader title={p.name} subtitle={`${p.category || "Project"} · ${status}`} backTo="/orbit/projects" />

      <main className="relative mt-4 flex flex-col gap-3 px-4">
        {p.cover_url && (
          <img src={p.cover_url} alt={`${p.name} cover`} className="h-40 w-full rounded-3xl object-cover" loading="lazy" />
        )}

        <div className="glass rounded-3xl p-4">
          {p.summary && <p className="text-sm">{p.summary}</p>}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <span className="block h-full rounded-full transition-all duration-700"
              style={{ width: `${p.progress}%`, background: "linear-gradient(90deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }} />
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {p.appreciate_count}</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {p.member_count}</span>
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {p.view_count}</span>
            <span className="ml-auto font-semibold text-foreground">{p.progress}%</span>
          </div>

          <div className="mt-3 flex gap-2">
            <button onClick={() => act("appreciate", () => toggleAppreciate(p.id, meId, !p.appreciated))}
              disabled={busy === "appreciate"}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold active:scale-95",
                p.appreciated ? "bg-foreground text-background" : "glass")}>
              <Heart className={cn("h-4 w-4", p.appreciated && "fill-current")} /> Appreciate
            </button>
            <button onClick={() => act("follow", () => toggleProjectFollow(p.id, meId, !p.following))}
              disabled={busy === "follow"}
              className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold active:scale-95",
                p.following ? "bg-foreground text-background" : "glass")}>
              <Bell className="h-4 w-4" /> Follow
            </button>
            {meId && (
              <button onClick={() => act("copy", () => duplicateOrbitProject(p, meId))} disabled={busy === "copy"}
                aria-label="Create a copy" className="glass flex w-11 items-center justify-center rounded-2xl active:scale-95">
                <Copy className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("shrink-0 rounded-full px-3 py-1.5 text-xs font-medium active:scale-95",
                tab === t ? "bg-foreground text-background" : "glass text-muted-foreground")}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <div className="glass rounded-3xl p-4 animate-fade-up">
            {p.description && <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.description}</p>}
            {!!p.tech_stack?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.tech_stack.map((t) => (
                  <span key={t} className="glass rounded-full px-2 py-0.5 text-[10px] font-medium">{t}</span>
                ))}
              </div>
            )}
            {p.goals && (
              <>
                <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Goals</div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{p.goals}</p>
              </>
            )}
            {p.roadmap && (
              <>
                <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Future roadmap</div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{p.roadmap}</p>
              </>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { url: p.demo_url, label: "Live demo", Icon: ExternalLink },
                { url: p.source_url, label: "Source files", Icon: GitBranch },
                { url: p.docs_url, label: "Documentation", Icon: FileText },
                { url: p.download_url, label: "Download", Icon: Download },
                { url: p.website_url, label: "Website", Icon: ExternalLink },
              ].filter((l) => l.url).map(({ url, label, Icon }) => (
                <a key={label} href={url} target="_blank" rel="noreferrer noopener"
                  className="glass flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-medium active:scale-95">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </a>
              ))}
            </div>
            {!!assets.length && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {assets.map((a) => (
                  a.kind === "video"
                    ? <video key={a.id} src={a.url} controls preload="none" className="w-full rounded-2xl" />
                    : <img key={a.id} src={a.url} alt={a.title ?? "Project asset"} loading="lazy" className="w-full rounded-2xl object-cover" />
                ))}
              </div>
            )}
            {mine && (
              <button onClick={() => act("delete", async () => { await deleteOrbitProject(p.id); history.back(); })}
                className="mt-4 flex items-center gap-1.5 text-xs text-destructive active:scale-95">
                <Trash2 className="h-3.5 w-3.5" /> Delete project
              </button>
            )}
          </div>
        )}

        {tab === "Board" && <TaskBoard projectId={p.id} meId={meId} canEdit={canEdit} />}

        {tab === "Streams" && (
          <StreamsPanel projectId={p.id} meId={meId} canEdit={canEdit} isOwner={mine} />
        )}

        {tab === "Knowledge" && <KnowledgeHub projectId={p.id} meId={meId} canEdit={canEdit} />}

        {tab === "Analytics" && <AnalyticsPanel projectId={p.id} />}

        {tab === "Timeline" && (
          <div className="glass rounded-3xl p-4 animate-fade-up">
            {mine && (
              <div className="mb-3 flex items-center gap-2">
                <input value={update} onChange={(e) => setUpdate(e.target.value)}
                  placeholder="Post a progress update…"
                  className="glass flex-1 rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
                <button
                  onClick={() => act("update", async () => {
                    await addProjectUpdate(p.id, meId, update, { progress: p.progress });
                    setUpdate(""); await refetchUpdates();
                  })}
                  disabled={busy === "update" || !update.trim()} aria-label="Post update"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md active:scale-90 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
            {!updates.length && <p className="text-sm text-muted-foreground">No progress updates yet.</p>}
            <div className="space-y-3 border-l border-border/60 pl-3">
              {updates.map((u) => (
                <div key={u.id} className="animate-fade-up">
                  <div className="text-[11px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleString()}{typeof u.progress === "number" ? ` · ${u.progress}%` : ""}
                  </div>
                  {u.title && <div className="text-sm font-semibold">{u.title}</div>}
                  <p className="whitespace-pre-wrap text-sm">{u.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "Team" && (
          <div className="glass rounded-3xl p-4 animate-fade-up">
            {mine && (
              <div className="mb-3 flex items-center gap-2">
                <input value={invite} onChange={(e) => setInvite(e.target.value)} placeholder="@username"
                  className="glass flex-1 rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
                <button
                  onClick={() => act("invite", async () => {
                    await inviteCollaborator(p.id, invite); setInvite(""); await refetchMembers();
                  })}
                  disabled={busy === "invite" || !invite.trim()}
                  className="glass rounded-2xl px-3 py-2 text-xs font-semibold active:scale-95">
                  Invite
                </button>
              </div>
            )}
            {members.map((m) => {
              const n = m.profile?.full_name || m.profile?.username || "Samsta member";
              return (
                <Link key={m.id} to="/profile/$userId" params={{ userId: m.user_id }}
                  className="flex items-center gap-2.5 py-2">
                  <div className="h-8 w-8 overflow-hidden rounded-full bg-muted">
                    {m.profile?.avatar_url
                      ? <img src={m.profile.avatar_url} alt={n} className="h-full w-full object-cover" loading="lazy" />
                      : <div className="flex h-full w-full items-center justify-center text-[11px] text-muted-foreground">{n.slice(0, 1)}</div>}
                  </div>
                  <span className="flex-1 truncate text-sm font-medium">{n}</span>
                  <span className="text-[11px] capitalize text-muted-foreground">{m.role}</span>
                </Link>
              );
            })}
            {!members.length && <p className="text-sm text-muted-foreground">No collaborators yet.</p>}
          </div>
        )}

        {tab === "AI" && (
          <div className="glass rounded-3xl p-4 animate-fade-up">
            <div className="flex gap-3 text-sm font-semibold">
              <span>Health {p.ai_health_score ?? "—"}</span>
              <span>Innovation {p.ai_innovation_score ?? "—"}</span>
            </div>
            {p.ai_notes && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{p.ai_notes}</p>}
            {mine && (
              <button
                onClick={() => act("ai", async () => {
                  const r = await enhanceProject({
                    data: {
                      name: p.name, category: p.category ?? "", summary: p.summary ?? "",
                      description: p.description ?? "", techStack: p.tech_stack ?? [],
                      goals: p.goals ?? "", progress: p.progress,
                    },
                  });
                  setAi(r);
                })}
                disabled={busy === "ai"}
                className="glass mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold active:scale-[0.98] disabled:opacity-60">
                {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
                {busy === "ai" ? "Reviewing…" : "Run AI project review"}
              </button>
            )}
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
                {ai.docs && <pre className="mt-2 whitespace-pre-wrap font-sans">{ai.docs}</pre>}
              </div>
            )}
          </div>
        )}

        {err && <div className="text-xs text-destructive">{err}</div>}
      </main>
    </div>
  );
}
