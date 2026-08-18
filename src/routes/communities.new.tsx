// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Globe2, Lock, Mail, ShieldCheck } from "lucide-react";
import { CircleShell, CircleCard } from "@/components/samsta/CircleShell";
import { useAuthUser } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { createCommunity } from "@/lib/api/communities";
import { CIRCLE_CATEGORY_META, CIRCLE_GROUPS } from "@/lib/circles";

export const Route = createFileRoute("/communities/new")({
  component: NewCircle,
  head: () => {
    const title = "Create a Samsta Circle";
    const description = "Start a Samsta Circle for your college, city, career field, startup or hobby in under a minute.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
});

const PRIVACY = [
  { key: "public", label: "Public", desc: "Anyone can find, read and join.", icon: Globe2 },
  { key: "private", label: "Private", desc: "Visible in search, content for members only.", icon: Lock },
  { key: "invite", label: "Invite only", desc: "Only invited people can join.", icon: Mail },
] as const;

function NewCircle() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("education");
  const [privacy, setPrivacy] = useState<"public" | "private" | "invite">("public");
  const [city, setCity] = useState("");
  const [rules, setRules] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!user) { setError("Sign in to create a circle."); return; }
    if (name.trim().length < 3) { setError("Give your circle a name (3+ characters)."); return; }
    setBusy(true);
    setError(null);
    try {
      const c = await createCommunity({
        ownerId: user.id,
        name: name.trim(),
        description: description.trim(),
        category,
        privacy,
        city: city.trim() || null,
        rules: rules.trim(),
      });
      navigate({ to: "/communities/$slug", params: { slug: c.slug } });
    } catch (e: any) {
      setError(e?.message ?? "Could not create the circle.");
      setBusy(false);
    }
  };

  return (
    <CircleShell title="Create a circle" subtitle="Build a Samsta Circle around a shared purpose." back="/communities">
      <div className="flex flex-col gap-3">
        <CircleCard className="p-4">
          <label className="text-[10px] font-semibold tracking-[0.18em] text-[#1f1b16]/45">CIRCLE NAME</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. IIT Bombay Coders"
            maxLength={80}
            className="mt-1.5 w-full bg-transparent text-base font-medium outline-none placeholder:text-[#1f1b16]/30"
          />
        </CircleCard>

        <CircleCard className="p-4">
          <label className="text-[10px] font-semibold tracking-[0.18em] text-[#1f1b16]/45">DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="What is this circle for?"
            className="mt-1.5 w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#1f1b16]/30"
          />
        </CircleCard>

        <CircleCard className="p-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#1f1b16]/45">CATEGORY</p>
          <div className="mt-3 space-y-4">
            {CIRCLE_GROUPS.map((group) => {
              const items = CIRCLE_CATEGORY_META.filter((c) => c.group === group);
              if (!items.length) return null;
              return (
                <div key={group}>
                  <p className="mb-2 text-[10px] tracking-[0.2em] text-[#1f1b16]/30">{group.toUpperCase()}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => setCategory(c.key)}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-[11px] font-medium transition active:scale-95",
                          category === c.key
                            ? "bg-white text-[#05070f]"
                            : "border border-black/10 bg-white/80 text-[#1f1b16]/60",
                        )}
                      >
                        {c.emoji} {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CircleCard>

        <CircleCard className="p-4">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#1f1b16]/45">PRIVACY</p>
          <div className="mt-3 flex flex-col gap-2">
            {PRIVACY.map((p) => (
              <button
                key={p.key}
                onClick={() => setPrivacy(p.key)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99]",
                  privacy === p.key ? "border-[#4f7cff]/60 bg-[#4f7cff]/10" : "border-black/10 bg-white/80",
                )}
              >
                <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#4f7cff]" />
                <span className="min-w-0">
                  <span className="block text-xs font-semibold">{p.label}</span>
                  <span className="block text-[11px] text-[#1f1b16]/50">{p.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </CircleCard>

        <CircleCard className="p-4">
          <label className="text-[10px] font-semibold tracking-[0.18em] text-[#1f1b16]/45">CITY (OPTIONAL)</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Ahmedabad"
            maxLength={80}
            className="mt-1.5 w-full bg-transparent text-sm outline-none placeholder:text-[#1f1b16]/30"
          />
        </CircleCard>

        <CircleCard className="p-4">
          <label className="text-[10px] font-semibold tracking-[0.18em] text-[#1f1b16]/45">RULES (OPTIONAL)</label>
          <textarea
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="1. Be respectful…"
            className="mt-1.5 w-full resize-none bg-transparent text-sm outline-none placeholder:text-[#1f1b16]/30"
          />
        </CircleCard>

        <p className="flex items-start gap-2 px-1 text-[11px] leading-relaxed text-[#1f1b16]/40">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b25f19]" />
          Official verification badges for colleges, companies and organisations are reviewed by Samsta after your circle is live.
        </p>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          className="rounded-full bg-gradient-to-r from-[#e08a4a] to-[#f0a868] py-3.5 text-sm font-semibold shadow-[0_16px_40px_-18px_rgba(224,138,74,0.55)] disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create circle"}
        </button>
      </div>
    </CircleShell>
  );
}
