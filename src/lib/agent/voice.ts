// Sam AI Ultra speaks back after it finishes a task — short, warm, Hinglish,
// and always offering the next bit of help.

const DONE: Record<string, string> = {
  reminder: "✅ Thik hai, reminder set kar diya.\nAur kya schedule karna hai?",
  timer: "✅ Timer shuru kar diya.\nAur kisi cheez mein madad chahiye?",
  calendar_event: "✅ Event taiyaar kar diya, calendar mein add kar lijiye.\nAur kuch?",
  call: "✅ Call lagane ki process shuru kar di.\nAur kisi cheez mein madad chahiye?",
  message_draft: "✅ Message taiyaar hai, bas bhej dijiye.\nAur kya karna hai?",
  whatsapp_message: "✅ WhatsApp khol diya message ke saath.\nAur kisi ko bhejna hai?",
  maps: "✅ Route khol diya.\nAur kahin jaana hai?",
  nearby: "✅ Aas-paas ki jagah dikha di.\nAur kya dhundhna hai?",
  web_search: "✅ Search kar diya.\nAur kuch jaanna hai?",
  shopping_search: "✅ Shopping search khol diya.\nAur kya dhundhna hai?",
  travel_search: "✅ Travel search shuru kar diya.\nAapki preference bataiye, best options dikha deta hoon.",
  open_app: "✅ App khol diya.\nAur kya karna hai?",
  app_install: "✅ Play Store par app khol diya.\nInstall karne ke baad bataiye, aage kya karein?",
  ride_book: "✅ Ride booking khol di.\nAur kahin jaana hai?",
  food_order: "✅ Order page khol diya.\nAur kuch mangwana hai?",
  music_play: "✅ Music khol diya aur playback shuru kar diya.\nAur kya sunna pasand karenge?",
  email_draft: "✅ Email draft taiyaar hai.\nKya bhejna hai ya kuch badalna hai?",
  story_upload: "✅ Story ke liye sab taiyaar hai.\nAur kuch post karna hai?",
  share: "✅ Share kar diya.\nAur kisi ko bhejna hai?",
};

const FALLBACK = "✅ Thik hai, kaam ho gaya.\nAur bataiye, main aapki aur kis tarah sahayata kar sakta hoon?";

export function replyFor(capability: string, ok: boolean, note?: string): string {
  if (!ok) return `⚠️ ${note || "Yeh kaam pura nahi ho paya."}\nDobara try karein ya doosre tarike se bataiye?`;
  return DONE[capability] ?? FALLBACK;
}

/**
 * Sam is silent by default — no chimes and no spoken reply unless the user has
 * explicitly asked the assistant to speak.
 */
const SPEECH_KEY = "samsta:speech";

export function getSpeech(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SPEECH_KEY) === "1";
}

export function setSpeech(on: boolean) {
  try { localStorage.setItem(SPEECH_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  if (!on && typeof window !== "undefined" && "speechSynthesis" in window) {
    try { window.speechSynthesis.cancel(); } catch { /* ignore */ }
  }
}

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  if (!getSpeech()) return; // silence is the default behaviour
  try {
    const clean = text.replace(/[✅⚠️]/g, "").replace(/\s+/g, " ").trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "hi-IN";
    u.rate = 1.05;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("hi"));
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* speaking is a nicety — never break the task because of it */
  }
}
