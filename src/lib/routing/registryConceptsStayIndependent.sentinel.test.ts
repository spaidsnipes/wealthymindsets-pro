/**
 * SENTINEL — `frame`, `tier` and phone-slot membership are three questions.
 *
 * GATE M5, "route registry overload". The order accused `wmDestinations.ts` of
 * conflating the three. An operator checked on 2026-09-18 and the accusation was
 * PARTLY REFUTED ON MEASUREMENT: the fields are already separate in the type, and
 * phone membership is already a third list rather than a derivation. Rather than
 * close the row on that, they left behind the sharper question — *do the three
 * STAY independent?* — and marked it unproven. This file answers it and is the
 * reason the row can now close.
 *
 * ── MEASURED 2026-09-19, n = 21 destinations ───────────────────────────────
 *
 *   frame × tier                      frame × in PHONE_SLOT_HREFS
 *            tier 1  tier 2                    in    out
 *   os          8      11              os       3     16
 *   cleared     0       2              cleared  1      1
 *   legacy      0       0              legacy   0      0
 *
 * The right-hand table is the one that matters, and `/profile` is the decisive
 * cell: it is `frame: "cleared"`, `tier: 2`, and it holds a permanent slot on the
 * phone bar. A CLEARED room owns a door on the market's own map. So phone
 * membership cannot be recovered from `frame` and cannot be recovered from
 * `tier` — the four slots span both values of each.
 *
 * ── WHAT THIS FILE DELIBERATELY DOES NOT ASSERT ────────────────────────────
 *
 * The left-hand table has a genuinely empty cell: all 8 tier-1 routes are
 * `frame: "os"`. It would be easy, and wrong, to write that up as "the fields
 * are independent" and lock it. They are not fully independent today: tier 1
 * PREDICTS os, one-directionally, and the evidence for it being a coincidence
 * rather than a rule is two rows. `os` spans both tiers, so `frame` is not
 * recoverable from `tier` — but that is a weaker claim than independence and
 * this file states only the weaker one.
 *
 * Asserting the stronger claim would have been the tidier test and it would have
 * been a measurement dressed as a law. A Sentinel that overstates what was
 * observed teaches the next reader to trust it exactly as much as it deserves,
 * which is less than they will.
 *
 * ── WHAT IT ACTUALLY PREVENTS ──────────────────────────────────────────────
 *
 * The regression is a REFACTOR, not a bug: some future author notices that three
 * of the four phone slots are `frame: "os"` and replaces the explicit list with
 * `WM_DESTINATIONS.filter(d => d.frame === "os" && d.tier === 1)`. That reads as
 * a simplification, ships green under every existing test except one incidental
 * pin, and silently drops `/profile` off the phone bar — the one screen where a
 * trader has the least room to recover from a missing door.
 *
 * `frame` is also, measured today, read by NOTHING at runtime except the
 * `OS_FRAMED_ROUTES` derive. A field with one reader is exactly the field a
 * tidying pass decides to "unify" with a neighbour.
 */

import { describe, expect, it } from "vitest";
import { WM_DESTINATIONS, PHONE_SLOT_HREFS, type WmDestination } from "./wmDestinations";

function destinationFor(href: string): WmDestination {
  const found = WM_DESTINATIONS.find((d) => d.href === href);
  // `phoneNavDestinations()` throws on an unknown href at module load, so this
  // should be unreachable. If it ever fires, the failure is that the registry
  // and the phone list have parted company — which is worth its own sentence.
  if (!found) throw new Error(`PHONE_SLOT_HREFS names ${href}, absent from WM_DESTINATIONS`);
  return found;
}

describe("the route registry keeps three concepts apart", () => {
  it("ANTI-VACUITY: the registry is populated and the phone bar is non-trivial", () => {
    // Every assertion below is a property of a set. An emptied or renamed export
    // turns them all green over nothing.
    expect(WM_DESTINATIONS.length, "WM_DESTINATIONS looks empty").toBeGreaterThanOrEqual(15);
    expect(PHONE_SLOT_HREFS.length, "phone bar has no slots").toBeGreaterThanOrEqual(3);
  });

  it("the phone bar is NOT derivable from `frame` — it spans more than one frame", () => {
    const frames = new Set(PHONE_SLOT_HREFS.map((h) => destinationFor(h).frame));
    expect(
      [...frames].sort(),
      `every phone slot now shares one frame (${[...frames].join(", ")}), so ` +
        `\`WM_DESTINATIONS.filter(d => d.frame === ...)\` would reproduce the bar ` +
        `exactly and the next tidying pass will make that substitution. The bar ` +
        `is a CHOICE about the smallest screen, not a consequence of which frame ` +
        `a room wears — /profile is a CLEARED room holding a permanent slot, and ` +
        `it is what makes the two concepts visibly separate.`,
    ).toHaveLength(2);
  });

  it("the phone bar is NOT derivable from `tier` — it spans both tiers", () => {
    const tiers = new Set(PHONE_SLOT_HREFS.map((h) => destinationFor(h).tier));
    expect(
      [...tiers].sort(),
      `every phone slot now shares one tier (${[...tiers].join(", ")}). Tier drives ` +
        `rail emphasis (selectNavEmphasis withholds tier !== 1); it has never been ` +
        `the phone bar's owner, and collapsing the two would let a rail decision ` +
        `silently move a door on the phone.`,
    ).toEqual([1, 2]);
  });

  it("`frame` is not recoverable from `tier` — the os frame spans both tiers", () => {
    // The HONEST half of the frame×tier table. The converse (tier 1 ⇒ os) holds
    // today and is deliberately NOT locked here; see this file's docblock.
    const tiersAmongOs = new Set(
      WM_DESTINATIONS.filter((d) => d.frame === "os").map((d) => d.tier),
    );
    expect(
      [...tiersAmongOs].sort(),
      `every \`frame: "os"\` destination now sits in one tier, which would make ` +
        `\`frame\` a synonym for \`tier\` and one of the two fields deletable. They ` +
        `answer different questions: \`frame\` is what chrome the route wears, ` +
        `\`tier\` is how loudly the rail speaks its name.`,
    ).toEqual([1, 2]);
  });

  it("every phone slot is a real destination — the bar cannot paint a door", () => {
    // Structural, and cheap. `phoneNavDestinations()` already throws at module
    // load on an unknown href; this states the same invariant where a reader
    // looking for the phone bar's rules will find it.
    for (const href of PHONE_SLOT_HREFS) {
      expect(
        WM_DESTINATIONS.some((d) => d.href === href),
        `the phone bar names ${href}, which the registry does not know. A painted ` +
          `door is worst on the smallest screen, where there is least room to recover.`,
      ).toBe(true);
    }
  });
});
