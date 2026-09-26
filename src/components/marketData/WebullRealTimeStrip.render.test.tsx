/**
 * THE STRIP DRAWS THE DECAYED STANDING, NOT THE RAW REDUCER STATE.
 * (2026-09-26, verifier finding on 686cb0b)
 *
 * `readWebullStreamStanding` is tested on its own, but nothing proved the
 * component renders its answer (`shown`) rather than the reducer's `state`.
 * Swapping `{shown.headline}` → `{state.headline}` (or detail, or the phase
 * colour) survived the whole suite: the strip would say FLOWING about a feed
 * that went quiet minutes ago, which is the exact defect the decay exists for.
 *
 * INSTRUMENT. There is no DOM environment in this repo (no jsdom, no
 * happy-dom, no @testing-library/react — see ShellAccessParity.test.tsx), so
 * effects and a live EventSource cannot run here. Instead the ONE quote is fed
 * through the real reducer (handshake → subscribe → quote) and that fed state
 * is what the component's `useState` starts from; the house feed clock is
 * pinned to a chosen instant. The render is real `renderToStaticMarkup` of the
 * shipped component, asserted on the markup.
 */
import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LIVE_STALENESS_BUDGET_MS } from "@/lib/os/osChrome";

const RECEIVED_AT = "2026-09-26T14:30:00.000Z";
const RECEIVED_MS = Date.parse(RECEIVED_AT);

const clock = vi.hoisted(() => ({ now: 0 }));

vi.mock("@/lib/marketData/useProvenSessionClosure", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/marketData/useProvenSessionClosure")>()),
  useFeedEvaluationClock: () => clock.now,
}));

vi.mock("@/lib/marketData/webullStreamState", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/marketData/webullStreamState")>();
  // One quote, fed through the real reducer exactly as the strip's listener does.
  const fed = [
    { kind: "handshake", accepted: true, credentialRejected: false, connAck: null, note: "accepted" },
    { kind: "subscribe", subscribed: true, status: 200, providerCode: null, note: "subscribed" },
    { kind: "quote", topic: "QUOTE", receivedAt: RECEIVED_AT, payload: { bid: 1, ask: 2 } },
  ].reduce(
    (s, e) => actual.reduceWebullStream(s, e as Parameters<typeof actual.reduceWebullStream>[1]),
    actual.openingWebullStreamState(["QUOTE"]),
  );
  return { ...actual, initialWebullStreamState: fed };
});

const { default: WebullRealTimeStrip } = await import("./WebullRealTimeStrip");
const { initialWebullStreamState } = await import("@/lib/marketData/webullStreamState");

const GREEN = "rgb(0,192,118)";
const GREEN_HEX = "#00c076";

function renderAt(nowMs: number): { html: string; phase: string; headline: string; color: string } {
  clock.now = nowMs;
  const html = renderToStaticMarkup(<WebullRealTimeStrip symbol="AAPL" />);
  const phase = /data-webull-stream-phase="([^"]+)"/.exec(html)?.[1] ?? "";
  const headlineMatch = /<span[^>]*style="color:\s*([^;"]+)[^"]*"[^>]*data-webull-stream-headline[^>]*>([^<]*)<\/span>/.exec(html);
  return { html, phase, headline: headlineMatch?.[2] ?? "", color: (headlineMatch?.[1] ?? "").trim().toLowerCase() };
}

describe("WebullRealTimeStrip — renders the decayed standing, not the raw reducer state", () => {
  it("the fed state really is FLOWING after one quote (the premise)", () => {
    expect(initialWebullStreamState.phase).toBe("FLOWING");
    expect(initialWebullStreamState.lastMessageAt).toBe(RECEIVED_AT);
  });

  it("inside the live budget it shows FLOWING (control: the probe discriminates)", () => {
    const r = renderAt(RECEIVED_MS + 1_000);
    expect(r.phase).toBe("FLOWING");
    expect(r.headline).toBe(initialWebullStreamState.headline);
    expect(r.headline).not.toMatch(/^Silent/);
  });

  it("past LIVE_STALENESS_BUDGET_MS it shows SILENT — headline, detail, phase and colour", () => {
    const r = renderAt(RECEIVED_MS + LIVE_STALENESS_BUDGET_MS + 5_000);
    expect(r.phase).toBe("SILENT");
    expect(r.headline).toMatch(/^Silent/);
    expect(r.headline).not.toBe(initialWebullStreamState.headline);
    // Detail is the decayed sentence, not the reducer's FLOWING detail.
    expect(r.html).toContain("The count is history, not a current feed.");
    expect(r.html).not.toContain(initialWebullStreamState.detail);
    // Colour is the SILENT amber, never green and never FLOWING's ivory.
    expect(r.color).not.toBe(GREEN);
    expect(r.color).not.toBe(GREEN_HEX);
    expect(r.color).toBe("#f0b429");
  });
});
