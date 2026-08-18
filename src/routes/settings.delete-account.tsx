// @ts-nocheck
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Trash2, Loader2, ShieldAlert, Clock, Pause, Check } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyAccount, deactivateAccount, scheduleDeletion, verifyPassword,
  sendDeleteOtp, verifyDeleteOtp,
} from "@/lib/api/settings";
import { deleteMyAccount } from "@/lib/account.functions";

export const Route = createFileRoute("/settings/delete-account")({
  component: DeleteAccountPage,
  head: () => ({
    meta: [
      { title: "Delete account · Samsta" },
      { name: "description", content: "Deactivate, schedule deletion in 30 days, or permanently delete your Samsta account and all of your content." },
      { property: "og:title", content: "Delete account · Samsta" },
      { property: "og:description", content: "Deactivate or permanently delete your Samsta account and content." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted-foreground">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-foreground/30"
      />
    </label>
  );
}

function DeleteAccountPage() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("choose");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const accountQ = useQuery({
    queryKey: ["my-account", user?.id],
    queryFn: () => getMyAccount(user.id),
    enabled: !!user,
  });

  const email = accountQ.data?.email ?? user?.email ?? "";

  async function runInstantDelete() {
    setBusy(true);
    try {
      await deleteMyAccount();
      await supabase.auth.signOut();
      localStorage.clear();
      toast.success("Your account and all content were deleted");
      navigate({ to: "/auth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] px-4 pb-28 pt-5">
      <div className="mb-5 flex items-center gap-3">
        <Link to="/settings" className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Back to settings">
          <ArrowLeft className="h-4.5 w-4.5" strokeWidth={1.8} />
        </Link>
        <div>
          <h1 className="font-display text-2xl italic leading-none">Delete account</h1>
          <p className="mt-1 text-[11px] text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="glass mb-3 rounded-3xl p-4">
        <div className="mb-2 flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-4.5 w-4.5" strokeWidth={1.8} />
          <span className="text-sm font-semibold">What gets removed</span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Your posts, reels, stories, podcasts, messages, followers, following, likes, comments,
          saved items and settings are deleted. Your username is released and cannot be recovered.
        </p>
      </div>

      {step === "choose" && (
        <div className="animate-fade-in flex flex-col gap-3">
          <button
            onClick={async () => {
              await deactivateAccount();
              accountQ.refetch();
              toast.success("Account deactivated — sign in again to restore it");
            }}
            className="glass flex items-start gap-3 rounded-3xl p-4 text-left active:scale-[0.99]"
          >
            <Pause className="mt-0.5 h-4.5 w-4.5" strokeWidth={1.8} />
            <span>
              <span className="block text-sm font-semibold">Deactivate instead</span>
              <span className="block text-[11px] text-muted-foreground">Hides your profile and content until you sign back in. Nothing is deleted.</span>
            </span>
          </button>

          <button
            onClick={async () => {
              await scheduleDeletion();
              accountQ.refetch();
              toast.success("Deletion scheduled in 30 days — sign in to cancel");
            }}
            className="glass flex items-start gap-3 rounded-3xl p-4 text-left active:scale-[0.99]"
          >
            <Clock className="mt-0.5 h-4.5 w-4.5" strokeWidth={1.8} />
            <span>
              <span className="block text-sm font-semibold">Delete after 30 days</span>
              <span className="block text-[11px] text-muted-foreground">Recoverable — just sign in before the 30 days end to cancel.</span>
            </span>
          </button>

          <button
            onClick={() => setStep("password")}
            className="flex items-start gap-3 rounded-3xl bg-destructive/10 p-4 text-left text-destructive active:scale-[0.99]"
          >
            <Trash2 className="mt-0.5 h-4.5 w-4.5" strokeWidth={1.8} />
            <span>
              <span className="block text-sm font-semibold">Delete permanently now</span>
              <span className="block text-[11px] opacity-80">Requires your password and an emailed verification code. Irreversible.</span>
            </span>
          </button>
        </div>
      )}

      {step === "password" && (
        <div className="glass animate-fade-in flex flex-col gap-2 rounded-3xl p-4">
          <Field label="Confirm your password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button
            disabled={busy || !password}
            onClick={async () => {
              setBusy(true);
              const ok = await verifyPassword(email, password);
              setBusy(false);
              if (!ok) return toast.error("Password is incorrect");
              try {
                await sendDeleteOtp(email);
                toast.success("Verification code sent to your email");
              } catch {
                toast.message("Continue to final confirmation");
              }
              setStep("otp");
            }}
            className="rounded-2xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {busy ? "Checking…" : "Continue"}
          </button>
          <button onClick={() => setStep("choose")} className="py-2 text-xs text-muted-foreground">Back</button>
        </div>
      )}

      {step === "otp" && (
        <div className="glass animate-fade-in flex flex-col gap-2 rounded-3xl p-4">
          <Field label="Email verification code" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" />
          <button
            disabled={busy || otp.trim().length < 6}
            onClick={async () => {
              setBusy(true);
              const ok = await verifyDeleteOtp(email, otp.trim());
              setBusy(false);
              if (!ok) return toast.error("That code isn't valid");
              setStep("final");
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Verify code
          </button>
          <button onClick={() => setStep("choose")} className="py-2 text-xs text-muted-foreground">Cancel</button>
        </div>
      )}

      {step === "final" && (
        <div className="glass animate-fade-in flex flex-col gap-2 rounded-3xl p-4">
          <p className="rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">
            This cannot be undone. Everything is deleted immediately.
          </p>
          <button
            disabled={busy}
            onClick={runInstantDelete}
            className="flex items-center justify-center gap-2 rounded-2xl bg-destructive py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete everything now
          </button>
          <button onClick={() => setStep("choose")} className="py-2 text-xs text-muted-foreground">Keep my account</button>
        </div>
      )}

      <Link to="/settings" className="mt-6 block text-center text-xs text-muted-foreground">
        Back to settings
      </Link>
    </div>
  );
}
