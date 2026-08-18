import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard } from "@/components/samsta/CareerShell";
import { createJob, listMyCompanies, type Company } from "@/lib/api/career";
import { Rocket } from "lucide-react";
import { usePublishAccess, PublishUnlockCard } from "@/components/samsta/PublishUnlockGate";

export const Route = createFileRoute("/career/jobs/new")({
  component: NewJobPage,
});

type Kind = string;
type WorkType = string;

function NewJobPage() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    kind: "fulltime" as Kind,
    work_type: "onsite" as WorkType,
    location: "",
    salary_min: "",
    salary_max: "",
    salary_currency: "USD",
    salary_period: "year",
    skills: "",
    responsibilities: "",
    benefits: "",
    openings: "1",
    deadline: "",
    company_id: "",
    apply_url: "",
  });
  const { unlocked, loading: accessLoading, paying, purchase } = usePublishAccess();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) listMyCompanies(user.id).then(setCompanies);
  }, [user]);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [user, loading, navigate]);

  async function onSubmit() {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) { setError("Title and description are required."); return; }
    const applyUrl = form.apply_url.trim();
    if (applyUrl && !/^https?:\/\//i.test(applyUrl)) { setError("Apply link must start with http:// or https://"); return; }
    setError(""); setSaving(true);
    try {
      const job = await createJob({
        poster_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        kind: form.kind,
        work_type: form.work_type,
        location: form.location || null,
        company_id: form.company_id || null,
        salary_min: form.salary_min ? Number(form.salary_min) : null,
        salary_max: form.salary_max ? Number(form.salary_max) : null,
        salary_currency: form.salary_currency,
        salary_period: form.salary_period,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        responsibilities: form.responsibilities.split("\n").map((s) => s.trim()).filter(Boolean),
        benefits: form.benefits.split(",").map((s) => s.trim()).filter(Boolean),
        openings: form.openings ? Number(form.openings) : 1,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        apply_url: applyUrl || null,
        apply_mode: applyUrl ? "external" : "internal",
        status: "active",
      });
      navigate({ to: "/career/jobs/$jobId", params: { jobId: job.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create job");
    } finally {
      setSaving(false);
    }
  }

  if (!accessLoading && user && !unlocked) {
    return (
      <CareerShell title="Post a Job" subtitle="One-time publisher fee.">
        <PublishUnlockCard paying={paying} onPay={purchase} title="Unlock role publishing"
          note="Pay once to publish unlimited job roles officially on Samsta." />
      </CareerShell>
    );
  }

  return (
    <CareerShell title="Post a Job" subtitle="Your posting goes live instantly.">
      <GlassCard className="space-y-3 p-4">
        <Field label="Title"><Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Senior Frontend Engineer" /></Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} className={inputCls} placeholder="What the role does, mission, impact…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <Select value={form.kind} onChange={(v) => setForm({ ...form, kind: v as Kind })} options={["fulltime","parttime","internship","freelance","remote","contract","startup"]} />
          </Field>
          <Field label="Work type">
            <Select value={form.work_type} onChange={(v) => setForm({ ...form, work_type: v as WorkType })} options={["onsite","remote","hybrid"]} />
          </Field>
        </div>
        <Field label="Location"><Input value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="Bangalore, IN" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Currency"><Input value={form.salary_currency} onChange={(v) => setForm({ ...form, salary_currency: v })} /></Field>
          <Field label="Min salary"><Input value={form.salary_min} onChange={(v) => setForm({ ...form, salary_min: v })} placeholder="60000" /></Field>
          <Field label="Max salary"><Input value={form.salary_max} onChange={(v) => setForm({ ...form, salary_max: v })} placeholder="90000" /></Field>
        </div>
        <Field label="Skills (comma-separated)"><Input value={form.skills} onChange={(v) => setForm({ ...form, skills: v })} placeholder="React, TypeScript, Design systems" /></Field>
        <Field label="Responsibilities (one per line)">
          <textarea value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} rows={4} className={inputCls} />
        </Field>
        <Field label="Benefits (comma-separated)"><Input value={form.benefits} onChange={(v) => setForm({ ...form, benefits: v })} placeholder="Health, Equity, Remote" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Openings"><Input value={form.openings} onChange={(v) => setForm({ ...form, openings: v })} /></Field>
          <Field label="Deadline"><input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={inputCls} /></Field>
        </div>
        {companies.length > 0 && (
          <Field label="Company (optional)">
            <select value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })} className={inputCls}>
              <option value="">Independent</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Official apply link (optional)">
          <Input value={form.apply_url} onChange={(v) => setForm({ ...form, apply_url: v })} placeholder="https://yourcompany.com/careers/apply" />
        </Field>
        <p className="-mt-1 text-[10px] text-white/40">
          Add a link and applicants are sent straight to your own website to apply. Leave it empty to collect resumes and cover
          letters inside Samsta.
        </p>
        {error && <div className="text-xs text-rose-300">{error}</div>}
        <button onClick={onSubmit} disabled={saving} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60">
          <Rocket className="h-4 w-4" /> {saving ? "Publishing…" : "Publish job"}
        </button>
      </GlassCard>
    </CareerShell>
  );
}

const inputCls = "w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">{label}</div>{children}</label>;
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}