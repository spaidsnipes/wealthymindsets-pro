/**
 * SURFACE A — Settings › Connect brokers › CONNECTIONS grid, the webull cell.
 * (2026-09-25)
 *
 * MEASURED on serving, 2026-09-25 14:51 CDT: the cell read ONE red chip,
 * "WEBULL · Entitlement blocked", while the account lane was CONNECTED on the
 * same runtime. The Founder read it as "Webull is not connected".
 *
 * These render the cell a human actually reads — `ProviderWireCell`, through
 * `selectProviderWires`, the same path the strip takes — and assert on the
 * markup, not on the view-model it was built from.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProviderWireCell,
  selectProviderWires,
  type MoomooTickReceipt,
  type ProviderWireInputs,
} from "./ProviderWireStrip";
import type { WebullBrokerLaneReceipt, WebullDataLaneReceipt } from "@/lib/broker/webullStatus";

const GREEN = "#46d39a";
const AMBER = "#f0b429";
const RED = "#ff6b6b";

const BROKER_CONNECTED: WebullBrokerLaneReceipt = {
  connected: true,
  state: "CONNECTED",
  accountCount: 3,
  note: "Signed read access to the Webull account list is proven.",
  checkedAt: "2026-09-25T19:51:45Z",
};

/** The /api/market-data/webull/ticks body as serving returned it today (value-free). */
const DATA_ENTITLEMENT: MoomooTickReceipt & WebullDataLaneReceipt = {
  state: "BLOCKED_ENTITLEMENT",
  requestedAt: "2026-09-25T19:51:44Z",
  httpStatus: 403,
  providerCode: "MARKET_DATA_NOT_SUBSCRIBED",
  note: "Webull answered MARKET_DATA_NOT_SUBSCRIBED to this signed request, so no tick observation was returned.",
  label: "ENTITLEMENT BLOCKED",
  detail: "Webull answered MARKET_DATA_NOT_SUBSCRIBED to this signed request, so no tick observation was returned.",
  receiving: false,
  eventCount: 0,
};

const BASE: ProviderWireInputs = {
  matrix: null,
  readiness: null,
  moomooTicks: null,
  longbridgeTicks: null,
  webullTicks: null,
  failures: new Set<string>(),
  suspended: false,
};

function webullCell(inputs: Partial<ProviderWireInputs>, compact = true): string {
  const wire = selectProviderWires({ ...BASE, ...inputs }).find((w) => w.source === "webull")!;
  return renderToStaticMarkup(<ProviderWireCell wire={wire} compact={compact} />);
}

/** The inline colour of the lane span named `lane`, read from the markup. */
function laneColor(html: string, lane: "BROKER" | "DATA"): string | null {
  const m = new RegExp(`data-lane="${lane}"[^>]*style="color:\\s*([^;"]+)`).exec(html);
  return m ? m[1].trim().toLowerCase() : null;
}

