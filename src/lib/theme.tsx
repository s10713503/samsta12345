import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "rose" | "light" | "dark";
const KEY = "samsta-theme";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void; cycle: () => void };
const ThemeCtx = createContext<Ctx | null>(null);

function apply(t: Theme) {
  const root = document.documentElement;
  root.classList.remove("theme-rose", "theme-light", "dark");
  if (t === "dark") root.classList.add("dark");
  else if (t === "light") root.classList.add("theme-light");
  else root.classList.add("theme-rose");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("rose");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && (localStorage.getItem(KEY) as Theme)) || "rose";
    setThemeState(saved);
    apply(saved);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    apply(t);
    try { localStorage.setItem(KEY, t); } catch {}
  };
  const cycle = () => {
    const order: Theme[] = ["rose", "light", "dark"];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  };

  return <ThemeCtx.Provider value={{ theme, setTheme, cycle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
