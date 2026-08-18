import { Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Orbit, Sparkles } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

/** Premium shell for the Samsta Circles surface. */
export function CircleShell({
  title,
  subtitle,
  right,
  back = "/communities",
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
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else router.navigate({ to: back });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#faf7f2] text-[#1f1b16]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 -left-28 h-[440px] w-[440px] rounded-full bg-[#f6b98a] opacity-50 blur-[130px] animate-orb" />
        <div className="absolute top-24 right-[-140px] h-[360px] w-[360px] rounded-full bg-[#9fd0f5] opacity-50 blur-[120px] animate-orb" style={{ animationDelay: "1.4s" }} />
        <div className="absolute bottom-[-120px] left-1/4 h-[420px] w-[420px] rounded-full bg-[#ffd9a8] opacity-40 blur-[140px] animate-orb" style={{ animationDelay: "2.6s" }} />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(31,27,22,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(31,27,22,.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(circle at 50% 0%, black, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex items-center justify-between px-5 pt-6">
        <button
          onClick={handleBack}
          className="group flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/80 shadow-[0_10px_24px_-16px_rgba(80,52,20,.7)] backdrop-blur-xl transition hover:border-[#e08a4a]/50 active:scale-90"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
        </button>
        <Link
          to="/communities"
          className="group flex items-center gap-1.5 rounded-full border border-[#e08a4a]/40 bg-white/80 px-3 py-1.5 text-[10px] font-medium tracking-[0.22em] text-[#b25f19] shadow-[0_10px_26px_-18px_rgba(224,138,74,.9)] backdrop-blur transition hover:bg-white"
        >
          <Orbit className="h-3.5 w-3.5 animate-[spin_9s_linear_infinite]" /> SAMSTA CIRCLE
        </Link>
        <div className="flex w-10 justify-end">{right}</div>
      </div>

      <div className="relative z-10 px-5 pt-7">
        <h1 className="animate-fade-up font-display text-[34px] italic leading-[1.05]">
          {title}
          <Sparkles className="ml-2 inline h-5 w-5 -translate-y-1 text-[#e08a4a] animate-pulse" />
        </h1>
        {subtitle && <p className="mt-2 max-w-[34ch] animate-fade-up text-sm leading-relaxed text-[#1f1b16]/55">{subtitle}</p>}
        <div className="mt-5 h-px w-full bg-gradient-to-r from-transparent via-[#e08a4a]/50 to-transparent" />
      </div>

      <div className="relative z-10 px-5 pt-6 pb-28">{children}</div>
    </div>
  );
}

export function CircleCard({
  children,
  className = "",
  onClick,
  style,
}: {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`group relative overflow-hidden rounded-[22px] border border-black/[0.07] bg-gradient-to-b from-white to-[#fbf7f1] shadow-[0_22px_46px_-30px_rgba(80,52,20,0.45)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_28px_60px_-30px_rgba(224,138,74,0.55)] ${
        onClick ? "cursor-pointer active:scale-[0.985] hover:border-[#e08a4a]/40" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CircleAvatar({
  name,
  gradient,
  size = "md",
  logoUrl,
}: {
  name: string;
  gradient: string;
  size?: "sm" | "md" | "lg";
  logoUrl?: string | null;
}) {
  const dim = size === "lg" ? "h-16 w-16 text-2xl" : size === "sm" ? "h-9 w-9 text-sm" : "h-12 w-12 text-lg";
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} circle logo`}
        className={`${dim} shrink-0 rounded-2xl object-cover ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-105`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      className={`${dim} flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} font-bold uppercase text-[#1f1b16]/70 shadow-[0_14px_30px_-22px_rgba(0,0,0,.5)] ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-105`}
    >
      {name.slice(0, 1)}
    </span>
  );
}
