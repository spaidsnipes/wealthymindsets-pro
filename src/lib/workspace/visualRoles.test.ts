import { describe, expect, it } from "vitest";

import { selectAttentionGovernor, ATTENTION_FLOOR } from "@/lib/marketData/viewModels/selectAttentionGovernor";
import { selectSemanticDensity } from "@/lib/marketData/viewModels/selectSemanticDensity";
import { autoCompose, nextRole, parseVisualRoles, rolesByLayer } from "./visualRoles";
import { parseSavedLayouts, saveLayout, serializeSavedLayouts } from "./savedLayouts";

const gov = (roles = {}) => selectAttentionGovernor({ density: selectSemanticDensity(null), questionQuiet: 1, regimeLight: null, stackPrefs: undefined as never, fusedParents: [], feedState: "LIVE" as never, selection: null, posture: undefined as never, roles });

describe("Garden 18 §XXXVII — visual roles are semantic, and only representation", () => {
  it("no role is the canon alpha; PRIMARY reads; AMBIENT and LATENT recede above the floor", () => {
    const base = gov().alpha("tpo");
    expect(gov(rolesByLayer({ TPO_PROFILE: "SUPPORTING" })).alpha("tpo")).toBe(base);
    expect(gov(rolesByLayer({ TPO_PROFILE: "PRIMARY" })).alpha("tpo")).toBeGreaterThanOrEqual(0.92);
    const amb = gov(rolesByLayer({ TPO_PROFILE: "AMBIENT" })).alpha("tpo");
    const lat = gov(rolesByLayer({ TPO_PROFILE: "LATENT" })).alpha("tpo");
    expect(amb).toBeLessThan(base);
    expect(lat).toBeLessThan(amb);
    expect(lat).toBeGreaterThanOrEqual(ATTENTION_FLOOR);
  });

  it("chrome is never given a role", () => {
    expect(gov({ riskOnPrice: "LATENT" }).alpha("riskOnPrice")).toBe(1);
  });

  it("Auto compose gives one lead and never switches anything off", () => {
    const r = autoCompose(["TPO_PROFILE", "ABSORPTION", "MARKET_STRUCTURE"]);
    expect(r).toEqual({ ABSORPTION: "PRIMARY", TPO_PROFILE: "SUPPORTING", MARKET_STRUCTURE: "AMBIENT" });
  });

  it("roles cycle and parse defensively", () => {
    expect(nextRole(undefined)).toBe("AMBIENT");
    expect(nextRole("LATENT")).toBe("PRIMARY");
    expect(parseVisualRoles('{"TPO_PROFILE":"PRIMARY","NOPE":"PRIMARY","ABSORPTION":"LOUD"}')).toEqual({ TPO_PROFILE: "PRIMARY" });
  });

  it("a My View keeps its roles and profile strength through storage", () => {
    const r = saveLayout([], "Absorption + Auction", { ABSORPTION: true, TPO_PROFILE: true }, () => "v1", { roles: { ABSORPTION: "PRIMARY", TPO_PROFILE: "SUPPORTING" }, profileStrength: "STRONG" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const back = parseSavedLayouts(serializeSavedLayouts(r.list));
    expect(back?.[0]?.roles).toEqual({ ABSORPTION: "PRIMARY", TPO_PROFILE: "SUPPORTING" });
    expect(back?.[0]?.profileStrength).toBe("STRONG");
  });
});

describe("a My View keeps its footprint mode and Big Trades", () => {
  it("round-trips, and a malformed footprint is dropped, not guessed", () => {
    const r = saveLayout([], "Tape + Big", { ABSORPTION: true }, () => "v2", { footprint: { enabled: true, mode: "delta", bigTrades: true } });
    if (!r.ok) throw new Error(r.message);
    expect(parseSavedLayouts(serializeSavedLayouts(r.list))?.[0]?.footprint).toEqual({ enabled: true, mode: "delta", bigTrades: true });
    const bad = saveLayout([], "Bad", { ABSORPTION: true }, () => "v3", { footprint: { enabled: true, mode: "rainbow" as never, bigTrades: true } });
    expect(bad.ok && bad.layout.footprint).toBeFalsy();
  });
});

describe("Garden 18 §XXIX — every tool has one place in the library", () => {
  it("each catalogue id is categorised (the Record type enforces totality; this proves the values are the order's)", async () => {
    const { LIBRARY_CATEGORY, LIBRARY_CATEGORIES } = await import("./toolSearch");
    const { PROFILE_FAMILY } = await import("@/lib/marketData/viewModels/selectProfileMenu");
    for (const id of Object.keys(PROFILE_FAMILY)) expect(LIBRARY_CATEGORIES).toContain(LIBRARY_CATEGORY[id as keyof typeof LIBRARY_CATEGORY]);
  });
});
