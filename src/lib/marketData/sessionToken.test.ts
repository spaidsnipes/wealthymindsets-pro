/**
 * The compact session chip — Founding Contract §8, and canon Weakness #1
 * ("multi-truth disagreement on one page").
 *
 * FOUND LIVE, 2026-09-05 (a Saturday), on wealthymindsetspro.com/charts.
 * A single DOM read returned both of these, for GC1!, at the same moment:
 *
 *     header pill  →  "SESSION ?"
 *     chart body   →  "SESSION CLOSED — LAST VERIFIED"
 *
 * One surface called the session unknown while another called it closed, for
 * one instrument, on one screen. The shrug was the false one:
 * provenSessionClosure("GC1!", saturday) === false — PROVEN CLOSED.
 *
 * The pill decided with one ternary, and BOTH halves were wrong:
 *
 *     const sessionToken = futuresTruth ? "SESSION ?" : session;
 *      ├── futures     → a DEAD PREDICATE. selectCanonicalFuturesSessionTruth
 *      │                 returns a non-nullable object, so for any futures
 *      │                 symbol this was a constant `true`. It tested the
 *      │                 result's EXISTENCE and discarded its content.
 *      └── non-futures → `identity.session` is canonicalSession(extHours, cls),
 *                        a STORE KEY. It returns "RTH" for every non-crypto
 *                        instrument on every day of the week — so the phone
 *                        header asserted the US Regular session was running
 *                        on a Saturday.
 *
 * False humility on one side, false confidence on the other, from one line.
 *
 * These lock the owner's behaviour AND the pill's delegation to it. The
 * source-region assertions exist because the defect was never in
 * canonicalIdentity.ts — it was in the consumer that refused to call it.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import {
  provenSessionClosure,
  selectCanonicalSessionToken,
  SESSION_TOKEN_CLOSED,
  SESSION_TOKEN_CONTINUOUS,
  SESSION_TOKEN_UNKNOWN,
} from "./canonicalIdentity";

// The Saturday the contradiction was read off production.
const SATURDAY = new Date(2026, 8, 5);
const SUNDAY = new Date(2026, 8, 6);
const WEDNESDAY = new Date(2026, 8, 2);

describe("selectCanonicalSessionToken — closure that is proven is not withheld", () => {
  it("THE CORE REGRESSION: futures on a Saturday say CLOSED, not 'SESSION ?'", () => {
    // The exact instrument and the exact day from the live read.
    const r = selectCanonicalSessionToken({ symbol: "GC1!", at: SATURDAY });
    expect(r.token).toBe(SESSION_TOKEN_CLOSED);
    expect(r.established).toBe(true);
    // and the fact it rests on is real
    expect(provenSessionClosure("GC1!", SATURDAY)).toBe(false);
  });

  it("THE OTHER HALF: equities on a Saturday say CLOSED, never 'RTH'", () => {
    for (const sym of ["TSLA", "AAPL", "SPY"]) {
      const r = selectCanonicalSessionToken({ symbol: sym, at: SATURDAY });
      expect(r.token, `${sym} on a Saturday`).toBe(SESSION_TOKEN_CLOSED);
      expect(r.token).not.toBe("RTH");
      expect(r.token).not.toBe("EXTENDED");
    }
  });

  it("never emits a store-key session token for ANY symbol on ANY of the three days", () => {
    // "RTH"/"EXTENDED" are canonicalSession() outputs — store-key vocabulary.
    // They must never reach a user-visible chip, because this codebase cannot
    // separate regular from extended hours without an intraday calendar.
    for (const sym of ["TSLA", "SPY", "GC1!", "NQ1!", "EUR/USD", "BTC", "ETH"]) {
      for (const at of [SATURDAY, SUNDAY, WEDNESDAY, null]) {
        const { token } = selectCanonicalSessionToken({ symbol: sym, at });
        expect(["RTH", "EXTENDED", "OVERNIGHT"], `${sym} @ ${at}`).not.toContain(token);
      }
    }
  });

  it("proves Sunday closed for US cash but NOT for futures or FX — they reopen Sunday evening", () => {
    expect(selectCanonicalSessionToken({ symbol: "TSLA", at: SUNDAY }).token).toBe(SESSION_TOKEN_CLOSED);
    expect(selectCanonicalSessionToken({ symbol: "SPY", at: SUNDAY }).token).toBe(SESSION_TOKEN_CLOSED);
    // Claiming Sunday closure for these would be the same overreach inverted.
    expect(selectCanonicalSessionToken({ symbol: "NQ1!", at: SUNDAY }).token).toBe(SESSION_TOKEN_UNKNOWN);
    expect(selectCanonicalSessionToken({ symbol: "EUR/USD", at: SUNDAY }).token).toBe(SESSION_TOKEN_UNKNOWN);
  });

  it("'SESSION ?' is still the honest answer on a weekday — there is no intraday calendar", () => {
    for (const sym of ["TSLA", "GC1!", "EUR/USD"]) {
      const r = selectCanonicalSessionToken({ symbol: sym, at: WEDNESDAY });
      expect(r.token, sym).toBe(SESSION_TOKEN_UNKNOWN);
      expect(r.established, sym).toBe(false);
    }
  });

  it("continuous markets are 24X7 every day — they have no session to close", () => {
    for (const at of [SATURDAY, SUNDAY, WEDNESDAY]) {
      for (const sym of ["BTC", "ETH"]) {
        const r = selectCanonicalSessionToken({ symbol: sym, at });
        expect(r.token, `${sym} @ ${at}`).toBe(SESSION_TOKEN_CONTINUOUS);
        expect(r.established).toBe(true);
      }
    }
  });

  it("crypto is never labelled CLOSED, on any day", () => {
    for (const at of [SATURDAY, SUNDAY, WEDNESDAY, null]) {
      expect(selectCanonicalSessionToken({ symbol: "BTC", at }).token).not.toBe(SESSION_TOKEN_CLOSED);
    }
  });
});

describe("the settle can only ever sharpen — never introduce a claim", () => {
  it("at: null yields the unknown token for every non-continuous symbol", () => {
    // null = the server, and the first client render. Reading the clock during
    // render is the mechanism behind five prior React #418 bugs here.
    for (const sym of ["TSLA", "GC1!", "SPY", "EUR/USD"]) {
      const r = selectCanonicalSessionToken({ symbol: sym, at: null });
      expect(r.token, sym).toBe(SESSION_TOKEN_UNKNOWN);
      expect(r.established, sym).toBe(false);
    }
  });

  it("a null clock never produces a MORE confident token than a real one", () => {
    // Formal statement of "only sharpens": for every symbol and day, the
    // unresolved answer is never `established` when the resolved one is not.
    for (const sym of ["TSLA", "SPY", "GC1!", "NQ1!", "EUR/USD", "BTC"]) {
      const unresolved = selectCanonicalSessionToken({ symbol: sym, at: null });
      for (const at of [SATURDAY, SUNDAY, WEDNESDAY]) {
        const resolved = selectCanonicalSessionToken({ symbol: sym, at });
        if (!resolved.established) {
          expect(unresolved.established, `${sym} @ ${at}`).toBe(false);
        }
      }
    }
  });

  it("every token carries a non-empty reason, so the chip can always explain itself", () => {
    for (const sym of ["TSLA", "GC1!", "BTC"]) {
      for (const at of [SATURDAY, WEDNESDAY, null]) {
        const r = selectCanonicalSessionToken({ symbol: sym, at });
        expect(r.detail.trim().length, `${sym} @ ${at}`).toBeGreaterThan(10);
      }
    }
  });

  it("reads closure with === false, so null is never mistaken for open", () => {
    // provenSessionClosure returns `false | null`. A truthiness test would
    // read BOTH as falsy and silently drop the proven-closed case; a `!= null`
    // test would read null as closed. Only `=== false` is correct, and the
    // Wednesday/Saturday split above is what distinguishes them.
    expect(provenSessionClosure("TSLA", WEDNESDAY)).toBeNull();
    expect(provenSessionClosure("TSLA", SATURDAY)).toBe(false);
    expect(selectCanonicalSessionToken({ symbol: "TSLA", at: WEDNESDAY }).token).toBe(SESSION_TOKEN_UNKNOWN);
    expect(selectCanonicalSessionToken({ symbol: "TSLA", at: SATURDAY }).token).toBe(SESSION_TOKEN_CLOSED);
  });
});

/* ── Sentinel: the pill must DELEGATE, not re-decide ─────────────────────
 *
 * The owner above was already correct before this fix. The defect lived
 * entirely in the consumer, so a test that only exercises the owner would
 * have passed on the broken build — the ORKIN_F lesson. These read the
 * component source.
 *
 * Bans are asserted against COMMENT-STRIPPED source: the fix's own comments
 * quote the removed line verbatim (that is their purpose), so a naive
 * not.toMatch fails on the documentation rather than the defect.
 */

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const pillSrc = (): string =>
  readFileSync(resolve(__dirname, "../../components/layout/MobileSessionPill.tsx"), "utf8");

