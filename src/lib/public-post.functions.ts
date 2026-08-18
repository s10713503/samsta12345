import { createServerFn } from "@tanstack/react-start";

export type PublicPostPreview = {
  id: string;
  caption: string | null;
  kind: string;
  userId: string;
  username: string | null;
  fullName: string | null;
  isPrivate: boolean;
};

/**
 * Link-preview data for a shared post. Only public authors are exposed —
 * private accounts return `isPrivate: true` and nothing else.
 */
export const getPublicPostPreview = createServerFn({ method: "GET" })
  .inputValidator((input: { postId: string }) => input)
  .handler(async ({ data }): Promise<PublicPostPreview | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("id, caption, kind, user_id")
      .eq("id", data.postId)
      .maybeSingle();
    if (!post) return null;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name, is_private")
      .eq("id", post.user_id as string)
      .maybeSingle();
    const isPrivate = !!profile?.is_private;
    return {
      id: post.id as string,
      caption: isPrivate ? null : ((post.caption as string | null) ?? null),
      kind: post.kind as string,
      userId: post.user_id as string,
      username: isPrivate ? null : ((profile?.username as string | null) ?? null),
      fullName: isPrivate ? null : ((profile?.full_name as string | null) ?? null),
      isPrivate,
    };
  });
