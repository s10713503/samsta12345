import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Plus, Film, User, Orbit, Telescope, Clapperboard, Send, Bell, CircleUserRound, FolderKanban, CircleDashed } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { to: "/" | "/explore" | "/communities" | "/create" | "/reels" | "/profile"; icon: typeof Home; label: string; center?: boolean };
const tabs: Tab[] = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/explore", icon: Compass, label: "Explore" },
  { to: "/create", icon: Plus, label: "Create", center: true },
  { to: "/communities", icon: CircleDashed, label: "Circles" },
  { to: "/reels", icon: Film, label: "Reels" },
  { to: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname.startsWith("/agent") || pathname.startsWith("/sam") || pathname.startsWith("/reels") || pathname.startsWith("/edu-reels") || pathname.startsWith("/translate") || pathname.startsWith("/career") || pathname.startsWith("/learn") || pathname.startsWith("/memory") || pathname.startsWith("/travel") || pathname.startsWith("/shopping") || pathname.startsWith("/finance") || pathname.startsWith("/health") || pathname.startsWith("/privacy") || pathname.startsWith("/news") || pathname.startsWith("/knowledge") || pathname.startsWith("/future") || pathname.startsWith("/welcome") || pathname.startsWith("/auth") || pathname.startsWith("/premium") || pathname.startsWith("/education")) return null;
  if (pathname.startsWith("/orbit/setup")) return null;
  const orbit = pathname.startsWith("/orbit");
  if (orbit) return <OrbitNav pathname={pathname} />;
  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[min(440px,calc(100%-24px))] -translate-x-1/2">

      <div className="glass-strong flex items-center justify-around rounded-full px-3 py-2.5">
        {tabs.map(({ to, icon: Icon, label, center }) => {
          const active = to === "/communities" ? pathname.startsWith("/communities") : pathname === to;
          if (center) {
            return (
              <Link key={to} to={to} aria-label={label} className="group relative -mt-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform duration-300 group-active:scale-90"
                  style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}>
                  <Icon className="h-6 w-6 text-white" strokeWidth={2.5} />
                </div>
              </Link>
            );
          }
          return (
            <Link key={to} to={to} aria-label={label}
              className={cn(
                "relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {active && (
                <span
                  className="absolute inset-1 rounded-full animate-tab-in"
                  style={{ background: "linear-gradient(135deg, oklch(0.9 0.05 30 / 0.7), oklch(0.85 0.08 20 / 0.5))" }}
                />
              )}
              {to === "/communities" ? (
                <CircleGem active={active} />
              ) : (
                <Icon className={cn("relative h-5.5 w-5.5 transition-transform duration-300", active && "scale-110")} strokeWidth={active ? 2.4 : 1.8} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* Samsta Circle tab: frosted glassmorphism orb with premium light refraction. */
function CircleGem({ active }: { active: boolean }) {
  return (
    <span className={cn("relative flex h-6 w-6 items-center justify-center transition-transform duration-300", active && "scale-110")}>
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 rounded-full opacity-80 blur-lg"
        style={{
          background:
            "radial-gradient(circle, oklch(0.93 0.06 220 / 0.55), oklch(0.9 0.07 40 / 0.35) 55%, transparent 78%)",
        }}
      />
      {/* frosted glass disc */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full border backdrop-blur-md"
        style={{
          background:
            "linear-gradient(140deg, oklch(1 0 0 / 0.55), oklch(0.92 0.05 230 / 0.28) 45%, oklch(0.9 0.07 40 / 0.22))",
          borderColor: "oklch(1 0 0 / 0.55)",
          boxShadow:
            "inset 0 1px 2px oklch(1 0 0 / 0.75), inset 0 -2px 4px oklch(0.75 0.05 250 / 0.25), 0 2px 6px oklch(0.6 0.06 250 / 0.2)",
        }}
      />
      <svg viewBox="0 0 24 24" className="relative h-6 w-6" fill="none">
        <defs>
          <linearGradient id="circleGlassRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(1 0 0 / 0.95)" />
            <stop offset="50%" stopColor="oklch(0.88 0.07 230 / 0.7)" />
            <stop offset="100%" stopColor="oklch(0.9 0.08 40 / 0.8)" />
          </linearGradient>
          <linearGradient id="circleGlassCore" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(1 0 0 / 0.85)" />
            <stop offset="100%" stopColor="oklch(0.86 0.08 250 / 0.45)" />
          </linearGradient>
        </defs>
        {/* refraction sweep */}
        <g className="origin-center animate-[spin_9s_linear_infinite]">
          <circle cx="12" cy="12" r="9.2" stroke="url(#circleGlassRing)" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="14 40" />
        </g>
        {/* inner glass core */}
        <circle cx="12" cy="12" r="5" fill="url(#circleGlassCore)" stroke="oklch(1 0 0 / 0.7)" strokeWidth="0.7" />
        <ellipse cx="10.2" cy="9.8" rx="2.2" ry="1.3" fill="oklch(1 0 0 / 0.75)" transform="rotate(-30 10.2 9.8)" />
        <circle cx="14.4" cy="14.6" r="0.8" fill="oklch(0.9 0.09 40 / 0.8)" className="animate-[pulse_2.6s_ease-in-out_infinite]" />
      </svg>
    </span>
  );
}

/* Orbit-only premium nav: its own icon set, cool blue/violet register, 6 Orbit destinations. */
function OrbitNav({ pathname }: { pathname: string }) {
  const items: Array<{ to: string; icon: typeof Home; label: string; center?: boolean }> = [
    { to: "/orbit", icon: Orbit, label: "Orbit Home", center: true },
    { to: "/orbit/explore", icon: Telescope, label: "Explore" },
    { to: "/orbit/projects", icon: FolderKanban, label: "Projects" },
    { to: "/orbit/reels", icon: Clapperboard, label: "Orbit Reels" },
    { to: "/orbit/messages", icon: Send, label: "Orbit Inbox" },
    { to: "/orbit/profile", icon: CircleUserRound, label: "Orbit Profile" },
  ];
  const ordered = [items[1], items[2], items[0], items[3], items[4], items[5]];

  return (
    <nav className="fixed bottom-4 left-1/2 z-40 w-[min(440px,calc(100%-24px))] -translate-x-1/2">
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-full opacity-70 blur-2xl animate-aurora"
        style={{
          background:
            "radial-gradient(120px 50px at 25% 60%, oklch(0.78 0.13 250 / 0.5), transparent 70%), radial-gradient(140px 60px at 80% 40%, oklch(0.75 0.14 300 / 0.45), transparent 70%)",
        }}
      />
      <div
        className="glass-strong relative flex items-center justify-around rounded-full px-2 py-2.5 shadow-xl ring-1"
        style={{ ["--tw-ring-color" as any]: "oklch(0.8 0.09 250 / 0.45)" }}
      >
        {ordered.map(({ to, icon: Icon, label, center }) => {
          const active = to === "/orbit" ? pathname === "/orbit" : pathname === to;
          if (center) {
            return (
              <Link key={to} to={to as any} aria-label={label} className="group relative -mt-6">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-300 group-active:scale-90 animate-orb"
                  style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
                >
                  <Icon className={cn("h-6 w-6", active && "animate-orbit-spin")} strokeWidth={2.5} />
                </div>
              </Link>
            );
          }
          const isReels = to === "/orbit/reels";
          return (
            <Link
              key={to}
              to={to as any}
              aria-label={label}
              className={cn(
                "relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 active:scale-90",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {active && (
                <span
                  className="absolute inset-1 rounded-full animate-tab-in"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.86 0.08 250 / 0.75), oklch(0.82 0.1 300 / 0.55))",
                  }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-5 w-5 transition-transform duration-300",
                  active && "scale-110",
                )}
                strokeWidth={active ? 2.4 : 1.7}
                style={
                  isReels
                    ? { color: "oklch(0.62 0.13 255)" }
                    : active
                      ? undefined
                      : { color: "oklch(0.66 0.06 255)" }
                }
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
