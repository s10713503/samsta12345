/**
 * Silence by default.
 *
 * Sam never plays a chime, ding, pop or any confirmation sound. Every signal
 * the assistant gives is visual — a pulse, a glow, a checkmark — with an
 * optional gentle haptic the user can turn off.
 */

const HAPTICS_KEY = "samsta:haptics";

/** Haptics are opt-out; if the device has no vibration motor, nothing happens. */
export function getHaptics(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(HAPTICS_KEY) !== "0";
}

export function setHaptics(on: boolean) {
  try { localStorage.setItem(HAPTICS_KEY, on ? "1" : "0"); } catch { /* ignore */ }
}

/** A short, gentle tap. Silent — never paired with a sound. */
export function haptic(pattern: number | number[] = 12) {
  if (typeof window === "undefined") return;
  if (!getHaptics()) return;
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}

/**
 * A notification with no sound and no vibration of its own — the OS tone is
 * suppressed so the experience stays calm.
 */
export function silentNotify(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  try {
    new Notification(title, { body, silent: true, vibrate: [] } as NotificationOptions);
  } catch { /* some browsers only allow service-worker notifications */ }
}
