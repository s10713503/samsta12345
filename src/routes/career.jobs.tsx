// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CareerShell, GlassCard, VerifiedBadge } from "@/components/samsta/CareerShell";
import { listJobs, listSavedJobIds, saveJob, unsaveJob, createJobAlert, type JobFilter } from "@/lib/api/career";
import { MapPin, Briefcase, Search, SlidersHorizontal, X, Sparkles, ScanLine, Bookmark, BookmarkCheck, BellPlus, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AIResumeMatchSheet } from "@/components/samsta/AIResumeMatchSheet";
import { useAuthUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/career/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs · Career · Samsta" },
      { name: "description", content: "Live job feed on Samsta— full-time, remote, freelance, and contract roles with powered resume matching." },
      { property: "og:title", content: "Jobs · Career · Samsta" },
      { property: "og:description", content: "Live job feed — full-time, remote, freelance and more." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/career/jobs" },
    ],
    links: [{ rel: "canonical", href: "/career/jobs" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Jobs on Samsta",
          about: "Curated live job feed for Samsta members.",
          url: "/career/jobs",
        }),
      },
    ],
  }),
  component: JobsPage,
});

const KINDS: Array<{ id: JobFilter["kind"]; label: string }> = [
  { id: undefined, label: "All" },
  { id: "fulltime", label: "Full-time" },
  { id: "parttime", label: "Part-time" },
  { id: "internship", label: "Internship" },
  { id: "freelance", label: "Freelance" },
  { id: "remote", label: "Remote" },
  { id: "contract", label: "Contract" },
  { id: "startup", label: "Startup" },
];

