import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PENDING = "samsta_welcome_voice_pending";

/**
 * Marks the spoken welcome as due. Called right after a successful
 * email sign-in / sign-up, so the line plays exactly once when the user
 * lands on the home feed — never on later visits or app re-opens.
 */
export function markWelcomeVoicePending() {
  try { sessionStorage.setItem(PENDING, "1"); } catch { /* ignore */ }
}

export function WelcomeVoice() {
  useEffect(() => {
    let cancelled = false;
    let audio: HTMLAudioElement | null = null;
    let onGesture: (() => void) | null = null;

    const cleanupGesture = () => {
      if (!onGesture) return;
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      onGesture = null;
    };

    (async () => {
      try {
        if (!sessionStorage.getItem(PENDING)) return;
        // Consume immediately — one play per login, even across re-renders.
        sessionStorage.removeItem(PENDING);

        const { data } = await supabase.auth.getSession();
        if (cancelled || !data.session) return;

        audio = new Audio("/api/welcome-voice");
        audio.preload = "auto";
        audio.volume = 0.9;

        try {
          await audio.play();
        } catch {
          // Autoplay blocked — play on the first interaction instead.
          onGesture = () => {
            cleanupGesture();
            audio?.play().catch(() => {});
          };
          window.addEventListener("pointerdown", onGesture, { once: true });
          window.addEventListener("keydown", onGesture, { once: true });
        }
      } catch {
        /* voice is a nicety — never break the feed */
      }
    })();

    return () => {
      cancelled = true;
      cleanupGesture();
      if (audio) { audio.pause(); audio.src = ""; }
    };
  }, []);

  return null;
}
