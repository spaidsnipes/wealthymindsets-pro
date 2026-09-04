import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SOURCE = fs.readFileSync(
  path.join(process.cwd(), "src/components/broker/AlpacaTradingPanel.tsx"),
  "utf8",
);

/**
 * Comments are stripped before any absence assertion. The comments in this
 * panel deliberately quote the defect they prevent, and a Sentinel that
 * forbids NAMING a defect punishes documenting it.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("Alpaca panel — §14.6 the exit is never blocked by a dependency", () => {
  it("no longer disables the whole order form on a failed account load", () => {
    // THE REGRESSION. `disabled={orderStatus === "submitting" || !account}`
    // meant a read-only ACCOUNT BALANCE failure greyed out SELL, and a trader
    // holding a losing position watched it move behind a dead button.
    expect(CODE).not.toContain('disabled={orderStatus === "submitting" || !account}');
    expect(CODE).not.toContain("|| !account}");
  });

  it("asks the permission selector instead of deciding for itself", () => {
    expect(CODE).toContain('from "@/lib/exitPermission"');
    expect(CODE).toContain("selectExitPermission({");
    expect(CODE).toContain("disabled={!exitPermission.allowed}");
  });

  it("passes the real degraded dependencies rather than a hardcoded list", () => {
    expect(CODE).toContain('!accountObserved ? "Account" : null');
    expect(CODE).toContain('heldQty === null ? "Positions" : null');
    expect(CODE).toContain('const accountObserved = account !== null && !acctError && !loading');
    expect(CODE).toContain('accountObserved,');
  });

  it("treats an unloaded book as unknown, not as flat (§14.1)", () => {
    // Passing 0 here would let a stale screen call a real short "no position"
    // and then refuse the cover as if it were a new trade.
    expect(CODE).toContain('if (positionsLoad !== "ok" || !positionSnapshotCurrent) return null;');
    expect(CODE).toContain('const n = displayNumber(held.qty);');
    expect(CODE).toContain('if (n === null) return null;');
    expect(CODE).not.toContain('parseFloat(held.qty');
  });

  it("reads the short direction from `side`, not from the sign alone", () => {
    expect(CODE).toContain('held.side?.toLowerCase() === "short" ? -Math.abs(n) : n');
  });

  it("shows the trader why it refused, and what is missing when it does not", () => {
    expect(CODE).toContain("{exitPermission.reason && (");
    expect(CODE).toContain("{exitPermission.allowed && exitPermission.disclosure && (");
    // Amber, never green: an order placed without account data is not "safe".
    expect(CODE).toContain("style={{ color: CAUTION }}");
  });
});
