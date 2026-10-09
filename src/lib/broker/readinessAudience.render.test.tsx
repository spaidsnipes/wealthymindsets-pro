/**
 * /readiness (Connections) — TWO AUDIENCES, RENDERED (2026-10-09).
 *
 * Any member reaches this page from the Depth sheet's "Check connections →".
 * The operator's counts ("7/10 providers configured", "13/40 required names
 * present · Values stay sealed in approved runtime stores") are the operator's.
 * A member reads trader words only: which markets and brokers they can use
 * here, and in what state.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const slots = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  // useState is POSITIONAL: the page's first useState is its load state, the second its certification state.
  const useState = (initial: unknown) => {
    const index = slots.index++;
    const value = index in slots.values ? slots.values[index] : typeof initial === "function" ? (initial as () => unknown)() : initial;
    return [value, () => {}];
  };
  const useEffect = () => {};
  return { ...actual, default: { ...actual, useState, useEffect }, useState, useEffect };
});
vi.mock("@/components/os/osStandingContext", () => ({ usePublishOsStanding: () => {} }));
vi.mock("@/components/broker/BrokerConnectPanel", () => ({ BrokerConnectPanel: () => null }));

import ReadinessPage from "@/app/readiness/page";
import { MEMBER_BROKER_LINE, MEMBER_CONNECTIONS_FORBIDDEN, memberConnections } from "./memberConnectionsWords";
import { selectReadinessWireboard } from "./selectReadinessWireboard";
import type { ProviderReadiness } from "./providerReadiness";

afterEach(() => { slots.values = []; slots.index = 0; });

const p = (provider: ProviderReadiness["provider"], label: string, lane: ProviderReadiness["lane"], status: ProviderReadiness["status"], missing: string[] = []): ProviderReadiness =>
  ({ provider, label, lane, status, missing, missingRecommended: [], note: missing.length ? "missing host secrets" : "presence" });

const PROVIDERS: ProviderReadiness[] = [
  p("webull-data", "Webull market data", "market-data", "CONFIGURED"),
  p("webull-broker", "Webull broker execution", "broker", "CONFIGURED"),
  p("tastytrade", "Tastytrade", "broker", "CONFIGURED"),
  p("moomoo", "Moomoo (OpenD bridge)", "broker", "BLOCKED", ["MOOMOO_BRIDGE_URL", "MOOMOO_BRIDGE_TOKEN"]),
  p("finnhub", "Finnhub market data", "market-data", "BLOCKED", ["FINNHUB_KEY"]),
  p("livekit", "LiveKit realtime (Lounge)", "realtime", "CONFIGURED"),
];
const ENV = [{ name: "FINNHUB_KEY", present: false }, { name: "WEBULL_APP_KEY", present: true }, { name: "TASTYTRADE_CLIENT_SECRET", present: true }];

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

function renderMember(): string {
  // What the route hands a non-operator: status only — no missing names, no env inventory, no tally.
  const trimmed = PROVIDERS.map(x => ({ ...x, missing: [], missingRecommended: [], note: "" }));
  slots.values = [{ phase: "guest", connections: memberConnections(trimmed) }, { phase: "loading" }];
  slots.index = 0;
  return renderToStaticMarkup(<ReadinessPage />);
}

function renderOwner(): string {
  const wireboard = selectReadinessWireboard({ audience: "OWNER", providers: PROVIDERS, envPresence: ENV, nearMisses: [], accountService: { configured: true, missing: [] } }, [], []);
  slots.values = [{ phase: "ready", wireboard }, { phase: "loading" }];
  slots.index = 0;
  return renderToStaticMarkup(<ReadinessPage />);
}

describe("a MEMBER on the Connections page reads trader words only", () => {
  it("no operator count, no variable name, no setup word — anywhere on the page", () => {
    const html = renderMember();
    const seen = text(html);
    expect(seen.length).toBeGreaterThan(200);
    expect(seen).not.toMatch(/providers configured/i);
    expect(seen).not.toMatch(/required names present/i);
    expect(seen).not.toMatch(/runtime stores/i);
    expect(seen).not.toMatch(/\b\d+\s*\/\s*\d+\b/);                                  // no "7/10", no "13/40"
    expect(seen).not.toMatch(/\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{2,}\b/);                 // no FINNHUB_KEY-shaped name
    expect(seen).not.toMatch(/OpenD|host secret|Account service|SETUP PRESENT|Name mismatch/i);
    expect(html).not.toContain("data-provider=");                                   // the operator's wireboard rows are not rendered
  });

  it("which markets and brokers they can use, and in what state", () => {
    const html = renderMember();
    expect(html).toContain('data-testid="readiness-member-connections"');
    const seen = text(html);
    expect(seen).toContain("Your charts already run on WM's market data.");
    expect(seen).toContain("Webull market data Set up on WM Pro — it can supply your charts when its feed is answering");
    expect(seen).toContain("Finnhub market data Not set up on WM Pro right now — your charts use WM's other sources");
    expect(seen).toContain("tastytrade The operator's own account — not available to members");
    expect(seen).toContain("moomoo The operator's own account — not available to members");
    expect(seen).toContain("Lounge live rooms Set up on WM Pro");
    expect(seen).toContain(MEMBER_BROKER_LINE);
    // No broker is offered to a member as available.
    expect(html.match(/data-member-provider="(?:webull-broker|tastytrade|moomoo)" data-available="no"/g)).toHaveLength(3);
    // Presence is never worded as connected or live.
    const block = text(html.slice(html.indexOf('data-testid="readiness-member-connections"'), html.indexOf('data-testid="readiness-member-broker-line"')));
    expect(block.length).toBeGreaterThan(100);
    expect(block).not.toMatch(/\bconnected\b|\bLIVE\b|is live|certified/);
  });

  it("the words owner agrees with its own forbidden list, for any payload", () => {
    const c = memberConnections(PROVIDERS);
    expect(c.rows).toHaveLength(PROVIDERS.length);
    for (const r of c.rows) expect(`${r.name} ${r.state}`, r.provider).not.toMatch(MEMBER_CONNECTIONS_FORBIDDEN);
    expect(c.rows.map(r => r.group)).toEqual(["Market data", "Market data", "Brokers", "Brokers", "Brokers", "Live rooms"]);
    expect(memberConnections(null).rows).toEqual([]);
    // An unknown provider's operator label loses its parenthesised setup words.
    expect(memberConnections([{ provider: "new-x", label: "New X (bridge on host)", lane: "market-data", status: "CONFIGURED" }]).rows[0]!.name).toBe("New X");
  });
});

describe("the OWNER still reads the operator's counts", () => {
  it("providers configured, required names present, and the wireboard rows", () => {
    const seen = text(renderOwner());
    expect(seen).toContain("Providers configured");
    expect(seen).toContain("4/6 providers configured");
    expect(seen).toContain("Required names present");
    expect(seen).toContain("2/3");
    expect(seen).toContain("Values stay sealed in approved runtime stores.");
    expect(renderOwner()).toContain('data-provider="finnhub"');
    expect(renderOwner()).not.toContain('data-testid="readiness-member-connections"');
  });
});

describe("the route and the page agree on who is who", () => {
  it("a non-operator's receipt carries no tally, no names; the page turns it into the member view", () => {
    const route = readFileSync(path.join(process.cwd(), "src/app/api/broker/readiness/route.ts"), "utf8");
    const member = route.slice(route.indexOf('audience: "GUEST"'), route.indexOf('audience: "OWNER"'));
    expect(member.length).toBeGreaterThan(100);
    expect(member).toContain('summary: "",');
    expect(member).toContain("providers: providers.map((p) => ({ ...p, missing: [], missingRecommended: [], note: \"\" })),");
    expect(member).toContain("envPresence: [],");
    expect(member).toContain("nearMisses: [],");
    expect(member).not.toContain("readinessSummary(providers)");
    const page = readFileSync(path.join(process.cwd(), "src/app/readiness/page.tsx"), "utf8");
    expect(page).toContain('if (payload.audience === "GUEST") { if (!cancelled) setState({ phase: "guest", connections: memberConnections(payload.providers) }); return; }');
  });
});
