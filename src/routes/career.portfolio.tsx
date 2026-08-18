// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CareerShell, GlassCard, VerifiedBadge } from "@/components/samsta/CareerShell";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { streamSam } from "@/lib/stream-sam";
import {
  addEndorsement, deleteCertificate, deleteEducation, deleteExperience, deleteProject, deletePublication, deleteResume, deleteSkill,
  getMyPortfolio, getSettings, listCertificates, listEducation, listEndorsements, listExperiences, listProjects, listPublications,
  listResumes, listSkills, listViews, localScore, recordView, saveCertificate, saveEducation, saveExperience, saveProject,
  savePublication, saveResume, saveSkill, upsertPortfolio, upsertSettings,
  type PortfolioProfile, type PortfolioProject, type PortfolioSkill, type PortfolioExperience, type PortfolioEducation,
  type PortfolioCertificate, type PortfolioPublication, type PortfolioResume, type PortfolioEndorsement, type PortfolioSettings,
  type PortfolioView,
} from "@/lib/api/portfolio";
import {
  User, FileText, FolderKanban, Sparkles, Award, GraduationCap, Briefcase, BarChart3, Users, Shield, QrCode, Download,
  Plus, Trash2, Save, ExternalLink, Github, Bot, Wand2, Copy, Check, TrendingUp, Eye, Globe, Palette, Lock, Zap, Star,
  Loader2, X, ScanSearch, ShieldCheck, Languages,
} from "lucide-react";

export const Route = createFileRoute("/career/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio· Samsta" },
      { name: "description", content: "Build a premium powered portfolio with projects, skills, resume, analytics, and 24/7 assistant." },
    ],
  }),
  component: PortfolioHubPage,
});

type TabKey =
  | "identity" | "projects" | "skills" | "experience" | "resume" | "ai" | "analytics" | "social" | "privacy" | "share";

const TABS: { k: TabKey; l: string; I: typeof User }[] = [
  { k: "identity", l: "Identity", I: User },
  { k: "projects", l: "Projects", I: FolderKanban },
  { k: "skills", l: "Skills", I: Award },
  { k: "experience", l: "Timeline", I: GraduationCap },
  { k: "resume", l: "Resume", I: FileText },
  { k: "ai", l: "Tools", I: Sparkles },
  { k: "analytics", l: "Analytics", I: BarChart3 },
  { k: "social", l: "Network", I: Users },
  { k: "privacy", l: "Privacy", I: Shield },
  { k: "share", l: "Share", I: QrCode },
];

