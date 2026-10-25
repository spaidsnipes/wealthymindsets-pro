"use client";

/**
 * "Ask Spaidbot" — the ATHOS assistant's door on WM Pro's PUBLIC pages only.
 * Where it may appear and how the embed loads: src/lib/spaidbot/athosSpaidbot.ts.
 *
 * Signed-in rooms keep WM Pro's own in-app SpaidBot; this launcher never renders
 * there, and if the embed was opened on /login and the visitor then signs in,
 * its Shadow-DOM host is hidden on every non-public route.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { SPAIDBOT_HOST_SELECTOR, loadAthosSpaidbot, shouldOfferAthosSpaidbot } from "@/lib/spaidbot/athosSpaidbot";

export type SpaidbotLauncherState = "idle" | "loading" | "error";

export const SPAIDBOT_LAUNCHER_WORDS: Readonly<Record<SpaidbotLauncherState, string>> = {
  idle: "Ask Spaidbot",
  loading: "Loading Spaidbot…",
  error: "Spaidbot is offline — tap to retry",
};

export const SPAIDBOT_SCROLL_RESERVE_CSS =
  '[data-scroll-owner="public-info"]{padding-bottom:calc(80px + env(safe-area-inset-bottom, 0px));scroll-padding-bottom:calc(80px + env(safe-area-inset-bottom, 0px))}';

export function SpaidbotLauncherButton({ state, onClick }: { state: SpaidbotLauncherState; onClick: () => void }) {
  return (
    <button
      type="button"
      data-spaidbot-launcher=""
      aria-label={state === "idle" ? "Ask Spaidbot, ATH's AI assistant" : SPAIDBOT_LAUNCHER_WORDS[state]}
      aria-busy={state === "loading" ? "true" : undefined}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full border-0 px-4 font-semibold shadow-lg focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-white"
      style={{
        position: "fixed",
        right: 16,
        bottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
        zIndex: 2147483000,
        minWidth: 48,
        minHeight: 48,
        maxWidth: "calc(100vw - 32px)",
        background: state === "error" ? "#3A2A12" : "#C9A45C",
        color: state === "error" ? "#F3ECDF" : "#120D04",
        fontSize: 14,
        lineHeight: 1.2,
        cursor: state === "loading" ? "progress" : "pointer",
      }}
    >
      <span aria-hidden="true">✦</span>
      <span>{SPAIDBOT_LAUNCHER_WORDS[state]}</span>
    </button>
  );
}

export function AthosSpaidbotLauncher() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const offered = shouldOfferAthosSpaidbot(pathname, { signedIn: !!user, checking: loading });
  const [state, setState] = useState<SpaidbotLauncherState>("idle");
  const [loaded, setLoaded] = useState(false);
  // An embed already on the page (any source) means this door has nothing to do.
  // Read at render: the server and the first client render both have `offered`
  // false (the session is still being checked), so this cannot split hydration.
  const mounted = loaded || (typeof window !== "undefined" && !!(window as { __spaidbotEmbed?: unknown }).__spaidbotEmbed);

  // The embed lives outside React; keep it off every route this door is not offered on.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>(SPAIDBOT_HOST_SELECTOR).forEach((host) => { host.hidden = !offered; });
  }, [offered, state]);

  if (!offered || mounted) return null;

  const onClick = () => {
    if (state === "loading") return;
    setState("loading");
    loadAthosSpaidbot({ window, document } as never).then(
      () => { setLoaded(true); setState("idle"); },
      () => setState("error"),
    );
  };

  return (
    <>
      {/* A fixed bottom-right door over a full-width form covers whatever scrolls
          under it (390x844 /login: the "Sign In →" submit). Reserve room at the
          end of the public scroller so every control can be scrolled clear. */}
      <style>{SPAIDBOT_SCROLL_RESERVE_CSS}</style>
      <SpaidbotLauncherButton state={state} onClick={onClick} />
    </>
  );
}
