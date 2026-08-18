/**
 * Samsta Integration SDK — capability registry.
 *
 * Every capability declares what it is, what it can and cannot do, which
 * permission it needs, its risk level and its confirmation policy. The agent
 * can ONLY do what is declared here. Nothing is faked: each capability maps to
 * a mechanism that genuinely works in a web app (deep link, .ics file, tel:,
 * Web Share, browser notification). Anything the web cannot do is declared
 * `unsupported` and the agent says so honestly.
 */

export type Risk = "low" | "medium" | "high";
export type Scope =
  | "notifications"
  | "calendar"
  | "contacts"
  | "location"
  | "web"
  | "apps"
  | "payments";

export type Capability = {
  key: string;
  label: string;
  emoji: string;
  scope: Scope;
  risk: Risk;
  /** medium/high always confirm; low runs straight away. */
  confirm: boolean;
  /** Params the planner must fill. */
  params: string[];
  can: string;
  cannot: string;
  /** true = the web platform cannot do this at all; explain + offer fallback. */
  unsupported?: boolean;
  /** true = only available on Sam AI Premium Ultra. */
  ultra?: boolean;
};

export const CAPABILITIES: Capability[] = [
  {
    key: "reminder",
    label: "Reminder / alarm",
    emoji: "⏰",
    scope: "notifications",
    risk: "low",
    confirm: false,
    params: ["title", "at"],
    can: "Send you a Samsta notification at the time you asked for.",
    cannot: "Create an alarm in your phone's native Clock app — the browser has no access to it.",
  },
  {
    key: "timer",
    label: "Timer",
    emoji: "⏳",
    scope: "notifications",
    risk: "low",
    confirm: false,
    params: ["minutes", "title"],
    can: "Count down and notify you when time is up.",
    cannot: "Ring after Samsta is fully closed on some devices.",
  },
  {
    key: "calendar_event",
    label: "Calendar event",
    emoji: "📅",
    scope: "calendar",
    risk: "medium",
    confirm: true,
    params: ["title", "start", "durationMinutes", "location"],
    can: "Prepare a real .ics event you add to your own calendar in one tap.",
    cannot: "Write directly into your calendar or invite other people without you.",
  },
  {
    key: "call",
    label: "Call a contact",
    emoji: "📞",
    scope: "contacts",
    risk: "medium",
    confirm: true,
    params: ["name", "phone"],
    can: "Open your dialler with the number ready.",
    cannot: "Place the call itself or read your phone's contact list.",
  },
  {
    key: "message_draft",
    label: "Draft a message",
    emoji: "✍️",
    scope: "contacts",
    risk: "medium",
    confirm: true,
    params: ["to", "phone", "body"],
    can: "Write the message and open your SMS app pre-filled, or copy it for you.",
    cannot: "Send anything on your behalf.",
  },
  {
    key: "maps",
    label: "Navigation",
    emoji: "🗺️",
    scope: "location",
    risk: "low",
    confirm: false,
    params: ["destination", "origin"],
    can: "Open Google Maps with the route ready.",
    cannot: "Start turn-by-turn guidance for you.",
  },
  {
    key: "nearby",
    label: "Find nearby",
    emoji: "📍",
    scope: "location",
    risk: "low",
    confirm: false,
    params: ["query"],
    can: "Search places around you on Maps (your location stays on your device).",
    cannot: "Share your exact location with anyone.",
  },
  {
    key: "web_search",
    label: "Search the web",
    emoji: "🔎",
    scope: "web",
    risk: "low",
    confirm: false,
    params: ["query"],
    can: "Open a web search for exactly what you asked.",
    cannot: "Log into sites or act inside them.",
  },
  {
    key: "shopping_search",
    label: "Shopping search",
    emoji: "🛍️",
    scope: "apps",
    risk: "low",
    confirm: false,
    params: ["query", "provider"],
    can: "Open Amazon or Flipkart search results for the product.",
    cannot: "Add to cart, checkout or pay.",
  },
  {
    key: "travel_search",
    label: "Travel search",
    emoji: "✈️",
    scope: "apps",
    risk: "low",
    confirm: false,
    params: ["from", "to", "date", "provider"],
    can: "Open flight results for your route and date on ixigo or Google Flights.",
    cannot: "Book or pay for a ticket.",
  },
  {
    key: "open_app",
    label: "Open an app",
    emoji: "📱",
    scope: "apps",
    risk: "low",
    confirm: false,
    params: ["app", "query"],
    can: "Open a supported app or site (YouTube, Maps, Gmail, WhatsApp, Amazon…).",
    cannot: "Control what happens inside that app.",
  },
  {
    key: "share",
    label: "Share content",
    emoji: "📤",
    scope: "apps",
    risk: "medium",
    confirm: true,
    params: ["text", "url"],
    can: "Open your system share sheet with the content ready.",
    cannot: "Choose the recipient for you.",
  },
  {
    key: "payment",
    label: "Payment / booking purchase",
    emoji: "💳",
    scope: "payments",
    risk: "high",
    confirm: true,
    unsupported: true,
    params: ["amount", "merchant", "purpose"],
    can: "Prepare the details and take you to the official payment page.",
    cannot:
      "Enter a UPI PIN, CVV, OTP, password or biometric — Samsta never asks for or stores those. You always authenticate yourself.",
  },
  {
    key: "device_setting",
    label: "Device settings / Bluetooth",
    emoji: "⚙️",
    scope: "apps",
    risk: "low",
    confirm: false,
    unsupported: true,
    params: ["setting"],
    can: "Explain exactly where the setting lives on your phone.",
    cannot: "Change OS settings — the browser sandbox blocks this for your safety.",
  },
  /* ---------- Premium Ultra capabilities ---------- */
  {
    key: "app_install",
    label: "Install an app",
    emoji: "⬇️",
    scope: "apps",
    risk: "medium",
    confirm: true,
    ultra: true,
    params: ["app", "packageId"],
    can: "Open the app's Play Store / App Store page ready to install.",
    cannot: "Press Install for you — Android and iOS require your own tap for every install.",
  },
  {
    key: "whatsapp_message",
    label: "WhatsApp message",
    emoji: "💬",
    scope: "contacts",
    risk: "medium",
    confirm: true,
    ultra: true,
    params: ["name", "phone", "body"],
    can: "Open WhatsApp on the right chat with your message already typed.",
    cannot: "Press send, or read your WhatsApp chats.",
  },
  {
    key: "ride_book",
    label: "Book a ride",
    emoji: "🚕",
    scope: "apps",
    risk: "medium",
    confirm: true,
    ultra: true,
    params: ["provider", "pickup", "dropoff"],
    can: "Open Uber or Ola with your pickup and drop already filled in.",
    cannot: "Confirm the ride or pay — that stays with you.",
  },
  {
    key: "food_order",
    label: "Order food",
    emoji: "🍔",
    scope: "apps",
    risk: "medium",
    confirm: true,
    ultra: true,
    params: ["provider", "query"],
    can: "Open Swiggy, Zomato or Blinkit on the dish or restaurant you asked for.",
    cannot: "Place the order or pay.",
  },
  {
    key: "music_play",
    label: "Play music",
    emoji: "🎵",
    scope: "apps",
    risk: "low",
    confirm: false,
    ultra: true,
    params: ["query", "provider"],
    can: "Open Spotify or YouTube Music on the track, artist or playlist.",
    cannot: "Control playback inside the app.",
  },
  {
    key: "email_draft",
    label: "Draft an email",
    emoji: "✉️",
    scope: "apps",
    risk: "medium",
    confirm: true,
    ultra: true,
    params: ["to", "subject", "body"],
    can: "Open Gmail with the recipient, subject and body written for you.",
    cannot: "Send it, or read your inbox.",
  },
  {
    key: "story_upload",
    label: "Post a story",
    emoji: "🖼️",
    scope: "apps",
    risk: "medium",
    confirm: true,
    ultra: true,
    params: ["app", "caption"],
    can: "Open Instagram's story composer and copy your caption ready to paste.",
    cannot: "Pick a photo from your gallery or publish — Instagram allows neither from outside the app.",
  },
  {
    key: "answer",
    label: "Answer / explain",
    emoji: "💬",
    scope: "web",
    risk: "low",
    confirm: false,
    params: [],
    can: "Answer, summarise, compare or explain.",
    cannot: "Do anything outside Samsta.",
  },
];

export const byKey = (k: string) => CAPABILITIES.find((c) => c.key === k);

export const SCOPES: Array<{ scope: Scope; label: string; why: string }> = [
  { scope: "notifications", label: "Notifications", why: "So reminders, timers and alarms can actually reach you." },
  { scope: "calendar", label: "Calendar", why: "To prepare events you add to your own calendar." },
  { scope: "contacts", label: "Calls & messages", why: "To open your dialler or SMS app pre-filled. Samsta never sends by itself." },
  { scope: "location", label: "Location", why: "For routes and nearby search. Never shared publicly." },
  { scope: "web", label: "Web search", why: "To look things up and open results." },
  { scope: "apps", label: "Apps & services", why: "To open Maps, YouTube, Amazon, ixigo and others with your request ready." },
  { scope: "payments", label: "Payments", why: "Preparation only. Samsta never handles PIN, CVV or OTP." },
];
