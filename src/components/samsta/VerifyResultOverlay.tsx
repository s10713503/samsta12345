import { useEffect } from "react";
import { BadgeCheck, ShieldAlert, Sparkles } from "lucide-react";

export function VerifyResultOverlay({
  state,
  title,
  reason,
  confidence,
  onDone,
}: {
  state: "success" | "fail";
  title: string;
  reason: string;
  confidence?: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, state === "success" ? 2600 : 2800);
    return () => clearTimeout(t);
  }, [state, onDone]);

  const ok = state === "success";
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-6"
      style={{ background: "oklch(0.25 0.03 15 / 0.55)", backdropFilter: "blur(14px)" }}
      onClick={onDone}
      role="alertdialog"
      aria-live="assertive"
    >
      <div
        className="verify-pop relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/70 p-7 text-center shadow-[0_30px_80px_-30px_oklch(0.4_0.15_15/0.6)]"
        style={{ background: "linear-gradient(160deg, oklch(1 0 0 / 0.94), oklch(0.97 0.02 20 / 0.9))" }}
      >
        <div
          className="verify-sheen pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(105deg, transparent 35%, oklch(1 0 0 / 0.75) 50%, transparent 65%)" }}
        />
        {ok && (
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 14 }).map((_, i) => (
              <span
                key={i}
                className="verify-spark absolute h-1.5 w-1.5 rounded-full"
                style={{
                  left: `${8 + (i * 6.4) % 84}%`,
                  top: `${12 + (i * 37) % 70}%`,
                  background: i % 2 ? "oklch(0.85 0.14 85)" : "oklch(0.78 0.13 15)",
                  animationDelay: `${i * 90}ms`,
                }}
              />
            ))}
          </div>
        )}

        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span
            className="verify-ring absolute inset-0 rounded-full"
            style={{
              background: ok
                ? "conic-gradient(from 0deg, oklch(0.86 0.09 175), oklch(0.88 0.11 85), oklch(0.78 0.13 15), oklch(0.86 0.09 175))"
                : "conic-gradient(from 0deg, oklch(0.75 0.18 25), oklch(0.62 0.2 15), oklch(0.75 0.18 25))",
              mask: "radial-gradient(circle, transparent 62%, black 64%)",
              WebkitMask: "radial-gradient(circle, transparent 62%, black 64%)",
            }}
          />
          <span
            className="verify-badge flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg"
            style={{
              background: ok
                ? "linear-gradient(135deg, oklch(0.86 0.09 175), oklch(0.8 0.12 190))"
                : "linear-gradient(135deg, oklch(0.75 0.17 25), oklch(0.62 0.2 12))",
            }}
          >
            {ok ? <BadgeCheck className="h-8 w-8" strokeWidth={2.4} /> : <ShieldAlert className="h-8 w-8" strokeWidth={2.4} />}
          </span>
        </div>

        <div className="relative mt-5 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "oklch(0.55 0.1 15)" }}>
          <Sparkles className="h-3 w-3" /> Samsta Premium Verification
        </div>
        <div className="relative mt-1 font-display text-2xl italic" style={{ color: "oklch(0.4 0.05 15)" }}>
          {ok ? "Credentials verified" : "Wrong credentials"}
        </div>
        <div className="relative mt-1 text-[12px] font-semibold" style={{ color: "oklch(0.5 0.04 15)" }}>{title}</div>
        <div className="relative mt-2 text-[11px] text-muted-foreground">{reason}</div>

        {typeof confidence === "number" && confidence > 0 && (
          <div className="relative mx-auto mt-4 h-1.5 w-40 overflow-hidden rounded-full" style={{ background: "oklch(0.94 0.02 20)" }}>
            <span
              className="verify-bar block h-full rounded-full"
              style={{
                width: `${confidence}%`,
                background: ok
                  ? "linear-gradient(90deg, oklch(0.86 0.09 175), oklch(0.88 0.11 85))"
                  : "linear-gradient(90deg, oklch(0.75 0.17 25), oklch(0.62 0.2 12))",
              }}
            />
          </div>
        )}
        <div className="relative mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Tap to close</div>
      </div>
    </div>
  );
}
