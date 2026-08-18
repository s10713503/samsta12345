import { useEffect, useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";
import { toast } from "sonner";
import { enableNotifications, notificationState } from "@/lib/agent/ultra";
import { haptic, silentNotify } from "@/lib/agent/silent";

/**
 * Notification onboarding for Sam AI Ultra.
 * Keeps asking (politely, once per state change) until Sam can actually reach
 * the user with prompts, reminders and task status updates.
 */
export function NotificationGate({ ultra }: { ultra: boolean }) {
  const [state, setState] = useState<ReturnType<typeof notificationState>>("unsupported");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(notificationState());
    const sync = () => setState(notificationState());
    document.addEventListener("visibilitychange", sync);
    const id = window.setInterval(sync, 3000);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(id);
    };
  }, []);

  async function ask() {
    setBusy(true);
    const r = await enableNotifications();
    setBusy(false);
    setState(notificationState());
    if (r.ok) {
      toast.success(r.note);
      haptic();
      silentNotify("Sam AI Ultra is listening", "You'll get prompts and task updates right here.");
    } else {
      toast.error(r.note, { duration: 8000 });
    }
  }

  if (state === "unsupported") return null;

  if (state === "granted") {
    return (
      <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-emerald-500" /> Notifications on — Sam can reach you for prompts and updates.
      </p>
    );
  }

  return (
    <div className="glass mt-4 rounded-3xl p-4 text-left">
      <p className="flex items-center gap-2 text-sm font-medium">
        {state === "denied" ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        {state === "denied" ? "Notifications are blocked" : "Turn on notifications"}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {state === "denied"
          ? "Your browser has blocked notifications for Samsta, so Sam can't ask again from here. Tap the lock icon next to the address bar → Permissions → Notifications → Allow, then reload."
          : ultra
            ? "Ultra needs this to send you confirmation prompts, reminders, alarms and “task done” updates while you're doing something else."
            : "So Sam can send you reminders, timers and task updates."}
      </p>
      {state !== "denied" && (
        <button
          onClick={ask}
          disabled={busy}
          className="mt-3 w-full rounded-full bg-primary px-4 py-2.5 text-xs text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Asking…" : "Allow notifications"}
        </button>
      )}
    </div>
  );
}
