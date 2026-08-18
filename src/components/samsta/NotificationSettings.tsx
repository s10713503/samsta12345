// @ts-nocheck
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Mail, Loader2, Smartphone, Check } from "lucide-react";
import { toast } from "sonner";
import { pushSupported, getPushState, enablePush, disablePush } from "@/lib/push";
import {
  getNotifPrefs,
  updateNotifPrefs,
  type NotifPrefs,
} from "@/lib/api/social";

const ROWS: Array<{
  label: string;
  hint: string;
  inApp: keyof NotifPrefs;
  push: keyof NotifPrefs;
  email?: keyof NotifPrefs;
}> = [
  {
    label: "Follow request approved",
    hint: "When someone lets you follow their private account",
    inApp: "follow_approved_in_app",
    email: "follow_approved_email",
    push: "follow_approved_push",
  },
  {
    label: "Follow request declined",
    hint: "When a request you sent is rejected",
    inApp: "follow_declined_in_app",
    email: "follow_declined_email",
    push: "follow_declined_push",
  },
  {
    label: "New follow requests",
    hint: "When someone asks to follow you",
    inApp: "follow_request_in_app",
    push: "follow_request_push",
  },
];

function Chip({
  on,
  onChange,
  icon: Icon,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`group relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-2xl px-2.5 py-2 text-[11px] font-semibold transition-all duration-300 active:scale-[0.94] ${
        on
          ? "bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground shadow-lg shadow-primary/35 ring-1 ring-primary/30 hover:shadow-primary/50"
          : "glass text-muted-foreground hover:text-foreground"
      }`}
    >
      <span
        className={`pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/35 to-transparent transition-transform duration-700 ${
          on ? "translate-x-full" : ""
        }`}
      />
      <Icon className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${on ? "scale-110" : "group-active:scale-90"}`} />
      <span className="truncate">{label}</span>
      {on && <Check className="h-3 w-3 shrink-0 opacity-70" />}
    </button>
  );
}

/** Choose how follow approvals and rejections reach you: in-app, push, or email. */
export function NotificationSettings({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const prefsQ = useQuery({
    queryKey: ["notif-prefs", userId],
    queryFn: () => getNotifPrefs(userId),
    enabled: !!userId,
  });

  const prefs = prefsQ.data;
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const supported = pushSupported();

  useEffect(() => {
    if (!supported) return;
    void getPushState().then((s) => setPushOn(s === "enabled"));
  }, [supported]);

  async function toggleDevicePush(next: boolean) {
    if (!userId) return;
    setPushBusy(true);
    try {
      const state = next ? await enablePush(userId) : await disablePush(userId);
      setPushOn(state === "enabled");
      if (next && state !== "enabled") toast.error("Notifications are blocked in your browser settings");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update push notifications");
    } finally {
      setPushBusy(false);
    }
  }

  async function set(key: keyof NotifPrefs, value: boolean) {
    qc.setQueryData(["notif-prefs", userId], (old: NotifPrefs | undefined) =>
      old ? { ...old, [key]: value } : old,
    );
    try {
      await updateNotifPrefs(userId, { [key]: value } as Partial<NotifPrefs>);
    } catch (e) {
      qc.invalidateQueries({ queryKey: ["notif-prefs", userId] });
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <section className="mt-6 px-3">
      <div className="flex items-center gap-2 px-2 pb-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
        <div className="text-xs font-semibold tracking-wide text-muted-foreground">
          Notification settings
        </div>
      </div>

      <div className="glass animate-scale-in relative overflow-hidden rounded-[28px] p-3 shadow-xl ring-1 ring-border/40">
        <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        {!prefs ? (
          <div className="flex flex-col gap-3 py-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-muted/50 p-4">
                <div className="mb-2 h-3 w-1/2 rounded-full bg-muted" />
                <div className="h-2 w-2/3 rounded-full bg-muted/70" />
              </div>
            ))}
          </div>
        ) : (
          <ul className="relative flex flex-col gap-2.5">
            {ROWS.map((r, i) => (
              <li
                key={r.inApp}
                className="animate-fade-in rounded-3xl bg-background/40 p-3 backdrop-blur-sm transition-all duration-300 hover:bg-background/60"
                style={{ animationDelay: `${i * 70}ms`, animationFillMode: "both" }}
              >
                <div className="mb-2.5 min-w-0">
                  <div className="text-sm font-semibold leading-tight">{r.label}</div>
                  <div className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{r.hint}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Chip on={!!prefs[r.inApp]} onChange={(v) => set(r.inApp, v)} icon={Bell} label="In-app" />
                  <Chip on={!!prefs[r.push]} onChange={(v) => set(r.push, v)} icon={Smartphone} label="Push" />
                  {r.email && (
                    <Chip on={!!prefs[r.email]} onChange={(v) => set(r.email!, v)} icon={Mail} label="Email" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {supported && (
        <button
          type="button"
          onClick={() => toggleDevicePush(!pushOn)}
          disabled={pushBusy}
          style={{ animationDelay: "240ms", animationFillMode: "both" }}
          className="glass animate-fade-in mt-3 flex w-full items-center gap-3 overflow-hidden rounded-[28px] p-4 text-left shadow-lg ring-1 ring-border/40 transition-all duration-300 active:scale-[0.98]"
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500 ${
              pushOn ? "bg-primary/20 shadow-md shadow-primary/20" : "bg-muted"
            }`}
          >
            {pushBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className={`h-4 w-4 transition-transform duration-500 ${pushOn ? "scale-110 text-primary" : "text-muted-foreground"}`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold">Alerts on this device</div>
            <div className="text-[11px] leading-snug text-muted-foreground">
              {pushOn ? "On — you get alerts even when Samsta is closed" : "Turn on to get alerts when the app is closed"}
            </div>
          </div>
          <span
            className={`flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-all duration-300 ${
              pushOn ? "justify-end bg-emerald-500 shadow-inner" : "justify-start bg-muted"
            }`}
          >
            <span className="h-6 w-6 rounded-full bg-background shadow-md transition-transform duration-300" />
          </span>
        </button>
      )}
    </section>
  );
}
