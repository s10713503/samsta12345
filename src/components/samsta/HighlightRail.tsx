// @ts-nocheck
import { useState } from "react";
import { Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "@/hooks/use-auth";
import { listHighlights, createHighlight, listHighlightItems } from "@/lib/api/highlights";
import { listUserStories, signOne } from "@/lib/api/feed";
import { MediaViewer, type ViewerItem } from "./MediaViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function HighlightRail({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const { user } = useAuthUser();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const highlightsQ = useQuery({
    queryKey: ["highlights", userId],
    queryFn: () => listHighlights(userId),
    enabled: !!userId,
  });

  const storiesQ = useQuery({
    queryKey: ["user-stories-all", userId],
    queryFn: async () => {
      // Fetch all past stories (ignore expiry) for picking
      const { data, error } = await supabase
        .from("posts")
        .select("id, media, caption, created_at")
        .eq("user_id", userId)
        .eq("kind", "story")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return data ?? [];
    },
    enabled: showCreate && canEdit,
  });

  const itemsQ = useQuery({
    queryKey: ["highlight-items", openId],
    queryFn: () => listHighlightItems(openId!),
    enabled: !!openId,
  });

  const [viewerItems, setViewerItems] = useState<ViewerItem[] | null>(null);

  async function openHighlight(id: string) {
    setOpenId(id);
    const items = await listHighlightItems(id);
    const built: ViewerItem[] = [];
    for (const p of items) {
      const m = (p.media as any[])?.[0];
      if (!m) continue;
      const url = m.path ? await signOne(m.path, m.bucket ?? "stories") : "";
      built.push({ id: p.id, image: url, type: m.type ?? "image", targetType: "story", caption: p.caption ?? "" });
    }
    setViewerItems(built);
  }

  async function submitCreate() {
    if (!user) return;
    if (!title.trim() || selected.size === 0) {
      toast.error("Add a title and pick at least one story");
      return;
    }
    try {
      const hid = await createHighlight({ userId: user.id, title });
      const { error } = await supabase
        .from("story_highlight_items")
        .upsert([...selected].map((post_id) => ({ highlight_id: hid, post_id, added_by: user.id })), { onConflict: "highlight_id,post_id" });
      if (error) throw error;
      toast.success("Highlight created");
      setShowCreate(false);
      setTitle("");
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["highlights", userId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const highlights = highlightsQ.data ?? [];
  if (!canEdit && highlights.length === 0) return null;

  return (
    <div className="mt-5 px-5">
      <div className="flex gap-4 overflow-x-auto pb-1">
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex shrink-0 flex-col items-center gap-1.5"
            aria-label="New highlight"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-[11px] text-muted-foreground">New</span>
          </button>
        )}
        {highlights.map((h) => (
          <button
            key={h.id}
            onClick={() => openHighlight(h.id)}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="story-gradient h-16 w-16 rounded-full p-[2px]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-background p-[2px]">
                <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {h.title.slice(0, 1).toUpperCase()}
                </div>
              </div>
            </div>
            <span className="max-w-[64px] truncate text-[11px]">{h.title}</span>
          </button>
        ))}
      </div>

      {viewerItems && viewerItems.length > 0 && (
        <MediaViewer items={viewerItems} startIndex={0} mode="story" onClose={() => { setViewerItems(null); setOpenId(null); }} />
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-md animate-fade-in" onClick={() => setShowCreate(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-[min(480px,100%)] rounded-t-3xl bg-background p-5 shadow-2xl animate-slide-in-right sm:animate-scale-in">
            <h2 className="font-display text-xl italic">New highlight</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Travel)"
              className="mt-3 w-full rounded-2xl border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <div className="mt-3 text-xs text-muted-foreground">Pick stories to pin</div>
            <div className="mt-2 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">
              {(storiesQ.data ?? []).map((s: any) => {
                const m = s.media?.[0];
                const isSel = selected.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelected((prev) => {
                        const n = new Set(prev);
                        if (n.has(s.id)) n.delete(s.id); else n.add(s.id);
                        return n;
                      });
                    }}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 ${isSel ? "border-primary" : "border-transparent"}`}
                  >
                    <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
                      {m?.type === "video" ? "Video" : "Photo"}
                    </div>
                    {isSel && <div className="absolute inset-0 bg-primary/20" />}
                  </button>
                );
              })}
              {(storiesQ.data ?? []).length === 0 && (
                <div className="col-span-3 py-6 text-center text-xs text-muted-foreground">No stories yet</div>
              )}
            </div>
            <button
              onClick={submitCreate}
              className="mt-4 w-full rounded-full py-2.5 text-sm font-medium text-white shadow-lg"
              style={{ background: "linear-gradient(135deg, oklch(0.78 0.15 20), oklch(0.72 0.14 30))" }}
            >
              Create highlight
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
