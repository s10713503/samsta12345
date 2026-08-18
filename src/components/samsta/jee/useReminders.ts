import { useEffect } from "react";
import { toast } from "sonner";
import { CK, DEFAULT_REMINDERS, readLS, today, type ReminderPrefs } from "@/lib/jee-coach";

const COPY: Record<string, string> = {
  study: "Study block time — open your next chapter 📚",
  revision: "Revision window — run a 5-minute formula sheet 🔁",
  mock: "Mock test time — 3 hours, phone away 📝",
  pyq: "PYQ time — 10 previous-year questions 🎯",
  sleep: "Wind down. Sleep protects everything you learned today 🌙",
  water: "Drink water 💧",
  break: "Take a 10-minute break — stand, stretch, breathe 🌿",
};

/** Fires reminder nudges while the app is open (checks every minute). */
export function useReminders() {
  useEffect(() => {
    const firedKey = "samsta:jee:remindersFired";
    const tick = () => {
      const prefs = readLS<ReminderPrefs>(CK.reminders, DEFAULT_REMINDERS);
      const fired = readLS<Record<string, string>>(firedKey, {});
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      let changed = false;
      for (const [key, p] of Object.entries(prefs)) {
        if (!p?.on || p.at !== hhmm) continue;
        if (fired[key] === today()) continue;
        fired[key] = today();
        changed = true;
        toast(COPY[key] ?? "Samsta reminder");
        try {
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("Samsta", { body: COPY[key] ?? "Reminder", silent: true, vibrate: [] } as NotificationOptions);
          }
        } catch { /* ignore */ }
      }
      if (changed) {
        try { localStorage.setItem(firedKey, JSON.stringify(fired)); } catch { /* quota */ }
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
}
