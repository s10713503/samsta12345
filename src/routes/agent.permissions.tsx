// @ts-nocheck
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CAPABILITIES, SCOPES } from "@/lib/agent/registry";
import { listPermissions, setPermission } from "@/lib/agent/api";

export const Route = createFileRoute("/agent/permissions")({
  head: () => ({
    meta: [
      { title: "Samsta Permissions — least privilege, always revocable" },
      { name: "description", content: "Decide exactly what Samsta AI may do. Each capability states what it can and cannot do, and you can revoke access instantly." },
      { property: "og:title", content: "Samsta Permissions" },
      { property: "og:description", content: "Least-privilege control over every Samsta AI capability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PermissionsPage,
});

function PermissionsPage() {
  const qc = useQueryClient();
  const { data: perms = {} } = useQuery({ queryKey: ["agent-perms"], queryFn: listPermissions });

  async function toggle(scope: string, next: boolean) {
    try {
      if (next && scope === "notifications" && "Notification" in window) await Notification.requestPermission();
      await setPermission(scope, next);
      qc.invalidateQueries({ queryKey: ["agent-perms"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save that.");
    }
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-32">
      <Link to="/agent" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full"><ArrowLeft className="h-4.5 w-4.5" /></Link>
      <h1 className="font-display mt-6 text-3xl">Samsta Permissions</h1>
      <p className="mt-1 text-sm text-muted-foreground">Samsta can only do what you switch on here. Everything is revocable in one tap.</p>

      <div className="mt-6 space-y-4">
        {SCOPES.map((s) => {
          const on = perms[s.scope] !== false;
          const caps = CAPABILITIES.filter((c) => c.scope === s.scope);
          return (
            <section key={s.scope} className="glass rounded-3xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-medium">{s.label}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.why}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={`${s.label} permission`}
                  onClick={() => toggle(s.scope, !on)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {caps.map((c) => (
                  <li key={c.key} className="rounded-2xl bg-muted/40 p-3 text-[11px] leading-relaxed">
                    <p className="text-sm">{c.emoji} {c.label} <span className="text-[10px] uppercase text-muted-foreground">· risk {c.risk}</span></p>
                    <p className="mt-1 text-muted-foreground"><strong className="text-foreground/80">Can:</strong> {c.can}</p>
                    <p className="text-muted-foreground"><strong className="text-foreground/80">Cannot:</strong> {c.cannot}</p>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
