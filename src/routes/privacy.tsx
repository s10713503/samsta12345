import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ShieldAlert, ShieldCheck, Link2, Fingerprint, KeyRound, Eye, Globe,
  Radar, Bot, Send, Sparkles, Lock, Search, Plus, Trash2, RefreshCw, AlertTriangle,
  Camera, Mic, MapPin, Clipboard, Wallet, Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthUser } from "@/hooks/use-auth";
import { usePremium } from "@/lib/premium";
import { streamSam } from "@/lib/stream-sam";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/privacy")({
  component: PrivacyHub,
  head: () => ({
    meta: [
      { title: "Privacy Guardian · Samsta" },
      { name: "description", content: "cybersecurity center— scam detection, link scanner, password vault, dark web monitoring, deepfake defense." },
    ],
  }),
});

/* ============================================================
   Local encrypted-lite vault (localStorage w/ base64 obfuscation)
   Note: not military-grade — a real vault would use WebCrypto with
   a user passphrase-derived key. This is a demo-safe placeholder.
============================================================ */

type Vault = { id: string; site: string; user: string; pass: string; strength: number; updated: string; leaked?: boolean };
type Threat = { id: string; at: string; kind: "phishing" | "scam" | "malware" | "deepfake" | "breach" | "privacy"; risk: "low" | "medium" | "high" | "critical"; summary: string };
type Perms = { camera: boolean; mic: boolean; location: boolean; clipboard: boolean; contacts: boolean };
type State = {
  vault: Vault[];
  threats: Threat[];
  emailWatch: string[];
  phoneWatch: string[];
  perms: Perms;
  browser: { trackers: boolean; ads: boolean; cookies: boolean; safeBrowse: boolean };
  privacy: { public_profile: boolean; dm_open: boolean; location_shared: boolean; phone_public: boolean; email_public: boolean; third_party_apps: number };
};

const DEFAULT: State = {
  vault: [],
  threats: [],
  emailWatch: [],
  phoneWatch: [],
  perms: { camera: false, mic: false, location: false, clipboard: false, contacts: false },
  browser: { trackers: true, ads: true, cookies: true, safeBrowse: true },
  privacy: { public_profile: true, dm_open: true, location_shared: false, phone_public: false, email_public: false, third_party_apps: 2 },
};

const keyFor = (uid: string) => `samsta:privacy:${uid}`;
const b64 = (x: string) => typeof btoa === "function" ? btoa(unescape(encodeURIComponent(x))) : x;
const unb = (x: string) => { try { return decodeURIComponent(escape(atob(x))); } catch { return x; } };

function useStore(uid: string) {
  const [s, setS] = useState<State>(DEFAULT);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(uid));
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        parsed.vault = (parsed.vault ?? []).map(v => ({ ...v, pass: unb(v.pass) }));
        setS({ ...DEFAULT, ...parsed });
      }
    } catch { /* noop */ }
  }, [uid]);
  useEffect(() => {
    try {
      const enc = { ...s, vault: s.vault.map(v => ({ ...v, pass: b64(v.pass) })) };
      localStorage.setItem(keyFor(uid), JSON.stringify(enc));
    } catch { /* noop */ }
  }, [uid, s]);
  return [s, setS] as const;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/* ============================================================
   Scores
============================================================ */

function passwordStrength(p: string) {
  if (!p) return 0;
  let s = Math.min(40, p.length * 3);
  if (/[a-z]/.test(p)) s += 10;
  if (/[A-Z]/.test(p)) s += 15;
  if (/[0-9]/.test(p)) s += 15;
  if (/[^\w\s]/.test(p)) s += 20;
  if (/(.)\1{2,}/.test(p)) s -= 15;
  if (/^(password|123|qwerty|admin)/i.test(p)) s -= 40;
  return Math.max(0, Math.min(100, s));
}

