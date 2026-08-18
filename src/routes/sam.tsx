import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft, Send, Sparkles, Hash, Lightbulb, User, MessageSquare,
  FileText, Shield, Search, Languages, Mic, MessageCircle, Image as ImageIcon,
  Layers, Film, Lock,
} from "lucide-react";

import { toast } from "sonner";
import { SamOrb, VoiceWave } from "@/components/samsta/SamOrb";
import { SamToolSheet, type ToolKey } from "@/components/samsta/SamToolSheet";
import { SamImageSheet, type ImageMode } from "@/components/samsta/SamImageSheet";
import { cn } from "@/lib/utils";
import { usePremium } from "@/lib/premium";

export const Route = createFileRoute("/sam")({ component: SamHub });

type Msg = { role: "user" | "assistant"; content: string };

type Tool = {
  key: ToolKey;
  title: string;
  hint: string;
  placeholder: string;
  accent: string;
  icon: React.ReactNode;
  tint: string;
};

const TOOLS: Tool[] = [
  { key: "caption", title: "Captions", hint: "3 caption options for your post", placeholder: "Describe your photo, mood, or idea…",
    accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))", tint: "oklch(0.94 0.06 20)",
    icon: <Sparkles className="h-5 w-5" /> },
  { key: "hashtags", title: "Hashtags", hint: "20 curated hashtags", placeholder: "Topic, niche, or vibe…",
    accent: "linear-gradient(135deg, oklch(0.85 0.11 55), oklch(0.8 0.12 40))", tint: "oklch(0.95 0.05 55)",
    icon: <Hash className="h-5 w-5" /> },
  { key: "ideas", title: "Weekly Ideas", hint: "7 premium content ideas", placeholder: "What's your niche? (e.g. minimalist travel)",
    accent: "linear-gradient(135deg, oklch(0.86 0.09 80), oklch(0.82 0.1 60))", tint: "oklch(0.96 0.04 75)",
    icon: <Lightbulb className="h-5 w-5" /> },
  { key: "bio", title: "Bio Rewriter", hint: "3 tonal variants", placeholder: "Paste your current bio…",
    accent: "linear-gradient(135deg, oklch(0.8 0.1 340), oklch(0.78 0.12 20))", tint: "oklch(0.94 0.05 340)",
    icon: <User className="h-5 w-5" /> },
  { key: "dm", title: "DM Assistant", hint: "Draft a reply, approve before sending", placeholder: "Paste the incoming DM…",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))", tint: "oklch(0.93 0.04 250)",
    icon: <MessageSquare className="h-5 w-5" /> },
  { key: "summary", title: "Summarize", hint: "Key points, actions, sentiment", placeholder: "Paste a chat, article, or notes…",
    accent: "linear-gradient(135deg, oklch(0.8 0.08 200), oklch(0.76 0.1 220))", tint: "oklch(0.94 0.04 210)",
    icon: <FileText className="h-5 w-5" /> },
  { key: "safety", title: "Safety Check", hint: "Detect scams, phishing, spam", placeholder: "Paste a suspicious message…",
    accent: "linear-gradient(135deg, oklch(0.75 0.15 25), oklch(0.65 0.2 20))", tint: "oklch(0.94 0.05 25)",
    icon: <Shield className="h-5 w-5" /> },
  { key: "search", title: "Universal Search", hint: "Ask Sam anything in natural language", placeholder: "e.g. photographers in Kyoto shooting on film",
    accent: "linear-gradient(135deg, oklch(0.78 0.11 160), oklch(0.72 0.13 180))", tint: "oklch(0.94 0.05 160)",
    icon: <Search className="h-5 w-5" /> },
  { key: "translate", title: "Translate", hint: "Any language, tone-aware", placeholder: "Text to translate. Add: 'to French'",
    accent: "linear-gradient(135deg, oklch(0.82 0.09 130), oklch(0.78 0.11 110))", tint: "oklch(0.94 0.04 125)",
    icon: <Languages className="h-5 w-5" /> },
];

