// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import {
  ArrowLeft, Plane, Sparkles, MapPin, Heart, Bot, Send, ExternalLink,
  Bed, TrainFront, Bus, Star, X, BookOpen, Images, Wind, Wallet, Trash2, Image as ImageIcon, Film, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import { supabase } from "@/integrations/supabase/client";
import {
  type Trip, type Favorite,
  listTrips, deleteTrip, listFavorites, addFavorite, removeFavorite,
  pushHistory, providerLinks,
} from "@/lib/api/travel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/travel")({
  component: TravelHub,
  head: () => ({
    meta: [
      { title: "Travel Hub· Samsta" },
      { name: "description", content: "Travel memories, posts, moods and bookings— with itineraries, budgets, packing and visa guides." },
    ],
  }),
});

type Tab = "memories" | "posts" | "feeling" | "book" | "saved" | "assistant";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

function TravelHub() {
  const { user, loading } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("memories");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (!loading && user && !isPremium) navigate({ to: "/premium" }); }, [loading, user, isPremium, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen animate-pulse bg-background" />;
  }

  const tabs: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: "memories", label: "Memories", icon: <BookOpen className="h-3.5 w-3.5" /> },
    { k: "posts", label: "Posts", icon: <Images className="h-3.5 w-3.5" /> },
    { k: "feeling", label: "Feeling", icon: <Wind className="h-3.5 w-3.5" /> },
    { k: "book", label: "Book", icon: <Plane className="h-3.5 w-3.5" /> },
    { k: "saved", label: "Saved", icon: <Heart className="h-3.5 w-3.5" /> },
    { k: "assistant", label: "Assistant", icon: <Bot className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: "linear-gradient(135deg, oklch(0.78 0.11 190), oklch(0.75 0.13 210))" }}>
          <Plane className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg italic leading-tight"> Travel Hub</div>
          <div className="text-[11px] text-muted-foreground">Remember · share · feel · book</div>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {tabs.map(({ k, label, icon }) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn("shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition",
              tab === k ? "bg-foreground text-background shadow-md" : "glass")}>
            {icon}{label}
          </button>
        ))}
      </nav>

      <main className="px-4">
        {tab === "memories" && <Memories userId={user.id} />}
        {tab === "posts" && <TravelPosts userId={user.id} />}
        {tab === "feeling" && <Feeling userId={user.id} />}
        {tab === "book" && <BookRedirect userId={user.id} />}
        {tab === "saved" && <Saved userId={user.id} />}
        {tab === "assistant" && <Assistant />}
      </main>
    </div>
  );
}

/* -------------------- MEMORIES -------------------- */
type TravelMemory = { id: string; title: string; content: string | null; memory_date: string | null; tags: string[] | null; location: string | null; media_url: string | null; media_type: string | null };

