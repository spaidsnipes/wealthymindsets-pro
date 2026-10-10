/**
 * THE CHART'S POSITION STRIP (Founder order §6, 2026-10-09): what it prints,
 * who may see it, and that it reads the ticket's one store.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { bookStripDisplay } from "./bookStripDisplay";
import type { BrokerBookStrip } from "./brokerReadbackStore";

const clock = () => "2:31 PM CDT";
const base: BrokerBookStrip = {
  state: "FLAT", contract: "/NQZ6", quantity: null, averagePrice: null, protection: null,
  working: 0, asOfMs: 1_700_000_000_000, freshness: "FRESH", words: "",
};
const texts = (s: BrokerBookStrip, compact = false, sample = false) => bookStripDisplay(s, { compact, sample, clock })?.parts.map(p => p.text) ?? null;

describe("what the strip prints", () => {
  it("no contract for this symbol: nothing is mounted", () => {
    expect(bookStripDisplay({ ...base, state: "NO_CONTRACT", contract: null }, { compact: false, sample: false, clock })).toBeNull();
  });

  it("flat says FLAT, the working count, and when it was read", () => {
    expect(texts(base)).toEqual(["FLAT", "0 working", "as of 2:31 PM CDT"]);
    expect(texts({ ...base, working: 2 })).toEqual(["FLAT", "2 working", "as of 2:31 PM CDT"]);
  });

  it("a position says side, size, price, protection and the working count", () => {
    const held: BrokerBookStrip = { ...base, state: "LONG", quantity: 2, averagePrice: 25010.25, protection: "UNPROTECTED", working: 1 };
    expect(texts(held)).toEqual(["LONG 2", "@ 25010.25", "UNPROTECTED", "1 working", "as of 2:31 PM CDT"]);
    expect(texts({ ...held, state: "SHORT", protection: "PROTECTED" })).toEqual(["SHORT 2", "@ 25010.25", "PROTECTED", "1 working", "as of 2:31 PM CDT"]);
  });

  it("UNPROTECTED is a truth word at every width; the phone drops only price and a fresh as-of", () => {
    const held: BrokerBookStrip = { ...base, state: "LONG", quantity: 2, averagePrice: 25010.25, protection: "UNPROTECTED", working: 1 };
    for (const compact of [false, true]) {
      const d = bookStripDisplay(held, { compact, sample: false, clock });
      expect(d?.parts.find(p => p.text === "UNPROTECTED")?.truth, String(compact)).toBe(true);
    }
    expect(texts(held, true)).toEqual(["LONG 2", "UNPROTECTED", "1 working"]);
  });

  it("a stale readback says STALE and its as-of — on the phone too — as a truth word", () => {
    const stale: BrokerBookStrip = { ...base, state: "LONG", quantity: 1, averagePrice: 100, protection: "PROTECTED", working: 1, freshness: "STALE" };
    for (const compact of [false, true]) {
      const d = bookStripDisplay(stale, { compact, sample: false, clock });
      const part = d?.parts.find(p => p.text.startsWith("STALE"));
      expect(part?.text, String(compact)).toBe("STALE · as of 2:31 PM CDT");
      expect(part?.truth).toBe(true);
    }
  });

  it("not read yet and naming the contract say so, and claim no position", () => {
    expect(texts({ ...base, state: "NOT_READ", asOfMs: null, freshness: "NEVER_READ" })).toEqual(["Position not read yet"]);
    expect(texts({ ...base, state: "RESOLVING", contract: null, asOfMs: null, freshness: "NEVER_READ" })).toEqual(["Naming the contract…"]);
  });

  it("a proof scene's book says SAMPLE first, and the spoken name says it is not the account", () => {
    const d = bookStripDisplay({ ...base, state: "LONG", quantity: 1, averagePrice: 100, protection: "UNPROTECTED" }, { compact: true, sample: true, clock });
    expect(d?.parts[0]).toMatchObject({ text: "SAMPLE", truth: true });
    expect(d?.spoken).toContain("Sample book, not your account.");
    expect(d?.spoken).toContain("UNPROTECTED");
  });

  it("the spoken name carries the contract and every part", () => {
    const d = bookStripDisplay({ ...base, working: 1 }, { compact: false, sample: false, clock });
    expect(d?.spoken).toBe("Position on /NQZ6: FLAT, 1 working, as of 2:31 PM CDT.");
  });
});

describe("the strip on the glass", () => {
  const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");
  const strip = read("src/components/chart/ChartBookStrip.tsx");
  const room = read("src/components/chart/ChartsDashboard.tsx");
  const css = read("src/app/globals.css");

  it("ANTI-VACUITY: the files were read", () => {
    expect(strip.length).toBeGreaterThan(1500);
    expect(room.length).toBeGreaterThan(100000);
  });

  it("reads the ticket's one store and the ticket's own audience gate — no fetch, no timer, no second grader", () => {
    expect(strip).toContain("useBrokerBookStrip(symbol, owner && scene !== null && !scene.anyFixture)");
    expect(strip).toContain('const owner = audience === "OWNER";');
    expect(strip).toContain("useBrokerAudience()");
    expect(strip).not.toMatch(/\bfetch\(|setInterval\(|setTimeout\(|requestAnimationFrame\(/);
  });

  it("mounts nothing for a guest, before the URL is read, or under another fixture scene", () => {
    expect(strip).toContain("if (!owner || scene === null) return null;");
    expect(strip).toContain("if (!sample && scene.anyFixture) return null;");
    expect(strip).toContain("if (!display) return null;");
  });

  it("the sample book comes through the ticket's own fixture selector and is labelled", () => {
    expect(strip).toContain("ticketFixtureLines(sample, sampleContract.contract.symbol, lastPrice, null, sampleAt)");
    expect(strip).toContain("sample: sample !== null");
  });

  it("is a door only: it opens the ticket and holds no order control", () => {
    expect(strip).toContain("onClick={onOpenTicket}");
    expect(strip).not.toMatch(/\/api\/|method:/);
    expect((strip.match(/<button/g) ?? []).length).toBe(1);
  });

  it("truth words never shrink", () => {
    expect(strip).toContain("flexShrink: 0");
    expect(strip).toContain('whiteSpace: "nowrap"');
    expect(strip).not.toMatch(/textOverflow|ellipsis|truncate/);
  });

  it("the room mounts it beside the TRADE door and on the phone row, both opening the ticket", () => {
    expect((room.match(/<ChartBookStrip\b/g) ?? []).length).toBe(2);
    expect(room).toContain('placement="BAR"');
    expect(room).toContain('placement="ROW"');
    expect((room.match(/onOpenTicket=\{\(\) => setTradeOpen\(true\)\}/g) ?? []).length).toBe(2);
  });

  it("only one of the two shows at any width, and the phone one takes the 44px floor", () => {
    expect(css).toMatch(/@media \(max-width: 767px\) \{\s*\.wm-book-strip--bar \{ display: none !important; \}\s*\.wm-book-strip--row \{ min-height: 44px !important;/);
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.wm-book-strip--row \{ display: none !important; \}/);
  });
});

/**
 * PHONE LANDSCAPE (≤520px tall, 2026-10-10 parity pass): the WAIT / WHY row is
 * hidden there and the instrument bar shows only Trade / Watchlist / Indicators,
 * so the position had no home. It stands as a fourth pill and drops its detail
 * parts — never a truth word.
 */
