import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ShoppingBag, Search, Sparkles, Heart, ExternalLink, Bot, Send, Trash2,
  Star, Gift, TrendingUp, Layers, Bell, Mic, Camera, Flame, Clock, Tag,
  Shirt, Home as HomeIcon, Cpu, Baby, Dumbbell, BookOpen, Utensils, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import {
  type WishItem, listWishlist, addWish, removeWish, updateWish,
  pushShopHistory, listShopHistory, shopLinks,
} from "@/lib/api/shopping";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/shopping")({
  component: ShoppingHub,
  head: () => ({
    meta: [
      { title: "Shopping Hub· Samsta" },
      { name: "description", content: "product discovery, comparisons, review summaries, gift ideas, price-drop alerts, and a personalised wishlist across the shops you love." },
    ],
  }),
});

type Tab = "home" | "search" | "ideas" | "saved" | "chat";
type Region = "global" | "in" | "us" | "uk";

type Product = {
  title: string; brand: string; est_price: string; currency: string; rating: number;
  pros: string[]; cons: string[]; badge: string; category: string;
};

const CATEGORIES: { key: string; label: string; icon: React.ReactNode; grad: string }[] = [
  { key: "fashion",   label: "Fashion",   icon: <Shirt className="h-4 w-4" />,     grad: "linear-gradient(135deg, oklch(0.6 0.16 350), oklch(0.7 0.13 25))" },
  { key: "tech",      label: "Tech",      icon: <Cpu className="h-4 w-4" />,       grad: "linear-gradient(135deg, oklch(0.45 0.13 260), oklch(0.55 0.15 220))" },
  { key: "home",      label: "Home",      icon: <HomeIcon className="h-4 w-4" />,  grad: "linear-gradient(135deg, oklch(0.55 0.09 160), oklch(0.65 0.1 190))" },
  { key: "beauty",    label: "Beauty",    icon: <Sparkles className="h-4 w-4" />,  grad: "linear-gradient(135deg, oklch(0.7 0.14 20), oklch(0.75 0.1 60))" },
  { key: "kids",      label: "Kids",      icon: <Baby className="h-4 w-4" />,      grad: "linear-gradient(135deg, oklch(0.72 0.12 200), oklch(0.78 0.1 250))" },
  { key: "fitness",   label: "Fitness",   icon: <Dumbbell className="h-4 w-4" />,  grad: "linear-gradient(135deg, oklch(0.5 0.14 30), oklch(0.6 0.16 60))" },
  { key: "books",     label: "Books",     icon: <BookOpen className="h-4 w-4" />,  grad: "linear-gradient(135deg, oklch(0.4 0.06 60), oklch(0.5 0.1 40))" },
  { key: "grocery",   label: "Grocery",   icon: <Utensils className="h-4 w-4" />,  grad: "linear-gradient(135deg, oklch(0.55 0.15 130), oklch(0.65 0.13 100))" },
];

