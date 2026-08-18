// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard, VerifiedBadge, StatusPill } from "@/components/samsta/CareerShell";
import { getOpportunity, submitProposal } from "@/lib/api/career";
import { supabase } from "@/integrations/supabase/client";
import { Send, Building2 } from "lucide-react";

export const Route = createFileRoute("/career/business/$oppId")({ component: OppDetail });

function OppDetail() {
  const { oppId } = Route.useParams();
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [opp, setOpp] = useState<Awaited<ReturnType<typeof getOpportunity>>>(null);
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [my, setMy] = useState<{ id: string; status: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { getOpportunity(oppId).then(setOpp); }, [oppId]);
  useEffect(() => {
    if (!user) return;
    supabase.from("business_proposals").select("id, status").eq("opportunity_id", oppId).eq("proposer_id", user.id).maybeSingle().then(({ data }) => setMy(data));
  }, [oppId, user]);

  async function send() {
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!message.trim()) { setErr("Write a short pitch."); return; }
    setErr(""); setBusy(true);
    try {
      const p = await submitProposal({ opportunity_id: oppId, proposer_id: user.id, message: message.trim(), proposed_amount: amount ? Number(amount) : null });
      setMy({ id: p.id, status: p.status });
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  if (!opp) return <CareerShell title="Loading…"><GlassCard className="h-40 animate-pulse" /></CareerShell>;
  const co = (opp as unknown as { companies: { name: string; logo_url: string | null; verification: string } | null }).companies;

  return (
    <CareerShell title={opp.title} subtitle={co?.name ?? "Independent"}>
      <GlassCard className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#e8c874]">
            {co?.logo_url ? <img src={co.logo_url} className="h-full w-full rounded-xl object-cover" alt="" /> : <Building2 className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-semibold">{co?.name ?? "Independent"} <VerifiedBadge verified={opp.is_verified || co?.verification === "verified"} /></div>
            <div className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-white/50">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">{opp.kind}</span>
              {opp.location && <span>{opp.location}</span>}
            </div>
          </div>
        </div>
      </GlassCard>
      <GlassCard className="mt-3 whitespace-pre-wrap p-4 text-sm text-white/80">{opp.description}</GlassCard>
      {(opp.budget_min || opp.budget_max) && (
        <GlassCard className="mt-3 p-3 text-sm"><span className="text-white/60">Budget · </span><span className="text-[#e8c874]">{opp.currency} {opp.budget_min ?? "?"}–{opp.budget_max ?? "?"}</span></GlassCard>
      )}
      <div className="mt-6">
        {my ? (
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 text-sm"><span className="font-semibold">Proposal status</span><StatusPill status={my.status} /></div>
            {my.status !== "accepted" && <p className="mt-2 text-xs text-white/50">Contact details unlock automatically when the poster accepts.</p>}
          </GlassCard>
        ) : (
          <GlassCard className="space-y-3 p-4">
            <div className="text-sm font-semibold">Send a proposal</div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Your pitch, relevant experience, timeline…" className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm outline-none placeholder:text-white/30" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Proposed amount (optional)" className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-sm outline-none placeholder:text-white/30" />
            {err && <div className="text-xs text-rose-300">{err}</div>}
            <button onClick={send} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-3 text-sm font-bold text-[#05070f] transition active:scale-[0.98] disabled:opacity-60">
              <Send className="h-4 w-4" /> {busy ? "Sending…" : user ? "Send proposal" : "Sign in to propose"}
            </button>
          </GlassCard>
        )}
      </div>
    </CareerShell>
  );
}