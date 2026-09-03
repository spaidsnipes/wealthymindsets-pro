import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
const tape = read("src/components/layout/TickerTape.tsx");
const watch = read("src/components/chart/WatchlistPanel.tsx");

/**
 * Session-change truth Sentinel — LIVING-PIXEL LAW.
 *
 * Both the global ticker tape and the watchlist coerced a missing session
 * change to zero:
 *
 *   { price: j.price, chg: j.change ?? 0, pct: j.changePct ?? 0 }
 *   const prev = j?.prevClose ?? price;   // makes price-minus-prev exactly 0
 *
 * A provider that returned a price but no change produced a row rendered as
 * LIVE and green, with an up-arrow reading "+0.00 (+0.00%)" — an assertion
 * that the symbol is flat on the session, manufactured from missing data.
 * The tape is on every page.
 */
describe("session change truth", () => {
  it("the tape never coerces a provider change to zero", () => {
    expect(tape).not.toMatch(/chg:\s*j\.change\s*\?\?\s*0/);
    expect(tape).not.toMatch(/pct:\s*j\.changePct\s*\?\?\s*0/);
  });

  it("the tape never defaults prevClose to the last price", () => {
    // `prev = prevClose ?? price` guarantees a zero change.
    expect(tape).not.toMatch(/prevClose\s*\?\?\s*price/);
  });

  it("the watchlist never coerces a provider change to zero", () => {
    expect(watch).not.toMatch(/change:\s*\w+\.change\s*\?\?\s*0/);
    expect(watch).not.toMatch(/changePct:\s*\w+\.changePct\s*\?\?\s*0/);
  });

  it("both surfaces resolve change through the shared selector", () => {
    expect(tape).toContain("selectQuoteChange(");
    expect(watch).toContain("selectQuoteChange(");
  });

  it("both render a dash instead of a fabricated flat session", () => {
    expect(tape).toContain("chgObserved ? (");
    expect(tape).toContain("chg —");
    expect(watch).toContain("item.changeObserved ? (");
    expect(watch).toContain("chg —");
  });
});

/**
 * Fixing the fabrication must not introduce a new one: `up` also colours the
 * PRICE. Leaving `up === false` for an unobserved change would paint the row
 * red, asserting a decline that was never measured.
 */
describe("session change direction is not asserted without evidence", () => {
  it("the watchlist uses a neutral colour when change is unobserved", () => {
    expect(watch).toContain("const dirColor = !item.changeObserved");
    expect(watch).not.toMatch(/fontSize: 11, color: up \? "#00C076"/);
  });

  it("watchlist gainers/losers filters exclude unobserved rows", () => {
    // A row with no observed change is not a 0% mover; it is unknown.
    expect(watch).toContain("i.changeObserved && i.changePct > 0");
    expect(watch).toContain("i.changeObserved && i.changePct < 0");
  });

  it("change sorting ranks unobserved rows last, not at zero", () => {
    expect(watch).toContain("Number(b.changeObserved) - Number(a.changeObserved)");
  });

  it("the observation flag survives the window cache round trip", () => {
    expect(tape).toContain("chgObserved: t.chgObserved");
    expect(tape).toContain("chgObserved: p.chgObserved === true");
    expect(watch).toContain("changeObserved: it.changeObserved");
    expect(watch).toContain("changeObserved: c.changeObserved === true");
  });
});
