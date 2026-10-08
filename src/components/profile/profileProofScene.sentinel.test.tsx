/**
 * /profile?scene=profile-fixture — sample books, read-only, token-gated (Garden 19, 2026-10-08).
 * The INSUFFICIENT tiles (1–19 trades) are provable on serving with sample data, through the SAME
 * tile view and owners the trader's profile uses.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NO_PROOF_SCENE, parseProofScene, proofFixtureScene } from "@/lib/chart/proofScene";
import { INSUFFICIENT } from "@/lib/journal/statGuard";
import { PROFILE_FIXTURE_BANNER, profileFixtureBook } from "@/lib/profile/profileProofFixture";
import { ProfileProofScene } from "./ProfileProofScene";

const read = (p: string) => readFileSync(path.resolve(__dirname, "../..", p), "utf8");
const kinds = (n: number) => Object.fromEntries(profileFixtureBook(n).stats.map(s => [s.label, s.kind]));

describe("profile proof scene", () => {
  it("the token parses through the proofScene owner; not a chart scene; journal's token unaffected", () => {
    expect(proofFixtureScene("?scene=profile-fixture")).toBe("profile-fixture");
    expect(proofFixtureScene("?scene=journal-fixture")).toBe("journal-fixture");
    expect(parseProofScene("?scene=profile-fixture")).toEqual(NO_PROOF_SCENE);
  });

  it("three books through the real owners: 0 → measured zero + no basis; 7 → INSUFFICIENT; 24 → MEASURED", () => {
    expect(kinds(0)).toEqual({ "Win Rate": "UNDEFINED", "Avg R:R": "UNDEFINED", "Net P&L": "MEASURED", Trades: "MEASURED" });
    expect(kinds(7)).toEqual({ "Win Rate": "INSUFFICIENT_EVIDENCE", "Avg R:R": "INSUFFICIENT_EVIDENCE", "Net P&L": "MEASURED", Trades: "MEASURED" });
    expect(kinds(24)).toEqual({ "Win Rate": "MEASURED", "Avg R:R": "MEASURED", "Net P&L": "MEASURED", Trades: "MEASURED" });
    expect(profileFixtureBook(7).stats.find(s => s.label === "Win Rate")!.value).toBe(INSUFFICIENT);
    expect(profileFixtureBook(24).stats.find(s => s.label === "Trades")!.value).toBe("24");
    expect(profileFixtureBook(24).snapshots).toHaveLength(24);
    expect(profileFixtureBook(24).records.every(r => String(r.id).startsWith("SAMPLE-P") && r.symbol === "SAMPLE-FVG")).toBe(true);
    expect(profileFixtureBook(7)).toBe(profileFixtureBook(7));
  });

  it("renders the banner, the three books and the INSUFFICIENT tiles in the page's own tile view", () => {
    const html = renderToStaticMarkup(<ProfileProofScene />);
    expect(html.length).toBeGreaterThan(2_000);
    expect(html).toContain(PROFILE_FIXTURE_BANNER);
    expect(html.match(/data-testid="profile-proof-book"/g) ?? []).toHaveLength(3);
    expect(html.match(/data-testid="profile-perf-tiles"/g) ?? []).toHaveLength(3);
    expect(html.match(/data-kind="INSUFFICIENT_EVIDENCE"/g) ?? []).toHaveLength(2);
    expect(html).toContain("no closed trades yet");
    // The refusal reason is visible text (phone): 2 "No basis" in book A, 2 INSUFFICIENT in book B.
    expect(html.match(/data-testid="profile-tile-reason"/g) ?? []).toHaveLength(4);
    expect(html).toContain("7 of 20 closed trades so far");
  });

  it("writes nothing, fetches nothing; gated to a signed-in trader with the token; the profile shares the tile view", () => {
    for (const f of ["components/profile/ProfileProofScene.tsx", "lib/profile/profileProofFixture.ts", "components/profile/ProfilePerfTiles.tsx"]) {
      const src = read(f);
      expect(src.length, f).toBeGreaterThan(500);
      expect(src, f).not.toMatch(/setItem\(|removeItem\(|fetch\(|localStorage|sessionStorage|sendBeacon|XMLHttpRequest/);
    }
    const page = read("app/profile/page.tsx");
    expect(page).toContain(`proofFixtureScene(\`?\${sp.toString()}\`) === "profile-fixture" && !!sceneUser`);
    expect(page).toContain("fixture ? <ProfileProofScene /> : <ProfilePageInner />");
    expect(page).toContain("<ProfilePerfTiles stats={stats} />");
  });
});
