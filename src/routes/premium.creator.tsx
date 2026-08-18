import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Crown, Sparkles, Wand2, Film, Image as ImageIcon, Mic, Music2, Palette, Zap, Video, ScanLine, Type, Sticker, Star, X } from "lucide-react";

export const Route = createFileRoute("/premium/creator")({
  head: () => ({
    meta: [
      { title: "Samsta Creator Premium" },
      { name: "description", content: "Create viral content with in seconds— unlimited reels, videos, avatars, voices and 4K export." },
      { property: "og:title", content: "Samsta Creator Premium" },
      { property: "og:description", content: "Unlimited generation, 4K export, no watermark, creator analytics pro." },
    ],
  }),
  component: PremiumCreator,
});

type Region = "IN" | "INTL";
const price: Record<Region, { m1: string; m3: string; m6: string; m12: string }> = {
  IN: { m1: "₹299", m3: "₹799", m6: "₹1,499", m12: "₹2,499" },
  INTL: { m1: "$39.99", m3: "$99.99", m6: "$189.99", m12: "$349.99" },
};

const compare = [
  { t: "Reel Generator", free: "1/day", pro: "Unlimited" },
  { t: "Video Generator", free: "—", pro: "Unlimited" },
  { t: "Photo Generator", free: "1/day", pro: "Unlimited" },
  { t: "Image-to-Video", free: "—", pro: "✓" },
  { t: "Avatar Creator", free: "—", pro: "✓" },
  { t: "Voice Generator", free: "—", pro: "✓" },
  { t: "Script & Thumbnails", free: "—", pro: "✓" },
  { t: "Background / Object Removal", free: "—", pro: "✓" },
  { t: "Auto Captions", free: "Limited", pro: "Unlimited" },
  { t: "Viral Optimization", free: "—", pro: "✓" },
  { t: "Premium Templates & Fonts", free: "5 basic", pro: "Unlimited" },
  { t: "Music Library", free: "Basic", pro: "Unlimited Premium" },
  { t: "Export Quality", free: "720p HD", pro: "4K" },
  { t: "Watermark", free: "Samsta", pro: "Removed" },
  { t: "Creator Analytics Pro", free: "—", pro: "✓" },
  { t: "Priority Processing", free: "—", pro: "✓" },
];

const floaters = [
  { icon: Wand2, x: "8%", y: "18%", d: 0 },
  { icon: Film, x: "82%", y: "14%", d: 200 },
  { icon: ImageIcon, x: "12%", y: "70%", d: 400 },
  { icon: Sparkles, x: "84%", y: "62%", d: 600 },
];

