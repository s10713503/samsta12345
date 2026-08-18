// @ts-nocheck
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Liker = {
  user_id: string;
  created_at: string;
  profile: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

export function LikersSheet({ open, onClose, postId }: { open: boolean; onClose: () => void; postId: string }) {
  const [likers, setLikers] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from("post_likes")
      .select("user_id, created_at, profile:profiles!post_likes_user_id_fkey(id, username, full_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLikers((data ?? []) as unknown as Liker[]);
        setLoading(false);
      });
  }, [open, postId]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="glass w-full max-w-md rounded-t-3xl bg-background pb-6 pt-3 max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border" />
        <div className="flex items-center justify-between px-4 pb-2">
          <h3 className="text-base font-semibold">Likes</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {loading ? (
            <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : likers.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No likes yet.</p>
          ) : (
            <ul className="flex flex-col">
              {likers.map((l) => (
                <li key={l.user_id} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                  <Link to="/profile/$userId" params={{ userId: l.user_id }} onClick={onClose}>
                    {l.profile?.avatar_url ? (
                      <img src={l.profile.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-border" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground ring-1 ring-border">
                        {(l.profile?.username ?? "?")[0]?.toUpperCase()}
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to="/profile/$userId" params={{ userId: l.user_id }} onClick={onClose} className="block">
                      <div className="truncate text-sm font-semibold">{l.profile?.username ?? "user"}</div>
                      {l.profile?.full_name && <div className="truncate text-xs text-muted-foreground">{l.profile.full_name}</div>}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
