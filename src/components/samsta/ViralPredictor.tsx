import { useState } from "react";
import { Sparkles, Loader2, TrendingUp, Clock, Wand2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { predictPost, type PredictResult, type PredictInput } from "@/lib/predict.functions";

const tierColor: Record<PredictResult["tier"], string> = {
  "Very Strong": "linear-gradient(135deg, oklch(0.82 0.16 145), oklch(0.72 0.18 155))",
  "Strong":      "linear-gradient(135deg, oklch(0.82 0.14 175), oklch(0.75 0.15 190))",
  "Moderate":    "linear-gradient(135deg, oklch(0.85 0.13 85), oklch(0.78 0.14 65))",
  "Low":         "linear-gradient(135deg, oklch(0.82 0.13 40), oklch(0.75 0.14 25))",
  "Very Low":    "linear-gradient(135deg, oklch(0.75 0.14 25), oklch(0.65 0.16 15))",
};

function Ring({ value, size = 96, label }: { value: number; size?: number; label: string }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  const dash = c * (value / 100);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} strokeWidth={6} className="fill-none stroke-muted" />
          <circle
            cx={size/2} cy={size/2} r={r} strokeWidth={6}
            strokeLinecap="round"
            className="fill-none transition-all duration-700"
            stroke="url(#viralGrad)"
            strokeDasharray={`${dash} ${c}`}
          />
          <defs>
            <linearGradient id="viralGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="oklch(0.78 0.15 20)" />
              <stop offset="1" stopColor="oklch(0.72 0.17 320)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl italic">{value}</span>
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">%</span>
        </div>
      </div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${value}%`,
            background: "linear-gradient(90deg, oklch(0.78 0.15 20), oklch(0.72 0.17 320))",
          }}
        />
      </div>
    </div>
  );
}

export function ViralPredictor({
  input,
  onApplyCaption,
}: {
  input: PredictInput;
  onApplyCaption?: (caption: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [open, setOpen] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await predictPost({ data: input });
      setResult(r);
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={run}
        disabled={loading}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium text-white shadow-lg transition active:scale-[0.98] disabled:opacity-70"
        style={{ background: "linear-gradient(135deg, oklch(0.78 0.15 20), oklch(0.72 0.17 320))" }}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? "Consulting Future+…" : "Predict virality before posting"}
      </button>

      {open && result && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-strong relative flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl animate-fade-up"
          >
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60 backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="overflow-y-auto px-5 pb-6 pt-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-muted-foreground">
                <Sparkles className="h-3 w-3" /> Future+· World's first
              </div>
              <h3 className="font-display text-2xl italic leading-tight mt-1">Your post forecast</h3>

              <div className="mt-4 flex items-center justify-between gap-4">
                <Ring value={result.viralProbability} label="Viral probability" />
                <div className="flex-1">
                  <div
                    className="rounded-2xl px-3 py-2 text-white shadow-md"
                    style={{ background: tierColor[result.tier] }}
                  >
                    <div className="text-[10px] uppercase tracking-widest opacity-80">Predicted tier</div>
                    <div className="font-display text-xl italic leading-tight">{result.tier}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Reach {result.reachEstimate.low.toLocaleString()}–{result.reachEstimate.high.toLocaleString()}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Best time · {result.bestPostTime.weekday} {result.bestPostTime.time} IST
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <Bar value={result.captionScore} label="Caption strength" />
                <Bar value={result.hookScore} label="Hook / opening line" />
                <Bar value={result.thumbnailScore} label="Thumbnail / first frame appeal" />
              </div>

              {result.strengths.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Strengths</div>
                  <ul className="space-y-1.5 text-sm">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.improvements.length > 0 && (
                <div className="mt-4">
                  <div className="mb-2 text-[11px] uppercase tracking-widest text-muted-foreground">Improvements</div>
                  <ul className="space-y-1.5 text-sm">
                    {result.improvements.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.betterCaption && (
                <div className="mt-5 rounded-2xl border border-border p-3">
                  <div className="mb-1 text-[11px] uppercase tracking-widest text-muted-foreground">
 improved caption
                  </div>
                  <p className="text-sm leading-relaxed">{result.betterCaption}</p>
                  {onApplyCaption && (
                    <button
                      onClick={() => {
                        onApplyCaption(result.betterCaption);
                        toast.success("Caption applied");
                        setOpen(false);
                      }}
                      className="mt-3 w-full rounded-full py-2 text-sm font-medium text-white"
                      style={{ background: "linear-gradient(135deg, oklch(0.78 0.15 20), oklch(0.72 0.17 320))" }}
                    >
                      Use this caption
                    </button>
                  )}
                </div>
              )}

              <p className="mt-4 text-center text-[10px] italic text-muted-foreground">
 Estimates— not guarantees. Future+ is an experimental forecast.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}