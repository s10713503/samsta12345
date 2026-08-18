// @ts-nocheck
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import "../styles.css";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Aurora } from "../components/samsta/Aurora";
import { BottomNav } from "../components/samsta/BottomNav";
import { SamFab } from "../components/samsta/SamFab";
import { Toaster } from "../components/ui/sonner";
import { ThemeProvider } from "../lib/theme";
import { PremiumProvider } from "../lib/premium";
import { PersonalizationProvider } from "../lib/personalize";
import { supabase } from "../integrations/supabase/client";
import { IncomingCallListener } from "../components/samsta/IncomingCallListener";

// Reachable without an account. /reset-password must stay reachable while
// signed in too (recovery links sign the user in before they set a password).
const PUBLIC_ROUTES = ["/welcome", "/auth", "/reset-password"];
const ENTRY_ROUTES = ["/welcome", "/auth"];
const NO_CHROME_ROUTES = ["/welcome", "/auth"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="font-display text-6xl">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page drifted away.</p>
        <Link to="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Back home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    console.error(error);
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass max-w-md rounded-3xl p-8 text-center">
        <h1 className="font-display text-2xl">Something slipped</h1>
        <p className="mt-2 text-sm text-muted-foreground">Give it another try.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#faf1ec" },
      { title: "Samsta — Your beautifully quiet social feed" },
      { name: "description", content: "Browse a calm, ad-light social feed on Samsta. Share photos, reels, and stories with the people you actually care about." },
      { property: "og:title", content: "Samsta — Your beautifully quiet social feed" },
      { property: "og:description", content: "Browse a calm, ad-light social feed on Samsta. Share photos, reels, and stories with the people you actually care about." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:site_name", content: "Samsta" },
      { name: "twitter:title", content: "Samsta — Your beautifully quiet social feed" },
      { name: "twitter:description", content: "Browse a calm, ad-light social feed on Samsta. Share photos, reels, and stories with the people you actually care about." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b10788f1-9a94-4800-8e3f-624a321968bd/id-preview-d4f096f6--779ebbe1-29d3-454a-8ae8-87b634fef241.lovable.app-1784726044985.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/b10788f1-9a94-4800-8e3f-624a321968bd/id-preview-d4f096f6--779ebbe1-29d3-454a-8ae8-87b634fef241.lovable.app-1784726044985.png" },
    ],
    links: [
      
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const UID_KEY = "samsta:last-uid";

/**
 * When Google sign-in uses a full-page redirect (mobile browsers, installed
 * app, popup blocked) the broker returns tokens on the URL. Nothing else picks
 * them up, so sign-in silently "fails". Consume them here, create the session
 * and clean the address bar.
 */
async function consumeOAuthRedirectTokens(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const access_token = hash.get("access_token") ?? query.get("access_token");
    const refresh_token = hash.get("refresh_token") ?? query.get("refresh_token");
    if (!access_token || !refresh_token) return false;
    // Password-recovery links are handled by /reset-password, leave them alone.
    if ((hash.get("type") ?? query.get("type")) === "recovery") return false;
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    window.history.replaceState({}, "", window.location.pathname);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Signing in with a different account must never show the previous account's
 * feed, posts or cached screens. Wipe every in-memory query cache and the
 * device-local app caches whenever the signed-in user id changes.
 */
function resetForNewAccount(queryClient: QueryClient, uid: string | null) {
  try {
    const prev = localStorage.getItem(UID_KEY);
    if (prev === uid) return;
    if (prev) {
      for (const key of Object.keys(localStorage)) {
        // Keep auth tokens + theme; drop everything else this app cached.
        if (key.startsWith("sb-") || key === "samsta:theme") continue;
        if (key.startsWith("samsta:")) localStorage.removeItem(key);
      }
      try { sessionStorage.clear(); } catch { /* ignore */ }
    }
    if (uid) localStorage.setItem(UID_KEY, uid);
    else localStorage.removeItem(UID_KEY);
    queryClient.clear();
  } catch { /* storage unavailable */ }
}

function AuthGate() {
  const router = useRouter();
  const navigate = useNavigate();
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let cancelled = false;
    const isPublic = PUBLIC_ROUTES.some((p) => pathname.startsWith(p));
    const isEntry = ENTRY_ROUTES.some((p) => pathname.startsWith(p));


    const route = (hasSession: boolean) => {
      if (cancelled) return;
      if (!hasSession && !isPublic) {
        navigate({ to: "/welcome", replace: true });
      } else if (hasSession && isEntry) {
        // Account already exists on this device — never ask again.
        navigate({ to: "/", replace: true });
      }
    };

    // getSession() restores the saved session from this device's storage, so a
    // returning user lands straight on the feed without signing in again.
    void (async () => {
      await consumeOAuthRedirectTokens();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      resetForNewAccount(queryClient, data.session?.user.id ?? null);
      route(!!data.session);
      if (data.session) {
        void import("@/lib/api/profile-sync").then((m) => m.ensureProfile().catch(() => {}));
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION") {
        // Fires once storage is read — covers slow restores on mobile browsers.
        resetForNewAccount(queryClient, session?.user.id ?? null);
        route(!!session);
        return;
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      if (event === "SIGNED_OUT") {
        // Leaving the account clears every cached screen for the next person.
        resetForNewAccount(queryClient, null);
        navigate({ to: "/welcome", replace: true });
      } else {
        // A different Gmail account starts completely fresh: no old feed,
        // stories, posts, chats or profile left behind.
        resetForNewAccount(queryClient, session?.user.id ?? null);
        void import("@/lib/api/profile-sync").then((m) => m.ensureProfile().catch(() => {}));
      }
      router.invalidate();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname, navigate, router, queryClient]);



  // Presence heartbeat — pings the server every 60s so the Digital Twin
  // knows when the user is offline and can auto-reply to DMs.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const ping = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const { heartbeat } = await import("@/lib/twin.functions");
        await heartbeat();
      } catch { /* offline is fine */ }
    };
    ping();
    timer = setInterval(() => { if (alive) ping(); }, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; if (timer) clearInterval(timer); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublicChrome = NO_CHROME_ROUTES.some((p) => pathname.startsWith(p));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PremiumProvider>
        <PersonalizationProvider>
        <AuthGate />
        {isPublicChrome ? (
          // Splash/auth screens paint their own full-bleed backdrop
          <Outlet />
        ) : (
          <div className="relative min-h-screen overflow-x-hidden">
            <Aurora />
            <div className="relative mx-auto min-h-screen w-full max-w-[480px] pb-32">
              <Outlet />
            </div>
            <SamFab />
            <BottomNav />
          </div>
        )}
        <IncomingCallListener />
        <Toaster position="top-center" />
        </PersonalizationProvider>
        </PremiumProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


