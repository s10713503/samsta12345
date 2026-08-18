// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGateway, buildPersona, computeStatus } from "./twin.server";

/** Server-only privileged client: twin persona/presence of OTHER users is not readable under RLS. */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** A user asks another user's Digital Twin a question. */
export const askTwin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const d = input as { targetUserId: string; message: string; conversationId?: string };
    if (!d?.targetUserId || !d?.message) throw new Error("targetUserId and message required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Target twin must exist and be enabled.
    const { data: twin } = await (await admin()).from("digital_twins").select("is_enabled,allow_public_ask")
      .eq("user_id", data.targetUserId).maybeSingle();
    if (!twin?.is_enabled) throw new Error("This user's Digital Twin is off.");
    if (userId !== data.targetUserId && !twin.allow_public_ask) throw new Error("This twin is private.");

    // Find or create conversation.
    let convoId = data.conversationId;
    if (!convoId) {
      const { data: created, error } = await supabase.from("twin_conversations").insert({
        initiator_id: userId,
        target_user_id: data.targetUserId,
        kind: "user_to_twin",
        title: data.message.slice(0, 60),
      }).select("id").single();
      if (error) throw error;
      convoId = created.id;
    }

    // Store user message.
    await supabase.from("twin_messages").insert({
      conversation_id: convoId, role: "user", author_id: userId, content: data.message,
    });

    // Build persona + history and generate.
    const system = await buildPersona(await admin(), data.targetUserId);
    const { data: history } = await supabase.from("twin_messages")
      .select("role,content").eq("conversation_id", convoId).order("created_at");
    const messages = (history ?? []).map((m: any) => ({
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: m.content,
    }));

    const reply = await callGateway(system, messages);
    await supabase.from("twin_messages").insert({
      conversation_id: convoId, role: "twin_target", author_id: data.targetUserId, content: reply,
    });

    return { conversationId: convoId, reply };
  });

/** Trigger one turn in a twin-to-twin conversation. */
export const twinToTwinTurn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const d = input as { conversationId: string };
    if (!d?.conversationId) throw new Error("conversationId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: convo } = await supabase.from("twin_conversations")
      .select("initiator_id,target_user_id,kind").eq("id", data.conversationId).single();
    if (!convo) throw new Error("Conversation not found");
    if (convo.kind !== "twin_to_twin") throw new Error("Not a twin-to-twin conversation");
    if (userId !== convo.initiator_id && userId !== convo.target_user_id) throw new Error("Not a participant");

    // Both twins must be enabled and allow twin-to-twin.
    const { data: twins } = await (await admin()).from("digital_twins")
      .select("user_id,is_enabled,allow_twin_to_twin")
      .in("user_id", [convo.initiator_id, convo.target_user_id]);
    if ((twins ?? []).length < 2 || twins!.some((t: any) => !t.is_enabled || !t.allow_twin_to_twin))
      throw new Error("Both users must enable twin-to-twin.");

    const { data: history } = await supabase.from("twin_messages")
      .select("role,content").eq("conversation_id", data.conversationId).order("created_at");
    const turnCount = (history ?? []).length;
    if (turnCount >= 12) return { done: true, reply: "" };

    // Alternate: initiator's twin speaks on even turns, target's on odd.
    const nextIsInitiator = turnCount % 2 === 0;
    const speakerId = nextIsInitiator ? convo.initiator_id : convo.target_user_id;
    const speakerRole = nextIsInitiator ? "twin_initiator" : "twin_target";

    const system = await buildPersona(await admin(), speakerId);
    // Flip perspective: prior messages from the same speaker are "assistant", the other are "user".
    const messages = (history ?? []).map((m: any) => {
      const isMe = (m.role === "twin_initiator" && nextIsInitiator) || (m.role === "twin_target" && !nextIsInitiator);
      return { role: isMe ? "assistant" as const : "user" as const, content: m.content };
    });
    if (messages.length === 0) messages.push({ role: "user", content: "Hi! Introduce yourself and start a warm conversation." });

    const reply = await callGateway(system, messages);
    await supabase.from("twin_messages").insert({
      conversation_id: data.conversationId, role: speakerRole, author_id: speakerId, content: reply,
    });
    return { done: false, reply };
  });

