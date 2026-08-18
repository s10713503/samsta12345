import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CareerShell, GlassCard, VerifiedBadge } from "@/components/samsta/CareerShell";
import { useAuthUser } from "@/hooks/use-auth";
import { streamSam } from "@/lib/stream-sam";
import {
  listCompanies, getCompany, upsertCompany, follow, unfollow, listFollowing, followerCount,
  listReviews, postReview, ratingSummary,
  listUpdates, postUpdate,
  listRecruiters, upsertRecruiter,
  listEvents, postEvent,
  listDiscussions, postDiscussion,
  listPartnershipRequests, sendPartnershipRequest,
  listMetrics, upsertMetric,
  pageViewsCount, logCompanyView, listCompanyJobs, submitVerification,
  type Company, type CompanyReview,
} from "@/lib/api/companies";
import {
  Building2, Search, Star, Users, MessageCircle, TrendingUp, Sparkles, Shield, ShieldCheck, Handshake,
  BarChart3, Calendar, MapPin, Globe, Briefcase, Plus, Loader2, Bot, Wand2, Heart, Send, ChevronRight,
  Award, DollarSign, Newspaper, Layers, Target, LineChart, X,
} from "lucide-react";

export const Route = createFileRoute("/career/companies")({
  head: () => ({
    meta: [
      { title: "Companies · Samsta" },
      { name: "description", content: "Discover verified companies, follow updates, apply to live jobs, read reviews, and use to compare, research, and connect." },
    ],
  }),
  component: CompaniesHub,
});

type Tab = "discover" | "following" | "reviews" | "recruiters" | "events" | "community" | "b2b" | "insights" | "ai" | "manage";
const TABS: { k: Tab; l: string; I: typeof Building2 }[] = [
  { k: "discover", l: "Discover", I: Search },
  { k: "following", l: "Following", I: Heart },
  { k: "reviews", l: "Reviews", I: Star },
  { k: "recruiters", l: "Recruiters", I: Users },
  { k: "events", l: "Events", I: Calendar },
  { k: "community", l: "Community", I: MessageCircle },
  { k: "b2b", l: "B2B", I: Handshake },
  { k: "insights", l: "Insights", I: LineChart },
  { k: "ai", l: "Tools", I: Sparkles },
  { k: "manage", l: "Manage", I: Shield },
];

