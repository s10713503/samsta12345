// Converts LaTeX / math markup into plain readable text (app-wide rule: no LaTeX anywhere).
const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "n": "ⁿ", "+": "⁺", "-": "⁻" };
export function deLatex(input: string): string {
  let t = input;
  t = t.replace(/\$\$([\s\S]*?)\$\$/g, "$1").replace(/\$([^$\n]*)\$/g, "$1");
  t = t.replace(/\\\[|\\\]|\\\(|\\\)/g, "");
  t = t.replace(/\\begin\{[^}]*\}|\\end\{[^}]*\}/g, "");
  t = t.replace(/\\(?:d?frac|dfrac|tfrac)\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, "($1)/($2)");
  t = t.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, "($2)^(1/$1)");
  t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, "sqrt($1)");
  t = t.replace(/\\(?:text|mathrm|mathbf|mathit|operatorname|boxed|left|right|displaystyle|limits)\s*/g, "");
  const sym: Record<string, string> = {
    times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", approx: "≈", neq: "≠", leq: "≤", geq: "≥",
    le: "≤", ge: "≥", alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", theta: "θ",
    lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", omega: "ω",
    Omega: "Ω", infty: "∞", propto: "∝", rightarrow: "→", to: "→", leftarrow: "←", degree: "°", circ: "°",
    partial: "∂", int: "∫", sum: "Σ", hbar: "ħ", ldots: "…", dots: "…", quad: " ", qquad: "  ",
  };
  t = t.replace(/\\([A-Za-z]+)/g, (m, name: string) => (name in sym ? sym[name] : name));
  t = t.replace(/\^\{([^{}]*)\}/g, (m, g: string) => (/^[0-9n+-]+$/.test(g) ? [...g].map((c) => SUP[c] ?? c).join("") : "^(" + g + ")"));
  t = t.replace(/\^([0-9n])/g, (m, c: string) => SUP[c] ?? m);
  t = t.replace(/_\{([^{}]*)\}/g, "$1").replace(/_([A-Za-z0-9])/g, "$1");
  t = t.replace(/[{}]/g, "");
  return t;
}

