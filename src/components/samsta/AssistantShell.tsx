import { Link } from "@tanstack/react-router";
import { ArrowLeft, Lock } from "lucide-react";
import type { ReactNode } from "react";
import { usePremium } from "@/lib/premium";
import { PremiumBadge } from "./PremiumLock";

export function AssistantShell({
  title, hint, accent, icon, backTo = "/assistants", children,
}: {
  title: string;
  hint: string;
  accent: string;
  icon: ReactNode;
  backTo?: string;
  children: ReactNode;
}) {
  const { isPremium } = usePremium();
  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to={backTo} aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: accent }}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="font-display text-lg italic leading-tight">{title}</div>
          <div className="text-[11px] text-muted-foreground">{hint}</div>
        </div>
        <PremiumBadge small />
      </header>

      {!isPremium ? (
        <div className="mx-4 mt-6 glass-strong rounded-3xl p-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-black/85 text-white">
            <Lock className="h-6 w-6" />
          </div>
          <div className="mt-4 font-display text-xl italic">Premium unlocks this</div>
          <p className="mt-1 text-xs text-muted-foreground">Every assistant on Samsta is a Premium feature.</p>
          <Link to="/premium" className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2 text-sm text-background">Upgrade</Link>
        </div>
      ) : (
        <main className="px-4 pt-2">{children}</main>
      )}
    </div>
  );
}
