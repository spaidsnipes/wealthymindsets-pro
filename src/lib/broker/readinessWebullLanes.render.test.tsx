/**
 * SURFACE B — /readiness, the two Webull rows, RENDERED. (2026-09-25)
 *
 * MEASURED on serving, 2026-09-25 14:51 CDT: "Webull market data · MARKET-DATA
 * · SETUP PRESENT · Setup present — NOT MEASURED. No live probe exists for this
 * provider yet" — while the market-data probe existed and had answered 403
 * MARKET_DATA_NOT_SUBSCRIBED on the same runtime.
 *
 * This renders the real page component with its load state set to what the
 * page's own effect would compute from today's receipts (the effect itself is
 * stubbed — this is a node environment with no fetch to run it), and reads the
 * two rows out of the markup a human sees.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const slots = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // useState is POSITIONAL here: the page's first useState is its load state,
  // the second its certification state. Everything else keeps its initial.
  const useState = (initial: unknown) => {
    const index = slots.index++;
    const value = index in slots.values
      ? slots.values[index]
      : typeof initial === "function" ? (initial as () => unknown)() : initial;
    return [value, () => {}];
  };
  const useEffect = () => {};
  return { ...actual, default: { ...actual, useState, useEffect }, useState, useEffect };
});
vi.mock("@/components/os/osStandingContext", () => ({ usePublishOsStanding: () => {} }));
vi.mock("@/components/broker/BrokerConnectPanel", () => ({ BrokerConnectPanel: () => null }));

import ReadinessPage from "@/app/readiness/page";
import { selectReadinessWireboard } from "./selectReadinessWireboard";
import type { ProviderReadiness } from "./providerReadiness";
import {
  WEBULL_LANE_PROVIDERS,
  selectWebullLanes,
  webullWireboardMeasurements,
  type WebullBrokerLaneReceipt,
  type WebullDataLaneReceipt,
} from "./webullStatus";

afterEach(() => { slots.values = []; slots.index = 0; });

const BROKER_CONNECTED: WebullBrokerLaneReceipt = {
  connected: true,
  state: "CONNECTED",
  accountCount: 3,
  note: "Signed read access to the Webull account list is proven. Order preview and execution remain separately gated.",
  checkedAt: "2026-09-25T19:51:45Z",
};

const DATA_ENTITLEMENT: WebullDataLaneReceipt = {
  state: "BLOCKED_ENTITLEMENT",
  label: "ENTITLEMENT BLOCKED",
  requestedAt: "2026-09-25T19:51:44Z",
  httpStatus: 403,
  providerCode: "MARKET_DATA_NOT_SUBSCRIBED",
  note: "Webull answered MARKET_DATA_NOT_SUBSCRIBED to this signed request, so no tick observation was returned.",
  receiving: false,
  eventCount: 0,
};

const configured = (provider: ProviderReadiness["provider"], label: string, lane: ProviderReadiness["lane"]): ProviderReadiness => ({
  provider, label, lane, status: "CONFIGURED", missing: [], missingRecommended: [], note: "presence",
});

/** The /api/broker/readiness payload as serving shows it: both webull rows SETUP PRESENT. */
const PAYLOAD = {
  providers: [
    configured("webull-data", "Webull market data", "market-data"),
    configured("webull-broker", "Webull broker execution", "broker"),
    configured("tastytrade", "Tastytrade", "broker"),
  ],
};

/** Exactly what the page's effect computes, fed to the page's first useState. */
function renderPage(broker: WebullBrokerLaneReceipt | null, data: WebullDataLaneReceipt | null): string {
  const lanes = selectWebullLanes({ broker, data });
  const wireboard = selectReadinessWireboard(
    PAYLOAD,
    webullWireboardMeasurements(lanes),
    Object.values(WEBULL_LANE_PROVIDERS),
  );
  slots.values = [{ phase: "ready", wireboard }, { phase: "loading" }];
  slots.index = 0;
  return renderToStaticMarkup(<ReadinessPage />);
}