function ShoppingHub() {
  const { user, loading } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("home");
  const [region, setRegion] = useState<Region>("global");
  const [seed, setSeed] = useState<string>("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (!loading && user && !isPremium) navigate({ to: "/premium" }); }, [loading, user, isPremium, navigate]);

  if (loading || !user) return <div className="min-h-screen animate-pulse bg-background" />;

  const tabs: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: "home",   label: "For You",  icon: <Sparkles className="h-3.5 w-3.5" /> },
    { k: "search", label: "Search",   icon: <Search className="h-3.5 w-3.5" /> },
    { k: "ideas",  label: "Ideas",    icon: <Gift className="h-3.5 w-3.5" /> },
    { k: "saved",  label: "Saved",    icon: <Heart className="h-3.5 w-3.5" /> },
    { k: "chat",   label: "Chat",     icon: <Bot className="h-3.5 w-3.5" /> },
  ];

  function jumpToSearchWith(q: string) {
    setSeed(q);
    setTab("search");
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants" aria-label="Back" className="glass flex h-10 w-10 items-center justify-center rounded-full">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: "linear-gradient(135deg, oklch(0.62 0.18 30), oklch(0.55 0.16 350))" }}>
          <ShoppingBag className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-display text-lg italic leading-tight"> Shopping Hub</div>
          <div className="text-[11px] text-muted-foreground">Curated · compared · yours to keep</div>
        </div>
        <select value={region} onChange={(e)=>setRegion(e.target.value as Region)}
          className="glass rounded-full px-2 py-1 text-[11px] uppercase tracking-wider">
          {(["global","in","us","uk"] as Region[]).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </header>

      <nav className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
        {tabs.map(({ k, label, icon }) => (
          <button key={k} onClick={()=>setTab(k)}
            className={cn("shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs transition",
              tab === k ? "bg-foreground text-background shadow-md" : "glass")}>
            {icon}{label}
          </button>
        ))}
      </nav>

      <main className="px-4">
        {tab === "home"   && <Home userId={user.id} onSeed={jumpToSearchWith} region={region} />}
        {tab === "search" && <SearchPanel userId={user.id} region={region} seed={seed} clearSeed={()=>setSeed("")} />}
        {tab === "ideas"  && <Ideas />}
        {tab === "saved"  && <Saved userId={user.id} />}
        {tab === "chat"   && <Chat />}
      </main>
    </div>
  );
}

