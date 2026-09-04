import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A DEPLOYMENT RECORD REQUIRES A DEPLOYMENT.
 *
 * WMSContext used to export `launchCreatorCoin`. It took a name and a symbol
 * from a form and wrote this into local storage:
 *
 *   const full: CreatorCoin = {
 *     ...coin,
 *     deployedAt: new Date().toISOString(),
 *     logoColor: LOGO_COLORS[Math.floor(Math.random() * LOGO_COLORS.length)],
 *   };
 *
 * No wallet. No signed transaction. No chain receipt. A `deployedAt` timestamp
 * manufactured by `new Date()` at the moment a button was pressed, then
 * rendered back to the user on /profile as "Launched <date>" — a token
 * deployment attested by nothing but the click that claimed it.
 *
 * Two things make this worth a permanent lock rather than a quiet deletion.
 *
 * First, the codebase had ALREADY identified the behaviour as fabrication.
 * `loadState` in WMSContext refuses to migrate v1 state with this comment:
 *
 *   // v1 awarded fabricated token balances and allowed local-only "coin
 *   // launches". Do not migrate those values into the honest local-points model.
 *
 * The migration gate cleaned up the records the function produced, and left the
 * function running. Naming a defect is not the same as removing it.
 *
 * Second, by the time it was deleted the function was UNREACHABLE — its only
 * caller was a form on /profile mounted behind `showLaunchCoin`, whose opener
 * was removed by b6c08db ("Remove synthetic signals and token claims",
 * 2026-07-20). That is the dangerous shape: a fabrication primitive sitting
 * behind a closed door, invisible to review because nothing calls it, one
 * `onClick` away from live. It was found by the repo-wide orphan scan added in
 * chartPanelDoorway.test.ts, not by reading the diff.
 *
 * The honest surface it fed is still there and still correct:
 *   "Creator Coin Deployment Not Connected — A real creator coin requires
 *    wallet connection, reviewed contracts, signed transactions, and confirmed
 *    chain receipts. This app does not deploy one yet."
 *
 * This test exists so that sentence cannot be contradicted from elsewhere in
 * the same file again.
 */

const WMS_CONTEXT = "src/contexts/WMSContext.tsx";
const PROFILE_PAGE = "src/app/profile/page.tsx";

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8");
}

/**
 * Comments here deliberately quote the deleted code, so they must not satisfy
 * a presence check. Every absence assertion runs against stripped source.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const WMS_SOURCE = read(WMS_CONTEXT);
const WMS_CODE = stripComments(WMS_SOURCE);
const PROFILE_CODE = stripComments(read(PROFILE_PAGE));

describe("creator coin — a deployment record requires a deployment", () => {
  it("WMSContext still exists and still owns the points ledger", () => {
    // Vacuity guard. If this file is renamed or gutted, every absence
    // assertion below would pass over an empty string and report safety.
    expect(WMS_CODE).toContain("WMSContext");
    expect(WMS_CODE).toContain("const earnWMS");
    expect(WMS_CODE).toContain("const spendWMS");
  });

  it("no function manufactures a creator-coin deployment", () => {
    expect(WMS_CODE).not.toContain("launchCreatorCoin");
    expect(PROFILE_CODE).not.toContain("launchCreatorCoin");
  });

  it("nothing writes a deployedAt timestamp from the local clock", () => {
    // The precise mechanism of the lie: a chain fact sourced from `new Date()`.
    expect(WMS_CODE).not.toMatch(/deployedAt:\s*new Date\(\)/);
    expect(PROFILE_CODE).not.toMatch(/deployedAt:\s*new Date\(\)/);
  });

  it("the CreatorCoin type is not constructed anywhere outside a load", () => {
    // `setCreatorCoin` is legitimate when hydrating persisted state. It is not
    // legitimate as the tail of a form submit. Only the loader may call it.
    const setterCalls = [...WMS_CODE.matchAll(/setCreatorCoin\(([^)]*)\)/g)].map((m) => m[1].trim());
    expect(setterCalls.length).toBeGreaterThan(0);
    for (const arg of setterCalls) {
      expect(
        /^s\.creatorCoin|^null$/.test(arg),
        `setCreatorCoin(${arg}) is not a hydration from persisted state`,
      ).toBe(true);
    }
  });

  it("isDeployed is not asserted true without a chain receipt", () => {
    // The context hard-codes false with a comment explaining that a configured
    // address alone proves nothing. Flipping it to a truthy expression would
    // re-open the same overclaim from a different direction.
    expect(WMS_CODE).toMatch(/isDeployed:\s*false/);
  });

  it("/profile keeps the honest not-connected disclosure", () => {
    expect(PROFILE_CODE).toContain("Creator Coin Deployment Not Connected");
    expect(PROFILE_CODE).toContain("This app does not deploy one yet");
  });

  it("/profile makes no launched/deployed success claim", () => {
    // The deleted toast read: `🚀 ${symbol} launched! +500 WM$`. It was wrong
    // twice — nothing deployed, and launchCreatorCoin never credited WM$
    // (it forwarded the existing balance to persist untouched).
    expect(PROFILE_CODE).not.toMatch(/toast\.success\([^)]*launched/i);
    expect(PROFILE_CODE).not.toMatch(/toast\.success\([^)]*WM\$/);
  });

  it("no orphaned launch form remains mounted on /profile", () => {
    // Same failure mode as the chart panels: mounted, fully wired, no door.
    expect(PROFILE_CODE).not.toContain("showLaunchCoin");
    expect(PROFILE_CODE).not.toContain("setNewCoin");
  });
});
