/**
 * WEBULL — ONE HISTORY (Sheriff P1-3, 2026-10-09): the readiness board, the
 * Connect card and the wire chip headline ONE observation (the certificate's
 * keeper record) with its own time; the live check is a separate line; a GET
 * writes nothing; a paused chip says why and what it last read.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { KeeperResult } from "@/lib/marketData/webullSessionKeeper";
import { webullConnectedFromKeeper, webullStagesFromKeeper } from "./webullKeeperCertification";
import { webullCertificateBlock, webullOneHistory } from "./webullOneHistory";
import { WIRE_PAUSED_LABEL, selectProviderWires, suspendedProviderWireView, webullLanesWireView } from "@/components/marketData/ProviderWireStrip";

const read = (p: string) => readFileSync(path.join(process.cwd(), p), "utf8");
const NOW = Date.parse("2026-10-09T05:30:00Z");
const record = (minAgo: number, broker: { state: string; accountCount: number } | null = { state: "CONNECTED", accountCount: 3 }): KeeperResult => ({
  outcome: "TOKEN_NOT_REQUIRED", note: "ok", atMs: NOW - minAgo * 60_000, authMode: "TOKENLESS",
  ...(broker ? { broker: { ...broker, atMs: NOW - minAgo * 60_000 } } : {}),
} as KeeperResult);
const clock = (iso: string) => iso.slice(11, 16);

describe("the certificate block is the SAME observation /api/broker/certification reads", () => {
  it("built by the same two keeper functions, with the newest stage time", () => {
    const r = record(9);
    const b = webullCertificateBlock(r, NOW);
    expect(b.connected).toBe(webullConnectedFromKeeper(r, NOW));
    expect(b.passedStages).toEqual(webullStagesFromKeeper(r, NOW).filter(s => s.status === "PASS").map(s => s.stage));
    expect(b.accountCount).toBe(3);
    expect(b.observedAt).toBe(new Date(NOW - 9 * 60_000).toISOString());
    expect(b.failedStages).toEqual(webullStagesFromKeeper(r, NOW).filter(s => s.status === "FAIL").map(s => s.stage));
  });
  it("no record → unknown, never a guessed false; a record past the freshness window → unknown with its time", () => {
    expect(webullCertificateBlock(null, NOW)).toMatchObject({ connected: null, accountCount: null, observedAt: null });
    const old = webullCertificateBlock(record(90), NOW);
    expect(old.connected).toBeNull();
    expect(old.observedAt).toBe(new Date(NOW - 90 * 60_000).toISOString());
  });
});

describe("one headline, one as-of; the live check is its own line", () => {
  const live = { connected: true, accountCount: 3, checkedAt: "2026-10-09T05:30:00.000Z" };
  it("record and live agree → the certificate's headline and time, the live check beside it", () => {
    const h = webullOneHistory(webullCertificateBlock(record(9), NOW), live, clock);
    expect(h).toMatchObject({ basis: "CERTIFICATE", connected: true, accountCount: 3, headline: "Account proved · 3 accounts", disagrees: false });
    expect(h.asOf).toBe("certificate record observed 05:21");
    expect(h.liveLine).toBe("live check 05:30: connected · 3 accounts");
  });
  it("record says not proved, live says connected → the headline stays the record's; the difference is SAID with both times", () => {
    const h = webullOneHistory(webullCertificateBlock(record(9, { state: "BLOCKED_AUTH", accountCount: 0 }), NOW), live, clock);
    expect(h.headline).toBe("Account not proved");
    expect(h.connected).toBe(false);
    expect(h.disagrees).toBe(true);
    expect(h.liveLine).toBe("live check 05:30: connected · 3 accounts — differs from the certificate's record, which updates on the keeper's next run");
  });
  it("stale record → 'Record too old to certify' with its time, plus the live line; no record → said as such", () => {
    const h = webullOneHistory(webullCertificateBlock(record(90), NOW), live, clock);
    expect(h).toMatchObject({ basis: "CERTIFICATE_UNKNOWN", connected: null, headline: "Record too old to certify" });
    expect(h.asOf).toBe("certificate record observed 04:00 — it updates on the keeper's next run");
    expect(h.liveLine).toBe("live check 05:30: connected · 3 accounts");
    expect(webullOneHistory(webullCertificateBlock(null, NOW), live, clock).headline).toBe("No certificate record");
  });
  it("an older payload without a certificate block keeps the live reading and says it is one", () => {
    const h = webullOneHistory(null, live, clock);
    expect(h.basis).toBe("LIVE_ONLY");
    expect(h.headline).toBe("Connected · 3 accounts");
    expect(h.asOf).toMatch(/live check — no certificate record on this response/);
  });
});

describe("the wire chip's BROKER lane reads the certificate", () => {
  const data = { label: "RECEIVING", detail: "ok", receiving: true, eventCount: 3 } as never;
  it("live says connected but the record says not proved → the chip says NOT PROVED, and the detail carries both times", () => {
    const cert = webullCertificateBlock(record(9, { state: "BLOCKED_AUTH", accountCount: 0 }), NOW);
    const v = webullLanesWireView({ broker: { connected: true, state: "CONNECTED", accountCount: 3, checkedAt: "2026-10-09T05:30:00.000Z", certificate: cert }, brokerPending: false, data, dataPending: false })!;
    expect(v.label).toMatch(/^BROKER NOT PROVED · DATA /);
    expect(v.detail).toContain("Broker lane headline: certificate record observed");
    expect(v.detail).toContain("differs from the certificate's record");
    // The chip prints the house clock (the trader's zone), the same as the card — never raw UTC.
    expect(v.detail).not.toMatch(/\d\d:\d\d:\d\d UTC/);
  });
  it("agreeing record → CONNECTED from the record; no certificate block → the live lane, unchanged", () => {
    const cert = webullCertificateBlock(record(9), NOW);
    const withCert = webullLanesWireView({ broker: { connected: true, state: "CONNECTED", accountCount: 3, certificate: cert }, brokerPending: false, data, dataPending: false })!;
    expect(withCert.label).toMatch(/^BROKER CONNECTED · /);
    const liveOnly = webullLanesWireView({ broker: { connected: true, state: "CONNECTED", accountCount: 3 }, brokerPending: false, data, dataPending: false })!;
    expect(liveOnly.label).toMatch(/^BROKER CONNECTED · /);
    expect(liveOnly.detail).not.toContain("Broker lane headline");
  });
});

describe("a paused strip says why, and never drops an earned state silently", () => {
  it("the pause names its reason and recovery in trader words", () => {
    expect(WIRE_PAUSED_LABEL).toBe("Paused while this tab is hidden — resumes when you return");
    expect(suspendedProviderWireView("webull").label).toBe(WIRE_PAUSED_LABEL);
  });
  it("what the wire last read is said beside the pause — as a past reading, not a current one", () => {
    const v = suspendedProviderWireView("tastytrade", { label: "Quote token ready", atMs: NOW });
    expect(v.tone).toBe("SUSPENDED");
    expect(v.label).toBe(`${WIRE_PAUSED_LABEL} · last read: Quote token ready`);
    expect(v.detail).toMatch(/Last read before the pause: "Quote token ready" at .* — not a current reading\./);
    const wires = selectProviderWires({ matrix: null, readiness: null, moomooTicks: null, longbridgeTicks: null, webullTicks: null, failures: new Set(), suspended: true, lastEarned: { tastytrade: { label: "Quote token ready", atMs: NOW } } });
    expect(wires.find(w => w.source === "tastytrade")!.label).toContain("last read: Quote token ready");
    expect(wires.find(w => w.source === "alpaca")!.label).toBe(WIRE_PAUSED_LABEL);
  });
  it("an earned verdict still outranks a pause (unchanged rule)", () => {
    const wires = selectProviderWires({ matrix: null, readiness: null, moomooTicks: null, longbridgeTicks: null, webullTicks: null, failures: new Set(["market"]), suspended: true });
    expect(wires.every(w => w.tone !== "SUSPENDED")).toBe(true);
  });
});

describe("wiring: one route, no write on GET, owner only", () => {
  it("the status route adds the block from the keeper record it already read; it has no setter / put / write", () => {
    const route = read("src/app/api/broker/webull/status/route.ts");
    expect(route.length).toBeGreaterThan(1000);
    expect(route).toContain("certificate: webullCertificateBlock(keeper, Date.now()),");
    expect(route.match(/readWebullKeeperRecord\(/g)?.length).toBe(1);
    expect(route).not.toMatch(/writeWebullKeeperRecord|\.put\(|export async function (POST|PUT|PATCH|DELETE)/);
    // Owner gate stands before the body is built.
    expect(route.indexOf("webullOwnerRefusal(owner)")).toBeLessThan(route.indexOf("webullCertificateBlock(keeper"));
  });
  it("the card headlines the certificate and prints the live check on its own line", () => {
    const card = read("src/components/broker/BrokerConnectPanel.tsx");
    expect(card).toContain('data-testid="webull-one-history"');
    expect(card).toContain("history && history.basis !== \"LIVE_ONLY\" ? history.headline");
    expect(card).toContain("{history.liveLine ?");
  });
});
