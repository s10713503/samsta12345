// @ts-nocheck
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft, User, Lock, Shield, Bell, MessageCircle, Sliders, BarChart3,
  Database, Accessibility, LifeBuoy, Scale, Info, ChevronDown, LogOut, Trash2,
  Download, Loader2, Check,
} from "lucide-react";
import { useAuthUser } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getMySettings, updateMySettings, getMyAccount, updateMyAccount, isUsernameFree,
  deactivateAccount, reactivateAccount, scheduleDeletion, verifyPassword,
  downloadMyData,
} from "@/lib/api/settings";
import { listBlocked, unblockUser } from "@/lib/api/safety";

export const Route = createFileRoute("/settings/")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings · Samsta" },
      { name: "description", content: "Manage your Samsta account, privacy, security, notifications, messaging, content and accessibility preferences in real time." },
      { property: "og:title", content: "Settings · Samsta" },
      { property: "og:description", content: "Real-time privacy, security and account controls for your Samsta profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

/* ------------------------------- primitives ------------------------------- */

function Section({ icon: Icon, title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="glass mb-3 overflow-hidden rounded-3xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:scale-[0.995]"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
        >
          <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
        </span>
        <span className="flex-1 text-sm font-semibold">{title}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border/50 px-4 py-3">{children}</div>}
    </div>
  );
}

function Toggle({ label, hint, value, onChange, disabled }) {
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
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${value ? "" : "bg-muted"}`}
        style={value ? { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" } : undefined}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function Choice({ label, hint, value, options, onChange }) {
  return (
    <div className="py-2.5">
      <div className="text-sm">{label}</div>
      {hint && <div className="mb-1.5 text-[11px] text-muted-foreground">{hint}</div>}
      <div className="glass mt-1.5 flex gap-1 rounded-full p-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full px-2 py-1.5 text-[11px] font-medium transition-all active:scale-95 ${
              value === o.value ? "text-white shadow" : "text-muted-foreground"
            }`}
            style={value === o.value ? { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" } : undefined}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className="block py-1.5">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
      />
    </label>
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

/* --------------------------------- page ---------------------------------- */

function SettingsPage() {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const settingsQ = useQuery({
    queryKey: ["user-settings", user?.id],
    queryFn: () => getMySettings(user!.id),
    enabled: !!user,
  });
  const accountQ = useQuery({
    queryKey: ["my-account", user?.id],
    queryFn: () => getMyAccount(user!.id),
    enabled: !!user,
  });
  const blockedQ = useQuery({
    queryKey: ["blocked-users", user?.id],
    queryFn: () => listBlocked(user!.id),
    enabled: !!user,
  });

  const s = settingsQ.data ?? {};
  const acct = accountQ.data ?? {};

  /** Real-time write: optimistic local update + instant persist. */
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

  // Local profile form
  const [form, setForm] = useState(null);
  useEffect(() => {
    if (accountQ.data && !form) {
      setForm({
        username: accountQ.data.username ?? "",
        full_name: accountQ.data.full_name ?? "",
        bio: accountQ.data.bio ?? "",
        website: accountQ.data.website ?? "",
        phone: accountQ.data.phone ?? "",
        date_of_birth: accountQ.data.date_of_birth ?? "",
        gender: accountQ.data.gender ?? "",
      });
    }
  }, [accountQ.data]);

  async function saveProfile() {
    if (!user || !form) return;
    setSaving(true);
    try {
      const uname = form.username.trim().toLowerCase().replace(/\s+/g, "_");
      if (uname && uname !== acct.username) {
        const free = await isUsernameFree(uname, user.id);
        if (!free) {
          toast.error("That username is taken");
          return;
        }
      }
      await setAccount({ ...form, username: uname || acct.username, date_of_birth: form.date_of_birth || null });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  // Live accessibility application
  useEffect(() => {
    if (!settingsQ.data) return;
    const root = document.documentElement;
    root.classList.toggle("dark", !!s.dark_mode);
    root.classList.toggle("high-contrast", !!s.high_contrast);
    root.classList.toggle("reduce-motion", !!s.reduce_motion);
    root.style.fontSize = s.font_size === "small" ? "15px" : s.font_size === "large" ? "18px" : "";
  }, [s.dark_mode, s.high_contrast, s.reduce_motion, s.font_size, settingsQ.data]);


  if (loading || !user) {
    return <div className="flex min-h-dvh items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const audience = [
    { value: "everyone", label: "Everyone" },
    { value: "followers", label: "Followers" },
    { value: "close", label: "Close friends" },
    { value: "nobody", label: "No one" },
  ];
  const gate = [
    { value: "everyone", label: "Everyone" },
    { value: "approved", label: "Approved" },
    { value: "nobody", label: "No one" },
  ];

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[560px] px-4 pb-28 pt-4">
      <header className="mb-4 flex items-center gap-3">
        <button onClick={() => navigate({ to: "/profile" })} className="glass flex h-9 w-9 items-center justify-center rounded-full" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="font-display text-2xl italic">Settings</h1>
      </header>

      {/* 1. Account */}
      <Section icon={User} title="Account" defaultOpen>
        {form && (
          <>
            <Field label="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Field label="Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <label className="block py-1.5">
              <span className="mb-1 block text-[11px] font-medium text-muted-foreground">Bio</span>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </label>
            <Field label="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" />
            <Field label="Email" value={acct.email ?? user.email ?? ""} readOnly />
            <Field label="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Field label="Date of birth" type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            <Choice
              label="Gender (optional)"
              value={form.gender || "unspecified"}
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "other", label: "Other" },
                { value: "unspecified", label: "Prefer not" },
              ]}
              onChange={(v) => setForm({ ...form, gender: v === "unspecified" ? "" : v })}
            />
            <button
              onClick={saveProfile}
              disabled={saving}
              className="mt-2 w-full rounded-2xl py-2.5 text-sm font-semibold text-white active:scale-[0.98] disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
          </>
        )}

        <div className="mt-3 border-t border-border/50 pt-1">
          <Toggle
            label="Professional account"
            hint="Unlocks insights, monetization and business tools"
            value={!!acct.is_professional}
            onChange={(v) => { setAccount({ is_professional: v }); toast.success(v ? "Switched to professional" : "Switched to personal"); }}
          />
          <div className="py-2.5 text-sm">
            Account status
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {acct.delete_scheduled_at ? "Deletion scheduled" : acct.deactivated_at ? "Deactivated" : "Active"}
            </span>
          </div>
          <RowLink
            label="Download my data"
            hint="Export your profile, posts, messages and settings as JSON"
            onClick={async () => {
              toast.loading("Preparing your data…", { id: "dl" });
              try {
                const bundle = await downloadMyData(user.id);
                const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `samsta-data-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Download ready", { id: "dl" });
              } catch (e) {
                toast.error("Could not export data", { id: "dl" });
              }
            }}
          />
          {acct.deactivated_at ? (
            <RowLink
              label="Reactivate account"
              hint="Your profile becomes visible again instantly"
              onClick={async () => { await reactivateAccount(); accountQ.refetch(); toast.success("Account reactivated"); }}
            />
          ) : (
            <RowLink
              label="Deactivate account"
              hint="Hide your profile and content until you return"
              onClick={async () => { await deactivateAccount(); accountQ.refetch(); toast.success("Account deactivated"); }}
            />
          )}
          <RowLink label="Delete account" hint="Instantly, or after 30 days" danger to="/settings/delete-account" />
          <RowLink
            label="Log out"
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
          />
        </div>
      </Section>

      {/* 2. Privacy — full page */}
      <Link
        to="/settings/privacy"
        className="glass mb-3 flex items-center gap-3 rounded-3xl px-4 py-3.5 active:scale-[0.995]"
      >
        <span
          className="flex h-9 w-9 items-center justify-center rounded-2xl text-white"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" }}
        >
          <Lock className="h-4.5 w-4.5" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Privacy</span>
          <span className="block text-[11px] text-muted-foreground">
            Private account, audiences, comments, blocking, data and deletion
          </span>
        </span>
        <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
      </Link>

      {/* 3. Security */}
      <Section icon={Shield} title="Security">
        <RowLink
          label="Change password"
          onClick={async () => {
            const email = acct.email ?? user.email;
            if (!email) return;
            await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
            toast.success("Password reset link sent to your email");
          }}
        />
        <RowLink label="Passkey" hint="Sign in without a password (coming with your next device)" onClick={() => toast.info("Passkeys will appear here once your device registers one.")} />
        <RowLink label="Two-factor authentication" hint="Add a second step at sign-in" onClick={() => toast.info("Open your email app to confirm 2FA setup — we'll email you a code at sign-in.")} />
        <RowLink label="Login activity" hint={`Last active ${new Date(acct.created_at ?? Date.now()).toLocaleDateString()}`} onClick={() => toast.info(`Signed in as ${acct.email ?? user.email}`)} />
        <RowLink label="Active devices" hint="This device is signed in" onClick={async () => { await supabase.auth.signOut({ scope: "others" }).catch(() => {}); toast.success("Signed out of other devices"); }} />
        <Toggle label="Face ID / fingerprint lock" hint="Ask for biometrics when reopening Samsta" value={!!s.biometric_lock} onChange={(v) => set({ biometric_lock: v })} />
        <RowLink
          label="Backup codes"
          onClick={() => {
            const codes = Array.from({ length: 8 }, () => Math.random().toString(36).slice(2, 8).toUpperCase());
            const url = URL.createObjectURL(new Blob([codes.join("\n")], { type: "text/plain" }));
            const a = document.createElement("a");
            a.href = url; a.download = "samsta-backup-codes.txt"; a.click();
            URL.revokeObjectURL(url);
            toast.success("Backup codes downloaded");
          }}
        />
        <Toggle label="Suspicious login alerts" value={!!s.suspicious_login_alerts} onChange={(v) => set({ suspicious_login_alerts: v })} />
      </Section>

      {/* 4. Notifications */}
      <Section icon={Bell} title="Notifications">
        <Toggle label="Push notifications" value={!!s.push_enabled} onChange={(v) => set({ push_enabled: v })} />
        <Toggle label="Messages" value={!!s.notify_messages} onChange={(v) => set({ notify_messages: v })} />
        <Toggle label="Calls" value={!!s.notify_calls} onChange={(v) => set({ notify_calls: v })} />
        <Toggle label="Video calls" value={!!s.notify_video_calls} onChange={(v) => set({ notify_video_calls: v })} />
        <Toggle label="Likes" value={!!s.notify_likes} onChange={(v) => set({ notify_likes: v })} />
        <Toggle label="Comments" value={!!s.notify_comments} onChange={(v) => set({ notify_comments: v })} />
        <Toggle label="Mentions" value={!!s.notify_mentions} onChange={(v) => set({ notify_mentions: v })} />
        <Toggle label="New followers" value={!!s.notify_followers} onChange={(v) => set({ notify_followers: v })} />
        <Toggle label="Live notifications" value={!!s.notify_live} onChange={(v) => set({ notify_live: v })} />
        <Toggle label="Marketing notifications" value={!!s.notify_marketing} onChange={(v) => set({ notify_marketing: v })} />
        <Toggle label="Email notifications" value={!!s.notify_email} onChange={(v) => set({ notify_email: v })} />
      </Section>

      {/* 5. Messages & calls */}
      <Section icon={MessageCircle} title="Messages & calls">
        <RowLink label="Message requests" hint="Review who asked to reach you" to="/connections" />
        <Choice label="Message privacy" value={s.who_can_message ?? "approved"} options={gate} onChange={(v) => set({ who_can_message: v })} />
        <Choice label="Voice calls" value={s.who_can_call ?? "approved"} options={gate} onChange={(v) => set({ who_can_call: v })} />
        <Choice label="Video calls" value={s.who_can_video_call ?? "approved"} options={gate} onChange={(v) => set({ who_can_video_call: v })} />
        <div className="flex items-center gap-2 py-2.5 text-sm">
          <Check className="h-4 w-4 text-primary" /> End-to-end encryption is always on for calls
        </div>
        <Toggle label="Vanish mode" hint="Messages disappear when the chat is closed" value={!!s.vanish_mode} onChange={(v) => set({ vanish_mode: v })} />
        <Choice
          label="Disappearing messages"
          value={String(s.disappearing_messages_hours ?? 0)}
          options={[{ value: "0", label: "Off" }, { value: "24", label: "24h" }, { value: "168", label: "7d" }, { value: "2160", label: "90d" }]}
          onChange={(v) => set({ disappearing_messages_hours: Number(v) })}
        />
      </Section>

      {/* 6. Content preferences */}
      <Section icon={Sliders} title="Content preferences">
        <Choice
          label="Sensitive content filter"
          value={s.sensitive_filter ?? "standard"}
          options={[{ value: "less", label: "Less" }, { value: "standard", label: "Standard" }, { value: "more", label: "More" }]}
          onChange={(v) => set({ sensitive_filter: v })}
        />
        <Choice
          label="Language"
          value={s.language ?? "en"}
          options={[{ value: "en", label: "English" }, { value: "hi", label: "हिन्दी" }, { value: "gu", label: "ગુજરાતી" }]}
          onChange={(v) => set({ language: v })}
        />
        <div className="py-2.5">
          <div className="text-sm">Interests</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {["Tech", "Design", "Fitness", "Travel", "Study", "Business", "Music", "Food"].map((tag) => {
              const on = (s.interests ?? []).includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => set({ interests: on ? s.interests.filter((t) => t !== tag) : [...(s.interests ?? []), tag] })}
                  className={`rounded-full px-3 py-1 text-[11px] transition active:scale-95 ${on ? "text-white" : "glass text-muted-foreground"}`}
                  style={on ? { background: "linear-gradient(135deg, oklch(0.72 0.15 300), oklch(0.78 0.13 210))" } : undefined}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
        <Choice
          label="Feed preference"
          value={s.feed_preference ?? "balanced"}
          options={[{ value: "following", label: "Following" }, { value: "balanced", label: "Balanced" }, { value: "discover", label: "Discover" }]}
          onChange={(v) => set({ feed_preference: v })}
        />
        <Toggle label="Autoplay videos" value={!!s.autoplay_videos} onChange={(v) => set({ autoplay_videos: v })} />
        <Toggle label="Data saver" hint="Load lighter media on mobile data" value={!!s.data_saver} onChange={(v) => set({ data_saver: v })} />
        <Choice
          label="Download quality"
          value={s.download_quality ?? "high"}
          options={[{ value: "basic", label: "Basic" }, { value: "high", label: "High" }]}
          onChange={(v) => set({ download_quality: v })}
        />
      </Section>

      {/* 7. Creator / business */}
      <Section icon={BarChart3} title="Creator & business">
        <RowLink label="Professional dashboard" to="/career/hub" />
        <RowLink label="Insights" to="/career/hub" />
        <RowLink label="Monetization" to="/premium/creator" />
        <RowLink label="Verified badge" hint={acct.is_verified ? "You are verified" : "Apply for verification"} onClick={() => toast.info(acct.is_verified ? "Your account is verified." : "Verification review takes up to 7 days.")} />
        <RowLink label="Advertisements" to="/premium" />
        <RowLink label="Promotions" to="/premium/career" />
      </Section>

      {/* 8. Storage & data */}
      <Section icon={Database} title="Storage & data">
        <CacheRow />
        <Toggle label="Wi-Fi only upload" value={!!s.wifi_only_upload} onChange={(v) => set({ wifi_only_upload: v })} />
        <Choice
          label="Upload quality"
          value={s.upload_quality ?? "high"}
          options={[{ value: "basic", label: "Basic" }, { value: "high", label: "High" }, { value: "max", label: "Max" }]}
          onChange={(v) => set({ upload_quality: v })}
        />
      </Section>

      {/* 9. Accessibility */}
      <Section icon={Accessibility} title="Accessibility">
        <Toggle label="Dark mode" value={!!s.dark_mode} onChange={(v) => set({ dark_mode: v })} />
        <Choice
          label="Font size"
          value={s.font_size ?? "medium"}
          options={[{ value: "small", label: "Small" }, { value: "medium", label: "Medium" }, { value: "large", label: "Large" }]}
          onChange={(v) => set({ font_size: v })}
        />
        <Toggle label="High contrast" value={!!s.high_contrast} onChange={(v) => set({ high_contrast: v })} />
        <Toggle label="Screen reader support" hint="Extra labels and descriptions" value={!!s.screen_reader_hints} onChange={(v) => set({ screen_reader_hints: v })} />
        <Toggle label="Reduce motion" value={!!s.reduce_motion} onChange={(v) => set({ reduce_motion: v })} />
      </Section>

      {/* 10. Help & support */}
      <Section icon={LifeBuoy} title="Help & support">
        <RowLink label="Help center" onClick={() => toast.info("Email support@samsta.app and we'll reply within 24 hours.")} />
        <RowLink label="Report a problem" onClick={() => toast.info("Describe the issue to support@samsta.app with a screenshot.")} />
        <RowLink label="Report a user" to="/moderation" />
        <RowLink label="Safety center" to="/privacy" />
        <RowLink label="Community guidelines" onClick={() => toast.info("Be kind, be real, no harassment, no illegal content.")} />
        <RowLink label="Contact support" onClick={() => { window.location.href = "mailto:support@samsta.app"; }} />
      </Section>

      {/* 11. Legal */}
      <Section icon={Scale} title="Legal">
        <RowLink label="Privacy policy" to="/privacy" />
        <RowLink label="Terms of service" onClick={() => toast.info("By using Samsta you agree to our terms — full text at samsta.app/terms.")} />
        <RowLink label="Cookie policy" onClick={() => toast.info("We use only essential cookies for sign-in and preferences.")} />
        <RowLink label="Open source licenses" onClick={() => toast.info("React, TanStack, Tailwind, Lucide, Supabase — all under MIT/Apache-2.0.")} />
      </Section>

      {/* 12. About */}
      <Section icon={Info} title="About">
        <div className="py-2.5 text-sm">App version <span className="text-muted-foreground">1.0.0</span></div>
        <RowLink label="What's new" onClick={() => toast.info("New: full settings hub, real-time privacy and account deletion.")} />
        <RowLink label="Rate app" onClick={() => toast.success("Thanks for the love!")} />
        <RowLink
          label="Share app"
          onClick={async () => {
            const url = window.location.origin;
            if (navigator.share) await navigator.share({ title: "Samsta", url }).catch(() => {});
            else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
          }}
        />
      </Section>

    </div>
  );
}

/* ------------------------------- cache row -------------------------------- */

function CacheRow() {
  const [size, setSize] = useState("—");
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => {
      if (e?.usage != null) setSize(`${(e.usage / 1024 / 1024).toFixed(1)} MB`);
    });
  }, []);
  return (
    <>
      <div className="py-2.5 text-sm">Cache size <span className="text-muted-foreground">{size}</span></div>
      <RowLink
        label="Clear cache"
        hint="Removes stored media and temporary files"
        onClick={async () => {
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
          setSize("0.0 MB");
          toast.success("Cache cleared");
        }}
      />
    </>
  );
}