describe("MobileSessionPill delegates the session chip to the canonical owner", () => {
  it("PROOF the comment-stripper does not neuter the bans", () => {
    // A stripper that returned "" would make every ban below vacuously true.
    const sample = [
      "// sessionToken = futuresTruth ? \"SESSION ?\" : session;",
      "/* identity.session.toUpperCase() */",
      "const sessionToken = sessionTruth.token;",
      "const url = \"https://example.com/x\"; // trailing",
    ].join("\n");
    const out = stripComments(sample);
    expect(out).not.toContain("futuresTruth ?");
    expect(out).not.toContain("identity.session.toUpperCase()");
    // …and it keeps the real code, including the "//" inside a URL literal.
    expect(out).toContain("const sessionToken = sessionTruth.token;");
    expect(out).toContain("https://example.com/x");
    expect(out.match(/sessionTruth\.token/g)).toHaveLength(1);
  });

  it("calls selectCanonicalSessionToken and renders ITS token", () => {
    const src = stripComments(pillSrc());
    expect(src).toContain("selectCanonicalSessionToken");
    expect(src).toContain("const sessionToken = sessionTruth.token;");
  });

  it("BANS the dead ternary that decided the chip by a non-nullable result's existence", () => {
    const src = stripComments(pillSrc());
    expect(
      src,
      "the futures branch was a constant — it tested existence and discarded the content",
    ).not.toMatch(/futuresTruth\s*\?\s*["']SESSION \?["']/);
  });

  it("BANS rendering the STORE KEY session as a display truth", () => {
    const src = stripComments(pillSrc());
    // `identity.session` may still be read for the requested-hours FILTER
    // (a user preference), but must never be turned into the visible token.
    expect(src).not.toMatch(/const\s+session\s*=\s*identity\.session/);
    expect(src).not.toMatch(/\{\s*session\s*\}/);
  });

  it("uses the mount-safe day clock, not a clock read during render", () => {
    const src = stripComments(pillSrc());
    expect(src).toContain("useSessionClockDate");
    // The tape-freshness clock is a DIFFERENT cadence and must not be
    // repurposed as the day-boundary clock.
    expect(src).toContain("at: sessionClockDate");
  });

  it("the accessible name and the visible chip come from the SAME owner", () => {
    const src = stripComments(pillSrc());
    // Before the fix the aria string distinguished observed futures activity
    // while the chip showed one glyph for every state — the accessible name
    // carried more truth than the pixel.
    expect(src).toMatch(/accessibleStatus\s*=\s*`session \$\{sessionToken\}/);
    expect(src).toContain("sessionTruth.detail");
  });
});

/* ── The nest: the same defect on the DESKTOP surface ────────────────────
 *
 * The pill was not alone. /command-deck's CommandContextRibbon receives
 * `session={identity.session}` — the same store key — and its SESSION tile
 * rendered, on the same Saturday, in two adjacent DOM nodes:
 *
 *     value  →  "RTH"
 *     detail →  "market closed"
 *
 * Not two surfaces disagreeing. ONE TILE disagreeing with itself, where the
 * detail branch had already computed `isWeekend` and the value branch, one
 * line above, refused to use it. A third voice joined in: `sessionTone` was
 * called with the raw `session` prop, hit its `s === "RTH"` case, and painted
 * the tile the ESTABLISHED colour on a day its own caption called closed.
 *
 * The presenter's own behaviour is asserted in sessionDetailText.test.ts.
 * These are the CALL-SITE bans — the three defects lived in how the ribbon
 * called a presenter, which is exactly where a selector-only test cannot see.
 */

const ribbonSrc = (): string =>
  readFileSync(resolve(__dirname, "../../components/command/CommandContextRibbon.tsx"), "utf8");

describe("CommandContextRibbon derives the SESSION tile from the owner, not the store key", () => {
  it("PROOF the stripper leaves this file's real code intact", () => {
    // Same neutering hazard as above, re-proved against THIS file: a stripper
    // that returned "" would make all four bans below vacuously true.
    const src = stripComments(ribbonSrc());
    expect(src).toContain("selectCanonicalSessionPresentation");
    expect(src.length).toBeGreaterThan(1000);
  });

  it("BANS the fabricated weekday — new Date(0) is 1970-01-01, a Thursday in UTC", () => {
    const src = stripComments(ribbonSrc());
    // `dayOfWeek: new Date(nowMs ?? 0).getDay()` asserted a WEEKDAY on the
    // first paint of every Saturday, before the clock effect had run.
    expect(src).not.toMatch(/dayOfWeek\s*:/);
    expect(src).not.toMatch(/new Date\(\s*nowMs\s*\?\?\s*0\s*\)/);
  });

  it("passes a nullable clock, so the unsettled first paint makes no day claim", () => {
    const src = stripComments(ribbonSrc());
    expect(src).toMatch(/at:\s*nowMs == null \? null : new Date\(nowMs\)/);
  });

  it("BANS toning the tile from the raw store-key prop", () => {
    const src = stripComments(ribbonSrc());
    // `sessionTone(session, wsConnected)` is what painted Saturday green.
    expect(src).not.toMatch(/sessionTone\(\s*session\s*,/);
    expect(src).toMatch(/sessionTone\(\s*sessionPresentation\.value\s*,/);
  });

  it("BANS a dead 'RTH' branch in the tone function — the presenter cannot return it", () => {
    const src = stripComments(ribbonSrc());
    // Leaving the branch in place would be a second dead predicate, and a dead
    // predicate is what started this entire thread of defects.
    expect(src).not.toMatch(/s === "RTH"/);
  });
});
