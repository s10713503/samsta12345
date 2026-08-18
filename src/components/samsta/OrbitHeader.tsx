// @ts-nocheck
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Orbit } from "lucide-react";

/** Shared Orbit chrome: aurora glow + back that returns to the Orbit home first. */
export function OrbitHeader({ title, subtitle, backTo = "/orbit", right }: {
  title: string; subtitle?: string; backTo?: string; right?: React.ReactNode;
}) {
  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-72 opacity-70 blur-3xl animate-aurora"
        style={{ background: "radial-gradient(220px 140px at 80% 0%, oklch(0.8 0.13 300 / 0.5), transparent 70%), radial-gradient(240px 160px at 5% 20%, oklch(0.82 0.12 210 / 0.45), transparent 70%)" }} />
      <header className="relative flex items-center gap-3 px-4 pt-4">
        <Link to={backTo as any} aria-label="Back to Orbit home" className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
          <Orbit className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-xl italic leading-none">{title}</h1>
          {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {right}
      </header>
    </>
  );
}
