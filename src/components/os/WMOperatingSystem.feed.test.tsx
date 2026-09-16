/**
 * THE MASTHEAD'S THREE FEED DECLARATIONS, MEASURED IN THE RENDERED FRAME.
 *
 * WHY THIS FILE IS NOT A SOURCE SCAN
 *
 * Its siblings (WMOperatingSystem.frame.sentinel.test.tsx, osStandingContext's
 * FORGET law) scan source because what they assert lives inside an effect, and
 * this repo has no DOM environment so effects never fire. This law does not:
 * `feed` is an ordinary PROP of the frame and the badge is an ordinary child of
 * the masthead, so renderToStaticMarkup answers the question exactly. When the
 * real thing can be measured, measure it.
 *
 * WHAT IS BEING PROTECTED
 *
 * Measured on the live build, /nectar/TSLA — a memory room with 0 canvases, 0
 * prices and no socket — wore FEED UNKNOWN. That badge says "the OS cannot
 * establish the state of its feed". The Vault has no feed. Asking an open
 * question about a pipeline that does not exist is not caution; it is the
 * chrome inventing a subject.
 *
 * The canon already answers this case: UNKNOWN inputs ⇒ render no chip at all
 * (canon §silence-is-a-feature). So the fix is silence — but ONLY when a room
 * positively declares it. Hence three declarations, not two, and hence this
 * file: the whole value of the change is that the three stay distinguishable.
 * A test that only checked "FEEDLESS is silent" would pass just as well after
 * someone collapsed `null` into silence too, which would blank the badge on
 * /charts for every frame before its first tick.
 *
 * NOTE ON THE CLOCK. renderToStaticMarkup runs no effects, so
 * useFeedEvaluationClock is still 0 here and every observation is graded
 * against epoch. That is fine: the TONE ladder is proven by value in
 * osChrome.test.ts. What is proven here is PRESENCE — which of the three
 * declarations puts a badge on the masthead at all.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";

import { WMOperatingSystem } from "./WMOperatingSystem";
import { FEEDLESS_SURFACE, type FeedDeclaration } from "@/lib/os/osChrome";

/** A room that has wired a real feed and heard from it. */
const OBSERVED = {
  source: "polygon",
  quotePresent: true,
  lastObservedAtMs: 1_700_000_000_000,
  connected: true,
  sessionOpen: true,
} as const;

/** The masthead as a string, for one feed declaration. */
function frame(feed: FeedDeclaration): string {
  return renderToStaticMarkup(
    <WMOperatingSystem
      activeHref="/charts"
      surface="Charts"
      openEvidenceItems={null}
      rightOfWay="UNKNOWN"
      rightOfWayResolved={false}
      feed={feed}
    >
      <div>room</div>
    </WMOperatingSystem>,
  );
}

/** The badge element, identified by the testid the frame stamps on it. */
const BADGE = 'data-testid="os-feed-standing"';

describe("the masthead distinguishes THREE feed declarations, not two", () => {
  it("FEEDLESS_SURFACE — the room carries no feed, so the masthead says nothing", () => {
    // Not "FEED NONE", not a hollow dot, not an em-dash. The slot is omitted
    // entirely, exactly as `surface: null` omits the surface chip. A quiet
    // placeholder still occupies the position where a reading belongs and is
    // read as one at a glance.
    expect(frame(FEEDLESS_SURFACE)).not.toContain(BADGE);
  });

  it("null — no room has published YET, which is a genuine open question", () => {
    // Every room, including /charts, passes through `null` on its way to its
    // first publication. If this were silent too, the primary trading surface
    // would blink blank on every navigation — and a blank reads as fine.
    const html = frame(null);
    expect(html).toContain(BADGE);
    expect(html).toContain('data-tone="UNKNOWN"');
    expect(html).toContain('data-established="false"');
  });

  it("an observation — the room handed over evidence, so the badge is drawn", () => {
    expect(frame(OBSERVED)).toContain(BADGE);
  });

  it("the three are not two: silence belongs to exactly one of them", () => {
    // The single assertion that would have failed on every wrong version of
    // this change — the one that silenced the badge whenever `feed` was falsy,
    // and the one that silenced nothing and kept the Vault's open question.
    const drawn = ([FEEDLESS_SURFACE, null, OBSERVED] as const).map((d) =>
      frame(d).includes(BADGE),
    );
    expect(drawn).toEqual([false, true, true]);
  });
});

describe("the provenance line inherits the same silence", () => {
  it("FEEDLESS_SURFACE prints no SOURCE segment — there is no source to name", () => {
    // "SOURCE UNKNOWN" at the foot of a room with no pipeline is the same
    // invented subject as the badge, one bar lower. compileProvenanceSegments
    // takes the compiled standing, so silencing the badge must silence this
    // too or the two halves of the chrome disagree on the same screen.
    expect(frame(FEEDLESS_SURFACE)).not.toContain("SOURCE");
  });

  it("null still prints SOURCE UNKNOWN — the open question is stated in both places", () => {
    expect(frame(null)).toContain("SOURCE UNKNOWN");
  });
});

/**
 * The Vault is the room this atom was opened for. If it stops declaring, the
 * tests above keep passing while the defect returns to the screen — so the
 * declaration itself is asserted, at its one call site.
 */
describe("the Vault declares its feedlessness rather than leaving it open", () => {
  const VAULT = readFileSync(
    new URL("../../app/nectar/[symbol]/page.tsx", import.meta.url),
    "utf8",
  );

  /** The publish call, isolated so other code cannot satisfy the scan. */
  const publishCall = (() => {
    const start = VAULT.indexOf("usePublishOsStanding({");
    expect(start, "the Vault must publish an OS standing at all").toBeGreaterThan(-1);
    const end = VAULT.indexOf("});", start);
    expect(end).toBeGreaterThan(start);
    return VAULT.slice(start, end);
  })();

  it("publishes FEEDLESS_SURFACE", () => {
    expect(publishCall).toMatch(/feed:\s*FEEDLESS_SURFACE/);
  });

  it("POSITIVE CONTROL — the scan can tell a Vault that went back to silence-by-omission", () => {
    const withoutDeclaration = publishCall.replace(/feed:\s*FEEDLESS_SURFACE,?/, "");
    expect(withoutDeclaration, "the replace must have removed something").not.toBe(publishCall);
    expect(withoutDeclaration).not.toMatch(/feed:\s*FEEDLESS_SURFACE/);
  });

  it("does NOT hand the grader a tape timestamp it has no tape for", () => {
    // The tempting alternative was to pass the Vault's stored lastTradeAtMs.
    // That compiles to STALE PIPELINE — a confident claim that a feed exists
    // and has gone quiet. A lie in the opposite direction is not a fix.
    expect(publishCall).not.toMatch(/lastObservedAtMs/);
  });
});
