// Client-side Agent Executor. Every branch performs a real, verifiable action.
import { byKey } from "./registry";
import { silentNotify } from "./silent";

export type Plan = {
  capability: string;
  provider?: string;
  params: Record<string, string>;
  risk: "low" | "medium" | "high";
  missing?: string[];
  say: string;
  steps: string[];
};

export type ExecResult = { ok: boolean; result: string; error?: string };

const enc = encodeURIComponent;

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function icsDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

async function notifyAt(title: string, body: string, when: Date): Promise<string> {
  if (!("Notification" in window)) throw new Error("This device can't show notifications.");
  let perm = Notification.permission;
  if (perm === "default") perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notification permission was not granted.");
  const ms = when.getTime() - Date.now();
  if (ms < 0) throw new Error("That time is already in the past.");
  if (ms > 24 * 60 * 60 * 1000) throw new Error("I can only hold reminders up to 24 hours ahead.");
  window.setTimeout(() => {
    silentNotify(title, body);
  }, ms);
  return `Reminder set for ${when.toLocaleString()} — keep Samsta open in a tab.`;
}

function parseWhen(raw?: string): Date {
  if (!raw) throw new Error("I need a time for that.");
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  throw new Error(`I couldn't understand the time "${raw}".`);
}

export async function execute(plan: Plan): Promise<ExecResult> {
  const cap = byKey(plan.capability);
  if (!cap) return { ok: false, result: "", error: "Unknown capability." };
  const p = plan.params ?? {};

  try {
    switch (plan.capability) {
      case "reminder": {
        const when = parseWhen(p.at);
        const msg = await notifyAt(p.title || "Samsta reminder", p.title || "It's time.", when);
        return { ok: true, result: msg };
      }
      case "timer": {
        const mins = Number(p.minutes || 0);
        if (!mins || mins <= 0) throw new Error("How many minutes?");
        const when = new Date(Date.now() + mins * 60_000);
        const msg = await notifyAt(p.title || `${mins} minute timer`, "Time's up.", when);
        return { ok: true, result: msg };
      }
      case "calendar_event": {
        const start = parseWhen(p.start);
        const end = new Date(start.getTime() + (Number(p.durationMinutes) || 60) * 60_000);
        const ics = [
          "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Samsta//EN", "BEGIN:VEVENT",
          `UID:${crypto.randomUUID()}`,
          `DTSTAMP:${icsDate(new Date())}`,
          `DTSTART:${icsDate(start)}`,
          `DTEND:${icsDate(end)}`,
          `SUMMARY:${(p.title || "Samsta event").replace(/\n/g, " ")}`,
          p.location ? `LOCATION:${p.location.replace(/\n/g, " ")}` : "",
          "END:VEVENT", "END:VCALENDAR",
        ].filter(Boolean).join("\r\n");
        const blob = new Blob([ics], { type: "text/calendar" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${(p.title || "samsta-event").replace(/\W+/g, "-").toLowerCase()}.ics`;
        a.click();
        URL.revokeObjectURL(a.href);
        return { ok: true, result: `Calendar file downloaded — open it to add "${p.title}" to your calendar.` };
      }
      case "call": {
        if (!p.phone) throw new Error(`I don't have a number for ${p.name || "that contact"}. Give me the number and I'll open the dialler.`);
        window.location.href = `tel:${p.phone.replace(/\s+/g, "")}`;
        return { ok: true, result: `Dialler opened for ${p.name || p.phone}. Press call when you're ready.` };
      }
      case "message_draft": {
        const body = p.body || "";
        if (p.phone) {
          window.location.href = `sms:${p.phone.replace(/\s+/g, "")}?&body=${enc(body)}`;
          return { ok: true, result: "Your SMS app is open with the draft. You send it." };
        }
        await navigator.clipboard.writeText(body);
        return { ok: true, result: "Draft copied to your clipboard — paste and send it yourself." };
      }
      case "maps": {
        if (!p.destination) throw new Error("Where to?");
        const url = p.origin
          ? `https://www.google.com/maps/dir/?api=1&origin=${enc(p.origin)}&destination=${enc(p.destination)}`
          : `https://www.google.com/maps/dir/?api=1&destination=${enc(p.destination)}`;
        openUrl(url);
        return { ok: true, result: `Route to ${p.destination} opened in Maps.` };
      }
      case "nearby": {
        openUrl(`https://www.google.com/maps/search/${enc(p.query || "near me")}`);
        return { ok: true, result: `Showing "${p.query}" near you on Maps.` };
      }
      case "web_search": {
        openUrl(`https://www.google.com/search?q=${enc(p.query || "")}`);
        return { ok: true, result: `Search opened for "${p.query}".` };
      }
      case "shopping_search": {
        const q = enc(p.query || "");
        const url = (p.provider || plan.provider) === "flipkart"
          ? `https://www.flipkart.com/search?q=${q}`
          : `https://www.amazon.in/s?k=${q}`;
        openUrl(url);
        return { ok: true, result: `Product search opened for "${p.query}". I stop before cart and payment.` };
      }
      case "travel_search": {
        const from = p.from || "", to = p.to || "", date = p.date || "";
        const url = (p.provider || plan.provider) === "ixigo"
          ? `https://www.ixigo.com/search/result/flight?from=${enc(from)}&to=${enc(to)}&date=${enc(date)}&adults=1`
          : `https://www.google.com/travel/flights?q=${enc(`flights from ${from} to ${to} on ${date}`)}`;
        openUrl(url);
        return { ok: true, result: `Flights ${from} → ${to} ${date ? `on ${date}` : ""} opened. Booking and payment stay with you.` };
      }
      case "open_app": {
        const app = (p.app || "").toLowerCase().trim();
        const q = enc(p.query || "");
        const map: Record<string, string> = {
          youtube: q ? `https://www.youtube.com/results?search_query=${q}` : "https://www.youtube.com",
          "youtube music": q ? `https://music.youtube.com/search?q=${q}` : "https://music.youtube.com",
          maps: q ? `https://www.google.com/maps/search/${q}` : "https://www.google.com/maps",
          "google maps": q ? `https://www.google.com/maps/search/${q}` : "https://www.google.com/maps",
          gmail: "https://mail.google.com",
          whatsapp: "https://web.whatsapp.com",
          amazon: q ? `https://www.amazon.in/s?k=${q}` : "https://www.amazon.in",
          flipkart: q ? `https://www.flipkart.com/search?q=${q}` : "https://www.flipkart.com",
          myntra: q ? `https://www.myntra.com/${q}` : "https://www.myntra.com",
          meesho: q ? `https://www.meesho.com/search?q=${q}` : "https://www.meesho.com",
          zomato: q ? `https://www.zomato.com/search?q=${q}` : "https://www.zomato.com",
          swiggy: q ? `https://www.swiggy.com/search?query=${q}` : "https://www.swiggy.com",
          blinkit: q ? `https://blinkit.com/s/?q=${q}` : "https://blinkit.com",
          zepto: "https://www.zeptonow.com",
          "domino's": "https://www.dominos.co.in",
          dominos: "https://www.dominos.co.in",
          uber: "https://m.uber.com",
          ola: "https://book.olacabs.com",
          rapido: "https://www.rapido.bike",
          ixigo: "https://www.ixigo.com",
          makemytrip: "https://www.makemytrip.com",
          irctc: "https://www.irctc.co.in/nget/train-search",
          instagram: "https://www.instagram.com",
          facebook: "https://www.facebook.com",
          telegram: "https://web.telegram.org",
          x: "https://x.com",
          twitter: "https://x.com",
          linkedin: "https://www.linkedin.com",
          netflix: "https://www.netflix.com",
          hotstar: "https://www.hotstar.com",
          "prime video": "https://www.primevideo.com",
          calendar: "https://calendar.google.com",
          "google calendar": "https://calendar.google.com",
          spotify: q ? `https://open.spotify.com/search/${q}` : "https://open.spotify.com",
          drive: "https://drive.google.com",
          photos: "https://photos.google.com",
          chatgpt: "https://chat.openai.com",
          paytm: "https://paytm.com",
          phonepe: "https://www.phonepe.com",
          "play store": q ? `https://play.google.com/store/search?q=${q}&c=apps` : "https://play.google.com/store/apps",
          playstore: q ? `https://play.google.com/store/search?q=${q}&c=apps` : "https://play.google.com/store/apps",
        };
        if (!app) throw new Error("Which app should I open?");
        const url = map[app];
        if (url) {
          openUrl(url);
          return { ok: true, result: `${p.app} opened.` };
        }
        // Unknown app: don't dead-end — take the user to it anyway.
        openUrl(`https://www.google.com/search?q=${enc(`${p.app} ${p.query || ""}`.trim())}&btnI=1`);
        return {
          ok: true,
          result: `I don't have a direct link for "${p.app}", so I opened the web result for it. Say “install ${p.app}” and I'll take you to the Play Store instead.`,
        };
      }

      case "share": {
        const data = { text: p.text || "", url: p.url || undefined };
        if (navigator.share) {
          await navigator.share(data);
          return { ok: true, result: "Share sheet opened." };
        }
        await navigator.clipboard.writeText(`${p.text || ""} ${p.url || ""}`.trim());
        return { ok: true, result: "Sharing isn't available here, so I copied it to your clipboard." };
      }
      /* ---------- Premium Ultra ---------- */
      case "app_install": {
        const app = p.app || p.packageId || "";
        if (!app) throw new Error("Which app should I install?");
        const url = p.packageId
          ? `https://play.google.com/store/apps/details?id=${enc(p.packageId)}`
          : `https://play.google.com/store/search?q=${enc(app)}&c=apps`;
        openUrl(url);
        return { ok: true, result: `Play Store opened on ${app}. Tap Install — Android requires that tap from you, no app can bypass it.` };
      }
      case "whatsapp_message": {
        const body = p.body || "";
        const phone = (p.phone || "").replace(/\D/g, "");
        if (!phone) throw new Error(`I need ${p.name || "their"} WhatsApp number to open the right chat.`);
        openUrl(`https://wa.me/${phone}?text=${enc(body)}`);
        return { ok: true, result: `WhatsApp opened for ${p.name || phone} with your message typed. Press send when you're happy.` };
      }
      case "ride_book": {
        const provider = (p.provider || plan.provider || "uber").toLowerCase();
        const url = provider === "ola"
          ? `https://book.olacabs.com/?drop_address=${enc(p.dropoff || "")}`
          : `https://m.uber.com/looking?drop[formatted_address]=${enc(p.dropoff || "")}${p.pickup ? `&pickup[formatted_address]=${enc(p.pickup)}` : ""}`;
        openUrl(url);
        return { ok: true, result: `${provider === "ola" ? "Ola" : "Uber"} opened with your drop set to ${p.dropoff || "your destination"}. Confirm and pay yourself.` };
      }
      case "food_order": {
        const provider = (p.provider || plan.provider || "swiggy").toLowerCase();
        const q = enc(p.query || "");
        const url =
          provider === "zomato" ? `https://www.zomato.com/search?q=${q}`
          : provider === "blinkit" ? `https://blinkit.com/s/?q=${q}`
          : `https://www.swiggy.com/search?query=${q}`;
        openUrl(url);
        return { ok: true, result: `${provider} opened for "${p.query}". Choose, then checkout and pay yourself.` };
      }
      case "music_play": {
        const q = enc(p.query || "");
        const url = (p.provider || plan.provider) === "youtube"
          ? `https://music.youtube.com/search?q=${q}`
          : `https://open.spotify.com/search/${q}`;
        openUrl(url);
        return { ok: true, result: `Playing "${p.query}" — hit play in the app.` };
      }
      case "email_draft": {
        const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${enc(p.to || "")}&su=${enc(p.subject || "")}&body=${enc(p.body || "")}`;
        openUrl(url);
        return { ok: true, result: "Gmail opened with the email written. Review it and press send." };
      }
      case "story_upload": {
        if (p.caption) await navigator.clipboard.writeText(p.caption).catch(() => {});
        openUrl("https://www.instagram.com/");
        return {
          ok: true,
          result: `Instagram opened${p.caption ? " and your caption is copied" : ""}. Instagram doesn't let any outside app pick your photo — choose it and post.`,
        };
      }
      case "payment": {
        return {
          ok: false,
          result: "",
          error:
            "I can prepare the details, but I will never enter a PIN, CVV, OTP or password. Open the merchant's official payment page and authenticate yourself.",
        };
      }
      case "device_setting": {
        return {
          ok: false,
          result: "",
          error: `I can't change "${p.setting || "device settings"}" — the browser can't touch OS settings. On Android: Settings → search "${p.setting || ""}".`,
        };
      }
      case "answer":
      default:
        return { ok: true, result: plan.say };
    }
  } catch (e) {
    return { ok: false, result: "", error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
