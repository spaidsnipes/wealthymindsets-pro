import { describe, expect, it } from "vitest";
import { NO_PROOF_SCENE, parseProofScene, proofSceneValue } from "./proofScene";

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
});
