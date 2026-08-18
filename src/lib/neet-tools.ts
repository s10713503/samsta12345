// @ts-nocheck
// NEET tool hub — mirrors the IIT JEE hub, with Biology in place of Mathematics.
import { TOOLS as JEE_TOOLS, type ToolDef } from "@/lib/jee-tools";

export const neetText = (s: string) =>
  String(s || "")
    .replace(/IIT JEE/g, "NEET")
    .replace(/JEE Advanced/g, "NEET")
    .replace(/JEE Main\b/g, "NEET")
    .replace(/\bJEE\b/g, "NEET")
    .replace(/Mathematics/g, "Biology")
    .replace(/\bMaths\b/g, "Biology")
    .replace(/\bmaths\b/g, "biology")
    .replace(/\bMath\b/g, "Biology")
    .replace(/P\/C\/M/g, "P/C/B")
    .replace(/Physics\/Chem\/Maths/g, "Physics/Chem/Biology")
    .replace(/Main\/Advanced|Main\/Adv\b/g, "NEET")
    .replace(/JOSAA/g, "MCC")
    .replace(/IITs\/NITs\/IIITs/g, "AIIMS / Govt medical colleges")
    .replace(/\bIITs\b/g, "medical colleges")
    .replace(/\bIIT\b/g, "medical college");

const KEY_MAP: Record<string, string> = { mathematics: "biology", "math-solver": "bio-solver" };

export const TOOLS: Record<string, ToolDef> = Object.fromEntries(
  Object.entries(JEE_TOOLS).map(([key, t]: any) => [
    KEY_MAP[key] ?? key,
    {
      ...t,
      title: neetText(t.title),
      hint: neetText(t.hint),
      intro: neetText(t.intro),
      features: (t.features || []).map((f: any) => ({ label: neetText(f.label), prompt: neetText(f.prompt) })),
      custom: undefined,
    },
  ]),
);