/** Visible text only — attributes (aria-label, title) are asserted separately. */
const visibleText = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("Surface A · the webull cell says BOTH lanes", () => {
  it("today: BROKER CONNECTED in green, DATA NOT ENTITLED in amber", () => {
    const html = webullCell({ webullBroker: BROKER_CONNECTED, webullTicks: DATA_ENTITLEMENT });
    const text = visibleText(html);
    expect(text).toContain("webull");
    expect(text).toContain("BROKER CONNECTED");
    expect(text).toContain("DATA NOT ENTITLED");
    expect(laneColor(html, "BROKER")).toBe(GREEN);
    expect(laneColor(html, "DATA")).toBe(AMBER);
  });

  it("a connected broker lane NEVER renders as a single red blocked chip", () => {
    const html = webullCell({ webullBroker: BROKER_CONNECTED, webullTicks: DATA_ENTITLEMENT });
    expect(visibleText(html)).not.toContain("Entitlement blocked");
    expect(html.toLowerCase()).not.toContain(RED);
    expect(html).not.toContain('data-provider-tone="BLOCKED"');
    expect(html).toContain("data-wire-lanes");
  });

  it("the tooltip and the accessible name carry the Founder action and the measured 403", () => {
    const html = webullCell({ webullBroker: BROKER_CONNECTED, webullTicks: DATA_ENTITLEMENT });
    const aria = /aria-label="([^"]+)"/.exec(html)?.[1] ?? "";
    const title = /title="([^"]+)"/.exec(html)?.[1] ?? "";
    for (const attr of [aria, title]) {
      expect(attr).toContain("Enable the Webull OpenAPI market-data subscription (an entitlement, not a credential).");
      expect(attr).toContain("403 MARKET_DATA_NOT_SUBSCRIBED");
      expect(attr).toContain("broker lane CONNECTED");
    }
    expect(aria.startsWith("webull: BROKER CONNECTED · DATA NOT ENTITLED.")).toBe(true);
  });

  it("the non-compact strip (/command-deck) says both lanes too", () => {
    const text = visibleText(webullCell({ webullBroker: BROKER_CONNECTED, webullTicks: DATA_ENTITLEMENT }, false));
    expect(text).toContain("BROKER CONNECTED");
    expect(text).toContain("DATA NOT ENTITLED");
    expect(text).toContain("Founder action");
  });

  it("while the broker receipt is in flight the cell says CHECKING, not a lone red chip", () => {
    const html = webullCell({ webullBroker: null, webullTicks: DATA_ENTITLEMENT });
    const text = visibleText(html);
    expect(text).toContain("BROKER CHECKING");
    expect(text).toContain("DATA NOT ENTITLED");
    expect(html.toLowerCase()).not.toContain(RED);
  });

  it("while the data receipt is in flight the broker lane still reads CONNECTED", () => {
    const text = visibleText(webullCell({ webullBroker: BROKER_CONNECTED, webullTicks: null }));
    expect(text).toContain("BROKER CONNECTED");
    expect(text).toContain("DATA CHECKING");
  });

  it("an unanswered data probe is NOT MEASURED, never borrowed from the broker lane", () => {
    const text = visibleText(webullCell({ webullBroker: BROKER_CONNECTED, webullTicks: null, failures: new Set(["webull"]) }));
    expect(text).toContain("BROKER CONNECTED");
    expect(text).toContain("DATA NOT MEASURED");
  });

  it("an unanswered broker probe is NOT MEASURED, and the data lane keeps its own verdict", () => {
    const text = visibleText(webullCell({ webullBroker: null, webullTicks: DATA_ENTITLEMENT, failures: new Set(["webull-broker"]) }));
    expect(text).toContain("BROKER NOT MEASURED");
    expect(text).toContain("DATA NOT ENTITLED");
  });

  it("an identity rejection on the broker lane is still red — the ink follows the lane's own verdict", () => {
    const html = webullCell({
      webullBroker: { connected: false, state: "BLOCKED_AUTH", note: "401", checkedAt: "t" },
      webullTicks: DATA_ENTITLEMENT,
    });
    expect(visibleText(html)).toContain("BROKER AUTH BLOCKED");
    expect(laneColor(html, "BROKER")).toBe(RED);
    expect(laneColor(html, "DATA")).toBe(AMBER);
  });

  it("SENTINEL: whatever the data lane says, a CONNECTED broker lane is drawn green and the cell is never BLOCKED", () => {
    const dataReceipts: (MoomooTickReceipt & WebullDataLaneReceipt)[] = [
      DATA_ENTITLEMENT,
      { state: "BLOCKED_AUTH", label: "AUTH BLOCKED", requestedAt: "t", httpStatus: 401 },
      { state: "BLOCKED_AUTH", label: "AWAITING 2FA", awaiting2fa: true, requestedAt: "t" },
      { state: "ACCESS_UNPROVEN", label: "ACCESS UNPROVEN", requestedAt: "t" },
      { state: "RATE_LIMITED", label: "RATE LIMITED", requestedAt: "t" },
      { state: "UNCONFIGURED", label: "NOT CONFIGURED", requestedAt: "t" },
      { state: "OBSERVED", label: "RECEIVING", receiving: true, eventCount: 3, requestedAt: "t" },
    ];
    for (const data of dataReceipts) {
      const html = webullCell({ webullBroker: BROKER_CONNECTED, webullTicks: data });
      expect(visibleText(html), String(data.label)).toContain("BROKER CONNECTED");
      expect(laneColor(html, "BROKER"), String(data.label)).toBe(GREEN);
      expect(html, String(data.label)).not.toContain('data-provider-tone="BLOCKED"');
    }
  });

  it("a caller that does not read the broker lane keeps the old single-lane reading (no lane is invented)", () => {
    // `webullBroker` absent entirely: nothing about the account lane is known,
    // so nothing about it is drawn. The strip itself always passes it.
    const html = webullCell({ webullTicks: DATA_ENTITLEMENT });
    expect(html).not.toContain("data-wire-lanes");
    expect(visibleText(html)).toContain("Entitlement blocked");
  });
});
