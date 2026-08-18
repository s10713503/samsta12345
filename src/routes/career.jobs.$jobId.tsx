// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard, VerifiedBadge, StatusPill } from "@/components/samsta/CareerShell";
import { applyToJob, applyExternally, getContactReveal, getJob, uploadResume, saveJob, unsaveJob, type Job } from "@/lib/api/career";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, Building2, Upload, Send, Mail, Phone, MapPinned, ShieldCheck, Bookmark, BookmarkCheck, Sparkles, ExternalLink } from "lucide-react";
import { streamSam } from "@/lib/stream-sam";
import { getOrCreateDirectChat } from "@/lib/api/messages";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/career/jobs/$jobId")({
  component: JobDetail,
  loader: async ({ params }) => {
    try {
      const job: any = await getJob(params.jobId);
      if (!job) return { seo: null };
      return {
        seo: {
          title: job.title as string,
          company: (job.companies?.name as string) ?? null,
          description: (job.description as string) ?? null,
          location: (job.location as string) ?? null,
          created_at: (job.created_at as string) ?? null,
        },
      };
    } catch {
      return { seo: null };
    }
  },
  head: ({ params, loaderData }) => {
    const seo = loaderData?.seo;
    const url = `https://samstaofficial.lovable.app/career/jobs/${params.jobId}`;
    if (!seo) {
      return {
        meta: [
          { title: "Job listing — Samsta Careers" },
          { name: "description", content: "View this job opening on Samsta Careers and apply in minutes." },
          { property: "og:title", content: "Job listing — Samsta Careers" },
          { property: "og:description", content: "View this job opening on Samsta Careers and apply in minutes." },
          { property: "og:type", content: "article" },
          { property: "og:url", content: url },
        ],
        links: [{ rel: "canonical", href: url }],
      };
    }
    const titleLine = seo.company ? `${seo.title} at ${seo.company} — Samsta Careers` : `${seo.title} — Samsta Careers`;
    const desc = (seo.description ?? `Apply for ${seo.title}${seo.company ? ` at ${seo.company}` : ""}${seo.location ? ` in ${seo.location}` : ""} on Samsta Careers.`).slice(0, 300);
    return {
      meta: [
        { title: titleLine },
        { name: "description", content: desc },
        { property: "og:title", content: titleLine },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: seo.title,
          description: seo.description ?? desc,
          datePosted: seo.created_at,
          hiringOrganization: seo.company ? { "@type": "Organization", name: seo.company } : undefined,
          jobLocation: seo.location ? { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: seo.location } } : undefined,
        }),
      }],
    };
  },
});

type JobWithCompany = Job & { companies: { id: string; name: string; logo_url: string | null; verification: string; description: string | null; website: string | null } | null };

