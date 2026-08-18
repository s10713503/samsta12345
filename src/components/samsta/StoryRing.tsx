/**
 * Premium glass-morphism story ring — a floating, translucent halo with
 * soft blush, champagne and ivory tones. When a new story has just been uploaded
 * the ring flashes with a small, premium blink-blink animation.
 */
export function StoryRing({
  size = 56,
  active = true,
  isNew = false,
  className = "",
  children,
}: {
  size?: number;
  active?: boolean;
  isNew?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const inner = Math.round(size * 0.8);

  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer glass aura — tight, soft bloom when brand new */}
      <div
        className={`absolute inset-[-4px] rounded-full ${isNew ? "glass-story-glow-new" : active ? "glass-story-glow-active" : "glass-story-glow"}`}
        style={{
          animation: isNew
            ? "story-new-blink 1.2s ease-in-out infinite"
            : active
              ? "story-glass-pulse 3s ease-in-out infinite"
              : "none",
          opacity: isNew ? 0.85 : active ? 0.65 : 0.25,
        }}
      />

      {/* Main frosted glass ring — richest color when new */}
      <div
        className={`absolute inset-0 rounded-full ${isNew ? "glass-story-ring-new" : active ? "glass-story-ring-active" : "glass-story-ring"}`}
        style={{
          animation: isNew
            ? "story-new-ring-blink 1.6s ease-in-out infinite"
            : active
              ? "story-active-breathe 7s ease-in-out infinite"
              : "story-ring 9s linear infinite",
          opacity: isNew ? 1 : active ? 1 : 0.55,
        }}
      />

      {/* Floating light sweep — brightest when new */}
      <div
        className={`absolute inset-0 rounded-full ${isNew ? "glass-story-sheen-new" : active ? "glass-story-sheen-active" : "glass-story-sheen"}`}
        style={{
          animation: isNew
            ? "story-glass-sheen 1.6s linear infinite"
            : active
              ? "story-glass-sheen 3s linear infinite"
              : "none",
          opacity: isNew ? 1 : active ? 1 : 0.55,
        }}
      />

      {/* Inner depth ring for 3D glass layering */}
      <div
        className="absolute inset-[2px] rounded-full glass-story-depth"
        style={{
          animation: "story-ring 12s linear infinite reverse",
          opacity: isNew ? 0.35 : active ? 0.25 : 0.15,
        }}
      />

      {/* Avatar well — frosted glass edge on the inner rim */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-background/85 ring-[1.5px] ring-white/40 backdrop-blur-md"
        style={{
          width: inner,
          height: inner,
          animation: isNew ? "story-new-blink 1.2s ease-in-out infinite" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