function PortfolioHubPage() {
  const { user, loading } = useAuthUser();
  const [tab, setTab] = useState<TabKey>("identity");
  const [profile, setProfile] = useState<PortfolioProfile | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [skills, setSkills] = useState<PortfolioSkill[]>([]);
  const [experiences, setExperiences] = useState<PortfolioExperience[]>([]);
  const [education, setEducation] = useState<PortfolioEducation[]>([]);
  const [certificates, setCertificates] = useState<PortfolioCertificate[]>([]);
  const [publications, setPublications] = useState<PortfolioPublication[]>([]);
  const [resumes, setResumes] = useState<PortfolioResume[]>([]);
  const [endorsements, setEndorsements] = useState<PortfolioEndorsement[]>([]);
  const [views, setViews] = useState<PortfolioView[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const [p, pj, sk, ex, ed, ce, pu, rs, en, vw, st] = await Promise.all([
      getMyPortfolio(user.id), listProjects(user.id), listSkills(user.id), listExperiences(user.id),
      listEducation(user.id), listCertificates(user.id), listPublications(user.id), listResumes(user.id),
      listEndorsements(user.id), listViews(user.id, 30), getSettings(user.id),
    ]);
    setProfile(p); setProjects(pj); setSkills(sk); setExperiences(ex); setEducation(ed);
    setCertificates(ce); setPublications(pu); setResumes(rs); setEndorsements(en); setViews(vw); setSettings(st);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const score = useMemo(() => localScore({
    profile, projects, skills, experiences, education, certificates,
    resume: resumes[0] ?? null,
  }), [profile, projects, skills, experiences, education, certificates, resumes]);

  if (loading) return <CareerShell title="Portfolio"><div className="text-white/40">Loading…</div></CareerShell>;
  if (!user) return (
    <CareerShell title="Portfolio"><GlassCard className="p-6 text-center">
      <p className="text-white/70">Sign in to build your portfolio.</p>
      <Link to="/auth" className="mt-4 inline-block rounded-full bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] px-5 py-2 text-sm font-semibold">Sign in</Link>
    </GlassCard></CareerShell>
  );

  return (
    <CareerShell title="Portfolio" subtitle="Your premium career story— projects, resume, and, all in one place.">
      <HeaderCard profile={profile} score={score} projects={projects.length} views={views.length} />

      {/* Tabs */}
      <div className="mt-5 -mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex gap-2">
          {TABS.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition ${tab === t.k ? "border-[#e8c874]/60 bg-gradient-to-r from-[#e8c874]/25 to-[#c9a34a]/10 text-[#f7e6b8]" : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20"}`}>
              <t.I className="h-3.5 w-3.5" />{t.l}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22 }}>
            {tab === "identity" && <IdentityTab userId={user.id} profile={profile} onSaved={refresh} />}
            {tab === "projects" && <ProjectsTab userId={user.id} projects={projects} onChange={refresh} />}
            {tab === "skills" && <SkillsTab userId={user.id} skills={skills} endorsements={endorsements} onChange={refresh} />}
            {tab === "experience" && <ExperienceTab userId={user.id} experiences={experiences} education={education} certificates={certificates} publications={publications} onChange={refresh} />}
            {tab === "resume" && <ResumeTab userId={user.id} resumes={resumes} profile={profile} experiences={experiences} education={education} skills={skills} projects={projects} onChange={refresh} />}
            {tab === "ai" && <AITab profile={profile} projects={projects} skills={skills} experiences={experiences} education={education} certificates={certificates} />}
            {tab === "analytics" && <AnalyticsTab views={views} projects={projects} />}
            {tab === "social" && <SocialTab endorsements={endorsements} userId={user.id} />}
            {tab === "privacy" && <PrivacyTab userId={user.id} settings={settings} onSaved={refresh} />}
            {tab === "share" && <ShareTab profile={profile} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </CareerShell>
  );
}

/* ============================================================
   HEADER
   ============================================================ */
function HeaderCard({ profile, score, projects, views }: { profile: PortfolioProfile | null; score: number; projects: number; views: number }) {
  return (
    <GlassCard className="overflow-hidden p-0">
      <div className="relative h-24 bg-gradient-to-br from-[#1e3a8a] via-[#3b5fd1] to-[#c9a34a]">
        {profile?.cover_url && <img src={profile.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="p-4">
        <div className="-mt-10 flex items-end gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white/20 bg-[#05070f] text-2xl font-bold">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full rounded-2xl object-cover" /> : (profile?.display_name?.[0] ?? "P")}
          </div>
          <div className="flex-1 pb-1">
            <div className="flex items-center gap-1.5">
              <div className="font-display text-lg italic">{profile?.display_name || profile?.username || "Your name"}</div>
              <VerifiedBadge verified={profile?.verified} />
            </div>
            <div className="text-xs text-white/60">{profile?.tagline || "Add a tagline in Identity →"}</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Score" value={`${score}`} accent />
          <Stat label="Projects" value={String(projects)} />
          <Stat label="Views 30d" value={String(views)} />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }} transition={{ duration: 0.9, ease: "easeOut" }} className="h-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a]" />
        </div>
      </div>
    </GlassCard>
  );
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
      <div className={`text-lg font-bold ${accent ? "text-[#e8c874]" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}

/* ============================================================
   IDENTITY
   ============================================================ */
function IdentityTab({ userId, profile, onSaved }: { userId: string; profile: PortfolioProfile | null; onSaved: () => void }) {
  const [f, setF] = useState({
    username: profile?.username ?? "",
    display_name: profile?.display_name ?? "",
    tagline: profile?.tagline ?? "",
    bio: profile?.bio ?? "",
    brand_color: profile?.brand_color ?? "#c9a34a",
    theme: profile?.theme ?? "luxury",
    avatar_url: profile?.avatar_url ?? "",
    cover_url: profile?.cover_url ?? "",
    location: profile?.location ?? "",
    contact_email: profile?.contact_email ?? "",
    contact_phone: profile?.contact_phone ?? "",
    website: profile?.website ?? "",
    languages: (profile?.languages ?? []).join(", "),
    socials: JSON.stringify(profile?.socials ?? {}, null, 2),
    seo_title: profile?.seo_title ?? "",
    seo_description: profile?.seo_description ?? "",
  });
  useEffect(() => {
    if (!profile) return;
    setF({
      username: profile.username ?? "", display_name: profile.display_name ?? "", tagline: profile.tagline ?? "",
      bio: profile.bio ?? "", brand_color: profile.brand_color ?? "#c9a34a", theme: profile.theme ?? "luxury",
      avatar_url: profile.avatar_url ?? "", cover_url: profile.cover_url ?? "", location: profile.location ?? "",
      contact_email: profile.contact_email ?? "", contact_phone: profile.contact_phone ?? "", website: profile.website ?? "",
      languages: (profile.languages ?? []).join(", "),
      socials: JSON.stringify(profile.socials ?? {}, null, 2),
      seo_title: profile.seo_title ?? "", seo_description: profile.seo_description ?? "",
    });
  }, [profile]);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      let socials: Record<string, string> = {};
      try { socials = JSON.parse(f.socials || "{}"); } catch { toast.error("Socials must be valid JSON"); setBusy(false); return; }
      await upsertPortfolio({
        user_id: userId,
        username: f.username || null, display_name: f.display_name || null, tagline: f.tagline || null,
        bio: f.bio || null, brand_color: f.brand_color, theme: f.theme, avatar_url: f.avatar_url || null,
        cover_url: f.cover_url || null, location: f.location || null, contact_email: f.contact_email || null,
        contact_phone: f.contact_phone || null, website: f.website || null,
        languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
        socials, seo_title: f.seo_title || null, seo_description: f.seo_description || null,
      });
      toast.success("Portfolio saved");
      onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function aiFill() {
    setAiBusy(true);
    try {
      const acc = await streamSam("pf_builder", [{ role: "user", content: JSON.stringify({ role: f.tagline || "creator", years: 3, skills: [], highlights: f.bio, tone: "warm-luxury" }) }], () => {});
      const json = JSON.parse(acc.slice(acc.indexOf("{"), acc.lastIndexOf("}") + 1));
      setF((s) => ({ ...s, tagline: json.tagline ?? s.tagline, bio: json.bio ?? s.bio, brand_color: json.brand_color ?? s.brand_color, seo_title: json.seo_title ?? s.seo_title, seo_description: json.seo_description ?? s.seo_description }));
      toast.success("drafted your identity");
    } catch { toast.error("unavailable"); } finally { setAiBusy(false); }
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Personal brand</h3>
          <button onClick={aiFill} disabled={aiBusy} className="flex items-center gap-1.5 rounded-full border border-[#e8c874]/40 bg-[#e8c874]/10 px-3 py-1.5 text-[11px] font-medium text-[#e8c874] disabled:opacity-50">
            {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} fill
          </button>
        </div>
        <Field label="Username (URL)"><input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") })} placeholder="yourname" className={inp} /></Field>
        <Field label="Display name"><input value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} className={inp} /></Field>
        <Field label="Tagline"><input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} placeholder="Product designer building calm software" className={inp} /></Field>
        <Field label="Bio"><textarea value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} rows={4} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand color"><input type="color" value={f.brand_color} onChange={(e) => setF({ ...f, brand_color: e.target.value })} className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03]" /></Field>
          <Field label="Theme">
            <select value={f.theme} onChange={(e) => setF({ ...f, theme: e.target.value })} className={inp}>
              <option value="luxury">Luxury</option><option value="minimal">Minimal</option><option value="editorial">Editorial</option><option value="playful">Playful</option>
            </select>
          </Field>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Media & contact</h3>
        <Field label="Avatar URL"><input value={f.avatar_url} onChange={(e) => setF({ ...f, avatar_url: e.target.value })} className={inp} /></Field>
        <Field label="Cover URL"><input value={f.cover_url} onChange={(e) => setF({ ...f, cover_url: e.target.value })} className={inp} /></Field>
        <Field label="Location"><input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={inp} /></Field>
        <Field label="Contact email"><input value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} className={inp} /></Field>
        <Field label="Contact phone"><input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} className={inp} /></Field>
        <Field label="Website"><input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} className={inp} /></Field>
        <Field label="Languages (comma-separated)"><input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} className={inp} /></Field>
        <Field label='Socials (JSON: {"twitter":"…","linkedin":"…"})'><textarea value={f.socials} onChange={(e) => setF({ ...f, socials: e.target.value })} rows={3} className={`${inp} font-mono text-[11px]`} /></Field>
      </GlassCard>

      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold">SEO</h3>
        <Field label="SEO title (≤60)"><input value={f.seo_title} onChange={(e) => setF({ ...f, seo_title: e.target.value.slice(0, 60) })} className={inp} /></Field>
        <Field label="SEO description (≤160)"><textarea value={f.seo_description} onChange={(e) => setF({ ...f, seo_description: e.target.value.slice(0, 160) })} rows={2} className={inp} /></Field>
      </GlassCard>

      <button onClick={save} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-3 text-sm font-bold text-[#05070f] disabled:opacity-60">
        <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save identity"}
      </button>
    </div>
  );
}

/* ============================================================
   PROJECTS
   ============================================================ */
function ProjectsTab({ userId, projects, onChange }: { userId: string; projects: PortfolioProject[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Partial<PortfolioProject> | null>(null);
  return (
    <div className="space-y-3">
      <button onClick={() => setEditing({ title: "", tech_stack: [], visibility: "public" })} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] py-3 text-sm font-medium text-white/70 hover:border-white/40">
        <Plus className="h-4 w-4" /> New project
      </button>
      {projects.map((p) => (
        <GlassCard key={p.id} className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#4f7cff]/30 to-[#c9a34a]/20">
              {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className="truncate font-semibold">{p.title}</div>
                {p.visibility !== "public" && <Lock className="h-3 w-3 text-white/40" />}
              </div>
              <div className="mt-0.5 line-clamp-2 text-xs text-white/60">{p.summary}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(p.tech_stack ?? []).slice(0, 5).map((t) => (
                  <span key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/70">{t}</span>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-white/50">
                {p.live_url && <a href={p.live_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white"><ExternalLink className="h-3 w-3" /> Live</a>}
                {p.github_url && <a href={p.github_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white"><Github className="h-3 w-3" /> Code</a>}
                <span className="ml-auto flex items-center gap-1"><Eye className="h-3 w-3" />{p.views ?? 0}</span>
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setEditing(p)} className="flex-1 rounded-xl bg-white/5 py-2 text-xs font-medium hover:bg-white/10">Edit</button>
            <button onClick={async () => { if (confirm("Delete project?")) { await deleteProject(p.id); toast.success("Deleted"); onChange(); } }} className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300 hover:bg-rose-500/20"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </GlassCard>
      ))}
      {projects.length === 0 && <GlassCard className="p-6 text-center text-sm text-white/50">No projects yet — add your first showcase.</GlassCard>}

      {editing && <ProjectEditor userId={userId} initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}
    </div>
  );
}

function ProjectEditor({ userId, initial, onClose, onSaved }: { userId: string; initial: Partial<PortfolioProject>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    id: initial.id, title: initial.title ?? "", summary: initial.summary ?? "", cover_url: initial.cover_url ?? "",
    live_url: initial.live_url ?? "", github_url: initial.github_url ?? "",
    tech_stack: (initial.tech_stack ?? []).join(", "),
    role: initial.role ?? "", case_study: initial.case_study ?? "",
    started_at: initial.started_at ?? "", ended_at: initial.ended_at ?? "",
    visibility: initial.visibility ?? "public",
  });
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  async function save() {
    if (!f.title.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      await saveProject({
        id: f.id, user_id: userId, title: f.title, summary: f.summary || null, cover_url: f.cover_url || null,
        live_url: f.live_url || null, github_url: f.github_url || null, role: f.role || null,
        case_study: f.case_study || null,
        tech_stack: f.tech_stack.split(",").map((s) => s.trim()).filter(Boolean),
        started_at: f.started_at || null, ended_at: f.ended_at || null,
        visibility: f.visibility as PortfolioProject["visibility"],
      });
      toast.success("Saved"); onSaved();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function aiSummary() {
    if (!f.title) return toast.error("Add a title first");
    setAiBusy(true);
    try {
      const acc = await streamSam("pf_project_summary", [{ role: "user", content: JSON.stringify({ title: f.title, notes: f.summary || f.case_study, tech_stack: f.tech_stack.split(","), role: f.role }) }], () => {});
      const j = JSON.parse(acc.slice(acc.indexOf("{"), acc.lastIndexOf("}") + 1));
      setF((s) => ({ ...s, summary: j.summary ?? s.summary, case_study: j.case_study ?? s.case_study }));
      toast.success("wrote your project story");
    } catch { toast.error("unavailable"); } finally { setAiBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#05070f] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{f.id ? "Edit project" : "New project"}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Title"><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inp} /></Field>
          <Field label="Summary"><textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} rows={2} className={inp} /></Field>
          <button onClick={aiSummary} disabled={aiBusy} className="flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-2 text-xs">
            {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />} write summary + case study
          </button>
          <Field label="Cover image URL"><input value={f.cover_url} onChange={(e) => setF({ ...f, cover_url: e.target.value })} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Live URL"><input value={f.live_url} onChange={(e) => setF({ ...f, live_url: e.target.value })} className={inp} /></Field>
            <Field label="GitHub URL"><input value={f.github_url} onChange={(e) => setF({ ...f, github_url: e.target.value })} className={inp} /></Field>
          </div>
          <Field label="Tech stack (comma)"><input value={f.tech_stack} onChange={(e) => setF({ ...f, tech_stack: e.target.value })} placeholder="React, TypeScript, Postgres" className={inp} /></Field>
          <Field label="Your role"><input value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Started"><input type="date" value={f.started_at as string} onChange={(e) => setF({ ...f, started_at: e.target.value })} className={inp} /></Field>
            <Field label="Ended"><input type="date" value={f.ended_at as string} onChange={(e) => setF({ ...f, ended_at: e.target.value })} className={inp} /></Field>
          </div>
          <Field label="Case study (markdown)"><textarea value={f.case_study} onChange={(e) => setF({ ...f, case_study: e.target.value })} rows={6} className={`${inp} font-mono text-xs`} /></Field>
          <Field label="Visibility">
            <select value={f.visibility} onChange={(e) => setF({ ...f, visibility: e.target.value as PortfolioProject["visibility"] })} className={inp}>
              <option value="public">Public</option><option value="unlisted">Unlisted (link only)</option><option value="private">Private</option>
            </select>
          </Field>
          <button onClick={save} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-3 text-sm font-bold text-white disabled:opacity-60">
            <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save project"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SKILLS
   ============================================================ */
function SkillsTab({ userId, skills, endorsements, onChange }: { userId: string; skills: PortfolioSkill[]; endorsements: PortfolioEndorsement[]; onChange: () => void }) {
  const [name, setName] = useState(""); const [category, setCategory] = useState(""); const [level, setLevel] = useState(3);
  async function add() {
    if (!name.trim()) return;
    await saveSkill({ user_id: userId, name: name.trim(), category: category || null, level });
    setName(""); setCategory(""); onChange();
  }
  const byCat = useMemo(() => {
    const m = new Map<string, PortfolioSkill[]>();
    skills.forEach((s) => { const k = s.category || "General"; if (!m.has(k)) m.set(k, []); m.get(k)!.push(s); });
    return Array.from(m.entries());
  }, [skills]);
  const endorseCount = useMemo(() => {
    const c = new Map<string, number>();
    endorsements.filter((e) => e.kind === "skill_endorsement" && e.skill_name).forEach((e) => c.set(e.skill_name!, (c.get(e.skill_name!) ?? 0) + 1));
    return c;
  }, [endorsements]);

  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Add skill</h3>
        <div className="grid grid-cols-2 gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Skill name" className={inp} />
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (e.g. Design)" className={inp} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-white/60">Level</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setLevel(n)}><Star className={`h-4 w-4 ${n <= level ? "fill-[#e8c874] text-[#e8c874]" : "text-white/20"}`} /></button>
          ))}
          <button onClick={add} className="ml-auto rounded-full bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] px-4 py-1.5 text-xs font-semibold">Add</button>
        </div>
      </GlassCard>
      {byCat.map(([cat, list]) => (
        <GlassCard key={cat} className="p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">{cat}</h4>
          <div className="space-y-2">
            {list.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 text-sm">
                    {s.name}
                    {s.verified && <ShieldCheck className="h-3 w-3 text-[#e8c874]" />}
                    {(endorseCount.get(s.name) ?? 0) > 0 && <span className="text-[10px] text-white/50">· {endorseCount.get(s.name)} endorsements</span>}
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gradient-to-r from-[#4f7cff] to-[#e8c874]" style={{ width: `${(s.level / 5) * 100}%` }} /></div>
                </div>
                <button onClick={async () => { await deleteSkill(s.id); onChange(); }} className="text-white/40 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ============================================================
   EXPERIENCE / TIMELINE (also includes education, certs, publications)
   ============================================================ */
function ExperienceTab({ userId, experiences, education, certificates, publications, onChange }: {
  userId: string; experiences: PortfolioExperience[]; education: PortfolioEducation[]; certificates: PortfolioCertificate[]; publications: PortfolioPublication[]; onChange: () => void;
}) {
  const [sub, setSub] = useState<"exp" | "edu" | "cert" | "pub">("exp");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["exp", "edu", "cert", "pub"] as const).map((k) => (
          <button key={k} onClick={() => setSub(k)} className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${sub === k ? "bg-white/15" : "bg-white/5 text-white/60"}`}>
            {k === "exp" ? "Work" : k === "edu" ? "Education" : k === "cert" ? "Certificates" : "Publications"}
          </button>
        ))}
      </div>
      {sub === "exp" && <ExperienceList userId={userId} items={experiences} onChange={onChange} />}
      {sub === "edu" && <EducationList userId={userId} items={education} onChange={onChange} />}
      {sub === "cert" && <CertificateList userId={userId} items={certificates} onChange={onChange} />}
      {sub === "pub" && <PublicationList userId={userId} items={publications} onChange={onChange} />}
    </div>
  );
}

