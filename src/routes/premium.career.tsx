import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Crown, Sparkles, Briefcase, Building2, Rocket, ShieldCheck, Zap, BrainCircuit, Users, LineChart, Star } from "lucide-react";

export const Route = createFileRoute("/premium/career")({
  head: () => ({
    meta: [
      { title: "Samsta Premium — Career & Business" },
      { name: "description", content: "Unlock powered career tools, priority hiring, and business growth with Samsta Premium." },
      { property: "og:title", content: "Samsta Premium — Career & Business" },
      { property: "og:description", content: "resume, interview coach, unlimited applications, business analytics and more." },
    ],
  }),
  component: PremiumCareer,
});

type Region = "IN" | "INTL";
const priceCareer: Record<Region, { m1: string; m3: string; m6: string; m12: string }> = {
  IN: { m1: "₹399", m3: "₹999", m6: "₹1,799", m12: "₹2,999" },
  INTL: { m1: "$59.99", m3: "$159.99", m6: "$299.99", m12: "$499.99" },
};
const priceBiz: Record<Region, { m: string; y: string }> = {
  IN: { m: "₹999", y: "₹8,999" },
  INTL: { m: "$99.99", y: "$899.99" },
};

const features = [
  { icon: Zap, t: "Unlimited Job Applications" },
  { icon: BrainCircuit, t: "Resume Builder Pro" },
  { icon: Sparkles, t: "Interview Coach" },
  { icon: Rocket, t: "Career Roadmap" },
  { icon: Star, t: "Priority Hiring Visibility" },
  { icon: ShieldCheck, t: "Skill Verification" },
  { icon: Building2, t: "Business Profile Verification" },
  { icon: Briefcase, t: "Unlimited Job Posting" },
  { icon: Users, t: "Candidate Matching" },
  { icon: LineChart, t: "Business Analytics Dashboard" },
  { icon: BrainCircuit, t: "Business Assistant" },
  { icon: Users, t: "Team Collaboration Tools" },
  { icon: Crown, t: "Premium Customer Support" },
  { icon: Sparkles, t: "Early Access to New Features" },
];

