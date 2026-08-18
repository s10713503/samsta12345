// @ts-nocheck
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { byKey } from "@/lib/agent/registry";
import { clearActions, deleteAction, listActions } from "@/lib/agent/api";

export const Route = createFileRoute("/agent/activity")({
  head: () => ({
    meta: [
      { title: "Samsta Activity — every action, on the record" },
      { name: "description", content: "A full audit trail of what Samsta AI did for you: the action, the service, the risk level, whether you confirmed it and how it ended." },
      { property: "og:title", content: "Samsta Activity" },
      { property: "og:description", content: "Every Samsta AI action, on the record — and deletable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["agent-actions"], queryFn: listActions });

  return (
    <div className="min-h-screen px-4 pt-6 pb-32">
      <header className="flex items-center justify-between">
        <Link to="/agent" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full"><ArrowLeft className="h-4.5 w-4.5" /></Link>
        {data.length > 0 && (
          <button onClick={async () => { await clearActions(); qc.invalidateQueries({ queryKey: ["agent-actions"] }); }}
            className="text-xs text-muted-foreground underline">Clear all</button>
        )}
      </header>

      <h1 className="font-display mt-6 text-3xl">Samsta Activity</h1>
      <p className="mt-1 text-sm text-muted-foreground">Nothing sensitive is ever recorded here — no PINs, OTPs or passwords.</p>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && data.length === 0 && <p className="mt-8 text-sm text-muted-foreground">No actions yet. Ask Samsta for something.</p>}

      <ul className="mt-6 space-y-3">
        {data.map((a) => {
          const cap = byKey(a.capability);
          const d = new Date(a.created_at);
          return (
            <li key={a.id} className="glass rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">{cap?.emoji ?? "✨"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{d.toLocaleDateString()} · {d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {a.state === "completed" ? "✓ " : a.state === "cancelled" ? "○ " : "✕ "}{cap?.label ?? a.capability}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">“{a.utterance}”</p>
                  {(a.result || a.error) && <p className="mt-1 text-xs text-muted-foreground">{a.result || a.error}</p>}
                  <p className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <span className="rounded-full bg-muted/50 px-2 py-0.5">{cap?.scope ?? "—"}</span>
                    <span className="rounded-full bg-muted/50 px-2 py-0.5">risk {a.risk}</span>
                    <span className="rounded-full bg-muted/50 px-2 py-0.5">{a.confirmed ? "confirmed" : "auto"}</span>
                    {a.provider && <span className="rounded-full bg-muted/50 px-2 py-0.5">{a.provider}</span>}
                  </p>
                </div>
                <button aria-label="Delete" onClick={async () => { await deleteAction(a.id); qc.invalidateQueries({ queryKey: ["agent-actions"] }); }}
                  className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
