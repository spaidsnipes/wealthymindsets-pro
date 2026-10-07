/**
 * THE MEMBER'S WORDS — Founder, 2026-10-06 evening: "the homie is signed in and
 * all his charts say ACTIVE DEGRADED … unacceptable".
 *
 * A non-owner member has no tastytrade/Webull lane (owner-credential only), so
 * futures, FX, indices and (with the IEX relay down) stocks are served by a
 * polled REST quote. Measured 2026-10-07 00:37Z straight from the provider:
 * RTY=F last print 632s old (CME delay), GBPUSD=X 27s old. The chip said
 * ACTIVE DEGRADED for both. These fixtures are exactly that non-owner path:
 * no owner stream, source = the REST quote, age = the provider's own stamp.
 */
import { describe, expect, it } from "vitest";
import { CANONICAL_FIDELITY_LABELS as L } from "./canonicalFidelityLabels";
import { memberFeedWords, priceSourceBadge, POLLED_NEAR_LIVE_MS } from "@/lib/priceSource";
import { compileFeedStanding, type FeedObservation } from "@/lib/os/osChrome";
import { osFeedChipParts } from "@/lib/os/osFeedChipParts";
import { buildCanonicalFidelityTooltip } from "@/components/marketData/CanonicalFidelityBadge";

const NOW = 1_800_000_000_000;
const VENDORS = ["polygon", "coinbase", "binance", "alpaca", "finnhub", "yahoo", "moomoo", "longbridge", "webull", "tastytrade"];

/** The non-owner futures chart: REST quote, session open, CME-delayed print. */
const NON_OWNER_FUTURES: FeedObservation = {
  source: "yahoo",
  quotePresent: true,
  lastObservedAtMs: NOW - 632_000,
  connected: true,
  sessionOpen: true,
  barsPresent: true,
  replayEngaged: false,
};

describe("memberFeedWords — the plain words for ACTIVE DEGRADED", () => {
  it("a polled quote measured 10+ min old says DELAYED and how old, never ACTIVE DEGRADED", () => {
    const b = priceSourceBadge("yahoo", true, true, { present: true, ageMs: 632_000 });
    expect(b.label).toBe(L.ACTIVE_DEGRADED); // the engine grade is unchanged
    expect(b.live).toBe(false);              // truth is unchanged
    expect(b.plain).toMatchObject({ label: "DELAYED", detail: "price 10 min old" });
  });

  it("a polled quote inside 90s says POLLED — not live, not delayed", () => {
    const b = priceSourceBadge("yahoo", true, true, { present: true, ageMs: 27_000 });
    expect(b.plain).toMatchObject({ label: "POLLED", detail: "under 1 min old" });
    expect(b.live).toBe(false);
    expect(priceSourceBadge("finnhub", true, true, { present: true, ageMs: POLLED_NEAR_LIVE_MS + 1 }).plain?.label).toBe("DELAYED");
  });

  it("an unmeasured age is never rounded into 'polled/recent' — it reads DELAYED · polled quote", () => {
    expect(priceSourceBadge("yahoo", true, true, { present: true }).plain).toMatchObject({ label: "DELAYED", detail: "polled quote" });
    expect(memberFeedWords("yahoo", L.ACTIVE_DEGRADED, Number.NaN)?.label).toBe("DELAYED");
    expect(memberFeedWords("yahoo", L.ACTIVE_DEGRADED, -5)?.label).toBe("DELAYED");
  });

  it("IEX prints say what they are: real time, one exchange", () => {
    const b = priceSourceBadge("alpaca", true, true, { present: true, fresh: true });
    expect(b.label).toBe(L.ACTIVE_DEGRADED);
    expect(b.plain).toMatchObject({ label: "IEX REAL-TIME", detail: "one exchange only" });
  });

  it("only translates ACTIVE DEGRADED — LIVE, STALE, CLOSED keep their canon words", () => {
    expect(priceSourceBadge("coinbase", true, true, { present: true, fresh: true }).plain).toBeUndefined();
    expect(priceSourceBadge("yahoo", true, true, { present: true, fresh: false, ageMs: 600_000 }).plain).toBeUndefined();
    expect(priceSourceBadge("yahoo", true, false, { present: true, ageMs: 600_000 }).plain).toBeUndefined();
  });

  it("no plain reading ever names a vendor (WM-CHART-PROV-EMERG-01) or says LIVE for a polled quote", () => {
    for (const src of VENDORS) {
      for (const ageMs of [undefined, 5_000, 632_000, 9_000_000]) {
        const w = memberFeedWords(src, L.ACTIVE_DEGRADED, ageMs);
        if (!w) continue;
        const text = `${w.label} ${w.detail} ${w.title}`.toLowerCase();
        for (const v of VENDORS) expect(text, `${src} → ${text}`).not.toContain(v);
        if (src === "yahoo" || src === "finnhub") expect(w.label).not.toMatch(/LIVE/);
      }
    }
  });
});

describe("the masthead chip on the non-owner path", () => {
  it("futures: DELAYED · price 10 min old · asOf …, grade kept in the spoken sentence", () => {
    const feed = compileFeedStanding(NON_OWNER_FUTURES, NOW);
    expect(feed.label).toBe(L.ACTIVE_DEGRADED);
    expect(feed.plain?.label).toBe("DELAYED");
    const parts = osFeedChipParts(feed);
    expect(parts.label).toBe("DELAYED");
    expect(parts.detail).toBe("price 10 min old");
    expect(parts.instant).toMatch(/^asOf \d\d:\d\d:\d\d ET$/);
    expect(parts.spoken).toContain("feed grade: ACTIVE DEGRADED");
    expect(`${parts.label} ${parts.detail}`).not.toContain("ACTIVE DEGRADED");
  });

  it("FX: a 27s-old polled quote reads POLLED · under 1 min old", () => {
    const parts = osFeedChipParts(compileFeedStanding({ ...NON_OWNER_FUTURES, lastObservedAtMs: NOW - 27_000 }, NOW));
    expect(parts.label).toBe("POLLED");
    expect(parts.detail).toBe("under 1 min old");
  });

  it("a closed session still says SESSION CLOSED — the plain words never outrank closure", () => {
    const parts = osFeedChipParts(compileFeedStanding({ ...NON_OWNER_FUTURES, sessionOpen: false }, NOW));
    expect(parts.label).toBe(L.SESSION_CLOSED_LAST_VERIFIED);
  });

  it("crypto on the public stream is untouched: LIVE — CERTIFIED QUOTE", () => {
    const parts = osFeedChipParts(compileFeedStanding({ ...NON_OWNER_FUTURES, source: "coinbase", lastObservedAtMs: NOW - 2_000 }, NOW));
    expect(parts.label).toBe(L.LIVE_CERTIFIED_QUOTE);
  });
});

describe("the chart / tape / watchlist chip tooltip keeps the full grade", () => {
  it("names the plain reading and the engine grade it translates", () => {
    const b = priceSourceBadge("yahoo", true, true, { present: true, ageMs: 632_000 });
    const t = buildCanonicalFidelityTooltip(b);
    expect(t.startsWith(b.title)).toBe(true);
    expect(t).toContain("Shown as: DELAYED · price 10 min old");
    expect(t).toContain("Feed grade: ACTIVE DEGRADED");
  });
});
