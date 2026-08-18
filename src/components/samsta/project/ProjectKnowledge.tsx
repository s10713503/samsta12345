// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Pin, Trash2, BarChart3, Eye, Heart, Users, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listNotes, createNote, updateNote, deleteNote, getProjectAnalytics,
} from "@/lib/api/orbit-workspace";

/** Knowledge Hub — project docs, decisions and learnings. */
export function KnowledgeHub({ projectId, meId, canEdit }: { projectId: string; meId: string | null; canEdit: boolean }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: notes = [], refetch } = useQuery({
    queryKey: ["orbit-project-notes", projectId],
    queryFn: () => listNotes(projectId),
  });

  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setErr(null);
    try { await fn(); await refetch(); }
    catch (e: any) { setErr(e?.message ?? "Something went wrong."); }
    finally { setBusy(false); }
  };

  return (
    <div className="glass rounded-3xl p-4 animate-fade-up">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5" /> Knowledge Hub
      </div>

      {canEdit && (
        <div className="mt-2 flex flex-col gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entry title…"
            className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
            placeholder="Write a decision, setup guide or learning…"
            className="glass resize-none rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          <button disabled={busy || !title.trim()}
            onClick={() => run(async () => { await createNote(projectId, meId, title, body); setTitle(""); setBody(""); })}
            className="self-end rounded-2xl px-4 py-2 text-xs font-semibold text-white shadow-md active:scale-95 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            Save entry
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {notes.map((n) => (
          <div key={n.id} className="glass-strong rounded-2xl p-3 animate-fade-up">
            <div className="flex items-center gap-2">
              <button onClick={() => setOpen(open === n.id ? null : n.id)}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium active:scale-[0.99]">
                {n.pinned && <Pin className="mr-1 inline h-3 w-3 text-primary" />}{n.title}
              </button>
              {canEdit && (
                <>
                  <button aria-label="Pin entry" onClick={() => run(() => updateNote(n.id, { pinned: !n.pinned }))}
                    className={cn("active:scale-90", n.pinned ? "text-primary" : "text-muted-foreground")}>
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button aria-label="Delete entry" onClick={() => run(() => deleteNote(n.id))}
                    className="text-muted-foreground active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
                </>
              )}
            </div>
            {open === n.id && n.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
            )}
          </div>
        ))}
        {!notes.length && <p className="text-sm text-muted-foreground">Nothing in the Knowledge Hub yet.</p>}
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}

/** Analytics Dashboard — reach, engagement and delivery health. */
export function AnalyticsPanel({ projectId }: { projectId: string }) {
  const { data: a } = useQuery({
    queryKey: ["orbit-project-analytics", projectId],
    queryFn: () => getProjectAnalytics(projectId),
  });

  if (!a) return <div className="glass h-40 animate-pulse rounded-3xl" />;

  const stats = [
    { label: "Views", value: a.views, Icon: Eye },
    { label: "Appreciations", value: a.appreciations, Icon: Heart },
    { label: "Followers", value: a.followers, Icon: Bell },
    { label: "Collaborators", value: a.collaborators, Icon: Users },
  ];
  const peak = Math.max(1, ...a.weekly.map((w) => w.updates));

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <div className="grid grid-cols-2 gap-2">
        {stats.map(({ label, value, Icon }) => (
          <div key={label} className="glass rounded-3xl p-3">
            <Icon className="h-4 w-4 text-primary" />
            <div className="mt-1 font-display text-2xl italic leading-none">{value}</div>
            <div className="text-[11px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" /> Activity this week
        </div>
        <div className="mt-3 flex h-24 items-end gap-2">
          {a.weekly.map((w, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="w-full rounded-t-lg transition-all duration-700"
                style={{
                  height: `${Math.max(4, (w.updates / peak) * 80)}px`,
                  background: "linear-gradient(180deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))",
                }} />
              <span className="text-[9px] text-muted-foreground">{w.day}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-y-1 text-[11px] text-muted-foreground">
          <span>Updates · 7 days</span><span className="text-right font-semibold text-foreground">{a.updatesThisWeek}</span>
          <span>Updates · 30 days</span><span className="text-right font-semibold text-foreground">{a.updatesThisMonth}</span>
          <span>Tasks completed</span><span className="text-right font-semibold text-foreground">{a.tasksDone}/{a.tasksTotal} · {a.completion}%</span>
          <span>Active work streams</span><span className="text-right font-semibold text-foreground">{a.openStreams}</span>
          <span>Open merge proposals</span><span className="text-right font-semibold text-foreground">{a.openProposals}</span>
          <span>Knowledge entries</span><span className="text-right font-semibold text-foreground">{a.knowledgeEntries}</span>
        </div>
      </div>

      {!!a.techUsage.length && (
        <div className="glass rounded-3xl p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Technology in use</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {a.techUsage.map((t) => (
              <span key={t.name} className="glass-strong rounded-full px-2 py-0.5 text-[10px] font-medium">{t.name}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
