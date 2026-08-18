import { usePersonalization, MODES } from "@/lib/personalize";
import { cn } from "@/lib/utils";

/** One-tap mode switch: Study · Work · Business · Fun. */
export function ModeSwitch() {
  const { p, setMode } = usePersonalization();
  return (
    <div className="px-4 pt-2">
      <div className="glass-strong flex items-center gap-1 rounded-full p-1">
        {MODES.map((m) => {
          const active = p.mode === m.key;
          return (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "relative flex-1 rounded-full px-2 py-2 text-[11px] font-semibold transition-all duration-300 active:scale-95",
                active ? "bg-foreground text-background shadow-md" : "text-muted-foreground",
              )}
            >
              <span className="mr-1">{m.emoji}</span>{m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
