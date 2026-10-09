/**
 * Sheriff P1-5 (2026-10-08): opening the Connect drawer is a READ. It must not
 * open the Webull real-time socket; the stream starts only from the strip's
 * own Start control. And the drawer's setup ladder (stage names such as
 * DEPLOYED_SECRET_PRESENT, env-var names) renders only for the broker OWNER —
 * the server already sends members empty notes (operatorInternals.sentinel).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");

describe("Connect drawer — a read never opens a socket", () => {
  const panel = read("src/components/broker/BrokerConnectPanel.tsx");
  it("the real-time strip is mounted without autoStart", () => {
    expect(panel.length).toBeGreaterThan(10_000);
    expect(panel).toContain("<WebullRealTimeStrip />");
    expect(panel).not.toMatch(/<WebullRealTimeStrip[^>]*autoStart/);
  });
  it("the strip's default is no auto-start, and its Start control is explicit", () => {
    const strip = read("src/components/marketData/WebullRealTimeStrip.tsx");
    expect(strip).toContain("autoStart = false");
    expect(strip).toContain("`Start the ${symbol} real-time stream`");
  });
});

describe("Connect drawer — operator setup detail is the owner's", () => {
  const panel = read("src/components/broker/BrokerConnectPanel.tsx");
  it("the managed status and the capability ladder render only in the owner view", () => {
    expect(panel).toContain("{broker.managedConnection && ownerView ? (");
    // 2026-10-09: the ladder also takes the audience, for its Operator details disclosure.
    expect(panel).toMatch(/broker\.runtimeConnection && ownerView \? \([\s\S]{0,800}<CapabilityLadderStatus broker=\{broker\} operator=\{ownerView\} \/>/);
    expect(panel).toContain('{panelAudience === "OWNER" && <ProviderWireStrip');
  });
});
