import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { osFeedChipParts } from "./osFeedChipParts";
import type { FeedStanding } from "./osChrome";

function standing(over: Partial<FeedStanding>): FeedStanding {
  return {
    label: "ACTIVE DEGRADED",
    detail: "observed",
    provenance: null,
    tone: "DELAYED",
    established: true,
    observedAtMs: null,
    ...over,
  } as FeedStanding;
}

/** 2027-01-15T08:00:00Z — 03:00:00 in New York, a deliberate zone crossing. */
const EPOCH = 1_800_000_000_000;

/**
 * THE EIGHT SENTENCES THE COMPILER CAN ACTUALLY PRODUCE, read out of
 * `osChrome.ts` rather than invented here. If a ninth is added, the last test
 * in this block fails until it is listed — because the whole point of the atom
 * is that every one of these reaches the glass.
 */
const REAL_DETAILS = [
  "certified realtime",
  "observed",
  "session closed",
  "historical bars",
  "transport disconnected",
  "no observation yet",
  "provider returned no quote",
  "quote arrived without a provider timestamp",
  "provider clock ahead of ours",
  "provider not recognised",
] as const;

describe("osFeedChipParts — the trailing chip has two halves, both on the glass", () => {
  it("× THE HOVER-ONLY HALF: the WHEN is a rendered part, not a title", () => {
    const p = osFeedChipParts(standing({ label: "ACTIVE DEGRADED", detail: "last print 41s ago" }));
    expect(p.label).toBe("ACTIVE DEGRADED");
    expect(p.detail).toBe("last print 41s ago");
    expect(p.separator).toBe("·");
  });

  it("× THE DANGLING SEPARATOR: no detail means no separator, not an empty one", () => {
    for (const bad of ["", "   ", null, undefined, 42, {}]) {
      const p = osFeedChipParts(standing({ detail: bad as never }));
      expect(p.detail, String(bad)).toBeNull();
      expect(p.separator, String(bad)).toBeNull();
      // And the spoken form must not carry a trailing "·" either.
      expect(p.spoken, String(bad)).not.toMatch(/·\s*$/);
      expect(p.spoken, String(bad)).toBe(p.label);
    }
  });

  it("× THE HOLE IN THE MASTHEAD: a blank label degrades, it never empties", () => {
    // The moment the feed is sick is the worst possible moment to render
    // nothing where a fidelity word belongs.
    for (const bad of ["", "   ", null, undefined, 7]) {
      const p = osFeedChipParts(standing({ label: bad as never }));
      expect(p.label, String(bad)).toBe("FEED UNKNOWN");
      expect(p.label.length, String(bad)).toBeGreaterThan(2);
    }
  });

  it("the chip is SPOKEN in the same order the eye reads it", () => {
    const p = osFeedChipParts(standing({ label: "LIVE — CERTIFIED QUOTE", detail: "certified realtime" }));
    expect(p.spoken).toBe("LIVE — CERTIFIED QUOTE · certified realtime");
    expect(p.spoken.indexOf("LIVE")).toBeLessThan(p.spoken.indexOf("certified realtime"));
  });

  it("× THE THREE STATES WEARING ONE WORD: FEED UNKNOWN is disambiguated", () => {
    /**
     * `compileFeedStanding` emits FEED UNKNOWN for three materially different
     * states — nothing attributed, a provider that answered without a price,
     * and a price that cannot be aged. They have three different next actions.
     * Before this owner they were one word on the glass and three sentences in
     * a tooltip, so on a touch device they were indistinguishable.
     */
    const spoken = new Set(
      ["no observation yet", "provider returned no quote", "quote arrived without a provider timestamp"]
        .map((d) => osFeedChipParts(standing({ label: "FEED UNKNOWN", detail: d, established: false })).spoken),
    );
    expect(spoken.size, "two FEED UNKNOWN states are still wearing the same chip").toBe(3);
  });

  it("an unestablished reading is MARKED, so the dot treatment cannot drift", () => {
    expect(osFeedChipParts(standing({ established: false })).unestablished).toBe(true);
    expect(osFeedChipParts(standing({ established: true })).unestablished).toBe(false);
    // Anything that is not literally `true` is not a claim of establishment.
    expect(osFeedChipParts(standing({ established: undefined as never })).unestablished).toBe(true);
  });

  it("× THE VENDOR LEAK: provenance never reaches any rendered field", () => {
    // WM-CHART-PROV-EMERG-01 — the Founder emergency. `provenance` is marked
    // INTERNAL at osChrome.ts:122-128 and this chip must not be the place it
    // gets back onto the glass.
    const p = osFeedChipParts(standing({ provenance: "yahoo", detail: "observed", observedAtMs: EPOCH }));
    // WIDENED with the chip's third part — a new rendered field is a new door
    // for the leak, and this list is the only thing that watches all of them.
    for (const field of [
      p.label, p.detail ?? "", p.separator ?? "", p.instant ?? "", p.instantSeparator ?? "", p.spoken,
    ]) {
      expect(field.toLowerCase(), "the vendor name reached a rendered field").not.toContain("yahoo");
    }
  });

  it("every sentence the compiler can emit survives the trip to the chip", () => {
    for (const d of REAL_DETAILS) {
      const p = osFeedChipParts(standing({ detail: d }));
      expect(p.detail, d).toBe(d);
      expect(p.spoken, d).toContain(d);
    }
  });

  it("× THE MISSING WALL CLOCK: the instant is a rendered part, in canon's words", () => {
    // F24 draws `INDICATIVE · asOf 09:24:17 ET`. The build reached
    // `ACTIVE DEGRADED · observed` — a verdict and a reason, and no moment.
    const p = osFeedChipParts(standing({ detail: "observed", observedAtMs: EPOCH }));
    expect(p.instant).toBe("asOf 03:00:00 ET");
    expect(p.instantSeparator).toBe("·");
    expect(p.spoken).toBe("ACTIVE DEGRADED · observed · asOf 03:00:00 ET");
    // Eye order: verdict, then reason, then moment.
    expect(p.spoken.indexOf("observed")).toBeLessThan(p.spoken.indexOf("asOf"));
  });

  it("× \"asOf —\": no instant means no slot at all, not an empty one", () => {
    const p = osFeedChipParts(standing({ detail: "observed", observedAtMs: null }));
    expect(p.instant).toBeNull();
    expect(p.instantSeparator).toBeNull();
    expect(p.spoken).toBe("ACTIVE DEGRADED · observed");
    expect(p.spoken).not.toMatch(/·\s*$/);
    expect(p.spoken).not.toContain("asOf");
  });

  it("× A NUMBER THAT CANNOT BE A TIME still cannot be printed as one", () => {
    // `readMarketFidelity` refuses a non-finite asOf (marketFidelityAlgebra
    // 158-162). Intl will happily format 0 into a confident "19:00:00 ET".
    const impossible = [
      NaN, Infinity, -Infinity, 0, -1, 1, 946_684_799_999, Date.UTC(2100, 0, 1),
      Date.UTC(2200, 0, 1), null, undefined, "1800000000000", {}, [],
    ];
    for (const bad of impossible) {
      const p = osFeedChipParts(standing({ observedAtMs: bad as never }));
      expect(p.instant, String(bad)).toBeNull();
      expect(p.instantSeparator, String(bad)).toBeNull();
      expect(p.spoken, String(bad)).not.toContain("asOf");
    }
    // POSITIVE CONTROL — the boundary one millisecond inside the window does
    // format, so the test above is refusing bad epochs rather than all epochs.
    expect(osFeedChipParts(standing({ observedAtMs: Date.UTC(2000, 0, 1) })).instant)
      .toMatch(/^asOf \d\d:\d\d:\d\d ET$/);
  });

  it("the chip never leads with a separator, even with a detail-less instant", () => {
    // Unreachable from today's compiler — every established arm carries a
    // detail — but this owner is total over `FeedStanding`, and the nested
    // ternary form it replaced produced a LEADING "·" in exactly this case.
    const p = osFeedChipParts(standing({ detail: "", observedAtMs: EPOCH }));
    expect(p.detail).toBeNull();
    expect(p.separator).toBeNull();
    expect(p.spoken).toBe("ACTIVE DEGRADED · asOf 03:00:00 ET");
    expect(p.spoken).not.toMatch(/^\s*·/);
    expect(p.spoken).not.toContain("· ·");
  });

  it("× REACT #418: the clock is PINNED, so a server and a browser agree", () => {
    /**
     * TWO HAZARDS, both closed, and only one of them is visible in the value.
     *
     * DETERMINISM — same epoch, same string, always. If anything in the chain
     * read the present moment, two calls a tick apart would diverge.
     */
    const once = osFeedChipParts(standing({ observedAtMs: EPOCH })).instant;
    expect(once).toBe(osFeedChipParts(standing({ observedAtMs: EPOCH })).instant);

    /**
     * ZONE — 1_800_000_000_000 is 08:00:00 UTC and 03:00:00 in New York. A
     * formatter left on the host's zone renders the first on a UTC server and
     * the second in a New York browser FROM THE SAME NUMBER, which is the
     * mismatch a deterministic input cannot save you from. Pinning the epoch
     * across a zone boundary is what makes this assertion discriminating: it
     * fails on any CI box not set to America/New_York if the zone is dropped.
     */
    expect(once).toBe("asOf 03:00:00 ET");
    expect(once).not.toContain("08:00:00");

    // MIDNIGHT under h23. `hour12: false` alone yields "24:00:17" on some ICU
    // builds — a different string for the same instant, i.e. a mismatch.
    const midnightET = Date.UTC(2027, 0, 15, 5, 0, 17); // 00:00:17 New York
    expect(osFeedChipParts(standing({ observedAtMs: midnightET })).instant)
      .toBe("asOf 00:00:17 ET");
  });

  it("the formatter reads NOTHING ambient — proven against the source", () => {
    // The value test above is blind on a machine whose TZ already is New York.
    // This reads the code instead: neither hazard can be present in it.
    const SRC = readFileSync(resolve(process.cwd(), "src/lib/os/osFeedChipParts.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    // ANTI-VACUITY: `""` satisfies every `not.toContain` below.
    expect(SRC.length, "osFeedChipParts read as empty code").toBeGreaterThan(400);
    expect(SRC).toContain('timeZone: "America/New_York"');
    expect(SRC).toContain('Intl.DateTimeFormat("en-US"');
    expect(SRC).toContain('hourCycle: "h23"');
    for (const ambient of ["Date.now(", "toLocaleTimeString", "toLocaleString", "new Date("]) {
      expect(SRC, `${ambient} is a render-time or host-dependent clock`).not.toContain(ambient);
    }
  });

  it("the listed sentences are the ones osChrome actually emits", () => {
    // ANCHORED AGAINST PROSE DRIFT. If a new `detail:` arm is added upstream
    // and not listed above, this fails — which is the only way the test above
    // can keep meaning "every state reaches the glass".
    const whole = readFileSync(resolve(process.cwd(), "src/lib/os/osChrome.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(whole.length, "osChrome read as empty code").toBeGreaterThan(5000);

    /**
     * SCOPED TO ONE COMPILER, AND THE FIRST DRAFT WAS NOT.
     *
     * `osChrome.ts` exports TWO things with a `detail` field: `FeedStanding`
     * (this chip) and `StandingCondition` (the rail's evidence-debt readings,
     * whose sentences are "no ledger compiled" / "compiled from evidence").
     * A file-wide scan swept both and demanded this chip cover four strings it
     * can never receive.
     *
     * The cure is NOT to add them to the list — that would make the guard
     * green by asserting something false. It is to read only the function that
     * actually produces this chip's input. `compileStandingCondition` gaining a
     * new sentence must not be able to fail a test about the feed badge, and a
     * new FEED sentence must still fail it.
     */
    const start = whole.indexOf("export function compileFeedStanding");
    expect(start, "compileFeedStanding was renamed — this guard is now blind")
      .toBeGreaterThan(-1);
    const next = whole.indexOf("\nexport ", start + 1);
    const src = whole.slice(start, next < 0 ? whole.length : next);
    expect(src.length, "compileFeedStanding sliced to nothing").toBeGreaterThan(800);

    const literals = [...src.matchAll(/detail:?\s*(?:=\s*)?"([^"]+)"/g)].map((m) => m[1]);
    const inlineTernary = [...src.matchAll(/\?\s*"([^"]+)"\s*\n?\s*:/g)].map((m) => m[1]);
    const emitted = new Set([...literals, ...inlineTernary]);
    // POSITIVE CONTROL: a slice that matched nothing would satisfy the
    // emptiness check below vacuously.
    expect(emitted.size, "no feed detail sentences found — the scan is blind")
      .toBeGreaterThanOrEqual(6);
    const unlisted = [...emitted].filter(
      (d) => !REAL_DETAILS.includes(d as never) && !/^(last print|SOURCE|AS OF)/.test(d),
    );
    expect(unlisted, "a feed detail sentence exists that this test does not cover").toEqual([]);
  });
});

describe("WMOperatingSystem adoption — the chip composes the owner", () => {
  const CODE = readFileSync(
    resolve(process.cwd(), "src/components/os/WMOperatingSystem.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("anchors on real code, not on an empty read", () => {
    expect(CODE.length, "WMOperatingSystem read as empty code").toBeGreaterThan(20000);
  });

  it("× THE SECOND OPINION: FeedBadge does not re-decide the halves", () => {
    expect(CODE).toContain('from "@/lib/os/osFeedChipParts"');
    expect(CODE).toContain("osFeedChipParts(feed)");
  });

  it("× THE HOVER-ONLY HALF, AT THE CALL SITE: the detail is a rendered node", () => {
    // Not merely present in a `title`. The whole defect was that `feed.detail`
    // existed only as an attribute value.
    expect(CODE).toMatch(/\{parts\.detail\}/);
    expect(CODE).toMatch(/parts\.separator/);
  });

  it("× THE MISSING WALL CLOCK, AT THE CALL SITE: the instant is painted", () => {
    // Same rule as the detail one line up: composed by the owner, rendered as a
    // node, gated on its own separator so it cannot dangle.
    expect(CODE).toMatch(/\{parts\.instant\}/);
    expect(CODE).toMatch(/parts\.instantSeparator !== null &&/);
    expect(CODE).toContain('data-testid="os-feed-standing-instant"');
  });

  it("the badge does not grow a clock of its own", () => {
    // The formatting lives in the pure owner precisely so this component cannot
    // become a render-time clock and re-open the #418 hydration mismatch.
    const badge = CODE.slice(CODE.indexOf("function FeedBadge"));
    expect(badge.length, "FeedBadge sliced to nothing — this guard is blind")
      .toBeGreaterThan(500);
    for (const ambient of ["Date.now(", "toLocaleTimeString", "Intl.DateTimeFormat"]) {
      expect(badge.slice(0, badge.indexOf("\nfunction ", 1)), ambient).not.toContain(ambient);
    }
  });

  it("the chip is announced as one sentence, not two loose spans", () => {
    expect(CODE).toMatch(/aria-label=\{parts\.spoken\}/);
    expect(CODE).toMatch(/title=\{parts\.spoken\}/);
  });

  it("the unestablished verdict still drives the hollow dot", () => {
    // Re-aimed, not relaxed: this used to read `feed.established` directly.
    // It now reads the owner's verdict, which is the same fact with one owner.
    expect(CODE).toMatch(/data-established=\{parts\.unestablished \? "false" : "true"\}/);
    expect(CODE).toMatch(/parts\.unestablished \? "transparent" : ink/);
  });
});
