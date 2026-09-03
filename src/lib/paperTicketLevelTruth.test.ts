import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "src/app/paper/page.tsx"),
  "utf8",
);

/**
 * /paper Order Ticket level-truth Sentinel — LIVING-PIXEL LAW + canon §7.
 *
 * Shipped defect (2026-09-03):
 *   limitPx: type==="limit"||type==="stop-limit" ? +limitPx||px : undefined
 *   stopPx:  type==="stop" ||type==="stop-limit" ? +stopPx ||px : undefined
 *
 * `+""` is 0 and therefore falsy, so a blank box fell through to `px`, the
 * current market price. Choosing "limit" and typing nothing produced an order
 * priced AT the market — the exact protection the trader selected, removed
 * silently. For a stop it was worse: a stop at the market triggers on arrival,
 * turning "protect me if I'm wrong" into an immediate market exit.
 *
 * The placeholder made it worse by rendering fmt2(px), which advertised the
 * market price as the implied default.
 */
describe("paper ticket level truth", () => {
  it("no `||px` fallback survives on either price level", () => {
    expect(page).not.toMatch(/\+limitPx\s*\|\|\s*px/);
    expect(page).not.toMatch(/\+stopPx\s*\|\|\s*px/);
  });

  it("levels are resolved through the validator, not inline coercion", () => {
    expect(page).toContain("validateTicketLevels({");
    expect(page).toContain("limitPx: levels.limitPx");
    expect(page).toContain("stopPx:  levels.stopPx");
  });

  it("a refused order is not submitted", () => {
    // The early return must precede onSubmit, or the refusal is cosmetic.
    const i = page.indexOf("if (!levels.ok)");
    const j = page.indexOf("onSubmit(order)");
    expect(i).toBeGreaterThan(-1);
    expect(j).toBeGreaterThan(i);
    expect(page).toContain("setLevelIssues(levels.issues); return;");
  });

  it("the trader is told why, rather than facing a dead button", () => {
    expect(page).toContain('role="alert"');
    expect(page).toContain("Order not sent");
    expect(page).toContain("levelIssues.map");
  });

  it("the placeholder no longer advertises the market price as a default", () => {
    expect(page).not.toContain('placeholder={fmt2(px)}');
    expect(page).toContain('placeholder="Required — no default"');
  });
});

/**
 * §7 ORDER PURPOSE BEFORE ORDER TYPE — mounted on the ticket.
 *
 * A trader wants "get me in without chasing", not "limit". The purpose row
 * states the intent first and compiles the broker primitive from it, and every
 * purpose discloses what it costs before the trader commits.
 */
describe("paper ticket purpose-first", () => {
  it("asks the human question before offering broker vocabulary", () => {
    const purposeIdx = page.indexOf("What are you trying to do?");
    const typeIdx = page.indexOf("{/* Order type */}");
    expect(purposeIdx).toBeGreaterThan(-1);
    expect(typeIdx).toBeGreaterThan(purposeIdx);
  });

  it("compiles the order type from the purpose rather than hardcoding it", () => {
    expect(page).toContain("setType(purposeOrderType(pp))");
  });

  it("shows both halves of the tradeoff — never benefits alone", () => {
    expect(page).toContain("purposeTradeoff(purpose).prioritises");
    expect(page).toContain("purposeTradeoff(purpose).sacrifices");
  });

  it("drops the purpose when a manual type change contradicts it", () => {
    // A purpose chip left standing over a different order type would be a
    // label describing an order that no longer exists.
    expect(page).toContain("purposeOrderType(cur) === t ? cur : null");
  });
});