/* -------------------- HOME (For You) -------------------- */
function Home({ userId, onSeed, region }: { userId: string; onSeed: (q: string)=>void; region: Region }) {
  const [recent, setRecent] = useState<Array<{ query: string; kind: string; created_at: string }>>([]);
  const [wish, setWish] = useState<WishItem[]>([]);
  const [drops, setDrops] = useState<Array<{ title: string; why: string; est_price: string; category: string }>>([]);
  const [loadingDrops, setLoadingDrops] = useState(false);

  useEffect(() => {
    (async () => {
      const h = await listShopHistory(userId, 12);
      setRecent(h as Array<{ query: string; kind: string; created_at: string }>);
      const w = await listWishlist(userId);
      setWish(w.slice(0, 6));
    })();
  }, [userId]);

  async function loadDrops() {
    if (loadingDrops || drops.length > 0) return;
    setLoadingDrops(true);
    try {
      const seed = wish[0]?.category || recent[0]?.query || "trending gadgets";
      let acc = "";
      await streamSam("shop_deals",
        [{ role: "user", content: JSON.stringify({ interests: seed, region, season: new Date().toLocaleString("en", { month: "long" }) }) }],
        (a) => { acc = a; });
      const parsed = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setDrops(parsed.deals ?? parsed.gifts ?? parsed.products ?? []);
    } catch {
      // silent — home tab shouldn't nag
    } finally { setLoadingDrops(false); }
  }
  useEffect(() => { loadDrops(); /* eslint-disable-next-line */ }, [wish.length]);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl p-5 text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, oklch(0.28 0.08 350), oklch(0.35 0.12 20))" }}>
        <div aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full blur-3xl opacity-60"
          style={{ background: "oklch(0.85 0.16 30)" }} />
        <div aria-hidden className="absolute -left-10 -bottom-14 h-40 w-40 rounded-full blur-3xl opacity-40"
          style={{ background: "oklch(0.75 0.16 300)" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-1 text-[10px] uppercase tracking-wider backdrop-blur-md">
            <Sparkles className="h-3 w-3" /> Personalised
          </div>
          <div className="mt-2 font-display text-2xl italic leading-tight">Shop smarter with Sam</div>
          <p className="mt-1 text-xs opacity-85">Voice, image, or a whisper of an idea — I'll find it, compare it, save it.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={()=>onSeed("")} className="rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-black shadow">
              <Search className="mr-1 inline h-3.5 w-3.5" />Start a search
            </button>
            <button onClick={()=>onSeed("gift for someone I love")} className="glass rounded-full px-4 py-2 text-xs backdrop-blur-md">
              <Gift className="mr-1 inline h-3.5 w-3.5" />Gift idea
            </button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section>
        <SectionTitle icon={<Layers className="h-3.5 w-3.5" />} label="Shop by mood" />
        <div className="mt-2 grid grid-cols-4 gap-2">
          {CATEGORIES.map((c, i) => (
            <button key={c.key} onClick={()=>onSeed(c.label)}
              className="group relative overflow-hidden rounded-2xl p-3 text-left text-white shadow-md transition active:scale-[0.96] animate-fade-up"
              style={{ background: c.grad, animationDelay: `${i*30}ms` }}>
              <div aria-hidden className="absolute -right-4 -top-4 h-14 w-14 rounded-full bg-white/25 blur-2xl" />
              <div className="relative">{c.icon}</div>
              <div className="relative mt-1 text-[11px] font-medium">{c.label}</div>
            </button>
          ))}
        </div>
      </section>

      {/* AI Deal drops */}
      <section>
        <SectionTitle icon={<Flame className="h-3.5 w-3.5" />} label="Trending & deals for you" />
        {loadingDrops && drops.length === 0 ? (
          <div className="mt-2 glass h-28 animate-pulse rounded-2xl" />
        ) : drops.length === 0 ? (
          <button onClick={loadDrops} className="mt-2 glass w-full rounded-2xl p-4 text-xs text-muted-foreground">
 Tap to load picks based on your interests
          </button>
        ) : (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {drops.slice(0, 6).map((d, i) => (
              <button key={i} onClick={()=>onSeed(d.title)}
                className="glass rounded-2xl p-3 text-left animate-fade-up transition active:scale-[0.98]"
                style={{ animationDelay: `${i*30}ms` }}>
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Tag className="h-3 w-3" />{d.category || "Deal"}
                </div>
                <div className="mt-0.5 font-display text-sm italic leading-tight line-clamp-2">{d.title}</div>
                <div className="mt-1 text-[11px]">{d.est_price}</div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Recently searched */}
      {recent.length > 0 && (
        <section>
          <SectionTitle icon={<Clock className="h-3.5 w-3.5" />} label="Pick up where you left off" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {recent.slice(0, 10).map((r, i) => (
              <button key={i} onClick={()=>onSeed(r.query)}
                className="glass rounded-full px-3 py-1 text-xs text-foreground/85">
                {r.query}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Wishlist peek */}
      {wish.length > 0 && (
        <section>
          <SectionTitle icon={<Heart className="h-3.5 w-3.5" />} label="Your wishlist" />
          <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
            {wish.map((w, i) => (
              <div key={w.id} className="glass shrink-0 w-40 rounded-2xl p-3 animate-fade-up" style={{ animationDelay: `${i*30}ms` }}>
                <div className="line-clamp-2 font-display text-sm italic leading-tight">{w.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{w.brand || w.category}</div>
                {w.price && <div className="mt-1 text-xs">{w.currency || ""} {w.price}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
      {icon}{label}
    </div>
  );
}

/* -------------------- SEARCH (voice + image + AI) -------------------- */
function SearchPanel({ userId, region, seed, clearSeed }: { userId: string; region: Region; seed: string; clearSeed: () => void }) {
  const [query, setQuery] = useState(seed);
  const [budget, setBudget] = useState("$200");
  const [priority, setPriority] = useState("Value");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageHint, setImageHint] = useState<string>("");
  const imgRef = useRef<HTMLInputElement | null>(null);
  const links = useMemo(() => (query ? shopLinks(query, region) : []), [query, region]);

  useEffect(() => { if (seed) { setQuery(seed); clearSeed(); } /* eslint-disable-next-line */ }, [seed]);

  function startVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice search isn't supported on this browser"); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setQuery(t.trim());
    };
    rec.onerror = () => { setListening(false); toast.error("Voice input failed"); };
    rec.onend = () => setListening(false);
    rec.start();
  }

  function pickImage(files: FileList | null) {
    const f = files?.[0]; if (!f) return;
    setImagePreview(URL.createObjectURL(f));
    setImageHint("");
    toast("Add a short hint about the product to search visually.");
  }

  async function run() {
    const finalQuery = imagePreview ? `${imageHint.trim() || "product in image"} (visual reference attached)` : query.trim();
    if (!finalQuery) { toast.error("Type, speak or attach an image"); return; }
    setLoading(true); setProducts([]);
    try {
      let acc = "";
      await streamSam("shop_search",
        [{ role: "user", content: JSON.stringify({ query: finalQuery, budget, priority, region }) }],
        (a) => { acc = a; });
      const parsed = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setProducts(parsed.products ?? []);
      pushShopHistory(userId, "search", finalQuery, { budget, priority, region });
    } catch (e) {
      toast.error("Could not fetch products", { description: e instanceof Error ? e.message : "" });
    } finally { setLoading(false); }
  }

  async function saveProduct(p: Product) {
    try {
      const [minStr] = p.est_price.replace(/[^\d.]/g, " ").trim().split(/\s+/);
      const price = Number(minStr) || null;
      await addWish({ user_id: userId, title: p.title, brand: p.brand, category: p.category,
        price, currency: p.currency, rating: p.rating,
        meta: { pros: p.pros, cons: p.cons, badge: p.badge } });
      toast.success("Saved to wishlist");
    } catch { toast.error("Could not save"); }
  }

  return (
    <div className="space-y-4">
      <section className="glass-strong rounded-3xl p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-2xl bg-background/60 px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()}
            placeholder="Silk scarf, running shoes, quiet fan…"
            className="w-full bg-transparent text-sm outline-none" />
          <button onClick={startVoice} aria-label="Voice search"
            className={cn("flex h-8 w-8 items-center justify-center rounded-full transition",
              listening ? "bg-red-500 text-white animate-pulse" : "glass")}>
            <Mic className="h-4 w-4" />
          </button>
          <button onClick={()=>imgRef.current?.click()} aria-label="Image search"
            className="glass flex h-8 w-8 items-center justify-center rounded-full">
            <Camera className="h-4 w-4" />
          </button>
          <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e)=>pickImage(e.target.files)} />
        </div>

        {imagePreview && (
          <div className="flex items-center gap-3 rounded-2xl bg-background/60 p-2">
            <img src={imagePreview} alt="" className="h-14 w-14 rounded-xl object-cover" />
            <input value={imageHint} onChange={e=>setImageHint(e.target.value)} placeholder="Describe the product (e.g. red canvas sneakers)"
              className="flex-1 bg-transparent text-xs outline-none" />
            <button onClick={()=>{ if (imagePreview) URL.revokeObjectURL(imagePreview); setImagePreview(null); setImageHint(""); }}
              className="glass flex h-7 w-7 items-center justify-center rounded-full">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Budget"
            className="rounded-xl bg-background/60 px-3 py-2 outline-none" />
          <select value={priority} onChange={e=>setPriority(e.target.value)}
            className="rounded-xl bg-background/60 px-3 py-2 outline-none">
            {["Value","Premium","Budget","Eco","Portable","Durable"].map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        <button onClick={run} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-medium text-white shadow-lg disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, oklch(0.62 0.18 30), oklch(0.55 0.16 350))" }}>
          <Sparkles className="h-4 w-4" />{loading ? "is curating…" : "Discover with"}
        </button>
      </section>

      {products.length > 0 && (
        <section className="space-y-3">
          {products.map((p, i) => (
            <article key={i} className="glass overflow-hidden rounded-3xl animate-fade-up" style={{ animationDelay: `${i*40}ms` }}>
              <div className="flex items-center justify-between px-4 pt-4">
                <span className="rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] uppercase tracking-wider text-background">{p.badge}</span>
                <span className="text-[11px] text-muted-foreground">{p.category}</span>
              </div>
              <div className="flex items-start justify-between gap-2 px-4 pt-1">
                <div className="min-w-0">
                  <div className="mt-1 font-display text-base italic leading-tight">{p.title}</div>
                  <div className="text-[11px] text-muted-foreground">{p.brand}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs">
                    <span className="font-medium">{p.est_price}</span>
                    <span className="flex items-center gap-0.5 text-amber-500">
                      <Star className="h-3 w-3 fill-current" />{p.rating}
                    </span>
                  </div>
                </div>
                <button onClick={()=>saveProduct(p)} aria-label="Save" className="glass flex h-9 w-9 items-center justify-center rounded-full">
                  <Heart className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 px-4 text-xs">
                <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pros</div>
                  <ul className="mt-0.5 space-y-0.5">{p.pros?.map((x,j)=><li key={j}>+ {x}</li>)}</ul></div>
                <div><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cons</div>
                  <ul className="mt-0.5 space-y-0.5">{p.cons?.map((x,j)=><li key={j}>− {x}</li>)}</ul></div>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto px-4 pb-4 no-scrollbar">
                {shopLinks(p.title, region).slice(0, 4).map((l) => (
                  <a key={l.name} href={l.url} target="_blank" rel="noreferrer noopener"
                    className="glass shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px]">
                    <ExternalLink className="h-3 w-3" />{l.name}
                  </a>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {links.length > 0 && (
        <section className="glass-strong rounded-3xl p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />Shop "{query}" on
          </div>
          <div className="grid grid-cols-2 gap-2">
            {links.map((l) => (
              <a key={l.name} href={l.url} target="_blank" rel="noreferrer noopener"
                className="glass flex items-center justify-between rounded-2xl px-3 py-2 text-xs">
                <span>{l.name}</span><ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
          <p className="mt-2 text-[10px] italic text-muted-foreground">Samsta never processes payments. Purchases happen on the seller's official site.</p>
        </section>
      )}
    </div>
  );
}

/* -------------------- IDEAS (gifts + compare + guide) -------------------- */
function Ideas() {
  const [mode, setMode] = useState<"gift" | "compare" | "guide">("gift");
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[
          { k: "gift" as const, label: "Gift finder", icon: <Gift className="h-4 w-4" /> },
          { k: "compare" as const, label: "Compare", icon: <Layers className="h-4 w-4" /> },
          { k: "guide" as const, label: "Buying guide", icon: <BookOpen className="h-4 w-4" /> },
        ].map(({ k, label, icon }) => (
          <button key={k} onClick={()=>setMode(k)}
            className={cn("glass flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2 text-xs transition",
              mode===k && "bg-foreground text-background")}>
            {icon}{label}
          </button>
        ))}
      </div>
      {mode === "gift" && <Gifts />}
      {mode === "compare" && <Compare />}
      {mode === "guide" && <Guide />}
    </div>
  );
}

function Gifts() {
  const [recipient, setRecipient] = useState("");
  const [occasion, setOccasion] = useState("Birthday");
  const [budget, setBudget] = useState("$100");
  const [interests, setInterests] = useState("");
  const [gifts, setGifts] = useState<{ title: string; why: string; est_price: string; category: string }[]>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!recipient.trim()) { toast.error("Who is the gift for?"); return; }
    setLoading(true); setGifts([]);
    try {
      let acc = "";
      await streamSam("shop_gift",
        [{ role: "user", content: JSON.stringify({ recipient, occasion, budget, interests, region: "global" }) }],
        (a) => { acc = a; });
      const parsed = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setGifts(parsed.gifts ?? []);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      <section className="glass-strong rounded-3xl p-4 space-y-2">
        <input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="For whom? (mum, best friend, coworker)"
          className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />
        <div className="grid grid-cols-2 gap-2 text-xs">
          <input value={occasion} onChange={e=>setOccasion(e.target.value)} placeholder="Occasion" className="rounded-xl bg-background/60 px-3 py-2 outline-none" />
          <input value={budget} onChange={e=>setBudget(e.target.value)} placeholder="Budget" className="rounded-xl bg-background/60 px-3 py-2 outline-none" />
        </div>
        <input value={interests} onChange={e=>setInterests(e.target.value)} placeholder="Their interests"
          className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />
        <button onClick={run} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-2.5 text-sm text-background disabled:opacity-60">
          <Gift className="h-4 w-4" />{loading ? "Finding gifts…" : "Find gift ideas"}
        </button>
      </section>
      <div className="grid grid-cols-1 gap-2">
        {gifts.map((g, i) => (
          <div key={i} className="glass rounded-2xl p-3 animate-fade-up" style={{ animationDelay: `${i*30}ms` }}>
            <div className="flex items-center justify-between">
              <div className="font-display italic">{g.title}</div>
              <span className="text-xs">{g.est_price}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">{g.category}</div>
            <p className="mt-1 text-xs">{g.why}</p>
            <a href={`https://www.google.com/search?tbm=shop&q=${encodeURIComponent(g.title)}`} target="_blank" rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] text-background">
              <ExternalLink className="h-3 w-3" />Shop
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function Compare() {
  const [text, setText] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!text.trim()) return;
    setLoading(true); setOut("");
    try {
      await streamSam("shop_compare",
        [{ role: "user", content: JSON.stringify({ products: text }) }],
        (a) => setOut(a));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }
  return (
    <div className="space-y-3">
      <section className="glass-strong rounded-3xl p-4 space-y-2">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Paste products to compare</div>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={5}
          placeholder="e.g. AirPods Pro 2 $249, Sony WF-1000XM5 $299, Nothing Ear (2) $149…"
          className="w-full rounded-xl bg-background/60 p-3 text-sm outline-none" />
        <button onClick={run} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-2.5 text-sm text-background disabled:opacity-60">
          <Layers className="h-4 w-4" />{loading ? "Comparing…" : "Compare with"}
        </button>
      </section>
      {(loading || out) && (
        <pre className="glass max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-3xl p-4 text-xs">
          {loading && !out ? "Thinking…" : out}
        </pre>
      )}
    </div>
  );
}

function Guide() {
  const [topic, setTopic] = useState("");
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!topic.trim()) return;
    setLoading(true); setOut("");
    try {
      await streamSam("shop_guide",
        [{ role: "user", content: JSON.stringify({ topic }) }],
        (a) => setOut(a));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  }
  return (
    <div className="space-y-3">
      <section className="glass-strong rounded-3xl p-4 space-y-2">
        <input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What to look for in a mirrorless camera?"
          className="w-full rounded-xl bg-background/60 px-3 py-2 text-sm outline-none" />
        <button onClick={run} disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-2.5 text-sm text-background disabled:opacity-60">
          <BookOpen className="h-4 w-4" />{loading ? "Writing…" : "Get buying guide"}
        </button>
      </section>
      {(loading || out) && (
        <pre className="glass max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-3xl p-4 text-xs">
          {loading && !out ? "Thinking…" : out}
        </pre>
      )}
    </div>
  );
}

/* -------------------- SAVED (wishlist + collections) -------------------- */
function Saved({ userId }: { userId: string }) {
  const [items, setItems] = useState<WishItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<string>("all");

  async function reload() {
    setLoading(true);
    const list = await listWishlist(userId);
    setItems(list); setLoading(false);
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [userId]);

  const folders = useMemo(() => Array.from(new Set(items.map(i => i.folder))).filter(Boolean), [items]);
  const filtered = folder === "all" ? items : items.filter(i => i.folder === folder);

  async function setAlert(item: WishItem) {
    const v = window.prompt("Alert me when price drops below (number):", String(item.price ?? ""));
    if (v == null) return;
    const price_alert = Number(v) || null;
    await updateWish(item.id, { price_alert });
    toast.success(price_alert ? `Alert set at ${price_alert}` : "Alert cleared");
    reload();
  }
  async function toggleFav(item: WishItem) {
    await updateWish(item.id, { favorite: !item.favorite });
    reload();
  }
  async function share(item: WishItem) {
    const url = item.url || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(item.title)}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav: any = navigator;
    if (nav.share) { try { await nav.share({ title: item.title, url }); return; } catch { /* cancelled */ } }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button onClick={()=>setFolder("all")}
          className={cn("shrink-0 rounded-full px-3 py-1 text-xs", folder==="all" ? "bg-foreground text-background" : "glass")}>
          All ({items.length})
        </button>
        {folders.map(f => (
          <button key={f} onClick={()=>setFolder(f)}
            className={cn("shrink-0 rounded-full px-3 py-1 text-xs", folder===f ? "bg-foreground text-background" : "glass")}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <div className="glass h-32 animate-pulse rounded-3xl" /> :
        filtered.length === 0 ?
        <div className="glass rounded-3xl p-6 text-center text-xs text-muted-foreground">
          Your wishlist is empty. Save products from Search or Ideas.
        </div> :
        <div className="space-y-2">
          {filtered.map((it, i) => (
            <div key={it.id} className="glass rounded-2xl p-3 animate-fade-up" style={{ animationDelay: `${i*25}ms` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display italic">{it.title}</div>
                  <div className="text-[11px] text-muted-foreground">{it.brand}{it.category?` · ${it.category}`:""}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {it.price && <span>{it.currency||""} {it.price}</span>}
                    {it.rating && <span className="flex items-center gap-0.5 text-amber-500"><Star className="h-3 w-3 fill-current" />{it.rating}</span>}
                    {it.price_alert && <span className="rounded-full bg-background/60 px-2 py-0.5 text-[10px]"><Bell className="mr-1 inline h-3 w-3" />alert @ {it.price_alert}</span>}
                    {it.favorite && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-500">favourite</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button onClick={()=>toggleFav(it)} aria-label="Favourite"
                    className={cn("glass flex h-8 w-8 items-center justify-center rounded-full",
                      it.favorite && "bg-red-500/90 text-white")}>
                    <Heart className="h-4 w-4" />
                  </button>
                  <button onClick={()=>setAlert(it)} className="glass flex h-8 w-8 items-center justify-center rounded-full" aria-label="Price alert">
                    <Bell className="h-4 w-4" />
                  </button>
                  <button onClick={async()=>{await removeWish(it.id); reload();}} className="glass flex h-8 w-8 items-center justify-center rounded-full">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <a href={it.url || `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(it.title)}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-[11px] text-background">
                  <ExternalLink className="h-3 w-3" />Shop
                </a>
                <button onClick={()=>share(it)} className="glass inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px]">
                  Share
                </button>
              </div>
            </div>
          ))}
        </div>}
    </div>
  );
}

/* -------------------- CHAT -------------------- */
function Chat() {
  const [messages, setMessages] = useState<Array<{ role: "user"|"assistant"; content: string }>>([]);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  async function send() {
    if (!text.trim() || streaming) return;
    const next = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(next); setText(""); setStreaming(true);
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    try {
      await streamSam("shop_ai_chat", next, (acc) => {
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
        <Bot className="h-4 w-4" /> Ask about deals, brands, sizes, return policies, or "what's actually worth it".
      </div>
      <div className="flex-1 space-y-3 overflow-auto pb-2">
        {messages.length === 0 && (
          <div className="grid grid-cols-2 gap-2">
            {["What's a good espresso machine under $500?","Compare Dyson vs Shark vacuums","Best noise-cancelling headphones 2026","Sustainable fashion brands I should try"].map((s) => (
              <button key={s} onClick={()=>setText(s)}
                className="glass rounded-2xl p-3 text-left text-xs text-foreground/80">{s}</button>
            ))}
          </div>
        )}
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
          placeholder="Ask anything about shopping…" className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button onClick={send} disabled={streaming} className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background disabled:opacity-60">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
