/**
 * Garden 19 §30 — no dead "Ask SpaidBot" door in the Founder shell.
 * (chart lane serving read, 2026-10-07: on /charts nothing listened.)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { askSpaidbot, registerSpaidbotAskListener, rememberPendingAsk, spaidbotAskListened, takePendingAsk } from "@/lib/ai/spaidbotAsk";
import { SpaidbotAskHost } from "./SpaidbotAskHost";

const read = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");

describe("Ask SpaidBot — never a dead door", () => {
  it("an ask with nobody listening is refused (false) and dispatches nothing", () => {
    expect(spaidbotAskListened()).toBe(false);
    expect(askSpaidbot({ prompt: "What am I looking at?", context: {} })).toBe(false);
    const un = registerSpaidbotAskListener();
    expect(spaidbotAskListened()).toBe(true);
    un(); un(); // idempotent
    expect(spaidbotAskListened()).toBe(false);
  });

  it("the waiting ask is handed to the panel once", () => {
    rememberPendingAsk({ prompt: "q", context: {} });
    expect(takePendingAsk()).toEqual({ prompt: "q", context: {} });
    expect(takePendingAsk()).toBeNull();
  });

  it("the host renders NOTHING until an ask (no chrome in the Founder shell)", () => {
    expect(renderToStaticMarkup(React.createElement(SpaidbotAskHost))).toBe("");
    const src = read("components/ai/SpaidbotAskHost.tsx");
    expect(src.length).toBeGreaterThan(500);
    expect(src).toContain("<m.SpadeBotButton launcher={false} />");
    expect(src).toContain("rememberPendingAsk(ask)");
    expect(src).toMatch(/return mounted \? <LauncherlessSpaidBot \/> : null;/);
  });

  it("the panel without a launcher draws no floating button; the panel takes the waiting ask and pre-fills (never sends)", () => {
    const bot = read("components/layout/SpaidBotButton.tsx");
    expect(bot).toMatch(/\{launcher \? \(\s*<motion\.button/);
    expect(bot).toContain("const waiting = takePendingAsk();");
    expect(bot).toContain("if (waiting) apply(waiting);");
    expect(bot).toContain("const unregister = registerSpaidbotAskListener();");
  });

  it("the Ask button hides itself when nothing listens", () => {
    const btn = read("components/ai/AskSpaidbotButton.tsx");
    expect(btn).toContain("setListened(spaidbotAskListened())");
    expect(btn).toContain("if (!listened) return null;");
  });
});
