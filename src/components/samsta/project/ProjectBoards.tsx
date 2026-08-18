// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, GitMerge, Check, X, Loader2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listTasks, createTask, updateTask, deleteTask, TASK_STATUS, TASK_PRIORITY,
  listStreams, createStream, deleteStream, listMerges, createMerge, reviewMerge, deleteMerge,
} from "@/lib/api/orbit-workspace";

const PRIORITY_TONE: Record<string, string> = {
  low: "text-muted-foreground",
  normal: "text-foreground",
  high: "text-primary",
  urgent: "text-destructive",
};

/** Task Board — Samsta Orbit workflow board with live columns. */
export function TaskBoard({ projectId, meId, canEdit }: { projectId: string; meId: string | null; canEdit: boolean }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: tasks = [], refetch } = useQuery({
    queryKey: ["orbit-project-tasks", projectId],
    queryFn: () => listTasks(projectId),
  });

  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setErr(null);
    try { await fn(); await refetch(); }
    catch (e: any) { setErr(e?.message ?? "Something went wrong."); }
    finally { setBusy(false); }
  };

  const advance = (t: any) => {
    const i = TASK_STATUS.findIndex((s) => s.key === t.status);
    const next = TASK_STATUS[(i + 1) % TASK_STATUS.length].key;
    return run(() => updateTask(t.id, { status: next }));
  };

  return (
    <div className="glass rounded-3xl p-4 animate-fade-up">
      {canEdit && (
        <div className="mb-3 flex items-center gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…"
            className="glass min-w-0 flex-1 rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)}
            className="glass rounded-2xl bg-transparent px-2 py-2 text-xs capitalize outline-none">
            {TASK_PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button aria-label="Add task" disabled={busy || !title.trim()}
            onClick={() => run(async () => { await createTask(projectId, meId, { title, priority }); setTitle(""); })}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow-md active:scale-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-1">
        {TASK_STATUS.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="w-56 shrink-0">
              <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{col.label}</span><span>{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <div key={t.id} className="glass-strong rounded-2xl p-2.5 animate-fade-up">
                    <button onClick={() => canEdit && advance(t)} disabled={!canEdit}
                      className="block w-full text-left text-sm font-medium active:scale-[0.98]">
                      {t.title}
                    </button>
                    <div className="mt-1 flex items-center gap-2 text-[10px]">
                      <span className={cn("font-semibold capitalize", PRIORITY_TONE[t.priority])}>{t.priority}</span>
                      {t.due_at && <span className="text-muted-foreground">{new Date(t.due_at).toLocaleDateString()}</span>}
                      {canEdit && (
                        <button aria-label="Delete task" onClick={() => run(() => deleteTask(t.id))}
                          className="ml-auto text-muted-foreground active:scale-90">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!items.length && <p className="text-[11px] text-muted-foreground">Empty</p>}
              </div>
            </div>
          );
        })}
      </div>
      {canEdit && <p className="mt-2 text-[11px] text-muted-foreground">Tap a task to move it to the next column.</p>}
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}

/** Work Streams + Merge Proposals. */
export function StreamsPanel({ projectId, meId, canEdit, isOwner }: {
  projectId: string; meId: string | null; canEdit: boolean; isOwner: boolean;
}) {
  const [name, setName] = useState("");
  const [mTitle, setMTitle] = useState("");
  const [from, setFrom] = useState("");
  const [into, setInto] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: streams = [], refetch: refetchStreams } = useQuery({
    queryKey: ["orbit-project-streams", projectId],
    queryFn: () => listStreams(projectId),
  });
  const { data: merges = [], refetch: refetchMerges } = useQuery({
    queryKey: ["orbit-project-merges", projectId],
    queryFn: () => listMerges(projectId),
  });

  const run = async (fn: () => Promise<any>) => {
    setBusy(true); setErr(null);
    try { await fn(); await Promise.all([refetchStreams(), refetchMerges()]); }
    catch (e: any) { setErr(e?.message ?? "Something went wrong."); }
    finally { setBusy(false); }
  };

  const streamName = (id: string | null) => streams.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="flex flex-col gap-3 animate-fade-up">
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> Work Streams
        </div>
        {canEdit && (
          <div className="mt-2 flex items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New work stream…"
              className="glass min-w-0 flex-1 rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
            <button disabled={busy || !name.trim()}
              onClick={() => run(async () => { await createStream(projectId, meId, name); setName(""); })}
              className="glass shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold active:scale-95 disabled:opacity-50">
              Open
            </button>
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {streams.map((s) => (
            <div key={s.id} className="glass-strong flex items-center gap-2 rounded-2xl p-2.5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.name}</div>
                {s.description && <p className="truncate text-[11px] text-muted-foreground">{s.description}</p>}
              </div>
              <span className="text-[10px] capitalize text-muted-foreground">{s.status}</span>
              {canEdit && (
                <button aria-label="Close stream" onClick={() => run(() => deleteStream(s.id))}
                  className="text-muted-foreground active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          {!streams.length && <p className="text-sm text-muted-foreground">No work streams yet.</p>}
        </div>
      </div>

      <div className="glass rounded-3xl p-4">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <GitMerge className="h-3.5 w-3.5" /> Merge Proposals
        </div>
        {canEdit && !!streams.length && (
          <div className="mt-2 flex flex-col gap-2">
            <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="What are you merging?"
              className="glass rounded-2xl bg-transparent px-3 py-2 text-sm outline-none" />
            <div className="flex items-center gap-2">
              <select value={from} onChange={(e) => setFrom(e.target.value)}
                className="glass min-w-0 flex-1 rounded-2xl bg-transparent px-2 py-2 text-xs outline-none">
                <option value="">From stream…</option>
                {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={into} onChange={(e) => setInto(e.target.value)}
                className="glass min-w-0 flex-1 rounded-2xl bg-transparent px-2 py-2 text-xs outline-none">
                <option value="">Into stream…</option>
                {streams.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button disabled={busy || !mTitle.trim()}
                onClick={() => run(async () => {
                  await createMerge(projectId, meId, { title: mTitle, from_stream_id: from || null, into_stream_id: into || null });
                  setMTitle(""); setFrom(""); setInto("");
                })}
                className="glass shrink-0 rounded-2xl px-3 py-2 text-xs font-semibold active:scale-95 disabled:opacity-50">
                Raise
              </button>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {merges.map((m) => (
            <div key={m.id} className="glass-strong rounded-2xl p-2.5">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.title}</div>
                  <p className="text-[11px] text-muted-foreground">
                    {streamName(m.from_stream_id)} → {streamName(m.into_stream_id)} · {m.state}
                  </p>
                </div>
                {isOwner && m.state === "open" && (
                  <div className="flex shrink-0 gap-1.5">
                    <button aria-label="Accept merge" onClick={() => run(() => reviewMerge(m.id, "accepted", meId))}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background active:scale-90">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button aria-label="Decline merge" onClick={() => run(() => reviewMerge(m.id, "declined", meId))}
                      className="glass flex h-7 w-7 items-center justify-center rounded-full active:scale-90">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {canEdit && m.state !== "open" && (
                  <button aria-label="Remove proposal" onClick={() => run(() => deleteMerge(m.id))}
                    className="text-muted-foreground active:scale-90"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {m.notes && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{m.notes}</p>}
            </div>
          ))}
          {!merges.length && <p className="text-sm text-muted-foreground">No merge proposals yet.</p>}
        </div>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
