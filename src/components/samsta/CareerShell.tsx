import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Crown } from "lucide-react";
import type { ReactNode } from "react";

export function CareerShell({
  title,
  subtitle,
  right,
  back = "/career",
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: back });
    }
  };
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-[420px] w-[420px] rounded-full bg-[#1e3a8a] opacity-40 blur-[120px]" />
        <div className="absolute -top-24 right-[-120px] h-[380px] w-[380px] rounded-full bg-[#c9a34a] opacity-25 blur-[110px]" />
        <div className="absolute bottom-0 left-1/3 h-[420px] w-[420px] rounded-full bg-[#4f7cff] opacity-25 blur-[130px]" />
      </div>
      <div className="relative z-10 flex items-center justify-between px-5 pt-6">
        <button
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 backdrop-blur-xl transition active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Link to={back} className="flex items-center gap-1.5 rounded-full border border-[#c9a34a]/40 bg-white/5 px-3 py-1.5 text-[11px] font-medium tracking-wider text-[#e8c874] backdrop-blur">
          <Crown className="h-3.5 w-3.5" /> CAREER HUB
        </Link>
        <div className="w-10">{right}</div>
      </div>
      <div className="relative z-10 px-5 pt-6">
        <h1 className="font-display text-3xl italic leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/60">{subtitle}</p>}
      </div>
      <div className="relative z-10 px-5 pt-6 pb-24">{children}</div>
    </div>
  );
}

export function GlassCard({ children, className = "", onClick }: { children?: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition ${onClick ? "cursor-pointer active:scale-[0.98] hover:border-white/20" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function VerifiedBadge({ verified }: { verified?: boolean | null }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#e8c874]/40 bg-[#e8c874]/10 px-2 py-0.5 text-[10px] font-semibold text-[#e8c874]">
      <Crown className="h-2.5 w-2.5" /> Verified
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-white/10 text-white/70",
    reviewing: "bg-[#4f7cff]/20 text-[#a5c1ff]",
    info_requested: "bg-[#e8c874]/20 text-[#e8c874]",
    accepted: "bg-emerald-500/20 text-emerald-300",
    rejected: "bg-rose-500/20 text-rose-300",
    withdrawn: "bg-white/5 text-white/40",
    active: "bg-emerald-500/20 text-emerald-300",
    draft: "bg-white/10 text-white/60",
  };
  const cls = map[status] ?? "bg-white/10 text-white/70";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${cls}`}>{status.replace("_", " ")}</span>;
}