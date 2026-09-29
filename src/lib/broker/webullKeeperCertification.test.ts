import { describe, expect, it } from "vitest";
import { KEEPER_FRESH_MS, webullConnectedFromKeeper, webullStagesFromKeeper } from "./webullKeeperCertification";
import { computeCertificationLevel } from "./certification";
import type { KeeperResult } from "../marketData/webullSessionKeeper";

const NOW = Date.UTC(2026, 8, 29, 0, 5);
const rec = (over: Partial<KeeperResult> = {}, at = NOW - 5 * 60_000): KeeperResult => ({
  outcome: "TOKEN_NOT_REQUIRED", note: "", atMs: at, authMode: "SIGNED_KEYPAIR" as never,
  broker: { state: "CONNECTED", accountCount: 3, atMs: at },
  capabilities: { verdict: "FULLY_OPEN", stocks: "SNAPSHOT/legacy-sha1:OK", crypto: "CRYPTO/legacy-sha1:OK", futures: "SNAPSHOT/legacy-sha1:DENIED_ENTITLEMENT(403)", atMs: at },
  reconciliation: { state: "OK", accounts: 3, openOrders: 0, external: 0, unresolved: 0, ledger: "NONE_PERSISTED", atMs: at },
  ...over,
});
const status = (r: ReturnType<typeof webullStagesFromKeeper>, s: string) => r.find(x => x.stage === s)?.status;

describe("Webull certification reads the keeper's record (G3/G4, 2026-09-29)", () => {
  it("a fresh healthy record certifies the five read stages — READ_ONLY, not NONE", () => {
    const r = webullStagesFromKeeper(rec(), NOW);
    for (const s of ["auth", "account_discovery", "capabilities", "read_market_data", "read_account_state", "reconnect_reconcile"]) expect(status(r, s), s).toBe("PASS");
    expect(computeCertificationLevel("webull", r).level).toBe("READ_ONLY");
    expect(webullConnectedFromKeeper(rec(), NOW)).toBe(true);
  });
  it("order stages are BLOCKED by design, never PENDING", () => {
    const r = webullStagesFromKeeper(rec(), NOW);
    for (const s of ["submit_order", "acknowledgement", "partial_full_fill", "cancel_order", "journal_receipt"]) expect(status(r, s), s).toBe("BLOCKED");
  });
  it("a denied futures rung is a correct denial — capabilities still PASS, and the denial is named", () => {
    const r = webullStagesFromKeeper(rec(), NOW);
    expect(r.find(x => x.stage === "capabilities")?.note).toContain("futures SNAPSHOT/legacy-sha1:DENIED_ENTITLEMENT(403)");
  });
  it("BREAK: no record → PENDING auth, connected UNKNOWN (null), never false", () => {
    const r = webullStagesFromKeeper(null, NOW);
    expect(status(r, "auth")).toBe("PENDING");
    expect(webullConnectedFromKeeper(null, NOW)).toBeNull();
  });
  it("BREAK: a stale record certifies nothing (green is perishable)", () => {
    const old = rec({}, NOW - KEEPER_FRESH_MS - 60_000);
    const r = webullStagesFromKeeper(old, NOW);
    expect(r.filter(x => x.status === "PASS")).toHaveLength(0);
    expect(webullConnectedFromKeeper(old, NOW)).toBeNull();
  });
  it("BREAK: REAUTH_REQUIRED fails auth by name; a partial reconciliation is not a pass", () => {
    expect(status(webullStagesFromKeeper(rec({ outcome: "REAUTH_REQUIRED" }), NOW), "auth")).toBe("FAIL");
    const partial = rec({ reconciliation: { state: "PARTIAL", accounts: 3, openOrders: 0, external: 0, unresolved: 0, ledger: "KV", unreadable: ["CASH:429"], atMs: NOW - 60_000 } });
    expect(status(webullStagesFromKeeper(partial, NOW), "read_account_state")).toBe("PENDING");
  });
});

describe("reconnect_reconcile needs a complete, readable, fully-resolved comparison", () => {
  it("BREAK: an unresolved WM order fails it; an unreadable ledger leaves it pending", () => {
    const unresolved = rec({ reconciliation: { state: "OK", accounts: 3, openOrders: 1, external: 0, unresolved: 1, ledger: "KV", atMs: NOW - 60_000 } });
    expect(status(webullStagesFromKeeper(unresolved, NOW), "reconnect_reconcile")).toBe("FAIL");
    const unreadable = rec({ reconciliation: { state: "OK", accounts: 3, openOrders: 0, external: 0, unresolved: 0, ledger: "UNREADABLE", atMs: NOW - 60_000 } });
    expect(status(webullStagesFromKeeper(unreadable, NOW), "reconnect_reconcile")).toBe("PENDING");
  });
});

import { withWebullKeeperEvidence } from "./webullKeeperCertification";
import { certifySource } from "../marketData/sourceCapabilityCertification";

describe("G4 — market-data certification fills UNOBSERVED Webull rows from the fresh keeper record", () => {
  const staleCanary = () => certifySource("webull", [{ capability: "TICKS", status: "ACTIVE_DEGRADED", fidelity: "SNAPSHOT", note: "stale canary" }]);
  const row = (c: ReturnType<typeof withWebullKeeperEvidence>, cap: string) => c.rows.find(r => r.capability === cap)!;
  it("PRICE snapshot, ACCOUNT certified, ORDERS read-only, FUTURES blocked by entitlement", () => {
    const c = withWebullKeeperEvidence(staleCanary(), rec(), NOW);
    expect(row(c, "PRICE").status).toBe("ACTIVE_DEGRADED");
    expect(row(c, "ACCOUNT").status).toBe("ACTIVE_CERTIFIED");
    expect(row(c, "ORDERS").note).toContain("read-only");
    expect(row(c, "FUTURES").status).toBe("BLOCKED_ENTITLEMENT");
  });
  it("never overwrites a row the probe observed", () => {
    expect(row(withWebullKeeperEvidence(staleCanary(), rec(), NOW), "TICKS").note).toBe("stale canary");
  });
  it("BREAK: a stale or missing record fills nothing", () => {
    expect(withWebullKeeperEvidence(staleCanary(), null, NOW)).toEqual(staleCanary());
    expect(row(withWebullKeeperEvidence(staleCanary(), rec({}, NOW - KEEPER_FRESH_MS - 1), NOW), "ACCOUNT").status).toBe("NOT_IMPLEMENTED");
  });
});
