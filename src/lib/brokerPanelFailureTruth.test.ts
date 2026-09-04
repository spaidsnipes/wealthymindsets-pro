import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const panel = fs.readFileSync(
  path.join(process.cwd(), "src/components/broker/AlpacaTradingPanel.tsx"),
  "utf8",
);

/**
 * Broker panel failure Sentinel — LIVING-PIXEL LAW.
 *
 * Three silent failures on a live-brokerage surface:
 *
 * 1. loadPositions / loadOrders wrapped a fetch in `catch {}` with no res.ok
 *    check. `fetch` does not reject on 4xx/5xx, so a broker error left the
 *    previous (initially empty) list standing — and the UI renders
 *    "No open positions" for `positions.length === 0`. A trader who WAS
 *    holding risk was told they held none.
 *
 * 2. cancelOrder awaited a DELETE and swallowed everything. A cancel the
 *    broker REJECTED resolves normally, so the order stayed working while the
 *    trader believed they were out.
 */
describe("broker panel failure truth", () => {
  it("retains known orders when their refresh fails and qualifies their status", () => {
    expect(panel).not.toContain('{ordersLoad === "failed" ? (');
    expect(panel).toContain('{ordersLoad === "failed" && (');
    expect(panel).toContain('Last observed status: ${ord.status.toUpperCase()}');
    expect(panel).toContain('Current order state unverified.');
    expect(panel).toContain('isOpen ? "This order may still execute. " : ""');
  });
  it("bounds order bodies and rejects superseded reads", () => {
    const read = panel.slice(panel.indexOf("const loadOrders ="), panel.indexOf("const disconnect ="));
    expect(read).toContain("orderRead.current?.cancel()");
    expect(read).toContain("signal: controller.signal");
    expect(read).toContain("12_000");
    expect(read).toMatch(/const data = await res.json\(\);\s*if \(!active\) return;/);
    expect(read).toContain('if (active) setOrdersLoad("failed")');
  });
  it("checks the HTTP response instead of trusting a resolved fetch", () => {
    expect(panel).toContain('if (!res.ok) { setPositionsLoad("failed"); return; }');
    expect(panel).toContain('if (!res.ok) { setOrdersLoad("failed"); return; }');
  });

  it("no longer swallows load failures silently", () => {
    expect(panel).not.toContain("if (Array.isArray(data)) setPositions(data);\n    } catch {}");
    expect(panel).toContain('setPositionsLoad("failed")');
    expect(panel).toContain('setOrdersLoad("failed")');
  });

  it("distinguishes an empty book from an unknown one", () => {
    // The whole point: "No open positions" must be a finding, not a default.
    // The verb moved from "load" to "refresh" when the failure stopped
    // REPLACING the position list and became a banner above it. The disclosure
    // is the invariant; the wording followed the safer behaviour.
    expect(panel).toContain("Could not refresh positions.");
    expect(panel).toContain("This is not a confirmation that you hold none.");
    expect(panel).toContain("This is not a confirmation that you have none working.");
  });

  it("does not claim an empty book while the first load is still pending", () => {
    expect(panel).toContain('positionsLoad === "pending" ? "Loading positions…" : positionSnapshotCurrent');
    expect(panel).toMatch(/positionSnapshotCurrent\s*\? "No open positions"\s*: "Last observed empty — current positions unverified"/);
    expect(panel).toContain('ordersLoad === "pending" ? "Loading orders…" : "No recent orders"');
  });

  it("a rejected cancel is reported, not assumed successful", () => {
    expect(panel).not.toContain('await fetch(`/api/alpaca-trading?action=order&id=${orderId}`, { method: "DELETE" });\n      loadOrders();\n    } catch {}');
    expect(panel).toContain("Cancel was not accepted");
    expect(panel).toContain("The order may still be working");
  });

  it("surfaces the cancel failure to the trader, not just to state", () => {
    expect(panel).toContain("{cancelError && (");
    expect(panel).toContain('role="alert"');
  });
});

/**
 * loadAccount already surfaced a body-level `error`, but a non-ok response
 * whose body simply lacked that field fell through to
 * `setAccount(data as AlpacaAccount)` — an unvalidated cast that would render
 * an account built from undefined numbers.
 */
describe("broker account load truth", () => {
  it("rejects a non-ok account response instead of casting it", () => {
    expect(panel).toContain("Account request failed (${res.status}).");
  });

  it("validates the shape before trusting the cast", () => {
    expect(panel).toContain("Account response was not in the expected shape.");
    expect(panel).toContain('typeof data.equity === "undefined"');
  });
});
