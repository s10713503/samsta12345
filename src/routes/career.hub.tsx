// @ts-nocheck
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/use-auth";
import { CareerShell, GlassCard } from "@/components/samsta/CareerShell";
import { Briefcase, Building2, FileText, Sparkles, TrendingUp, Users, LayoutDashboard, User, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/career/hub")({
  head: () => ({
    meta: [
      { title: "Career Hub · Samsta" },
      { name: "description", content: "Jobs, business opportunities, and career tools— all in one hub." },
    ],
  }),
  component: CareerHubPage,
});

function CareerHubPage() {
  const { user } = useAuthUser();
  const [stats, setStats] = useState({ jobs: 0, opps: 0, myApps: 0 });

  useEffect(() => {
    (async () => {
      const [{ count: jobs }, { count: opps }, myApps] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("business_opportunities").select("*", { count: "exact", head: true }).eq("status", "active"),
        user
          ? supabase.from("job_applications").select("*", { count: "exact", head: true }).eq("applicant_id", user.id)
          : Promise.resolve({ count: 0 }),
      ]);
      setStats({ jobs: jobs ?? 0, opps: opps ?? 0, myApps: (myApps as { count: number | null }).count ?? 0 });
    })();
  }, [user]);

  const tiles = [
    { to: "/career/jobs", icon: Briefcase, label: "Jobs", desc: `${stats.jobs} open roles`, tint: "from-[#4f7cff]/25 to-transparent" },
    { to: "/career/business", icon: Building2, label: "Business", desc: `${stats.opps} opportunities`, tint: "from-[#e8c874]/25 to-transparent" },
    { to: "/career/applications", icon: FileText, label: "My Applications", desc: `${stats.myApps} in progress`, tint: "from-emerald-500/20 to-transparent" },
    { to: "/career/recruiter", icon: LayoutDashboard, label: "Recruiter", desc: "Manage posted jobs", tint: "from-fuchsia-500/20 to-transparent" },
    { to: "/career/profile", icon: User, label: "Pro Profile", desc: "Optimize with", tint: "from-cyan-400/20 to-transparent" },
    { to: "/career/ai", icon: Sparkles, label: "Tools", desc: "Resume · Cover · Interview", tint: "from-violet-500/25 to-transparent" },
  ] as const;

  return (
    <CareerShell title="Career & Business" subtitle="Verified opportunities, real-time hiring, private until you're matched.">
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t, i) => (
          <Link key={t.to} to={t.to} className="animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
            <GlassCard className="h-full p-4">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${t.tint} border border-white/10`}>
                <t.icon className="h-5 w-5 text-white/90" strokeWidth={1.6} />
              </div>
              <div className="text-sm font-semibold">{t.label}</div>
              <div className="mt-0.5 text-[11px] text-white/50">{t.desc}</div>
            </GlassCard>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Link to="/career/jobs/new" className="flex-1 rounded-2xl bg-gradient-to-r from-[#4f7cff] to-[#3b5fd1] px-4 py-3 text-center text-sm font-semibold text-white shadow-[0_16px_40px_-14px_rgba(79,124,255,0.5)] transition active:scale-[0.98]">
          <Rocket className="mr-1 inline h-4 w-4" /> Post a Job
        </Link>
        <Link to="/career/business/new" className="flex-1 rounded-2xl bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-4 py-3 text-center text-sm font-semibold text-[#05070f] shadow-[0_16px_40px_-14px_rgba(232,200,116,0.55)] transition active:scale-[0.98]">
          <TrendingUp className="mr-1 inline h-4 w-4" /> Post Opportunity
        </Link>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
          <Users className="h-3.5 w-3.5" /> Live activity
        </div>
        <LiveTicker />
      </div>
    </CareerShell>
  );
}

function LiveTicker() {
  const [items, setItems] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
  useEffect(() => {
    let alive = true;
    supabase
      .from("jobs")
      .select("id, title, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => alive && setItems(data ?? []));
    const ch = supabase
      .channel("career-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jobs" }, (payload) => {
        const r = payload.new as { id: string; title: string; created_at: string };
        setItems((prev) => [{ id: r.id, title: r.title, created_at: r.created_at }, ...prev].slice(0, 5));
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, []);
  if (!items.length) return <GlassCard className="p-4 text-sm text-white/50">No recent postings yet.</GlassCard>;
  return (
    <div className="space-y-2">
      {items.map((r) => (
        <Link key={r.id} to="/career/jobs/$jobId" params={{ jobId: r.id }}>
          <GlassCard className="flex items-center gap-3 p-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="flex-1 truncate text-sm">{r.title}</span>
            <span className="text-[10px] text-white/40">{new Date(r.created_at).toLocaleDateString()}</span>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
}