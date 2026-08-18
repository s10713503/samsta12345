// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, X, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { listPendingReels, isAdmin, type EduReel } from "@/lib/api/edu-reels";
import { setEduReelStatus } from "@/lib/edu-reels.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/edu-review")({
  component: AdminReview,
  head: () => ({ meta: [{ title: "Reel moderation queue · Samsta" }] }),
});

function AdminReview() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setStatus = useServerFn(setEduReelStatus);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    isAdmin(user.id).then(setAllowed);
  }, [user, loading, navigate]);

  const { data: reels = [] } = useQuery({
    queryKey: ["edu-review"],
    queryFn: listPendingReels,
    enabled: !!allowed,
  });

  useEffect(() => {
    if (!allowed) return;
    const ch = supabase.channel("edu-review-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "education_reels" }, () => qc.invalidateQueries({ queryKey: ["edu-review"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [allowed, qc]);

  if (allowed === null) return <div className="min-h-dvh grid place-items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (allowed === false) {
    return (
      <div className="min-h-dvh grid place-items-center p-6">
        <div className="text-center">
          <ShieldAlert className="mx-auto h-8 w-8 opacity-70" />
          <div className="mt-3 font-display italic text-xl">Admins only</div>
          <div className="text-sm text-foreground/60 mt-1">This review queue is restricted to admins and moderators.</div>
          <Link to="/" className="mt-4 inline-flex rounded-full bg-foreground text-background px-4 py-2 text-sm">Home</Link>
        </div>
      </div>
    );
  }

  async function decide(id: string, status: "approved" | "rejected") {
    try {
      await setStatus({ data: { id, status } });
      toast.success(status === "approved" ? "Approved" : "Rejected");
      qc.invalidateQueries({ queryKey: ["edu-review"] });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    }
  }

  return (
    <div className="min-h-dvh pb-24">
      <div className="sticky top-0 z-20 backdrop-blur-2xl bg-background/60 border-b border-foreground/5 px-4 py-3 flex items-center gap-3">
        <Link to="/" className="grid place-items-center h-9 w-9 rounded-full bg-background/60 border border-foreground/10"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="flex-1">
          <div className="font-display italic text-lg">Reel review queue</div>
          <div className="text-[11px] text-foreground/60">{reels.length} awaiting decision</div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {reels.length === 0 ? (
          <div className="text-center text-sm text-foreground/60 py-12">Nothing to review. </div>
        ) : (
          reels.map((r: EduReel) => (
            <article key={r.id} className="rounded-3xl border border-foreground/10 bg-background/40 backdrop-blur-2xl overflow-hidden">
              {r.video_url && <video src={r.video_url} controls className="w-full aspect-[9/16] object-cover bg-black" />}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase text-[10px] tracking-wider text-foreground/60">{r.moderation_status}</span>
                  <span className="text-foreground/60">Score {r.moderation_score ?? "?"}/100</span>
                </div>
                <div className="text-sm">{r.caption || <span className="italic text-foreground/50">No caption</span>}</div>
                {r.moderation_reason && <div className="text-xs text-foreground/70">: {r.moderation_reason}</div>}
                {r.hashtags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {r.hashtags.map((h) => <span key={h} className="text-[10px] rounded-full bg-foreground/5 px-2 py-0.5">#{h}</span>)}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => decide(r.id, "approved")} className="flex-1 rounded-xl bg-emerald-500/20 text-emerald-300 py-2 text-xs font-semibold active:scale-95">
                    <Check className="inline h-4 w-4 mr-1" /> Approve
                  </button>
                  <button onClick={() => decide(r.id, "rejected")} className="flex-1 rounded-xl bg-rose-500/20 text-rose-300 py-2 text-xs font-semibold active:scale-95">
                    <X className="inline h-4 w-4 mr-1" /> Reject
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