function ExperienceList({ userId, items, onChange }: { userId: string; items: PortfolioExperience[]; onChange: () => void }) {
  const [f, setF] = useState<{ kind: PortfolioExperience["kind"]; title: string; organization: string; started_at: string; ended_at: string; description: string }>({ kind: "work", title: "", organization: "", started_at: "", ended_at: "", description: "" });
  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PortfolioExperience["kind"] })} className={inp}>
            <option value="work">Work</option><option value="internship">Internship</option><option value="freelance">Freelance</option>
            <option value="startup">Startup</option><option value="leadership">Leadership</option><option value="volunteer">Volunteer</option><option value="milestone">Milestone</option>
          </select>
          <input placeholder="Organization" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} className={inp} />
        </div>
        <input placeholder="Title / role" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${inp} mt-2`} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input type="date" value={f.started_at} onChange={(e) => setF({ ...f, started_at: e.target.value })} className={inp} />
          <input type="date" value={f.ended_at} onChange={(e) => setF({ ...f, ended_at: e.target.value })} className={inp} />
        </div>
        <textarea rows={2} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className={`${inp} mt-2`} />
        <button onClick={async () => {
          if (!f.title.trim()) return;
          await saveExperience({ user_id: userId, kind: f.kind, title: f.title, organization: f.organization || null, started_at: f.started_at || null, ended_at: f.ended_at || null, description: f.description || null });
          setF({ kind: "work", title: "", organization: "", started_at: "", ended_at: "", description: "" });
          onChange();
        }} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-2 text-sm font-semibold">Add entry</button>
      </GlassCard>
      <div className="relative pl-4">
        <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gradient-to-b from-[#e8c874]/40 via-white/10 to-transparent" />
        {items.map((e) => (
          <div key={e.id} className="relative mb-3">
            <div className="absolute -left-3 top-3 h-2 w-2 rounded-full bg-[#e8c874]" />
            <GlassCard className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-white/40">{e.kind}</div>
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="text-xs text-white/60">{e.organization} · {formatRange(e.started_at, e.ended_at)}</div>
                  {e.description && <p className="mt-1 text-xs text-white/70">{e.description}</p>}
                </div>
                <button onClick={async () => { await deleteExperience(e.id); onChange(); }} className="text-white/40 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </GlassCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationList({ userId, items, onChange }: { userId: string; items: PortfolioEducation[]; onChange: () => void }) {
  const [f, setF] = useState({ school: "", degree: "", field: "", started_at: "", ended_at: "", grade: "" });
  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <input placeholder="School / University" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} className={inp} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input placeholder="Degree" value={f.degree} onChange={(e) => setF({ ...f, degree: e.target.value })} className={inp} />
          <input placeholder="Field" value={f.field} onChange={(e) => setF({ ...f, field: e.target.value })} className={inp} />
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <input type="date" value={f.started_at} onChange={(e) => setF({ ...f, started_at: e.target.value })} className={inp} />
          <input type="date" value={f.ended_at} onChange={(e) => setF({ ...f, ended_at: e.target.value })} className={inp} />
          <input placeholder="Grade" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value })} className={inp} />
        </div>
        <button onClick={async () => {
          if (!f.school.trim()) return;
          await saveEducation({ user_id: userId, school: f.school, degree: f.degree || null, field: f.field || null, started_at: f.started_at || null, ended_at: f.ended_at || null, grade: f.grade || null });
          setF({ school: "", degree: "", field: "", started_at: "", ended_at: "", grade: "" });
          onChange();
        }} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-2 text-sm font-semibold">Add education</button>
      </GlassCard>
      {items.map((e) => (
        <GlassCard key={e.id} className="flex items-start justify-between gap-2 p-3">
          <div>
            <div className="text-sm font-semibold">{e.school}</div>
            <div className="text-xs text-white/60">{e.degree} {e.field ? `· ${e.field}` : ""} · {formatRange(e.started_at, e.ended_at)}</div>
            {e.grade && <div className="text-xs text-white/50">Grade: {e.grade}</div>}
          </div>
          <button onClick={async () => { await deleteEducation(e.id); onChange(); }} className="text-white/40 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
        </GlassCard>
      ))}
    </div>
  );
}

function CertificateList({ userId, items, onChange }: { userId: string; items: PortfolioCertificate[]; onChange: () => void }) {
  const [f, setF] = useState<{ kind: PortfolioCertificate["kind"]; title: string; issuer: string; issued_at: string; url: string }>({ kind: "certificate", title: "", issuer: "", issued_at: "", url: "" });
  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PortfolioCertificate["kind"] })} className={inp}>
            <option value="certificate">Certificate</option><option value="award">Award</option><option value="badge">Badge</option>
          </select>
          <input placeholder="Issuer" value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} className={inp} />
        </div>
        <input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${inp} mt-2`} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input type="date" value={f.issued_at} onChange={(e) => setF({ ...f, issued_at: e.target.value })} className={inp} />
          <input placeholder="Verification URL" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className={inp} />
        </div>
        <button onClick={async () => {
          if (!f.title.trim()) return;
          await saveCertificate({ user_id: userId, kind: f.kind, title: f.title, issuer: f.issuer || null, issued_at: f.issued_at || null, url: f.url || null });
          setF({ kind: "certificate", title: "", issuer: "", issued_at: "", url: "" }); onChange();
        }} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-2 text-sm font-semibold">Add</button>
      </GlassCard>
      <div className="grid grid-cols-2 gap-2">
        {items.map((c) => (
          <GlassCard key={c.id} className="p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#e8c874]">{c.kind}</div>
            <div className="text-sm font-semibold">{c.title}</div>
            <div className="text-xs text-white/60">{c.issuer}</div>
            <div className="mt-1 flex items-center justify-between">
              {c.url ? <a href={c.url} target="_blank" rel="noreferrer" className="text-[10px] text-[#a5c1ff]">Verify</a> : <span />}
              <button onClick={async () => { await deleteCertificate(c.id); onChange(); }} className="text-white/40 hover:text-rose-300"><Trash2 className="h-3 w-3" /></button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function PublicationList({ userId, items, onChange }: { userId: string; items: PortfolioPublication[]; onChange: () => void }) {
  const [f, setF] = useState<{ kind: PortfolioPublication["kind"]; title: string; venue: string; url: string; published_at: string }>({ kind: "publication", title: "", venue: "", url: "", published_at: "" });
  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="grid grid-cols-2 gap-2">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PortfolioPublication["kind"] })} className={inp}>
            <option value="publication">Publication</option><option value="paper">Research paper</option><option value="open_source">Open source</option>
          </select>
          <input placeholder="Venue / repo" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} className={inp} />
        </div>
        <input placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${inp} mt-2`} />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input placeholder="URL" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} className={inp} />
          <input type="date" value={f.published_at} onChange={(e) => setF({ ...f, published_at: e.target.value })} className={inp} />
        </div>
        <button onClick={async () => {
          if (!f.title.trim()) return;
          await savePublication({ user_id: userId, kind: f.kind, title: f.title, venue: f.venue || null, url: f.url || null, published_at: f.published_at || null });
          setF({ kind: "publication", title: "", venue: "", url: "", published_at: "" }); onChange();
        }} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-2 text-sm font-semibold">Add</button>
      </GlassCard>
      {items.map((p) => (
        <GlassCard key={p.id} className="flex items-start justify-between p-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[#e8c874]">{p.kind.replace("_", " ")}</div>
            <div className="text-sm font-semibold">{p.title}</div>
            <div className="text-xs text-white/60">{p.venue}</div>
          </div>
          <button onClick={async () => { await deletePublication(p.id); onChange(); }} className="text-white/40 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
        </GlassCard>
      ))}
    </div>
  );
}

/* ============================================================
   RESUME
   ============================================================ */
function ResumeTab({ userId, resumes, profile, experiences, education, skills, projects, onChange }: {
  userId: string; resumes: PortfolioResume[]; profile: PortfolioProfile | null;
  experiences: PortfolioExperience[]; education: PortfolioEducation[]; skills: PortfolioSkill[]; projects: PortfolioProject[];
  onChange: () => void;
}) {
  const [active, setActive] = useState<PortfolioResume | null>(resumes[0] ?? null);
  const [label, setLabel] = useState(active?.label ?? "Master");
  const [rawText, setRawText] = useState(active?.raw_text ?? "");
  const [targetRole, setTargetRole] = useState(active?.target_role ?? "");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState<null | "build" | "ats" | "cover">(null);
  const [ats, setAts] = useState<{ score: number; feedback: string } | null>(active ? { score: active.ats_score ?? 0, feedback: active.ats_feedback ?? "" } : null);
  const [cover, setCover] = useState(active?.cover_letter ?? "");

  useEffect(() => {
    if (active) { setLabel(active.label); setRawText(active.raw_text ?? ""); setTargetRole(active.target_role ?? ""); setAts({ score: active.ats_score ?? 0, feedback: active.ats_feedback ?? "" }); setCover(active.cover_letter ?? ""); }
  }, [active]);

  async function save() {
    setBusy(true);
    try {
      const saved = await saveResume({
        id: active?.id, user_id: userId, label, raw_text: rawText, target_role: targetRole,
        ats_score: ats?.score ?? null, ats_feedback: ats?.feedback ?? null, cover_letter: cover ?? null,
      });
      toast.success("Resume saved"); onChange(); setActive(saved);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  async function aiBuild() {
    setAiBusy("build");
    try {
      let out = "";
      await streamSam("pf_resume_builder", [{ role: "user", content: JSON.stringify({ profile, experiences, education, skills, projects, target_role: targetRole }) }], (a) => { out = a; });
      const j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
      const text = [
        `# ${profile?.display_name ?? ""}`,
        profile?.tagline ?? "",
        "",
        "## Summary", j.summary,
        "",
        "## Experience", ...(j.experience ?? []).map((x: { title: string; org: string; dates: string; bullets: string[] }) => `**${x.title}** — ${x.org} · ${x.dates}\n${x.bullets.map((b: string) => `- ${b}`).join("\n")}`),
        "",
        "## Education", ...(j.education ?? []).map((x: { school: string; degree: string; dates: string }) => `**${x.school}** — ${x.degree} · ${x.dates}`),
        "",
        "## Skills", (j.skills ?? []).join(" · "),
        "",
        "## ATS keywords", (j.ats_keywords ?? []).join(", "),
      ].join("\n");
      setRawText(text);
      toast.success("built your resume");
    } catch { toast.error("unavailable"); } finally { setAiBusy(null); }
  }

  async function aiATS() {
    if (!rawText.trim()) return toast.error("Add resume text first");
    setAiBusy("ats");
    try {
      let out = "";
      await streamSam("pf_ats_check", [{ role: "user", content: JSON.stringify({ resume_text: rawText, job_description: targetRole }) }], (a) => { out = a; });
      const j = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
      const feedback = [
        `Pass probability: ${j.pass_probability}`,
        `Matched: ${(j.matched_keywords ?? []).join(", ")}`,
        `Missing: ${(j.missing_keywords ?? []).join(", ")}`,
        `Fixes:\n${(j.fixes ?? []).map((f: string) => `• ${f}`).join("\n")}`,
      ].join("\n\n");
      setAts({ score: j.score ?? 0, feedback });
      toast.success(`ATS score: ${j.score}/100`);
    } catch { toast.error("unavailable"); } finally { setAiBusy(null); }
  }

  async function aiCover() {
    setAiBusy("cover");
    try {
      let out = "";
      await streamSam("pf_cover_letter", [{ role: "user", content: JSON.stringify({ profile, job_title: targetRole, company: "", job_description: targetRole }) }], (a) => { out = a; setCover(a); });
      toast.success("Cover letter drafted");
    } catch { toast.error("unavailable"); } finally { setAiBusy(null); }
  }

  function downloadPdf() {
    if (!rawText.trim()) return toast.error("Nothing to download");
    const html = `<html><head><meta charset="utf-8"><title>${label}</title><style>body{font-family:Georgia,serif;max-width:720px;margin:40px auto;padding:0 24px;color:#111;line-height:1.5}h1,h2{margin-top:1.4em}code,pre{white-space:pre-wrap}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit">${rawText.replace(/</g, "&lt;")}</pre><script>window.onload=()=>window.print()</script></body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="flex items-center gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Version label" className={`${inp} flex-1`} />
          <button onClick={() => { setActive(null); setLabel(`Version ${resumes.length + 1}`); setRawText(""); setCover(""); setAts(null); }} className="rounded-full bg-white/10 px-3 py-2 text-xs">New</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {resumes.map((r) => (
            <button key={r.id} onClick={() => setActive(r)} className={`rounded-full px-2.5 py-1 text-[11px] ${active?.id === r.id ? "bg-[#e8c874]/20 text-[#e8c874]" : "bg-white/5 text-white/60"}`}>
              {r.label}{r.ats_score ? ` · ${r.ats_score}` : ""}
            </button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <Field label="Target role / job description"><textarea rows={2} value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="Paste job description or role title" className={inp} /></Field>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={aiBuild} disabled={aiBusy !== null} className="flex items-center justify-center gap-1.5 rounded-full border border-[#e8c874]/40 bg-[#e8c874]/10 py-2 text-xs font-medium text-[#e8c874] disabled:opacity-50">
            {aiBusy === "build" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} build
          </button>
          <button onClick={aiATS} disabled={aiBusy !== null} className="flex items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/5 py-2 text-xs font-medium disabled:opacity-50">
            {aiBusy === "ats" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />} ATS check
          </button>
        </div>
      </GlassCard>

      <GlassCard className="p-4">
        <Field label="Resume (markdown / plain text)"><textarea rows={12} value={rawText} onChange={(e) => setRawText(e.target.value)} className={`${inp} font-mono text-xs`} /></Field>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button onClick={save} disabled={busy} className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-2 text-xs font-semibold disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Save</button>
          <button onClick={downloadPdf} className="flex items-center justify-center gap-1.5 rounded-full bg-white/10 py-2 text-xs font-semibold"><Download className="h-3.5 w-3.5" /> PDF</button>
          <button onClick={aiCover} disabled={aiBusy !== null} className="flex items-center justify-center gap-1.5 rounded-full bg-white/10 py-2 text-xs font-semibold">
            {aiBusy === "cover" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} Cover
          </button>
        </div>
      </GlassCard>

      {ats && ats.score > 0 && (
        <GlassCard className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">ATS score</h4>
            <span className="text-xl font-bold text-[#e8c874]">{ats.score}/100</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full bg-gradient-to-r from-rose-400 via-[#e8c874] to-emerald-400" style={{ width: `${ats.score}%` }} /></div>
          <pre className="mt-3 whitespace-pre-wrap text-xs text-white/70">{ats.feedback}</pre>
        </GlassCard>
      )}

      {cover && (
        <GlassCard className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Cover letter</h4>
            <button onClick={() => { navigator.clipboard.writeText(cover); toast.success("Copied"); }} className="text-white/60 hover:text-white"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-white/80">{cover}</pre>
        </GlassCard>
      )}

      {active && (
        <button onClick={async () => { if (confirm("Delete this version?") && active) { await deleteResume(active.id); onChange(); setActive(null); } }} className="w-full rounded-2xl border border-rose-500/30 bg-rose-500/10 py-2 text-xs font-medium text-rose-300">Delete version</button>
      )}
    </div>
  );
}

/* ============================================================
 TOOLS
   ============================================================ */
type AiToolKey = "pf_reviewer" | "pf_content_writer" | "pf_grammar" | "pf_seo" | "pf_recruiter_match" | "pf_career_reco" | "pf_interview_ready" | "pf_skill_gap" | "pf_design_tips" | "pf_assistant";
const AI_TOOLS: { k: AiToolKey; l: string; d: string; I: typeof Bot }[] = [
  { k: "pf_reviewer", l: "Portfolio Reviewer", d: "Elite audit of design + content + hireability", I: ScanSearch },
  { k: "pf_content_writer", l: "Content Writer", d: "Rewrite any section in your tone", I: Wand2 },
  { k: "pf_grammar", l: "Grammar & Style", d: "Fix typos, tighten prose", I: Check },
  { k: "pf_seo", l: "SEO Optimizer", d: "Titles, keywords, JSON-LD", I: Globe },
  { k: "pf_recruiter_match", l: "Recruiter Match", d: "Score fit against a JD", I: Zap },
  { k: "pf_career_reco", l: "Career Recommender", d: "Top roles that fit your portfolio", I: TrendingUp },
  { k: "pf_interview_ready", l: "Interview Readiness", d: "Mock questions + prep plan", I: ShieldCheck },
  { k: "pf_skill_gap", l: "Skill Gap Analysis", d: "Have · Learn · Nice-to-have", I: Award },
  { k: "pf_design_tips", l: "Design Advisor", d: "Palette, typography, hero", I: Palette },
  { k: "pf_assistant", l: "Portfolio Assistant 24/7", d: "Ask anything about your portfolio", I: Bot },
];

function AITab({ profile, projects, skills, experiences, education, certificates }: {
  profile: PortfolioProfile | null; projects: PortfolioProject[]; skills: PortfolioSkill[];
  experiences: PortfolioExperience[]; education: PortfolioEducation[]; certificates: PortfolioCertificate[];
}) {
  const [tool, setTool] = useState<AiToolKey>("pf_reviewer");
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const context = useMemo(() => JSON.stringify({
    profile: { tagline: profile?.tagline, bio: profile?.bio, brand_color: profile?.brand_color },
    projects: projects.map((p) => ({ title: p.title, summary: p.summary, tech: p.tech_stack, live: !!p.live_url })),
    skills: skills.map((s) => ({ name: s.name, level: s.level })),
    experiences: experiences.map((e) => ({ kind: e.kind, title: e.title, org: e.organization })),
    education: education.map((e) => ({ school: e.school, degree: e.degree })),
    certificates: certificates.map((c) => ({ title: c.title, issuer: c.issuer })),
  }), [profile, projects, skills, experiences, education, certificates]);

  async function run() {
    setOut(""); setBusy(true);
    abortRef.current?.abort(); abortRef.current = new AbortController();
    try {
      const payload = tool === "pf_assistant" ? input : JSON.stringify({ portfolio: JSON.parse(context), user_input: input, job_description: input, target_role: input, current_text: input, section: "about", tone: "warm-luxury", current_skills: skills.map((s) => s.name) });
      await streamSam(tool, [{ role: "user", content: payload }], (a) => setOut(a), abortRef.current.signal);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {AI_TOOLS.map((t) => (
          <button key={t.k} onClick={() => { setTool(t.k); setOut(""); setInput(""); }} className={`rounded-2xl border p-3 text-left transition ${tool === t.k ? "border-[#e8c874]/50 bg-gradient-to-br from-[#e8c874]/15 to-transparent" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}>
            <t.I className="mb-1 h-4 w-4 text-[#e8c874]" />
            <div className="text-xs font-semibold">{t.l}</div>
            <div className="text-[10px] text-white/50">{t.d}</div>
          </button>
        ))}
      </div>

      <GlassCard className="p-4">
        <Field label={tool === "pf_assistant" ? "Ask anything" : "Extra input (job description, section text, etc.)"}>
          <textarea rows={3} value={input} onChange={(e) => setInput(e.target.value)} placeholder={tool === "pf_recruiter_match" ? "Paste a job description…" : tool === "pf_content_writer" ? "Paste text to rewrite…" : "Optional"} className={inp} />
        </Field>
        <button onClick={run} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-3 text-sm font-bold text-[#05070f] disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {busy ? "Sam is thinking…" : "Run"}
        </button>
      </GlassCard>

      {out && (
        <GlassCard className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">Result</h4>
            <button onClick={() => { navigator.clipboard.writeText(out); toast.success("Copied"); }} className="text-white/60"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <pre className="whitespace-pre-wrap text-xs leading-relaxed text-white/85">{out}</pre>
        </GlassCard>
      )}
    </div>
  );
}

