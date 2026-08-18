import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard } from "@/components/samsta/CareerShell";
import { createOpportunity } from "@/lib/api/career";
import { TrendingUp } from "lucide-react";
import { usePublishAccess, PublishUnlockCard } from "@/components/samsta/PublishUnlockGate";

export const Route = createFileRoute("/career/business/new")({ component: NewOpp });

type Kind = string;
const KINDS: Kind[] = ["partnership","franchise","startup","investment","service","vendor","b2b"];

function NewOpp() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [f, setF] = useState({ title: "", description: "", kind: "partnership" as Kind, location: "", budget_min: "", budget_max: "", currency: "USD" });
  const { unlocked, loading: accessLoading, paying, purchase } = usePublishAccess();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  async function submit() {
    if (!user) return;
    if (!f.title.trim() || !f.description.trim()) { setErr("Title and description are required."); return; }
    setBusy(true); setErr("");
    try {
      const o = await createOpportunity({
        poster_id: user.id,
        title: f.title.trim(),
        description: f.description.trim(),
        kind: f.kind,
        location: f.location || null,
        budget_min: f.budget_min ? Number(f.budget_min) : null,
        budget_max: f.budget_max ? Number(f.budget_max) : null,
        currency: f.currency,
        status: "active",
      });
      navigate({ to: "/career/business/$oppId", params: { oppId: o.id } });
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  const cls = "w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30";
  if (!accessLoading && user && !unlocked) {
    return (
      <CareerShell title="Post opportunity" subtitle="One-time publisher fee.">
        <PublishUnlockCard paying={paying} onPay={purchase} title="Unlock opportunity publishing"
          note="Pay once to publish unlimited business opportunities officially on Samsta." />
      </CareerShell>
    );
  }

  return (
    <CareerShell title="Post opportunity" subtitle="Reach verified partners instantly.">
      <GlassCard className="space-y-3 p-4">
        <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Title" className={cls} />
        <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={5} placeholder="Describe the opportunity…" className={cls} />
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Kind })} className={cls}>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Location" className={cls} />
        <div className="grid grid-cols-3 gap-3">
          <input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} placeholder="USD" className={cls} />
          <input value={f.budget_min} onChange={(e) => setF({ ...f, budget_min: e.target.value })} placeholder="Min budget" className={cls} />
          <input value={f.budget_max} onChange={(e) => setF({ ...f, budget_max: e.target.value })} placeholder="Max budget" className={cls} />
        </div>
        {err && <div className="text-xs text-rose-300">{err}</div>}
        <button onClick={submit} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-3 text-sm font-bold text-[#05070f] transition active:scale-[0.98] disabled:opacity-60">
          <TrendingUp className="h-4 w-4" /> {busy ? "Publishing…" : "Publish"}
        </button>
      </GlassCard>
    </CareerShell>
  );
}