import orb from "@/assets/sam-orb.png";
import { cn } from "@/lib/utils";

export function SamOrb({ size = 120, thinking = false, className }: { size?: number; thinking?: boolean; className?: string }) {
  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      {/* outer halo */}
      <div
        className="absolute inset-0 rounded-full blur-2xl animate-orb"
        style={{ background: "radial-gradient(circle, oklch(0.85 0.13 20 / 0.8), transparent 65%)" }}
      />
      {/* rotating rings */}
      <div
        className={cn("absolute inset-[-8%] rounded-full opacity-70", thinking ? "animate-[spin_3s_linear_infinite]" : "animate-[spin_18s_linear_infinite]")}
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, oklch(0.82 0.12 20 / 0.55) 20%, transparent 40%, oklch(0.86 0.09 55 / 0.5) 65%, transparent 85%)",
          maskImage: "radial-gradient(circle, transparent 55%, black 58%, black 70%, transparent 73%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 55%, black 58%, black 70%, transparent 73%)",
        }}
      />
      <div
        className={cn("absolute inset-[-2%] rounded-full opacity-60", thinking ? "animate-[spin_2s_linear_infinite_reverse]" : "animate-[spin_28s_linear_infinite_reverse]")}
        style={{
          background: "conic-gradient(from 90deg, transparent 0%, oklch(0.9 0.08 30 / 0.5) 30%, transparent 55%, oklch(0.78 0.14 15 / 0.55) 80%, transparent 100%)",
          maskImage: "radial-gradient(circle, transparent 68%, black 71%, black 82%, transparent 84%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 68%, black 71%, black 82%, transparent 84%)",
        }}
      />
      {/* core */}
      <img src={orb} alt="" className="relative h-full w-full animate-orb select-none" draggable={false} />
      {/* sparkle dots */}
      {thinking && (
        <>
          <span className="absolute top-2 right-4 h-1.5 w-1.5 rounded-full bg-white/90 animate-ping" />
          <span className="absolute bottom-4 left-3 h-1 w-1 rounded-full bg-white/80 animate-ping" style={{ animationDelay: "0.6s" }} />
        </>
      )}
    </div>
  );
}

export function VoiceWave({ active = false }: { active?: boolean }) {
  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full bg-current transition-all", active ? "animate-wave" : "h-1 opacity-40")}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}
