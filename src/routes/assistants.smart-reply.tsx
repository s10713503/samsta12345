// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageSquare, Send, Copy, RefreshCw, Sparkles, Shield, ShieldAlert, ShieldCheck,
  Heart, ThumbsUp, ThumbsDown, Handshake, PartyPopper, CalendarClock, Volume2,
  Wand2, Languages, Image as ImageIcon, X, Save, Mic, Brain, Zap, Globe2, Briefcase,
  Star, Gauge, Lock,
} from "lucide-react";
import { toast } from "sonner";
import { AssistantShell } from "@/components/samsta/AssistantShell";
import { streamSam } from "@/lib/stream-sam";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistants/smart-reply")({ component: SmartReplyPage });

const ACCENT = "linear-gradient(135deg, oklch(0.78 0.11 250), oklch(0.75 0.13 270))";

const STYLES = ["Friendly", "Professional", "Luxury", "Funny", "Formal", "Romantic", "Gen-Z", "Business"] as const;
type Style = typeof STYLES[number];

const LANGS = ["English", "Hindi", "Spanish", "French", "German", "Portuguese", "Arabic", "Japanese", "Korean", "Chinese"] as const;
type Lang = typeof LANGS[number];

const LENGTHS = ["short", "medium", "long"] as const;
type Length = typeof LENGTHS[number];

const ACTIONS = [
  { key: "Agree", Icon: ThumbsUp },
  { key: "Decline", Icon: ThumbsDown },
  { key: "Thank You", Icon: Heart },
  { key: "Apologize", Icon: Handshake },
  { key: "Congratulate", Icon: PartyPopper },
  { key: "Schedule Meeting", Icon: CalendarClock },
] as const;

const REWRITES = ["short", "long", "simpler", "persuasive", "professional", "polite"] as const;
type Rewrite = typeof REWRITES[number];

type Analysis = {
  conversation_type?: string;
  tone?: string;
  language?: string;
  summary?: string;
  suggested_actions?: string[];
  safety?: { risk?: "low" | "medium" | "high"; signals?: string[]; advice?: string };
};

type Quality = {
  politeness?: number;
  clarity?: number;
  confidence?: number;
  professionalism?: number;
  note?: string;
};

type Memory = { style_notes: string; favorite_phrases: string[]; emojis: string[] };