/* ============================================================
   ANALYTICS
   ============================================================ */
function AnalyticsTab({ views, projects }: { views: PortfolioView[]; projects: PortfolioProject[] }) {
  const byKind = useMemo(() => {
    const m = new Map<string, number>();
    views.forEach((v) => m.set(v.kind, (m.get(v.kind) ?? 0) + 1));
    return m;
  }, [views]);
  const byDay = useMemo(() => {
    const days: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      days.push({ day: key.slice(5), count: views.filter((v) => v.created_at.slice(0, 10) === key).length });
    }
    return days;
  }, [views]);
  const max = Math.max(1, ...byDay.map((d) => d.count));
  const topProjects = [...projects].sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, 5);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Portfolio views" value={String(byKind.get("portfolio") ?? 0)} accent />
        <Stat label="Project views" value={String(byKind.get("project") ?? 0)} />
        <Stat label="Downloads" value={String(byKind.get("download") ?? 0)} />
      </div>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Last 30 days</h4>
        <div className="flex h-24 items-end gap-0.5">
          {byDay.map((d) => (
            <div key={d.day} className="group relative flex-1">
              <div className="w-full rounded-t bg-gradient-to-t from-[#4f7cff] to-[#e8c874]" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-black/70 px-1 py-0.5 text-[9px] group-hover:block">{d.day} · {d.count}</span>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Top projects</h4>
        {topProjects.length === 0 && <div className="text-xs text-white/50">No project views yet.</div>}
        {topProjects.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-1.5 text-xs">
            <span className="truncate">{p.title}</span>
            <span className="text-white/50">{p.views ?? 0} views</span>
          </div>
        ))}
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">Recent visitors</h4>
        {views.slice(0, 10).map((v) => (
          <div key={v.id} className="flex items-center justify-between border-b border-white/5 py-1.5 text-[11px] last:border-0">
            <span className="text-white/70">{v.kind}</span>
            <span className="text-white/40">{new Date(v.created_at).toLocaleString()}</span>
          </div>
        ))}
        {views.length === 0 && <div className="text-xs text-white/50">No visits yet.</div>}
      </GlassCard>
    </div>
  );
}

