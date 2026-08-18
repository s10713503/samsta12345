import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in account. The caller must have already
 * re-authenticated (password + emailed code) on the client. Deletion of the
 * auth user cascades to all owned rows.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId as string;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort cleanup of content that is not FK-cascaded.
    for (const table of ["posts", "stories", "messages", "notifications", "user_settings"]) {
      try {
        await supabaseAdmin.from(table as never).delete().eq("user_id", userId);
      } catch {
        /* table may not have user_id — ignore */
      }
    }
    try {
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
    } catch {
      /* ignore */
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
