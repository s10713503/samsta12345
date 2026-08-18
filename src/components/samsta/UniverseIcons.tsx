/** Bespoke animated icons for Sam's Universe modules. */

export function CareerOrbitIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* case body */}
      <rect x="3" y="8" width="18" height="12" rx="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 8V6.5A2.5 2.5 0 0 1 11.5 4h1A2.5 2.5 0 0 1 15 6.5V8"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* scanning latch line */}
      <path d="M3 13h18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"
        className="animate-icon-scan" opacity="0.85" />
      {/* growth spark */}
      <path d="M7.5 17.2l2.6-2.6 2 2 4.4-4.4" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" className="animate-icon-draw" />
      <circle cx="16.6" cy="12.1" r="1.5" fill="currentColor" className="animate-icon-ping" />
    </svg>
  );
}

export function EducationBeaconIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* mortarboard */}
      <path d="M2.8 9.2 12 5l9.2 4.2-9.2 4.2L2.8 9.2Z" stroke="currentColor" strokeWidth="1.6"
        strokeLinejoin="round" className="animate-icon-tilt" style={{ transformOrigin: "12px 9px" }} />
      <path d="M6.4 11.1v4.1c0 1.6 2.5 2.9 5.6 2.9s5.6-1.3 5.6-2.9v-4.1"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {/* tassel */}
      <path d="M20.4 9.7v4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="20.4" cy="15" r="1.25" fill="currentColor" className="animate-icon-swing"
        style={{ transformOrigin: "20.4px 10px" }} />
      {/* knowledge sparks */}
      <circle cx="5" cy="19" r="1" fill="currentColor" className="animate-icon-ping" opacity="0.7" />
    </svg>
  );
}
