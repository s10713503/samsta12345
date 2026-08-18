// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Lock, Eye, EyeOff, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Reset password — Samsta" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery hash and fires PASSWORD_RECOVERY / SIGNED_IN
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().min(8, "Minimum 8 characters").safeParse(pw);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data });
      if (error) throw error;
      toast.success("Password updated");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-6 pb-24 pt-14">
      <h1 className="font-display text-3xl italic">Set a new password</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {ready ? "Enter a new password to finish." : "Waiting for a valid recovery link…"}
      </p>
      <form onSubmit={onSubmit} className="mt-8">
        <label className="mb-3 block">
          <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-muted-foreground">New password</span>
          <div className={cn("glass flex items-center gap-2 rounded-2xl px-3 py-2.5")}>
            <Lock className="h-4 w-4 text-muted-foreground" />
            <input
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            <button type="button" onClick={() => setShow((v) => !v)} className="text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <button
          type="submit"
          disabled={busy || !ready}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-medium text-white disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><Sparkles className="h-4 w-4" /><span>Update password</span></>)}
        </button>
      </form>
    </div>
  );
}