function CompaniesHub() {
  const { user } = useAuthUser();
  const [tab, setTab] = useState<Tab>("discover");
  const [q, setQ] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Company | null>(null);

  const refresh = useCallback(async () => {
    const list = await listCompanies(q || undefined);
    setCompanies(list);
    if (user) setFollowing(await listFollowing(user.id));
  }, [q, user]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <CareerShell title="Companies" subtitle="Verified companies, live jobs, reviews, and powered research.">
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
        <Search className="h-4 w-4 text-white/50" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies, industries…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/40" />
      </div>

      <div className="mb-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
              tab === t.k ? "bg-gradient-to-r from-[#e8c874] to-[#c9a34a] text-[#05070f]" : "border border-white/10 bg-white/5 text-white/70"
            }`}>
            <t.I className="h-3.5 w-3.5" /> {t.l}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
          {tab === "discover" && <DiscoverTab companies={companies} following={following} onOpen={(c) => setSelected(c)} onFollow={async (c, on) => {
            if (!user) return toast.error("Sign in to follow");
            if (on) await follow(c.id, user.id); else await unfollow(c.id, user.id);
            setFollowing(await listFollowing(user.id));
          }} />}
          {tab === "following" && <DiscoverTab companies={companies.filter((c) => following.has(c.id))} following={following} onOpen={(c) => setSelected(c)} onFollow={async (c) => { if (user) { await unfollow(c.id, user.id); setFollowing(await listFollowing(user.id)); } }} />}
          {tab === "reviews" && <ReviewsTab companies={companies} />}
          {tab === "recruiters" && <RecruitersTab companies={companies} userId={user?.id} />}
          {tab === "events" && <EventsTab companies={companies} userId={user?.id} />}
          {tab === "community" && <CommunityTab companies={companies} userId={user?.id} />}
          {tab === "b2b" && <B2BTab companies={companies} userId={user?.id} />}
          {tab === "insights" && <InsightsTab companies={companies} />}
          {tab === "ai" && <AITab companies={companies} />}
          {tab === "manage" && <ManageTab userId={user?.id} onSaved={refresh} />}
        </motion.div>
      </AnimatePresence>

      {selected && <CompanySheet company={selected} onClose={() => setSelected(null)} userId={user?.id} />}
    </CareerShell>
  );
}

/* ---------------- Discover ---------------- */
function DiscoverTab({ companies, following, onOpen, onFollow }: { companies: Company[]; following: Set<string>; onOpen: (c: Company) => void; onFollow: (c: Company, on: boolean) => void; }) {
  if (!companies.length) return <GlassCard className="p-6 text-center text-sm text-white/50">No companies yet. Add yours from the Manage tab.</GlassCard>;
  return (
    <div className="space-y-3">
      {companies.map((c, i) => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
          <GlassCard className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#e8c874]">
                {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full rounded-xl object-cover" /> : <Building2 className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <button onClick={() => onOpen(c)} className="truncate text-sm font-semibold hover:text-[#e8c874]">{c.name}</button>
                  <VerifiedBadge verified={c.verification === "verified"} />
                </div>
                <div className="mt-0.5 text-xs text-white/60">{c.industry ?? "—"}{c.headquarters ? ` · ${c.headquarters}` : ""}</div>
                {c.description && <div className="mt-1 line-clamp-2 text-xs text-white/50">{c.description}</div>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.size && <Chip>{c.size}</Chip>}
                  {c.founded_year && <Chip>Est. {c.founded_year}</Chip>}
                  {c.is_hiring && <Chip tone="gold">Hiring</Chip>}
                </div>
              </div>
              <button onClick={() => onFollow(c, !following.has(c.id))}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold ${following.has(c.id) ? "border border-[#e8c874]/40 bg-[#e8c874]/10 text-[#e8c874]" : "bg-white/10 text-white/80"}`}>
                {following.has(c.id) ? "Following" : "Follow"}
              </button>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  );
}

