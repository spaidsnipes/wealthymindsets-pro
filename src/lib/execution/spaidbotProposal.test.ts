import { describe, expect, it } from "vitest";

import { SPAIDBOT_PERMISSION, proposalToTicket, recordProposalEvent, validateProposal, type SpaidBotProposal } from "./spaidbotProposal";

const NOW = 1_000_000;
const P: SpaidBotProposal = {
  kind: "SPAIDBOT_PROPOSAL", proposalId: "sbp_1", decisionId: "wmd_abc", orderIntentId: "wmi_abcdef12", chartSymbol: "NQ1!",
  side: "BUY", entryPx: 25_000, stopPx: 24_950, targetPx: 25_100, qty: 3, reason: "Absorption at VAL held twice",
  evidence: [{ claim: "Two absorption slabs at 24,990", source: "tastytrade tape, 1m" }],
  permission: SPAIDBOT_PERMISSION, riskBoundaryUsd: 300, createdAtMs: NOW - 1_000, expiresAtMs: NOW + 60_000,
  audit: [{ atMs: NOW - 1_000, event: "PROPOSED", by: "SPAIDBOT" }],
};

describe("SpaidBot stops at PROPOSE (Garden 19 §24)", () => {
  it("a complete proposal loads into the ticket as a Limit with its stop, target and lineage", () => {
    const r = proposalToTicket(P, null, NOW);
    expect(r).toMatchObject({ ok: true, ticket: { side: "BUY", qty: 3, entryType: "Limit", limitPx: 25_000, stopPx: 24_950, targetPx: 25_100, decisionId: "wmd_abc", orderIntentId: "wmi_abcdef12" } });
  });
  it("size is clamped to the server cap — a proposal can never raise it", () => {
    const r = proposalToTicket(P, 1, NOW);
    expect(r.ok && r.ticket.qty).toBe(1);
  });
  it("it cannot widen its own permission", () => {
    const widened = { ...P, permission: "EXECUTE" } as unknown as SpaidBotProposal;
    expect(validateProposal(widened, NOW)).toMatchObject({ ok: false });
  });
  it("no Decision_ID, no ORDER_INTENT_ID, no evidence, wrong-side stop or target, or expired → refused", () => {
    for (const bad of [
      { ...P, decisionId: "" }, { ...P, orderIntentId: "x" }, { ...P, evidence: [] }, { ...P, evidence: [{ claim: "x", source: "" }] },
      { ...P, stopPx: 25_010 }, { ...P, targetPx: 24_000 }, { ...P, qty: 1.5 }, { ...P, reason: " " },
    ]) expect(validateProposal(bad, NOW).ok).toBe(false);
    expect(validateProposal(P, NOW + 120_000)).toMatchObject({ ok: false });
  });
  it("loading is written to the proposal's own audit trail", () => {
    const loaded = recordProposalEvent(P, "LOADED_INTO_TICKET", "TRADER", NOW);
    expect(loaded.audit.map(a => a.event)).toEqual(["PROPOSED", "LOADED_INTO_TICKET"]);
    expect(P.audit).toHaveLength(1);
  });
});
