// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Send, Radio, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { askTwin, startTwinToTwin, twinToTwinTurn } from "@/lib/twin.functions";

const ACCENT = "linear-gradient(135deg, oklch(0.35 0.04 20), oklch(0.5 0.1 30))";

export const Route = createFileRoute("/twin/$userId")({
  validateSearch: (s: Record<string, unknown>) => ({ convo: typeof s.convo === "string" ? s.convo : undefined }),
  component: TwinChat,
});

type Msg = { id: string; role: string; content: string; created_at: string; author_id: string | null };
type TargetInfo = { id: string; username: string | null; full_name: string | null; avatar_url: string | null };

function TwinChat() {
  const { userId } = Route.useParams();
  const { convo: initialConvo } = Route.useSearch();
  const { user } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();

  const [target, setTarget] = useState<TargetInfo | null>(null);
  const [targetTwin, setTargetTwin] = useState<{ is_enabled: boolean; allow_public_ask: boolean; allow_twin_to_twin: boolean } | null>(null);
  const [targetPremium, setTargetPremium] = useState(false);
  const [convoId, setConvoId] = useState<string | undefined>(initialConvo);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [twinTalking, setTwinTalking] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const ask = useServerFn(askTwin);
  const startTT = useServerFn(startTwinToTwin);
  const turnTT = useServerFn(twinToTwinTurn);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("id,username,full_name,avatar_url").eq("id", userId).maybeSingle();
      setTarget(p);
      const { data: flags } = await supabase.rpc("twin_flags", { _user_id: userId });
      setTargetTwin(Array.isArray(flags) ? (flags[0] ?? null) : (flags ?? null));
      const { data: premium } = await supabase.rpc("is_premium", { _user_id: userId });
      setTargetPremium(!!premium);
    })();
  }, [userId]);

  useEffect(() => {
    if (!convoId) return;
    (async () => {
      const { data } = await supabase.from("twin_messages").select("*").eq("conversation_id", convoId).order("created_at");
      setMsgs((data ?? []) as Msg[]);
    })();
    const ch = supabase.channel(`twin-msg-${convoId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "twin_messages", filter: `conversation_id=eq.${convoId}` },
        (payload) => setMsgs((m) => [...m, payload.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convoId]);

  useEffect(() => { scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    if (!isPremium) { navigate({ to: "/premium" }); return; }
    setSending(true);
    try {
      const res = await ask({ data: { targetUserId: userId, message: text, conversationId: convoId } });
      setConvoId(res.conversationId);
      setText("");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed"); }
    finally { setSending(false); }
  };

  const startTwinTalk = async () => {
    if (!isPremium || !targetPremium) { toast.error("Both users need Premium for Twin ↔ Twin."); return; }
    setTwinTalking(true);
    try {
      const { conversationId } = await startTT({ data: { targetUserId: userId, topic: "Twin ↔ Twin" } });
      setConvoId(conversationId);
      // Kick off up to 6 turns.
      for (let i = 0; i < 6; i++) {
        const r = await turnTT({ data: { conversationId } });
        if (r.done) break;
        await new Promise((r) => setTimeout(r, 300));
      }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Twin talk failed"); }
    finally { setTwinTalking(false); }
  };

  const twinOn = targetTwin?.is_enabled && (targetTwin.allow_public_ask || user?.id === userId);
  const canTwinToTwin = isPremium && targetPremium && targetTwin?.allow_twin_to_twin;

  return (
    <div className="min-h-screen pb-32">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants/digital-twin" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <img src={target?.avatar_url || "/favicon.ico"} alt="" className="h-10 w-10 rounded-full object-cover" />
        <div className="flex-1">
          <div className="font-display italic leading-tight">{target?.full_name || target?.username || "…"}'s Twin</div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Bot className="h-3 w-3" /> {twinOn ? "Digital Twin· online" : "Twin off"}
          </div>
        </div>
        {canTwinToTwin && (
          <button onClick={startTwinTalk} disabled={twinTalking}
            className="rounded-full px-3 py-1.5 text-[11px] text-white" style={{ background: ACCENT }}>
            {twinTalking ? <RefreshCw className="h-3 w-3 animate-spin" /> : <><Radio className="mr-1 inline h-3 w-3" />Twin ↔ Twin</>}
          </button>
        )}
      </header>

      <div ref={scrollerRef} className="mx-4 min-h-[50vh] max-h-[68vh] overflow-y-auto rounded-3xl bg-white/40 p-3 space-y-2">
        {!twinOn && <div className="py-10 text-center text-xs text-muted-foreground">This person hasn't turned on their Twin.</div>}
        {msgs.length === 0 && twinOn && <div className="py-10 text-center text-xs text-muted-foreground">Say hi — the Twin will answer in {target?.full_name || "their"} voice.</div>}
        {msgs.map((m) => {
          const isMe = m.role === "user" && m.author_id === user?.id;
          const isTwin = m.role.startsWith("twin");
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-foreground text-background" : isTwin ? "text-white" : "bg-white/70"}`}
                style={isTwin ? { background: ACCENT } : undefined}>
                {isTwin && <div className="mb-0.5 text-[9px] uppercase tracking-wider opacity-70">{m.role === "twin_initiator" ? "Twin A" : "Twin"}</div>}
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            </div>
          );
        })}
      </div>

      {twinOn && (
        <div className="fixed bottom-24 left-1/2 z-20 flex w-full max-w-[480px] -translate-x-1/2 gap-2 px-4">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={`Message ${target?.full_name || "Twin"}…`}
            className="flex-1 rounded-full border border-border bg-white/80 px-4 py-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-[oklch(0.82_0.1_20/0.4)]" />
          <button onClick={send} disabled={!text.trim() || sending}
            className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md disabled:opacity-40" style={{ background: ACCENT }}>
            {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      )}
    </div>
  );
}