function PremiumCreator() {
  const [region, setRegion] = useState<Region>("IN");
  const [selected, setSelected] = useState<"m1" | "m3" | "m6" | "m12">("m12");
  const p = price[region];
  const plans = [
    { id: "m1" as const, label: "1 Month", price: p.m1, per: "/mo" },
    { id: "m3" as const, label: "3 Months", price: p.m3, per: "/3 mo", save: "Save 11%" },
    { id: "m6" as const, label: "6 Months", price: p.m6, per: "/6 mo", save: "Save 21%" },
    { id: "m12" as const, label: "12 Months", price: p.m12, per: "/yr", save: "Best value", popular: true },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060f] text-white">
      {/* Ambient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#7c3aed] opacity-30 blur-[130px]" />
        <div className="absolute top-40 -right-24 h-[380px] w-[380px] rounded-full bg-[#e8c874] opacity-20 blur-[110px]" />
        <div className="absolute bottom-0 -left-24 h-[420px] w-[420px] rounded-full bg-[#4f7cff] opacity-25 blur-[120px]" />
      </div>

      {/* Floating icons */}
      {floaters.map((f, i) => (
        <div
          key={i}
          className="pointer-events-none absolute z-0 animate-fade-in"
          style={{ left: f.x, top: f.y, animationDelay: `${f.d}ms` }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] shadow-2xl backdrop-blur-xl">
            <f.icon className="h-5 w-5 text-[#e8c874]" strokeWidth={1.6} />
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-xl transition active:scale-90">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-1.5 rounded-full border border-[#e8c874]/40 bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-wider text-[#e8c874] backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" /> CREATOR PREMIUM
        </div>
        <div className="w-10" />
      </div>

      {/* Hero */}
      <div className="relative z-10 px-5 pt-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-[#7c3aed]/30 to-[#e8c874]/20 shadow-[0_10px_40px_-10px_rgba(124,58,237,0.6)] backdrop-blur-xl animate-scale-in">
          <Wand2 className="h-8 w-8 text-white" strokeWidth={1.6} />
        </div>
        <h1 className="font-display text-4xl italic leading-tight">Samsta Creator</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/60">
          Create <span className="text-[#e8c874]">viral content</span> with in seconds.
        </p>
      </div>

      {/* Region toggle */}
      <div className="relative z-10 mx-auto mt-6 flex w-fit items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-xl">
        {(["IN", "INTL"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRegion(r)}
            className={`relative rounded-full px-5 py-2 text-xs font-medium transition ${region === r ? "text-[#05060f]" : "text-white/70"}`}
          >
            {region === r && <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] shadow-[0_6px_20px_-4px_rgba(232,200,116,0.55)]" />}
            <span className="relative">{r === "IN" ? "🇮🇳 India" : "🌍 International"}</span>
          </button>
        ))}
      </div>

      {/* Plans */}
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
                <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#05060f]">
                  <Star className="h-2.5 w-2.5 fill-current" /> MOST POPULAR
                </div>
              )}
              <div className="text-[11px] uppercase tracking-wider text-white/50">{pl.label}</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-2xl italic">{pl.price}</span>
                <span className="text-[11px] text-white/40">{pl.per}</span>
              </div>
              {pl.save && (
                <div className="mt-2 inline-flex rounded-full border border-[#e8c874]/30 bg-[#e8c874]/10 px-2 py-0.5 text-[10px] text-[#e8c874]">{pl.save}</div>
              )}
              <div className={`mt-3 flex h-5 w-5 items-center justify-center rounded-full border transition ${active ? "border-[#e8c874] bg-[#e8c874]" : "border-white/30"}`}>
                {active && <Check className="h-3 w-3 text-[#05060f]" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Comparison table */}
      <div className="relative z-10 mt-8 px-5 pb-40">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-white/80">Free vs Premium</h2>
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center gap-2 border-b border-white/10 px-4 py-3 text-[11px] uppercase tracking-wider text-white/50">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-[#e8c874]">Premium</span>
          </div>
          {compare.map((row, i) => (
            <div
              key={row.t}
              className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center gap-2 border-b border-white/5 px-4 py-3 text-sm last:border-b-0 animate-fade-in"
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <span className="text-white/85">{row.t}</span>
              <span className="text-center text-xs text-white/50">{row.free === "—" ? <X className="mx-auto h-3.5 w-3.5" /> : row.free}</span>
              <span className="text-center text-xs font-medium text-[#e8c874]">
                {row.pro === "✓" ? <Check className="mx-auto h-4 w-4" strokeWidth={2.4} /> : row.pro}
              </span>
            </div>
          ))}
        </div>

        {/* Perks strip */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { i: Video, l: "4K Export" },
            { i: Palette, l: "Brand Kit" },
            { i: Mic, l: "Voice" },
            { i: ScanLine, l: "BG Remover" },
            { i: Type, l: "Fonts" },
            { i: Sticker, l: "Stickers" },
            { i: Music2, l: "Music" },
            { i: Zap, l: "Priority" },
          ].map((x, i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur">
              <x.i className="h-4 w-4 text-[#e8c874]" strokeWidth={1.7} />
              <span className="text-[10px] text-white/70">{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#05060f]/85 px-5 pb-6 pt-4 backdrop-blur-2xl">
        <button className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-[#e8c874] via-[#f0d78c] to-[#c9a34a] py-4 text-sm font-bold tracking-wide text-[#05060f] shadow-[0_20px_50px_-10px_rgba(232,200,116,0.6)] transition active:scale-[0.98]">
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <span className="relative flex items-center justify-center gap-2">
            <Crown className="h-4 w-4" /> Unlock Creator Premium— {price[region][selected]}
          </span>
        </button>
        <p className="mt-2 text-center text-[10px] text-white/40">Cancel anytime · Secure payment · Auto-renews</p>
      </div>
    </div>
  );
}
