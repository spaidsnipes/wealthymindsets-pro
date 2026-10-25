/** ATHOS "Ask Spaidbot" on WM Pro: public doors only, one launcher, loads on click, retries after a failure. */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ATHOS_SPAIDBOT_ROUTES,
  SPAIDBOT_EMBED_SRC,
  isAthosSpaidbotRoute,
  loadAthosSpaidbot,
  shouldOfferAthosSpaidbot,
  type EmbedEnv,
} from "@/lib/spaidbot/athosSpaidbot";

import { SPAIDBOT_LAUNCHER_WORDS, SPAIDBOT_SCROLL_RESERVE_CSS, SpaidbotLauncherButton } from "./AthosSpaidbotLauncher";

const src = (p: string) => readFileSync(path.resolve(process.cwd(), "src", p), "utf8");

describe("route allow-list — one bot per screen", () => {
  it("is exactly the public signed-out doors", () => {
    expect([...ATHOS_SPAIDBOT_ROUTES].sort()).toEqual(["/legal", "/login", "/pricing", "/reset-password", "/signup", "/welcome"]);
  });
  it.each(["/login", "/signup", "/reset-password", "/pricing", "/welcome", "/legal", "/legal/terms", "/legal/privacy", "/legal/risk", "/legal/market-data"])("offers it on %s", (p) => {
    expect(isAthosSpaidbotRoute(p)).toBe(true);
    expect(shouldOfferAthosSpaidbot(p, { signedIn: false, checking: false })).toBe(true);
  });
  it.each(["/", "/charts", "/command-deck", "/desk", "/paper", "/journal", "/lounge", "/education", "/scanner", "/ai-bot", "/profile", "/settings", "/news", "/loginx", "/pricing-old", "/legalese", "/charts/login", "", null, undefined])("never on %s", (p) => {
    expect(isAthosSpaidbotRoute(p as string)).toBe(false);
    expect(shouldOfferAthosSpaidbot(p as string, { signedIn: false, checking: false })).toBe(false);
  });
  it("never for a signed-in member, nor while the session is still being checked", () => {
    expect(shouldOfferAthosSpaidbot("/pricing", { signedIn: true, checking: false })).toBe(false);
    expect(shouldOfferAthosSpaidbot("/login", { signedIn: false, checking: true })).toBe(false);
  });
  it("is mounted once, in the root layout, inside the auth provider", () => {
    const layout = src("app/layout.tsx");
    expect(layout.match(/<AthosSpaidbotLauncher \/>/g)).toHaveLength(1);
    expect(layout.indexOf("<AthosSpaidbotLauncher />")).toBeLessThan(layout.indexOf("</AuthProvider>"));
    expect(layout.indexOf("<AthosSpaidbotLauncher />")).toBeGreaterThan(layout.indexOf("<AuthProvider>"));
  });
});

describe("the launcher button", () => {
  const html = renderToStaticMarkup(<SpaidbotLauncherButton state="idle" onClick={() => {}} />);
  it("is a real button with the label, aria-label and data hook", () => {
    expect(html).toMatch(/^<button type="button" data-spaidbot-launcher=""/);
    expect(html).toContain('aria-label="Ask Spaidbot, ATH&#x27;s AI assistant"');
    expect(html).toContain(">Ask Spaidbot</span>");
    expect(html).not.toContain("aria-busy");
  });
  it("is at least 48x48, fixed bottom-right above the safe area, with a focus-visible outline", () => {
    expect(html).toContain("min-width:48px");
    expect(html).toContain("min-height:48px");
    expect(html).toContain("position:fixed");
    expect(html).toContain("right:16px");
    expect(html).toContain("bottom:calc(16px + env(safe-area-inset-bottom, 0px))");
    expect(html).toContain("focus-visible:outline");
  });
  it("reserves scroll room at the end of the public scroller, so nothing stays under it", () => {
    expect(SPAIDBOT_SCROLL_RESERVE_CSS).toContain('[data-scroll-owner="public-info"]');
    expect(SPAIDBOT_SCROLL_RESERVE_CSS).toContain("padding-bottom:calc(80px + env(safe-area-inset-bottom, 0px))");
    expect(src("components/layout/MainLayout.tsx")).toContain('data-scroll-owner="public-info"');
  });
  it("says loading (aria-busy) and offline-retry in words", () => {
    const loading = renderToStaticMarkup(<SpaidbotLauncherButton state="loading" onClick={() => {}} />);
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain("Loading Spaidbot…");
    const error = renderToStaticMarkup(<SpaidbotLauncherButton state="error" onClick={() => {}} />);
    expect(error).toContain("Spaidbot is offline — tap to retry");
    expect(error).not.toContain("disabled");
    expect(SPAIDBOT_LAUNCHER_WORDS.idle).toBe("Ask Spaidbot");
  });
  it("loads nothing at render — the embed is only injected from the click handler", () => {
    expect(html).not.toContain("<script");
    const component = src("components/spaidbot/AthosSpaidbotLauncher.tsx");
    expect(component).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
    expect(component.match(/loadAthosSpaidbot\(/g)).toHaveLength(1);
    expect(component.indexOf("loadAthosSpaidbot(")).toBeGreaterThan(component.indexOf("const onClick"));
  });
});

/* A fake DOM: enough of document/window to watch exactly what is injected. */
function fakeEnv() {
  const appended: Array<{ src: string; attrs: Record<string, string>; removed: boolean; onload: (() => void) | null; onerror: (() => void) | null }> = [];
  const env = {
    window: {} as { __spaidbotEmbed?: unknown },
    document: {
      createElement: () => {
        const s = { src: "", async: false, attrs: {} as Record<string, string>, removed: false, onload: null as (() => void) | null, onerror: null as (() => void) | null,
          setAttribute(n: string, v: string) { s.attrs[n] = v; }, remove() { s.removed = true; } };
        return s;
      },
      body: { appendChild: (n: (typeof appended)[number]) => { appended.push(n); return n; } },
    },
  };
  return { env: env as unknown as EmbedEnv, appended };
}

describe("loading the ATHOS embed", () => {
  let f: ReturnType<typeof fakeEnv>;
  beforeEach(() => { f = fakeEnv(); });

  it("injects the exact script once, with data-product=wmpro and data-open=1", async () => {
    const p1 = loadAthosSpaidbot(f.env);
    const p2 = loadAthosSpaidbot(f.env); // a double tap while loading
    expect(f.appended).toHaveLength(1);
    expect(f.appended[0].src).toBe("https://mission.abovethehilldev.online/spaidbot.js");
    expect(SPAIDBOT_EMBED_SRC).toBe(f.appended[0].src);
    expect(f.appended[0].attrs).toEqual({ "data-product": "wmpro", "data-open": "1" });
    f.appended[0].onload!();
    await expect(p1).resolves.toBe("loaded");
    await expect(p2).resolves.toBe("loaded");
  });

  it("does nothing when the embed is already mounted", async () => {
    f.env.window.__spaidbotEmbed = 1;
    await expect(loadAthosSpaidbot(f.env)).resolves.toBe("already");
    expect(f.appended).toHaveLength(0);
  });

  it("on error removes the failed tag, rejects, and a retry injects a fresh one", async () => {
    const first = loadAthosSpaidbot(f.env);
    f.appended[0].onerror!();
    await expect(first).rejects.toThrow();
    expect(f.appended[0].removed).toBe(true);
    const retry = loadAthosSpaidbot(f.env);
    expect(f.appended).toHaveLength(2);
    expect(f.appended[1].removed).toBe(false);
    f.appended[1].onload!();
    await expect(retry).resolves.toBe("loaded");
  });
});
