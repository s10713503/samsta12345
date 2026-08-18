// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Paperclip, Trash2, Phone, Video, Users } from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { useConnection } from "@/hooks/use-connection";
import { startCall } from "@/components/samsta/IncomingCallListener";
import { GroupCallModal } from "@/components/samsta/GroupCallModal";
import {
  getChat,
  listMessages,
  sendMessage,
  subscribeChat,
  markRead,
  uploadChatMedia,
  deleteMessage,
  setTyping,
  type MessageMedia,
} from "@/lib/api/messages";
import { supabase } from "@/integrations/supabase/client";
import { dmAutoReply } from "@/lib/twin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/messages/$chatId")({ component: ChatThreadPage });

function ChatThreadPage() {
  const { chatId } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuthUser();
  const [draft, setDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [groupCall, setGroupCall] = useState<null | "audio" | "video">(null);

  const chatQ = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => getChat(chatId),
    enabled: !!chatId,
  });

  const msgQ = useQuery({
    queryKey: ["messages", chatId],
    queryFn: () => listMessages(chatId),
    enabled: !!chatId,
  });

  useEffect(() => {
    if (!chatId) return;
    const unsub = subscribeChat(chatId, () => {
      msgQ.refetch();
      chatQ.refetch();
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    if (user && chatId) markRead(chatId, user.id);
  }, [msgQ.data?.length, user?.id, chatId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgQ.data?.length]);

  // Typing indicator poll
  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;
    const tick = async () => {
      const cutoff = new Date(Date.now() - 4000).toISOString();
      const { data } = await supabase
        .from("typing_status")
        .select("user_id, updated_at")
        .eq("chat_id", chatId)
        .gt("updated_at", cutoff);
      if (cancelled) return;
      setTypingUsers((data ?? []).map((r) => r.user_id as string).filter((u) => u !== user?.id));
    };
    tick();
    const i = window.setInterval(tick, 2000);
    return () => { cancelled = true; window.clearInterval(i); };
  }, [chatId, user?.id]);

  const chat = chatQ.data;
  const other = chat && !chat.is_group ? chat.members.find((m) => m.user_id !== user?.id)?.profile : null;
  const title = chat?.is_group ? chat.name || "Group" : other?.username || "user";
  const conn = useConnection(user?.id, other?.id);
  const canText = !!chat?.is_group || conn.perms.text;

  const doCall = (kind: "audio" | "video") => {
    if (!user || !other) return;
    startCall({
      callerId: user.id,
      callerName: (user.user_metadata as any)?.full_name || (user.email ?? "Samsta user"),
      peerId: other.id,
      peerName: other.username || other.full_name || "user",
      kind,
    });
  };

  const autoReply = useServerFn(dmAutoReply);

  const send = async () => {
    if (!user) return;
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    try {
      await sendMessage({ chatId, senderId: user.id, body });
      // If this is a 1:1 chat and the other user is offline with an active twin,
      // their AI twin will auto-reply into the thread.
      const chat = chatQ.data;
      const other = chat && !chat.is_group ? chat.members.find((m) => m.user_id !== user.id) : null;
      if (other?.user_id) {
        autoReply({ data: { recipientId: other.user_id, message: body, chatId } }).catch(() => {});
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
  };

  const handleFile = async (f: File | null) => {
    if (!f || !user) return;
    setUploading(true);
    try {
      const media: MessageMedia = await uploadChatMedia(user.id, f);
      await sendMessage({ chatId, senderId: user.id, media: [media] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="glass sticky top-0 z-10 flex items-center gap-3 px-3 py-3">
        <button onClick={() => navigate({ to: "/messages" })} aria-label="Back" className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        {other?.avatar_url ? (
          <img src={other.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <div className="h-9 w-9 rounded-full bg-muted ring-1 ring-border" />
        )}
        <div className="flex-1">
          <div className="text-sm font-semibold">{title}</div>
          {typingUsers.length > 0 && (
            <div className="text-[11px] text-muted-foreground">typing…</div>
          )}
        </div>
        {!chat?.is_group && other && conn.perms.voice && (
          <button aria-label="Voice call" onClick={() => doCall("audio")} className="rounded-full bg-white/5 p-2"><Phone className="h-4 w-4" /></button>
        )}
        {!chat?.is_group && other && conn.perms.video && (
          <button aria-label="Video call" onClick={() => doCall("video")} className="rounded-full bg-white/5 p-2"><Video className="h-4 w-4" /></button>
        )}
        {chat?.is_group && (
          <>
            <button aria-label="Group voice" onClick={() => setGroupCall("audio")} className="rounded-full bg-white/5 p-2"><Phone className="h-4 w-4" /></button>
            <button aria-label="Group video" onClick={() => setGroupCall("video")} className="rounded-full bg-white/5 p-2"><Video className="h-4 w-4" /></button>
          </>
        )}
      </header>

      {groupCall && (
        <GroupCallModal
          roomName={`chat-${chatId}`}
          displayName={(user?.user_metadata as any)?.full_name || user?.email || "Samsta user"}
          kind={groupCall}
          onClose={() => setGroupCall(null)}
        />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {msgQ.data?.map((m) => {
          const mine = m.sender_id === user?.id;
          const deleted = !!m.deleted_at;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`group max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-foreground/[0.06]"}`}>
                {deleted ? (
                  <em className="opacity-60">Message deleted</em>
                ) : (
                  <>
                    {m.media?.map((x, i) => (
                      <div key={i} className="mb-1">
                        {x.type === "video" ? (
                          <video src={x.url} controls playsInline className="max-h-64 rounded-xl" />
                        ) : x.type === "audio" ? (
                          <audio src={x.url} controls />
                        ) : (
                          <img src={x.url} alt="" className="max-h-64 rounded-xl object-cover" />
                        )}
                      </div>
                    ))}
                    {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                  </>
                )}
                {mine && !deleted && (
                  <button
                    onClick={() => deleteMessage(m.id)}
                    className="mt-1 flex items-center gap-1 text-[10px] opacity-60 hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 border-t border-border/50 bg-background/70 backdrop-blur px-3 py-2">
        {!canText ? (
          <div className="py-2 text-center text-xs text-muted-foreground">
            {conn.status === "pending"
              ? "Waiting for approval to send messages."
              : "You don’t have permission to message this person yet."}
          </div>
        ) : (
        <div className="flex items-center gap-2">
          <button onClick={() => fileRef.current?.click()} className="p-2" aria-label="Attach">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (user && chatId) setTyping(chatId, user.id);
            }}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message…"
            className="flex-1 rounded-full bg-foreground/[0.06] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || uploading}
            className="flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, oklch(0.55 0.14 25), oklch(0.35 0.04 20))" }}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