function overallScore(s: State) {
  const vaultAvg = s.vault.length ? s.vault.reduce((a, v) => a + v.strength, 0) / s.vault.length : 60;
  const permsOn = Object.values(s.perms).filter(Boolean).length;
  const permsScore = 100 - permsOn * 15;
  const browserScore = Object.values(s.browser).filter(Boolean).length * 25;
  const recentThreats = s.threats.filter(t => t.risk === "high" || t.risk === "critical").length;
  const threatScore = Math.max(0, 100 - recentThreats * 20);
  const security = Math.round(vaultAvg * 0.35 + browserScore * 0.25 + threatScore * 0.4);
  const p = s.privacy;
  const privacy = Math.round(
    100 - (p.public_profile ? 10 : 0) - (p.dm_open ? 15 : 0) - (p.location_shared ? 20 : 0) -
    (p.phone_public ? 20 : 0) - (p.email_public ? 15 : 0) - Math.min(30, p.third_party_apps * 5)
  );
  const deviceRisk = permsScore;
  return { security, privacy: Math.max(0, privacy), deviceRisk };
}

/* ============================================================
   UI atoms
============================================================ */

function Ring({ value, size = 108, stroke = 10, label, color }: { value: number; size?: number; stroke?: number; label: string; color: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} stroke="currentColor" className="text-foreground/10" strokeWidth={stroke} fill="none" />
          <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-display text-2xl italic">{Math.round(value)}</div>
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">/ 100</div>
        </div>
      </div>
      <div className="mt-1.5 text-[10px] font-medium tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

const riskColor = (r: string) =>
  r === "critical" ? "oklch(0.55 0.22 20)" : r === "high" ? "oklch(0.7 0.2 25)" : r === "medium" ? "oklch(0.82 0.15 70)" : "oklch(0.78 0.14 155)";

function RiskBadge({ risk }: { risk: string }) {
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-medium tracking-widest uppercase text-white" style={{ background: riskColor(risk) }}>{risk}</span>;
}

function SectionTitle({ icon, title, kicker }: { icon: React.ReactNode; title: string; kicker?: string }) {
  return (
    <div className="mb-2 flex items-end justify-between px-1">
      <div>
        <div className="font-display text-lg italic">{title}</div>
        {kicker && <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{kicker}</div>}
      </div>
      <div className="text-muted-foreground">{icon}</div>
    </div>
  );
}

/* ============================================================
   Main
============================================================ */

type Tab = "dash" | "scan" | "link" | "deepfake" | "vault" | "device" | "social" | "darkweb" | "browser" | "assistant";

function PrivacyHub() {
  const { user, loading } = useAuthUser();
  const { isPremium } = usePremium();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);
  useEffect(() => { if (!loading && user && !isPremium) navigate({ to: "/premium" }); }, [loading, user, isPremium, navigate]);
  if (loading || !user) return <div className="min-h-screen animate-pulse bg-background" />;
  return <PrivacyInner userId={user.id} />;
}

function PrivacyInner({ userId }: { userId: string }) {
  const [s, setS] = useStore(userId);
  const [tab, setTab] = useState<Tab>("dash");
  const sc = useMemo(() => overallScore(s), [s]);
  const addThreat = (t: Omit<Threat, "id" | "at">) => setS(p => ({ ...p, threats: [{ id: uid(), at: new Date().toISOString(), ...t }, ...p.threats].slice(0, 40) }));

  const tabs: { k: Tab; label: string; icon: React.ReactNode }[] = [
    { k: "dash", label: "Radar", icon: <Radar className="h-3.5 w-3.5" /> },
    { k: "scan", label: "Scam scan", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { k: "link", label: "Link scanner", icon: <Link2 className="h-3.5 w-3.5" /> },
    { k: "deepfake", label: "Deepfake", icon: <Fingerprint className="h-3.5 w-3.5" /> },
    { k: "vault", label: "Vault", icon: <KeyRound className="h-3.5 w-3.5" /> },
    { k: "device", label: "Device", icon: <Eye className="h-3.5 w-3.5" /> },
    { k: "social", label: "Social", icon: <Users className="h-3.5 w-3.5" /> },
    { k: "darkweb", label: "Dark web", icon: <Search className="h-3.5 w-3.5" /> },
    { k: "browser", label: "Browser", icon: <Globe className="h-3.5 w-3.5" /> },
    { k: "assistant", label: "Assistant", icon: <Bot className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen pb-28">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px] opacity-70"
        style={{ background: "radial-gradient(60% 60% at 20% 10%, oklch(0.7 0.18 260 / 0.35), transparent), radial-gradient(60% 60% at 80% 20%, oklch(0.75 0.16 25 / 0.28), transparent)" }} />

      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        <Link to="/assistants" className="glass flex h-10 w-10 items-center justify-center rounded-full"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: "linear-gradient(135deg, oklch(0.55 0.2 260), oklch(0.7 0.2 25))" }}>
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-lg italic leading-tight">Privacy Guardian— cybersecurity for your digital life</h1>
          <div className="text-[11px] text-muted-foreground"> cybersecurity center</div>
        </div>
      </header>

      <div className="sticky top-[64px] z-20 flex gap-2 overflow-x-auto px-4 py-2 no-scrollbar backdrop-blur-xl"
        style={{ background: "linear-gradient(to bottom, var(--background), transparent)" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition",
              tab === t.k ? "bg-foreground text-background" : "glass")}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <main className="relative z-10 px-4 pt-2">
        {tab === "dash" && <Dashboard s={s} sc={sc} setS={setS} />}
        {tab === "scan" && <ScamScan add={addThreat} />}
        {tab === "link" && <LinkScan add={addThreat} />}
        {tab === "deepfake" && <Deepfake add={addThreat} />}
        {tab === "vault" && <VaultUI s={s} setS={setS} />}
        {tab === "device" && <Device s={s} setS={setS} />}
        {tab === "social" && <Social s={s} setS={setS} />}
        {tab === "darkweb" && <DarkWeb s={s} setS={setS} add={addThreat} />}
        {tab === "browser" && <Browser s={s} setS={setS} />}
        {tab === "assistant" && <Assistant sc={sc} s={s} />}
      </main>
    </div>
  );
}

