import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Check, X, Loader2, Flag } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/samsta/TopBar";
import { useAuthUser } from "@/hooks/use-auth";
import { listReports, reviewReport, isModerator, type ReportRow } from "@/lib/api/safety";

export const Route = createFileRoute("/moderation")({
  component: ModerationPage,
  head: () => ({
    meta: [
      { title: "Moderation queue — Samsta" },
      { name: "description", content: "Review reported posts, reels and profiles on Samsta and action or dismiss each report." },
      { property: "og:title", content: "Moderation queue — Samsta" },
      { property: "og:description", content: "Review reported content on Samsta and action or dismiss each report." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Filter = "open" | "reviewed" | "all";

function ModerationPage() {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("open");
  const [busy, setBusy] = useState<string | null>(null);

  const modQ = useQuery({
    queryKey: ["is-moderator", user?.id],
    queryFn: () => isModerator(user!.id),
    enabled: !!user?.id,
  });

  const reportsQ = useQuery({
    queryKey: ["reports", filter, user?.id],
    queryFn: () => listReports(filter),
    enabled: !!user?.id,
  });

  async function act(r: ReportRow, status: "actioned" | "dismissed") {
    if (!user) return;
    setBusy(r.id + status);
    try {
      await reviewReport(r.id, user.id, status);
      toast.success(status === "actioned" ? "Marked as actioned" : "Report dismissed");
      await qc.invalidateQueries({ queryKey: ["reports"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the report");
    } finally {
      setBusy(null);
    }
  }

  const rows = reportsQ.data ?? [];

  return (
    <>
      <TopBar title="Moderation" />
      <div className="px-5 pt-2 pb-28">
        <div className="glass-strong flex items-center gap-3 rounded-3xl p-4 animate-fade-up">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium">
              {modQ.data ? "Admin review queue" : "Reports on your content"}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {modQ.data
                ? "You can review every report on Samsta."
                : "You see reports you filed and reports about content you own."}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {(["open", "reviewed", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-2 text-xs capitalize transition active:scale-95 ${
                filter === f ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {reportsQ.isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!reportsQ.isLoading && rows.length === 0 && (
            <div className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground animate-fade-up">
              <Flag className="mx-auto mb-2 h-6 w-6 opacity-50" />
              Nothing to review here.
            </div>
          )}
          {rows.map((r, i) => (
            <div
              key={r.id}
              className="glass rounded-3xl p-4 animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive capitalize">
                  {r.reason}
                </span>
                <span className="text-[11px] text-muted-foreground capitalize">
                  {r.target_type} · {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
              {r.details && <p className="mt-2 text-sm">{r.details}</p>}
              <p className="mt-1 break-all text-[11px] text-muted-foreground">Target ID: {r.target_id}</p>

              {r.status === "open" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => act(r, "actioned")}
                    disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-medium text-primary-foreground transition active:scale-95"
                  >
                    {busy === r.id + "actioned" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Action
                  </button>
                  <button
                    onClick={() => act(r, "dismissed")}
                    disabled={!!busy}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border border-border py-2.5 text-xs transition active:scale-95"
                  >
                    {busy === r.id + "dismissed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-[11px] capitalize text-muted-foreground">
                  {r.status}
                  {r.reviewed_at ? ` · ${new Date(r.reviewed_at).toLocaleDateString()}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
