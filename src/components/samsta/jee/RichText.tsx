import { useMemo } from "react";
import { deLatex } from "@/lib/plain-math";

/** Markdown-lite renderer with plain-text math (no LaTeX anywhere in the app). */
export function RichText({ text }: { text: string }) {
  const html = useMemo(() => {
    const esc = deLatex(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const lines = esc.split("\n");
    const out: string[] = [];
    let table: string[][] = [];
    const flush = () => {
      if (!table.length) return;
      const [head, ...rows] = table;
      out.push(
        `<div class="my-2 overflow-x-auto rounded-xl border border-border/60"><table class="w-full text-[11px]"><thead class="bg-muted/70"><tr>${head
          .map((h) => `<th class="p-2 text-left font-semibold text-foreground">${h}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr class="border-t border-border/50">${r.map((c) => `<td class="p-2 align-top">${c}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`,
      );
      table = [];
    };
    for (const line of lines) {
      if (/^\s*\|.*\|\s*$/.test(line)) {
        const cells = line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
        table.push(cells);
        continue;
      }
      flush();
      out.push(
        line
          .replace(/^### (.*)$/, '<h3 class="mt-3 mb-1 text-sm font-bold text-foreground">$1</h3>')
          .replace(/^## (.*)$/, '<h2 class="mt-4 mb-1.5 text-base font-extrabold text-foreground">$1</h2>')
          .replace(/^# (.*)$/, '<h2 class="mt-4 mb-1.5 text-base font-extrabold text-foreground">$1</h2>')
          .replace(/`([^`]+)`/g, '<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
          .replace(/^\s*[-•]\s+(.*)$/, '<li class="ml-4 list-disc">$1</li>') || '<div class="h-2"></div>',
      );
    }
    flush();
    return out.join("\n");
  }, [text]);
  return <div className="text-sm leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: html }} />;
}
