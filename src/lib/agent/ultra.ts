/**
 * Sam AI Premium Ultra — activation + hands-free state.
 *
 * Ultra does NOT bypass Android/iOS or browser security. What it changes:
 *  • hands-free continuous listening,
 *  • auto-execution of already-permitted low & medium risk actions (no tap),
 *  • the extended capability set (app install, WhatsApp, rides, food, music).
 * High-risk actions (payments, purchases) always require an explicit tap, and
 * PIN / OTP / CVV / biometrics are never asked for, entered or stored.
 */

export const ULTRA_PRICE_INR = 4000;

const KEY = "samsta:ultra";
const GRANT_KEY = "samsta:ultra:grants";

export type UltraState = { active: boolean; since: string | null };

export function getUltra(): UltraState {
  if (typeof window === "undefined") return { active: false, since: null };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as UltraState | null;
    if (raw?.active) return raw;
  } catch { /* ignore */ }
  return { active: false, since: null };
}

export function setUltra(active: boolean): UltraState {
  const next: UltraState = { active, since: active ? new Date().toISOString() : null };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent("samsta:ultra", { detail: next }));
  return next;
}

/** Hands-free listening preference (Ultra only). Defaults ON for Ultra. */
export function getHandsFree(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("samsta:ultra:handsfree") !== "0";
}
export function setHandsFree(on: boolean) {
  try { localStorage.setItem("samsta:ultra:handsfree", on ? "1" : "0"); } catch { /* ignore */ }
}

/** Current notification permission, safe on the server. */
export function notificationState(): "unsupported" | "granted" | "denied" | "default" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as "granted" | "denied" | "default";
}

/** Asks for notifications; tells the user how to recover from a hard block. */
export async function enableNotifications(): Promise<{ ok: boolean; note: string }> {
  const state = notificationState();
  if (state === "unsupported") return { ok: false, note: "This browser can't show notifications." };
  if (state === "granted") return { ok: true, note: "Notifications are already on." };
  if (state === "denied") {
    return {
      ok: false,
      note: "Your browser has blocked notifications for Samsta. Tap the lock icon next to the address bar → Permissions → Notifications → Allow, then come back.",
    };
  }
  const p = await Notification.requestPermission();
  return p === "granted"
    ? { ok: true, note: "Notifications allowed." }
    : { ok: false, note: "You declined notifications — tap Allow when the browser asks, or enable it from the lock icon in the address bar." };
}

/* ---------- the activation permission ladder ---------- */

export type UltraGrant = {
  id: string;
  label: string;
  why: string;
  /** Honest note about what the platform still keeps in the user's hands. */
  limit: string;
  /** Browser permission this grant genuinely requests, if any. */
  native?: "notifications" | "microphone" | "location";
};

export const ULTRA_GRANTS: UltraGrant[] = [
  {
    id: "voice",
    label: "Voice & continuous listening",
    why: "So you can just talk — Hindi, Hinglish, Gujarati or English — without tapping.",
    limit: "Your device shows a mic indicator whenever Sam is listening. You can stop it any time.",
    native: "microphone",
  },
  {
    id: "notifications",
    label: "Notifications, alarms & reminders",
    why: "So Sam can reach you when a task is due or finished.",
    limit: "Sam notifies through Samsta; it cannot write into your phone's native Clock app.",
    native: "notifications",
  },
  {
    id: "location",
    label: "Location",
    why: "For routes, rides, nearby search and delivery addresses.",
    limit: "Your location stays on your device and is never shared publicly.",
    native: "location",
  },
  {
    id: "apps",
    label: "Apps & services",
    why: "So Sam can open WhatsApp, Play Store, Uber, Swiggy, YouTube, Spotify, Maps and more with your request already loaded.",
    limit: "The OS asks you to confirm installs and sends. Sam prepares everything up to that point.",
  },
  {
    id: "contacts",
    label: "Calls & messages",
    why: "So Sam can open the dialler or a chat with the message already written.",
    limit: "Android and iOS require you to press send or call yourself.",
  },
  {
    id: "calendar",
    label: "Calendar & schedule",
    why: "So Sam can build events and add them to your calendar in one tap.",
    limit: "Sam prepares a real event file; your calendar app does the write.",
  },
  {
    id: "payments",
    label: "Payments & orders",
    why: "So Sam can take you all the way to the payment screen with the order ready.",
    limit: "Sam never asks for, enters or stores a UPI PIN, CVV, OTP, password or biometric. You always authenticate yourself.",
  },
];

export function getGrants(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(GRANT_KEY) || "{}") as Record<string, boolean>; } catch { return {}; }
}

export function setGrant(id: string, granted: boolean) {
  const all = { ...getGrants(), [id]: granted };
  try { localStorage.setItem(GRANT_KEY, JSON.stringify(all)); } catch { /* ignore */ }
  return all;
}

/** Actually asks the browser for the underlying permission where one exists. */
export async function requestNative(grant: UltraGrant): Promise<{ ok: boolean; note: string }> {
  try {
    if (grant.native === "notifications") {
      return await enableNotifications();
    }
    if (grant.native === "microphone") {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach((t) => t.stop());
      return { ok: true, note: "Microphone allowed." };
    }
    if (grant.native === "location") {
      await new Promise<void>((res, rej) =>
        navigator.geolocation.getCurrentPosition(() => res(), (e) => rej(e), { timeout: 8000 }),
      );
      return { ok: true, note: "Location allowed." };
    }
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : "Permission was not granted." };
  }
  return { ok: true, note: "Enabled." };
}