/** The visible text of the one <li> row for `provider`. */
function rowText(html: string, provider: string): string {
  const start = html.indexOf(`data-provider="${provider}"`);
  expect(start, `row ${provider} was not rendered`).toBeGreaterThan(-1);
  const liStart = html.lastIndexOf("<li", start);
  const liEnd = html.indexOf("</li>", start);
  return html.slice(liStart, liEnd)
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function rowTag(html: string, provider: string): string {
  const start = html.indexOf(`data-provider="${provider}"`);
  return html.slice(html.lastIndexOf("<li", start), html.indexOf(">", start) + 1);
}

describe("Surface B · /readiness renders both Webull lanes from their measurements", () => {
  it("the market-data row says ENTITLEMENT BLOCKED · MEASURED LIVE · 403 MARKET_DATA_NOT_SUBSCRIBED at <time>", () => {
    const html = renderPage(BROKER_CONNECTED, DATA_ENTITLEMENT);
    const text = rowText(html, "webull-data");
    expect(text).toContain("Webull market data");
    expect(text).toContain("ENTITLEMENT BLOCKED · MEASURED LIVE · 403 MARKET_DATA_NOT_SUBSCRIBED at 2026-09-25T19:51:44Z");
    expect(text).toContain(
      "Founder action: Enable the Webull OpenAPI market-data subscription (an entitlement, not a credential).",
    );
    expect(rowTag(html, "webull-data")).toContain('data-measured="live"');
    expect(rowTag(html, "webull-data")).toContain('data-blocker-class="ENTITLEMENT BLOCKED"');
  });

  it("the market-data row NEVER says NOT MEASURED when a 403 receipt exists", () => {
    const text = rowText(renderPage(BROKER_CONNECTED, DATA_ENTITLEMENT), "webull-data");
    expect(text).not.toContain("NOT MEASURED");
    expect(text).not.toContain("No live probe exists");
    expect(text).not.toContain("SETUP PRESENT");
  });

  it("the broker row still says CONNECTED · MEASURED LIVE, from the account lane alone", () => {
    const html = renderPage(BROKER_CONNECTED, DATA_ENTITLEMENT);
    const text = rowText(html, "webull-broker");
    expect(text).toContain("Webull broker execution");
    expect(text).toContain("CONNECTED · MEASURED LIVE at 2026-09-25T19:51:45Z");
    expect(text).not.toContain("MARKET_DATA_NOT_SUBSCRIBED");
    expect(text).not.toContain("Founder action");
    expect(rowTag(html, "webull-broker")).toContain('data-blocker-class="CONNECTED"');
  });

  it("an unanswered data probe is NOT MEASURED — and does not claim that no probe exists", () => {
    const text = rowText(renderPage(BROKER_CONNECTED, null), "webull-data");
    expect(text).toContain("NOT MEASURED on this load. A live probe exists for this provider but did not answer");
    expect(text).not.toContain("No live probe exists");
    expect(text).not.toContain("ENTITLEMENT BLOCKED");
  });

  it("a provider with no probe at all keeps the honest 'no live probe exists' sentence", () => {
    const text = rowText(renderPage(BROKER_CONNECTED, DATA_ENTITLEMENT), "tastytrade");
    expect(text).toContain("Setup present — NOT MEASURED. No live probe exists for this provider yet");
  });

  it("an entitlement refusal is drawn amber, not in the rose of a broken wire", () => {
    const html = renderPage(BROKER_CONNECTED, DATA_ENTITLEMENT);
    const li = html.slice(html.lastIndexOf("<li", html.indexOf('data-provider="webull-data"')), html.indexOf("</li>", html.indexOf('data-provider="webull-data"')));
    const live = /<div class="([^"]+)" data-live-class="ENTITLEMENT BLOCKED"/.exec(li);
    expect(live, "the live block for the data row was not rendered").not.toBeNull();
    expect(live![1]).toContain("border-amber-400/30");
    expect(live![1]).not.toContain("rose");
  });
});
