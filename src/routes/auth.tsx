// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, Loader2, Mail, Lock, User, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { cn } from "@/lib/utils";
import { markWelcomeVoicePending } from "@/components/samsta/WelcomeVoice";
import { ensureProfile } from "@/lib/api/profile-sync";


const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).catch("signin"),
});

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in or create your account — Samsta" },
      { name: "description", content: "Sign in to Samsta or create a free account to share photos, reels and stories on a calm, ad-light social feed with Sam built in." },
      { property: "og:title", content: "Sign in or create your account — Samsta" },
      { property: "og:description", content: "Join Samsta— a quietly premium social space for sharing photos, reels and stories, with Sam built in." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://samstaofficial.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://samstaofficial.lovable.app/auth" }],
  }),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Minimum 8 characters").max(128),
});

const signinSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // If already signed in, bounce home
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      if (isSignup) {
        const parsed = signupSchema.safeParse({ fullName, email, password });
        if (!parsed.success) {
          const fe: Record<string, string> = {};
          for (const i of parsed.error.issues) fe[i.path[0] as string] = i.message;
          setErrors(fe);
          return;
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { full_name: parsed.data.fullName },
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (error) {
          // Email already has an account — try signing them in with what they typed.
          const already = /already/i.test(error.message);
          if (!already) throw error;
          const { error: siErr } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });
          if (siErr) {
            toast.error("This email already has an account. Sign in, or use “Forgot your password?” to reset it.");
            navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
            return;
          }
        } else if (!signUpData.session) {
          // Accounts are confirmed instantly, so sign in right away when the
          // sign-up response didn't already carry a session.
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: parsed.data.email,
            password: parsed.data.password,
          });
          if (signInError) {
            toast.success("Account created — please sign in to continue");
            navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
            return;
          }
        }

        await ensureProfile();
        markWelcomeVoicePending();
        toast.success("Welcome to Samsta");
        navigate({ to: "/", replace: true });


      } else {
        const parsed = signinSchema.safeParse({ email, password });
        if (!parsed.success) {
          const fe: Record<string, string> = {};
          for (const i of parsed.error.issues) fe[i.path[0] as string] = i.message;
          setErrors(fe);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        await ensureProfile();
        markWelcomeVoicePending();
        toast.success("Welcome back");
        navigate({ to: "/", replace: true });


      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong";
      const msg = /invalid login credentials/i.test(raw)
        ? "Email or password is incorrect. Check your password, or tap “Forgot your password?” below."
        : /email not confirmed/i.test(raw)
          ? "Your email isn't confirmed yet — try signing in again in a moment."
          : raw;
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }


  async function handleGoogle() {
    setOauthBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
        return;
      }
      if (result.redirected) return; // browser will navigate
      await ensureProfile();
      navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setOauthBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Aurora backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-20 h-[440px] w-[440px] rounded-full opacity-70 blur-3xl animate-aurora"
          style={{ background: "radial-gradient(circle, oklch(0.9 0.11 25) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -left-20 h-[440px] w-[440px] rounded-full opacity-60 blur-3xl animate-aurora"
          style={{ background: "radial-gradient(circle, oklch(0.86 0.1 250) 0%, transparent 70%)", animationDelay: "1.6s" }} />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/welcome" aria-label="Back"
            className="glass flex h-10 w-10 items-center justify-center rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link to="/welcome" className="font-display text-2xl italic text-gradient">Samsta</Link>
          <div className="h-10 w-10" />
        </div>

        {/* Title */}
        <div className="mt-8 animate-fade-up">
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {isSignup ? "Create account" : "Sign in"}
          </div>
          <h1 className="mt-1 font-display text-4xl italic leading-tight">
            {isSignup ? "Begin your Samsta." : "Welcome back."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isSignup
              ? "Just three things — that's all we need."
              : "Sign in to pick up where you left off."}
          </p>
        </div>

        {/* Glass form card */}
        <form
          onSubmit={handleSubmit}
          className="glass-strong relative mt-6 overflow-hidden rounded-[28px] p-5 animate-fade-up"
          style={{ animationDelay: "150ms" }}
        >
          <div aria-hidden className="absolute -right-14 -top-14 h-40 w-40 rounded-full opacity-70 blur-2xl animate-aurora"
            style={{ background: "oklch(0.9 0.11 25)" }} />

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={oauthBusy || busy}
            className="glass relative flex h-12 w-full items-center justify-center gap-3 rounded-2xl text-sm font-medium transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {oauthBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.7 14.7 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12s4.2 9.3 9.3 9.3c5.4 0 8.9-3.8 8.9-9.1 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>or with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {isSignup && (
            <Field
              icon={<User className="h-4 w-4" />}
              label="Full name"
              value={fullName}
              onChange={setFullName}
              placeholder="Ada Lovelace"
              autoComplete="name"
              error={errors.fullName}
            />
          )}
          <Field
            icon={<Mail className="h-4 w-4" />}
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@samsta.app"
            autoComplete="email"
            error={errors.email}
          />
          <Field
            icon={<Lock className="h-4 w-4" />}
            label="Password"
            type={showPass ? "text" : "password"}
            value={password}
            onChange={setPassword}
            placeholder={isSignup ? "At least 8 characters" : "Your password"}
            autoComplete={isSignup ? "new-password" : "current-password"}
            error={errors.password}
            trailing={
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <button
            type="submit"
            disabled={busy || oauthBusy}
            className="group relative mt-2 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-sm font-medium text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>{isSignup ? "Create my account" : "Sign in"}</span>
              </>
            )}
          </button>

          {!isSignup && (
            <button
              type="button"
              onClick={async () => {
                const parsed = z.string().email().safeParse(email.trim());
                if (!parsed.success) { toast.error("Enter your email above first"); return; }
                const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
                  redirectTo: `${window.location.origin}/reset-password`,
                });
                if (error) toast.error(error.message);
                else toast.success("Check your email for a reset link");
              }}
              className="mt-3 block w-full text-center text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot your password?
            </button>
          )}


          <div className="mt-5 text-center text-xs text-muted-foreground">
            {isSignup ? (
              <>
                Already on Samsta?{" "}
                <Link to="/auth" search={{ mode: "signin" }} className="font-medium text-foreground underline underline-offset-4">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link to="/auth" search={{ mode: "signup" }} className="font-medium text-foreground underline underline-offset-4">
                  Create an account
                </Link>
              </>
            )}
          </div>
        </form>

        <p className="mt-auto pt-6 text-center text-[10px] tracking-widest uppercase text-muted-foreground">
          Samsta · quietly luxurious
        </p>
      </div>
    </div>
  );
}

function Field({
  icon, label, value, onChange, placeholder, type = "text", autoComplete, error, trailing,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  error?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className={cn(
        "glass flex items-center gap-2 rounded-2xl px-3 py-2.5 transition-colors",
        error && "ring-1 ring-destructive/60"
      )}>
        <span className="text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
        />
        {trailing}
      </div>
      {error && <div className="mt-1 text-[11px] text-destructive">{error}</div>}
    </label>
  );
}
