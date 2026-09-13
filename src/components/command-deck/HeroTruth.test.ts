import { describe, expect, it } from "vitest";
import {
  heroSourceVendor,
  selectHeroSourceDisclosure,
  shouldShowMarketStateResolutionQualifier,
} from "./HeroTruth";

describe("HeroTruth market-state qualifier", () => {
  it("does not repeat UNKNOWN beside an UNKNOWN market state", () => {
    expect(shouldShowMarketStateResolutionQualifier("UNKNOWN", "UNKNOWN")).toBe(false);
  });

  it("keeps a distinct PARTIAL qualifier beside a named market state", () => {
    expect(shouldShowMarketStateResolutionQualifier("BALANCE", "PARTIAL")).toBe(true);
  });

  it("does not add a qualifier to resolved market state", () => {
    expect(shouldShowMarketStateResolutionQualifier("EXPANSION", "RESOLVED")).toBe(false);
  });
});

/**
 * The Founder's 2026-09-12 truth-surface law adopts the Grok-review delta:
 * "Minimum directly inspectable: role + asOf + source. Feed/entitlement may be
 * one interaction deeper. Missing role = UNKNOWN." Role and asOf were already
 * on the strip. Source was not — the strip printed a channel COUNT and named
 * no vendor, so a trader could see LIVE beside an unknowable origin. These
 * tests keep the SOURCE half of the trio honest.
 */
describe("HeroTruth source disclosure (Founder truth-surface law, 2026-09-12)", () => {
  it("splits vendor from feed on the first hyphen", () => {
    expect(heroSourceVendor("finnhub-rest")).toBe("finnhub");
    expect(heroSourceVendor("webull-openapi-ticks")).toBe("webull");
    expect(heroSourceVendor("coinbase-client-ws")).toBe("coinbase");
    expect(heroSourceVendor("polygon")).toBe("polygon");
  });

  it("collapses empty / hyphen-first paths to null so the strip says 'unknown'", () => {
    // The regression this fences: an empty providerPath defaulting to a brand
    // name because "the code needed a string." An honest UNKNOWN is worth more
    // than a plausible-looking lie.
    expect(heroSourceVendor("")).toBeNull();
    expect(heroSourceVendor("   ")).toBeNull();
    expect(heroSourceVendor("-orphan")).toBeNull();
  });

  it("says 'unknown' when no channel has stamped a source yet", () => {
    // A LIVE role beside 'unknown' source is a CONFLICTED read the Founder's
    // glass-vs-payload law wants the eye to catch. The strip may not paper it
    // over with the last brand it happened to see.
    expect(selectHeroSourceDisclosure([]).label).toBe("unknown");
    expect(selectHeroSourceDisclosure(undefined).label).toBe("unknown");
  });

  it("names the single vendor when one is answering", () => {
    const d = selectHeroSourceDisclosure([{ providerPath: "finnhub-rest" }]);
    expect(d.label).toBe("finnhub");
    // The full providerPath list is one interaction deeper via the strip's
    // `title` — that is the FEED/ENTITLEMENT half of the law, which is
    // allowed to hide until asked for.
    expect(d.detail).toBe("finnhub-rest");
  });

  it("deduplicates by vendor so many channels of one vendor don't shout louder", () => {
    // finnhub appearing on both a quote channel and a trade channel is not two
    // sources — it is one vendor doing two things.
    const d = selectHeroSourceDisclosure([
      { providerPath: "finnhub-rest" },
      { providerPath: "finnhub-ws" },
    ]);
    expect(d.label).toBe("finnhub");
    expect(d.detail).toBe("finnhub-rest, finnhub-ws");
  });

  it("compresses many distinct vendors to 'first +N' with the full list one hover deeper", () => {
    const d = selectHeroSourceDisclosure([
      { providerPath: "finnhub-rest" },
      { providerPath: "webull-openapi-ticks" },
      { providerPath: "coinbase-client-ws" },
    ]);
    expect(d.label).toBe("finnhub +2");
    expect(d.detail).toBe("finnhub-rest, webull-openapi-ticks, coinbase-client-ws");
  });
});
