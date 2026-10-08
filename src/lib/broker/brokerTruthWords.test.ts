/** Sheriff P1-3 / P2 (2026-10-08): one honest word per claim. */
import { describe, expect, it } from "vitest";

import { capabilityStateWord } from "./capabilityLedger";
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
