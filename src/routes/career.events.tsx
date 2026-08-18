import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { CareerShell, GlassCard, VerifiedBadge, StatusPill } from "@/components/samsta/CareerShell";
import { useAuthUser } from "@/hooks/use-auth";
import { streamSam } from "@/lib/stream-sam";
import {
  listEvents, getEvent, upsertEvent, logEventView,
  listSessions, upsertSession,
  listSpeakers, upsertSpeaker,
  register, myRegistration, myRegistrations, cancelRegistration, checkIn, listAttendees,
  joinWaitlist,
  saveEvent, unsaveEvent, listSaved,
  listReviews, postReview,
  listDiscussions, postDiscussion,
  listQna, askQuestion, upvoteQuestion,
  listPolls, createPoll, votePoll,
  myCertificates, issueCertificate,
  myConnections, sendConnection, respondConnection,
  listNotes, saveNote,
  eventAnalytics,
  EVENT_CATEGORIES, CATEGORY_LABELS,
  type EventRow, type EventSession, type EventSpeaker, type EventQna, type EventPoll,
  type EventRegistration, type EventReview, type EventDiscussion,
} from "@/lib/api/events";
import {
  Calendar, Search, MapPin, Globe, Sparkles, Users, Ticket, QrCode, Star, MessageCircle,
  Shield, Video, Mic, BarChart3, Plus, Loader2, Bot, Wand2, ChevronRight, Bookmark, BookmarkCheck,
  Award, Clock, TrendingUp, Zap, Filter, X, Send, ThumbsUp, PieChart, Building2, CalendarClock,
} from "lucide-react";

export const Route = createFileRoute("/career/events")({
  head: () => ({
    meta: [
      { title: "Events · Samsta" },
      { name: "description", content: "Discover verified events, register with QR tickets, network with attendees, and use to plan your agenda, take notes, and get certificates." },
    ],
  }),
  component: EventsHub,
});

type Tab = "discover" | "nearby" | "online" | "trending" | "featured" | "calendar" | "saved" | "tickets" | "certificates" | "live" | "network" | "ai" | "manage";

const TABS: { k: Tab; l: string; I: typeof Calendar }[] = [
  { k: "discover", l: "Discover", I: Search },
  { k: "nearby", l: "Nearby", I: MapPin },
  { k: "online", l: "Online", I: Globe },
  { k: "trending", l: "Trending", I: TrendingUp },
  { k: "featured", l: "Featured", I: Sparkles },
  { k: "calendar", l: "Calendar", I: CalendarClock },
  { k: "saved", l: "Saved", I: Bookmark },
  { k: "tickets", l: "Tickets", I: Ticket },
  { k: "certificates", l: "Certificates", I: Award },
  { k: "live", l: "Live", I: Video },
  { k: "network", l: "Network", I: Users },
  { k: "ai", l: "Tools", I: Bot },
  { k: "manage", l: "Manage", I: Shield },
];

