// @ts-nocheck
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clapperboard, Plus, Trash2, ChevronDown, Crown, Lock } from "lucide-react";
import { toast } from "sonner";
import PlanMediaVault from "@/components/samsta/PlanMediaVault";
import { usePremium } from "@/lib/premium";

type Series = { id: string; name: string; subject: string; at: number };
const KEY = "samsta:jee:coaching-series";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Full Course"];

const G = {
  Physics: "linear-gradient(135deg, oklch(0.80 0.12 250), oklch(0.72 0.14 280))",
  Chemistry: "linear-gradient(135deg, oklch(0.80 0.13 150), oklch(0.72 0.15 130))",
  Mathematics: "linear-gradient(135deg, oklch(0.82 0.13 340), oklch(0.75 0.15 320))",
  "Full Course": "linear-gradient(135deg, oklch(0.86 0.14 80), oklch(0.78 0.16 60))",
};

/** Coaching Classes — upload lecture videos series-wise (premium storage). */
export default function CoachingClasses() {
  const { mediaUnlocked, storageGB } = usePremium();
  const [series, setSeries] = useState<Series[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("Physics");

  useEffect(() => {
    try { setSeries(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { /* noop */ }
  }, []);

  const save = (v: Series[]) => {
    setSeries(v);
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* noop */ }
  };

  const add = () => {
    const n = name.trim();
    if (!n) { toast.error("Name your video series"); return; }
    save([{ id: crypto.randomUUID(), name: n, subject, at: Date.now() }, ...series]);
    setName("");
    toast.success("Series created");
  };

  const storageLabel = storageGB >= 1000 ? `${storageGB / 1000} TB` : `${storageGB} GB`;

  return (
    <section className="px-4 mt-5">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5">
        <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-3xl animate-aurora"
          style={{ background: G["Full Course"] }} />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: G["Full Course"] }}>
            <Clapperboard className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-display italic text-xl leading-tight">Coaching Classes</div>
            <div className="text-[11px] text-muted-foreground">
              {mediaUnlocked ? `Series-wise lecture uploads · ${storageLabel} cloud` : "Upload lecture series — Premium storage required"}
            </div>
          </div>
        </div>

        {!mediaUnlocked && (
          <div className="relative mt-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Lock className="h-4 w-4 text-amber-500" /> Video uploads are locked
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Unlock with 6 Months (1 TB · HD) or 12 Months (2 TB · 4K) premium to upload full coaching video series.
            </p>
            <Link to="/premium" className="mt-3 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white shadow"
              style={{ background: G["Full Course"] }}>
              <Crown className="h-4 w-4" /> Unlock premium
            </Link>
          </div>
        )}

        {/* Create series */}
        <div className="relative mt-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Series name (e.g. Rotational Motion — Lecture 1-12)"
            className="w-full rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2 text-[12.5px] outline-none focus:ring-2 focus:ring-primary/30" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUBJECTS.map((s) => (
              <button key={s} onClick={() => setSubject(s)}
                className={`rounded-full px-3 py-1.5 text-[11.5px] font-semibold ${subject === s ? "text-white shadow" : "glass"}`}
                style={subject === s ? { background: G[s] } : undefined}>{s}</button>
            ))}
          </div>
          <button onClick={add} className="mt-2 w-full rounded-full py-2.5 text-[12.5px] font-semibold text-white shadow active:scale-[0.98]"
            style={{ background: G[subject] }}>
            <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Create video series</span>
          </button>
        </div>
      </div>

      {/* Series list */}
      <div className="mt-3 space-y-3">
        {series.length === 0 && (
          <div className="glass rounded-3xl p-5 text-center text-[12px] text-muted-foreground">
            No series yet — create one above to start uploading lectures in order.
          </div>
        )}
        {series.map((s, i) => {
          const isOpen = open === s.id;
          return (
            <div key={s.id} className="glass-strong overflow-hidden rounded-3xl animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex w-full items-center gap-3 p-4 text-left">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow" style={{ background: G[s.subject] || G["Full Course"] }}>
                  <Clapperboard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{s.name}</div>
                  <div className="text-[10.5px] text-muted-foreground">{s.subject} · created {new Date(s.at).toLocaleDateString()}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); save(series.filter((x) => x.id !== s.id)); }}
                  className="text-muted-foreground hover:text-destructive" aria-label="Delete series">
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 animate-fade-up">
                  <PlanMediaVault planKey={`coaching-${s.id}`} planTitle={s.name} gradient={G[s.subject] || G["Full Course"]} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
