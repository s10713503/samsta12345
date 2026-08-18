// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, Lock, UserCheck, Users, BookOpen, Film, Image as ImageIcon, MessageSquare,
  Heart, Eye, Search, MapPin, Activity, Phone, CheckCheck, ShieldBan, UserMinus,
  Download, Trash2, ScrollText, ChevronDown, Info, RotateCcw, X, Loader2,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import {
  getMySettings, updateMySettings, getMyAccount, updateMyAccount, downloadMyData,
  deactivateAccount, scheduleDeletion,
} from "@/lib/api/settings";
import { listBlocked, unblockUser, getMutedIds, unmuteUser } from "@/lib/api/safety";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/settings/privacy")({
  component: PrivacySettingsPage,
  head: () => ({
    meta: [
      { title: "Privacy settings · Samsta" },
      { name: "description", content: "Control who sees your posts, reels, stories and profile, who can message or call you, blocked and restricted accounts, data downloads and account deletion." },
      { property: "og:title", content: "Privacy settings · Samsta" },
      { property: "og:description", content: "Fine-grained privacy controls for your Samsta account, saved instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/* --------------------------------- tokens --------------------------------- */

const GRAD = "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))";

const AUDIENCE = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers" },
  { value: "close_friends", label: "Close friends" },
  { value: "nobody", label: "No one" },
];

const COMMENT_AUDIENCE = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers" },
  { value: "following", label: "People you follow" },
  { value: "close_friends", label: "Close friends" },
  { value: "nobody", label: "No one" },
];

const REACH = [
  { value: "everyone", label: "Everyone" },
  { value: "followers", label: "Followers" },
  { value: "mutuals", label: "Mutual followers" },
  { value: "close_friends", label: "Close friends" },
  { value: "nobody", label: "No one" },
];

const DEFAULTS = {
  followers_approval: false,
  story_visibility: "followers",
  reels_visibility: "everyone",
  posts_visibility: "everyone",
  comments_control: "everyone",
  filter_offensive_comments: true,
  review_comments: false,
  blocked_words: [],
  hide_like_count: false,
  profile_visibility: "everyone",
  search_visibility: true,
  hide_from_explore: false,
  location_privacy: "while_using",
  online_status_enabled: true,
  last_seen_enabled: true,
  who_can_message: "everyone",
  who_can_call: "everyone",
  who_can_video_call: "everyone",
  allow_text_messages: true,
  allow_voice_calls: true,
  allow_video_calls: true,
  read_receipts_enabled: true,
};

/* ------------------------------- primitives ------------------------------- */

function Card({ icon: Icon, emoji, title, description, learnMore, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [more, setMore] = useState(false);
  return (
    <section className="glass mb-3 overflow-hidden rounded-3xl transition-shadow">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left active:scale-[0.995]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm" style={{ background: GRAD }}>
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{emoji} {title}</span>
          <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{description}</span>
        </span>
        <ChevronDown className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="overflow-hidden">
          <div className="animate-fade-in border-t border-border/50 px-4 py-3">
            {children}
            {learnMore && (
              <div className="mt-3 border-t border-border/40 pt-2">
                <button onClick={() => setMore((m) => !m)} className="flex items-center gap-1.5 text-[11px] font-medium text-primary active:scale-95">
                  <Info className="h-3.5 w-3.5" /> {more ? "Hide details" : "Learn more"}
                </button>
                {more && <p className="animate-fade-in mt-2 rounded-2xl bg-muted/40 p-3 text-[11px] leading-relaxed text-muted-foreground">{learnMore}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Toggle({ label, hint, value, onChange, confirm }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{label}</div>
        {hint && <div className="text-[11px] leading-snug text-muted-foreground">{hint}</div>}
      </div>
      <button
        role="switch"
        aria-checked={!!value}
        aria-label={label}
        onClick={() => (confirm ? confirm(!value) : onChange(!value))}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "" : "bg-muted"}`}
        style={value ? { background: GRAD } : undefined}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all duration-200 ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function Choice({ label, hint, value, options, onChange }) {
  return (
    <div className="py-2.5">
      {label && <div className="text-sm">{label}</div>}
      {hint && <div className="mb-1 text-[11px] text-muted-foreground">{hint}</div>}
      <div className="glass mt-1.5 flex flex-wrap gap-1 rounded-3xl p-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`min-w-[64px] flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium transition-all duration-200 active:scale-95 ${
              value === o.value ? "text-white shadow" : "text-muted-foreground"
            }`}
            style={value === o.value ? { background: GRAD } : undefined}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RowLink({ label, hint, to, onClick, danger }) {
  const cls = `flex w-full items-center gap-3 py-2.5 text-left ${danger ? "text-destructive" : ""}`;
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
    </>
  );
  return to ? <Link to={to} className={cls}>{inner}</Link> : <button onClick={onClick} className={cls}>{inner}</button>;
}

function Confirm({ state, onCancel }) {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 pb-24 backdrop-blur-sm" onClick={onCancel}>
      <div className="glass-strong animate-scale-in w-full max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold">{state.title}</h3>
        <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{state.body}</p>
        <div className="mt-4 flex gap-2">
          <button onClick={onCancel} className="glass flex-1 rounded-full py-2.5 text-sm font-medium active:scale-95">Cancel</button>
          <button
            onClick={() => { state.onConfirm(); onCancel(); }}
            className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white shadow active:scale-95"
            style={{ background: state.danger ? "oklch(0.6 0.2 25)" : GRAD }}
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

function PrivacySettingsPage() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmState, setConfirmState] = useState(null);
  const [word, setWord] = useState("");

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const settingsQ = useQuery({ queryKey: ["user-settings", user?.id], queryFn: () => getMySettings(user.id), enabled: !!user });
  const accountQ = useQuery({ queryKey: ["my-account", user?.id], queryFn: () => getMyAccount(user.id), enabled: !!user });
  const blockedQ = useQuery({ queryKey: ["blocked-users", user?.id], queryFn: () => listBlocked(user.id), enabled: !!user });
  const restrictedQ = useQuery({
    queryKey: ["restricted-users", user?.id],
    queryFn: async () => {
      const ids = await getMutedIds(user.id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids);
      return data ?? [];
    },
    enabled: !!user,
  });

  const s = { ...DEFAULTS, ...(settingsQ.data ?? {}) };
  const acct = accountQ.data ?? {};

  async function set(patch) {
    if (!user) return;
    qc.setQueryData(["user-settings", user.id], (prev) => ({ ...(prev ?? {}), ...patch }));
    try {
      await updateMySettings(user.id, patch);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      settingsQ.refetch();
    }
  }

  async function setAccount(patch) {
    if (!user) return;
    qc.setQueryData(["my-account", user.id], (prev) => ({ ...(prev ?? {}), ...patch }));
    try {
      await updateMyAccount(user.id, patch);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      accountQ.refetch();
    }
  }

  const ask = (o) => setConfirmState(o);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const words = Array.isArray(s.blocked_words) ? s.blocked_words : [];

  return (
    <div className="min-h-dvh pb-32">
      <header className="glass sticky top-0 z-30 flex items-center gap-3 px-4 py-3">
        <Link to="/settings" aria-label="Back to settings" className="glass flex h-9 w-9 items-center justify-center rounded-full active:scale-90">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold">Privacy</h1>
          <p className="text-[11px] text-muted-foreground">Every change saves instantly</p>
        </div>
        <button
          onClick={() => ask({
            title: "Reset privacy to default?",
            body: "All privacy options on this page return to Samsta's recommended settings. Blocked and restricted accounts are not affected.",
            confirmLabel: "Reset",
            onConfirm: async () => { await set(DEFAULTS); toast.success("Privacy reset to default"); },
          })}
          className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </header>

      <div className="px-4 pt-4">
        {/* Private account */}
        <Card
          icon={Lock} emoji="🔒" title="Private account" defaultOpen
          description="Only approved followers can view your profile, posts, reels, stories, followers and following lists."
          learnMore="When your account is private, anyone new must send a follow request before they can see anything you share. People who already follow you keep their access. Your username and profile photo stay visible in search so friends can still find you."
        >
          <Toggle
            label="Private account"
            hint="New users must send a follow request"
            value={!!acct.is_private}
            confirm={(v) => ask({
              title: v ? "Make your account private?" : "Make your account public?",
              body: v
                ? "Only approved followers will be able to see your profile, posts, reels and stories."
                : "Anyone on Samsta will be able to see your profile, posts, reels and stories.",
              onConfirm: () => { setAccount({ is_private: v }); toast.success(v ? "Account is private" : "Account is public"); },
            })}
          />
        </Card>

        {/* Followers approval */}
        <Card
          icon={UserCheck} emoji="✅" title="Followers approval"
          description="Every follow request must be manually approved before someone becomes your follower."
          learnMore="Requests wait in your connections inbox until you accept, decline or block them. Declining is silent — the other person is not notified."
        >
          <Toggle label="Review every follow request" value={!!s.followers_approval} onChange={(v) => set({ followers_approval: v })} />
          <RowLink label="Pending follow requests" hint="Accept, decline or block" to="/connections" />
        </Card>

        {/* Close friends */}
        <Card
          icon={Users} emoji="👥" title="Close friends"
          description="A private list of trusted people who can see your close-friends stories, reels, posts and live sessions."
          learnMore="Nobody is notified when you add or remove them, and the list is never shown publicly. Anything shared to close friends is marked with a green badge."
        >
          <RowLink label="Manage close friends" hint="Choose who sees your exclusive content" to="/connections" />
        </Card>

        {/* Story privacy */}
        <Card icon={BookOpen} emoji="📖" title="Story privacy"
          description="Choose who can view your stories. Your selection applies instantly to all future stories."
          learnMore="Existing stories keep the audience they were posted with. Close friends always see your stories unless you pick No one.">
          <Choice value={s.story_visibility} options={AUDIENCE} onChange={(v) => set({ story_visibility: v })} />
        </Card>

        {/* Reels privacy */}
        <Card icon={Film} emoji="🎬" title="Reels privacy"
          description="Control who can watch your reels."
          learnMore="Reels set to Everyone can appear in Explore and in recommendations. Anything narrower stays inside your follower graph.">
          <Choice value={s.reels_visibility} options={AUDIENCE} onChange={(v) => set({ reels_visibility: v })} />
        </Card>

        {/* Posts privacy */}
        <Card icon={ImageIcon} emoji="🖼" title="Posts privacy"
          description="Decide who can view your posts."
          learnMore="This is the default audience for new posts. You can still override the audience on any individual post while composing it.">
          <Choice value={s.posts_visibility} options={AUDIENCE} onChange={(v) => set({ posts_visibility: v })} />
        </Card>

        {/* Comments control */}
        <Card icon={MessageSquare} emoji="💬" title="Comments control"
          description="Choose who can comment on your posts and reels, and filter what gets through."
          learnMore="Filtered comments are hidden from everyone except their author. Blocked words apply to comments and to message requests.">
          <Choice value={s.comments_control} options={COMMENT_AUDIENCE} onChange={(v) => set({ comments_control: v })} />
          <Toggle label="Filter offensive comments" hint="Automatically hide abusive or spammy comments" value={!!s.filter_offensive_comments} onChange={(v) => set({ filter_offensive_comments: v })} />
          <Toggle label="Review comments before publishing" hint="Comments stay pending until you approve them" value={!!s.review_comments} onChange={(v) => set({ review_comments: v })} />
          <div className="py-2.5">
            <div className="text-sm">Block specific words</div>
            <div className="mb-2 text-[11px] text-muted-foreground">Comments containing these words are hidden automatically.</div>
            <div className="flex gap-2">
              <input
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const w = word.trim().toLowerCase(); if (w && !words.includes(w)) { set({ blocked_words: [...words, w] }); } setWord(""); } }}
                placeholder="Add a word and press Enter"
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button
                onClick={() => { const w = word.trim().toLowerCase(); if (w && !words.includes(w)) set({ blocked_words: [...words, w] }); setWord(""); }}
                className="rounded-xl px-3 text-xs font-semibold text-white active:scale-95"
                style={{ background: GRAD }}
              >
                Add
              </button>
            </div>
            {!!words.length && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {words.map((w) => (
                  <button key={w} onClick={() => set({ blocked_words: words.filter((x) => x !== w) })}
                    className="glass flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] active:scale-95">
                    {w} <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Likes visibility */}
        <Card icon={Heart} emoji="❤️" title="Likes visibility"
          description="Choose whether other users can see who liked your posts and reels."
          learnMore="You can always see your own like counts and the list of people who liked your content, even when it is hidden from others.">
          <Choice
            value={s.hide_like_count ? "hide" : "show"}
            options={[{ value: "show", label: "Show likes" }, { value: "hide", label: "Hide likes" }]}
            onChange={(v) => set({ hide_like_count: v === "hide" })}
          />
        </Card>

        {/* Profile visibility */}
        <Card icon={Eye} emoji="👁" title="Profile visibility"
          description="Control who can discover and visit your profile."
          learnMore="Private hides your bio, stats and grid from anyone who does not already follow you.">
          <Choice
            value={s.profile_visibility}
            options={[{ value: "everyone", label: "Public" }, { value: "followers", label: "Followers only" }, { value: "nobody", label: "Private" }]}
            onChange={(v) => ask({
              title: "Change profile visibility?",
              body: "This changes who can find and open your profile across Samsta.",
              onConfirm: () => set({ profile_visibility: v }),
            })}
          />
        </Card>

        {/* Search & discoverability */}
        <Card icon={Search} emoji="🔍" title="Search & discoverability"
          description="Choose whether your account appears in search results, recommendations, hashtags and Explore."
          learnMore="Hiding from search stops name and username lookups. Hiding from Explore keeps your public content out of recommendations and hashtag pages.">
          <Toggle label="Allow search" hint="Let people find you by name or username" value={!!s.search_visibility} onChange={(v) => set({ search_visibility: v })} />
          <Toggle label="Hide from Explore" hint="Keep your content out of recommendations and hashtags" value={!!s.hide_from_explore} onChange={(v) => set({ hide_from_explore: v })} />
        </Card>

        {/* Location privacy */}
        <Card icon={MapPin} emoji="📍" title="Location privacy"
          description="Control whether Samsta can access your location for nearby content, recommendations and events."
          learnMore="Location is only used while the feature you opened needs it, and precise coordinates are never attached to a post unless you add a place yourself.">
          <Choice
            value={s.location_privacy}
            options={[{ value: "always", label: "Always" }, { value: "while_using", label: "While using app" }, { value: "never", label: "Never" }]}
            onChange={(v) => set({ location_privacy: v })}
          />
        </Card>

        {/* Activity status */}
        <Card icon={Activity} emoji="📱" title="Activity status"
          description="Allow others to see when you're online or last active."
          learnMore="If you hide your activity status, you also stop seeing when other people were last active.">
          <Choice
            value={s.online_status_enabled ? "show" : "hide"}
            options={[{ value: "show", label: "Show activity status" }, { value: "hide", label: "Hide activity status" }]}
            onChange={(v) => set({ online_status_enabled: v === "show", last_seen_enabled: v === "show" })}
          />
        </Card>

        {/* Messaging & calls */}
        <Card icon={Phone} emoji="📹" title="Messaging & calls privacy"
          description="Choose who can send you messages, voice calls or video calls."
          learnMore="Anyone outside your chosen audience lands in message requests instead of your inbox. Calls from them are declined automatically.">
          <Choice label="Messages" value={s.who_can_message} options={REACH} onChange={(v) => set({ who_can_message: v })} />
          <Choice label="Voice calls" value={s.who_can_call} options={REACH} onChange={(v) => set({ who_can_call: v })} />
          <Choice label="Video calls" value={s.who_can_video_call} options={REACH} onChange={(v) => set({ who_can_video_call: v })} />
          <div className="mt-1 border-t border-border/40 pt-1">
            <Toggle label="Allow text messages" value={!!s.allow_text_messages} onChange={(v) => set({ allow_text_messages: v })} />
            <Toggle label="Allow voice calls" value={!!s.allow_voice_calls} onChange={(v) => set({ allow_voice_calls: v })} />
            <Toggle label="Allow video calls" value={!!s.allow_video_calls} onChange={(v) => set({ allow_video_calls: v })} />
          </div>
        </Card>

        {/* Read receipts */}
        <Card icon={CheckCheck} emoji="🔔" title="Read receipts"
          description="Control whether people can see when you've read their messages."
          learnMore="Turning read receipts off also hides other people's read receipts from you.">
          <Choice
            value={s.read_receipts_enabled ? "on" : "off"}
            options={[{ value: "on", label: "On" }, { value: "off", label: "Off" }]}
            onChange={(v) => set({ read_receipts_enabled: v === "on" })}
          />
        </Card>

        {/* Blocked accounts */}
        <Card icon={ShieldBan} emoji="🛡" title="Blocked accounts"
          description="View, search, unblock or permanently block users."
          learnMore="Blocked people cannot find your profile, message you or see your content, and any follow relationship between you is removed.">
          {(blockedQ.data?.length ?? 0) === 0 ? (
            <p className="rounded-2xl bg-muted/40 p-3 text-center text-[11px] text-muted-foreground">You haven't blocked anyone.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {blockedQ.data.map((b, i) => (
                <li key={b.blocked?.id ?? i} className="glass flex items-center gap-3 rounded-2xl p-2.5">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {b.blocked?.avatar_url && <img src={b.blocked.avatar_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{b.blocked?.username ?? "user"}</span>
                  <button
                    onClick={() => ask({
                      title: `Unblock @${b.blocked?.username ?? "user"}?`,
                      body: "They will be able to find your profile and message you again.",
                      onConfirm: async () => {
                        await unblockUser(user.id, b.blocked.id);
                        toast.success("Unblocked");
                        qc.invalidateQueries({ queryKey: ["blocked-users", user.id] });
                      },
                    })}
                    className="rounded-full border border-border px-3 py-1 text-[11px] active:scale-95"
                  >
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Restricted accounts */}
        <Card icon={UserMinus} emoji="🚫" title="Restricted accounts"
          description="Restrict users without blocking them — their comments need approval and they can't see your activity status."
          learnMore="Restricted people are never told. Their comments are only visible to them until you approve each one.">
          {(restrictedQ.data?.length ?? 0) === 0 ? (
            <p className="rounded-2xl bg-muted/40 p-3 text-center text-[11px] text-muted-foreground">You haven't restricted anyone.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {restrictedQ.data.map((p) => (
                <li key={p.id} className="glass flex items-center gap-3 rounded-2xl p-2.5">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.avatar_url && <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm">{p.username ?? p.full_name ?? "user"}</span>
                  <button
                    onClick={async () => {
                      await unmuteUser(user.id, p.id);
                      toast.success("Restriction removed");
                      qc.invalidateQueries({ queryKey: ["restricted-users", user.id] });
                    }}
                    className="rounded-full border border-border px-3 py-1 text-[11px] active:scale-95"
                  >
                    Unrestrict
                  </button>
                </li>
              ))}
            </ul>
          )}
          <RowLink label="Restrict someone new" hint="Pick from your connections" to="/connections" />
        </Card>

        {/* Download your data */}
        <Card icon={Download} emoji="📥" title="Download your data"
          description="Request a complete copy of your account data, including posts, reels, stories, chats, settings and account information."
          learnMore="The export is generated on your device and downloaded as a JSON file — nothing is emailed or shared with anyone else.">
          <RowLink
            label="Download my data"
            hint="Exports as a JSON file"
            onClick={async () => {
              toast.loading("Preparing your data…", { id: "dl" });
              try {
                const bundle = await downloadMyData(user.id);
                const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
                const a = document.createElement("a");
                a.href = url; a.download = "samsta-data.json"; a.click();
                URL.revokeObjectURL(url);
                toast.success("Download ready", { id: "dl" });
              } catch (e) {
                toast.error("Could not export your data", { id: "dl" });
              }
            }}
          />
        </Card>

        {/* Delete account */}
        <Card icon={Trash2} emoji="🗑" title="Delete account"
          description="Temporarily deactivate or permanently delete your Samsta account."
          learnMore="Deactivating hides your profile and content until you sign back in. Scheduled deletion can be cancelled any time within 30 days. Instant deletion is irreversible.">
          <RowLink
            label="Deactivate account"
            hint="Hide your profile until you return"
            onClick={() => ask({
              title: "Deactivate your account?",
              body: "Your profile and content are hidden until you sign in again.",
              confirmLabel: "Deactivate",
              onConfirm: async () => { await deactivateAccount(); accountQ.refetch(); toast.success("Account deactivated"); },
            })}
          />
          <RowLink
            label="Delete after 30 days"
            hint="Cancel any time before then"
            danger
            onClick={() => ask({
              title: "Schedule deletion in 30 days?",
              body: "Your account will be permanently deleted after 30 days. Sign in before then to cancel.",
              confirmLabel: "Schedule",
              danger: true,
              onConfirm: async () => { await scheduleDeletion(); accountQ.refetch(); toast.success("Deletion scheduled"); },
            })}
          />
          <RowLink label="Open delete account page" hint="Deactivate, schedule in 30 days, or delete instantly" danger to="/settings/delete-account" />
        </Card>

        {/* Privacy policy */}
        <Card icon={ScrollText} emoji="📜" title="Privacy policy"
          description="Read Samsta's complete Privacy Policy explaining how your data is collected, stored, processed, protected and shared.">
          <RowLink label="Open privacy policy" to="/privacy" />
        </Card>
      </div>

      <Confirm state={confirmState} onCancel={() => setConfirmState(null)} />
    </div>
  );
}
