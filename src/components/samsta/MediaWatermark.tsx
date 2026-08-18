import { cn } from "@/lib/utils";
import mark from "@/assets/samsta-mark.png";

type Props = {
  /** Username / handle of the uploader */
  username?: string | null;
  /** Placement inside the media frame */
  position?: "top-right" | "bottom-left" | "bottom-right" | "top-left";
  size?: "sm" | "md";
  className?: string;
};

const POS: Record<NonNullable<Props["position"]>, string> = {
  "top-right": "right-2.5 top-2.5",
  "top-left": "left-2.5 top-2.5",
  "bottom-right": "right-2.5 bottom-2.5",
  "bottom-left": "left-2.5 bottom-2.5",
};

/**
 * Premium glassmorphism watermark: Samsta mark + uploader handle.
 * Purely presentational overlay shown on every shared post / reel / image.
 */
export function MediaWatermark({
  username,
  position = "top-right",
  size = "md",
  className,
}: Props) {
  const handle = (username ?? "samsta").replace(/^@/, "");
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute z-[4] animate-fade-up select-none",
        POS[position],
        className,
      )}
    >
      <div
        className={cn(
          "relative flex items-center gap-1.5 overflow-hidden rounded-full",
          "bg-white/12 backdrop-blur-md ring-1 ring-white/25",
          "shadow-[0_6px_20px_-8px_oklch(0_0_0/0.7)]",
          size === "sm" ? "px-2 py-1" : "px-2.5 py-1.5",
        )}
      >
        {/* moving sheen */}
        <span
          className="absolute inset-0 animate-wm-sheen"
          style={{
            background:
              "linear-gradient(110deg, transparent 35%, oklch(1 0 0 / 0.45) 50%, transparent 65%)",
            backgroundSize: "220% 100%",
          }}
        />
        {/* gold rim */}
        <span
          className="absolute inset-0 rounded-full opacity-70"
          style={{ boxShadow: "inset 0 0 0 1px oklch(0.85 0.11 85 / 0.45)" }}
        />
        <img
          src={mark}
          alt=""
          loading="lazy"
          width={512}
          height={512}
          className={cn("relative animate-orb", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")}
        />
        <span
          className={cn(
            "relative font-semibold tracking-tight text-white drop-shadow",
            size === "sm" ? "text-[9px]" : "text-[10px]",
          )}
        >
          <span className="opacity-95">@{handle}</span>
          <span className="mx-1 opacity-50">·</span>
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, oklch(0.92 0.09 85), oklch(0.86 0.1 25))",
            }}
          >
            Samsta
          </span>
        </span>
      </div>
    </div>
  );
}