function SmartReplyPage() {
  const { user } = useAuthUser();
  const [incoming, setIncoming] = useState("");
  const [history, setHistory] = useState("");
  const [style, setStyle] = useState<Style>("Friendly");
  const [lang, setLang] = useState<Lang>("English");
  const [length, setLength] = useState<Length>("medium");
  const [attachment, setAttachment] = useState<{ name: string; data_url: string } | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<string[]>([]);
  const [activeDraft, setActiveDraft] = useState(0);

  const [followups, setFollowups] = useState<string[]>([]);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [memory, setMemory] = useState<Memory>({ style_notes: "", favorite_phrases: [], emojis: [] });
  const [memPhrase, setMemPhrase] = useState("");
  const [memEmoji, setMemEmoji] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Load memory
  useEffect(() => {
    if (!user) return;
    supabase.from("smart_reply_memory").select("style_notes, favorite_phrases, emojis")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setMemory({
          style_notes: data.style_notes ?? "",
          favorite_phrases: (data.favorite_phrases as string[] | null) ?? [],
          emojis: (data.emojis as string[] | null) ?? [],
        });
      });
  }, [user?.id]);

  const saveMemory = async () => {
    if (!user) return;
    const { error } = await supabase.from("smart_reply_memory").upsert({
      user_id: user.id,
      style_notes: memory.style_notes,
      favorite_phrases: memory.favorite_phrases,
      emojis: memory.emojis,
    });
    if (error) toast.error(error.message); else toast.success("Style memory saved");
  };

  const onFile = async (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Only images are supported"); return; }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: f.name, data_url: String(reader.result) });
    reader.readAsDataURL(f);
  };

  const analyze = async () => {
    if (!incoming.trim() && !attachment) return;
    setAnalyzing(true); setAnalysis(null); setQuality(null); setFollowups([]);
    try {
      const res = await fetch("/api/smart-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "analyze", incoming, history, attachment }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnalysis(await res.json() as Analysis);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyze failed");
    } finally { setAnalyzing(false); }
  };

  const generate = async () => {
    if (!incoming.trim() && !attachment) { toast.error("Paste a message first"); return; }
    setGenerating(true); setDrafts([]); setActiveDraft(0); setQuality(null); setFollowups([]);
    const payload = {
      incoming,
      history,
      conversation_type: analysis?.conversation_type ?? "friend",
      tone_detected: analysis?.tone ?? "neutral",
      style, target_language: lang, length,
      memory: {
        style_notes: memory.style_notes,
        favorite_phrases: memory.favorite_phrases,
        emojis: memory.emojis,
      },
    };
    const userText = "```json\n" + JSON.stringify(payload, null, 2) + "\n```";
    try {
      const content: unknown = attachment
        ? [{ type: "text", text: userText }, { type: "image_url", image_url: { url: attachment.data_url } }]
        : userText;
      let acc = "";
      await streamSam("smart_reply_generate", [{ role: "user", content: content as string }], (s) => {
        acc = s;
        setDrafts(s.split(/^---$/m).map((x) => x.trim()).filter(Boolean));
      });
      if (!acc.trim()) throw new Error("Empty response");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally { setGenerating(false); }
  };

  const runAction = async (action: string) => {
    setGenerating(true); setDrafts([]); setActiveDraft(0);
    const brief = `Action: ${action}\nStyle: ${style}\nLanguage: ${lang}\n\nIncoming:\n${incoming}`;
    try {
      let acc = "";
      await streamSam("smart_reply_action", [{ role: "user", content: brief }], (s) => { acc = s; setDrafts([s]); });
      if (!acc.trim()) throw new Error("Empty");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setGenerating(false); }
  };

  const rewrite = async (mode: Rewrite) => {
    const src = drafts[activeDraft];
    if (!src) return;
    setGenerating(true);
    try {
      let acc = "";
      await streamSam("smart_reply_rewrite", [
        { role: "user", content: `Mode: ${mode}\nTarget language: ${lang}\n\nDraft:\n${src}` },
      ], (s) => { acc = s; setDrafts((d) => d.map((x, i) => (i === activeDraft ? s : x))); });
      if (!acc.trim()) throw new Error("Empty");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Rewrite failed"); }
    finally { setGenerating(false); }
  };

  const runFollowups = async () => {
    const draft = drafts[activeDraft]; if (!draft) return;
    try {
      const res = await fetch("/api/smart-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "followups", incoming, draft }),
      });
      if (!res.ok) throw new Error(await res.text());
      const j = await res.json() as { followups?: string[] };
      setFollowups(j.followups ?? []);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Follow-ups failed"); }
  };

  const runQuality = async () => {
    const draft = drafts[activeDraft]; if (!draft) return;
    try {
      const res = await fetch("/api/smart-reply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "quality", incoming, draft }),
      });
      if (!res.ok) throw new Error(await res.text());
      setQuality(await res.json() as Quality);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Score failed"); }
  };

  const speak = () => {
    const t = drafts[activeDraft]; if (!t) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { toast.error("Voice not supported"); return; }
    const u = new SpeechSynthesisUtterance(t);
    u.rate = 1; u.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const copy = async () => {
    const t = drafts[activeDraft]; if (!t) return;
    try { await navigator.clipboard.writeText(t); toast.success("Copied"); } catch { toast.error("Copy failed"); }
  };

  const safety = analysis?.safety;
  const safetyMeta = useMemo(() => {
    const r = safety?.risk ?? "low";
    if (r === "high") return { Icon: ShieldAlert, cls: "bg-red-500/95", label: "High risk" };
    if (r === "medium") return { Icon: Shield, cls: "bg-amber-500/95", label: "Caution" };
    return { Icon: ShieldCheck, cls: "bg-emerald-500/95", label: "Safe" };
  }, [safety?.risk]);

  return (
    <AssistantShell title="Smart Reply" hint="Conversation Intelligence Engine" accent={ACCENT} icon={<MessageSquare className="h-5 w-5" />}>
      <div className="space-y-4">
        {/* Premium Hero */}
        <PremiumHero />

        {/* Incoming */}
        <div className="glass-strong rounded-3xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-medium text-muted-foreground">Incoming message</div>
            <button onClick={() => setShowMemory((v) => !v)} className="text-[11px] text-muted-foreground underline underline-offset-2">
              {showMemory ? "Hide memory" : "Style memory"}
            </button>
          </div>
          <textarea
            rows={3} value={incoming} onChange={(e) => setIncoming(e.target.value)}
            placeholder="Paste the DM, comment, or email you received…"
            className="w-full resize-none rounded-2xl border border-border bg-white/60 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[oklch(0.75_0.13_270/0.35)]"
          />
          <textarea
            rows={2} value={history} onChange={(e) => setHistory(e.target.value)}
            placeholder="Optional: recent conversation history (last few lines)"
            className="w-full resize-none rounded-2xl border border-border bg-white/50 px-4 py-3 text-xs outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px]">
              <ImageIcon className="h-3.5 w-3.5" /> Add image
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            {attachment && (
              <span className="glass inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px]">
                {attachment.name.slice(0, 22)}
                <button onClick={() => setAttachment(null)} aria-label="Remove"><X className="h-3 w-3" /></button>
              </span>
            )}
            <div className="ml-auto flex gap-2">
              <button
                onClick={analyze} disabled={analyzing || (!incoming.trim() && !attachment)}
                className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] disabled:opacity-40"
              >
                {analyzing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Analyze
              </button>
            </div>
          </div>
        </div>

        {/* Style memory */}
        {showMemory && (
          <div className="glass rounded-3xl p-4 space-y-3 animate-fade-in">
            <div className="text-[11px] font-medium text-muted-foreground">Your writing-style memory</div>
            <textarea
              rows={2} value={memory.style_notes}
              onChange={(e) => setMemory((m) => ({ ...m, style_notes: e.target.value }))}
              placeholder="Notes about how you write (e.g. warm, short sentences, no exclamations)…"
              className="w-full resize-none rounded-xl border border-border bg-white/60 px-3 py-2 text-sm outline-none"
            />
            <div>
              <div className="mb-1 text-[11px] text-muted-foreground">Favorite phrases</div>
              <div className="flex flex-wrap gap-1.5">
                {memory.favorite_phrases.map((p, i) => (
                  <span key={i} className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]">
                    {p}
                    <button onClick={() => setMemory((m) => ({ ...m, favorite_phrases: m.favorite_phrases.filter((_, j) => j !== i) }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={memPhrase} onChange={(e) => setMemPhrase(e.target.value)} placeholder='"Thanks a ton"'
                  className="flex-1 rounded-full border border-border bg-white/60 px-3 py-1.5 text-[12px] outline-none" />
                <button
                  onClick={() => { if (memPhrase.trim()) { setMemory((m) => ({ ...m, favorite_phrases: [...m.favorite_phrases, memPhrase.trim()] })); setMemPhrase(""); } }}
                  className="rounded-full bg-foreground px-3 py-1.5 text-[11px] text-background"
                >Add</button>
              </div>
            </div>
            <div>
              <div className="mb-1 text-[11px] text-muted-foreground">Emojis you use</div>
              <div className="flex flex-wrap gap-1.5">
                {memory.emojis.map((p, i) => (
                  <span key={i} className="glass inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm">
                    {p}
                    <button onClick={() => setMemory((m) => ({ ...m, emojis: m.emojis.filter((_, j) => j !== i) }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input value={memEmoji} onChange={(e) => setMemEmoji(e.target.value)} placeholder="✨"
                  className="w-24 rounded-full border border-border bg-white/60 px-3 py-1.5 text-sm outline-none" />
                <button
                  onClick={() => { if (memEmoji.trim()) { setMemory((m) => ({ ...m, emojis: [...m.emojis, memEmoji.trim()] })); setMemEmoji(""); } }}
                  className="rounded-full bg-foreground px-3 py-1.5 text-[11px] text-background"
                >Add</button>
                <button onClick={saveMemory} className="ml-auto glass flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px]">
                  <Save className="h-3.5 w-3.5" /> Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Analysis chips */}
        {analysis && (
          <div className="animate-fade-in space-y-2">
            <div className="flex flex-wrap gap-2">
              {analysis.conversation_type && <Chip label={`Context: ${analysis.conversation_type}`} />}
              {analysis.tone && <Chip label={`Tone: ${analysis.tone}`} />}
              {analysis.language && <Chip label={`Lang: ${analysis.language}`} />}
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-white", safetyMeta.cls)}>
                <safetyMeta.Icon className="h-3.5 w-3.5" /> {safetyMeta.label}
              </span>
            </div>
            {analysis.summary && <div className="text-[11px] text-muted-foreground">{analysis.summary}</div>}
            {safety?.risk && safety.risk !== "low" && safety.advice && (
              <div className="rounded-2xl bg-amber-50 px-3 py-2 text-[11px] text-amber-900">⚠️ {safety.advice}</div>
            )}
            {analysis.suggested_actions && analysis.suggested_actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {analysis.suggested_actions.map((a) => (
                  <button key={a} onClick={() => runAction(a)}
                    className="rounded-full bg-foreground/90 px-3 py-1 text-[11px] text-background hover:opacity-90">
                    {a}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Style + language + length */}
        <div className="space-y-2">
          <div className="text-[11px] font-medium text-muted-foreground">Style</div>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <button key={s} onClick={() => setStyle(s)}
                className={`rounded-full px-3 py-1 text-[11px] transition ${style === s ? "bg-foreground text-background" : "glass"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <label className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]">
              <Languages className="h-3.5 w-3.5" />
              <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="bg-transparent outline-none">
                {LANGS.map((l) => <option key={l}>{l}</option>)}
              </select>
            </label>
            <div className="glass flex items-center gap-1 rounded-full p-0.5 text-[11px]">
              {LENGTHS.map((l) => (
                <button key={l} onClick={() => setLength(l)}
                  className={`rounded-full px-2.5 py-0.5 capitalize ${length === l ? "bg-foreground text-background" : ""}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* One-tap actions */}
        <div>
          <div className="mb-1 text-[11px] font-medium text-muted-foreground">One-tap replies</div>
          <div className="flex flex-wrap gap-1.5">
            {ACTIONS.map(({ key, Icon }) => (
              <button key={key} onClick={() => runAction(key)} disabled={!incoming.trim() || generating}
                className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] disabled:opacity-40">
                <Icon className="h-3.5 w-3.5" /> {key}
              </button>
            ))}
          </div>
        </div>

        {/* Generate */}
        <button
          onClick={generate} disabled={generating || (!incoming.trim() && !attachment)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-white shadow-md active:scale-[0.98] disabled:opacity-40"
          style={{ background: ACCENT }}
        >
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {generating ? "Composing…" : "Generate 3 replies"}
        </button>

        {/* Drafts */}
        {drafts.length > 0 && (
          <div className="animate-fade-in space-y-3">
            {drafts.length > 1 && (
              <div className="flex gap-1.5">
                {drafts.map((_, i) => (
                  <button key={i} onClick={() => setActiveDraft(i)}
                    className={`flex-1 rounded-full px-2 py-1 text-[11px] ${activeDraft === i ? "bg-foreground text-background" : "glass"}`}>
                    Draft {i + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="glass-strong rounded-3xl p-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{drafts[activeDraft]}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button onClick={copy} className="glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px]"><Copy className="h-3.5 w-3.5" /> Copy</button>
                <button onClick={speak} className="glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px]"><Volume2 className="h-3.5 w-3.5" /> Voice</button>
                <button onClick={runQuality} className="glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px]"><Sparkles className="h-3.5 w-3.5" /> Score</button>
                <button onClick={runFollowups} className="glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px]"><Mic className="h-3.5 w-3.5" /> Follow-ups</button>
              </div>
              <div className="mt-3">
                <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Rewrite as</div>
                <div className="flex flex-wrap gap-1.5">
                  {REWRITES.map((r) => (
                    <button key={r} onClick={() => rewrite(r)} disabled={generating}
                      className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.06] px-2.5 py-1 text-[11px] capitalize disabled:opacity-40">
                      <Wand2 className="h-3 w-3" /> {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {quality && (
              <div className="glass rounded-3xl p-4 space-y-2">
                <div className="text-[11px] font-medium text-muted-foreground">Quality</div>
                <ScoreBar label="Politeness" value={quality.politeness ?? 0} />
                <ScoreBar label="Clarity" value={quality.clarity ?? 0} />
                <ScoreBar label="Confidence" value={quality.confidence ?? 0} />
                <ScoreBar label="Professionalism" value={quality.professionalism ?? 0} />
                {quality.note && <div className="text-[11px] text-muted-foreground">{quality.note}</div>}
              </div>
            )}

            {followups.length > 0 && (
              <div className="glass rounded-3xl p-4">
                <div className="mb-2 text-[11px] font-medium text-muted-foreground">Keep it going</div>
                <div className="space-y-1.5">
                  {followups.map((f, i) => (
                    <button key={i} onClick={() => navigator.clipboard.writeText(f).then(() => toast.success("Copied"))}
                      className="w-full rounded-2xl bg-white/60 px-3 py-2 text-left text-sm hover:bg-white">
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AssistantShell>
  );
}

function Chip({ label }: { label: string }) {
  return <span className="glass inline-flex items-center rounded-full px-2.5 py-1 text-[11px] capitalize">{label}</span>;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground"><span>{label}</span><span>{v}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div className="h-full rounded-full transition-all" style={{ width: `${v}%`, background: ACCENT }} />
      </div>
    </div>
  );
}

const HERO_FEATURES: Array<{ Icon: typeof Brain; label: string; desc: string; tint: string }> = [
  { Icon: Brain,         label: "Context-Aware",   desc: "Reads history & intent",          tint: "from-violet-500/90 to-indigo-500/90" },
  { Icon: Sparkles,      label: "8 Style Modes",   desc: "Friendly → Luxury → Gen-Z",       tint: "from-fuchsia-500/90 to-pink-500/90" },
  { Icon: Heart,         label: "Tone Detection",  desc: "Adapts to mood in real-time",     tint: "from-rose-500/90 to-orange-400/90" },
  { Icon: Zap,           label: "One-Tap Actions", desc: "Agree · Decline · Thank · Meet",  tint: "from-amber-500/90 to-yellow-400/90" },
  { Icon: Wand2,         label: "Rewrite Engine",  desc: "6 rewrite modes on demand",       tint: "from-emerald-500/90 to-teal-500/90" },
  { Icon: Globe2,        label: "Multi-Language",  desc: "Preserves tone across 10 langs",  tint: "from-cyan-500/90 to-sky-500/90" },
  { Icon: Volume2,       label: "Voice Replies",   desc: "Speak drafts out loud",           tint: "from-blue-500/90 to-indigo-500/90" },
  { Icon: ImageIcon,     label: "Vision Input",    desc: "Understands images & docs",       tint: "from-purple-500/90 to-violet-500/90" },
  { Icon: Mic,           label: "Follow-Ups",      desc: "Keeps conversations alive",       tint: "from-pink-500/90 to-rose-500/90" },
  { Icon: Brain,         label: "Style Memory",    desc: "Learns your phrases & emojis",    tint: "from-indigo-500/90 to-purple-500/90" },
  { Icon: Briefcase,     label: "Business Mode",   desc: "Clients · Support · HR · Sales",  tint: "from-slate-700/90 to-slate-500/90" },
  { Icon: Star,          label: "Creator Mode",    desc: "Fans · Collabs · Sponsors",       tint: "from-orange-500/90 to-pink-500/90" },
  { Icon: ShieldCheck,   label: "Safety Shield",   desc: "Scam · phishing · leak guard",    tint: "from-emerald-600/90 to-green-500/90" },
  { Icon: Gauge,         label: "Quality Scores",  desc: "Politeness · clarity · pro",      tint: "from-teal-500/90 to-cyan-500/90" },
];

function PremiumHero() {
  return (
    <div className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-xl" style={{ background: ACCENT }}>
      {/* animated orbs */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/25 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)]" />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
            <Lock className="h-3 w-3" /> Premium
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-[10px] font-medium backdrop-blur">
            <Zap className="h-3 w-3" /> Live streaming
          </span>
        </div>

        <h2 className="mt-3 font-display text-2xl italic leading-tight">
          Conversation Intelligence Engine
        </h2>
        <p className="mt-1 max-w-md text-[12.5px] text-white/85">
          Not a reply generator — a real-time engine that reads context, tone, and intent, then writes in <em>your</em> voice.
        </p>

        {/* Feature grid */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {HERO_FEATURES.map(({ Icon, label, desc, tint }) => (
            <div
              key={label}
              className="group flex items-start gap-2 rounded-2xl bg-white/12 p-2.5 backdrop-blur-md ring-1 ring-white/15 transition hover:bg-white/20"
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${tint} shadow-md`}>
                <Icon className="h-4 w-4 text-white" />
              </span>
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold leading-tight">{label}</div>
                <div className="truncate text-[10px] text-white/75">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-black/25 px-3 py-2 backdrop-blur">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <div className="text-[10.5px] leading-tight text-white/85">
            Private by design — memory is user-approved, encrypted at rest, and never used to train third-party models.
          </div>
        </div>
      </div>
    </div>
  );
}

