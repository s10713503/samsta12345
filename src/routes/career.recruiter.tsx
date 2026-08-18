// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard, StatusPill } from "@/components/samsta/CareerShell";
import { listJobApplications, listMyPostedJobs, updateApplicationStatus } from "@/lib/api/career";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, Check, X, MessageSquare, Users, Send } from "lucide-react";
import { getOrCreateDirectChat } from "@/lib/api/messages";
import { toast } from "sonner";

export const Route = createFileRoute("/career/recruiter")({
  component: Recruiter,
});

type PostedJob = Awaited<ReturnType<typeof listMyPostedJobs>>[number];
type AppRow = Awaited<ReturnType<typeof listJobApplications>>[number];

function Recruiter() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<PostedJob[]>([]);
  const [activeJob, setActiveJob] = useState<string | null>(null);
  const [apps, setApps] = useState<AppRow[]>([]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    listMyPostedJobs(user.id).then((r) => {
      setJobs(r);
      if (r[0]) setActiveJob(r[0].id);
    });
  }, [user]);

  useEffect(() => {
    if (!activeJob) return;
    listJobApplications(activeJob).then(setApps);
    const ch = supabase
      .channel(`job-apps-${activeJob}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "job_applications", filter: `job_id=eq.${activeJob}` }, () => {
        listJobApplications(activeJob).then(setApps);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeJob]);

  async function decide(appId: string, status: "accepted" | "rejected" | "reviewing") {
    await updateApplicationStatus(appId, status);
    if (activeJob) listJobApplications(activeJob).then(setApps);
  }

  async function openChat(otherId: string) {
    if (!user) return;
    try {
      const chatId = await getOrCreateDirectChat(user.id, otherId);
      navigate({ to: "/messages/$chatId", params: { chatId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open chat");
    }
  }

  return (
    <CareerShell
      title="Recruiter"
      subtitle="Real-time applicants for your postings."
      right={<Link to="/career/jobs/new" className="text-[10px] text-[#e8c874]">+New</Link>}
    >
      {jobs.length === 0 ? (
        <GlassCard className="p-6 text-center text-sm text-white/50">
          You haven't posted any jobs yet. <Link to="/career/jobs/new" className="text-[#e8c874] underline">Post one →</Link>
        </GlassCard>
      ) : (
        <>
          <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {jobs.map((j) => (
              <button
                key={j.id}
                onClick={() => setActiveJob(j.id)}
                className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition ${activeJob === j.id ? "border-[#e8c874]/50 bg-[#e8c874]/10" : "border-white/10 bg-white/[0.03]"}`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold"><Briefcase className="h-3.5 w-3.5" />{j.title}</div>
                <div className="mt-0.5 text-[10px] text-white/50">{j.applications_count} applicant{j.applications_count === 1 ? "" : "s"}</div>
              </button>
            ))}
          </div>

          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/50">
            <Users className="h-3.5 w-3.5" /> Applicants
          </div>

          {apps.length === 0 ? (
            <GlassCard className="p-6 text-center text-sm text-white/50">No applicants yet — job is live.</GlassCard>
          ) : (
            <div className="space-y-3">
              {apps.map((a) => (
                <GlassCard key={a.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      {a.applicant?.avatar_url ? <img src={a.applicant.avatar_url} className="h-full w-full object-cover" alt="" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{a.applicant?.full_name || a.applicant?.username || "Applicant"}</div>
                      <div className="text-[10px] text-white/50">Applied {new Date(a.created_at).toLocaleDateString()}</div>
                    </div>
                    <StatusPill status={a.status} />
                  </div>
                  {a.cover_letter && (
                    <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs text-white/70">
                      <MessageSquare className="mr-1 inline h-3 w-3" /> {a.cover_letter}
                    </div>
                  )}
                  {a.status !== "accepted" && a.status !== "rejected" && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => decide(a.id, "accepted")} className="flex-1 rounded-xl bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-300 transition active:scale-95">
                        <Check className="mr-1 inline h-3.5 w-3.5" /> Accept & reveal contact
                      </button>
                      <button onClick={() => decide(a.id, "reviewing")} className="rounded-xl bg-white/5 px-3 py-2 text-xs text-white/70 transition active:scale-95">Reviewing</button>
                      <button onClick={() => decide(a.id, "rejected")} className="rounded-xl bg-rose-500/20 py-2 px-3 text-xs font-semibold text-rose-300 transition active:scale-95">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  {a.status === "accepted" && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => openChat(a.applicant_id)} className="flex-1 rounded-xl bg-[#e8c874]/15 py-2 text-xs font-semibold text-[#e8c874] transition active:scale-95">
                        <Send className="mr-1 inline h-3.5 w-3.5" /> Message · Voice · Video
                      </button>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </>
      )}
    </CareerShell>
  );
}