const WORK_TYPES: Array<{ id: JobFilter["work_type"]; label: string }> = [
  { id: undefined, label: "Any" },
  { id: "onsite", label: "Onsite" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
];

type JobRow = Awaited<ReturnType<typeof listJobs>>[number];

function JobsPage() {
  const { user } = useAuthUser();
  const [filter, setFilter] = useState<JobFilter>({});
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBanner, setAiBanner] = useState<{ name: string; skills: string[]; location: string } | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [onlySaved, setOnlySaved] = useState(false);
  const [alertToast, setAlertToast] = useState("");

  function computeMatch(job: JobRow): number | null {
    if (!aiBanner) return null;
    const cand = new Set(aiBanner.skills.map((s) => s.toLowerCase().trim()).filter(Boolean));
    if (!cand.size) return null;
    const jobSkills = (job.skills ?? []).map((s) => s.toLowerCase().trim()).filter(Boolean);
    let skillScore = 0;
    if (jobSkills.length) {
      const hit = jobSkills.filter((s) => cand.has(s)).length;
      skillScore = Math.round((hit / jobSkills.length) * 80);
    } else {
      // fall back: any candidate skill mentioned in title/description
      const hay = `${job.title} ${job.description ?? ""}`.toLowerCase();
      const hit = [...cand].filter((s) => s.length > 1 && hay.includes(s)).length;
      skillScore = Math.min(70, hit * 12);
    }
    let locScore = 0;
    const wantLoc = aiBanner.location?.toLowerCase().trim();
    if (wantLoc) {
      if ((job.location ?? "").toLowerCase().includes(wantLoc)) locScore = 15;
      else if (job.work_type === "remote") locScore = 10;
    } else if (job.work_type === "remote") locScore = 8;
    const verifiedBoost = job.is_verified ? 5 : 0;
    return Math.max(0, Math.min(100, skillScore + locScore + verifiedBoost));
  }

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return; }
    listSavedJobIds(user.id).then(setSavedIds).catch(() => {});
    const ch = supabase
      .channel(`saved-jobs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_jobs", filter: `user_id=eq.${user.id}` }, () => {
        listSavedJobIds(user.id).then(setSavedIds).catch(() => {});
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  async function toggleSave(jobId: string) {
    if (!user) return;
    if (savedIds.has(jobId)) {
      const next = new Set(savedIds); next.delete(jobId); setSavedIds(next);
      await unsaveJob(user.id, jobId).catch(() => {});
    } else {
      const next = new Set(savedIds); next.add(jobId); setSavedIds(next);
      await saveJob(user.id, jobId).catch(() => {});
    }
  }

  async function saveSearchAsAlert() {
    if (!user) return;
    const name = q?.trim() || filter.skills?.[0] || filter.location || "My alert";
    await createJobAlert({
      user_id: user.id,
      name,
      query: q || null,
      skills: filter.skills ?? [],
      work_type: filter.work_type ?? null,
      kind: filter.kind ?? null,
      location: filter.location ?? null,
      salary_min: filter.salary_min ?? null,
    }).then(() => setAlertToast("Alert saved. You'll see matching jobs first.")).catch((e) => setAlertToast(e?.message ?? "Failed"));
    setTimeout(() => setAlertToast(""), 3200);
  }

  useEffect(() => {
    let alive = true;
    setLoading(true);
    listJobs({ ...filter, q: q || undefined })
      .then((r) => alive && setRows(r as JobRow[]))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [filter, q]);

  useEffect(() => {
    const ch = supabase
      .channel("jobs-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
        listJobs({ ...filter, q: q || undefined }).then((r) => setRows(r as JobRow[]));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [filter, q]);

  function applyAdvanced() {
    const skills = skillsInput.split(",").map((s) => s.trim()).filter(Boolean);
    setFilter({
      ...filter,
      skills: skills.length ? skills : undefined,
      salary_min: minSalary ? Number(minSalary) : undefined,
      salary_max: maxSalary ? Number(maxSalary) : undefined,
      location: locationInput.trim() || undefined,
    });
    setShowFilters(false);
  }
  function clearAdvanced() {
    setSkillsInput(""); setMinSalary(""); setMaxSalary(""); setLocationInput("");
    const { skills: _s, salary_min: _mn, salary_max: _mx, location: _l, ...rest } = filter;
    setFilter(rest);
  }

  const activeCount =
    (filter.work_type ? 1 : 0) +
    (filter.skills?.length ? 1 : 0) +
    (typeof filter.salary_min === "number" || typeof filter.salary_max === "number" ? 1 : 0) +
    (filter.location ? 1 : 0);

  return (
    <CareerShell title="Jobs" subtitle="Live listings, instant apply.">
      <button
        onClick={() => setAiOpen(true)}
        className="group relative mb-4 flex w-full items-center gap-3 overflow-hidden rounded-2xl border border-[#e8c874]/30 bg-gradient-to-br from-[#e8c874]/15 via-white/[0.03] to-[#4f7cff]/10 p-3 text-left transition hover:border-[#e8c874]/60 active:scale-[0.99]"
      >
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[400%]" />
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#e8c874] to-[#c9a34a] text-[#05070f] shadow-lg">
          <ScanLine className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e8c874]"><Sparkles className="h-3 w-3" /> Premium </div>
          <div className="text-sm font-bold"> Resume Match</div>
          <div className="truncate text-[11px] text-white/60">Scan resume · verify authenticity · match live jobs</div>
        </div>
        <div className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">Run</div>
      </button>

      {aiBanner && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-500/[0.06] p-3 animate-fade-in">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-300" />
          <div className="min-w-0 flex-1 text-[11px] text-emerald-100/90">
            Matching{aiBanner.name ? ` ${aiBanner.name}` : ""} — {aiBanner.skills.slice(0, 4).join(" · ") || "your skills"}{aiBanner.location ? ` · ${aiBanner.location}` : ""}
          </div>
          <button onClick={() => { setAiBanner(null); const { skills: _s, location: _l, ...rest } = filter; setFilter(rest); }} className="text-[10px] uppercase tracking-wider text-white/50 hover:text-white">Clear</button>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 backdrop-blur-xl">
        <Search className="h-4 w-4 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search titles, skills, companies…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${showFilters || activeCount ? "bg-[#e8c874]/20 text-[#e8c874]" : "text-white/60 hover:text-white"}`}
          aria-label="Advanced filters"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <span className="ml-0.5 rounded-full bg-[#e8c874] px-1.5 text-[10px] font-bold text-[#05070f]">{activeCount}</span>
          )}
        </button>
      </div>

      {user && (
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setOnlySaved((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${onlySaved ? "border-[#e8c874]/60 bg-[#e8c874]/15 text-[#e8c874]" : "border-white/10 bg-white/[0.03] text-white/70"}`}
          >
            {onlySaved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
            Saved {savedIds.size > 0 && <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{savedIds.size}</span>}
          </button>
          {(q || activeCount > 0) && (
            <button
              onClick={saveSearchAsAlert}
              className="flex items-center gap-1.5 rounded-full border border-[#4f7cff]/40 bg-[#4f7cff]/15 px-3 py-1.5 text-xs text-[#a5c1ff] transition hover:bg-[#4f7cff]/25"
            >
              <BellPlus className="h-3.5 w-3.5" /> Save search as alert
            </button>
          )}
        </div>
      )}

      {showFilters && (
        <GlassCard className="mb-4 space-y-3 p-4 animate-fade-in">
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-white/50">Work type</div>
            <div className="flex flex-wrap gap-2">
              {WORK_TYPES.map((w) => (
                <button
                  key={w.label}
                  onClick={() => setFilter({ ...filter, work_type: w.id })}
                  className={`rounded-full border px-3 py-1 text-xs transition ${filter.work_type === w.id ? "border-[#4f7cff]/60 bg-[#4f7cff]/20 text-[#a5c1ff]" : "border-white/10 bg-white/[0.03] text-white/70"}`}
                >{w.label}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Min salary</div>
              <input value={minSalary} onChange={(e) => setMinSalary(e.target.value.replace(/[^0-9]/g, ""))} placeholder="50000" inputMode="numeric" className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30" />
            </label>
            <label className="block">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Max salary</div>
              <input value={maxSalary} onChange={(e) => setMaxSalary(e.target.value.replace(/[^0-9]/g, ""))} placeholder="150000" inputMode="numeric" className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30" />
            </label>
          </div>
          <label className="block">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Location</div>
            <input value={locationInput} onChange={(e) => setLocationInput(e.target.value)} placeholder="Bangalore, Remote…" className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30" />
          </label>
          <label className="block">
            <div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Skills (comma-separated)</div>
            <input value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="React, TypeScript, Figma" className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30" />
          </label>
          <div className="flex gap-2 pt-1">
            <button onClick={applyAdvanced} className="flex-1 rounded-xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-2.5 text-sm font-bold text-[#05070f] transition active:scale-[0.98]">Apply filters</button>
            <button onClick={clearAdvanced} className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-white/70 transition active:scale-95">
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </GlassCard>
      )}

      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {KINDS.map((k) => (
          <button
            key={k.label}
            onClick={() => setFilter({ ...filter, kind: k.id })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${filter.kind === k.id ? "border-[#e8c874]/60 bg-[#e8c874]/15 text-[#e8c874]" : "border-white/10 bg-white/[0.03] text-white/70"}`}
          >{k.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <GlassCard key={i} className="h-28 animate-pulse" />)}</div>
      ) : (() => {
        const visible = onlySaved ? rows.filter((r) => savedIds.has(r.id)) : rows;
        if (!visible.length) {
          return (
            <GlassCard className="p-6 text-center text-sm text-white/50">
              {onlySaved ? "No saved jobs yet. Tap the bookmark on any job to save it." : "No jobs yet. Be the first to post!"}
            </GlassCard>
          );
        }
        return (
          <div className="space-y-3">
            {(() => {
              const scored = visible.map((j) => ({ j, m: computeMatch(j) }));
              if (aiBanner) scored.sort((a, b) => (b.m ?? -1) - (a.m ?? -1));
              return scored.map(({ j, m }, i) => (
                <JobCard key={j.id} job={j} delay={i * 40} saved={savedIds.has(j.id)} onToggleSave={user ? () => toggleSave(j.id) : undefined} match={m} />
              ));
            })()}
          </div>
        );
      })()}

      {alertToast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-max max-w-[90vw] rounded-full border border-emerald-400/30 bg-emerald-500/15 px-4 py-2 text-xs text-emerald-100 backdrop-blur-xl animate-fade-in">
          {alertToast}
        </div>
      )}

      <AIResumeMatchSheet
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onAccepted={(r, prefs) => {
          setAiOpen(false);
          setAiBanner({ name: r.candidate_name, skills: r.extracted_skills, location: prefs.location });
          setFilter({
            ...filter,
            skills: r.extracted_skills.length ? r.extracted_skills : undefined,
            location: prefs.location || undefined,
          });
          if (prefs.location) setLocationInput(prefs.location);
          if (r.extracted_skills.length) setSkillsInput(r.extracted_skills.join(", "));
        }}
      />
    </CareerShell>
  );
}