function Chip({ children, tone }: { children: React.ReactNode; tone?: "gold" }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] tracking-wider ${tone === "gold" ? "border border-[#e8c874]/40 bg-[#e8c874]/10 text-[#e8c874]" : "border border-white/10 bg-white/5 text-white/60"}`}>{children}</span>;
}

/* ---------------- Company sheet ---------------- */
function CompanySheet({ company, onClose, userId }: { company: Company; onClose: () => void; userId?: string }) {
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof listCompanyJobs>>>([]);
  const [updates, setUpdates] = useState<Awaited<ReturnType<typeof listUpdates>>>([]);
  const [reviews, setReviews] = useState<CompanyReview[]>([]);
  const [fCount, setFCount] = useState(0);
  const [views, setViews] = useState(0);

  useEffect(() => {
    void logCompanyView(company.id, userId ?? null);
    void listCompanyJobs(company.id).then(setJobs);
    void listUpdates(company.id).then(setUpdates);
    void listReviews(company.id).then(setReviews);
    void followerCount(company.id).then(setFCount);
    void pageViewsCount(company.id).then(setViews);
  }, [company.id, userId]);

  const summary = useMemo(() => ratingSummary(reviews), [reviews]);

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ y: 40 }} animate={{ y: 0 }} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0a0d1a] p-5 text-white">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="m-3 h-6 w-6 text-[#e8c874]" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold">{company.name}<VerifiedBadge verified={company.verification === "verified"} /></div>
              <div className="text-xs text-white/50">{company.industry ?? "—"}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2"><X className="h-4 w-4" /></button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Followers" value={fCount} />
          <Stat label="Views 30d" value={views} />
          <Stat label="Open jobs" value={jobs.length} />
        </div>

        {summary && (
          <GlassCard className="mb-4 p-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">Ratings ({summary.total})</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {summary.overall != null && <Chip tone="gold">Overall {summary.overall}★</Chip>}
              {summary.culture != null && <Chip>Culture {summary.culture}</Chip>}
              {summary.wlb != null && <Chip>WLB {summary.wlb}</Chip>}
              {summary.growth != null && <Chip>Growth {summary.growth}</Chip>}
              {summary.diversity != null && <Chip>D&I {summary.diversity}</Chip>}
              {summary.ceo != null && <Chip>CEO {summary.ceo}</Chip>}
            </div>
          </GlassCard>
        )}

        {company.description && <p className="mb-4 text-sm text-white/80">{company.description}</p>}

        <div className="mb-4 space-y-1 text-xs text-white/60">
          {company.headquarters && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {company.headquarters}</div>}
          {company.website && <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-[#e8c874]"><Globe className="h-3.5 w-3.5" /> {company.website}</a>}
          {company.size && <div>Size · {company.size}</div>}
          {company.founded_year && <div>Founded · {company.founded_year}</div>}
          {!!(company.tech_stack?.length) && <div>Stack · {company.tech_stack.join(", ")}</div>}
          {!!(company.benefits?.length) && <div>Benefits · {company.benefits.join(", ")}</div>}
        </div>

        <Section title="Live Jobs" icon={Briefcase}>
          {jobs.length ? jobs.map((j) => (
            <Link key={j.id} to="/career/jobs/$jobId" params={{ jobId: j.id }} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs hover:border-[#e8c874]/40">
              <div>
                <div className="font-medium">{j.title}</div>
                <div className="text-white/50">{j.location ?? "Remote"} · {j.kind} · {j.work_type}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-white/40" />
            </Link>
          )) : <Empty>No open roles.</Empty>}
        </Section>

        <Section title="Recent Updates" icon={Newspaper}>
          {updates.length ? updates.slice(0, 5).map((u) => (
            <div key={u.id} className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-xs">
              {u.title && <div className="font-medium">{u.title}</div>}
              <div className="text-white/70">{u.body}</div>
              <div className="mt-1 text-[10px] text-white/40">{new Date(u.created_at).toLocaleString()}</div>
            </div>
          )) : <Empty>No updates yet.</Empty>}
        </Section>

        <ReviewForm companyId={company.id} userId={userId} onPosted={async () => setReviews(await listReviews(company.id))} />
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2"><div className="text-lg font-semibold">{value}</div><div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div></div>;
}
function Section({ title, icon: I, children }: { title: string; icon: typeof Briefcase; children: React.ReactNode }) {
  return <div className="mb-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white/70"><I className="h-3.5 w-3.5 text-[#e8c874]" /> {title}</div><div className="space-y-2">{children}</div></div>;
}
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-white/40">{children}</div>; }

function ReviewForm({ companyId, userId, onPosted }: { companyId: string; userId?: string; onPosted: () => void }) {
  const [rating, setRating] = useState(4);
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [anon, setAnon] = useState(true);
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="mb-2 text-xs font-semibold text-white/70">Write a review</div>
      <div className="mb-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => <button key={n} onClick={() => setRating(n)}><Star className={`h-4 w-4 ${n <= rating ? "fill-[#e8c874] text-[#e8c874]" : "text-white/30"}`} /></button>)}
      </div>
      <textarea value={pros} onChange={(e) => setPros(e.target.value)} placeholder="What you loved…" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" rows={2} />
      <textarea value={cons} onChange={(e) => setCons(e.target.value)} placeholder="What could be better…" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" rows={2} />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-[11px] text-white/60"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> Post anonymously</label>
        <button disabled={busy || !userId} onClick={async () => {
          if (!userId) return toast.error("Sign in first");
          setBusy(true);
          try {
            await postReview({ company_id: companyId, reviewer_id: userId, rating, pros, cons, is_anonymous: anon });
            setPros(""); setCons(""); onPosted();
            toast.success("Review posted");
          } catch (e) { toast.error(String((e as Error).message ?? e)); } finally { setBusy(false); }
        }} className="rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-3 py-1.5 text-[11px] font-semibold text-[#05070f] disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post review"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- Reviews tab (aggregate feed) ---------------- */
function ReviewsTab({ companies }: { companies: Company[] }) {
  const [byCompany, setByCompany] = useState<Record<string, CompanyReview[]>>({});
  useEffect(() => {
    (async () => {
      const results: Record<string, CompanyReview[]> = {};
      await Promise.all(companies.slice(0, 12).map(async (c) => { results[c.id] = await listReviews(c.id); }));
      setByCompany(results);
    })();
  }, [companies]);
  const items = Object.entries(byCompany).flatMap(([cid, revs]) => revs.slice(0, 3).map((r) => ({ ...r, cName: companies.find((c) => c.id === cid)?.name ?? "" })));
  if (!items.length) return <GlassCard className="p-6 text-center text-sm text-white/50">No reviews yet — be the first inside a company sheet.</GlassCard>;
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <GlassCard key={r.id} className="p-3 text-xs">
          <div className="mb-1 flex items-center justify-between"><div className="font-semibold">{r.cName}</div>{r.rating && <div className="text-[#e8c874]">{r.rating}★</div>}</div>
          {r.pros && <div><span className="text-white/50">Pros:</span> {r.pros}</div>}
          {r.cons && <div><span className="text-white/50">Cons:</span> {r.cons}</div>}
          <div className="mt-1 text-[10px] text-white/40">{r.is_anonymous ? "Anonymous" : "Employee"} · {new Date(r.created_at).toLocaleDateString()}</div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------------- Recruiters ---------------- */
function RecruitersTab({ companies, userId }: { companies: Company[]; userId?: string }) {
  const [pick, setPick] = useState<string>("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listRecruiters>>>([]);
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => { if (pick) listRecruiters(pick).then(setRows); }, [pick]);
  return (
    <div className="space-y-3">
      <CompanyPicker companies={companies} value={pick} onChange={setPick} />
      {pick && (
        <>
          <div className="space-y-2">{rows.length ? rows.map((r) => <GlassCard key={r.id} className="p-3 text-xs"><div className="font-semibold">{r.title ?? "Recruiter"} {r.verified && <ShieldCheck className="inline h-3.5 w-3.5 text-[#e8c874]" />}</div><div className="text-white/60">{r.bio}</div></GlassCard>) : <Empty>No recruiters listed.</Empty>}</div>
          {userId && (
            <GlassCard className="p-3">
              <div className="mb-2 text-xs font-semibold">Join as recruiter</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Bio" rows={2} className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <button onClick={async () => { await upsertRecruiter({ company_id: pick, user_id: userId, title, bio }); setRows(await listRecruiters(pick)); toast.success("Saved"); }} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px]">Save</button>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}

function CompanyPicker({ companies, value, onChange }: { companies: Company[]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-sm">
      <option value="">Pick a company…</option>
      {companies.map((c) => <option key={c.id} value={c.id} className="bg-[#0a0d1a]">{c.name}</option>)}
    </select>
  );
}

/* ---------------- Events ---------------- */
function EventsTab({ companies, userId }: { companies: Company[]; userId?: string }) {
  const [pick, setPick] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listEvents>>>([]);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState(""); const [when, setWhen] = useState(""); const [loc, setLoc] = useState("");
  useEffect(() => { if (pick) listEvents(pick).then(setRows); }, [pick]);
  return (
    <div className="space-y-3">
      <CompanyPicker companies={companies} value={pick} onChange={setPick} />
      {pick && (
        <>
          <div className="space-y-2">{rows.length ? rows.map((e) => <GlassCard key={e.id} className="p-3 text-xs"><div className="font-semibold">{e.title}</div><div className="text-white/60">{e.description}</div><div className="mt-1 text-[10px] text-white/40">{e.starts_at ? new Date(e.starts_at).toLocaleString() : ""}{e.location ? ` · ${e.location}` : ""}</div></GlassCard>) : <Empty>No events.</Empty>}</div>
          {userId && (
            <GlassCard className="p-3">
              <div className="mb-2 text-xs font-semibold">Post an event</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={2} className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <input value={when} onChange={(e) => setWhen(e.target.value)} type="datetime-local" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Location / URL" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <button onClick={async () => { await postEvent({ company_id: pick, author_id: userId, title, description: desc, starts_at: when ? new Date(when).toISOString() : null, location: loc }); setRows(await listEvents(pick)); toast.success("Event posted"); }} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px]">Post</button>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Community ---------------- */
function CommunityTab({ companies, userId }: { companies: Company[]; userId?: string }) {
  const [pick, setPick] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listDiscussions>>>([]);
  const [title, setTitle] = useState(""); const [body, setBody] = useState("");
  useEffect(() => { if (pick) listDiscussions(pick).then(setRows); }, [pick]);
  return (
    <div className="space-y-3">
      <CompanyPicker companies={companies} value={pick} onChange={setPick} />
      {pick && (
        <>
          <div className="space-y-2">{rows.length ? rows.map((d) => <GlassCard key={d.id} className="p-3 text-xs"><div className="font-semibold">{d.title}</div><div className="text-white/60">{d.body}</div></GlassCard>) : <Empty>No discussions yet.</Empty>}</div>
          {userId && (
            <GlassCard className="p-3">
              <div className="mb-2 text-xs font-semibold">Start a discussion</div>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" rows={3} className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
              <button onClick={async () => { await postDiscussion({ company_id: pick, author_id: userId, title, body }); setRows(await listDiscussions(pick)); setTitle(""); setBody(""); toast.success("Posted"); }} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px]">Post</button>
            </GlassCard>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- B2B / Partnerships ---------------- */
function B2BTab({ companies, userId }: { companies: Company[]; userId?: string }) {
  const [pick, setPick] = useState(""); const [kind, setKind] = useState("partnership"); const [msg, setMsg] = useState(""); const [budget, setBudget] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listPartnershipRequests>>>([]);
  useEffect(() => { if (pick) listPartnershipRequests(pick).then(setRows); }, [pick]);
  return (
    <div className="space-y-3">
      <CompanyPicker companies={companies} value={pick} onChange={setPick} />
      {pick && userId && (
        <>
          <GlassCard className="p-3">
            <div className="mb-2 text-xs font-semibold">Send request</div>
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
              {["partnership", "vendor", "investor", "franchise", "b2b"].map((k) => <option key={k} value={k} className="bg-[#0a0d1a]">{k}</option>)}
            </select>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Your proposal…" rows={3} className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
            <input value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Budget (USD)" type="number" className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
            <button onClick={async () => { await sendPartnershipRequest({ company_id: pick, from_user_id: userId, kind, message: msg, budget: budget ? Number(budget) : undefined }); setRows(await listPartnershipRequests(pick)); setMsg(""); toast.success("Request sent"); }} className="rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-3 py-1.5 text-[11px] font-semibold text-[#05070f]"><Send className="mr-1 inline h-3 w-3" /> Send</button>
          </GlassCard>
          <div className="space-y-2">{rows.map((r) => <GlassCard key={r.id} className="p-3 text-xs"><div className="flex items-center justify-between"><div className="font-semibold uppercase tracking-wider">{r.kind}</div><Chip>{r.status}</Chip></div><div className="mt-1 text-white/60">{r.message}</div></GlassCard>)}</div>
        </>
      )}
    </div>
  );
}

/* ---------------- Insights ---------------- */
function InsightsTab({ companies }: { companies: Company[] }) {
  const [pick, setPick] = useState("");
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof listMetrics>>>([]);
  useEffect(() => { if (pick) listMetrics(pick).then(setMetrics); }, [pick]);
  return (
    <div className="space-y-3">
      <CompanyPicker companies={companies} value={pick} onChange={setPick} />
      {pick && (
        <GlassCard className="p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/70"><LineChart className="h-3.5 w-3.5 text-[#e8c874]" /> Growth & hiring</div>
          {metrics.length ? (
            <div className="space-y-1.5 text-xs">
              {metrics.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2">
                  <div className="text-white/50">{m.period_start}</div>
                  <div className="flex gap-2 text-white/80"><span>{m.employees ?? "—"} emp</span><span>{m.hires ?? 0} hires</span><span>{m.openings ?? 0} open</span></div>
                </div>
              ))}
            </div>
          ) : <Empty>No metrics captured. Company owners can add them in Manage.</Empty>}
        </GlassCard>
      )}
    </div>
  );
}

/* ---------------- AI tools ---------------- */
function AITab({ companies }: { companies: Company[] }) {
  const TOOLS: { k: string; l: string; desc: string; tool: string; icon: typeof Bot }[] = [
    { k: "research", l: "Company Research", desc: "Deep-dive brief on any company.", tool: "co_research", icon: Bot },
    { k: "compare", l: "Compare Companies", desc: "Head-to-head scoring.", tool: "co_compare", icon: Layers },
    { k: "reco", l: "Recommend Companies", desc: "Personalized targets for you.", tool: "co_reco", icon: Target },
    { k: "fit", l: "Career Fit Score", desc: "How well you fit a company.", tool: "co_fit", icon: TrendingUp },
    { k: "salary", l: "Salary Prediction", desc: "Compensation range + drivers.", tool: "co_salary", icon: DollarSign },
    { k: "interview", l: "Interview Prep", desc: "Company-specific coaching.", tool: "co_interview", icon: Award },
    { k: "market", l: "Market Analysis", desc: "Industry trends & players.", tool: "co_market", icon: LineChart },
    { k: "competitor", l: "Competitor Analysis", desc: "Positioning & edge map.", tool: "co_competitor", icon: Layers },
    { k: "industry", l: "Industry Insights", desc: "Where the industry is going.", tool: "co_industry", icon: TrendingUp },
    { k: "news", l: "News Summary", desc: "TL;DR on company updates.", tool: "co_news_summary", icon: Newspaper },
    { k: "reviews", l: "Review Summary", desc: "Synthesize employee feedback.", tool: "co_review_summary", icon: Star },
    { k: "assistant", l: "Companies Assistant", desc: "Ask anything about companies.", tool: "co_assistant", icon: Sparkles },
  ];
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = TOOLS.find((t) => t.k === active);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {TOOLS.map((t) => (
          <button key={t.k} onClick={() => { setActive(t.k); setOut(""); setInput(""); }} className={`rounded-2xl border p-3 text-left transition ${active === t.k ? "border-[#e8c874] bg-[#e8c874]/10" : "border-white/10 bg-white/5"}`}>
            <t.icon className="h-4 w-4 text-[#e8c874]" />
            <div className="mt-1 text-xs font-semibold">{t.l}</div>
            <div className="text-[10px] text-white/50">{t.desc}</div>
          </button>
        ))}
      </div>
      {cur && (
        <GlassCard className="p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold"><Wand2 className="h-3.5 w-3.5 text-[#e8c874]" /> {cur.l}</div>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Describe your input for ${cur.l}…`} rows={3} className="mb-2 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <button disabled={busy || !input.trim()} onClick={async () => {
            setBusy(true); setOut("");
            try {
              await streamSam(cur.tool, [{ role: "user", content: input }], setOut);
            } catch (e) { toast.error(String((e as Error).message ?? e)); } finally { setBusy(false); }
          }} className="rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-3 py-1.5 text-[11px] font-semibold text-[#05070f] disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run"}
          </button>
          {out && <div className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-white/85">{out}</div>}
        </GlassCard>
      )}
      {!companies.length && <div className="text-center text-[11px] text-white/40">Tip: add a company in Manage to use company-scoped tools.</div>}
    </div>
  );
}