/* ============================================================
   SOCIAL / NETWORKING
   ============================================================ */
function SocialTab({ endorsements, userId }: { endorsements: PortfolioEndorsement[]; userId: string }) {
  const [msg, setMsg] = useState("");
  async function selfNote() {
    if (!msg.trim()) return;
    try {
      await addEndorsement({ target_user_id: userId, endorser_id: userId, kind: "recommendation", message: msg });
      toast.success("Saved to portfolio"); setMsg("");
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <h4 className="mb-2 text-sm font-semibold">Recommendations</h4>
        {endorsements.filter((e) => e.kind === "recommendation").map((e) => (
          <div key={e.id} className="border-b border-white/5 py-2 last:border-0 text-xs text-white/80">
            <p>"{e.message}"</p>
            <div className="mt-1 text-[10px] text-white/40">{new Date(e.created_at).toLocaleDateString()}</div>
          </div>
        ))}
        {endorsements.filter((e) => e.kind === "recommendation").length === 0 && <div className="text-xs text-white/50">No recommendations yet.</div>}
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-sm font-semibold">Add a note / testimonial</h4>
        <textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Paste a client note or highlight to feature" className={inp} />
        <button onClick={selfNote} className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-2 text-sm font-semibold">Save note</button>
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-sm font-semibold">Networking</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <Link to="/career/feed" className="rounded-xl bg-white/5 p-3 hover:bg-white/10"><Users className="mb-1 h-4 w-4 text-[#e8c874]" /> Professional feed</Link>
          <Link to="/career/business" className="rounded-xl bg-white/5 p-3 hover:bg-white/10"><Briefcase className="mb-1 h-4 w-4 text-[#e8c874]" /> Collaborate</Link>
          <Link to="/career/jobs" className="rounded-xl bg-white/5 p-3 hover:bg-white/10"><Zap className="mb-1 h-4 w-4 text-[#e8c874]" /> Reach recruiters</Link>
          <Link to="/messages" className="rounded-xl bg-white/5 p-3 hover:bg-white/10"><FileText className="mb-1 h-4 w-4 text-[#e8c874]" /> Mentorship DMs</Link>
        </div>
      </GlassCard>
    </div>
  );
}

/* ============================================================
   PRIVACY
   ============================================================ */
function PrivacyTab({ userId, settings, onSaved }: { userId: string; settings: PortfolioSettings | null; onSaved: () => void }) {
  const [s, setS] = useState({
    is_public: settings?.is_public ?? true,
    watermark: settings?.watermark ?? false,
    allow_downloads: settings?.allow_downloads ?? true,
    allow_contact: settings?.allow_contact ?? true,
    show_analytics_publicly: settings?.show_analytics_publicly ?? false,
    activity_log_enabled: settings?.activity_log_enabled ?? true,
    two_factor_enabled: settings?.two_factor_enabled ?? false,
    allowed_countries: (settings?.allowed_countries ?? []).join(", "),
  });
  useEffect(() => {
    if (settings) setS({
      is_public: settings.is_public ?? true, watermark: settings.watermark ?? false,
      allow_downloads: settings.allow_downloads ?? true, allow_contact: settings.allow_contact ?? true,
      show_analytics_publicly: settings.show_analytics_publicly ?? false,
      activity_log_enabled: settings.activity_log_enabled ?? true,
      two_factor_enabled: settings.two_factor_enabled ?? false,
      allowed_countries: (settings.allowed_countries ?? []).join(", "),
    });
  }, [settings]);

  async function save() {
    try {
      await upsertSettings({
        user_id: userId, is_public: s.is_public, watermark: s.watermark, allow_downloads: s.allow_downloads,
        allow_contact: s.allow_contact, show_analytics_publicly: s.show_analytics_publicly,
        activity_log_enabled: s.activity_log_enabled, two_factor_enabled: s.two_factor_enabled,
        allowed_countries: s.allowed_countries.split(",").map((c) => c.trim()).filter(Boolean),
      });
      toast.success("Privacy updated"); onSaved();
    } catch (e) { toast.error((e as Error).message); }
  }

  async function exportData() {
    const [profile, projects, skills, exp, edu, certs, resumes] = await Promise.all([
      supabase.from("portfolio_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("portfolio_projects").select("*").eq("user_id", userId),
      supabase.from("portfolio_skills").select("*").eq("user_id", userId),
      supabase.from("portfolio_experiences").select("*").eq("user_id", userId),
      supabase.from("portfolio_education").select("*").eq("user_id", userId),
      supabase.from("portfolio_certificates").select("*").eq("user_id", userId),
      supabase.from("portfolio_resumes").select("*").eq("user_id", userId),
    ]);
    const blob = new Blob([JSON.stringify({ profile: profile.data, projects: projects.data, skills: skills.data, experiences: exp.data, education: edu.data, certificates: certs.data, resumes: resumes.data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "portfolio-export.json"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <Toggle label="Public portfolio" hint="Discoverable via search + share links" value={s.is_public} onChange={(v) => setS({ ...s, is_public: v })} />
        <Toggle label="Watermark projects" hint="Adds subtle SAMSTA mark on media" value={s.watermark} onChange={(v) => setS({ ...s, watermark: v })} />
        <Toggle label="Allow resume downloads" value={s.allow_downloads} onChange={(v) => setS({ ...s, allow_downloads: v })} />
        <Toggle label="Allow contact" hint="Recruiters can reach you" value={s.allow_contact} onChange={(v) => setS({ ...s, allow_contact: v })} />
        <Toggle label="Show analytics publicly" hint="View counters visible to visitors" value={s.show_analytics_publicly} onChange={(v) => setS({ ...s, show_analytics_publicly: v })} />
        <Toggle label="Activity log" hint="Record login + edit history" value={s.activity_log_enabled} onChange={(v) => setS({ ...s, activity_log_enabled: v })} />
        <Toggle label="Two-factor authentication" hint="Manage in Auth settings" value={s.two_factor_enabled} onChange={(v) => setS({ ...s, two_factor_enabled: v })} />
        <Field label="Allowed countries (comma, blank = all)"><input value={s.allowed_countries} onChange={(e) => setS({ ...s, allowed_countries: e.target.value })} className={inp} /></Field>
        <button onClick={save} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-2 text-sm font-semibold">Save privacy settings</button>
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-sm font-semibold">Data & backup</h4>
        <button onClick={exportData} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-2 text-sm font-medium"><Download className="h-4 w-4" /> Export all portfolio data (JSON)</button>
        <p className="mt-2 text-[11px] text-white/50">Your data is stored in end-to-end secure Lovable Cloud storage with row-level security scoped to your account.</p>
      </GlassCard>
    </div>
  );
}

/* ============================================================
   SHARE / QR / DIGITAL CARD
   ============================================================ */
function ShareTab({ profile }: { profile: PortfolioProfile | null }) {
  const url = useMemo(() => {
    if (typeof window === "undefined") return "";
    return profile?.username ? `${window.location.origin}/twin/${profile.username}` : window.location.origin;
  }, [profile]);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&color=e8c874&bgcolor=05070f`;
  return (
    <div className="space-y-3">
      <GlassCard className="p-4 text-center">
        <h4 className="text-sm font-semibold">Your portfolio link</h4>
        <div className="mt-2 truncate rounded-xl bg-white/5 px-3 py-2 text-xs text-[#e8c874]">{url}</div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }} className="flex-1 rounded-full bg-white/10 py-2 text-xs font-medium"><Copy className="mr-1 inline h-3.5 w-3.5" /> Copy</button>
          <button onClick={() => { if (navigator.share) navigator.share({ url }); else navigator.clipboard.writeText(url); }} className="flex-1 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-2 text-xs font-semibold text-[#05070f]">Share</button>
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-sm font-semibold">QR code</h4>
        <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <img src={qrSrc} alt="Scannable QR code linking to this Samsta portfolio" className="h-full w-full" />
        </div>
        <a href={qrSrc} download="portfolio-qr.png" className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-2 text-xs font-medium"><Download className="h-3.5 w-3.5" /> Download QR</a>
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-sm font-semibold">Digital business card</h4>
        <div className="rounded-2xl border border-[#e8c874]/30 bg-gradient-to-br from-[#05070f] via-[#0e1428] to-[#1e1810] p-5">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#e8c874]/70">Samsta · Portfolio</div>
          <div className="mt-1 font-display text-xl italic">{profile?.display_name || "Your name"}</div>
          <div className="text-xs text-white/60">{profile?.tagline}</div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/60">
            {profile?.contact_email && <span className="rounded-full bg-white/5 px-2 py-0.5">{profile.contact_email}</span>}
            {profile?.contact_phone && <span className="rounded-full bg-white/5 px-2 py-0.5">{profile.contact_phone}</span>}
            {profile?.website && <span className="rounded-full bg-white/5 px-2 py-0.5">{profile.website}</span>}
          </div>
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <h4 className="mb-2 text-sm font-semibold flex items-center gap-1.5"><Languages className="h-4 w-4" /> Multi-language</h4>
        <p className="text-xs text-white/60">Your bio & project text can be translated on-demand from any language via the Content Writer tool.</p>
      </GlassCard>
    </div>
  );
}

/* ============================================================
   SHARED PRIMITIVES
   ============================================================ */
const inp = "w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30 focus:border-[#e8c874]/40";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/50">{label}</span>
      {children}
    </label>
  );
}
function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/5 py-2.5 last:border-0">
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[10px] text-white/50">{hint}</div>}
      </div>
      <button onClick={() => onChange(!value)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-gradient-to-r from-[#e8c874] to-[#c9a34a]" : "bg-white/15"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
function formatRange(a: string | null, b: string | null) {
  const s = a ? new Date(a).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";
  const e = b ? new Date(b).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "Present";
  return `${s} – ${e}`;
}

// Suppress unused import warning if any
void recordView;