/** Start a twin-to-twin conversation between the current user and a target. */
export const startTwinToTwin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const d = input as { targetUserId: string; topic?: string };
    if (!d?.targetUserId) throw new Error("targetUserId required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: created, error } = await supabase.from("twin_conversations").insert({
      initiator_id: userId,
      target_user_id: data.targetUserId,
      kind: "twin_to_twin",
      title: data.topic || "Twin chat",
    }).select("id").single();
    if (error) throw error;
    return { conversationId: created.id };
  });

/** Update presence for the current user. */
export const heartbeat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("presence").upsert({ user_id: userId, last_seen: new Date().toISOString() });
    return { ok: true };
  });

/** Fetch current user's private availability. Never exposed to other users. */
export const getMyAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: twin } = await supabase.from("digital_twins")
      .select("manual_status,focus_mode,busy_schedule,availability_detection")
      .eq("user_id", userId).maybeSingle();
    const { data: presence } = await supabase.from("presence").select("last_seen")
      .eq("user_id", userId).maybeSingle();
    return computeStatus((twin ?? {}) as any, presence);
  });

/** DM auto-reply — replies only when recipient's Twin considers them Busy. */
export const dmAutoReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const d = input as { recipientId: string; message: string; chatId?: string };
    if (!d?.recipientId || !d?.message) throw new Error("recipientId and message required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (userId === data.recipientId) return { replied: false, reply: null };

    const { data: twin } = await (await admin()).from("digital_twins")
      .select("is_enabled,auto_reply_dm,manual_status,focus_mode,busy_schedule,availability_detection,auto_reply_label")
      .eq("user_id", data.recipientId).maybeSingle();
    if (!twin?.is_enabled || !twin.auto_reply_dm) return { replied: false, reply: null };

    const { data: presence } = await (await admin()).from("presence").select("last_seen")
      .eq("user_id", data.recipientId).maybeSingle();
    const { status, reason } = computeStatus(twin as any, presence);
    if (status !== "busy") return { replied: false, reply: null, status };

    // Recent activity from recipient in this chat = they resumed → skip auto-reply.
    if (data.chatId) {
      const { data: recent } = await supabase.from("messages")
        .select("sender_id,created_at").eq("chat_id", data.chatId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (recent?.sender_id === data.recipientId &&
          Date.now() - new Date(recent.created_at).getTime() < 2 * 60 * 1000) {
        return { replied: false, reply: null, status };
      }
    }

    const { data: convo } = await supabase.from("twin_conversations").insert({
      initiator_id: userId,
      target_user_id: data.recipientId,
      kind: "dm_auto",
      title: data.message.slice(0, 60),
    }).select("id").single();
    if (!convo) return { replied: false, reply: null };

    await supabase.from("twin_messages").insert({
      conversation_id: convo.id, role: "user", author_id: userId, content: data.message,
    });

    const system = await buildPersona(await admin(), data.recipientId) +
      `\n\nContext: The real user is currently Busy (${reason}). You're their twin auto-replying on their behalf. Acknowledge warmly, answer helpfully within routine permissions, and (if relevant) offer to schedule or hand off when they're back. Keep it under 80 words.`;
    const reply = await callGateway(system, [{ role: "user", content: data.message }]);
    const label = twin.auto_reply_label || "Generated by Sam";
    await supabase.from("twin_messages").insert({
      conversation_id: convo.id, role: "twin_target", author_id: data.recipientId, content: reply,
    });

    if (data.chatId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("messages").insert({
        chat_id: data.chatId,
        sender_id: data.recipientId,
        body: `🤖 ${label}\n\n${reply}`,
      });
    }

    return { replied: true, reply, conversationId: convo.id, status };
  });

