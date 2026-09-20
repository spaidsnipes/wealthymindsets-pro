import { describe, expect, it } from "vitest";

import type { ScopedDecisionIdentity } from "@/lib/expressionShortlist";

import {
  DECISION_CONTINUITY_KEY_PREFIX,
  decisionContinuityKey,
  isDecisionContinuityStorageEvent,
  readSceneDecision,
  writeSceneDecision,
} from "./decisionContinuity";
import {
  DECISION_IDENTITY_LAW_VERSION,
  mintDecisionId,
  type DecisionIdentity,
} from "./decisionIdentity";

/**
 * A real identity, produced by the real pure minter. Hand-writing the object
 * would let this suite pass against a shape the minter no longer emits — the
 * exact drift these tests exist to catch.
 */
function bornIdentity(nonce = "11111111-2222-3333-4444-555555555555"): DecisionIdentity {
  const result = mintDecisionId({
    cause: "PERMISSION_GRANTED",
    deviceId: "dev_test",
    nowMs: 1_700_000_000_000,
    nonce,
  });
  if (!result.ok) throw new Error(`fixture could not be minted: ${result.reason}`);
  return result.identity;
}

function scoped(over: Partial<ScopedDecisionIdentity> = {}): ScopedDecisionIdentity {
  return { owner: "user-a", underlying: "AAPL", identity: bornIdentity(), ...over };
}

/** A storage double. Records writes so a silent-failure can be simulated. */
function makeStorage(seed: Record<string, string> = {}) {
  const map = new Map(Object.entries(seed));
  return {
    map,
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
  };
}

describe("B-501 · the key names the scene, not just the feature", () => {
  it("carries owner and underlying, in that order, under the purge prefix", () => {
    const key = decisionContinuityKey("user-a", "AAPL");
    expect(key).toBe(`${DECISION_CONTINUITY_KEY_PREFIX}user-a:AAPL`);
    // logoutIsolation purges by this prefix. If it ever stops matching, User B
    // inherits User A's decision on a shared browser.
    expect(key!.startsWith("wm:decision-identity:")).toBe(true);
  });

  it("refuses to name a scene that is missing a half", () => {
    // `wm:decision-identity:v1::AAPL` would be a REAL key that every
    // signed-out visitor to AAPL would share. Null is the only safe answer.
    expect(decisionContinuityKey("", "AAPL")).toBeNull();
    expect(decisionContinuityKey("user-a", "")).toBeNull();
    expect(decisionContinuityKey(null, "AAPL")).toBeNull();
    expect(decisionContinuityKey("user-a", undefined)).toBeNull();
    expect(decisionContinuityKey("   ", "AAPL")).toBeNull();
  });

  it("escapes separators so an owner cannot forge another scene's key", () => {
    // An owner id containing ':' could otherwise address a different scene.
    const sneaky = decisionContinuityKey("a:AAPL", "TSLA");
    const honest = decisionContinuityKey("a", "AAPL");
    expect(sneaky).not.toBe(honest);
    expect(sneaky).toContain("a%3AAAPL");
  });
});

describe("B-501 · a decision survives the tab that witnessed it", () => {
  it("round-trips the identity byte-for-byte", () => {
    const storage = makeStorage();
    const original = scoped();
    expect(writeSceneDecision(original, { storage, onChanged: () => {} })).toBe(true);

    const read = readSceneDecision("user-a", "AAPL", storage);
    expect(read).not.toBeNull();
    expect(read!.identity).toEqual(original.identity);
    expect(read!.identity.decisionId).toBe(original.identity.decisionId);
  });

  it("preserves the ORIGINAL witnessing device, not the reading one", () => {
    // This is the line that keeps continuity honest. A decision rehydrated in
    // a second tab is the same decision, born on the device that actually saw
    // it. Overwriting bornOnDeviceId on read would fabricate a witness.
    const storage = makeStorage();
    writeSceneDecision(scoped(), { storage, onChanged: () => {} });
    expect(readSceneDecision("user-a", "AAPL", storage)!.identity.bornOnDeviceId)
      .toBe("dev_test");
  });

  it("announces the change so the writing tab hears itself", () => {
    // The `storage` event does NOT fire in the tab that wrote. Without this
    // companion event, continuity would work between tabs and fail within one.
    const storage = makeStorage();
    const heard: string[] = [];
    writeSceneDecision(scoped(), { storage, onChanged: (k) => heard.push(k) });
    expect(heard).toEqual([`${DECISION_CONTINUITY_KEY_PREFIX}user-a:AAPL`]);
  });
});

