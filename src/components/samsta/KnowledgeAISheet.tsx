// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { streamSam } from "@/lib/stream-sam";

const ACTIONS: Array<{ id: string; label: string; emoji: string; tool: string; wrap: (t: string) => string }> = [
  { id: "summary", label: "Summarize", emoji: "🧠", tool: "summary", wrap: (t) => t },
  { id: "eli10", label: "Explain like I'm 10", emoji: "🧒", tool: "learn_lesson", wrap: (t) => `Explain this to a 10-year-old:\n\n${t}` },
  { id: "translate", label: "Translate → English", emoji: "🌍", tool: "translate", wrap: (t) => `→ English\n\n${t}` },
  { id: "quiz", label: "Generate Quiz", emoji: "📝", tool: "chat", wrap: (t) => `Create a 5-question multiple-choice quiz (with answers) from this content. Format each Q clearly.\n\n${t}` },
  { id: "flash", label: "Flashcards", emoji: "🃏", tool: "chat", wrap: (t) => `Create 8 crisp flashcards (Q → A) from this content. Bullet format "Q: …\\nA: …".\n\n${t}` },
  { id: "mind", label: "Mind Map", emoji: "🕸️", tool: "chat", wrap: (t) => `Build a text mind-map (indented bullets, 3 levels deep) of the main ideas.\n\n${t}` },
  { id: "notes", label: "Study Notes", emoji: "📓", tool: "chat", wrap: (t) => `Produce polished study notes: sections, key terms bolded, formulas if any, and a 3-line TL;DR at the top.\n\n${t}` },
  { id: "debate", label: "Debate both sides", emoji: "⚖️", tool: "chat", wrap: (t) => `Give a balanced For/Against analysis in two columns of 3 bullets each, then a 1-line verdict.\n\n${t}` },
  { id: "fact", label: "Fact check", emoji: "✅", tool: "chat", wrap: (t) => `Fact-check the main claims. List each claim with Verdict (True / Partly / False / Unverified) and a 1-line note.\n\n${t}` },
  { id: "podcast", label: "Podcast script", emoji: "🎙️", tool: "chat", wrap: (t) => `Turn this into a 2-host podcast script (Host A / Host B) around 90 seconds long.\n\n${t}` },
];

export function KnowledgeAISheet({
  open,
  onClose,
  title,
  content,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setOut("");
      setActive(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const run = async (id: string) => {
    const spec = ACTIONS.find((a) => a.id === id);
    if (!spec) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setActive(id);
    setOut("");
    setLoading(true);
    try {
      await streamSam(
        spec.tool,
        [{ role: "user", content: spec.wrap(`Title: ${title}\n\n${content || "(no body — infer from title)"}`) }],
        (acc) => setOut(acc),
        ctrl.signal,
      );
    } catch (e: any) {
      if (e?.name !== "AbortError") setOut(`Sam couldn't finish that: ${e?.message || "error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-up" onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl pb-8 pt-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60 backdrop-blur"><X className="h-4 w-4" /></button>
        <div className="px-5 pb-2 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display italic text-lg leading-tight">Ask Sam about this</div>
            <div className="text-[11px] text-muted-foreground truncate">{title}</div>
          </div>
        </div>

        <div className="px-4 pt-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => run(a.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] whitespace-nowrap transition active:scale-95 ${
                  active === a.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background/50 border-foreground/10 text-foreground/80"
                }`}
              >
                <span className="mr-1">{a.emoji}</span>{a.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-5 pb-2">
          {!active && (
            <div className="text-sm text-foreground/60 py-8 text-center">
              Pick an action above — Sam turns this post into a summary, a quiz, a mind-map, flashcards, or a podcast.
            </div>
          )}
          {active && (
            <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90">
              {out}
              {loading && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}