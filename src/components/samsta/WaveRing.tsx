import { useId } from "react";

/**
 * Premium "wave border" story ring — an organic, continuously morphing
 * circular outline stroked with a rotating multicolour gradient.
 * The avatar stays perfectly centred and circular inside the wave.
 */

const VIEW = 100;
const CENTER = VIEW / 2;

/** Sample a smooth closed path from a polar radius function. */
function polarPath(radius: (t: number) => number, samples = 72) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < samples; i++) {
    const a = (i / samples) * Math.PI * 2;
    const r = radius(a);
    pts.push([CENTER + Math.cos(a) * r, CENTER + Math.sin(a) * r]);
  }
  // Catmull-Rom -> cubic bezier for a soft, flowing outline.
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length; i++) {
    const p0 = pts[(i - 1 + pts.length) % pts.length];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const p3 = pts[(i + 2) % pts.length];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + "Z";
}

/** Loop-safe keyframes: waves travel around while the ring gently breathes. */
function buildFrames(base: number, amp: number, frames = 24) {
  const out: string[] = [];
  for (let f = 0; f < frames; f++) {
    const p = (f / frames) * Math.PI * 2;
    out.push(
      polarPath((a) => {
        const breathe = Math.sin(p) * amp * 0.35;
        return (
          base +
          breathe +
          Math.sin(a * 6 - p) * amp +
          Math.sin(a * 9 + p * 2) * amp * 0.45
        );
      }),
    );
  }
  out.push(out[0]);
  return out.join(";");
}

const FRAMES = buildFrames(43, 2.2);
const FRAMES_ALT = buildFrames(46, 1.4, 24);
const FIRST = FRAMES.split(";")[0];
const SPLINES = Array.from({ length: 24 }, () => "0.45 0 0.55 1").join(";");

export function WaveRing({
  size = 64,
  active = true,
  className = "",
  children,
}: {
  size?: number;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const uid = useId().replace(/:/g, "");
  const gid = `waveg-${uid}`;
  const inner = Math.round(size * 0.8);

  return (
    <div
      className={`relative ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        width={size}
        height={size}
        className={`absolute inset-0 overflow-visible ${active ? "animate-[wave-breathe_6s_ease-in-out_infinite]" : ""}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.74 0.20 350)" />
            <stop offset="20%" stopColor="oklch(0.64 0.24 305)" />
            <stop offset="42%" stopColor="oklch(0.70 0.19 250)" />
            <stop offset="60%" stopColor="oklch(0.82 0.17 190)" />
            <stop offset="78%" stopColor="oklch(0.88 0.16 95)" />
            <stop offset="90%" stopColor="oklch(0.76 0.19 45)" />
            <stop offset="100%" stopColor="oklch(0.74 0.20 350)" />
            {active && (
              <animateTransform
                attributeName="gradientTransform"
                type="rotate"
                from="0 0.5 0.5"
                to="360 0.5 0.5"
                dur="9s"
                repeatCount="indefinite"
              />
            )}
          </linearGradient>
          <filter id={`${gid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        </defs>

        {active && (
          <g filter={`url(#${gid}-glow)`} opacity="0.55">
            <path d={FIRST} fill="none" stroke={`url(#${gid})`} strokeWidth="4.5" strokeLinejoin="round">
              <animate attributeName="d" values={FRAMES} dur="7s" calcMode="spline"
                keySplines={SPLINES} repeatCount="indefinite" />
            </path>
          </g>
        )}

        <path
          d={FIRST}
          fill="none"
          stroke={active ? `url(#${gid})` : "currentColor"}
          strokeWidth={active ? 2.6 : 2.2}
          strokeLinejoin="round"
          className={active ? "" : "text-muted-foreground/30"}
        >
          {active && (
            <animate attributeName="d" values={FRAMES} dur="7s" calcMode="spline"
              keySplines={SPLINES} repeatCount="indefinite" />
          )}
        </path>

        {active && (
          <path
            d={FIRST}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth="1"
            strokeLinecap="round"
            strokeDasharray="10 44"
            opacity="0.9"
          >
            <animate attributeName="d" values={FRAMES_ALT} dur="11s" calcMode="spline"
              keySplines={SPLINES} repeatCount="indefinite" />
            <animate attributeName="stroke-dashoffset" from="0" to="-270" dur="4.5s" repeatCount="indefinite" />
          </path>
        )}
      </svg>
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-background ring-1 ring-background"
        style={{ width: inner, height: inner }}
      >
        {children}
      </div>
    </div>
  );
}

