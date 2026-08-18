// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard, StatusPill } from "@/components/samsta/CareerShell";
import { listMyApplications } from "@/lib/api/career";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Building2 } from "lucide-react";

export const Route = createFileRoute("/career/applications")({
  component: MyApps,
});

type Row = Awaited<ReturnType<typeof listMyApplications>>[number];

function MyApps() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    listMyApplications(user.id).then(setRows);
    const ch = supabase
      .channel(`my-apps-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_applications", filter: `applicant_id=eq.${user.id}` }, () => {
        listMyApplications(user.id).then(setRows);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <CareerShell title="My Applications" subtitle="Real-time status of every role you applied to.">
      {rows.length === 0 ? (
        <GlassCard className="p-6 text-center text-sm text-white/50">
          No applications yet. <Link to="/career/jobs" className="text-[#e8c874] underline">Browse jobs →</Link>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {rows.map((a, i) => {
            const job = (a as unknown as { jobs: { id: string; title: string; location: string | null; companies: { name: string; logo_url: string | null } | null } | null }).jobs;
            if (!job) return null;
            return (
              <Link key={a.id} to="/career/jobs/$jobId" params={{ jobId: job.id }} className="block animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <GlassCard className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#e8c874]">
                      {job.companies?.logo_url ? <img src={job.companies.logo_url} className="h-full w-full rounded-xl object-cover" alt="" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{job.title}</div>
                      <div className="truncate text-xs text-white/60">{job.companies?.name ?? "Independent"} · {job.location ?? ""}</div>
                    </div>
                    <StatusPill status={a.status} />
                  </div>
                  <ProgressTimeline status={a.status} />
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </CareerShell>
  );
}

function ProgressTimeline({ status }: { status: string }) {
  const steps = ["pending", "reviewing", "accepted"];
  const idx = status === "rejected" ? -1 : steps.indexOf(status);
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {steps.map((s, i) => (
        <div key={s} className={`h-1 flex-1 rounded-full transition ${status === "rejected" ? "bg-rose-500/40" : i <= idx ? "bg-gradient-to-r from-[#e8c874] to-[#c9a34a]" : "bg-white/10"}`} />
      ))}
    </div>
  );
}