function JobDetail() {
  const { jobId } = Route.useParams();
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobWithCompany | null>(null);
  const [myApp, setMyApp] = useState<{ id: string; status: string } | null>(null);
  const [cover, setCover] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reveal, setReveal] = useState<Awaited<ReturnType<typeof getContactReveal>> | null>(null);
  const [saved, setSaved] = useState(false);
  const [genCover, setGenCover] = useState(false);

  useEffect(() => {
    getJob(jobId).then((j) => setJob(j as JobWithCompany));
    // Live job updates (edits, closures, verification) straight from the poster.
    const ch = supabase
      .channel(`job-rt-${jobId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs", filter: `id=eq.${jobId}` }, () => {
        getJob(jobId).then((j) => setJob(j as JobWithCompany));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("job_applications")
      .select("id, status")
      .eq("job_id", jobId)
      .eq("applicant_id", user.id)
      .maybeSingle()
      .then(({ data }) => setMyApp(data));
    // Realtime application status from the recruiter.
    const ch = supabase
      .channel(`job-app-rt-${jobId}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_applications", filter: `applicant_id=eq.${user.id}` },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (row?.job_id !== jobId) return;
          if (payload.eventType === "DELETE") { setMyApp(null); return; }
          setMyApp({ id: row.id, status: row.status });
          if (payload.eventType === "UPDATE") toast.success(`Application update: ${row.status}`);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [jobId, user]);

  useEffect(() => {
    if (myApp?.status === "accepted") {
      getContactReveal(myApp.id).then(setReveal);
    }
  }, [myApp]);

  useEffect(() => {
    if (!user) { setSaved(false); return; }
    supabase.from("saved_jobs").select("job_id").eq("user_id", user.id).eq("job_id", jobId).maybeSingle()
      .then(({ data }) => setSaved(!!data));
  }, [user, jobId]);

  async function toggleSave() {
    if (!user) { navigate({ to: "/auth" }); return; }
    setSaved((v) => !v);
    try {
      if (saved) await unsaveJob(user.id, jobId);
      else await saveJob(user.id, jobId);
    } catch { setSaved((v) => !v); }
  }

  const externalApply = job?.apply_mode === "external" && !!job?.apply_url;

  async function onExternalApply() {
    if (!job?.apply_url) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    // Open first so the click stays a trusted user gesture (no popup blocking).
    const win = window.open(job.apply_url, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = job.apply_url;
    setSubmitting(true);
    try {
      const app = await applyExternally({ job_id: jobId, applicant_id: user.id, apply_url: job.apply_url });
      setMyApp({ id: app.id, status: app.status });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record application");
    } finally {
      setSubmitting(false);
    }
  }

  async function onApply() {
    if (!user) { navigate({ to: "/auth" }); return; }
    setError("");
    setSubmitting(true);
    try {
      let resumePath: string | null = null;
      if (resume) resumePath = await uploadResume(user.id, resume);
      const app = await applyToJob({
        job_id: jobId,
        applicant_id: user.id,
        resume_url: resumePath,
        cover_letter: cover,
      });
      setMyApp({ id: app.id, status: app.status });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  }

  if (!job) return <CareerShell title="Loading…"><GlassCard className="h-40 animate-pulse" /></CareerShell>;

  const co = job.companies;

  return (
    <CareerShell title={job.title} subtitle={co?.name ?? "Independent"}>
      <GlassCard className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[#e8c874]">
            {co?.logo_url ? <img src={co.logo_url} className="h-full w-full rounded-2xl object-cover" alt="" /> : <Building2 className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {co?.name ?? "Independent poster"}
              <VerifiedBadge verified={job.is_verified || co?.verification === "verified"} />
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-white/50">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">{job.kind}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">{job.work_type}</span>
              {job.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
            </div>
          </div>
          <button
            onClick={toggleSave}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${saved ? "border-[#e8c874]/60 bg-[#e8c874]/20 text-[#e8c874]" : "border-white/10 bg-white/[0.04] text-white/70 hover:text-white"}`}
            aria-label={saved ? "Unsave" : "Save job"}
          >
            {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </button>
        </div>
      </GlassCard>

      <section className="mt-4 space-y-3">
        <SectionTitle icon={Briefcase}>About the role</SectionTitle>
        <GlassCard className="whitespace-pre-wrap p-4 text-sm text-white/80">{job.description}</GlassCard>

        {job.responsibilities && job.responsibilities.length > 0 && (
          <>
            <SectionTitle>Responsibilities</SectionTitle>
            <GlassCard className="p-4">
              <ul className="list-disc space-y-1 pl-5 text-sm text-white/75">
                {job.responsibilities.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </GlassCard>
          </>
        )}

        {job.skills && job.skills.length > 0 && (
          <>
            <SectionTitle>Skills</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((s) => (
                <span key={s} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/80">{s}</span>
              ))}
            </div>
          </>
        )}

        {(job.salary_min || job.salary_max) && (
          <GlassCard className="p-3 text-sm">
            <span className="text-white/60">Compensation · </span>
            <span className="font-semibold text-[#e8c874]">
              {job.salary_currency} {job.salary_min ?? "?"}–{job.salary_max ?? "?"} / {job.salary_period}
            </span>
          </GlassCard>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <GlassCard className="p-3 text-sm">
            <div className="mb-1 text-[11px] uppercase tracking-wider text-white/50">Benefits</div>
            <div className="text-white/75">{job.benefits.join(" · ")}</div>
          </GlassCard>
        )}
      </section>

      {/* Apply / status */}
      <section className="mt-6">
        {myApp ? (
          <GlassCard className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-[#e8c874]" />
              <span className="font-semibold">Application status</span>
              <StatusPill status={myApp.status} />
            </div>
            {myApp.status !== "accepted" && (
              <p className="text-xs text-white/50">Recruiter contact details unlock automatically when your application is accepted.</p>
            )}
            {reveal && (
              <div className="mt-3 space-y-2 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 text-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">Recruiter contact unlocked</div>
                {reveal.company_name && <div className="text-white/80">{reveal.company_name}</div>}
                {(reveal.recruiter_email || reveal.company_email) && (
                  <div className="flex items-center gap-2 text-white/80"><Mail className="h-3.5 w-3.5" />{reveal.recruiter_email || reveal.company_email}</div>
                )}
                {(reveal.recruiter_phone || reveal.company_phone) && (
                  <div className="flex items-center gap-2 text-white/80"><Phone className="h-3.5 w-3.5" />{reveal.recruiter_phone || reveal.company_phone}</div>
                )}
                {reveal.company_address && (
                  <div className="flex items-center gap-2 text-white/80"><MapPinned className="h-3.5 w-3.5" />{reveal.company_address}</div>
                )}
                {user && (job as any).poster_id && (
                  <button
                    onClick={async () => {
                      try {
                        const chatId = await getOrCreateDirectChat(user.id, (job as any).poster_id);
                        navigate({ to: "/messages/$chatId", params: { chatId } });
                      } catch (e) { toast.error(e instanceof Error ? e.message : "Chat failed"); }
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-2 text-xs font-semibold text-emerald-300"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Message · Voice · Video call recruiter
                  </button>
                )}
              </div>
            )}
          </GlassCard>
        ) : externalApply ? (
          <GlassCard className="space-y-3 p-4">
            <div className="text-sm font-semibold">Apply on the company website</div>
            <p className="text-xs text-white/60">
              This role is hosted by the poster{co?.name ? ` (${co.name})` : ""}. You'll be taken straight to their official
              application page, and we'll track it here in real time.
            </p>
            <div className="truncate rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/50">{job.apply_url}</div>
            {error && <div className="text-xs text-rose-300">{error}</div>}
            <button
              onClick={onExternalApply}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-3 text-sm font-bold text-white shadow-[0_16px_40px_-14px_rgba(79,124,255,0.55)] transition active:scale-[0.98] disabled:opacity-60"
            >
              <ExternalLink className="h-4 w-4" /> {user ? "Apply on official site" : "Sign in to apply"}
            </button>
          </GlassCard>
        ) : (
          <GlassCard className="space-y-3 p-4">
            <div className="text-sm font-semibold">Apply now</div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-3 text-xs text-white/70">
              <Upload className="h-4 w-4" />
              <span className="flex-1">{resume ? resume.name : "Attach resume (PDF, DOCX)"}</span>
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
            </label>
            <textarea
              value={cover}
              onChange={(e) => setCover(e.target.value)}
              placeholder="Cover note (optional) — why you're a fit"
              rows={4}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm outline-none placeholder:text-white/30"
            />
            <button
              type="button"
              onClick={async () => {
                if (!job || genCover) return;
                setGenCover(true);
                setCover("");
                try {
                  const payload = JSON.stringify({
                    job_title: job.title,
                    company: job.companies?.name ?? "",
                    job_description: (job.description ?? "").slice(0, 2000),
                  });
                  await streamSam("career_cover_letter", [{ role: "user", content: payload }], (acc) => setCover(acc));
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Cover letter failed");
                } finally {
                  setGenCover(false);
                }
              }}
              disabled={genCover || !job}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8c874]/40 bg-[#e8c874]/10 py-2 text-xs font-semibold text-[#e8c874] transition active:scale-[0.98] disabled:opacity-60"
            >
              <Sparkles className="h-3.5 w-3.5" /> {genCover ? "Writing…" : "Cover Letter"}
            </button>
            {error && <div className="text-xs text-rose-300">{error}</div>}
            <button
              onClick={onApply}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-3 text-sm font-bold text-[#05070f] shadow-[0_16px_40px_-14px_rgba(232,200,116,0.55)] transition active:scale-[0.98] disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> {submitting ? "Submitting…" : user ? "Apply securely" : "Sign in to apply"}
            </button>
            <p className="text-[10px] text-white/40">Your contact info stays private until the recruiter accepts.</p>
          </GlassCard>
        )}

        <Link to="/career/jobs" className="mt-4 block text-center text-xs text-white/50">← Back to all jobs</Link>
      </section>
    </CareerShell>
  );
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/60">
      {Icon && <Icon className="h-3.5 w-3.5" />} {children}
    </div>
  );
}