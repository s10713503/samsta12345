// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Orbit, Check, Loader2, Sparkles, Home } from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { saveOrbitProfile, usernameAvailable } from "@/lib/api/orbit-identity";
import { listFeedPage } from "@/lib/api/feed";
import { cn } from "@/lib/utils";
import { OrbitAvatarPicker } from "@/components/samsta/OrbitAvatarPicker";

export const Route = createFileRoute("/orbit/setup")({
  component: OrbitSetup,
  head: () => ({
    meta: [
      { title: "Create your Orbit profile — Samsta Orbit" },
      { name: "description", content: "Set up a separate Samsta Orbit identity: handle, bio, interests and creator category." },
      { property: "og:title", content: "Create your Orbit profile — Samsta Orbit" },
      { property: "og:description", content: "Your Orbit identity is separate from your Samsta profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const CATEGORIES = ["Creator", "Journalist", "Developer", "Educator", "Musician", "Athlete", "Founder", "Artist"];
const INTERESTS = ["Technology", "Business", "Education", "Gaming", "Sports", "Movies", "Music", "AI", "Science", "Programming", "Design", "News"];

function OrbitSetup() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    username: "", display_name: "", bio: "", avatar_url: "", avatar_video_url: "", cover_url: "",
    website: "", location: "", profession: "", education: "", birthday: "",
    creator_category: "", verification_requested: false, interests: [] as string[],
  });

  const warmHome = () => {
    void qc.prefetchInfiniteQuery({
      queryKey: ["feed", "post"],
      initialPageParam: null as string | null,
      queryFn: ({ pageParam }) => listFeedPage("post", { before: pageParam }),
      getNextPageParam: (last) => last.nextCursor,
      staleTime: 30_000,
    });
  };

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const field = "glass w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70";

  const submit = async () => {
    if (!user?.id) return;
    if (form.username.trim().length < 3 || !form.display_name.trim()) {
      toast.error("Handle and display name are required");
      return;
    }
    setSaving(true);
    try {
      if (!(await usernameAvailable(form.username))) {
        toast.error("That Orbit handle is taken");
        return;
      }
      await saveOrbitProfile(user.id, form);
      await qc.invalidateQueries({ queryKey: ["orbit-profile"] });
      toast.success("Your Orbit identity is live");
      navigate({ to: "/orbit", replace: true });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save your Orbit profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-dvh px-4 pb-16 pt-6">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-80 opacity-70 blur-3xl animate-aurora"
        style={{ background: "radial-gradient(220px 140px at 78% 0%, oklch(0.8 0.13 300 / 0.5), transparent 70%), radial-gradient(240px 160px at 8% 18%, oklch(0.82 0.12 210 / 0.45), transparent 70%)" }} />

      <div className="relative mx-auto w-full max-w-md">
        <a
          href="/"
          onPointerEnter={warmHome}
          onFocus={warmHome}
          className="group mb-4 flex items-center gap-1 text-sm text-muted-foreground transition-all duration-200 hover:translate-x-[-2px] hover:text-foreground active:scale-95"
        >
          <Home className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-[-2px]" />
          Home
        </a>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md animate-orb"
            style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
            <Orbit className="h-6 w-6 animate-orbit-spin" />
          </div>
          <div>
            <h1 className="font-display text-2xl italic leading-none">Create your Orbit</h1>
            <p className="text-[11px] text-muted-foreground">A separate identity — not your Samsta profile</p>
          </div>
        </div>

        <div className="mt-5 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-muted")} />
          ))}
        </div>

        {step === 0 && (
          <section className="mt-5 flex flex-col gap-3">
            <input className={field} placeholder="@handle" value={form.username}
              onChange={(e) => set("username", e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))} />
            <input className={field} placeholder="Display name" value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />
            <textarea className={cn(field, "min-h-24 resize-none")} placeholder="Bio" value={form.bio} onChange={(e) => set("bio", e.target.value)} />
            <OrbitAvatarPicker
              userId={user?.id ?? null}
              photoUrl={form.avatar_url}
              videoUrl={form.avatar_video_url}
              onChange={(next) => setForm((f) => ({ ...f, ...next }))}
            />
            <input className={field} placeholder="Cover photo URL" value={form.cover_url} onChange={(e) => set("cover_url", e.target.value)} />
          </section>
        )}

        {step === 1 && (
          <section className="mt-5 flex flex-col gap-3">
            <input className={field} placeholder="Website" value={form.website} onChange={(e) => set("website", e.target.value)} />
            <input className={field} placeholder="Location" value={form.location} onChange={(e) => set("location", e.target.value)} />
            <input className={field} placeholder="Profession" value={form.profession} onChange={(e) => set("profession", e.target.value)} />
            <input className={field} placeholder="Education" value={form.education} onChange={(e) => set("education", e.target.value)} />
            <input className={field} type="date" value={form.birthday} onChange={(e) => set("birthday", e.target.value)} />
          </section>
        )}

        {step === 2 && (
          <section className="mt-5 flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Creator category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => set("creator_category", form.creator_category === c ? "" : c)}
                    className={cn("rounded-full px-3 py-1.5 text-xs transition-all active:scale-95",
                      form.creator_category === c ? "bg-foreground text-background" : "glass text-muted-foreground")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Interests</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((t) => {
                  const on = form.interests.includes(t);
                  return (
                    <button key={t} onClick={() => set("interests", on ? form.interests.filter((x) => x !== t) : [...form.interests, t])}
                      className={cn("rounded-full px-3 py-1.5 text-xs transition-all active:scale-95",
                        on ? "bg-primary text-primary-foreground" : "glass text-muted-foreground")}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => set("verification_requested", !form.verification_requested)}
              className="glass flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm">
              <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Request verification</span>
              <span className={cn("flex h-5 w-5 items-center justify-center rounded-full", form.verification_requested ? "bg-primary text-primary-foreground" : "bg-muted")}>
                {form.verification_requested && <Check className="h-3 w-3" />}
              </span>
            </button>
          </section>
        )}

        <div className="mt-6 flex gap-2">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="glass flex-1 rounded-full py-3 text-sm font-medium active:scale-95">Back</button>
          )}
          {step < 2 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 rounded-full py-3 text-sm font-semibold text-white shadow-lg active:scale-95"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>Continue</button>
          ) : (
            <button onClick={submit} disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white shadow-lg active:scale-95 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enter Orbit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
