// @ts-nocheck
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CAPABILITIES } from "@/lib/agent/registry";
import {
  ULTRA_GRANTS,
  ULTRA_PRICE_INR,
  getGrants,
  getUltra,
  requestNative,
  setGrant,
  setUltra,
  setHandsFree,
  notificationState,
  enableNotifications,
} from "@/lib/agent/ultra";

export const Route = createFileRoute("/agent/ultra")({
  head: () => ({
    meta: [
      { title: "Sam AI Premium Ultra — your personal execution engine" },
      { name: "description", content: "Unlock hands-free Sam AI Ultra: continuous listening, auto-execution of permitted tasks, and app-level actions across WhatsApp, Maps, Play Store, rides and food — always inside OS security rules." },
      { property: "og:title", content: "Sam AI Premium Ultra" },
      { property: "og:description", content: "Hands-free, permission-first AI that plans and executes real tasks on your phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UltraPage,
});

const STEPS = ["Plan", "Permissions", "Ready"] as const;

function UltraPage() {
  const nav = useNavigate();
  const already = getUltra().active;
  const [step, setStep] = useState(already ? 2 : 0);
  const [grants, setGrants] = useState<Record<string, boolean>>(getGrants());
  const [busy, setBusy] = useState<string | null>(null);

  const ultraCaps = CAPABILITIES.filter((c) => c.ultra);
  const grantedCount = ULTRA_GRANTS.filter((g) => grants[g.id]).length;

  async function grant(id: string) {
    const g = ULTRA_GRANTS.find((x) => x.id === id)!;
    setBusy(id);
    const res = await requestNative(g);
    setBusy(null);
    if (!res.ok) { toast.error(res.note); return; }
    setGrants(setGrant(id, true));
  }

  function activate() {
    setHandsFree(true); // Ultra is always-listening by default — no tap to speak.
    void enableNotifications().then((r) => { if (!r.ok) toast.error(r.note, { duration: 8000 }); });
    setUltra(true);
    setStep(2);
    toast.success("Sam AI Ultra is active.");
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-32">
      <header className="flex items-center justify-between">
        <Link to="/agent" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
        <span className="glass rounded-full px-3 py-1.5 text-[11px] uppercase tracking-wide">Premium Ultra</span>
      </header>

      <div className="mt-6 flex gap-2">
        {STEPS.map((s, i) => (
          <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      {step === 0 && (
        <section className="mt-8">
          <span
            className="flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, oklch(0.86 0.10 25), oklch(0.80 0.12 340))" }}
          >
            <Sparkles className="h-6 w-6 text-primary-foreground" strokeWidth={1.8} />
          </span>
          <h1 className="font-display mt-4 text-4xl leading-tight">Sam AI Ultra</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Stop operating your phone. Speak once — Sam understands Hindi, Hinglish, Gujarati and English,
            plans the task, and carries it as far as your phone's security allows.
          </p>

          <p className="font-display mt-6 text-3xl">
            ₹{ULTRA_PRICE_INR.toLocaleString("en-IN")}
            <span className="text-base text-muted-foreground"> /month</span>
          </p>

          <ul className="mt-6 space-y-2 text-sm">
            {[
              "Hands-free continuous listening — no tap needed",
              "Auto-execution of every action you've already permitted",
              "WhatsApp, Gmail, Play Store, Uber, Ola, Swiggy, Zomato, Spotify",
              "Conversation memory and a full audit trail of every action",
              "High-risk actions always ask you first — never silently",
            ].map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="glass mt-6 rounded-3xl p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4" /> What Ultra will never do</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Android and iOS keep some steps in your hands by design — installing an app, sending a message,
              confirming an order, changing system settings, and every payment. Sam does everything up to that
              point and tells you plainly when the OS needs your tap. Sam never asks for, types or stores a
              UPI PIN, CVV, OTP, password or biometric. Any app that claims otherwise is unsafe.
            </p>
          </div>

          <button onClick={() => setStep(1)} className="mt-6 w-full rounded-full bg-primary px-5 py-3.5 text-sm text-primary-foreground">
            Unlock Ultra — ₹{ULTRA_PRICE_INR.toLocaleString("en-IN")}/month
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">Cancel any time. Permissions revocable in one tap.</p>
        </section>
      )}

      {step === 1 && (
        <section className="mt-8">
          <h1 className="font-display text-3xl leading-tight">Secure activation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One permission at a time. Sam explains why it's needed and what it still can't do. {grantedCount}/{ULTRA_GRANTS.length} granted.
          </p>

          <div className="mt-6 space-y-3">
            {ULTRA_GRANTS.map((g) => {
              const on = !!grants[g.id];
              return (
                <div key={g.id} className="glass rounded-3xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-base font-medium">{g.label}</h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">{g.why}</p>
                    </div>
                    <button
                      onClick={() => (on ? setGrants(setGrant(g.id, false)) : grant(g.id))}
                      disabled={busy === g.id}
                      className={`shrink-0 rounded-full px-3.5 py-2 text-xs ${on ? "bg-primary text-primary-foreground" : "border border-border"}`}
                    >
                      {busy === g.id ? "Asking…" : on ? "Granted" : "Allow"}
                    </button>
                  </div>
                  <p className="mt-3 rounded-2xl bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">{g.limit}</p>
                  {g.native === "notifications" && notificationState() === "denied" && (
                    <p className="mt-2 rounded-2xl bg-destructive/10 p-3 text-[11px] leading-relaxed text-destructive">
                      Your browser has blocked notifications for Samsta, so the Allow button can't ask again.
                      Tap the lock icon next to the address bar → Permissions → Notifications → Allow, then reload this page.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={activate}
            disabled={grantedCount === 0}
            className="mt-6 w-full rounded-full bg-primary px-5 py-3.5 text-sm text-primary-foreground disabled:opacity-40"
          >
            Activate Sam AI Ultra
          </button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            You can skip any permission — Sam simply won't offer the actions that need it.
          </p>
        </section>
      )}

      {step === 2 && (
        <section className="mt-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <Check className="h-7 w-7 text-primary" />
          </span>
          <h1 className="font-display mt-4 text-3xl leading-tight">Ultra is live</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Just talk. Sam plans, checks your permissions and executes — and stops to ask only when it matters.
          </p>

          <h2 className="mt-6 text-sm font-medium">Unlocked with Ultra</h2>
          <ul className="mt-3 space-y-2">
            {ultraCaps.map((c) => (
              <li key={c.key} className="glass rounded-2xl p-3 text-[11px] leading-relaxed">
                <p className="text-sm">{c.emoji} {c.label}</p>
                <p className="mt-1 text-muted-foreground"><strong className="text-foreground/80">Can:</strong> {c.can}</p>
                <p className="text-muted-foreground"><strong className="text-foreground/80">Cannot:</strong> {c.cannot}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex gap-2">
            <button onClick={() => { setUltra(false); setStep(0); }} className="flex-1 rounded-full border border-border px-4 py-3 text-sm">
              <Lock className="mr-1.5 inline h-3.5 w-3.5" /> Turn Ultra off
            </button>
            <button onClick={() => nav({ to: "/agent" })} className="flex-1 rounded-full bg-primary px-4 py-3 text-sm text-primary-foreground">
              Start talking
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
