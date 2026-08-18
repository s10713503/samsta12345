import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import orb from "@/assets/sam-orb.png";
import { cn } from "@/lib/utils";

export function SamFab() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // In the reels player the right rail (like/comment/share) owns the right edge,
  // so the orb slides to the bottom-left and returns on the way out.
  const inReels = pathname.startsWith("/reels") || pathname.startsWith("/edu-reels") || pathname.startsWith("/career/reels");

  // Free-drag position (only used inside reels); null = default anchored spot.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const start = useRef({ x: 0, y: 0 });

  // Leaving reels snaps the orb back to its initial position.
  useEffect(() => { if (!inReels) setPos(null); }, [inReels]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!inReels) return;
    dragging.current = true;
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (!moved.current && Math.hypot(dx, dy) < 5) return;
    moved.current = true;
    const half = 28;
    setPos({
      x: Math.min(Math.max(e.clientX, half), window.innerWidth - half),
      y: Math.min(Math.max(e.clientY, half), window.innerHeight - half),
    });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    dragging.current = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  if (pathname.startsWith("/agent") || pathname.startsWith("/sam") || pathname.startsWith("/welcome") || pathname.startsWith("/auth")) return null;

  const dragged = inReels && pos !== null;

  return (
    <Link
      to="/sam"
      aria-label="Chat with Sam"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={(e) => { if (moved.current) { e.preventDefault(); moved.current = false; } }}
      className={cn(
        "fixed z-40 flex h-14 w-14 items-center justify-center rounded-full active:scale-90 touch-none",
        dragged ? "left-0 top-0" : "bottom-0 right-5",
        dragged ? "" : "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
      )}
      style={{
        filter: "drop-shadow(0 10px 24px oklch(0.7 0.12 20 / 0.35))",
        transform: dragged
          ? `translate(${pos!.x - 28}px, ${pos!.y - 28}px) scale(0.9)`
          : inReels
          ? "translate(calc(-100vw + 5.75rem), -10rem) scale(0.9)"
          : "translate(0, -7rem) scale(1)",
      }}
    >
      <div className="absolute inset-0 rounded-full opacity-60 blur-xl animate-orb"
        style={{ background: "radial-gradient(circle, oklch(0.85 0.11 20), transparent 70%)" }} />
      <img src={orb} alt="" className="relative h-14 w-14 animate-orb" width={512} height={512} />
    </Link>
  );
}