function EventsHub() {
  const { user } = useAuthUser();
  const [tab, setTab] = useState<Tab>("discover");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selected, setSelected] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const opts: Parameters<typeof listEvents>[0] = { q: q || undefined, category: category || undefined };
      if (tab === "online") opts.kind = "online";
      if (tab === "featured") opts.featured = true;
      if (tab === "trending" || tab === "nearby" || tab === "discover" || tab === "calendar") opts.upcoming = true;
      setEvents(await listEvents(opts));
    } catch (e) {
      toast.error("Couldn't load events");
    } finally {
      setLoading(false);
    }
  }, [q, category, tab]);

  useEffect(() => { void refresh(); }, [refresh]);

  return (
    <CareerShell title="Events" subtitle="Verified events, QR tickets, live networking & copilot.">
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
        <Search className="h-4 w-4 text-white/50" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search events, topics, cities…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/40" />
      </div>

      <div className="mb-3 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
              tab === t.k ? "bg-gradient-to-r from-[#e8c874] to-[#c9a34a] text-[#05070f]" : "border border-white/10 bg-white/5 text-white/70"
            }`}>
            <t.I className="h-3.5 w-3.5" /> {t.l}
          </button>
        ))}
      </div>

      {(tab === "discover" || tab === "nearby" || tab === "online" || tab === "trending" || tab === "featured" || tab === "calendar") && (
        <CategoryChips value={category} onChange={setCategory} />
      )}

      <div className="mt-2">
        {loading && <div className="flex items-center justify-center py-10 text-white/50"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>}
        {!loading && (tab === "discover" || tab === "nearby" || tab === "online" || tab === "trending" || tab === "featured") && (
          <EventList events={events} onOpen={(e) => setSelected(e)} />
        )}
        {!loading && tab === "calendar" && <CalendarView events={events} onOpen={setSelected} />}
        {tab === "saved" && user && <SavedView userId={user.id} onOpen={setSelected} />}
        {tab === "tickets" && user && <TicketsView userId={user.id} onOpen={setSelected} />}
        {tab === "certificates" && user && <CertificatesView userId={user.id} />}
        {tab === "live" && <LiveHub events={events} onOpen={setSelected} />}
        {tab === "network" && user && <NetworkView userId={user.id} />}
        {tab === "ai" && <AiTools />}
        {tab === "manage" && user && <ManageView userId={user.id} />}
      </div>

      <AnimatePresence>
        {selected && (
          <EventSheet event={selected} onClose={() => { setSelected(null); void refresh(); }} userId={user?.id ?? null} />
        )}
      </AnimatePresence>
    </CareerShell>
  );
}

/* ---------------- Category chips ---------------- */

function CategoryChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-3 -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide">
      <button onClick={() => onChange("")}
        className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium transition ${value === "" ? "bg-white text-[#05070f]" : "border border-white/10 bg-white/5 text-white/70"}`}>
        All
      </button>
      {EVENT_CATEGORIES.map((c) => (
        <button key={c} onClick={() => onChange(c === value ? "" : c)}
          className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-medium transition ${value === c ? "bg-white text-[#05070f]" : "border border-white/10 bg-white/5 text-white/70"}`}>
          {CATEGORY_LABELS[c]}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Event list ---------------- */

function EventList({ events, onOpen }: { events: EventRow[]; onOpen: (e: EventRow) => void }) {
  if (!events.length) return (
    <GlassCard className="p-8 text-center">
      <Calendar className="mx-auto mb-2 h-6 w-6 text-white/40" />
      <div className="text-sm text-white/60">No events yet — check back soon or create one under Manage.</div>
    </GlassCard>
  );
  return (
    <div className="grid gap-3">
      {events.map((e) => (
        <EventCard key={e.id} event={e} onOpen={() => onOpen(e)} />
      ))}
    </div>
  );
}

function EventCard({ event, onOpen }: { event: EventRow; onOpen: () => void }) {
  const when = event.starts_at ? new Date(event.starts_at) : null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
      <GlassCard onClick={onOpen} className="overflow-hidden">
        {event.cover_url && (
          <div className="h-32 w-full bg-cover bg-center" style={{ backgroundImage: `url(${event.cover_url})` }} />
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="font-display text-base italic">{event.title}</h3>
                <VerifiedBadge verified={event.is_verified} />
                {event.is_featured && <span className="rounded-full bg-[#e8c874]/20 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#e8c874]">Featured</span>}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
                {when && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>}
                <span className="flex items-center gap-1">{event.kind === "online" ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />} {event.kind === "online" ? "Online" : (event.city ?? event.venue ?? "TBA")}</span>
                <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{CATEGORY_LABELS[event.category] ?? event.category}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-white/50">{event.is_free ? "Free" : `${event.currency ?? "INR"} ${event.price ?? 0}`}</div>
              <div className="mt-1 text-[10px] text-white/50">{event.registrations_count} going</div>
            </div>
          </div>
          {event.description && <p className="mt-2 line-clamp-2 text-[12px] text-white/70">{event.description}</p>}
        </div>
      </GlassCard>
    </motion.div>
  );
}

/* ---------------- Calendar view (list grouped by day) ---------------- */

function CalendarView({ events, onOpen }: { events: EventRow[]; onOpen: (e: EventRow) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      const d = e.starts_at ? new Date(e.starts_at).toDateString() : "TBA";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);
  if (!events.length) return <EventList events={events} onOpen={onOpen} />;
  return (
    <div className="space-y-4">
      {groups.map(([day, list]) => (
        <div key={day}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#e8c874]">{day}</div>
          <div className="grid gap-2">
            {list.map((e) => <EventCard key={e.id} event={e} onOpen={() => onOpen(e)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Saved ---------------- */

function SavedView({ userId, onOpen }: { userId: string; onOpen: (e: EventRow) => void }) {
  const [rows, setRows] = useState<EventRow[]>([]);
  useEffect(() => { void (async () => setRows(await listSaved(userId)))(); }, [userId]);
  return <EventList events={rows} onOpen={onOpen} />;
}

/* ---------------- Tickets ---------------- */

function TicketsView({ userId, onOpen }: { userId: string; onOpen: (e: EventRow) => void }) {
  const [rows, setRows] = useState<Array<EventRegistration & { events: EventRow }>>([]);
  useEffect(() => { void (async () => setRows(await myRegistrations(userId)))(); }, [userId]);
  if (!rows.length) return <GlassCard className="p-8 text-center"><Ticket className="mx-auto mb-2 h-6 w-6 text-white/40" /><div className="text-sm text-white/60">No tickets yet — register for an event.</div></GlassCard>;
  return (
    <div className="grid gap-3">
      {rows.map((r) => (
        <GlassCard key={r.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-display italic">{r.events?.title ?? "Event"}</div>
              <div className="mt-1 text-[11px] text-white/60">{r.ticket_type} · <StatusPill status={r.status} /></div>
              {r.events?.starts_at && <div className="mt-1 text-[11px] text-white/50">{new Date(r.events.starts_at).toLocaleString()}</div>}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-center">
              <QrCode className="mx-auto h-10 w-10 text-white/80" />
              <div className="mt-1 font-mono text-[9px] tracking-tight text-white/60">{r.qr_code.slice(0, 10)}</div>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => onOpen(r.events)} className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px]">Open event</button>
            {r.status === "confirmed" && (
              <button onClick={async () => { await cancelRegistration(r.id); toast.success("Cancelled"); setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, status: "cancelled" } : x)); }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px]">Cancel</button>
            )}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------------- Certificates ---------------- */

function CertificatesView({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof myCertificates>>>([]);
  useEffect(() => { void (async () => setRows(await myCertificates(userId)))(); }, [userId]);
  if (!rows.length) return <GlassCard className="p-8 text-center"><Award className="mx-auto mb-2 h-6 w-6 text-white/40" /><div className="text-sm text-white/60">No certificates yet — attend an event to earn one.</div></GlassCard>;
  return (
    <div className="grid gap-3">
      {rows.map((c) => (
        <GlassCard key={c.id} className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e8c874] to-[#c9a34a] text-[#05070f]"><Award className="h-6 w-6" /></div>
            <div className="flex-1">
              <div className="font-display italic">{c.events?.title ?? "Certificate"}</div>
              <div className="text-[11px] text-white/60">Serial · <span className="font-mono">{c.serial}</span></div>
              <div className="text-[10px] text-white/40">Issued {new Date(c.issued_at).toLocaleDateString()}</div>
            </div>
            {c.certificate_url && <a href={c.certificate_url} target="_blank" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px]">View</a>}
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------------- Live hub ---------------- */

function LiveHub({ events, onOpen }: { events: EventRow[]; onOpen: (e: EventRow) => void }) {
  const now = Date.now();
  const live = events.filter((e) => e.starts_at && e.ends_at && new Date(e.starts_at).getTime() <= now && new Date(e.ends_at).getTime() >= now);
  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#e8c874]"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> Live now</div>
        {live.length === 0 ? <div className="text-sm text-white/60">Nothing live right now — check back at event time.</div> : (
          <div className="mt-2 grid gap-2">{live.map((e) => <EventCard key={e.id} event={e} onOpen={() => onOpen(e)} />)}</div>
        )}
      </GlassCard>
    </div>
  );
}

/* ---------------- Networking ---------------- */

function NetworkView({ userId }: { userId: string }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof myConnections>>>([]);
  useEffect(() => { void (async () => setRows(await myConnections(userId)))(); }, [userId]);
  if (!rows.length) return <GlassCard className="p-8 text-center"><Users className="mx-auto mb-2 h-6 w-6 text-white/40" /><div className="text-sm text-white/60">Exchange business cards with attendees at events — your connections appear here.</div></GlassCard>;
  return (
    <div className="grid gap-2">
      {rows.map((c) => (
        <GlassCard key={c.id} className="p-3">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <div>
              <div className="text-white/80">{c.from_user_id === userId ? "You →" : "→ You"} <span className="font-mono text-[10px] text-white/50">{c.from_user_id === userId ? c.to_user_id.slice(0, 8) : c.from_user_id.slice(0, 8)}</span></div>
              {c.note && <div className="mt-1 text-[11px] text-white/60">{c.note}</div>}
            </div>
            <StatusPill status={c.status} />
          </div>
          {c.status === "pending" && c.to_user_id === userId && (
            <div className="mt-2 flex gap-2">
              <button onClick={async () => { await respondConnection(c.id, "accepted"); setRows(await myConnections(userId)); }} className="flex-1 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[11px] text-emerald-300">Accept</button>
              <button onClick={async () => { await respondConnection(c.id, "declined"); setRows(await myConnections(userId)); }} className="flex-1 rounded-full bg-white/5 px-3 py-1.5 text-[11px] text-white/60">Decline</button>
            </div>
          )}
        </GlassCard>
      ))}
    </div>
  );
}

/* ---------------- AI tools ---------------- */

const AI_TOOLS: Array<{ tool: string; icon: typeof Sparkles; label: string; hint: string; placeholder: string }> = [
  { tool: "ev_reco", icon: Sparkles, label: "Event Recommender", hint: "Personalized picks based on your interests.", placeholder: "I'm a product designer in Mumbai interested in, design systems, weekends free." },
  { tool: "ev_networking", icon: Users, label: "Networking Match", hint: "Who to meet at an event.", placeholder: `{"me":{"role":"PM","interests":["","fintech"]},"attendees":[…]}` },
  { tool: "ev_agenda", icon: CalendarClock, label: "Personalized Agenda", hint: "Rank sessions for your goals.", placeholder: `{"event":"…","sessions":[…],"my_interests":[…]}` },
  { tool: "ev_session_reco", icon: Mic, label: "Session Recommender", hint: "Top sessions to attend.", placeholder: `{"sessions":[…],"interests":[…]}` },
  { tool: "ev_notes", icon: Bot, label: "Note Generator", hint: "Turn a talk into notes.", placeholder: "Paste the transcript or topic…" },
  { tool: "ev_translate", icon: Globe, label: "Live Translation", hint: "Translate the talk in real time.", placeholder: "→ French: hello everyone welcome to the keynote" },
  { tool: "ev_summary", icon: PieChart, label: "Event Summary", hint: "Post-event recap.", placeholder: `{"event":"…","sessions":[…]}` },
  { tool: "ev_qa", icon: MessageCircle, label: "Q&A Assistant", hint: "Ask anything about the event.", placeholder: `{"event":"…","question":"where's the after-party?"}` },
  { tool: "ev_insights", icon: BarChart3, label: "Performance Insights", hint: "Organizer analytics summary.", placeholder: `{"views":1200,"registrations":300,"checked_in":210,"reviews":45}` },
  { tool: "ev_promo", icon: Wand2, label: "Promo Writer", hint: "Headline, social, email, hashtags.", placeholder: `{"title":" Builders Summit","category":"ai_ml","kind":"offline","when":"Sat","city":"Bengaluru","tone":"bold"}` },
  { tool: "ev_certificate", icon: Award, label: "Certificate Text", hint: "Certificate body copy.", placeholder: `{"attendee_name":"…","event_title":"…","event_date":"…","organizer":"…"}` },
  { tool: "ev_assistant", icon: Bot, label: "Event Assistant 24/7", hint: "Ask anything about events.", placeholder: "What's a great startup event in Bengaluru next month?" },
];

function AiTools() {
  const [active, setActive] = useState<typeof AI_TOOLS[number] | null>(null);
  return (
    <div className="grid grid-cols-2 gap-2">
      {AI_TOOLS.map((t) => (
        <button key={t.tool} onClick={() => setActive(t)}
          className="rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition active:scale-[0.98] hover:border-white/20">
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#e8c874] to-[#c9a34a] text-[#05070f]"><t.icon className="h-4 w-4" /></div>
          <div className="text-[12px] font-semibold">{t.label}</div>
          <div className="text-[10px] text-white/50">{t.hint}</div>
        </button>
      ))}
      {active && <AiSheet tool={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function AiSheet({ tool, onClose }: { tool: typeof AI_TOOLS[number]; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!input.trim() || busy) return;
    setBusy(true); setOut("");
    try { await streamSam(tool.tool, [{ role: "user", content: input }], setOut); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur" onClick={onClose}>
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border border-white/10 bg-[#0a0e1a] p-4">
        <div className="mb-2 flex items-center gap-2">
          <tool.icon className="h-4 w-4 text-[#e8c874]" />
          <div className="font-display italic">{tool.label}</div>
          <button onClick={onClose} className="ml-auto rounded-full bg-white/5 p-1"><X className="h-4 w-4" /></button>
        </div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={3} placeholder={tool.placeholder}
          className="mb-2 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-[12px] outline-none placeholder:text-white/30" />
        <button onClick={run} disabled={busy || !input.trim()}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-4 py-2 text-[12px] font-semibold text-[#05070f] disabled:opacity-50">
          {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…</> : <><Send className="h-3.5 w-3.5" /> Run</>}
        </button>
        {out && <div className="max-h-[46vh] overflow-auto whitespace-pre-wrap rounded-xl border border-white/5 bg-white/5 p-3 text-[12px] text-white/85">{out}</div>}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Manage (organizer dashboard) ---------------- */

function ManageView({ userId }: { userId: string }) {
  const [mine, setMine] = useState<EventRow[]>([]);
  const [creating, setCreating] = useState(false);
  const load = useCallback(async () => setMine(await listEvents({ limit: 50 }).then((rows) => rows.filter((r) => r.organizer_id === userId))), [userId]);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="space-y-3">
      <button onClick={() => setCreating(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-4 py-2.5 text-[12px] font-semibold text-[#05070f]">
        <Plus className="h-4 w-4" /> Create event
      </button>
      {creating && <CreateEventForm userId={userId} onDone={() => { setCreating(false); void load(); }} onCancel={() => setCreating(false)} />}
      {mine.length === 0 && !creating && <GlassCard className="p-6 text-center text-sm text-white/60">You haven't created any events yet.</GlassCard>}
      {mine.map((e) => <ManageEventRow key={e.id} event={e} />)}
    </div>
  );
}

function CreateEventForm({ userId, onDone, onCancel }: { userId: string; onDone: () => void; onCancel: () => void }) {
  const [f, setF] = useState({ title: "", description: "", kind: "offline", category: "conference", city: "", venue: "", starts_at: "", ends_at: "", is_free: true, price: 0, currency: "INR" });
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!f.title.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      await upsertEvent({
        organizer_id: userId, title: f.title, description: f.description, kind: f.kind, category: f.category,
        city: f.city || null, venue: f.venue || null,
        starts_at: f.starts_at || null, ends_at: f.ends_at || null,
        is_free: f.is_free, price: f.is_free ? 0 : Number(f.price), currency: f.currency,
        status: "published",
      });
      toast.success("Event created");
      onDone();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }
  const inp = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[12px] outline-none placeholder:text-white/30";
  return (
    <GlassCard className="space-y-2 p-4">
      <input className={inp} placeholder="Event title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <textarea className={inp} rows={2} placeholder="Description" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <select className={inp} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          <option value="offline">Offline</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
        </select>
        <select className={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <input className={inp} placeholder="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
        <input className={inp} placeholder="Venue / URL" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} />
        <input type="datetime-local" className={inp} value={f.starts_at} onChange={(e) => setF({ ...f, starts_at: e.target.value })} />
        <input type="datetime-local" className={inp} value={f.ends_at} onChange={(e) => setF({ ...f, ends_at: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-[11px] text-white/70">
        <input type="checkbox" checked={f.is_free} onChange={(e) => setF({ ...f, is_free: e.target.checked })} /> Free event
      </label>
      {!f.is_free && (
        <div className="grid grid-cols-2 gap-2">
          <input type="number" className={inp} placeholder="Price" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
          <input className={inp} placeholder="Currency" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })} />
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={submit} disabled={busy} className="flex-1 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-4 py-2 text-[12px] font-semibold text-[#05070f] disabled:opacity-50">{busy ? "Saving…" : "Publish"}</button>
        <button onClick={onCancel} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px]">Cancel</button>
      </div>
    </GlassCard>
  );
}

function ManageEventRow({ event }: { event: EventRow }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof eventAnalytics>> | null>(null);
  useEffect(() => { void (async () => setStats(await eventAnalytics(event.id)))(); }, [event.id]);
  return (
    <GlassCard className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-display italic">{event.title}</div>
        <StatusPill status={event.status} />
      </div>
      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
          <div><div className="text-white/50">Views</div><div className="font-semibold">{stats.views}</div></div>
          <div><div className="text-white/50">Regs</div><div className="font-semibold">{stats.registrations}</div></div>
          <div><div className="text-white/50">In</div><div className="font-semibold">{stats.checked_in}</div></div>
          <div><div className="text-white/50">Reviews</div><div className="font-semibold">{stats.reviews}</div></div>
        </div>
      )}
    </GlassCard>
  );
}

/* ---------------- Event detail sheet ---------------- */

function EventSheet({ event, onClose, userId }: { event: EventRow; onClose: () => void; userId: string | null }) {
  const [tab, setTab] = useState<"about" | "agenda" | "speakers" | "qna" | "polls" | "reviews" | "community" | "attendees">("about");
  const [reg, setReg] = useState<EventRegistration | null>(null);
  const [saved, setSaved] = useState(false);
  const [sessions, setSessions] = useState<EventSession[]>([]);
  const [speakers, setSpeakers] = useState<EventSpeaker[]>([]);
  const [qna, setQna] = useState<EventQna[]>([]);
  const [polls, setPolls] = useState<EventPoll[]>([]);
  const [reviews, setReviews] = useState<EventReview[]>([]);
  const [discussions, setDiscussions] = useState<EventDiscussion[]>([]);
  const [attendees, setAttendees] = useState<EventRegistration[]>([]);

  useEffect(() => {
    void logEventView(event.id, userId ?? null);
    void (async () => {
      const [ss, sp, qn, pl, rv, ds, at] = await Promise.all([
        listSessions(event.id), listSpeakers(event.id), listQna(event.id), listPolls(event.id), listReviews(event.id), listDiscussions(event.id), listAttendees(event.id),
      ]);
      setSessions(ss); setSpeakers(sp); setQna(qn); setPolls(pl); setReviews(rv); setDiscussions(ds); setAttendees(at);
      if (userId) setReg(await myRegistration(event.id, userId));
    })();
  }, [event.id, userId]);

  async function toggleRegister() {
    if (!userId) return toast.error("Sign in to register");
    if (reg && reg.status === "confirmed") return;
    try {
      const r = await register({ event_id: event.id, user_id: userId, ticket_type: "general", price_paid: event.is_free ? 0 : (event.price ?? 0), currency: event.currency ?? "INR" });
      setReg(r);
      toast.success("Registered — QR ticket added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function toggleSave() {
    if (!userId) return toast.error("Sign in to save");
    if (saved) { await unsaveEvent({ event_id: event.id, user_id: userId }); setSaved(false); }
    else { await saveEvent({ event_id: event.id, user_id: userId }); setSaved(true); toast.success("Saved"); }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur" onClick={onClose}>
      <motion.div initial={{ y: 40 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-hidden rounded-t-3xl border border-white/10 bg-[#0a0e1a]">
        {event.cover_url && <div className="h-36 bg-cover bg-center" style={{ backgroundImage: `url(${event.cover_url})` }} />}
        <div className="p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl italic">{event.title}</h2>
                <VerifiedBadge verified={event.is_verified} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
                {event.starts_at && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(event.starts_at).toLocaleString()}</span>}
                <span className="flex items-center gap-1">{event.kind === "online" ? <Globe className="h-3 w-3" /> : <MapPin className="h-3 w-3" />} {event.kind === "online" ? "Online" : `${event.venue ?? ""} ${event.city ?? ""}`}</span>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full bg-white/5 p-1.5"><X className="h-4 w-4" /></button>
          </div>
          <div className="mb-3 flex gap-2">
            <button onClick={toggleRegister} disabled={reg?.status === "confirmed"}
              className="flex-1 rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-4 py-2 text-[12px] font-semibold text-[#05070f] disabled:opacity-60">
              {reg?.status === "confirmed" ? "Registered ✓" : event.is_free ? "One-tap register" : `Register · ${event.currency} ${event.price}`}
            </button>
            <button onClick={toggleSave} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[12px]">
              {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </button>
          </div>
          <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide">
            {(["about","agenda","speakers","qna","polls","reviews","community","attendees"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)}
                className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${tab === k ? "bg-white text-[#05070f]" : "border border-white/10 bg-white/5 text-white/60"}`}>
                {k}
              </button>
            ))}
          </div>
          <div className="max-h-[48vh] overflow-auto pr-1">
            {tab === "about" && (
              <div className="space-y-2 text-[12px] text-white/80">
                {event.description && <p className="whitespace-pre-wrap">{event.description}</p>}
                {event.tags?.length > 0 && <div className="flex flex-wrap gap-1">{event.tags.map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">#{t}</span>)}</div>}
                {event.stream_url && <a href={event.stream_url} target="_blank" className="inline-flex items-center gap-1 text-[12px] text-[#e8c874]"><Video className="h-3 w-3" /> Watch stream</a>}
              </div>
            )}
            {tab === "agenda" && (
              sessions.length === 0 ? <EmptyRow icon={CalendarClock} text="Agenda TBA" /> :
              <div className="space-y-2">{sessions.map((s) => (
                <GlassCard key={s.id} className="p-3">
                  <div className="text-[12px] font-semibold">{s.title}</div>
                  {s.starts_at && <div className="text-[10px] text-white/50">{new Date(s.starts_at).toLocaleString()} {s.room && `· ${s.room}`}</div>}
                  {s.description && <div className="mt-1 text-[11px] text-white/70">{s.description}</div>}
                </GlassCard>
              ))}</div>
            )}
            {tab === "speakers" && (
              speakers.length === 0 ? <EmptyRow icon={Mic} text="Speakers TBA" /> :
              <div className="grid gap-2">{speakers.map((s) => (
                <GlassCard key={s.id} className="flex items-center gap-3 p-3">
                  <div className="h-10 w-10 rounded-full bg-white/10" style={s.avatar_url ? { backgroundImage: `url(${s.avatar_url})`, backgroundSize: "cover" } : undefined} />
                  <div>
                    <div className="text-[12px] font-semibold">{s.name}</div>
                    <div className="text-[10px] text-white/60">{s.title}</div>
                  </div>
                </GlassCard>
              ))}</div>
            )}
            {tab === "qna" && userId && (
              <QnaPanel eventId={event.id} userId={userId} qna={qna} onRefresh={async () => setQna(await listQna(event.id))} />
            )}
            {tab === "polls" && (
              polls.length === 0 ? <EmptyRow icon={PieChart} text="No polls yet" /> :
              <div className="space-y-2">{polls.map((p) => (
                <GlassCard key={p.id} className="p-3">
                  <div className="text-[12px] font-semibold">{p.question}</div>
                  <div className="mt-2 space-y-1">
                    {p.options.map((o) => (
                      <button key={o.id} disabled={!userId || !p.is_open}
                        onClick={async () => { await votePoll({ poll_id: p.id, user_id: userId!, option_id: o.id }); toast.success("Vote recorded"); setPolls(await listPolls(event.id)); }}
                        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px]">
                        <span>{o.label}</span><span className="text-white/50">{o.votes}</span>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              ))}</div>
            )}
            {tab === "reviews" && userId && (
              <ReviewsPanel eventId={event.id} userId={userId} reviews={reviews} onRefresh={async () => setReviews(await listReviews(event.id))} />
            )}
            {tab === "community" && userId && (
              <DiscussionsPanel eventId={event.id} userId={userId} rows={discussions} onRefresh={async () => setDiscussions(await listDiscussions(event.id))} />
            )}
            {tab === "attendees" && (
              attendees.length === 0 ? <EmptyRow icon={Users} text="No attendees yet" /> :
              <div className="grid gap-1 text-[11px]">
                {attendees.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-1.5">
                    <span className="font-mono text-white/60">{a.user_id.slice(0, 8)}</span>
                    <span className="text-white/40">{a.checked_in_at ? "Checked in" : "Registered"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function EmptyRow({ icon: I, text }: { icon: typeof Users; text: string }) {
  return <div className="flex flex-col items-center gap-1 py-8 text-white/40"><I className="h-6 w-6" /><div className="text-[11px]">{text}</div></div>;
}

function QnaPanel({ eventId, userId, qna, onRefresh }: { eventId: string; userId: string; qna: EventQna[]; onRefresh: () => Promise<void> }) {
  const [q, setQ] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask a question…"
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] outline-none placeholder:text-white/30" />
        <button onClick={async () => { if (!q.trim()) return; await askQuestion({ event_id: eventId, asker_id: userId, question: q }); setQ(""); toast.success("Asked"); await onRefresh(); }}
          className="rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-3 text-[11px] font-semibold text-[#05070f]">Ask</button>
      </div>
      {qna.length === 0 ? <EmptyRow icon={MessageCircle} text="No questions yet" /> : qna.map((x) => (
        <GlassCard key={x.id} className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 text-[12px]">{x.question}</div>
            <button onClick={async () => { await upvoteQuestion(x.id, x.upvotes); await onRefresh(); }}
              className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[10px]"><ThumbsUp className="h-3 w-3" /> {x.upvotes}</button>
          </div>
          {x.answer && <div className="mt-2 rounded-lg bg-white/5 p-2 text-[11px] text-white/70">{x.answer}</div>}
        </GlassCard>
      ))}
    </div>
  );
}

function ReviewsPanel({ eventId, userId, reviews, onRefresh }: { eventId: string; userId: string; reviews: EventReview[]; onRefresh: () => Promise<void> }) {
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  return (
    <div className="space-y-2">
      <GlassCard className="p-3">
        <div className="mb-1 flex gap-1">
          {[1,2,3,4,5].map((n) => (
            <button key={n} onClick={() => setRating(n)}><Star className={`h-4 w-4 ${n <= rating ? "fill-[#e8c874] text-[#e8c874]" : "text-white/30"}`} /></button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Share your experience…"
          className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-[12px] outline-none placeholder:text-white/30" />
        <button onClick={async () => { if (!body.trim()) return; await postReview({ event_id: eventId, reviewer_id: userId, rating, body }); toast.success("Posted"); setBody(""); await onRefresh(); }}
          className="mt-2 w-full rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-4 py-1.5 text-[11px] font-semibold text-[#05070f]">Post review</button>
      </GlassCard>
      {reviews.map((r) => (
        <GlassCard key={r.id} className="p-3">
          <div className="mb-1 flex items-center gap-1">
            {[1,2,3,4,5].map((n) => <Star key={n} className={`h-3 w-3 ${(r.rating ?? 0) >= n ? "fill-[#e8c874] text-[#e8c874]" : "text-white/20"}`} />)}
          </div>
          {r.body && <div className="text-[12px] text-white/80">{r.body}</div>}
        </GlassCard>
      ))}
    </div>
  );
}

function DiscussionsPanel({ eventId, userId, rows, onRefresh }: { eventId: string; userId: string; rows: EventDiscussion[]; onRefresh: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Start a thread…"
          className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] outline-none placeholder:text-white/30" />
        <button onClick={async () => { if (!title.trim()) return; await postDiscussion({ event_id: eventId, author_id: userId, title }); setTitle(""); await onRefresh(); }}
          className="rounded-full bg-gradient-to-r from-[#e8c874] to-[#c9a34a] px-3 text-[11px] font-semibold text-[#05070f]">Post</button>
      </div>
      {rows.map((d) => (
        <GlassCard key={d.id} className="p-3">
          <div className="text-[12px] font-semibold">{d.title}</div>
          {d.body && <div className="mt-1 text-[11px] text-white/70">{d.body}</div>}
        </GlassCard>
      ))}
    </div>
  );
}