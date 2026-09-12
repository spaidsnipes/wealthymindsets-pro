import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { selectQuoteStance, selectExpressionCard } from "./expressionCard";
import { nominalOptionExpiryMs } from "./optionContractResponse";

/**
 * GATE 3 — the attached Option Expression, and the owner it now shares.
 *
 * FAILURE CLASS THIS CLOSES: the three PRE-TRADE judgements (quote ROLE,
 * SPREAD HEALTH, TIME FIT) were computed only inside `selectExpressionCard`,
 * which needs an entry premium, a filled quantity and a thesis invalidation
 * level. So they could only be known AFTER the trade, and reached only /paper.
 * On /charts — where the decision is actually made — the Founder saw raw
 * bid/ask/last and did the arithmetic in his head.
 *
 * The repair is an EXTRACTION, not a second implementation. This file proves
 * both halves of that claim:
 *   1. the extracted selector is correct on its own, and
 *   2. `selectExpressionCard` still agrees with it field-for-field, so no
 *      second opinion about "WIDE" can exist in this repo.
 *
 * Plus a reach Sentinel: the chart consumer must DELEGATE, not re-derive.
 */

const NOW = Date.UTC(2026, 8, 12, 15, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

describe("selectQuoteStance — role", () => {
  it("prefers BID and names it", () => {
    const s = selectQuoteStance({ bid: 1.2, ask: 1.4 });
    expect(s.premium).toBe(1.2);
    expect(s.role).toBe("BID");
  });

  it("falls to MID only when the bid is zero, and still names the role", () => {
    // A zero bid is a real quote — nobody is buying — so the number shown must
    // not silently become a MID wearing a BID's authority.
    const s = selectQuoteStance({ bid: 0, ask: 2 });
    expect(s.premium).toBe(1);
    expect(s.role).toBe("MID");
  });

  it("uses a modeled premium ONLY when no quote exists, and says MODELED", () => {
    expect(selectQuoteStance({ modeledPremium: 3 }).role).toBe("MODELED");
    // A real quote outranks the model even when the model is prettier.
    expect(selectQuoteStance({ bid: 1, ask: 1.1, modeledPremium: 9 }).role).toBe("BID");
  });

  it("is UNKNOWN — never silent — when nothing sourced a number", () => {
    const s = selectQuoteStance({});
    expect(s.premium).toBeNull();
    expect(s.role).toBe("UNKNOWN");
  });

  it("refuses non-finite and negative inputs rather than propagating them", () => {
    expect(selectQuoteStance({ bid: Number.NaN, ask: Number.NaN }).role).toBe("UNKNOWN");
    expect(selectQuoteStance({ bid: -1, ask: -1 }).role).toBe("UNKNOWN");
  });
});

describe("selectQuoteStance — spread health", () => {
  it("grades TIGHT / NORMAL / WIDE at the canon boundaries", () => {
    expect(selectQuoteStance({ bid: 1.95, ask: 2.05 }).spreadHealth).toBe("TIGHT"); // 5%
    expect(selectQuoteStance({ bid: 1.85, ask: 2.15 }).spreadHealth).toBe("NORMAL"); // 15%
    expect(selectQuoteStance({ bid: 1.8, ask: 2.2 }).spreadHealth).toBe("WIDE"); // 20%
  });

  it("reports UNKNOWN for a crossed or one-sided book instead of a number", () => {
    expect(selectQuoteStance({ bid: 2, ask: 1 }).spreadHealth).toBe("UNKNOWN");
    expect(selectQuoteStance({ bid: 2 }).spreadHealth).toBe("UNKNOWN");
    expect(selectQuoteStance({ bid: 2 }).spreadAbs).toBeNull();
  });
});

describe("selectQuoteStance — time fit", () => {
  it("buckets by hours remaining", () => {
    expect(selectQuoteStance({ expiryMs: NOW + 4 * 3_600_000, nowMs: NOW }).timeFit).toBe("0DTE");
    expect(selectQuoteStance({ expiryMs: NOW + 2 * DAY, nowMs: NOW }).timeFit).toBe("SHORT");
    expect(selectQuoteStance({ expiryMs: NOW + 10 * DAY, nowMs: NOW }).timeFit).toBe("NORMAL");
    expect(selectQuoteStance({ expiryMs: NOW + 60 * DAY, nowMs: NOW }).timeFit).toBe("LONG");
    expect(selectQuoteStance({ expiryMs: NOW - 1, nowMs: NOW }).timeFit).toBe("EXPIRED");
  });

  it("is UNKNOWN when the browser has not yet stated the time", () => {
    // The chart consumer passes `nowMs: null` until its first post-mount tick.
    // That must degrade, not read as EXPIRED — an EXPIRED badge on a healthy
    // contract is a false alarm the trader learns to ignore.
    const s = selectQuoteStance({ expiryMs: NOW + DAY, nowMs: null });
    expect(s.timeFit).toBe("UNKNOWN");
    expect(s.hoursToExpiry).toBeNull();
  });
});

describe("no second opinion — the card delegates", () => {
  it("selectExpressionCard reports exactly what the stance selector reports", () => {
    const quote = { bid: 1.8, ask: 2.2, expiryMs: NOW + 2 * DAY, nowMs: NOW };
    const stance = selectQuoteStance(quote);
    const card = selectExpressionCard({
      ...quote,
      underlyingSymbol: "TSLA", contractLabel: "TSLA 400C", isCall: true, strike: 400,
      qtyRequested: 1, qtyFilled: 1, entryPremium: 2,
      underlyingEntry: 395, underlyingInvalidation: 390,
    });
    expect(card.currentPremium).toBe(stance.premium);
    expect(card.currentPremiumRole).toBe(stance.role);
    expect(card.spreadAbs).toBe(stance.spreadAbs);
    expect(card.spreadPctOfMid).toBe(stance.spreadPctOfMid);
    expect(card.spreadHealth).toBe(stance.spreadHealth);
    expect(card.hoursToExpiry).toBe(stance.hoursToExpiry);
    expect(card.timeFit).toBe(stance.timeFit);
    // Guard the guard: a stance of all-UNKNOWN would make the above vacuous.
    expect(stance.spreadHealth).toBe("WIDE");
    expect(stance.role).toBe("BID");
  });
});

describe("nominalOptionExpiryMs", () => {
  it("resolves the nominal 16:00 New York close, not midnight", () => {
    expect(nominalOptionExpiryMs("2026-09-18")).toBe(Date.UTC(2026, 8, 18, 20, 0, 0));
  });

  it("MEASURED DEFECT: follows New York across the DST boundary", () => {
    // This function returned a literal 20:00Z for EVERY date, and the comment
    // above it defended the resulting one-hour error as "conservative". From
    // early November to mid-March that made every contract read one hour
    // closer to expiry than it was — a same-day contract at 15:10 New York in
    // December rendered EXPIRED with fifty minutes of trading left.
    //
    // January is Eastern STANDARD time: 16:00 New York is 21:00Z.
    expect(nominalOptionExpiryMs("2027-01-15")).toBe(Date.UTC(2027, 0, 15, 21, 0, 0));
    // July is Eastern DAYLIGHT time: 16:00 New York is 20:00Z.
    expect(nominalOptionExpiryMs("2026-07-17")).toBe(Date.UTC(2026, 6, 17, 20, 0, 0));
  });

  it("lands on 16:00 New York on both sides of each 2026 transition", () => {
    // Bracket the actual switch dates rather than trusting two sample months.
    // DST began 2026-03-08 and ends 2026-11-01, so each pair straddles one.
    const EST = 21, EDT = 20;
    const cases: [string, number][] = [
      ["2026-03-06", EST], ["2026-03-13", EDT],
      ["2026-10-30", EDT], ["2026-11-06", EST],
    ];
    for (const [date, utcHour] of cases) {
      const ms = nominalOptionExpiryMs(date);
      expect(ms, `${date} did not resolve`).not.toBeNull();
      expect(new Date(ms as number).toISOString(), `${date} is not 16:00 New York`)
        .toBe(`${date}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);
    }
  });

  it("never lets a same-day contract read EXPIRED while New York is still open", () => {
    // The founder-visible consequence, stated as behaviour rather than as an
    // offset. 15:10 New York on a January expiry is 20:10Z — under the old
    // hardcoded 20:00Z this was already past expiry.
    const expiry = nominalOptionExpiryMs("2027-01-15");
    const tenPastThree = Date.UTC(2027, 0, 15, 20, 10, 0);
    expect(selectQuoteStance({ expiryMs: expiry, nowMs: tenPastThree }).timeFit).toBe("0DTE");
  });

  it("is UNKNOWN for a date it cannot parse", () => {
    expect(nominalOptionExpiryMs("2026-13-01")).toBeNull();
    expect(nominalOptionExpiryMs("not-a-date")).toBeNull();
    expect(nominalOptionExpiryMs("")).toBeNull();
  });

  it("never reads a same-day contract as EXPIRED before the close", () => {
    // The defect this helper exists to prevent: a midnight-UTC expiry makes a
    // contract with six hours of life left render EXPIRED.
    const expiry = nominalOptionExpiryMs("2026-09-18");
    const midMorning = Date.UTC(2026, 8, 18, 14, 0, 0);
    expect(selectQuoteStance({ expiryMs: expiry, nowMs: midMorning }).timeFit).toBe("0DTE");
  });
});

describe("SENTINEL: the chart consumer delegates and never re-derives", () => {
  const expression = fs.readFileSync(
    path.join(process.cwd(), "src/components/chart/OptionExpressionIntent.tsx"), "utf8");

  it("POSITIVE CONTROL: this test actually read the component", () => {
    // Without this, a rename makes every `not.toContain` below pass against an
    // empty string. That vacuity has shipped in this repo before.
    expect(expression.length).toBeGreaterThan(1000);
    expect(expression).toContain("export function OptionExpressionIntent");
  });

  it("imports the shared owner", () => {
    expect(expression).toContain('import { selectQuoteStance } from "@/lib/expressionCard"');
    expect(expression).toContain("nominalOptionExpiryMs(contract.expirationDate)");
  });

  it("renders all three judgements, each able to say UNKNOWN", () => {
    expect(expression).toContain("Sell-now reference");
    expect(expression).toContain("Spread");
    expect(expression).toContain("Time fit");
    expect(expression).toContain("stance.role");
    expect(expression).toContain("stance.spreadHealth");
    expect(expression).toContain("stance.timeFit");
  });

  it("states the time-fit limit as text, not as a hover nobody can reach", () => {
    // This surface's primary devices are the phone and the iPad, which have no
    // hover. The observation stamps were moved out of a `title` for exactly
    // that reason, and the time-fit caveat was left behind in one — where it
    // then went stale and spent an unknown period asserting a one-hour
    // conservative error that had been fixed. A caveat nobody can reach is a
    // caveat that is not being made, and it is also a caveat nobody proofreads.
    expect(expression).toContain("standard 16:00 New York close");
    expect(expression).not.toMatch(/<dd\s+title=/);
    // The specific false claim, so it cannot be restored by a careless revert.
    expect(expression).not.toContain("reads conservatively");
  });

  it("does not hand-roll the spread grade next to the owner that owns it", () => {
    // A local `ask - bid`, or a local percent-of-mid threshold, is how the
    // second opinion comes back. COMPARING to the owner's vocabulary for
    // styling is fine and is deliberately not forbidden here — the ban is on
    // re-deriving the verdict, not on reading it.
    expect(expression).not.toMatch(/contract\.ask\s*-\s*contract\.bid/);
    expect(expression).not.toMatch(/spreadPctOfMid\s*<=/);
    expect(expression).not.toMatch(/hoursToExpiry\s*<=/);
  });

  it("offers no modeled premium on a surface that reviews an observed chain", () => {
    // MODELED here would manufacture a number at the exact moment the trader is
    // deciding whether the contract is worth expressing.
    expect(expression).not.toContain("modeledPremium:");
  });

  it("keeps the clock out of render", () => {
    // Reading the clock during render was a live React #418 hydration defect in
    // this repo. The stance must take `receiptClock`, which is state.
    //
    // Scoped to the selectQuoteStance CALL, not the whole file: `record()`
    // legitimately reads Date.now() inside an event handler, and a file-wide
    // ban would have forbidden that too — a Sentinel that fires on correct
    // code is a Sentinel that gets deleted.
    const call = /selectQuoteStance\(\{[\s\S]*?\n\s*\}\);/.exec(expression)?.[0];
    expect(call, "the selectQuoteStance call site was not found").toBeTruthy();
    expect(call).toContain("nowMs: receiptClock");
    expect(call).not.toContain("Date.now()");
    expect(call).not.toContain("new Date");
  });
});
