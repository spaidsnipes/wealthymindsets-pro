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
    ...over,
  } as FeedStanding;
}

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
    const p = osFeedChipParts(standing({ provenance: "yahoo", detail: "observed" }));
    for (const field of [p.label, p.detail ?? "", p.separator ?? "", p.spoken]) {
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
