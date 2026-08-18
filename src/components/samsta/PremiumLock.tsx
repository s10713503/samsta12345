import { Link } from "@tanstack/react-router";
import { Lock, Crown } from "lucide-react";
import { usePremium } from "@/lib/premium";
import type { ReactNode } from "react";

/**
 * Wraps any premium AI feature. Shows a lock badge in the corner for free users;
 * tapping the wrapper (when locked) routes to /premium.
 */
export function PremiumGate({ children, label = "Premium" }: { children: ReactNode; label?: string }) {
  const { isPremium } = usePremium();
  if (isPremium) return <>{children}</>;
  return (
    <Link to="/premium" className="group relative block" aria-label={`${label} — unlock with premium`}>
      <div className="pointer-events-none opacity-70 grayscale-[15%] transition group-active:scale-[0.98]">
        {children}
      </div>
      <span
        className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium text-white shadow-md"
        style={{ background: "linear-gradient(135deg, #111 0%, #1c1c1c 60%, #d4af37 140%)" }}
      >
        <Lock className="h-3 w-3" />
        <span className="tracking-wide">PRO</span>
      </span>
    </Link>
  );
}

export function PremiumBadge({ small }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium text-[#f5e6b3] ${small ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`}
      style={{ background: "linear-gradient(135deg, #0a0a0a, #1a1a1a 60%, #2a2010)", border: "1px solid rgba(212,175,55,0.35)" }}
    >
      <Crown className={small ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span className="tracking-wider">PREMIUM</span>
    </span>
  );
}
