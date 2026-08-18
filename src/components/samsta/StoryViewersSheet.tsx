// @ts-nocheck
import { useEffect, useState } from "react";
import { X, Eye } from "lucide-react";
import { listStoryViewers } from "@/lib/api/stories";
import { signOne } from "@/lib/api/feed";
import { supabase } from "@/integrations/supabase/client";

type Viewer = {
  created_at: string;
  viewer: { id: string; username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

export function StoryViewersSheet({
  storyId,
  open,
  onClose,
}: {
  storyId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !storyId) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await listStoryViewers(storyId);
        if (!alive) return;
        setRows(data);
        const entries = await Promise.all(
          data.map(async (r) => {
            const url = r.viewer?.avatar_url;
            if (!url) return [r.viewer?.id, ""] as const;
            const signed = await signOne(url);
            return [r.viewer?.id, signed ?? ""] as const;
          }),
        );
        const map: Record<string, string> = {};
        entries.forEach(([id, u]) => { if (id) map[id] = u; });
        if (alive) setAvatars(map);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();

    const ch = supabase
      .channel(`story-viewers-${storyId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "story_views", filter: `story_id=eq.${storyId}` },
        () => { void load(); },
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [open, storyId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-t-3xl bg-background pb-6 shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center justify-between px-5 pt-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">
              Viewers <span className="ml-1 text-muted-foreground">· {rows.length}</span>
            </h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 max-h-[60vh] overflow-y-auto px-3">
          {loading && rows.length === 0 && (
            <div className="py-10 text-center text-xs text-muted-foreground">Loading viewers…</div>
          )}
          {!loading && rows.length === 0 && (
            <div className="py-10 text-center text-xs text-muted-foreground">No views yet.</div>
          )}
          <ul className="space-y-1">
            {rows.map((r) => {
              const v = r.viewer;
              const name = v?.full_name ?? v?.username ?? "Someone";
              const handle = v?.username ? `@${v.username}` : "";
              const avatar = v?.id ? avatars[v.id] : "";
              return (
                <li key={`${v?.id}-${r.created_at}`} className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-muted/40">
                  <div className="h-10 w-10 overflow-hidden rounded-full bg-muted">
                    {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{name}</div>
                    {handle && <div className="truncate text-[11px] text-muted-foreground">{handle}</div>}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