function Memories({ userId }: { userId: string }) {
  const [items, setItems] = useState<TravelMemory[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<Array<{ file: File; previewUrl: string; type: "image"|"video" }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function reload() {
    setLoading(true);
    const { data } = await sb.from("memories").select("id,title,content,memory_date,tags,location,media_url,media_type")
      .eq("user_id", userId)
      .or("kind.eq.place,tags.cs.{travel}")
      .order("memory_date", { ascending: false, nullsFirst: false })
      .limit(60);
    const rows = (data as TravelMemory[]) ?? [];
    setItems(rows);
    setLoading(false);
    // Resolve signed URLs for media
    const withMedia = rows.filter(r => r.media_url);
    const map: Record<string, string> = {};
    await Promise.all(withMedia.map(async (r) => {
      const { data: s } = await sb.storage.from("media").createSignedUrl(r.media_url!, 60 * 60 * 24 * 7);
      if (s?.signedUrl) map[r.id] = s.signedUrl;
    }));
    setSigned(map);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [userId]);

  function pickFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const next = Array.from(files).slice(0, 4).map((f) => ({
      file: f, previewUrl: URL.createObjectURL(f),
      type: f.type.startsWith("video") ? "video" as const : "image" as const,
    }));
    setDrafts((prev) => [...next, ...prev].slice(0, 4));
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeDraft(i: number) {
    setDrafts((prev) => {
      const n = prev.slice();
      const [r] = n.splice(i, 1);
      if (r) URL.revokeObjectURL(r.previewUrl);
      return n;
    });
  }

  async function add() {
    if (!title.trim() && drafts.length === 0) { toast.error("Add a title or a photo/video"); return; }
    setUploading(true);
    try {
      // Upload first file if present. Additional files become sibling memories.
      const uploads: Array<{ path: string; type: string }> = [];
      for (const d of drafts) {
        const ext = d.file.name.split(".").pop() || (d.type === "video" ? "mp4" : "jpg");
        const path = `${userId}/travel/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: upErr } = await sb.storage.from("media").upload(path, d.file, { contentType: d.file.type, upsert: false });
        if (upErr) throw upErr;
        uploads.push({ path, type: d.file.type });
      }
      const baseTitle = title.trim() || (place.trim() ? place.trim() : "Travel memory");
      const rows = (uploads.length ? uploads : [{ path: "", type: "" }]).map((u, i) => ({
        user_id: userId,
        kind: (u.type.startsWith("video") ? "video" : u.path ? "photo" : "place") as string,
        title: uploads.length > 1 ? `${baseTitle} · ${i+1}` : baseTitle,
        content: note.trim() || null,
        location: place.trim() || null,
        tags: ["travel"],
        memory_date: new Date().toISOString(),
        media_url: u.path || null,
        media_type: u.type || null,
      }));
      const { error } = await sb.from("memories").insert(rows);
      if (error) throw error;
      drafts.forEach(d => URL.revokeObjectURL(d.previewUrl));
      setDrafts([]); setTitle(""); setPlace(""); setNote("");
      toast.success("Memory saved");
      reload();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setUploading(false); }
  }

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl p-5"
        style={{ background: "linear-gradient(135deg, oklch(0.28 0.05 210), oklch(0.35 0.08 190))" }}>
        <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-50"
          style={{ background: "oklch(0.9 0.15 200)" }} />
        <div className="relative text-white">
          <div className="font-display text-2xl italic">Your travel journal</div>
          <p className="mt-1 text-xs opacity-80">Places, moments, photos & videos — kept forever.</p>
        </div>
      </section>

      <section className="glass-strong rounded-3xl p-4 space-y-2">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Memory title (e.g. Sunrise at Ubud)"
          className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />
        <input value={place} onChange={e=>setPlace(e.target.value)} placeholder="Place"
          className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="How did it feel?"
          rows={2} className="w-full resize-none rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />

        {drafts.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {drafts.map((d, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                {d.type === "image"
                  ? <img src={d.previewUrl} alt="" className="h-full w-full object-cover" />
                  : <video src={d.previewUrl} className="h-full w-full object-cover" muted playsInline />}
                <button onClick={()=>removeDraft(i)} aria-label="Remove"
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={()=>{ if (fileRef.current) { fileRef.current.accept = "image/*"; fileRef.current.click(); } }}
            className="glass flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 text-xs">
            <ImageIcon className="h-4 w-4" />Photos
          </button>
          <button onClick={()=>{ if (fileRef.current) { fileRef.current.accept = "video/*"; fileRef.current.click(); } }}
            className="glass flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 text-xs">
            <Film className="h-4 w-4" />Videos
          </button>
        </div>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e)=>pickFiles(e.target.files)} />

        <button onClick={add} disabled={uploading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-2.5 text-sm text-background disabled:opacity-60">
          {uploading ? <><Upload className="h-4 w-4 animate-pulse" />Uploading…</> : <><Sparkles className="h-4 w-4" />Save memory</>}
        </button>
      </section>

      {loading ? <div className="glass h-32 animate-pulse rounded-3xl" /> :
       items.length === 0 ? <EmptyLine text="No travel memories yet — save your first above." /> :
       <div className="space-y-3">
         {items.map((m, i) => {
           const url = m.media_url ? signed[m.id] : null;
           const isVideo = (m.media_type || "").startsWith("video");
           return (
             <article key={m.id} className="glass overflow-hidden rounded-3xl animate-fade-up" style={{ animationDelay: `${i*30}ms` }}>
               {url && (
                 <div className="relative aspect-video w-full bg-black/60">
                   {isVideo
                     ? <video src={url} controls playsInline className="h-full w-full object-cover" />
                     : <img src={url} alt="" className="h-full w-full object-cover" />}
                 </div>
               )}
               <div className="p-4">
                 <div className="font-display text-base italic leading-tight">{m.title}</div>
                 <div className="mt-0.5 text-[11px] text-muted-foreground">
                   {m.location && <><MapPin className="mr-0.5 inline h-3 w-3" />{m.location}{m.memory_date ? " · " : ""}</>}
                   {m.memory_date && new Date(m.memory_date).toLocaleDateString()}
                 </div>
                 {m.content && <p className="mt-2 text-sm text-foreground/85">{m.content}</p>}
               </div>
             </article>
           );
         })}
       </div>}
    </div>
  );
}

/* -------------------- POSTS -------------------- */
type TravelPost = { id: string; caption: string | null; media: { path?: string; url?: string; type?: string }[] | null; created_at: string; location: string | null };

function TravelPosts({ userId }: { userId: string }) {
  const [posts, setPosts] = useState<TravelPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await sb.from("posts").select("id,caption,media,created_at,location")
        .eq("user_id", userId)
        .not("location", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      setPosts((data as TravelPost[]) ?? []);
      setLoading(false);
    })();
  }, [userId]);

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-3xl p-5"
        style={{ background: "linear-gradient(135deg, oklch(0.32 0.06 320), oklch(0.42 0.09 20))" }}>
        <div aria-hidden className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full blur-3xl opacity-50"
          style={{ background: "oklch(0.9 0.15 30)" }} />
        <div className="relative text-white">
          <div className="font-display text-2xl italic">Your travel posts</div>
          <p className="mt-1 text-xs opacity-80">A gallery of everywhere you shared from.</p>
        </div>
      </section>

      {loading ? <div className="glass h-40 animate-pulse rounded-3xl" /> :
       posts.length === 0 ? <EmptyLine text="No travel posts yet — add a location on any post to see it here." /> :
       <div className="grid grid-cols-2 gap-2.5">
         {posts.map((p, i) => {
           const first = Array.isArray(p.media) ? p.media[0] : null;
           const url = first?.url || null;
           return (
             <div key={p.id} className="glass group relative aspect-square overflow-hidden rounded-3xl animate-fade-up" style={{ animationDelay: `${i*25}ms` }}>
               {url ? <img src={url} alt="" className="h-full w-full object-cover transition group-active:scale-95" /> :
                 <div className="flex h-full items-center justify-center text-3xl">📍</div>}
               <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 text-[11px] text-white">
                 <div className="truncate"><MapPin className="mr-0.5 inline h-3 w-3" />{p.location}</div>
               </div>
             </div>
           );
         })}
       </div>}
    </div>
  );
}

/* -------------------- FEELING -------------------- */
const MOODS: { key: string; label: string; emoji: string; grad: string }[] = [
  { key: "adventurous", label: "Adventurous", emoji: "🏔️", grad: "linear-gradient(135deg, oklch(0.45 0.12 30), oklch(0.6 0.15 60))" },
  { key: "romantic",    label: "Romantic",    emoji: "💞", grad: "linear-gradient(135deg, oklch(0.55 0.15 350), oklch(0.65 0.13 20))" },
  { key: "calm",        label: "Calm",        emoji: "🌿", grad: "linear-gradient(135deg, oklch(0.5 0.08 160), oklch(0.6 0.09 200))" },
  { key: "curious",     label: "Curious",     emoji: "🗺️", grad: "linear-gradient(135deg, oklch(0.45 0.1 260), oklch(0.6 0.13 290))" },
  { key: "festive",     label: "Festive",     emoji: "🎉", grad: "linear-gradient(135deg, oklch(0.55 0.16 40), oklch(0.65 0.18 350))" },
  { key: "reflective",  label: "Reflective",  emoji: "🕯️", grad: "linear-gradient(135deg, oklch(0.32 0.04 260), oklch(0.42 0.06 220))" },
];

type Destination = { name: string; tagline: string; why: string; best_season: string; est_daily_budget: string; vibe: string; emoji: string };

function Feeling({ userId }: { userId: string }) {
  const [mood, setMood] = useState<string | null>(null);
  const [budget, setBudget] = useState("$1500");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Destination[]>([]);

  async function search(m: string) {
    setMood(m); setLoading(true); setResults([]);
    try {
      const payload = { query: `${m} mood`, budget, month: new Date().toLocaleString("en",{month:"long"}), interests: [m], prior_destinations: [] };
      let acc = "";
      await streamSam("travel_search", [{ role: "user", content: JSON.stringify(payload) }], (a) => { acc = a; });
      const json = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setResults(json.destinations ?? []);
      pushHistory(userId, "feeling", m, { budget });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }

  async function saveDest(d: Destination) {
    try {
      await addFavorite({ user_id: userId, kind: "destination", title: d.name, subtitle: d.tagline, meta: d as unknown as Record<string, unknown> });
      toast.success("Saved to favourites");
    } catch { toast.error("Could not save"); }
  }

  return (
    <div className="space-y-4">
      <section className="glass-strong rounded-3xl p-4">
        <div className="font-display text-lg italic">How do you feel today?</div>
        <p className="mt-1 text-[11px] text-muted-foreground">Pick a mood — Sam finds places that match.</p>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          {MOODS.map((m) => (
            <button key={m.key} onClick={()=>search(m.key)}
              className={cn("group relative overflow-hidden rounded-3xl p-4 text-left text-white shadow-md transition active:scale-[0.97]",
                mood===m.key && "ring-2 ring-white/70")}
              style={{ background: m.grad }}>
              <div aria-hidden className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/25 blur-2xl" />
              <div className="relative text-2xl">{m.emoji}</div>
              <div className="relative mt-1 font-display italic">{m.label}</div>
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Budget"
            className="flex-1 rounded-xl bg-background/60 px-3 py-2 text-xs outline-none" />
        </div>
      </section>

      {loading && <div className="glass h-32 animate-pulse rounded-3xl" />}

      {results.length > 0 && (
        <section className="space-y-3">
          {results.map((d, i) => (
            <article key={i} className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: `${i*40}ms` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-2xl">{d.emoji}</div>
                  <div className="font-display text-lg italic leading-tight">{d.name}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{d.vibe} · {d.best_season}</div>
                </div>
                <button onClick={()=>saveDest(d)} aria-label="Save" className="glass flex h-9 w-9 items-center justify-center rounded-full">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-sm italic text-foreground/85">"{d.tagline}"</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.why}</p>
              <div className="mt-2 flex items-center gap-2 text-[11px]">
                <span className="rounded-full bg-background/60 px-2 py-0.5">{d.est_daily_budget}/day</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

/* -------------------- BOOK REDIRECT -------------------- */
function BookRedirect({ userId }: { userId: string }) {
  const [kind, setKind] = useState<"flight"|"hotel"|"train"|"bus">("flight");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [ret, setRet] = useState("");
  const links = useMemo(() => providerLinks(kind, { from, to, date, ret, query: to }), [kind, from, to, date, ret]);

  async function saveLink(name: string, url: string) {
    try {
      await addFavorite({ user_id: userId, kind, title: `${kind}: ${to || from || "Search"}`, subtitle: name, url, provider: name, meta: { from, to, date, ret } });
      toast.success(`Saved ${name} link`);
    } catch { toast.error("Could not save"); }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          { k: "flight" as const, icon: <Plane className="h-4 w-4" />, label: "Flights" },
          { k: "hotel"  as const, icon: <Bed className="h-4 w-4" />,   label: "Hotels" },
          { k: "train"  as const, icon: <TrainFront className="h-4 w-4" />, label: "Trains" },
          { k: "bus"    as const, icon: <Bus className="h-4 w-4" />,   label: "Buses" },
        ]).map(({ k, icon, label }) => (
          <button key={k} onClick={()=>setKind(k)}
            className={cn("glass flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 text-xs transition",
              kind===k && "bg-foreground text-background")}>
            {icon}{label}
          </button>
        ))}
      </div>

      <section className="glass-strong rounded-3xl p-4 space-y-2">
        {kind !== "hotel" && (
          <input value={from} onChange={e=>setFrom(e.target.value)} placeholder="From (city/airport/station)"
            className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />
        )}
        <input value={to} onChange={e=>setTo(e.target.value)} placeholder={kind==="hotel" ? "City or hotel" : "To"}
          className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-xl bg-background/60 px-3 py-2 outline-none" />
          <input type="date" value={ret} onChange={e=>setRet(e.target.value)} className="rounded-xl bg-background/60 px-3 py-2 outline-none" />
        </div>
        <div className="pt-1 text-[11px] italic text-muted-foreground">
          Samsta never processes payments. We redirect you to official booking sites/apps.
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2">
        {links.map((l, i) => (
          <div key={l.name} className="glass flex items-center justify-between rounded-2xl p-3 animate-fade-up" style={{ animationDelay: `${i*30}ms` }}>
            <div>
              <div className="text-sm font-medium">{l.name}</div>
              <div className="text-[11px] text-muted-foreground">Opens in a new tab · secure redirect</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>saveLink(l.name, l.url)} className="glass flex h-9 w-9 items-center justify-center rounded-full" aria-label="Save link">
                <Heart className="h-4 w-4" />
              </button>
              <a href={l.url} target="_blank" rel="noreferrer noopener"
                className="flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs text-background">
                <ExternalLink className="h-3 w-3" />Open
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------- SAVED -------------------- */
function Saved({ userId }: { userId: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [favs, setFavs] = useState<Favorite[]>([]);
  const [kind, setKind] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [t, f] = await Promise.all([listTrips(userId), listFavorites(userId)]);
    setTrips(t); setFavs(f); setLoading(false);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [userId]);

  const filtered = kind === "all" ? favs : favs.filter(f => f.kind === kind);

  return (
    <div className="space-y-4">
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Trips</div>
          <span className="text-[11px] text-muted-foreground">{trips.length}</span>
        </div>
        {loading ? <div className="glass h-24 animate-pulse rounded-3xl" /> :
          trips.length === 0 ? <EmptyLine text="Plan your first trip in the Plan tab." /> :
          <div className="space-y-2">
            {trips.map((t) => (
              <div key={t.id} className="glass flex items-center justify-between rounded-2xl p-3">
                <div>
                  <div className="font-display italic">{t.title}</div>
                  <div className="text-[11px] text-muted-foreground"><MapPin className="mr-1 inline h-3 w-3" />{t.destination}{t.budget?` · ${t.currency} ${t.budget}`:""}</div>
                </div>
                <button onClick={async()=>{await deleteTrip(t.id); reload();}} className="glass flex h-9 w-9 items-center justify-center rounded-full">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Favourites</div>
          <select value={kind} onChange={e=>setKind(e.target.value)} className="glass rounded-full px-2 py-1 text-xs">
            {["all","destination","flight","hotel","train","bus","provider"].map(k=><option key={k}>{k}</option>)}
          </select>
        </div>
        {filtered.length === 0 ? <EmptyLine text="Save destinations and booking links to see them here." /> :
          <div className="space-y-2">
            {filtered.map((f) => (
              <div key={f.id} className="glass flex items-center justify-between rounded-2xl p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm">{f.title}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{f.provider || f.kind}{f.subtitle?` · ${f.subtitle}`:""}</div>
                </div>
                <div className="flex items-center gap-1">
                  {f.url && <a href={f.url} target="_blank" rel="noreferrer" className="glass flex h-9 w-9 items-center justify-center rounded-full"><ExternalLink className="h-4 w-4" /></a>}
                  <button onClick={async()=>{await removeFavorite(f.id); reload();}} className="glass flex h-9 w-9 items-center justify-center rounded-full"><X className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>}
      </section>
    </div>
  );
}
function EmptyLine({ text }: { text: string }) {
  return <div className="glass rounded-2xl p-4 text-center text-xs text-muted-foreground">{text}</div>;
}

/* -------------------- AI ASSISTANT -------------------- */
function Assistant() {
  const [messages, setMessages] = useState<Array<{ role: "user"|"assistant"; content: string }>>([]);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  async function send() {
    if (!text.trim() || streaming) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next); setText(""); setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    try {
      await streamSam("travel_ai_chat", next, (acc) => {
        setMessages((m) => { const c = [...m]; c[c.length-1] = { role: "assistant", content: acc }; return c; });
      });
    } catch (e) {
      setMessages((m) => { const c = [...m]; c[c.length-1] = { role: "assistant", content: e instanceof Error ? e.message : "Something went wrong." }; return c; });
    }
    setStreaming(false);
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="glass-strong mb-3 flex items-center gap-2 rounded-2xl p-3 text-xs">
        <Bot className="h-4 w-4" /> Ask anything — visas, best time to visit, hidden neighborhoods, budget hacks.
      </div>
      <div className="flex-1 space-y-3 overflow-auto pb-2">
        {messages.map((m, i) => (
          <div key={i} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
            m.role === "user" ? "ml-auto bg-foreground text-background" : "glass mr-auto")}>
            {m.content || <span className="text-muted-foreground">…</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="glass-strong sticky bottom-2 flex items-center gap-2 rounded-full p-1.5">
        <input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Best food street in Bangkok?" className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button onClick={send} disabled={streaming} className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-60">
          <Send className="h-4 w-4" />
        </button>
      </div>
      <div className="pt-2 text-center text-[10px] text-muted-foreground">
        <Star className="mr-1 inline h-3 w-3" />Estimates, not guarantees. Verify visas & prices before you go.
      </div>
    </div>
  );
}
