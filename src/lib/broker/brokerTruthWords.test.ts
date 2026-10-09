/** Sheriff P1-3 / P2 (2026-10-08): one honest word per claim. */
import { describe, expect, it } from "vitest";

import { CAPABILITY_CERT_STAGE, CAPABILITY_LEDGER, capabilityClaimWord, capabilityStateWord } from "./capabilityLedger";
import { CERT_STAGES } from "./certification";
import { fopStreamWords } from "./fopStreamWords";
import { tastyStreamReasonWords } from "./tastyQuoteStream";

describe("ARMED BY YOU only while both arms are on", () => {
  it("HUMAN_ARMED reads the arms; other states are unchanged", () => {
    expect(capabilityStateWord("HUMAN_ARMED", { device: true, server: true, killSwitch: false })).toBe("ARMED BY YOU");
    expect(capabilityStateWord("HUMAN_ARMED", { device: false, server: false, killSwitch: false })).toBe("DISARMED (device + server) — orders need your arm");
    expect(capabilityStateWord("HUMAN_ARMED", { device: true, server: false, killSwitch: false })).toMatch(/^DISARMED \(server\)/);
    expect(capabilityStateWord("HUMAN_ARMED", { device: false, server: true, killSwitch: false })).toMatch(/^DISARMED \(device\)/);
    expect(capabilityStateWord("HUMAN_ARMED", { device: true, server: true, killSwitch: true })).toBe("KILL SWITCH ON");
    expect(capabilityStateWord("HUMAN_ARMED", { device: null, server: true, killSwitch: false })).toBe("ARM UNREAD");
    expect(capabilityStateWord("LIVE", { device: false, server: false, killSwitch: false })).toBe("LIVE");
  });
});

describe("the certificate outranks the Settings map (one owner per claim)", () => {
  const ARMED = { device: true, server: true, killSwitch: false };
  const cert = (passed: string[], failed: string[] = [], blocked: string[] = []) => ({ passedStages: passed, failedStages: failed, blockedStages: blocked });
  it("every mapped stage is a real certificate stage", () => {
    for (const s of Object.values(CAPABILITY_CERT_STAGE)) expect(CERT_STAGES as readonly string[]).toContain(s);
  });
  it("Webull Cancel / Positions read LIVE only when the certificate proved the stage", () => {
    const cancel = CAPABILITY_LEDGER.find(r => r.provider === "Webull" && r.capability === "CANCEL")!;
    const positions = CAPABILITY_LEDGER.find(r => r.provider === "Webull" && r.capability === "POSITIONS")!;
    const c = cert(["auth", "account_discovery", "read_account_state"]);
    expect(capabilityClaimWord(positions, c, ARMED)).toBe("LIVE");
    if (cancel.state === "LIVE" || cancel.state === "HUMAN_ARMED" || cancel.state === "PARTIAL") {
      expect(capabilityClaimWord(cancel, c, ARMED)).toBe("BUILT · NOT PROVED (cancel order not yet certified)");
      expect(capabilityClaimWord(cancel, cert(["cancel_order"]), ARMED)).not.toMatch(/NOT PROVED/);
    }
  });
  it("failed / blocked / unread certificates are said as such; an execute row needs BOTH the certificate and the arms", () => {
    const exec = { capability: "EXEC_EQUITY" as const, state: "HUMAN_ARMED" as const };
    expect(capabilityClaimWord(exec, null, ARMED)).toBe("BUILT · CERTIFICATE UNREAD (submit order)");
    expect(capabilityClaimWord(exec, cert([], ["submit_order"]), ARMED)).toBe("BUILT · CERTIFICATE FAILED (submit order)");
    expect(capabilityClaimWord(exec, cert([], [], ["submit_order"]), ARMED)).toBe("BUILT · GATED (submit order not switched on)");
    expect(capabilityClaimWord(exec, cert([], ["auth"], ["submit_order"]), ARMED)).toBe("BUILT · CERTIFICATE BLOCKED (submit order)");
    expect(capabilityClaimWord(exec, cert(["submit_order"]), ARMED)).toBe("ARMED BY YOU");
    expect(capabilityClaimWord(exec, cert(["submit_order"]), { device: false, server: false, killSwitch: false })).toMatch(/^DISARMED/);
  });
  it("rows with no certificate stage keep their own word", () => {
    expect(capabilityClaimWord({ capability: "PNL", state: "RECONSTRUCTED" }, null, ARMED)).toBe("RECONSTRUCTED");
    expect(capabilityClaimWord({ capability: "DEPTH", state: "UNSUPPORTED" }, null, ARMED)).toBe("UNSUPPORTED");
  });
});

describe("futures options: LIVE only when the chain is quoting", () => {
  it("a live parent over blank cells is not LIVE", () => {
    const base = { chainStream: "LIVE", chainReason: null, parentStream: "LIVE", optionsAsked: 20 };
    expect(fopStreamWords({ ...base, optionsQuoted: 0 })).toEqual({ word: "FUTURE LIVE · option quotes not arriving yet", live: false });
    expect(fopStreamWords({ ...base, optionsQuoted: 20 })).toEqual({ word: "LIVE", live: true });
    expect(fopStreamWords({ ...base, optionsQuoted: 7 })).toEqual({ word: "LIVE · 7 of 20 quoted", live: true });
    expect(fopStreamWords({ ...base, chainStream: "CONNECTING", optionsQuoted: 0 }).word).toBe("CONNECTING");
    expect(fopStreamWords({ chainStream: "DEGRADED", chainReason: "reconnecting", parentStream: "DEGRADED", optionsAsked: 4, optionsQuoted: 0 })).toEqual({ word: "reconnecting", live: false });
  });
});

describe("tastytrade stream reasons in trader words", () => {
  it("never the feed's raw code", () => {
    expect(tastyStreamReasonWords("ERROR", "TIMEOUT")).toBe("tastytrade's live feed did not answer in time — reconnecting.");
    expect(tastyStreamReasonWords("ERROR", "UNAUTHORIZED")).toBe("tastytrade's live feed reported a problem — reconnecting.");
    expect(tastyStreamReasonWords("TOKEN")).toBe("WM Pro could not open tastytrade's live feed just now — trying again shortly.");
    expect(tastyStreamReasonWords("CLOSED")).toBe("tastytrade's live feed closed — reconnecting.");
    for (const w of [tastyStreamReasonWords("ERROR", "TIMEOUT The timeout for SETUP"), tastyStreamReasonWords("TOKEN")]) expect(w).not.toMatch(/TIMEOUT|SETUP|HTTP|error:/);
  });
});
