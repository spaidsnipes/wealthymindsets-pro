/**
 * LIVING PROFILE, OUT OF THE DRAWER — HVN/LVN as short marks at real prices.
 *
 * Child: LIVING PROFILE NODES ON GLASS. Parent family: F04 Profiles / Living
 * Profile. Class: CHART LANGUAGE. House surface: /charts main canvas. Plate
 * H-703.
 *
 * ── WHAT THIS IS FOR ─────────────────────────────────────────────────────────
 *
 * `selectLivingProfile` publishes real, measured prices — HVN (high-volume
 * nodes) and LVN (low-volume nodes) — with the bucket LOW EDGE as the price,
 * unrounded. Its consumer is `LivingProfileView`, a card. So a chart that
 * exists to help a trader see where volume rested draws none of them, and a
 * panel that exists to say WHERE they are sits next to it.
 *
 * PRICES TRAPPED IN A DRAWER. Third occurrence.
 *
 * ── THE RULES A GLASS COMPILER OWES ─────────────────────────────────────────
 *
 *   1. NO PROFILE, NO PAINT. `measured === false` means the window never
 *      established a profile — refuse and say why.
 *
 *   2. A NODE IS A PRICE. `volume`, `shareOfTotal`, `distanceFromPoc` are
 *      counts and offsets; none of them may reach a coordinate function.
 *      This compiler emits WEIGHT (unit-interval, for lane length) alongside
 *      the price, never instead of it.
 *
 *   3. AN UNTRADED BUCKET IS NOT A NODE. `untraded === true` means the price
 *      took no volume at all, which is honest information for the panel to
 *      state — and dishonest as a lane on the axis, because a lane of any
 *      length reads as "size traded here" and no size traded there.
 *
 *   4. HVN AND LVN ARE THE SAME AXIS. They mean opposite things — where the
 *      market lingered, and where it did not — and the glass draws both,
 *      because a trader who wants to see one usually wants to see the other
 *      by contrast. But they are told apart by MARK, never by hue: the axis
 *      has no side to encode.
 *
 * PURE. DETERMINISTIC. No React, no canvas, no IO, no clock.
 */

import type { LivingProfileVM, ProfileNode } from "./selectLivingProfile";

export type ProfileNodeKind = "HVN" | "LVN";

export interface ProfileNodeMark {
  /** A real price the compiler emitted — the bucket LOW edge. */
  readonly price: number;
  readonly kind: ProfileNodeKind;
  /** volume ÷ heaviest node's volume, in [0,1]. A LENGTH, not another price. */
  readonly weight: number;
  /** Inside the compiler's value area. Used to weight, not to hue. */
  readonly insideValueArea: boolean;
}

export type LivingProfileGlass =
  | {
      readonly drawn: true;
      readonly reason: string;
      readonly marks: readonly ProfileNodeMark[];
      readonly poc: number | null;
      readonly vah: number | null;
      readonly val: number | null;
      /**
       * Untraded prices, counted rather than rendered — a lane of any length
       * would read as "size traded here" and none did.
       */
      readonly untradedCount: number;
    }
  | {
      readonly drawn: false;
      readonly reason: string;
      readonly marks: readonly [];
      readonly poc: null;
      readonly vah: null;
      readonly val: null;
      readonly untradedCount: number;
    };

const refuse = (reason: string): LivingProfileGlass => ({
  drawn: false, reason,
  marks: [], poc: null, vah: null, val: null, untradedCount: 0,
});

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/**
 * A profile with two hundred nodes is a texture, not a reading. The cap
 * favours the STRONGEST nodes — a trader wants the levels the market cared
 * about most, not the ones that happened to be near the last print.
 *
 * Exported because a canvas reader must know a cap exists — a silently
 * truncated set of levels reads as a complete one.
 */
export const MAX_NODE_MARKS = 12;

export function selectLivingProfileGlass(
  vm: LivingProfileVM | null | undefined,
): LivingProfileGlass {
  if (!vm) return refuse("NO_READING");
  if (!vm.measured) return refuse(vm.missingInput ?? "UNMEASURED");
  if (!vm.nodesMeasured) return refuse(vm.nodesMissingInput ?? "NODES_UNMEASURED");

  // The scale every lane is drawn against. Heaviest HVN wins; if there are no
  // HVNs at all the LVNs get no scale and the layer refuses rather than
  // inventing a max out of thin air.
  const heaviest = vm.hvn.reduce((m, n) => Math.max(m, n.volume), 0);
  if (!(heaviest > 0)) return refuse("NO_HVN_WEIGHT");

  const untradedCount = [...vm.hvn, ...vm.lvn].filter(n => n.untraded).length;

  const marks: ProfileNodeMark[] = [];
  const pushMark = (n: ProfileNode) => {
    // RULE 3. An untraded bucket is not a node on the glass. The panel says so
    // in words; the axis does not lie about it.
    if (n.untraded) return;
    if (!finite(n.price) || !finite(n.volume)) return;
    marks.push({
      price: n.price,
      kind: n.kind,
      weight: Math.min(1, n.volume / heaviest),
      insideValueArea: n.insideValueArea,
    });
  };
  for (const n of vm.hvn) pushMark(n);
  for (const n of vm.lvn) pushMark(n);

  if (marks.length === 0) return refuse("NO_LAWFUL_NODES");

  // Strongest first, then price-sort back to a ladder so a canvas reading them
  // top-to-bottom draws a ladder, not a strength ranking.
  const capped = [...marks]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, MAX_NODE_MARKS)
    .sort((a, b) => b.price - a.price);

  return {
    drawn: true, reason: "DRAWN",
    marks: capped,
    poc: vm.poc,
    vah: vm.vah,
    val: vm.val,
    untradedCount,
  };
}

export default selectLivingProfileGlass;