function JobCard({ job, delay, saved, onToggleSave, match }: { job: JobRow; delay: number; saved: boolean; onToggleSave?: () => void; match?: number | null }) {
  const company = (job as unknown as { companies: { name: string; logo_url: string | null; verification: string } | null }).companies;
  const matchTone = match == null ? "" : match >= 75 ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200" : match >= 50 ? "border-[#e8c874]/50 bg-[#e8c874]/15 text-[#e8c874]" : "border-white/15 bg-white/[0.05] text-white/70";
  return (
    <div className="relative animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      {match != null && (
        <div className={`pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md ${matchTone}`}>
          <Sparkles className="h-3 w-3" /> {match}% match
        </div>
      )}
      {onToggleSave && (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSave(); }}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition ${saved ? "border-[#e8c874]/60 bg-[#e8c874]/20 text-[#e8c874]" : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white"}`}
          aria-label={saved ? "Unsave job" : "Save job"}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      )}
      <Link to="/career/jobs/$jobId" params={{ jobId: job.id }} className="block">
      <GlassCard className={`p-4 ${match != null ? "pt-9" : ""}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#e8c874]">
            {company?.logo_url ? (
              <img src={company.logo_url} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : (
              <Briefcase className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1 pr-9">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-semibold">{job.title}</div>
              <VerifiedBadge verified={job.is_verified || company?.verification === "verified"} />
            </div>
            <div className="mt-0.5 truncate text-xs text-white/60">{company?.name ?? "Independent"}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wider text-white/50">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">{job.kind}</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">{job.work_type}</span>
              {job.apply_mode === "external" && job.apply_url && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#4f7cff]/40 bg-[#4f7cff]/15 px-2 py-0.5 text-[#a5c1ff]">
                  <ExternalLink className="h-2.5 w-2.5" /> Official site
                </span>
              )}
              {job.location && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
              )}
              {(job.salary_min || job.salary_max) && (
                <span className="text-[#e8c874]">{formatSalary(job)}</span>
              )}
            </div>
          </div>
        </div>
      </GlassCard>
      </Link>
    </div>
  );
}

function formatSalary(j: JobRow) {
  const c = j.salary_currency ?? "USD";
  const p = j.salary_period ?? "year";
  if (j.salary_min && j.salary_max) return `${c} ${fmt(j.salary_min)}–${fmt(j.salary_max)}/${p}`;
  if (j.salary_min) return `${c} ${fmt(j.salary_min)}+/${p}`;
  if (j.salary_max) return `${c} up to ${fmt(j.salary_max)}/${p}`;
  return "";
}
function fmt(n: number) { return n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n); }