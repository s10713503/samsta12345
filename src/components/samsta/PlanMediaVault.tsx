// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ImagePlus, Lock, Trash2, Crown, HardDrive, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";

const BUCKET = "files";

type MediaRow = {
  id: string;
  path: string;
  filename: string;
  size_bytes: number;
  mime_type: string | null;
  url?: string;
};

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
}

/**
 * Premium media vault for a single study plan.
 * Locked for free / 1-month / 3-month members; unlocked on 6-month (1 TB) and
 * 12-month (2 TB) plans with HD / 4K uploads.
 */
export default function PlanMediaVault({ planKey, planTitle, gradient }: { planKey: string; planTitle: string; gradient: string }) {
  const { user } = useAuthUser();
  const { mediaUnlocked, storageGB, quality, currentPlan, unlimitedMedia } = usePremium();
  const [rows, setRows] = useState<MediaRow[]>([]);
  const [usedBytes, setUsedBytes] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const prefix = user ? `${user.id}/exam-plans/${planKey}/` : "";
  const planLabel = !Number.isFinite(storageGB)
    ? "Unlimited"
    : storageGB >= 1000 ? `${storageGB / 1000} TB` : `${storageGB} GB`;

  const load = useCallback(async () => {
    if (!user || !mediaUnlocked) return;
    const { data: all } = await supabase
      .from("file_uploads")
      .select("id, path, filename, size_bytes, mime_type")
      .eq("user_id", user.id);
    const list = all || [];
    setUsedBytes(list.reduce((n, r) => n + Number(r.size_bytes || 0), 0));
    const mine = list.filter((r) => r.path.startsWith(prefix));
    const withUrls = await Promise.all(
      mine.map(async (r) => {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(r.path, 3600);
        return { ...r, url: data?.signedUrl };
      }),
    );
    setRows(withUrls.reverse());
  }, [user, mediaUnlocked, prefix]);

  useEffect(() => { void load(); }, [load]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !user) return;
    const capBytes = storageGB * 1073741824;
    setBusy(true);
    try {
      let used = usedBytes;
      for (const f of files) {
        if (used + f.size > capBytes) {
          toast.error(`${planLabel} storage full — please buy premium for more uploads.`, {
            action: { label: "Upgrade", onClick: () => { window.location.href = "/premium"; } },
          });
          break;
        }
        const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${prefix}${Date.now()}-${safe}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
        if (error) throw error;
        await supabase.from("file_uploads").insert({
          user_id: user.id, bucket: BUCKET, path, filename: f.name,
          size_bytes: f.size, mime_type: f.type,
        });
        used += f.size;
      }
      await load();
      toast.success(`Uploaded in ${quality} quality`);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: MediaRow) {
    await supabase.storage.from(BUCKET).remove([r.path]);
    await supabase.from("file_uploads").delete().eq("id", r.id);
    await load();
  }

  if (!mediaUnlocked) {
    return (
      <Link
        to="/premium"
        className="relative mt-3 block overflow-hidden rounded-2xl bg-foreground/[0.04] p-4 text-center transition-transform active:scale-[0.99]"
        aria-label={`Unlock image and video uploads for ${planTitle}`}
      >
        <div aria-hidden className="absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 blur-3xl" style={{ background: gradient }} />
        <div className="relative">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: gradient }}>
            <Lock className="h-4.5 w-4.5" />
          </div>
          <div className="mt-2 font-display italic text-[14px]">Photos & videos locked</div>
          <p className="mx-auto mt-1 max-w-[260px] text-[11px] leading-snug text-muted-foreground">
            Upload images and videos to this plan with Premium <b>6 Months — 1 TB</b> (HD) or <b>12 Months — 2 TB</b> (4K).
            {currentPlan ? " Your current plan doesn’t include media storage." : ""}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg" style={{ background: gradient }}>
            <Crown className="h-3.5 w-3.5" /> Unlock with Premium
          </span>
        </div>
      </Link>
    );
  }

  const capBytes = Number.isFinite(storageGB) ? storageGB * 1073741824 : Number.POSITIVE_INFINITY;
  const pct = Number.isFinite(capBytes) ? Math.min(100, (usedBytes / capBytes) * 100) : 0;
  const isFull = usedBytes >= capBytes;
  const nearFull = !isFull && pct >= 90;

  return (
    <div className="mt-3 rounded-2xl bg-foreground/[0.04] p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-medium">
          <ImagePlus className="h-3.5 w-3.5" /> Photos & videos
        </div>
        <span className="flex items-center gap-1 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[8.5px] uppercase tracking-wider">
          <Crown className="h-2.5 w-2.5" /> {quality}
        </span>
      </div>

      <div className="mb-2.5 rounded-xl bg-background/50 px-2.5 py-2">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" /> {fmtBytes(usedBytes)} {unlimitedMedia ? "used · Unlimited" : `of ${planLabel}`}</span>
          {!unlimitedMedia && <span className={isFull ? "font-semibold text-destructive" : undefined}>{pct.toFixed(pct < 1 ? 2 : 0)}%</span>}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 1)}%`, background: isFull ? "hsl(var(--destructive))" : gradient }} />
        </div>
      </div>

      {(isFull || nearFull) && (
        <Link
          to="/premium"
          className="mb-2.5 flex items-center gap-2 rounded-xl border border-foreground/10 bg-background/60 px-2.5 py-2 text-[10.5px] leading-snug animate-fade-in"
        >
          <Crown className="h-3.5 w-3.5 shrink-0" style={{ color: "#d4af37" }} />
          <span className="flex-1">
            {isFull
              ? <>Your <b>{planLabel}</b> storage is full — please buy premium for more uploads.</>
              : <>You’ve used {pct.toFixed(0)}% of your <b>{planLabel}</b> storage.</>}
          </span>
          <span className="rounded-full px-2 py-1 text-[9.5px] font-semibold text-white" style={{ background: gradient }}>Upgrade</span>
        </Link>
      )}

      <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={onPick} />
      <button
        onClick={() => (isFull ? toast.error(`${planLabel} storage full — please buy premium for more uploads.`) : inputRef.current?.click())}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[12px] font-semibold text-white shadow-lg transition-transform active:scale-[0.98] disabled:opacity-60"
        style={{ background: isFull ? "hsl(var(--muted-foreground))" : gradient }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isFull ? <Lock className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
        {busy ? "Uploading…" : isFull ? "Storage full — upgrade to upload" : "Upload images or videos"}
      </button>


      {rows.length > 0 && (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {rows.map((r) => (
            <div key={r.id} className="group relative aspect-square overflow-hidden rounded-xl bg-foreground/10 animate-fade-in">
              {r.mime_type?.startsWith("video") ? (
                <>
                  <video src={r.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"><Play className="h-2.5 w-2.5" /></span>
                </>
              ) : (
                <img src={r.url} alt={r.filename} loading="lazy" className="h-full w-full object-cover" />
              )}
              <button
                onClick={() => remove(r)}
                aria-label={`Delete ${r.filename}`}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 text-[8px] text-white">
                {fmtBytes(Number(r.size_bytes))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
