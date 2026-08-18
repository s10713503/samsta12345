import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, MicOff, Volume2, ArrowLeftRight, Sparkles, Copy } from "lucide-react";
import { toast } from "sonner";
import { streamSam } from "@/lib/stream-sam";
import { SamOrb } from "@/components/samsta/SamOrb";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/translate")({
  component: TranslatePage,
  head: () => ({
    meta: [
      { title: "Live Translate · Samsta" },
      { name: "description", content: "Speak or type — Samsta translates in real time, tone-aware, across 12 languages." },
    ],
  }),
});

const LANGS = [
  { code: "en", label: "English", flag: "🇬🇧", speech: "en-US" },
  { code: "es", label: "Spanish", flag: "🇪🇸", speech: "es-ES" },
  { code: "fr", label: "French", flag: "🇫🇷", speech: "fr-FR" },
  { code: "de", label: "German", flag: "🇩🇪", speech: "de-DE" },
  { code: "it", label: "Italian", flag: "🇮🇹", speech: "it-IT" },
  { code: "pt", label: "Portuguese", flag: "🇵🇹", speech: "pt-PT" },
  { code: "ja", label: "Japanese", flag: "🇯🇵", speech: "ja-JP" },
  { code: "ko", label: "Korean", flag: "🇰🇷", speech: "ko-KR" },
  { code: "zh", label: "Chinese", flag: "🇨🇳", speech: "zh-CN" },
  { code: "hi", label: "Hindi", flag: "🇮🇳", speech: "hi-IN" },
  { code: "ar", label: "Arabic", flag: "🇸🇦", speech: "ar-SA" },
  { code: "ru", label: "Russian", flag: "🇷🇺", speech: "ru-RU" },
] as const;

type Lang = (typeof LANGS)[number];

type SR = {
  new (): {
    lang: string; interimResults: boolean; continuous: boolean;
    onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
    onend: () => void; onerror: () => void; start: () => void; stop: () => void;
  };
};

function TranslatePage() {
  const [source, setSource] = useState<Lang>(LANGS[0]);
  const [target, setTarget] = useState<Lang>(LANGS[2]);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<ReturnType<InstanceType<SR>["start"]> extends void ? InstanceType<SR> : never | null>(null as never);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const swap = () => { setSource(target); setTarget(source); setInput(output); setOutput(input); };

  async function translate(text: string) {
    if (!text.trim()) return;
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    setBusy(true);
    setOutput("");
    try {
      await streamSam(
        "translate_live",
        [{ role: "user", content: `Translate from ${source.label} → ${target.label}:\n\n${text}` }],
        (acc) => setOutput(acc),
        ctl.signal,
      );
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Translation failed");
    } finally {
      setBusy(false);
    }
  }

  function startVoice() {
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const SRCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SRCtor) { toast.error("Voice input not supported here"); return; }
    const rec = new SRCtor();
    rec.lang = source.speech; rec.interimResults = true; rec.continuous = false;
    let final = "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      final = t;
      setInput(t);
    };
    rec.onend = () => { setListening(false); if (final.trim()) void translate(final); };
    rec.onerror = () => setListening(false);
    rec.start();
    (recRef as { current: InstanceType<SR> | null }).current = rec;
    setListening(true);
  }

  function stopVoice() {
    (recRef as { current: InstanceType<SR> | null }).current?.stop();
    setListening(false);
  }

  function speak() {
    if (!output || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(output);
    u.lang = target.speech;
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/sam" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-lg italic">Live translate</div>
          <div className="text-[11px] text-muted-foreground">tone-aware · 12 languages</div>
        </div>
        <div className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <Sparkles className="h-4 w-4" />
        </div>
      </header>

      {/* language pair */}
      <section className="px-4 pt-2 animate-fade-up">
        <div className="glass-strong flex items-center gap-2 rounded-3xl p-2">
          <LangPicker value={source} onChange={setSource} align="left" />
          <button onClick={swap} aria-label="Swap"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-md active:scale-90 transition"
            style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}>
            <ArrowLeftRight className="h-4 w-4" />
          </button>
          <LangPicker value={target} onChange={setTarget} align="right" />
        </div>
      </section>

      {/* input card */}
      <section className="px-4 pt-4">
        <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{source.label}</span>
            <button
              onClick={listening ? stopVoice : startVoice}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition",
                listening ? "text-white shadow-lg animate-pulse" : "text-foreground/70 hover:text-foreground",
              )}
              style={listening ? { background: "linear-gradient(135deg, oklch(0.72 0.2 25), oklch(0.65 0.22 15))" } : undefined}
              aria-label={listening ? "Stop" : "Speak"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void translate(input); } }}
            rows={3}
            placeholder={listening ? "Listening…" : "Type or hold the mic…"}
            className="w-full resize-none bg-transparent text-base leading-relaxed outline-none placeholder:text-muted-foreground"
          />
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => translate(input)}
              disabled={!input.trim() || busy}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white shadow-md transition active:scale-95 disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Translate
            </button>
          </div>
        </div>
      </section>

      {/* output card */}
      <section className="px-4 pt-4">
        <div className="relative overflow-hidden rounded-3xl p-4 animate-fade-up glass-strong" style={{ animationDelay: "120ms" }}>
          <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-70"
            style={{ background: "oklch(0.9 0.09 20)" }} />
          <div className="relative mb-2 flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{target.label}</span>
            <div className="flex items-center gap-1">
              <button onClick={speak} disabled={!output} aria-label="Speak"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:text-foreground disabled:opacity-30">
                <Volume2 className="h-4 w-4" />
              </button>
              <button onClick={() => { if (output) { navigator.clipboard.writeText(output); toast.success("Copied"); } }}
                disabled={!output} aria-label="Copy"
                className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:text-foreground disabled:opacity-30">
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="relative min-h-[96px] text-base leading-relaxed">
            {output ? (
              <span className="animate-fade-up">{output}{busy && <span className="ml-1 inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-foreground/50" />}</span>
            ) : busy ? (
              <div className="flex items-center gap-3 py-3">
                <SamOrb size={40} thinking />
                <span className="text-sm text-muted-foreground">Translating…</span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Your translation will appear here.</span>
            )}
          </div>
        </div>
      </section>

      {/* phrasebook */}
      <section className="px-4 pt-6">
        <div className="mb-2 px-1 text-[11px] uppercase tracking-widest text-muted-foreground">Quick phrases</div>
        <div className="flex flex-wrap gap-2">
          {["Where is the nearest coffee?", "Nice to meet you.", "Can I have the bill, please?", "I don't understand.", "Thank you so much."].map((p, i) => (
            <button key={p}
              onClick={() => { setInput(p); void translate(p); }}
              className="glass rounded-full px-3.5 py-2 text-xs animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {p}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function LangPicker({ value, onChange, align }: { value: Lang; onChange: (l: Lang) => void; align: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex-1">
      <button onClick={() => setOpen((v) => !v)}
        className={cn("flex w-full items-center gap-2 rounded-2xl px-3 py-2.5", align === "right" && "justify-end")}
      >
        <span className="text-xl">{value.flag}</span>
        <span className="font-display italic">{value.label}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute z-50 mt-2 max-h-72 w-56 overflow-y-auto rounded-2xl p-1.5 shadow-2xl animate-scale-in"
            style={align === "right" ? { right: 0 } : { left: 0 }}>
            {LANGS.map((l) => (
              <button key={l.code}
                onClick={() => { onChange(l); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition",
                  l.code === value.code ? "bg-foreground/5" : "hover:bg-foreground/5",
                )}
              >
                <span className="text-lg">{l.flag}</span>
                <span className="font-display italic">{l.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
