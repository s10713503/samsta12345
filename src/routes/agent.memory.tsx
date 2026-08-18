// @ts-nocheck
import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMemory, listMemory, saveMemory } from "@/lib/agent/api";

export const Route = createFileRoute("/agent/memory")({
  head: () => ({
    meta: [
      { title: "Samsta Memory — preferences you control" },
      { name: "description", content: "View, edit and delete what Samsta AI remembers about you. Never passwords, PINs, CVVs or OTPs." },
      { property: "og:title", content: "Samsta Memory" },
      { property: "og:description", content: "Privacy-controlled agent memory you can edit or wipe at any time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MemoryPage,
});

const SUGGEST = ["Preferred language", "Home airport", "Favourite cuisine", "Usual shopping site", "Wake-up time"];

function MemoryPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["agent-memory"], queryFn: listMemory });
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || !value.trim()) return;
    try {
      await saveMemory(key, value);
      setKey(""); setValue("");
      qc.invalidateQueries({ queryKey: ["agent-memory"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that.");
    }
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-32">
      <Link to="/agent" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full"><ArrowLeft className="h-4.5 w-4.5" /></Link>
      <h1 className="font-display mt-6 text-3xl">Samsta Memory</h1>
      <p className="mt-1 text-sm text-muted-foreground">Only what you add. Samsta refuses to store PINs, OTPs or passwords.</p>

      <form onSubmit={add} className="glass mt-6 space-y-2 rounded-3xl p-4">
        <input value={key} onChange={(e) => setKey(e.target.value)} maxLength={80} placeholder="What (e.g. Home airport)"
          className="w-full rounded-2xl bg-muted/50 px-4 py-2.5 text-sm outline-none" />
        <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={300} placeholder="Value (e.g. Ahmedabad AMD)"
          className="w-full rounded-2xl bg-muted/50 px-4 py-2.5 text-sm outline-none" />
        <div className="flex flex-wrap gap-2">
          {SUGGEST.map((s) => (
            <button key={s} type="button" onClick={() => setKey(s)} className="rounded-full bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground">{s}</button>
          ))}
        </div>
        <button type="submit" className="w-full rounded-full bg-primary px-4 py-2.5 text-sm text-primary-foreground">Remember this</button>
      </form>

      <ul className="mt-6 space-y-2">
        {data.map((m) => (
          <li key={m.id} className="glass flex items-center gap-3 rounded-2xl p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{m.key}</p>
              <p className="truncate text-sm">{m.value}</p>
            </div>
            <button aria-label="Forget" onClick={async () => { await deleteMemory(m.id); qc.invalidateQueries({ queryKey: ["agent-memory"] }); }}
              className="text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      {data.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Nothing remembered yet.</p>}
    </div>
  );
}
