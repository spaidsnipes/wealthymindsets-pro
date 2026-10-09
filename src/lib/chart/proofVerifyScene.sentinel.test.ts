/**
 * `scene=verify` — VERIFICATION: real data, nothing is saved (coordinator order
 * 2026-10-09). One token on the proof-scene owner that works on every room:
 * writes are held, a banner shows for a signed-in trader, and NOTHING ELSE on
 * the page changes — no clean-scene layer overrides, no sample data, no reader
 * falling back to canon.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const read = (p: string) => readFileSync(path.join(process.cwd(), "src", p), "utf8");

export const VERIFY_ROOMS = ["/charts", "/backtesting", "/scanner", "/journal", "/profile", "/desk", "/command-deck", "/education"] as const;

function browser(pathname: string, search: string, seed: Record<string, string> = {}) {
  const m = new Map<string, string>(Object.entries(seed));
  const calls = { set: [] as string[], remove: [] as string[] };
  const storage = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { calls.set.push(k); m.set(k, String(v)); },
    removeItem: (k: string) => { calls.remove.push(k); m.delete(k); },
    key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; }, clear: () => { calls.remove.push("*"); m.clear(); },
  };
  const location = { search, pathname, href: `https://wm.test${pathname}${search}` };
  vi.stubGlobal("window", { location, localStorage: storage, sessionStorage: storage, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true });
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("sessionStorage", storage);
  return { calls, location };
}

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("scene=verify — the token", () => {
  it("is its own token on the one owner: not a clean scene, not a fixture, no layer overrides", async () => {
    const ps = await import("@/lib/chart/proofScene");
    expect(ps.PROOF_VERIFY_TOKEN).toBe("verify");
    expect(ps.PROOF_VERIFY_BANNER).toBe("VERIFICATION — real data, nothing is saved");
    expect(ps.proofVerifyScene("?scene=verify")).toBe(true);
    expect(ps.proofVerifyScene("?symbol=NQ1%21&tf=5m&scene=verify")).toBe(true);
    for (const s of ["", "?scene=clean", "?scene=journal-fixture", "?scene=verified", "?verify=1"]) expect(ps.proofVerifyScene(s), s).toBe(false);
    // The chart must NOT clear the member's layers: the parser gives the token nothing.
    expect(ps.parseProofScene("?symbol=NQ1%21&tf=5m&scene=verify")).toEqual(ps.NO_PROOF_SCENE);
    expect(ps.parseProofScene("?scene=verify").overrides).toEqual({});
    expect(ps.parseProofScene("?scene=verify").clean).toBe(false);
    expect(ps.proofFixtureScene("?scene=verify")).toBeNull();
    expect((ps.PROOF_FIXTURE_SCENES as readonly string[]).includes("verify")).toBe(false);
  });
});

describe("scene=verify — every room holds writes, and only writes", () => {
  it.each(VERIFY_ROOMS)("%s?scene=verify → the hold is on, and it is the verification hold only", async room => {
    browser(room, room === "/charts" ? "?symbol=NQ1%21&tf=5m&scene=verify" : "?scene=verify");
    const ps = await import("@/lib/chart/proofScene");
    expect(ps.proofSceneHoldsWrites()).toBe(true);
    expect(ps.proofVerifyOpen()).toBe(true);
    expect(ps.proofVerifyOnly()).toBe(true);
    expect(ps.currentProofScene().active).toBe(false);
  });

  it.each(VERIFY_ROOMS)("%s without the token → no hold (a plain page is unchanged)", async room => {
    browser(room, "");
    const ps = await import("@/lib/chart/proofScene");
    expect(ps.proofSceneHoldsWrites()).toBe(false);
    expect(ps.proofVerifyOpen()).toBe(false);
    expect(ps.proofVerifyOnly()).toBe(false);
  });

  it("the hold is latched: a door that rewrites the address to a bare one does not end it", async () => {
    const { location } = browser("/charts", "?scene=verify");
    const ps = await import("@/lib/chart/proofScene");
    expect(ps.proofSceneHoldsWrites()).toBe(true);
    location.search = "";
    expect(ps.proofSceneHoldsWrites()).toBe(true);
    expect(ps.proofVerifyOpen()).toBe(true);
  });

  it("a chart proof scene or a fixture room is NOT 'verification only' — those keep their own canon rules", async () => {
    browser("/charts", "?symbol=NQ1%21&tf=5m&scene=clean");
    let ps = await import("@/lib/chart/proofScene");
    expect(ps.proofSceneHoldsWrites()).toBe(true);
    expect(ps.proofVerifyOnly()).toBe(false);
    vi.unstubAllGlobals(); vi.resetModules();
    browser("/journal", "?scene=journal-fixture");
    ps = await import("@/lib/chart/proofScene");
    expect(ps.proofSceneHoldsWrites()).toBe(true);
    expect(ps.proofVerifyOnly()).toBe(false);
  });
});

describe("scene=verify — nothing visible changes except the banner", () => {
  it("readers that fall back to canon in a proof scene keep the member's saved state under verify; a write there stays on the page", async () => {
    const { calls } = browser("/charts", "?symbol=NQ1%21&tf=5m&scene=verify", { wm_profile_strength: "STRONG" });
    const strength = await import("@/lib/chart/profileStrengthStore");
    expect(strength.readStoredProfileStrength()).toBe("STRONG");        // the member's own, not CANON
    strength.writeStoredProfileStrength("SUBTLE");
    expect(calls.set).toEqual([]);                                       // held
    expect(strength.readStoredProfileStrength()).toBe("SUBTLE");        // this page only
  });

  it("the same reader under scene=clean still starts from canon (the verify rule did not loosen the clean scene)", async () => {
    browser("/charts", "?symbol=NQ1%21&tf=5m&scene=clean", { wm_profile_strength: "STRONG" });
    const strength = await import("@/lib/chart/profileStrengthStore");
    expect(strength.readStoredProfileStrength()).toBe("CANON");
  });

  it("the three read-side canon fallbacks ask proofVerifyOnly(): first-touch learned, starter views, the remembered selection", () => {
    expect(read("components/chart/SelectionFirstTouch.tsx")).toContain("if (proofSceneHoldsWrites() && !proofVerifyOnly()) return false;");
    expect(read("lib/workspace/myViewsRuntime.ts")).toContain("if (proofSceneHoldsWrites() && !proofVerifyOnly()) {\n    setStarterArmsOverride(null);");
    expect(read("components/chart/ChartsDashboard.tsx")).toContain("if (!proofSceneHoldsWrites() || proofVerifyOnly()) {\n      try { saved = sessionStorage.getItem(selectionKey); }");
    // The other two read-side fallbacks are keyed on `clean`, which verify never is.
    expect(read("lib/workspace/visualRoles.ts")).toContain("return sceneRoles ?? (currentProofScene().clean ? {} : readSavedRoles());");
    expect(read("lib/chart/profileStrengthStore.ts")).toContain("if (proofSceneHoldsWrites() && (sceneStrength || currentProofScene().clean)) return sceneStrength ?? \"CANON\";");
  });

  it("no room swaps its data for a sample under the token: every fixture switch names its own fixture token", () => {
    const files = ["app/journal/page.tsx", "components/scanner/FvgScanStrip.tsx"];
    // The scan found material: both room files exist and are real sources.
    expect(files.length).toBeGreaterThan(1);
    for (const f of files) expect(read(f).length, f).toBeGreaterThan(1000);
    for (const f of files) {
      const src = read(f);
      expect(src, f).not.toMatch(/=== "verify"|PROOF_VERIFY_TOKEN|proofVerify/);
    }
    expect(read("app/journal/page.tsx")).toContain('=== "journal-fixture" && !!sceneUser');
    expect(read("components/scanner/FvgScanStrip.tsx")).toContain('=== "scanner-fixture")');
  });
});

describe("scene=verify — the banner", () => {
  it("is mounted once, in the root layout, inside the auth provider — so it is on every room", () => {
    const layout = read("app/layout.tsx");
    expect(layout.match(/<VerifySceneBanner \/>/g)).toHaveLength(1);
    expect(layout.indexOf("<AuthProvider>")).toBeLessThan(layout.indexOf("<VerifySceneBanner />"));
    expect(layout.indexOf("<VerifySceneBanner />")).toBeLessThan(layout.indexOf("</AuthProvider>"));
  });

  it("shows only for a signed-in trader on a verification load, takes no pointer and no layout space, and writes nothing", () => {
    const src = read("components/layout/VerifySceneBanner.tsx");
    expect(src).toContain("if (!open || !user) return null;");
    expect(src).toContain("useEffect(() => { setOpen(proofVerifyOpen()); }, []);");
    expect(src).toContain("{PROOF_VERIFY_BANNER}");
    expect(src).toContain('position: "fixed"');
    expect(src).toContain('pointerEvents: "none"');
    expect(src).not.toMatch(/setItem\(|localStorage|sessionStorage|fetch\(/);
  });

  it("server render / guest: nothing is rendered (the banner appears only after mount, for a signed-in trader)", async () => {
    const { VerifySceneBanner } = await import("@/components/layout/VerifySceneBanner");
    expect(renderToStaticMarkup(React.createElement(VerifySceneBanner))).toBe("");
  });
});
