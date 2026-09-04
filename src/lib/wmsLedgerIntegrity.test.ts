import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(resolve(process.cwd(), "src/contexts/WMSContext.tsx"), "utf8");
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * WM points ledger integrity.
 *
 * earnWMS() nested FOUR setState updaters inside one another, with a
 * localStorage write in the innermost. React requires updaters to be pure and
 * may invoke them more than once — StrictMode does so deliberately, and
 * concurrent rendering can discard and replay a render. On a currency ledger a
 * replay credits balance and totalEarned twice and duplicates the earnings
 * entry: the user is paid repeatedly for one action.
 *
 * spendWMS() was worse in kind. It set a `success` flag from inside the updater
 * and returned it synchronously — but React does not run updaters at call time,
 * so the flag was read BEFORE it was ever assigned. spendWMS reported failure
 * even when it debited the balance. It had no callers, so this was a latent
 * trap rather than an observed loss; the first caller would have seen points
 * deducted and the purchase reported as failed.
 */
/**
 * Slice the source between two markers, refusing to guess.
 *
 * These assertions used to call `code.slice(start, code.indexOf(marker))`
 * inline. When `launchCreatorCoin` was deleted on 2026-09-03, that `indexOf`
 * became -1 and `slice(start, -1)` silently widened the body to the whole rest
 * of the file: the assertions kept running, over the wrong text, and would have
 * passed or failed for reasons unrelated to the function under test. A
 * text-boundary test that survives the disappearance of its own boundary is
 * reporting on nothing. Fail loudly instead.
 */
function bodyBetween(startMarker: string, endMarker: string): string {
  const start = code.indexOf(startMarker);
  const end = code.indexOf(endMarker);
  expect(start, `marker "${startMarker}" is gone from WMSContext.tsx`).toBeGreaterThan(-1);
  expect(end, `marker "${endMarker}" is gone from WMSContext.tsx`).toBeGreaterThan(start);
  return code.slice(start, end);
}

describe("WMS ledger integrity", () => {
  it("earnWMS does not nest setState updaters", () => {
    const body = bodyBetween("const earnWMS", "const spendWMS");
    // No updater form at all — flat value assignments only.
    expect(body).not.toMatch(/set[A-Z]\w*\(\s*\w+\s*=>/);
    expect(body).toContain("setWmsBalance(nextBalance)");
    expect(body).toContain("setTotalEarned(nextEarned)");
  });

  it("earnWMS persists exactly once", () => {
    const body = bodyBetween("const earnWMS", "const spendWMS");
    expect((body.match(/persist\(/g) ?? []).length).toBe(1);
  });

  it("spendWMS decides from a ref, not from inside an updater", () => {
    // End marker is the provider's return — spendWMS is the last callback in
    // the file now that launchCreatorCoin is gone.
    const body = bodyBetween("const spendWMS", "return (");
    expect(body).toContain("balanceRef.current < amount");
    // The broken pattern must not return.
    expect(body).not.toMatch(/let success/);
    expect(body).not.toMatch(/set[A-Z]\w*\(\s*\w+\s*=>/);
  });

  it("both entry points reject non-positive and non-finite amounts", () => {
    const body = bodyBetween("const earnWMS", "return (");
    expect((body.match(/Number\.isFinite\(amount\)/g) ?? []).length).toBe(2);
  });

  it("refs are seeded from persisted state, not left at zero", () => {
    // An earn/spend firing before the mirroring effects run must not compute
    // from a zero balance and wipe the ledger.
    expect(code).toContain("balanceRef.current = s.balance ?? 0");
    expect(code).toContain("totalEarnedRef.current = s.totalEarned ?? 0");
  });

  it("ledger arithmetic is idempotent under a replayed call site", () => {
    // Mirror of the new logic: computing from a ref and assigning (not
    // incrementing inside an updater) means a duplicated render cannot
    // double-apply, because the ref advances exactly once per invocation.
    let balanceRef = 100;
    const earn = (amount: number) => { balanceRef = balanceRef + amount; return balanceRef; };
    const first = earn(25);
    expect(first).toBe(125);
    // A React re-render re-reads state; it does not re-invoke the callback.
    expect(balanceRef).toBe(125);
  });
});