describe("B-501 · nothing off disk is trusted", () => {
  const key = `${DECISION_CONTINUITY_KEY_PREFIX}user-a:AAPL`;

  it("returns absence for a scene never written", () => {
    expect(readSceneDecision("user-a", "AAPL", makeStorage())).toBeNull();
  });

  it("refuses a decisionId that was never minted", () => {
    // decisionIdentity.ts's own header: a persisted `decisionId: 42` "was
    // accepted and handed downstream wearing a brand that promised it had been
    // minted." This asserts that door is shut.
    for (const forged of [42, "", "ord_991", "AAPL", null, { }]) {
      const raw = JSON.stringify({
        version: 1,
        owner: "user-a",
        underlying: "AAPL",
        identity: { ...bornIdentity(), decisionId: forged },
      });
      expect(
        readSceneDecision("user-a", "AAPL", makeStorage({ [key]: raw })),
        `a decisionId of ${JSON.stringify(forged)} must not rehydrate`,
      ).toBeNull();
    }
  });

  it("refuses an identity written under a law version it cannot read", () => {
    const raw = JSON.stringify({
      version: 1,
      owner: "user-a",
      underlying: "AAPL",
      identity: { ...bornIdentity(), lawVersion: "wm.decision-identity.v2" },
    });
    expect(readSceneDecision("user-a", "AAPL", makeStorage({ [key]: raw }))).toBeNull();
    // Sanity: the fixture is only rejected for the version, nothing else.
    expect(bornIdentity().lawVersion).toBe(DECISION_IDENTITY_LAW_VERSION);
  });

  it("refuses a birth cause outside the four the law permits", () => {
    const raw = JSON.stringify({
      version: 1,
      owner: "user-a",
      underlying: "AAPL",
      identity: { ...bornIdentity(), bornFrom: "CHART_LOOKED_AT" },
    });
    expect(readSceneDecision("user-a", "AAPL", makeStorage({ [key]: raw }))).toBeNull();
  });

  it("refuses a birth at an unknown instant", () => {
    for (const bornAt of [Number.NaN, Number.POSITIVE_INFINITY, "yesterday", null]) {
      const raw = JSON.stringify({
        version: 1, owner: "user-a", underlying: "AAPL",
        identity: { ...bornIdentity(), bornAt },
      });
      // NaN/Infinity do not survive JSON at all (they serialize to null), which
      // is itself the refusal — either way the answer must be absence.
      expect(readSceneDecision("user-a", "AAPL", makeStorage({ [key]: raw }))).toBeNull();
    }
  });

  it("refuses an envelope whose body disagrees with its own key", () => {
    // The key encodes the scope, but a key can be written by hand. A scope
    // that only the filename asserts is not a scope.
    const raw = JSON.stringify({
      version: 1, owner: "user-b", underlying: "AAPL", identity: bornIdentity(),
    });
    expect(readSceneDecision("user-a", "AAPL", makeStorage({ [key]: raw }))).toBeNull();
  });

  it("refuses an envelope from a future storage version", () => {
    const raw = JSON.stringify({
      version: 2, owner: "user-a", underlying: "AAPL", identity: bornIdentity(),
    });
    expect(readSceneDecision("user-a", "AAPL", makeStorage({ [key]: raw }))).toBeNull();
  });

  it("survives unparseable garbage without throwing", () => {
    expect(readSceneDecision("user-a", "AAPL", makeStorage({ [key]: "{not json" })))
      .toBeNull();
  });

  it("reports absence — never a substitute — when storage is denied", () => {
    // Private mode. The caller must disclose that continuity is unavailable,
    // which it can only do if it is told `null` rather than handed a new id.
    expect(readSceneDecision("user-a", "AAPL", null)).toBeNull();
    expect(writeSceneDecision(scoped(), { storage: null })).toBe(false);
  });
});

describe("B-501 · a write that did not stick is not a success", () => {
  it("reports false when the value does not read back", () => {
    // Quota-exceeded `setItem` can fail without throwing. An unverified write
    // is how a surface comes to promise memory it does not have.
    const storage = { getItem: () => null, setItem: () => {} };
    expect(writeSceneDecision(scoped(), { storage, onChanged: () => {} })).toBe(false);
  });

  it("reports false and stays silent when the write throws", () => {
    const heard: string[] = [];
    const storage = {
      getItem: () => null,
      setItem: () => { throw new DOMException("QuotaExceededError"); },
    };
    expect(writeSceneDecision(scoped(), { storage, onChanged: (k) => heard.push(k) })).toBe(false);
    expect(heard, "a failed write must not announce a change").toEqual([]);
  });

  it("refuses to persist an identity the pure layer would not recognise", () => {
    const storage = makeStorage();
    const bogus = { ...scoped(), identity: { decisionId: "wmd_x" } as unknown as DecisionIdentity };
    expect(writeSceneDecision(bogus, { storage, onChanged: () => {} })).toBe(false);
    expect(storage.map.size).toBe(0);
  });

  it("refuses to persist a scene that cannot be named", () => {
    const storage = makeStorage();
    expect(writeSceneDecision(scoped({ owner: "" }), { storage, onChanged: () => {} })).toBe(false);
    expect(storage.map.size).toBe(0);
  });
});

describe("B-501 · the listener filter", () => {
  const area = { } as Storage;

  it("accepts a continuity key in localStorage", () => {
    expect(isDecisionContinuityStorageEvent(
      { key: `${DECISION_CONTINUITY_KEY_PREFIX}user-a:AAPL`, storageArea: area }, area,
    )).toBe(true);
  });

  it("ignores every unrelated key the app writes", () => {
    for (const key of ["wm_paper_state", "wm.device-id.v1", "wm-notes-3", null]) {
      expect(isDecisionContinuityStorageEvent({ key, storageArea: area }, area)).toBe(false);
    }
  });

  it("ignores the same key in a different storage area", () => {
    // sessionStorage fires `storage` too. Without this check a sessionStorage
    // write would be adopted as cross-tab truth.
    expect(isDecisionContinuityStorageEvent(
      { key: `${DECISION_CONTINUITY_KEY_PREFIX}user-a:AAPL`, storageArea: {} as Storage }, area,
    )).toBe(false);
  });
});