const IMAGE_TILES: Array<{ key: ImageMode; title: string; hint: string; accent: string; tint: string; icon: React.ReactNode }> = [
  { key: "thumbnail", title: "Thumbnail", hint: "One striking cover", accent: "linear-gradient(135deg, oklch(0.82 0.13 20), oklch(0.76 0.14 15))", tint: "oklch(0.94 0.06 20)", icon: <ImageIcon className="h-5 w-5" /> },
  { key: "carousel", title: "Carousel", hint: "3 cohesive slides", accent: "linear-gradient(135deg, oklch(0.86 0.09 80), oklch(0.82 0.1 60))", tint: "oklch(0.96 0.04 75)", icon: <Layers className="h-5 w-5" /> },
  { key: "reel", title: "Reel Storyboard", hint: "4 scenes + voiceover", accent: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))", tint: "oklch(0.93 0.04 250)", icon: <Film className="h-5 w-5" /> },
];

function computeGreeting() {
  // Uses the visitor's own device timezone — India shows IST, elsewhere shows local.
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 21) return "Good evening";
  return "Good night";
}

function SamHub() {
  const navigate = useNavigate();
  const { isPremium } = usePremium();
  const [active, setActive] = useState<ToolKey | null>(null);
  const [imageMode, setImageMode] = useState<ImageMode | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [quick, setQuick] = useState("");
  const [greeting, setGreeting] = useState(computeGreeting);

  useEffect(() => {
    const id = setInterval(() => setGreeting(computeGreeting()), 60_000);
    return () => clearInterval(id);
  }, []);

  const gate = (fn: () => void) => () => {
    if (!isPremium) { navigate({ to: "/premium" }); return; }
    fn();
  };

  const activeTool = TOOLS.find((t) => t.key === active);



  return (
    <div className="min-h-screen pb-24">
      {/* header */}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="font-display text-lg italic">Sam </div>
          <div className="text-[11px] text-muted-foreground">your creative companion</div>
        </div>
        <button onClick={() => setVoiceOpen(true)} className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Voice mode">
          <Mic className="h-5 w-5" />
        </button>
      </header>

      {/* hero orb */}
      <section className="flex flex-col items-center px-6 pt-4 pb-8 animate-fade-up">
        <SamOrb size={140} />
        <h1 className="mt-5 font-display text-4xl italic text-gradient text-center">{greeting}.</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">What can I create for you today?</p>

        {/* quick prompt */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = quick.trim();
            if (!t) return;
            setQuick(t);
            setChatOpen(true);
          }}
          className="glass-strong mt-6 flex w-full items-center gap-2 rounded-full px-3 py-2"
        >
          <input
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            placeholder="Ask Sam anything…"
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Send"
            className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md active:scale-90 transition"
            style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>

      {/* Assistants suite entry */}
      <section className="px-4 mt-2">
        <Link to="/assistants"
          className="glass-strong group relative flex items-center gap-3 overflow-hidden rounded-3xl p-4 transition-transform active:scale-[0.98]">
          <div aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-70 blur-2xl animate-aurora"
            style={{ background: "oklch(0.9 0.09 25)" }} />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.82 0.13 20))" }}>
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="relative flex-1">
            <div className="font-display text-lg italic leading-tight">Assistants</div>
            <div className="text-[11px] text-muted-foreground">19 helpers· smart reply· travel· finance· digital twin</div>
          </div>
          <span className="relative rounded-full bg-foreground/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-background">new</span>
        </Link>
      </section>

      {/* AI vision studio */}



      <section className="px-4 mt-6">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="font-display text-xl italic">Vision</h2>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground"> imagery</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {IMAGE_TILES.map((t, i) => (
            <button
              key={t.key}
              onClick={gate(() => setImageMode(t.key))}
              className="glass group relative flex flex-col items-start gap-2 overflow-hidden rounded-3xl p-3 text-left transition-transform active:scale-[0.97] animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-70 blur-2xl" style={{ background: t.tint }} />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: t.accent }}>
                {t.icon}
              </div>
              {!isPremium && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-white"><Lock className="h-2.5 w-2.5" /></span>
              )}
              <div className="relative">
                <div className="font-display text-sm leading-tight italic">{t.title}</div>
                <div className="mt-0.5 text-[10px] leading-tight text-muted-foreground">{t.hint}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* tools grid */}
      <section className="px-4 mt-6">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <h2 className="font-display text-xl italic">Studio</h2>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{TOOLS.length} tools</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((t, i) => (
            <button
              key={t.key}
              onClick={gate(() => setActive(t.key))}
              className="glass group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.97] animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                aria-hidden
                className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-60 blur-2xl transition-opacity group-hover:opacity-90"
                style={{ background: t.tint }}
              />
              <div
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: t.accent }}
              >
                {t.icon}
              </div>
              {!isPremium && (
                <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-black/75 text-white"><Lock className="h-3 w-3" /></span>
              )}
              <div className="relative">
                <div className="font-display text-lg leading-tight italic">{t.title}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t.hint}</div>
              </div>
            </button>
          ))}

          {/* free chat tile */}
          <button
            onClick={() => setChatOpen(true)}
            className="glass group relative col-span-2 flex items-center gap-4 overflow-hidden rounded-3xl p-4 text-left transition-transform active:scale-[0.98] animate-fade-up"
            style={{ animationDelay: `${TOOLS.length * 40}ms` }}
          >
            <div
              aria-hidden
              className="absolute -right-6 -top-8 h-32 w-32 rounded-full opacity-70 blur-2xl"
              style={{ background: "oklch(0.9 0.09 20)" }}
            />
            <div className="relative">
              <SamOrb size={56} />
            </div>
            <div className="relative flex-1">
              <div className="font-display text-lg italic">Free chat</div>
              <div className="text-[11px] text-muted-foreground">Talk with Sam — captions, hashtags, ideas, anything.</div>
            </div>
            <MessageCircle className="relative h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </section>

      {activeTool && (
        <SamToolSheet
          open={active !== null}
          onOpenChange={(v) => !v && setActive(null)}
          tool={activeTool.key}
          title={activeTool.title}
          hint={activeTool.hint}
          placeholder={activeTool.placeholder}
          accent={activeTool.accent}
          icon={activeTool.icon}
        />
      )}

      <SamChatDrawer open={chatOpen} onOpenChange={setChatOpen} seed={quick} onConsumed={() => setQuick("")} />
      <SamVoiceDrawer open={voiceOpen} onOpenChange={setVoiceOpen} />
      {imageMode && (
        <SamImageSheet open={imageMode !== null} onOpenChange={(v) => !v && setImageMode(null)} mode={imageMode} />
      )}
    </div>
  );
}