function PremiumCareer() {
  const [region, setRegion] = useState<Region>("IN");
  const [selected, setSelected] = useState<"m1" | "m3" | "m6" | "m12">("m12");
  const p = priceCareer[region];
  const plans = [
    { id: "m1" as const, label: "1 Month", price: p.m1, per: "/mo", save: null },
    { id: "m3" as const, label: "3 Months", price: p.m3, per: "/3 mo", save: "Save 16%" },
    { id: "m6" as const, label: "6 Months", price: p.m6, per: "/6 mo", save: "Save 25%" },
    { id: "m12" as const, label: "12 Months", price: p.m12, per: "/yr", save: "Best value", popular: true },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070f] text-white">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-[#1e3a8a] opacity-40 blur-[120px]" />
        <div className="absolute -top-24 right-[-120px] h-[380px] w-[380px] rounded-full bg-[#c9a34a] opacity-25 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-[#4f7cff] opacity-25 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_50%_-10%,rgba(255,255,255,0.06),transparent)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6">
        <Link to="/career" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-xl transition active:scale-90">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-1.5 rounded-full border border-[#c9a34a]/40 bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-wider text-[#e8c874] backdrop-blur">
          <Crown className="h-3.5 w-3.5" /> SAMSTA PREMIUM
        </div>
        <div className="w-10" />
      </div>

      {/* Hero */}
      <div className="relative z-10 px-5 pt-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-white/10 to-white/[0.02] shadow-[0_10px_40px_-10px_rgba(201,163,74,0.5)] backdrop-blur-xl animate-scale-in">
          <Crown className="h-8 w-8 text-[#e8c874]" strokeWidth={1.6} />
        </div>
        <h1 className="font-display text-4xl italic leading-tight">Premium Access</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/60">
          Unlock <span className="text-[#e8c874]">Career & Business</span> with Samsta Premium.
        </p>
      </div>

      {/* Region toggle */}
      <div className="relative z-10 mx-auto mt-6 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
        {(["IN", "INTL"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`relative rounded-full px-5 py-2 text-xs font-medium transition ${region === r ? "text-[#05070f]" : "text-white/70"}`}
          >
            {region === r && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] shadow-[0_6px_20px_-4px_rgba(232,200,116,0.55)]" />}
            <span className="relative">{r === "IN" ? "🇮🇳 India" : "🌍 International"}</span>
          </button>
        ))}
      </div>

      {/* Plan cards */}
      <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 px-5">
        {plans.map((pl, i) => {
          const active = selected === pl.id;
          return (
            <button
              key={pl.id}
              onClick={() => setSelected(pl.id)}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`group relative overflow-hidden rounded-2xl border p-4 text-left backdrop-blur-xl transition animate-fade-in active:scale-[0.98] ${
                active
                  ? "border-[#e8c874]/60 bg-gradient-to-br from-white/[0.09] to-white/[0.02] shadow-[0_20px_50px_-20px_rgba(232,200,116,0.45)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              }`}
            >
              {pl.popular && (
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#05070f]">
                  <Star className="h-2.5 w-2.5 fill-current" /> MOST POPULAR
                </div>
              )}
              <div className="text-[11px] uppercase tracking-wider text-white/50">{pl.label}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl italic">{pl.price}</span>
                <span className="text-[11px] text-white/40">{pl.per}</span>
              </div>
              {pl.save && (
                <div className="mt-2 inline-flex rounded-full border border-[#e8c874]/30 bg-[#e8c874]/10 px-2 py-0.5 text-[10px] text-[#e8c874]">
                  {pl.save}
                </div>
              )}
              <div className={`mt-3 flex h-5 w-5 items-center justify-center rounded-full border transition ${active ? "border-[#e8c874] bg-[#e8c874]" : "border-white/30"}`}>
                {active && <Check className="h-3 w-3 text-[#05070f]" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Features */}
      <div className="relative z-10 mt-8 px-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/80">Everything included</h2>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <div className="grid grid-cols-1 gap-2.5">
            {features.map((f, i) => (
              <div key={f.t} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-2.5 animate-fade-in" style={{ animationDelay: `${i * 25}ms` }}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#4f7cff]/20 to-[#e8c874]/20 text-[#e8c874]">
                  <f.icon className="h-4 w-4" strokeWidth={1.8} />
                </div>
                <span className="text-sm text-white/85">{f.t}</span>
                <Check className="ml-auto h-4 w-4 text-[#e8c874]" strokeWidth={2.4} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Business Pro */}
      <div className="relative z-10 mt-8 px-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/80">Business Pro</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Monthly", price: priceBiz[region].m, per: "/mo" },
            { label: "Yearly", price: priceBiz[region].y, per: "/yr", tag: "Save 25%" },
          ].map((b) => (
            <div key={b.label} className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#4f7cff]/10 to-white/[0.02] p-4 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-wider text-white/50">{b.label}</div>
              <div className="mt-2 font-display text-2xl italic">{b.price}<span className="ml-1 text-[11px] text-white/40">{b.per}</span></div>
              {b.tag && <div className="mt-2 inline-flex rounded-full bg-[#4f7cff]/20 px-2 py-0.5 text-[10px] text-[#a5c1ff]">{b.tag}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Enterprise */}
      <div className="relative z-10 mt-4 px-5 pb-40">
        <div className="relative overflow-hidden rounded-3xl border border-[#e8c874]/25 bg-gradient-to-br from-[#e8c874]/10 via-white/[0.03] to-[#4f7cff]/10 p-5 backdrop-blur-xl">
          <div className="mb-1 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#e8c874]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#e8c874]">Enterprise</span>
          </div>
          <div className="font-display text-2xl italic">Custom Pricing</div>
          <ul className="mt-3 space-y-1.5 text-sm text-white/80">
            {["Dedicated Account Manager", "Recruiting Suite", "Enterprise Analytics", "API Integrations", "Unlimited Team Members"].map((x) => (
              <li key={x} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-[#e8c874]" /> {x}</li>
            ))}
          </ul>
          <button className="mt-4 rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium backdrop-blur transition active:scale-95">
            Talk to sales →
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#05070f]/85 px-5 pb-6 pt-4 backdrop-blur-2xl">
        <button className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#e8c874] via-[#f0d78c] to-[#c9a34a] py-4 text-sm font-bold tracking-wide text-[#05070f] shadow-[0_20px_50px_-10px_rgba(232,200,116,0.6)] transition active:scale-[0.98]">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative flex items-center justify-center gap-2">
            <Crown className="h-4 w-4" /> Unlock Premium — {priceCareer[region][selected]}
          </span>
        </button>
        <p className="mt-2 text-center text-[10px] text-white/40">Cancel anytime · Secure payment · Auto-renews</p>
      </div>
    </div>
  );
}
