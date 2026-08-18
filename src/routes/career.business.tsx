// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CareerShell, GlassCard, VerifiedBadge } from "@/components/samsta/CareerShell";
import { listOpportunities } from "@/lib/api/career";
import { Building2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/career/business")({ component: BizPage });

type Row = Awaited<ReturnType<typeof listOpportunities>>[number];

function BizPage() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    listOpportunities().then((r) => setRows(r as Row[]));
    const ch = supabase.channel("opps-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "business_opportunities" }, () => listOpportunities().then((r) => setRows(r as Row[])))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  return (
    <CareerShell title="Business" subtitle="Partnerships, franchise, investment, B2B.">
      <Link to="/career/business/new" className="mb-4 block rounded-2xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] py-3 text-center text-sm font-bold text-[#05070f] transition active:scale-[0.98]">
        <TrendingUp className="mr-1 inline h-4 w-4" /> Post an opportunity
      </Link>
      {rows.length === 0 ? (
        <GlassCard className="p-6 text-center text-sm text-white/50">No opportunities yet.</GlassCard>
      ) : (
        <div className="space-y-3">
          {rows.map((o, i) => {
            const co = (o as unknown as { companies: { name: string; logo_url: string | null; verification: string } | null }).companies;
            return (
              <Link key={o.id} to="/career/business/$oppId" params={{ oppId: o.id }} className="block animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                <GlassCard className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[#e8c874]">
                      {co?.logo_url ? <img src={co.logo_url} className="h-full w-full rounded-xl object-cover" alt="" /> : <Building2 className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><div className="truncate text-sm font-semibold">{o.title}</div><VerifiedBadge verified={o.is_verified || co?.verification === "verified"} /></div>
                      <div className="mt-0.5 text-xs text-white/60">{co?.name ?? "Independent"}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-white/50">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">{o.kind}</span>
                        {o.location && <span>{o.location}</span>}
                        {(o.budget_min || o.budget_max) && <span className="text-[#e8c874]">{o.currency} {o.budget_min ?? "?"}–{o.budget_max ?? "?"}</span>}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}
    </CareerShell>
  );
}