/* ---------- Free chat drawer ---------- */

import { Drawer, DrawerContent } from "@/components/ui/drawer";

function SamChatDrawer({ open, onOpenChange, seed, onConsumed }: { open: boolean; onOpenChange: (v: boolean) => void; seed: string; onConsumed: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, streaming]);
  useEffect(() => {
    if (open && seed) { void send(seed); onConsumed(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "chat", messages: next }),
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
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sam couldn't respond");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] border-none bg-transparent p-0">
        <div className="glass-strong mx-auto flex h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <div className="flex items-center gap-2.5 px-5 py-3">
            <SamOrb size={40} thinking={streaming} />
            <div>
              <div className="font-display text-lg italic">Chat with Sam</div>
              <div className="text-[11px] text-muted-foreground">{streaming ? "Thinking…" : "online"}</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-3">
            {messages.length === 0 && (
              <div className="mt-10 text-center animate-fade-up">
                <p className="text-sm text-muted-foreground">Say hi, or ask me for a caption.</p>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  {m.role === "user" ? (
                    <div className="max-w-[85%] rounded-3xl rounded-br-md px-4 py-2.5 text-sm text-primary-foreground"
                      style={{ background: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.28 0.03 20))" }}>
                      {m.content}
                    </div>
                  ) : (
                    <div className="max-w-[90%] text-sm leading-relaxed whitespace-pre-wrap text-foreground/95">
                      {m.content || <span className="inline-flex gap-1"><Dot /><Dot d={150} /><Dot d={300} /></span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="mx-4 mb-5 flex items-end gap-2 rounded-3xl bg-white/60 px-3 py-2 backdrop-blur border border-white/60"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
              rows={1}
              placeholder="Ask Sam anything…"
              className="flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground max-h-32"
            />
            <button type="submit" disabled={!input.trim() || streaming}
              className="flex h-10 w-10 items-center justify-center rounded-full shadow-md transition disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, oklch(0.82 0.12 20), oklch(0.78 0.11 30))" }}
              aria-label="Send">
              <Send className="h-4 w-4 text-white" strokeWidth={2.2} />
            </button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------- Voice drawer (Web Speech API) ---------- */

type SR = {
  new (): {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
    onend: () => void;
    onerror: () => void;
    start: () => void;
    stop: () => void;
  };
};

function SamVoiceDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reply, setReply] = useState("");
  const [thinking, setThinking] = useState(false);
  const recogRef = useRef<InstanceType<SR> | null>(null);

  useEffect(() => {
    if (!open) {
      recogRef.current?.stop?.();
      setListening(false); setTranscript(""); setReply(""); setThinking(false);
    }
  }, [open]);

  function start() {
    const w = window as unknown as { SpeechRecognition?: SR; webkitSpeechRecognition?: SR };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { toast.error("Voice input isn't supported on this browser"); return; }
    const r = new Ctor();
    r.lang = "en-US"; r.interimResults = true; r.continuous = false;
    r.onresult = (e) => {
      const t = Array.from(e.results).map((res) => res[0].transcript).join(" ");
      setTranscript(t);
    };
    r.onend = () => { setListening(false); void ask(); };
    r.onerror = () => { setListening(false); toast.error("Couldn't hear you"); };
    recogRef.current = r;
    setTranscript(""); setReply("");
    setListening(true);
    r.start();
  }

  function stop() { recogRef.current?.stop?.(); setListening(false); }

  async function ask() {
    const t = (transcript || "").trim();
    if (!t) return;
    setThinking(true); setReply("");
    try {
      const res = await fetch("/api/sam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "chat", messages: [{ role: "user", content: t }] }),
      });
      if (!res.ok || !res.body) throw new Error("Sam is unavailable");
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = ""; let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += value;
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6); if (data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data).choices?.[0]?.delta?.content;
            if (delta) { acc += delta; setReply(acc); }
          } catch { /* ignore */ }
        }
      }
      // speak
      if ("speechSynthesis" in window && acc) {
        const u = new SpeechSynthesisUtterance(acc);
        u.rate = 1; u.pitch = 1;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sam couldn't respond");
    } finally { setThinking(false); }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh] border-none bg-transparent p-0">
        <div className="glass-strong mx-auto flex h-[80vh] w-full max-w-[480px] flex-col items-center overflow-hidden rounded-t-3xl p-6">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-muted-foreground/30" />
          <div className="font-display text-2xl italic">Voice mode</div>
          <p className="mt-1 text-center text-xs text-muted-foreground">Tap the orb to speak. Sam will answer aloud.</p>

          <div className="my-8 flex flex-col items-center gap-6">
            <button
              onClick={listening ? stop : start}
              className="relative"
              aria-label={listening ? "Stop listening" : "Start listening"}
            >
              {listening && (
                <span className="absolute inset-0 rounded-full animate-pulse-ring" />
              )}
              <SamOrb size={180} thinking={thinking || listening} />
            </button>
            <div className="text-[oklch(0.55_0.15_25)]"><VoiceWave active={listening || thinking} /></div>
          </div>

          <div className="w-full flex-1 overflow-y-auto rounded-2xl bg-white/40 p-4">
            {transcript && (
              <div className="mb-3 text-right">
                <div className="inline-block rounded-2xl rounded-br-md px-3 py-2 text-sm text-white"
                  style={{ background: "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.28 0.03 20))" }}>
                  {transcript}
                </div>
              </div>
            )}
            {reply ? (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{reply}</div>
            ) : thinking ? (
              <div className="text-sm text-muted-foreground">Sam is thinking…</div>
            ) : !transcript ? (
              <div className="text-center text-xs text-muted-foreground">Say something like "give me a caption for a rainy café photo"</div>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse" style={{ animationDelay: `${d}ms` }} />;
}
