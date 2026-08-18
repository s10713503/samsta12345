import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/welcome")({
  component: Welcome,
  head: () => ({
    meta: [
      { title: "Welcome to Samsta — Share beautifully" },
      { name: "description", content: "Discover Samsta, a quietly premium social space to share photos, reels and stories with Sam. Sign in or create your account to get started." },
      { property: "og:title", content: "Welcome to Samsta — Share beautifully" },
      { property: "og:description", content: "A quietly premium social space with Sam built in. Sign in or create your Samsta account." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://samstaofficial.lovable.app/welcome" },
    ],
    links: [{ rel: "canonical", href: "https://samstaofficial.lovable.app/welcome" }],
  }),
});

function Welcome() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* animated aurora backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-70 blur-3xl animate-aurora"
          style={{ background: "radial-gradient(circle at 30% 30%, oklch(0.92 0.11 25) 0%, transparent 60%)" }} />
        <div className="absolute bottom-0 -left-24 h-[400px] w-[400px] rounded-full opacity-60 blur-3xl animate-aurora"
          style={{ background: "radial-gradient(circle, oklch(0.88 0.09 340) 0%, transparent 70%)", animationDelay: "1.2s" }} />
        <div className="absolute top-1/3 -right-24 h-[380px] w-[380px] rounded-full opacity-50 blur-3xl animate-aurora"
          style={{ background: "radial-gradient(circle, oklch(0.86 0.1 250) 0%, transparent 70%)", animationDelay: "2.4s" }} />
      </div>

      {/* subtle grain */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: "radial-gradient(oklch(0.3 0 0) 1px, transparent 1px)", backgroundSize: "3px 3px" }} />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[480px] flex-col items-center justify-between px-6 pt-24 pb-10">
        {/* Wordmark */}
        <div className="flex flex-col items-center animate-fade-up">
          <div className="glass mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}>
            <Sparkles className="h-7 w-7 text-white" strokeWidth={2} />
          </div>
          <h1 className="font-display text-7xl italic tracking-tight text-gradient leading-none">
            Samsta
          </h1>
          <p className="mt-4 text-center text-sm tracking-[0.2em] uppercase text-muted-foreground">
            Share · Beautifully
          </p>
        </div>

        {/* Glass hero card */}
        <div className="glass-strong relative w-full overflow-hidden rounded-[32px] p-6 animate-fade-up"
          style={{ animationDelay: "300ms" }}>
          <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-70 blur-2xl animate-aurora"
            style={{ background: "oklch(0.9 0.11 25)" }} />
          <div aria-hidden className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full opacity-60 blur-2xl"
            style={{ background: "oklch(0.88 0.09 340)" }} />

          <div className="relative">
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Welcome</div>
            <h2 className="mt-1 font-display text-3xl italic leading-tight">
              A quieter, warmer place to share.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
 Editorial feeds, thoughtful stories, and Sam as your creative companion.
              Sign in to make it yours.
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}
                className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full text-sm font-medium text-white shadow-lg transition-transform active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}
              >
                <span className="relative">Create account</span>
                <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="glass flex h-12 w-full items-center justify-center rounded-full text-sm font-medium transition-transform active:scale-[0.98]"
              >
                I already have an account
              </Link>
            </div>

            <p className="mt-4 text-center text-[10px] leading-relaxed text-muted-foreground">
              By continuing you agree to our Terms · Privacy
            </p>
          </div>
        </div>

        <div className={`text-[10px] tracking-widest uppercase text-muted-foreground transition-opacity duration-700 ${ready ? "opacity-70" : "opacity-0"}`}>
          crafted with care
        </div>
      </div>
    </div>
  );
}
