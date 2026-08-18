import { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Sparkles, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { SamOrb } from "./SamOrb";
import { streamImage } from "@/lib/stream-image";
import { cn } from "@/lib/utils";

export type ImageMode = "thumbnail" | "carousel" | "reel";

const CONFIG: Record<ImageMode, { title: string; hint: string; count: number; size: string; accent: string; suffix: (i: number, total: number) => string }> = {
  thumbnail: {
    title: "Thumbnail",
    hint: "One striking cover image",
    count: 1,
    size: "1024x1024",
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))",
    suffix: () => "",
  },
  carousel: {
    title: "Carousel",
    hint: "3 cohesive slides in one style",
    count: 3,
    size: "1024x1024",
    accent: "linear-gradient(135deg, oklch(0.86 0.09 80), oklch(0.82 0.1 60))",
    suffix: (i, t) => ` — slide ${i + 1} of ${t}, consistent style, cinematic composition`,
  },
  reel: {
    title: "Reel Storyboard",
    hint: "4-frame animated storyboard with voiceover",
    count: 4,
    size: "1024x1024",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))",
    suffix: (i, t) => ` — scene ${i + 1} of ${t}, vertical reel storyboard, cinematic lighting, film grain`,
  },
};

type FrameState = { dataUrl?: string; final: boolean };

export function SamImageSheet({
  open, onOpenChange, mode,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: ImageMode;
}) {
  const cfg = CONFIG[mode];
  const [prompt, setPrompt] = useState("");
  const [frames, setFrames] = useState<FrameState[]>([]);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playIdx, setPlayIdx] = useState(0);
  const [script, setScript] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setPrompt(""); setFrames([]); setBusy(false); setPlaying(false); setScript([]); setPlayIdx(0);
      window.speechSynthesis?.cancel?.();
    }
  }, [open]);

  useEffect(() => {
    if (!playing) return;
    if (playIdx >= frames.length) { setPlaying(false); return; }
    const line = script[playIdx];
    if (line && "speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(line);
      u.rate = 1.05;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
    const t = setTimeout(() => setPlayIdx((i) => i + 1), 2600);
    return () => clearTimeout(t);
  }, [playing, playIdx, frames.length, script]);

  async function run() {
    const p = prompt.trim();
    if (!p || busy) return;
    setBusy(true);
    setFrames(Array.from({ length: cfg.count }, () => ({ final: false })));
    setScript([]);

    // For reel: get script lines first
    if (mode === "reel") {
      try {
        const res = await fetch("/api/sam", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "chat",
            messages: [{
              role: "user",
              content: `Write exactly ${cfg.count} short voiceover lines (max 12 words each) for a reel about: "${p}". Return only the lines, numbered 1. 2. 3. 4.`,
            }],
          }),
        });
        if (res.ok && res.body) {
          const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
          let buf = ""; let acc = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += value;
            const lines = buf.split("\n"); buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const delta = JSON.parse(data).choices?.[0]?.delta?.content;
                if (delta) acc += delta;
              } catch { /* ignore */ }
            }
          }
          const parsed = acc.split("\n").map((l) => l.replace(/^\s*\d+[.)-]\s*/, "").trim()).filter(Boolean).slice(0, cfg.count);
          setScript(parsed);
        }
      } catch { /* non-fatal */ }
    }

    try {
      for (let i = 0; i < cfg.count; i++) {
        const scenePrompt = `${p}${cfg.suffix(i, cfg.count)}`;
        await streamImage(scenePrompt, ({ dataUrl, isFinal }) => {
          setFrames((prev) => {
            const copy = [...prev];
            copy[i] = { dataUrl, final: isFinal };
            return copy;
          });
        }, cfg.size);
      }
      toast.success("Ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sam couldn't render");
    } finally { setBusy(false); }
  }

  function download(idx: number) {
    const f = frames[idx];
    if (!f?.dataUrl) return;
    const a = document.createElement("a");
    a.href = f.dataUrl;
    a.download = `samsta-${mode}-${idx + 1}.png`;
    a.click();
  }

  function playReel() {
    if (!frames.every((f) => f.dataUrl)) return;
    setPlayIdx(0);
    setPlaying(true);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[94vh] border-none bg-transparent p-0">
        <div className="glass-strong mx-auto flex h-[94vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <div className="flex items-center gap-3 px-5 py-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: cfg.accent }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-display text-xl italic">{cfg.title}</div>
              <div className="text-[11px] text-muted-foreground">{cfg.hint}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 px-5 pb-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={mode === "reel" ? "e.g. a rainy morning ritual in a Tokyo café" : "Describe the image…"}
              rows={2}
              className="w-full resize-none rounded-2xl border border-border bg-white/50 px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-[oklch(0.82_0.1_20/0.4)]"
            />
            <button
              onClick={run}
              disabled={!prompt.trim() || busy}
              className="flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md transition active:scale-[0.98] disabled:opacity-40"
              style={{ background: cfg.accent }}
            >
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {busy ? "Sam is painting…" : "Generate"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-5">
            {frames.length === 0 && !busy ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <SamOrb size={80} />
                <div className="text-xs text-muted-foreground">Your {mode} will appear here</div>
              </div>
            ) : (
              <div className={cn("grid gap-3", mode === "thumbnail" ? "grid-cols-1" : "grid-cols-2")}>
                {frames.map((f, i) => (
                  <div key={i} className="relative overflow-hidden rounded-2xl bg-muted aspect-square animate-fade-up"
                    style={{ animationDelay: `${i * 80}ms` }}>
                    {f.dataUrl ? (
                      <>
                        <img
                          src={f.dataUrl}
                          alt=""
                          className={cn("h-full w-full object-cover transition-all duration-500", !f.final && "blur-2xl scale-105")}
                        />
                        {mode === "reel" && playing && playIdx === i && (
                          <div className="absolute inset-0 ring-4 ring-white/80 rounded-2xl pointer-events-none animate-pulse" />
                        )}
                        {mode === "reel" && script[i] && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                            <div className="text-[11px] font-medium text-white leading-snug">{script[i]}</div>
                          </div>
                        )}
                        {f.final && (
                          <button onClick={() => download(i)}
                            className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <Shimmer />
                    )}
                  </div>
                ))}
              </div>
            )}

            {mode === "reel" && frames.length > 0 && frames.every((f) => f.dataUrl && f.final) && (
              <button
                onClick={playReel}
                disabled={playing}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-60"
                style={{ background: cfg.accent }}
              >
                {playing ? "Playing…" : "▶  Play reel with voiceover"}
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Shimmer() {
  return (
    <div className="h-full w-full"
      style={{
        background: "linear-gradient(110deg, oklch(0.92 0.02 30) 20%, oklch(0.86 0.06 20) 50%, oklch(0.92 0.02 30) 80%)",
        backgroundSize: "200% 100%",
        animation: "shine 1.4s linear infinite",
      }}
    />
  );
}