/* ---------------- Manage (create/verify/metrics) ---------------- */
function ManageTab({ userId, onSaved }: { userId?: string; onSaved: () => void }) {
  const [name, setName] = useState(""); const [industry, setIndustry] = useState(""); const [size, setSize] = useState(""); const [hq, setHq] = useState(""); const [web, setWeb] = useState(""); const [desc, setDesc] = useState(""); const [founded, setFounded] = useState("");
  if (!userId) return <GlassCard className="p-6 text-center text-sm text-white/50">Sign in to manage companies.</GlassCard>;
  return (
    <div className="space-y-3">
      <GlassCard className="p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/70"><Building2 className="h-3.5 w-3.5 text-[#e8c874]" /> Add / update your company</div>
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name*" className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Size (11-50)" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={hq} onChange={(e) => setHq(e.target.value)} placeholder="Headquarters" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={founded} onChange={(e) => setFounded(e.target.value)} placeholder="Founded (year)" type="number" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={web} onChange={(e) => setWeb(e.target.value)} placeholder="Website" className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="About" rows={3} className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
        </div>
        <button onClick={async () => {
          if (!name.trim()) return toast.error("Name required");
          try {
            await upsertCompany({ owner_id: userId, name, industry, size, headquarters: hq, website: web, description: desc, founded_year: founded ? Number(founded) : null });
            toast.success("Saved");
            setName(""); setIndustry(""); setSize(""); setHq(""); setWeb(""); setDesc(""); setFounded("");
            onSaved();
          } catch (e) { toast.error(String((e as Error).message ?? e)); }
        }} className="mt-2 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-3 py-1.5 text-[11px] font-semibold text-[#05070f]"><Plus className="mr-1 inline h-3 w-3" /> Save</button>
      </GlassCard>

      <VerificationCard userId={userId} />
      <MetricsCard userId={userId} />
    </div>
  );
}

