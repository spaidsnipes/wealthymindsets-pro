/**
 * The chrome may never be more confident than the room that fed it, and it
 * must forget a room the moment the trader leaves it.
 *
 * HOW THESE LAWS ARE PROVEN WITHOUT A DOM
 *
 * This repo has no jsdom/happy-dom environment, so React effects never run in
 * a test. Rather than add a dependency to reach the effect, the laws are split
 * into the two halves that can each be proven exactly:
 *
 *   - the MERGE law is a pure function, value-tested here;
 *   - the FORGET law is a structural fact about the effect — that it returns a
 *     cleanup republishing ignorance — proven by reading the source, with a
 *     POSITIVE CONTROL showing the scan can detect the law's absence.
 *
 * The static render proves the third law: the provider's INITIAL value, before
 * any effect has fired, is already honest ignorance rather than a blank.
 */
import { describe, expect, it } from "vitest";
import * as React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import {
  OsStandingProvider,
  UNPUBLISHED_STANDING,
  mergeStanding,
  useOsStanding,
  usePublishOsStanding,
  type OsStanding,
} from "./osStandingContext";

const SOURCE = readFileSync(new URL("./osStandingContext.tsx", import.meta.url), "utf8");

/** Renders whatever the chrome currently believes, as a readable string. */
function Chrome(): React.ReactElement {
  const s = useOsStanding();
  return (
    <div>
      {`${s.surface ?? "—"}|${s.openEvidenceItems ?? "—"}|${s.rightOfWay}|${
        s.rightOfWayResolved ? "resolved" : "unresolved"
      }|${s.feed ? s.feed.source : "—"}`}
    </div>
  );
}

function Room({ standing }: { standing: Partial<OsStanding> }): React.ReactElement {
  usePublishOsStanding(standing);
  return <div>room</div>;
}

describe("UNPUBLISHED_STANDING — what the OS is entitled to say before a room speaks", () => {
  it("claims nothing: no surface, no ledger, an unresolved Right of Way, no feed", () => {
    expect(UNPUBLISHED_STANDING.surface).toBeNull();
    expect(UNPUBLISHED_STANDING.openEvidenceItems).toBeNull();
    expect(UNPUBLISHED_STANDING.rightOfWay).toBe("UNKNOWN");
    expect(UNPUBLISHED_STANDING.rightOfWayResolved).toBe(false);
    expect(UNPUBLISHED_STANDING.feed).toBeNull();
    expect(UNPUBLISHED_STANDING.asOfLabel).toBeNull();
  });

  it("is frozen — no room can mutate the shared default out from under the next room", () => {
    expect(Object.isFrozen(UNPUBLISHED_STANDING)).toBe(true);
  });
});

describe("mergeStanding — a partial publication cannot smuggle confidence", () => {
  it("fills every omitted field with ignorance, not with a flattering default", () => {
    // A room that knows its name but has compiled no ledger must not thereby
    // get a resolved Right of Way.
    expect(mergeStanding({ surface: "Journal" })).toEqual({
      surface: "Journal",
      openEvidenceItems: null,
      rightOfWay: "UNKNOWN",
      rightOfWayResolved: false,
      feed: null,
      asOfLabel: null,
    });
  });

  it("renders what a room does publish, unchanged", () => {
    const merged = mergeStanding({
      surface: "Question-Driven Mode",
      openEvidenceItems: 3,
      rightOfWay: "WAIT",
      rightOfWayResolved: true,
    });
    expect(merged.surface).toBe("Question-Driven Mode");
    expect(merged.openEvidenceItems).toBe(3);
    expect(merged.rightOfWay).toBe("WAIT");
    expect(merged.rightOfWayResolved).toBe(true);
  });

  it("zero open items survives the merge — an empty ledger is not an absent one", () => {
    // `{...defaults, ...partial}` is only correct because the room publishes
    // explicit nulls rather than omitting fields it knows to be empty. 0 must
    // not be swallowed by any truthiness shortcut introduced later.
    expect(mergeStanding({ openEvidenceItems: 0 }).openEvidenceItems).toBe(0);
  });

  it("an empty publication is exactly the unpublished reading", () => {
    expect(mergeStanding({})).toEqual(UNPUBLISHED_STANDING);
  });

  it("does not mutate the frozen default", () => {
    mergeStanding({ surface: "Chart", rightOfWay: "ACTION", rightOfWayResolved: true });
    expect(UNPUBLISHED_STANDING.rightOfWay).toBe("UNKNOWN");
    expect(UNPUBLISHED_STANDING.surface).toBeNull();
  });
});

describe("the provider's opening position is honest ignorance", () => {
  it("before any effect has fired, the chrome already reads UNKNOWN rather than blank", () => {
    // renderToStaticMarkup runs no effects, which makes it the exact simulation
    // of the first paint — the frame must be honest in that frame too.
    const html = renderToStaticMarkup(
      <OsStandingProvider>
        <Chrome />
      </OsStandingProvider>,
    );
    expect(html).toContain("—|—|UNKNOWN|unresolved|—");
  });

  it("a room outside a provider renders without throwing", () => {
    // Rooms must stay unit-testable and previewable without the whole frame.
    expect(() => renderToStaticMarkup(<Room standing={{ surface: "Standalone" }} />)).not.toThrow();
  });
});

/**
 * THE CORE LAW. A trader leaving a room with a live feed for a room with none
 * must not keep seeing the first room's confidence painted over the second
 * room's content. Effects do not run here, so the law is read off the source.
 */
describe("usePublishOsStanding FORGETS the room — no reading outlives its surface", () => {
  /** The hook body, isolated so the scan cannot be satisfied by other code. */
  const hookBody = (() => {
    const start = SOURCE.indexOf("export function usePublishOsStanding");
    expect(start, "the hook must exist to be scanned").toBeGreaterThan(-1);
    return SOURCE.slice(start);
  })();

  it("returns a cleanup that republishes the unpublished reading", () => {
    expect(hookBody).toMatch(/return\s*\(\)\s*=>\s*publish\(UNPUBLISHED_STANDING\)/);
  });

  it("POSITIVE CONTROL — the scan can tell a hook that forgot to forget", () => {
    const withoutCleanup = hookBody.replace(
      /return\s*\(\)\s*=>\s*publish\(UNPUBLISHED_STANDING\);?/,
      "",
    );
    expect(withoutCleanup, "the replace must have removed something").not.toBe(hookBody);
    expect(withoutCleanup).not.toMatch(/return\s*\(\)\s*=>\s*publish\(UNPUBLISHED_STANDING\)/);
  });

  it("publishes through mergeStanding — the tested function is the shipped one", () => {
    // If the hook re-implemented the spread inline, every merge law above would
    // be proving a function nothing renders.
    expect(hookBody).toMatch(/publish\(mergeStanding\(/);
  });

  it("re-fires on a real change by comparing the publication BY VALUE", () => {
    // Rooms build the object inline from render-scoped values, so its identity
    // changes every render; an identity dep would loop forever.
    expect(hookBody).toMatch(/JSON\.stringify\(standing\)/);
    expect(hookBody).toMatch(/\[publish,\s*key\]/);
  });

  it("does nothing outside a provider instead of throwing", () => {
    expect(hookBody).toMatch(/if\s*\(!publish\)\s*return;/);
  });
});
