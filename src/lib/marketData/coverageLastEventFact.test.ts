import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { coverageLastEventFact, type LastEventTone } from "./coverageLastEventFact";

const NOW = 1_786_000_000_000; // a real millisecond instant, 2026-08-06T...Z

describe("coverageLastEventFact — a dash, a hidden clock, and an unbounded sentence", () => {
  it("× THE SECONDS-VALUED CONFIDENT SENTENCE: a unit error is named, not rendered", () => {
    // The very same instant, expressed in SECONDS — the unit `LegacyOhlcvTuple.time`
    // and `liveBarPolicy` use while `coverageMap` writes milliseconds.
    const f = coverageLastEventFact(NOW / 1000, "COLLECTING", NOW, "trades");
    expect(f.tone).toBe("IMPLAUSIBLE");
    expect(f.measured).toBe(false);
    expect(f.text).toBe("Timestamp unreadable");
    expect(f.text).not.toMatch(/ago/);          // the old line said "20443d ago"
    expect(f.reason).toMatch(/SECONDS/);
  });

  it("× THE NEGATIVE AGE: a future-dated receipt is not a measurement", () => {
    const f = coverageLastEventFact(NOW + 5 * 60_000, "COLLECTING", NOW, "quotes");
    expect(f.tone).toBe("IMPLAUSIBLE");
    expect(f.text).toBe("Dated in the future");
    expect(f.text).not.toContain("-");
    // Ordinary skew is tolerated rather than alarmed about.
    expect(coverageLastEventFact(NOW + 5_000, "COLLECTING", NOW, "quotes").measured).toBe(true);
  });

  it("× THE DASH THAT WAS THREE ANSWERS: absence resolves by coverage state", () => {
    const unavailable = coverageLastEventFact(undefined, "UNAVAILABLE", NOW, "depth");
    const connecting = coverageLastEventFact(undefined, "CONNECTING", NOW, "depth");
    const unrecorded = coverageLastEventFact(undefined, "COLLECTING", NOW, "depth");
    const texts = new Set([unavailable.text, connecting.text, unrecorded.text]);
    expect(texts.size).toBe(3);                  // three conditions, three sentences
    for (const f of [unavailable, connecting, unrecorded]) {
      expect(f.tone).toBe("NONE");
      expect(f.measured).toBe(false);
      expect(f.text).not.toBe("—");
      expect(f.text.length).toBeGreaterThan(2);
    }
    expect(unavailable.reason).toMatch(/CAPABILITY statement/);
    expect(connecting.reason).toMatch(/TIMING statement/);
    expect(unrecorded.reason).toMatch(/gap in WM/);
  });

  it("× THE HIDDEN CLOCK: `now` is required and is the only clock used", () => {
    // Same value, two different clocks → two different answers, proving the
    // function reads no clock of its own.
    const a = coverageLastEventFact(NOW - 120_000, "COLLECTING", NOW, "trades");
    const b = coverageLastEventFact(NOW - 120_000, "COLLECTING", NOW + 3_600_000, "trades");
    expect(a.text).toBe("2m ago");
    expect(b.text).toBe("1h ago");
    expect(coverageLastEventFact.length).toBe(4); // no defaulted clock parameter
  });

  it("× THE PHANTOM ZERO AND THE UNREADABLE VALUE", () => {
    for (const v of [0, -1, Number.NaN, "1786000000000", null, undefined, {}]) {
      const f = coverageLastEventFact(v, "COLLECTING", NOW, "trades");
      expect(f.measured).toBe(false);
      expect(f.tone).toBe("NONE");
      expect(f.text).not.toContain("NaN");
      expect(f.text).not.toMatch(/ago/);
    }
  });

  it("× THE AGELESS RECEIPT: a day-old event does not wear a fresh one's tone", () => {
    const fresh = coverageLastEventFact(NOW - 60_000, "COLLECTING", NOW, "trades");
    const old = coverageLastEventFact(NOW - 3 * 86_400_000, "COLLECTING", NOW, "trades");
    expect(fresh.tone).toBe("OBSERVED");
    expect(old.tone).toBe("AGING");
    expect(old.measured).toBe(true);             // still shown — it is real
    expect(old.text).toBe("3d ago");
  });

  it("× THE BORROWED LIVENESS: no arm claims the channel is flowing now", () => {
    const tones = new Set<LastEventTone>();
    for (const v of [NOW - 1000, NOW - 5 * 86_400_000, NOW / 1000, undefined]) {
      const f = coverageLastEventFact(v, "COLLECTING", NOW, "trades");
      tones.add(f.tone);
      expect(f.reason).not.toMatch(/real-?time|is live|healthy now/i);
    }
    expect(tones.size).toBe(4);                  // four qualities, four distinct tones
  });
});

describe("/nectar/[symbol] Last-event row adoption", () => {
  const src = readFileSync(join(process.cwd(), "src/app/nectar/[symbol]/page.tsx"), "utf8");

  it("× THE BARE GLYPH: the row no longer renders an unowned dash", () => {
    expect(src).toContain("coverageLastEventFact");
    expect(src).not.toContain('ch.lastEventAt ? relTime(ch.lastEventAt) : "—"');
  });

  it("× THE SILENT ROW: the row carries a tone and a reason like its siblings", () => {
    expect(src).toContain("LAST_EVENT_TONE");
    expect(src).toMatch(/tone=\{LAST_EVENT_TONE\[/);
    expect(src).toMatch(/title=\{[A-Za-z]*[Ll]astEvent[A-Za-z]*\.reason\}/);
  });

  it("× THE DEAD-IMPORT PASS: the owner is imported AND used", () => {
    expect(src.split("coverageLastEventFact").length - 1).toBeGreaterThan(1);
  });
});