describe("phone landscape: the position strip is a pill in short form", () => {
  const held: BrokerBookStrip = { ...base, state: "LONG", quantity: 2, averagePrice: 25010.25, protection: "UNPROTECTED", working: 1 };

  it("only the average price and a fresh as-of are detail; truth words never are", () => {
    const d = bookStripDisplay(held, { compact: false, sample: true, clock })!;
    expect(d.parts.filter(p => p.detail).map(p => p.text)).toEqual(["@ 25010.25", "as of 2:31 PM CDT"]);
    for (const p of d.parts) expect(p.truth && p.detail, p.text).toBeFalsy();
    const stale = bookStripDisplay({ ...held, freshness: "STALE" }, { compact: false, sample: false, clock })!;
    expect(stale.parts.find(p => p.text.startsWith("STALE"))?.detail).toBeFalsy();
  });

  it("the component marks detail parts, and the short-landscape block shows the strip and hides only them", () => {
    const strip = readFileSync(path.join(process.cwd(), "src/components/chart/ChartBookStrip.tsx"), "utf8");
    expect(strip).toContain('data-book-detail={part.detail ? "yes" : undefined}');
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const at = css.indexOf("PHONE LANDSCAPE: THE POSITION IS THE FOURTH PILL");
    expect(at).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("}\n}", at) + 3);
    expect(block).toContain("@media (max-height: 520px) and (max-width: 1023px) {");
    expect(block).toContain(".wm-instrument-context-strip > .wm-book-strip--bar {");
    expect(block).toContain(".wm-book-strip [data-book-detail] { display: none !important; }");
    // Read after the block that hides every strip child but the three pills.
    expect(at).toBeGreaterThan(css.indexOf(".wm-instrument-context-strip > * { display: none !important; }"));
  });
});
