import { describe, expect, it } from "vitest";
import {
  NO_PROOF_SCENE, parseProofScene, pickNewestClosedBar, pickProofSelectObject, proofSceneValue, proofSelectReceipt,
} from "./proofScene";

describe("proof scene", () => {
  it("is inactive without its parameters", () => {
    expect(parseProofScene("?symbol=TSLA&tf=15m")).toEqual(NO_PROOF_SCENE);
    expect(proofSceneValue(parseProofScene("?symbol=TSLA"), "wm_ofLivingProfile")).toBeUndefined();
  });

  it("clean turns every layer off, scaffolding to OFF, and leaves colour prefs alone", () => {
    const s = parseProofScene("?scene=clean");
    expect(s.active).toBe(true);
    expect(proofSceneValue(s, "wm_ofLivingProfile")).toBe(false);
    expect(proofSceneValue(s, "wm_ofRegimeLighting")).toBe(false);
    expect(proofSceneValue(s, "wm_fp_enabled")).toBe(false);
    expect(proofSceneValue(s, "wm_absorptionAnatomy")).toBe(false);
    expect(proofSceneValue(s, "wm_ofScaffolding")).toBe("OFF");
    expect(proofSceneValue(s, "wm_of_buy")).toBeUndefined();
    expect(proofSceneValue(s, "wm_ofStackPrefs")).toBeUndefined();
    expect(proofSceneValue(s, "wm_theme")).toBeUndefined();
  });

  it("on= switches named layers on for this load", () => {
    const s = parseProofScene("?scene=clean&on=LivingProfile,TpoProfile,sessionVP,fp:big-trades,scaff:advanced");
    expect(proofSceneValue(s, "wm_ofLivingProfile")).toBe(true);
    expect(proofSceneValue(s, "wm_ofTpoProfile")).toBe(true);
    expect(proofSceneValue(s, "wm_sessionVP")).toBe(true);
    expect(proofSceneValue(s, "wm_fp_enabled")).toBe(true);
    expect(proofSceneValue(s, "wm_footprint")).toBe("big-trades");
    expect(proofSceneValue(s, "wm_ofScaffolding")).toBe("ADVANCED");
    expect(proofSceneValue(s, "wm_ofCompositeProfile")).toBe(false);
  });

  it("ask:<choice> opens the Question Lens on that question for this load (2026-09-26)", () => {
    const s = parseProofScene("?scene=clean&on=QuestionLens,ask:trap");
    expect(proofSceneValue(s, "wm_ofQuestionLens")).toBe(true);
    expect(proofSceneValue(s, "wm_questionChoice")).toBe("TRAP");
    expect(proofSceneValue(parseProofScene("?scene=clean&on=QuestionLens"), "wm_questionChoice")).toBeUndefined();
  });

  it("without clean, on= only adds to the saved chart", () => {
    const s = parseProofScene("?on=ExpectedEnvelope");
    expect(proofSceneValue(s, "wm_ofExpectedEnvelope")).toBe(true);
    expect(proofSceneValue(s, "wm_ofLivingProfile")).toBeUndefined();
  });

  it("ind= sets the classic indicator set for this load; clean empties it", () => {
    expect(proofSceneValue(parseProofScene("?ind=VWAP,EMA 21,RSI"), "wm_activeInds")).toEqual(["VWAP", "EMA 21", "RSI"]);
    expect(proofSceneValue(parseProofScene("?scene=clean"), "wm_activeInds")).toEqual([]);
    expect(proofSceneValue(parseProofScene("?on=LivingProfile"), "wm_activeInds")).toBeUndefined();
  });

  it("bars bounds the camera to a sane count", () => {
    expect(parseProofScene("?bars=18").bars).toBe(18);
    expect(parseProofScene("?bars=2").bars).toBeNull();
    expect(parseProofScene("?bars=abc").active).toBe(false);
    expect(parseProofScene("?bars=800").bars).toBe(800);
  });

  it("select= opens Inspect by URL on a known kind; unknown words are ignored (2026-09-26)", () => {
    expect(parseProofScene("?symbol=TSLA&select=zone").select).toBe("zone");
    expect(parseProofScene("?select=LEVEL").select).toBe("level");
    expect(parseProofScene("?scene=clean&select=bar").select).toBe("bar");
    expect(parseProofScene("?select=bigtrade&on=fp:big-trades").select).toBe("bigtrade");
    // select= alone is a proof scene: it holds writes, and has no layer opinion.
    const alone = parseProofScene("?select=zone");
    expect(alone.active).toBe(true);
    expect(alone.clean).toBe(false);
    expect(proofSceneValue(alone, "wm_ofLivingProfile")).toBeUndefined();
    // Unknown (and the skipped ghost) are ignored, never guessed.
    expect(parseProofScene("?select=ghost")).toEqual(NO_PROOF_SCENE);
    expect(parseProofScene("?select=")).toEqual(NO_PROOF_SCENE);
    expect(parseProofScene("?scene=clean&select=everything").select).toBeNull();
    expect(parseProofScene("?symbol=TSLA").select).toBeNull();
  });

  it("select=zone|level picks the compiled object of that kind nearest price", () => {
    const objects = [
      { objectId: "Z-far", kind: "ZONE", priceLow: 90, priceHigh: 95 },
      { objectId: "L-1", kind: "LEVEL", priceLow: 101, priceHigh: 101 },
      { objectId: "Z-near", kind: "ZONE", priceLow: 103, priceHigh: 106 },
      { objectId: "L-2", kind: "LEVEL", priceLow: 99.5, priceHigh: 99.5 },
      { objectId: "Z-tie", kind: "ZONE", priceLow: 97, priceHigh: 97 },
    ];
    expect(pickProofSelectObject(objects, "ZONE", 100)).toBe("Z-near");
    expect(pickProofSelectObject(objects, "LEVEL", 100)).toBe("L-2");
    expect(pickProofSelectObject(objects, "ZONE", 104)).toBe("Z-near");
    expect(pickProofSelectObject(objects.filter(o => o.kind === "LEVEL"), "ZONE", 100)).toBeNull();
    expect(pickProofSelectObject(objects, "ZONE", NaN)).toBeNull();
  });

  it("select=bar is the newest CLOSED bar; the forming bar is skipped", () => {
    const bars = [{ time: 1 }, { time: 2 }, { time: 3 }];
    expect(pickNewestClosedBar(bars, t => t === 3)).toEqual({ time: 2 });
    expect(pickNewestClosedBar(bars, () => false)).toEqual({ time: 3 });
    expect(pickNewestClosedBar(bars, () => true)).toBeNull();
    expect(pickNewestClosedBar([], () => false)).toBeNull();
  });

  it("the receipt names the kind and the id or the state", () => {
    expect(proofSelectReceipt("zone", "ZONE-1")).toBe("zone:ZONE-1");
    expect(proofSelectReceipt("bigtrade", "NONE_AVAILABLE")).toBe("bigtrade:NONE_AVAILABLE");
  });
});