/* ============================================================
   Dashboard
============================================================ */

function Dashboard({ s, sc, setS }: { s: State; sc: ReturnType<typeof overallScore>; setS: (fn: (p: State) => State) => void }) {
  const risk = sc.security >= 80 ? "Low" : sc.security >= 60 ? "Moderate" : "High";
  return (
    <div className="space-y-4">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-5 animate-fade-up">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-40" style={{ background: "oklch(0.6 0.22 260)" }} />
        <div className="flex items-start justify-around gap-3">
          <Ring value={sc.security} label="Security" color="oklch(0.6 0.2 260)" />
          <Ring value={sc.privacy} label="Privacy" color="oklch(0.75 0.14 200)" />
          <Ring value={sc.deviceRisk} label="Device" color="oklch(0.72 0.16 155)" />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-foreground/5 p-3 text-xs">
          <div>Device risk: <span className="font-medium">{risk}</span></div>
          <div className="text-muted-foreground">Real-time monitoring · {s.threats.length} events</div>
        </div>
      </div>

      {/* Radar animation */}
      <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
        <SectionTitle icon={<Radar className="h-4 w-4" />} title="Live threat radar" kicker="Sweeping" />
        <div className="relative mx-auto my-2 h-40 w-40">
          <div className="absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, transparent 40%, oklch(0.5 0.15 260 / 0.15) 60%, transparent 70%)" }} />
          {[1,2,3].map(i => <div key={i} className="absolute inset-0 rounded-full border border-foreground/10" style={{ transform: `scale(${1 - i * 0.22})` }} />)}
          <div className="absolute inset-0 origin-center animate-spin" style={{ animationDuration: "4s" }}>
            <div className="mx-auto h-1/2 w-[2px]" style={{ background: "linear-gradient(to bottom, oklch(0.65 0.2 260), transparent)" }} />
          </div>
          {s.threats.slice(0, 4).map((t, i) => (
            <span key={t.id} className="absolute h-2 w-2 rounded-full" style={{
              top: `${20 + i * 22}%`, left: `${25 + i * 15}%`,
              background: riskColor(t.risk), boxShadow: `0 0 10px ${riskColor(t.risk)}`
            }} />
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="glass rounded-3xl p-4 animate-fade-up" style={{ animationDelay: "120ms" }}>
        <div className="flex items-center justify-between">
          <SectionTitle icon={<Sparkles className="h-4 w-4" />} title="insights timeline" />
          {s.threats.length > 0 && (
            <button onClick={() => setS(p => ({ ...p, threats: [] }))} className="rounded-full glass px-3 py-1 text-[11px]">Clear</button>
          )}
        </div>
        {s.threats.length === 0 ? (
          <div className="rounded-2xl bg-foreground/5 p-6 text-center text-xs text-muted-foreground">All quiet. Run a scan to populate your timeline.</div>
        ) : (
          <ol className="relative space-y-3 border-l border-foreground/10 pl-4">
            {s.threats.map((t, i) => (
              <li key={t.id} className="relative animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
                <span className="absolute -left-[21px] top-1.5 h-3 w-3 rounded-full ring-2 ring-background" style={{ background: riskColor(t.risk) }} />
                <div className="flex items-center gap-2">
                  <RiskBadge risk={t.risk} />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.kind}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{new Date(t.at).toLocaleString()}</span>
                </div>
                <div className="mt-1 text-sm">{t.summary}</div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Scam / message scan
============================================================ */

function ScamScan({ add }: { add: (t: Omit<Threat, "id" | "at">) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const run = async () => {
    if (!text.trim()) return; setBusy(true); setResult(null);
    try {
      let acc = "";
      await streamSam("privacy_scan_text", [{ role: "user", content: text }], (a) => (acc = a));
      const j = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setResult(j);
      add({ kind: j.category === "phishing" ? "phishing" : "scam", risk: j.risk, summary: j.summary });
    } catch { toast.error("Couldn't scan — try again."); }
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<ShieldAlert className="h-4 w-4" />} title="Scam & phishing scanner" kicker="SMS · email · DM · social" />
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the suspicious message here…" rows={5}
          className="w-full resize-none rounded-2xl bg-background/60 p-3 text-sm outline-none border border-foreground/10" />
        <button onClick={run} disabled={busy || !text.trim()} className="mt-2 w-full rounded-full bg-foreground py-2 text-sm text-background disabled:opacity-50">
          {busy ? "Scanning…" : "Scan message"}
        </button>
      </div>
      {result && <ResultCard j={result} />}
    </div>
  );
}

function ResultCard({ j }: { j: any }) {
  return (
    <div className="glass rounded-3xl p-4 animate-fade-up">
      <div className="mb-2 flex items-center gap-2">
        <RiskBadge risk={j.risk} />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{j.category}</span>
        <span className="ml-auto font-display text-xl italic">{j.score}/100</span>
      </div>
      <div className="text-sm">{j.summary}</div>
      {j.signals?.length > 0 && (
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Signals</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{j.signals.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {j.advice?.length > 0 && (
        <div className="mt-3 rounded-2xl bg-foreground/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Do this</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{j.advice.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
      {j.do_not?.length > 0 && (
        <div className="mt-2 rounded-2xl border p-3" style={{ borderColor: "oklch(0.7 0.2 25 / 0.3)" }}>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: "oklch(0.55 0.22 20)" }}>Do NOT</div>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{j.do_not.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Link scanner
============================================================ */

function LinkScan({ add }: { add: (t: Omit<Threat, "id" | "at">) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const run = async () => {
    if (!url.trim()) return; setBusy(true); setResult(null);
    try {
      let acc = "";
      await streamSam("privacy_scan_link", [{ role: "user", content: url }], (a) => (acc = a));
      const j = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setResult(j);
      add({ kind: j.category === "malware" ? "malware" : "phishing", risk: j.risk, summary: `Link ${url}: ${j.recommendation}` });
    } catch { toast.error("Couldn't scan link."); }
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Link2 className="h-4 w-4" />} title="link scanner" kicker="Phishing · malware · typosquatting" />
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="flex-1 rounded-full bg-background/60 px-4 py-2 text-sm outline-none border border-foreground/10" />
          <button onClick={run} disabled={busy || !url.trim()} className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-50">{busy ? "…" : "Scan"}</button>
        </div>
      </div>
      {result && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <div className="mb-2 flex items-center gap-2">
            <RiskBadge risk={result.risk} />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{result.category}</span>
            <span className="ml-auto font-display text-xl italic">{result.score}/100</span>
          </div>
          <div className="text-sm">{result.recommendation}</div>
          {result.reasons?.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{result.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>
          )}
          {result.domain_age_guess && <div className="mt-2 text-[11px] text-muted-foreground">Domain age (est): {result.domain_age_guess}</div>}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Deepfake
============================================================ */

function Deepfake({ add }: { add: (t: Omit<Threat, "id" | "at">) => void }) {
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = async (text: string) => {
    if (!text.trim()) return; setBusy(true); setResult(null);
    try {
      let acc = "";
      await streamSam("privacy_deepfake", [{ role: "user", content: text }], (a) => (acc = a));
      const j = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setResult(j);
      add({ kind: "deepfake", risk: j.likelihood === "high" ? "high" : j.likelihood === "medium" ? "medium" : "low", summary: `Deepfake check: ${j.likelihood} likelihood` });
    } catch { toast.error("Couldn't analyze."); }
    setBusy(false);
  };

  const onFile = (f: File | null) => {
    if (!f) return;
    const kind = f.type.startsWith("video") ? "video" : f.type.startsWith("audio") ? "voice" : "image";
    void run(`Uploaded ${kind}: ${f.name} (${Math.round(f.size / 1024)} KB). Assess likelihood of generation or manipulation for a ${kind}.`);
  };

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Fingerprint className="h-4 w-4" />} title="Deepfake detection" kicker="Image · video · voice" />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="Describe the media (source, context, oddities)…"
          className="w-full resize-none rounded-2xl bg-background/60 p-3 text-sm outline-none border border-foreground/10" />
        <div className="mt-2 flex gap-2">
          <button onClick={() => run(desc)} disabled={busy || !desc.trim()} className="flex-1 rounded-full bg-foreground py-2 text-xs text-background disabled:opacity-50">
            {busy ? "Analyzing…" : "Analyze"}
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded-full glass px-4 py-2 text-xs">Upload media</button>
          <input ref={fileRef} type="file" accept="image/*,video/*,audio/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        </div>
      </div>
      {result && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <div className="flex items-center gap-2">
            <RiskBadge risk={result.likelihood} />
            <span className="ml-auto font-display text-xl italic">{result.confidence}% conf</span>
          </div>
          {result.signals?.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Signals</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{result.signals.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {result.how_to_verify?.length > 0 && (
            <div className="mt-3 rounded-2xl bg-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">How to verify</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{result.how_to_verify.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Password vault + generator
============================================================ */

const generate = (len = 20) => {
  const sets = ["abcdefghijklmnopqrstuvwxyz", "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "0123456789", "!@#$%^&*_-+=?"];
  let out = "";
  for (let i = 0; i < len; i++) {
    const set = sets[i % sets.length];
    out += set[Math.floor(Math.random() * set.length)];
  }
  return out.split("").sort(() => Math.random() - 0.5).join("");
};

function VaultUI({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const [site, setSite] = useState(""); const [user, setUser] = useState(""); const [pass, setPass] = useState("");
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const strength = passwordStrength(pass);

  const add = () => {
    if (!site || !pass) return;
    setS(p => ({ ...p, vault: [{ id: uid(), site, user, pass, strength: passwordStrength(pass), updated: new Date().toISOString() }, ...p.vault] }));
    setSite(""); setUser(""); setPass("");
    toast.success("Saved to vault");
  };

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<KeyRound className="h-4 w-4" />} title="Password vault" kicker="Local · encrypted-lite · demo" />
        <div className="grid grid-cols-2 gap-2">
          <input value={site} onChange={(e) => setSite(e.target.value)} placeholder="Site (e.g. instagram)" className="rounded-2xl bg-background/60 px-3 py-2 text-xs border border-foreground/10" />
          <input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Username / email" className="rounded-2xl bg-background/60 px-3 py-2 text-xs border border-foreground/10" />
          <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Password" className="col-span-2 rounded-2xl bg-background/60 px-3 py-2 text-xs border border-foreground/10" />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <div className="h-full transition-all" style={{ width: `${strength}%`, background: strength > 75 ? "oklch(0.72 0.16 155)" : strength > 45 ? "oklch(0.82 0.15 70)" : "oklch(0.7 0.2 25)" }} />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{strength}/100</span>
          <button onClick={() => setPass(generate())} className="rounded-full glass px-3 py-1 text-[11px]"><RefreshCw className="inline h-3 w-3" /> Generate</button>
          <button onClick={add} className="rounded-full bg-foreground px-3 py-1 text-[11px] text-background"><Plus className="inline h-3 w-3" /> Save</button>
        </div>
      </div>

      <ul className="space-y-2">
        {s.vault.length === 0 && <li className="glass rounded-2xl p-6 text-center text-xs text-muted-foreground">Empty. Save a password to begin.</li>}
        {s.vault.map((v, i) => (
          <li key={v.id} className="glass rounded-2xl p-3 animate-fade-up" style={{ animationDelay: `${i * 30}ms` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium capitalize">{v.site}</div>
                <div className="text-[11px] text-muted-foreground">{v.user}</div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setReveal(r => ({ ...r, [v.id]: !r[v.id] }))} className="h-8 w-8 rounded-full glass"><Eye className="mx-auto h-3.5 w-3.5" /></button>
                <button onClick={() => { navigator.clipboard.writeText(v.pass); toast.success("Copied"); }} className="h-8 w-8 rounded-full glass"><Clipboard className="mx-auto h-3.5 w-3.5" /></button>
                <button onClick={() => setS(p => ({ ...p, vault: p.vault.filter(x => x.id !== v.id) }))} className="h-8 w-8 rounded-full glass"><Trash2 className="mx-auto h-3.5 w-3.5" /></button>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-background/60 px-2 py-1 text-[11px]">{reveal[v.id] ? v.pass : "•".repeat(Math.min(20, v.pass.length))}</code>
              <span className="text-[10px] text-muted-foreground">{v.strength}/100</span>
              {v.leaked && <span className="rounded-full px-2 py-0.5 text-[10px] text-white" style={{ background: "oklch(0.6 0.2 25)" }}>Leaked</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================================================
   Device permissions
============================================================ */

function Device({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const items: { k: keyof Perms; label: string; icon: React.ReactNode }[] = [
    { k: "camera", label: "Camera", icon: <Camera className="h-4 w-4" /> },
    { k: "mic", label: "Microphone", icon: <Mic className="h-4 w-4" /> },
    { k: "location", label: "Location", icon: <MapPin className="h-4 w-4" /> },
    { k: "clipboard", label: "Clipboard", icon: <Clipboard className="h-4 w-4" /> },
    { k: "contacts", label: "Contacts", icon: <Users className="h-4 w-4" /> },
  ];
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Eye className="h-4 w-4" />} title="Device permissions" kicker="See what apps can access" />
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={it.k} className="flex items-center justify-between rounded-2xl bg-background/40 p-3 animate-fade-up" style={{ animationDelay: `${i * 25}ms` }}>
              <div className="flex items-center gap-2">{it.icon}<span className="text-sm">{it.label}</span></div>
              <button onClick={() => setS(p => ({ ...p, perms: { ...p.perms, [it.k]: !p.perms[it.k] } }))}
                className={cn("h-6 w-11 rounded-full transition", s.perms[it.k] ? "bg-foreground" : "bg-foreground/20")}>
                <span className={cn("block h-5 w-5 translate-y-0.5 rounded-full bg-background transition", s.perms[it.k] ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="glass rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Wallet className="h-4 w-4" />} title="Financial protection" kicker="UPI · QR · banking" />
        <ul className="space-y-2 text-sm">
          <li className="rounded-2xl bg-background/40 p-3"><span className="font-medium">Verify UPI IDs</span><div className="text-[11px] text-muted-foreground">Confirm merchant name before you pay. Never approve unknown auto-debit.</div></li>
          <li className="rounded-2xl bg-background/40 p-3"><span className="font-medium">Scan QR safely</span><div className="text-[11px] text-muted-foreground">Only scan codes from trusted physical locations. Screenshots can hide phishing.</div></li>
          <li className="rounded-2xl bg-background/40 p-3"><span className="font-medium">Investment scams</span><div className="text-[11px] text-muted-foreground">Guaranteed returns and pressure = scam. Verify SEBI/RBI registration.</div></li>
        </ul>
      </div>
    </div>
  );
}

/* ============================================================
   Social privacy scan
============================================================ */

function Social({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true); setResult(null);
    try {
      let acc = "";
      await streamSam("privacy_privacy_scan", [{ role: "user", content: JSON.stringify(s.privacy) }], (a) => (acc = a));
      const j = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setResult(j);
    } catch { toast.error("Scan failed."); }
    setBusy(false);
  };
  const toggle = (k: keyof State["privacy"]) => setS(p => ({ ...p, privacy: { ...p.privacy, [k]: !p.privacy[k as keyof typeof p.privacy] } as any }));
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Users className="h-4 w-4" />} title="Social exposure" kicker="Your public footprint" />
        <ul className="space-y-2">
          {[
            ["public_profile", "Public profile"],
            ["dm_open", "DMs open to everyone"],
            ["location_shared", "Location on posts"],
            ["phone_public", "Phone visible"],
            ["email_public", "Email visible"],
          ].map(([k, label]) => (
            <li key={k} className="flex items-center justify-between rounded-2xl bg-background/40 p-3 text-sm">
              <span>{label}</span>
              <button onClick={() => toggle(k as any)} className={cn("h-6 w-11 rounded-full transition", (s.privacy as any)[k] ? "bg-foreground" : "bg-foreground/20")}>
                <span className={cn("block h-5 w-5 translate-y-0.5 rounded-full bg-background transition", (s.privacy as any)[k] ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </li>
          ))}
          <li className="rounded-2xl bg-background/40 p-3">
            <div className="mb-1 flex items-center justify-between text-sm"><span>Connected 3rd-party apps</span><span className="font-display text-lg italic">{s.privacy.third_party_apps}</span></div>
            <input type="range" min={0} max={20} value={s.privacy.third_party_apps} onChange={(e) => setS(p => ({ ...p, privacy: { ...p.privacy, third_party_apps: Number(e.target.value) } }))} className="w-full accent-foreground" />
          </li>
        </ul>
        <button onClick={run} disabled={busy} className="mt-3 w-full rounded-full bg-foreground py-2 text-sm text-background disabled:opacity-50">{busy ? "Analyzing…" : "Run privacy scan"}</button>
      </div>
      {result && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <div className="flex items-center gap-2">
            <RiskBadge risk={result.risk_level} />
            <span className="ml-auto font-display text-xl italic">{result.privacy_score}/100</span>
          </div>
          {result.exposures?.length > 0 && (
            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Exposures</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{result.exposures.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {result.fixes?.length > 0 && (
            <div className="mt-3 rounded-2xl bg-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Fix now</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{result.fixes.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Dark web monitor
============================================================ */

function DarkWeb({ s, setS, add }: { s: State; setS: (fn: (p: State) => State) => void; add: (t: Omit<Threat, "id" | "at">) => void }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const scan = async () => {
    if (!query.trim()) return; setBusy(true); setResult(null);
    try {
      let acc = "";
      await streamSam("privacy_darkweb", [{ role: "user", content: query }], (a) => (acc = a));
      const j = JSON.parse(acc.replace(/```json|```/g, "").trim());
      setResult(j);
      if (j.exposed) add({ kind: "breach", risk: "high", summary: `${query} appears in ${j.count} breach(es).` });
      const isEmail = query.includes("@");
      setS(p => ({
        ...p,
        emailWatch: isEmail && !p.emailWatch.includes(query) ? [...p.emailWatch, query] : p.emailWatch,
        phoneWatch: !isEmail && !p.phoneWatch.includes(query) ? [...p.phoneWatch, query] : p.phoneWatch,
      }));
    } catch { toast.error("Scan failed."); }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Search className="h-4 w-4" />} title="Dark web monitor" kicker="Email · phone · password" />
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="you@email.com or +91…" className="flex-1 rounded-full bg-background/60 px-4 py-2 text-sm outline-none border border-foreground/10" />
          <button onClick={scan} disabled={busy || !query.trim()} className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-50">{busy ? "…" : "Scan"}</button>
        </div>
      </div>
      {(s.emailWatch.length > 0 || s.phoneWatch.length > 0) && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <SectionTitle icon={<AlertTriangle className="h-4 w-4" />} title="Watch list" />
          <div className="flex flex-wrap gap-1">
            {[...s.emailWatch, ...s.phoneWatch].map(w => <span key={w} className="rounded-full bg-foreground/5 px-2 py-1 text-[11px]">{w}</span>)}
          </div>
        </div>
      )}
      {result && (
        <div className="glass rounded-3xl p-4 animate-fade-up">
          <div className="flex items-center gap-2">
            <RiskBadge risk={result.exposed ? "high" : "low"} />
            <span className="text-sm">{result.exposed ? `Found in ${result.count} breach(es)` : "No known exposure"}</span>
          </div>
          {result.breaches?.length > 0 && (
            <ul className="mt-3 space-y-2">
              {result.breaches.map((b: any, i: number) => (
                <li key={i} className="rounded-2xl bg-background/40 p-3 text-sm">
                  <div className="flex items-center justify-between"><span className="font-medium">{b.source}</span><span className="text-[11px] text-muted-foreground">{b.year}</span></div>
                  <div className="mt-1 text-[11px] text-muted-foreground">Leaked: {b.data.join(", ")}</div>
                </li>
              ))}
            </ul>
          )}
          {result.advice?.length > 0 && (
            <div className="mt-3 rounded-2xl bg-foreground/5 p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">What to do</div>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">{result.advice.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Secure browser toggles
============================================================ */

function Browser({ s, setS }: { s: State; setS: (fn: (p: State) => State) => void }) {
  const items: { k: keyof State["browser"]; label: string; desc: string }[] = [
    { k: "trackers", label: "Block trackers", desc: "Stops cross-site profiling" },
    { k: "ads", label: "Block ads", desc: "Silences noisy networks" },
    { k: "cookies", label: "Auto-clean cookies", desc: "Wipes on close" },
    { k: "safeBrowse", label: "Safe browsing", desc: "Warns on known bad sites" },
  ];
  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Globe className="h-4 w-4" />} title="Secure browser" kicker="Trackers · ads · cookies" />
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={it.k} className="flex items-center justify-between rounded-2xl bg-background/40 p-3 animate-fade-up" style={{ animationDelay: `${i * 25}ms` }}>
              <div>
                <div className="text-sm font-medium">{it.label}</div>
                <div className="text-[11px] text-muted-foreground">{it.desc}</div>
              </div>
              <button onClick={() => setS(p => ({ ...p, browser: { ...p.browser, [it.k]: !p.browser[it.k] } }))}
                className={cn("h-6 w-11 rounded-full transition", s.browser[it.k] ? "bg-foreground" : "bg-foreground/20")}>
                <span className={cn("block h-5 w-5 translate-y-0.5 rounded-full bg-background transition", s.browser[it.k] ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="glass rounded-3xl p-4 animate-fade-up">
        <SectionTitle icon={<Lock className="h-4 w-4" />} title="Identity theft alerts" />
        <p className="text-xs text-muted-foreground">Real-time alerts when your monitored identifiers appear in leaks or on suspicious sites. Scans run whenever you open Samsta.</p>
      </div>
    </div>
  );
}

/* ============================================================
   Assistant
============================================================ */

function Assistant({ sc, s }: { sc: ReturnType<typeof overallScore>; s: State }) {
  const [msgs, setMsgs] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim(); if (!text || busy) return;
    setInput(""); setBusy(true);
    const context = `USER SECURITY: ${JSON.stringify(sc)}. Vault items: ${s.vault.length}. Recent threats: ${s.threats.slice(0,3).map(t=>t.summary).join(" · ") || "none"}.`;
    const next = [...msgs, { role: "user" as const, content: text }, { role: "assistant" as const, content: "" }];
    setMsgs(next);
    try {
      await streamSam("privacy_chat", [
        { role: "system", content: context },
        ...next.filter(m => m.content || m.role === "user").map(m => ({ role: m.role, content: m.content })),
      ], (acc) => setMsgs(m => { const copy = [...m]; copy[copy.length - 1] = { role: "assistant", content: acc }; return copy; }));
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const starters = ["Is this OTP link a scam?", "How do I lock down my Instagram?", "What is a passkey?", "Someone knows my address — help"];
  return (
    <div className="flex h-[70vh] flex-col gap-3">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-2">
        {msgs.length === 0 && (
          <div className="glass-strong rounded-3xl p-4 animate-fade-up">
            <div className="font-display text-lg italic">Ask your Security Assistant</div>
            <p className="mt-1 text-xs text-muted-foreground">Grounded in your live scores and recent events.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starters.map(s => <button key={s} onClick={() => setInput(s)} className="rounded-full glass px-3 py-1 text-xs">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-foreground text-background" : "glass")}>
              {m.content || (busy && i === msgs.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>
      <div className="glass-strong flex items-center gap-2 rounded-full p-1.5">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask anything about your security…" className="flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
        <button onClick={send} disabled={busy || !input.trim()} className="h-9 w-9 rounded-full bg-foreground text-background disabled:opacity-50">
          <Send className="mx-auto h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
