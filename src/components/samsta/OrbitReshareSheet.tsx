// @ts-nocheck
import { useState } from "react";
import { X, Repeat2, Quote, Send, Link2, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase as raw } from "@/integrations/supabase/client";
import { repostOrbit, type OrbitPost } from "@/lib/api/orbit";
import { listOrbitThreads } from "@/lib/api/orbit-identity";

const sb = raw as any;

async function sendPostToThread(threadId: string, meId: string, post: OrbitPost) {
  const url = `${window.location.origin}/orbit/${post.id}`;
  const body = `${post.body ? `${post.body.slice(0, 160)}\n` : ""}${url}`;
  const { error } = await sb.from("orbit_dms").insert({
    thread_id: threadId, sender_id: meId, kind: "text", body,
  });
  if (error) throw error;
  await sb.from("orbit_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
}

/**
 * Reshare hub: repost into your orbit, quote it with your own take,
 * or send it straight into an Orbit conversation.
 */
export function OrbitReshareSheet({
  open, onClose, post, meId, onQuote,
}: {
  open: boolean; onClose: () => void; post: OrbitPost | null;
  meId: string | null; onQuote: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const { data: threads = [] } = useQuery({
    queryKey: ["orbit-threads", meId],
    queryFn: () => listOrbitThreads(meId),
    enabled: open && !!meId,
  });

  if (!open || !post) return null;

  const guard = async (key: string, fn: () => Promise<void>, label: string) => {
    if (!meId) { setErr("Sign in to reshare."); return; }
    setBusy(key); setErr(null);
    try { await fn(); setDone(label); setTimeout(onClose, 700); }
    catch (e: any) { setErr(e?.message ?? "Could not reshare."); }
    finally { setBusy(null); }
  };

  const url = `${window.location.origin}/orbit/${post.id}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-sm animate-fade-up"
      onClick={onClose}>
      <div className="glass-strong relative w-full max-w-[480px] rounded-t-3xl px-5 pb-8 pt-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
        <button onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/60">
          <X className="h-4 w-4" />
        </button>
        <div className="font-display text-lg italic">Reshare</div>

        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={() => guard("repost", async () => { await repostOrbit(post.id, meId!); }, "Reposted")}
            disabled={busy === "repost"}
            className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm active:scale-[0.98]">
            <Repeat2 className="h-4 w-4" />
            <span className="flex-1 font-medium">Repost to your orbit</span>
            {busy === "repost" && <span className="text-xs text-muted-foreground">…</span>}
          </button>
          <button onClick={() => { onClose(); onQuote(); }}
            className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm active:scale-[0.98]">
            <Quote className="h-4 w-4" />
            <span className="flex-1 font-medium">Quote with your take</span>
          </button>
          <button
            onClick={() => guard("link", async () => { await navigator.clipboard.writeText(url); }, "Link copied")}
            className="glass flex items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm active:scale-[0.98]">
            <Link2 className="h-4 w-4" />
            <span className="flex-1 font-medium">Copy link</span>
          </button>
        </div>

        <div className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Send to a conversation
        </div>
        <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
          {!meId && <p className="text-xs text-muted-foreground">Sign in to send this to your chats.</p>}
          {meId && !threads.length && (
            <p className="text-xs text-muted-foreground">No Orbit conversations yet — start one from the inbox.</p>
          )}
          {threads.map((t: any) => (
            <button key={t.id}
              onClick={() => guard(t.id, async () => { await sendPostToThread(t.id, meId!, post); }, "Sent")}
              disabled={busy === t.id}
              className="glass flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left active:scale-[0.98]">
              <Send className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{t.title || (t.is_group ? "Group" : "Conversation")}</span>
                {t.preview && <span className="block truncate text-[11px] text-muted-foreground">{t.preview}</span>}
              </span>
              {busy === t.id && <span className="text-xs text-muted-foreground">…</span>}
            </button>
          ))}
        </div>

        {err && <div className="mt-3 text-xs text-destructive">{err}</div>}
        {done && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-primary">
            <Check className="h-3.5 w-3.5" /> {done}
          </div>
        )}
      </div>
    </div>
  );
}
