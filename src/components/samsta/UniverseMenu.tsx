import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Compass, TrendingUp, Briefcase, ChevronRight, X, Sparkles, Orbit } from "lucide-react";
import { CareerOrbitIcon, EducationBeaconIcon } from "./UniverseIcons";

/**
 * Home-page "menu" entry that reveals the two premium AI categories:
 *  1. Universe  (Live Translate · Career · Knowledge)
 *  2. Future    (AI decision engine)
 */
export function UniverseMenu() {
  const [open, setOpen] = useState(false);
  const [universeOpen, setUniverseOpen] = useState(false);

  return (
    <>
      {/* Menu trigger — sits above the story rail */}
      <div className="px-4 pt-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="glass-strong relative flex w-full items-center gap-3 overflow-hidden rounded-3xl px-4 py-3 text-left transition-transform active:scale-[0.98]"
          aria-expanded={open}
        >
          <div aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-60 blur-2xl animate-aurora"
            style={{ background: "oklch(0.9 0.11 25)" }} />
          <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="relative flex-1">
            <div className="font-display text-base italic leading-tight">Explore Sam</div>
            <div className="text-[11px] leading-tight text-muted-foreground">
              {open ? "Tap a category" : "Universe · Future decisions"}
            </div>
          </div>
          <span className="relative rounded-full bg-foreground/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-background">
            {open ? "Close" : "Open"}
          </span>
        </button>

        {/* Two premium categories */}
        <div
          className="grid grid-cols-2 gap-3 overflow-hidden transition-[max-height,opacity,margin] duration-500 ease-out"
          style={{
            maxHeight: open ? 240 : 0,
            opacity: open ? 1 : 0,
            marginTop: open ? 12 : 0,
          }}
        >
          <button
            onClick={() => setUniverseOpen(true)}
            className="glass group relative flex flex-col items-start gap-2 overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.97] animate-fade-up"
          >
            <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl"
              style={{ background: "oklch(0.92 0.08 260)" }} />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
              <Compass className="h-5 w-5" />
            </div>
            <div className="relative">
              <div className="font-display text-base italic leading-tight">Universe</div>
              <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">Translate · Career · Learn</div>
            </div>
          </button>

          <Link
            to="/future"
            className="glass group relative flex flex-col items-start gap-2 overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.97] animate-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            <div aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-70 blur-2xl animate-aurora"
              style={{ background: "oklch(0.9 0.11 25)" }} />
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ background: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.86 0.11 55))" }}>
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="relative">
              <div className="font-display text-base italic leading-tight">Future</div>
              <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground"> decision engine· 9 modes</div>
            </div>
            <span className="absolute right-3 top-3 rounded-full bg-foreground/90 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-background">new</span>
          </Link>
        </div>
      </div>

      <UniverseDrawer open={universeOpen} onClose={() => setUniverseOpen(false)} />
    </>
  );
}

function UniverseDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  const modules = [
    { to: "/career" as const, title: "Career & Business", hint: "Pro network· jobs· career",
      icon: <CareerOrbitIcon className="h-[22px] w-[22px]" />,
      accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))",
      tint: "oklch(0.94 0.06 20)" },
    { to: "/education" as const, title: "Education Purpose", hint: "academy· learn· knowledge feed· certify",
      icon: <EducationBeaconIcon className="h-[22px] w-[22px]" />,
      accent: "linear-gradient(135deg, oklch(0.78 0.13 150), oklch(0.72 0.14 170))",
      tint: "oklch(0.93 0.06 150)" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-up"
      onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60 backdrop-blur">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 pb-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg italic">Sam's Universe</div>
            <div className="text-[11px] text-muted-foreground">Dedicated premium modules</div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {modules.map((m, i) => (
            <Link key={m.to} to={m.to} onClick={onClose}
              className="glass group relative flex items-center gap-3 overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.98] animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-70 blur-2xl animate-aurora"
                style={{ background: m.tint }} />
              <div aria-hidden className="pointer-events-none absolute inset-0 animate-shimmer"
                style={{ background: "linear-gradient(105deg, transparent 35%, oklch(1 0 0 / 0.35) 50%, transparent 65%)", backgroundSize: "220% 100%" }} />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
                style={{ background: m.accent }}>{m.icon}</div>
              <div className="relative flex-1">
                <div className="font-display text-lg italic leading-tight">{m.title}</div>
                <div className="text-[11px] text-muted-foreground">{m.hint}</div>
              </div>
              <ChevronRight className="relative h-5 w-5 text-muted-foreground" />
            </Link>
          ))}

          {/* Samsta Orbit — real-time conversations */}
          <Link
            to="/orbit"
            onClick={onClose}
            className="glass relative flex items-center gap-3 overflow-hidden rounded-3xl p-4 animate-fade-up transition-transform active:scale-[0.98]"
            style={{ animationDelay: `${modules.length * 60}ms` }}
          >
            <div
              aria-hidden
              className="absolute inset-0 opacity-70 blur-2xl animate-aurora"
              style={{
                background:
                  "radial-gradient(120px 80px at 85% 0%, oklch(0.9 0.1 300 / 0.7), transparent 70%), radial-gradient(140px 90px at 10% 110%, oklch(0.9 0.1 200 / 0.6), transparent 70%)",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 animate-shimmer"
              style={{
                background: "linear-gradient(100deg, transparent 40%, oklch(1 0 0 / 0.5) 50%, transparent 60%)",
                backgroundSize: "200% 100%",
              }}
            />
            <div
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
            >
              <Orbit className="h-5 w-5 animate-orbit-spin" />
            </div>
            <div className="relative flex-1">
              <div className="font-display text-lg italic leading-tight">Samsta Orbit</div>
              <div className="text-[11px] text-muted-foreground">Conversations · Trends · Podcasts</div>
            </div>
            <span className="relative rounded-full border border-foreground/10 bg-foreground/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-background">
              live
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
