/**
 * The ATHOS Spaidbot (ATH's education-only assistant, served by Mission Control)
 * — WHERE it may appear on WM Pro and HOW it is loaded.
 *
 * ONE BOT PER SCREEN. WM Pro already carries its own in-app SpaidBot
 * (src/lib/ai/geminiModel.ts, SPAIDBOT_LIMITER) inside the signed-in rooms. Two
 * bots on one screen is confusing (Founder order 2026-10-25), so the ATHOS
 * launcher is an explicit ALLOW-LIST of public, signed-out doors and nothing
 * else. Never /charts, /command-deck, or any signed-in room; never "/" either —
 * the bare domain is a server redirect (founderLanding.ts) and never renders.
 *
 * Nothing loads until the visitor clicks: no script, no cookie, no storage.
 */
import { PUBLIC_AUTH_PATHS, PUBLIC_INFO_PATHS } from "@/lib/authRoutes";

export const SPAIDBOT_EMBED_ORIGIN = "https://mission.abovethehilldev.online";
export const SPAIDBOT_EMBED_SRC = `${SPAIDBOT_EMBED_ORIGIN}/spaidbot.js`;
export const SPAIDBOT_PRODUCT = "wmpro";

/** The public doors, by name. Each also covers its sub-paths (/legal/terms …). */
export const ATHOS_SPAIDBOT_ROUTES = [...PUBLIC_AUTH_PATHS, ...PUBLIC_INFO_PATHS] as const;

export function isAthosSpaidbotRoute(pathname: string | null | undefined): boolean {
  if (typeof pathname !== "string") return false;
  return ATHOS_SPAIDBOT_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Public door AND a visitor known to be signed out (a member on /pricing sees the in-app bot's world). */
export function shouldOfferAthosSpaidbot(pathname: string | null | undefined, auth: { signedIn: boolean; checking: boolean }): boolean {
  return !auth.checking && !auth.signedIn && isAthosSpaidbotRoute(pathname);
}

/* ── Loader ─────────────────────────────────────────────────────────────── */

interface ScriptLike {
  src: string;
  async: boolean;
  onload: ((this: unknown, ev?: unknown) => unknown) | null;
  onerror: ((this: unknown, ev?: unknown) => unknown) | null;
  setAttribute(name: string, value: string): void;
  remove(): void;
}
export interface EmbedEnv {
  window: { __spaidbotEmbed?: unknown };
  document: { createElement(tag: "script"): ScriptLike; body: { appendChild(node: ScriptLike): unknown } };
}

let inFlight: Promise<"loaded" | "already"> | null = null;

/**
 * Inject the ATHOS embed ONCE. Resolves "already" when the embed is mounted,
 * "loaded" when the script loaded (the embed then mounts its own button + open
 * panel in Shadow DOM). Rejects on a network/script failure after REMOVING the
 * failed tag, so the next call injects a fresh one.
 */
export function loadAthosSpaidbot(env: EmbedEnv): Promise<"loaded" | "already"> {
  if (env.window.__spaidbotEmbed) return Promise.resolve("already");
  if (inFlight) return inFlight;
  inFlight = new Promise<"loaded" | "already">((resolve, reject) => {
    const script = env.document.createElement("script");
    script.src = SPAIDBOT_EMBED_SRC;
    script.async = true;
    script.setAttribute("data-product", SPAIDBOT_PRODUCT);
    script.setAttribute("data-open", "1");
    script.onload = () => { inFlight = null; resolve("loaded"); };
    script.onerror = () => { inFlight = null; script.remove(); reject(new Error("spaidbot embed failed to load")); };
    env.document.body.appendChild(script);
  });
  return inFlight;
}

/** The embed's Shadow-DOM host carries this attribute (athos-brain spaidbot-embed.mjs). */
export const SPAIDBOT_HOST_SELECTOR = "[data-spaidbot]";
