import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard } from "@/components/samsta/CareerShell";
import { computeStrength, getMyProfProfile, upsertProfProfile, uploadResume, type ProfessionalProfile } from "@/lib/api/career";
import { Save, Upload, Sparkles } from "lucide-react";

export const Route = createFileRoute("/career/profile")({ component: ProfilePage });

function ProfilePage() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [p, setP] = useState<ProfessionalProfile | null>(null);
  const [f, setF] = useState({ headline: "", summary: "", skills: "", location: "", contact_email: "", contact_phone: "", availability: "", website: "", languages: "" });
  const [busy, setBusy] = useState(false);
  const [resume, setResume] = useState<File | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => {
    if (!user) return;
    getMyProfProfile(user.id).then((r) => {
      setP(r);
      if (r) setF({
        headline: r.headline ?? "", summary: r.summary ?? "", skills: (r.skills ?? []).join(", "),
        location: r.location ?? "", contact_email: r.contact_email ?? "", contact_phone: r.contact_phone ?? "",
        availability: r.availability ?? "", website: r.website ?? "", languages: (r.languages ?? []).join(", "),
      });
    });
  }, [user]);

  async function save() {
    if (!user) return;
    setBusy(true);
    try {
      let resume_url = p?.resume_url ?? null;
      if (resume) resume_url = await uploadResume(user.id, resume);
      const patch = {
        user_id: user.id,
        headline: f.headline || null, summary: f.summary || null,
        skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
        languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
        location: f.location || null, contact_email: f.contact_email || null,
        contact_phone: f.contact_phone || null, availability: f.availability || null,
        website: f.website || null, resume_url,
      };
      const merged: ProfessionalProfile = { ...(p ?? ({} as ProfessionalProfile)), ...patch } as ProfessionalProfile;
      merged.strength_score = computeStrength(merged);
      const saved = await upsertProfProfile({ ...patch, strength_score: merged.strength_score });
      setP(saved);
    } finally { setBusy(false); }
  }

  const strength = computeStrength({ ...(p ?? ({} as ProfessionalProfile)),
    headline: f.headline, summary: f.summary,
    skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
    languages: f.languages.split(",").map((s) => s.trim()).filter(Boolean),
    location: f.location, contact_email: f.contact_email, resume_url: resume ? "pending" : p?.resume_url ?? null,
  } as ProfessionalProfile);

  const cls = "w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30";
  return (
    <CareerShell title="Professional profile" subtitle="Separate from your social profile.">
      <GlassCard className="mb-4 p-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-white/50 flex items-center gap-1"><Sparkles className="h-3.5 w-3.5 text-[#e8c874]" /> Profile strength</span>
          <span className="font-semibold text-[#e8c874]">{strength}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] transition-all" style={{ width: `${strength}%` }} />
        </div>
      </GlassCard>
      <GlassCard className="space-y-3 p-4">
        <input value={f.headline} onChange={(e) => setF({ ...f, headline: e.target.value })} placeholder="Headline (e.g. Senior Product Designer)" className={cls} />
        <textarea value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} rows={4} placeholder="Summary" className={cls} />
        <input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="Skills (comma-separated)" className={cls} />
        <input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} placeholder="Languages (comma-separated)" className={cls} />
        <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Location" className={cls} />
        <input value={f.contact_email} onChange={(e) => setF({ ...f, contact_email: e.target.value })} placeholder="Contact email (revealed only after accept)" className={cls} />
        <input value={f.contact_phone} onChange={(e) => setF({ ...f, contact_phone: e.target.value })} placeholder="Contact phone" className={cls} />
        <input value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })} placeholder="Availability (e.g. 2 weeks notice)" className={cls} />
        <input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="Website / portfolio URL" className={cls} />
        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-3 text-xs text-white/70">
          <Upload className="h-4 w-4" />
          <span className="flex-1">{resume ? resume.name : p?.resume_url ? "Resume uploaded — replace" : "Upload resume"}</span>
          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => setResume(e.target.files?.[0] ?? null)} />
        </label>
        <button onClick={save} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60">
          <Save className="h-4 w-4" /> {busy ? "Saving…" : "Save profile"}
        </button>
      </GlassCard>
    </CareerShell>
  );
}