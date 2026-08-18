import { useEffect, useRef, useState, type ReactNode } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Send, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SamOrb } from "./SamOrb";
import { cn } from "@/lib/utils";

export type ToolKey =
  | "caption" | "hashtags" | "ideas" | "bio" | "dm" | "summary" | "safety" | "search" | "translate" | "chat"
  | "smart_reply" | "content_creator" | "schedule" | "email_assist" | "learning" | "memory_timeline"
  | "travel" | "shopping" | "finance" | "health" | "business" | "career_coach_full" | "privacy_guard"
  | "relationship" | "news_brief" | "ai_search_pro" | "knowledge_base" | "ai_avatar" | "digital_twin";

export function SamToolSheet({
  open, onOpenChange, tool, title, hint, placeholder, accent, icon,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tool: ToolKey;
  title: string;
  hint: string;
  placeholder: string;
  accent: string;
  icon: ReactNode;
}) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const outRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setInput(""); setOutput(""); setStreaming(false);
    }
  }, [open]);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight, behavior: "smooth" });
  }, [output]);

  async function run() {
    const trimmed = input.trim();
    if (!trimmed || streaming) return;
    setOutput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, messages: [{ role: "user", content: trimmed }] }),
      });
      if (!res.ok || !res.body) throw new Error((await res.text().catch(() => "")) || `Request failed (${res.status})`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = ""; let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) { acc += delta; setOutput(acc); }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sam couldn't respond");
    } finally {
      setStreaming(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 1400);
    } catch { toast.error("Copy failed"); }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] border-none bg-transparent p-0">
        <div className="glass-strong mx-auto flex h-full w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl">
          <DrawerHeader className="px-5 pt-4 pb-2">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: accent }}>
                {icon}
              </div>
              <div className="flex-1 text-left">
                <DrawerTitle className="font-display text-xl italic">{title}</DrawerTitle>
                <DrawerDescription className="text-xs">{hint}</DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="flex flex-col gap-3 px-5 pb-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); run(); } }}
              placeholder={placeholder}
              rows={3}
              className="w-full resize-none rounded-2xl border border-border bg-white/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[oklch(0.82_0.1_20/0.4)]"
            />
            <button
              onClick={run}
              disabled={!input.trim() || streaming}
              className="flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md transition active:scale-[0.98] disabled:opacity-40"
              style={{ background: accent }}
            >
              {streaming ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {streaming ? "Sam is thinking…" : "Ask Sam"}
            </button>
          </div>

          <div ref={outRef} className="mx-4 mb-4 max-h-[46vh] flex-1 overflow-y-auto rounded-2xl bg-white/40 p-4">
            {output ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">{output}</div>
            ) : streaming ? (
              <Skeleton />
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <SamOrb size={72} />
                <div className="text-xs text-muted-foreground">Your result will appear here</div>
              </div>
            )}
          </div>

          {output && !streaming && (
            <div className="flex gap-2 px-5 pb-6">
              <button onClick={copy} className="glass flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium active:scale-[0.98]">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button onClick={run} className="glass flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium active:scale-[0.98]">
                <RefreshCw className="h-4 w-4" /> Regenerate
              </button>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {[80, 60, 90, 45].map((w, i) => (
        <div key={i} className={cn("h-3 rounded-full")}
          style={{
            width: `${w}%`,
            background: "linear-gradient(90deg, oklch(0.9 0.02 30 / 0.6), oklch(0.82 0.06 20 / 0.9), oklch(0.9 0.02 30 / 0.6))",
            backgroundSize: "200% 100%",
            animation: "shine 1.6s linear infinite",
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