function VerificationCard({ userId }: { userId: string }) {
  const [pick, setPick] = useState(""); const [kind, setKind] = useState("registration"); const [docUrl, setDocUrl] = useState(""); const [notes, setNotes] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  useEffect(() => { listCompanies().then((rows) => setCompanies(rows.filter((c) => c.owner_id === userId))); }, [userId]);
  return (
    <GlassCard className="p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/70"><ShieldCheck className="h-3.5 w-3.5 text-[#e8c874]" /> Verify your company</div>
      <CompanyPicker companies={companies} value={pick} onChange={setPick} />
      {pick && (
        <div className="mt-2 space-y-2">
          <input value={kind} onChange={(e) => setKind(e.target.value)} placeholder="Document kind" className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={docUrl} onChange={(e) => setDocUrl(e.target.value)} placeholder="Document URL" className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <button onClick={async () => { await submitVerification({ company_id: pick, submitted_by: userId, kind, doc_url: docUrl, notes }); toast.success("Submitted"); }} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px]">Submit for review</button>
        </div>
      )}
    </GlassCard>
  );
}

function MetricsCard({ userId }: { userId: string }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pick, setPick] = useState(""); const [period, setPeriod] = useState(""); const [emp, setEmp] = useState(""); const [hires, setHires] = useState(""); const [openings, setOpenings] = useState("");
  useEffect(() => { listCompanies().then((rows) => setCompanies(rows.filter((c) => c.owner_id === userId))); }, [userId]);
  return (
    <GlassCard className="p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/70"><BarChart3 className="h-3.5 w-3.5 text-[#e8c874]" /> Monthly metrics snapshot</div>
      <CompanyPicker companies={companies} value={pick} onChange={setPick} />
      {pick && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Period (YYYY-MM-01)" className="col-span-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={emp} onChange={(e) => setEmp(e.target.value)} placeholder="Employees" type="number" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={hires} onChange={(e) => setHires(e.target.value)} placeholder="Hires" type="number" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <input value={openings} onChange={(e) => setOpenings(e.target.value)} placeholder="Openings" type="number" className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs" />
          <button onClick={async () => {
            if (!period) return toast.error("Period required");
            await upsertMetric({ company_id: pick, period_start: period, employees: emp ? Number(emp) : null, hires: hires ? Number(hires) : null, openings: openings ? Number(openings) : null });
            toast.success("Saved metric");
          }} className="col-span-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px]">Save snapshot</button>
        </div>
      )}
    </GlassCard>
  );
}