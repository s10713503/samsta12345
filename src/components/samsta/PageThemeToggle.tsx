import { useState } from "react";
import { Sun, Moon, Flower2 } from "lucide-react";

export type PageThemeName = "rose" | "white" | "dark";

export const PAGE_THEMES: Record<PageThemeName, { bg: string; ink: string; inkSoft: string; inkMuted: string; surface: string; surfaceBorder: string; accent: string; accentDeep: string; gold: string; overlay: string }> = {
  rose: {
    bg: "linear-gradient(180deg, #fdf1ea 0%, #fbe4dc 40%, #f6d6d1 100%)",
    ink: "#3a1f2b",
    inkSoft: "rgba(58,31,43,0.65)",
    inkMuted: "rgba(58,31,43,0.5)",
    surface: "linear-gradient(140deg, rgba(255,255,255,0.78), rgba(255,255,255,0.42))",
    surfaceBorder: "rgba(255,255,255,0.7)",
    accent: "#c9527a",
    accentDeep: "#a63a63",
    gold: "#c48a3a",
    overlay: "rgba(255,255,255,0.55)",
  },
  white: {
    bg: "linear-gradient(180deg, #ffffff 0%, #f6f6f7 100%)",
    ink: "#141416",
    inkSoft: "rgba(20,20,22,0.65)",
    inkMuted: "rgba(20,20,22,0.5)",
    surface: "linear-gradient(140deg, rgba(255,255,255,0.9), rgba(245,245,247,0.7))",
    surfaceBorder: "rgba(0,0,0,0.08)",
    accent: "#1a1a1c",
    accentDeep: "#000000",
    gold: "#8a6a2a",
    overlay: "rgba(255,255,255,0.75)",
  },
  dark: {
    bg: "linear-gradient(180deg, #0b0a10 0%, #12101a 100%)",
    ink: "#f4ecef",
    inkSoft: "rgba(244,236,239,0.72)",
    inkMuted: "rgba(244,236,239,0.5)",
    surface: "linear-gradient(140deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
    surfaceBorder: "rgba(255,255,255,0.12)",
    accent: "#e07aa0",
    accentDeep: "#c9527a",
    gold: "#e8c874",
    overlay: "rgba(255,255,255,0.05)",
  },
};

export function usePageTheme(initial: PageThemeName = "rose") {
  const [theme, setTheme] = useState<PageThemeName>(initial);
  return { theme, setTheme, tokens: PAGE_THEMES[theme] };
}

export function PageThemeToggle({ value, onChange, className }: { value: PageThemeName; onChange: (v: PageThemeName) => void; className?: string }) {
  const opts: { id: PageThemeName; icon: typeof Sun; label: string }[] = [
    { id: "white", icon: Sun, label: "White" },
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "rose", icon: Flower2, label: "Rose" },
  ];
  const t = PAGE_THEMES[value];
  return (
    <div
      className={`flex items-center gap-0.5 rounded-full border p-0.5 backdrop-blur-xl transition ${className ?? ""}`}
      style={{ borderColor: t.surfaceBorder, background: t.overlay }}
    >
      {opts.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            aria-label={o.label}
            className="flex h-7 w-7 items-center justify-center rounded-full transition active:scale-90"
            style={active
              ? { background: `linear-gradient(135deg, ${t.accent}, ${t.gold})`, color: "#fff", boxShadow: "0 6px 14px -6px rgba(0,0,0,0.25)" }
              : { color: t.inkSoft }}
          >
            <o.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}
