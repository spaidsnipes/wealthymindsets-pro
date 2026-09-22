"use client";

/**
 * WMOperatingSystem — THE frame. Singular, deliberately.
 *
 * THE DEFECT THIS ENDS
 *
 *   "make sure we dont have seperate shells its one os"
 *
 * The build had THREE frames — MainLayout, WMExperienceShell,
 * QuestionDrivenShell — and most routes wore none of them. That is why the app
 * reads as a pile of pages rather than one machine: not because any single
 * screen is wrong, but because no two screens agree on where the machine ends
 * and the work begins. A user crossing from /command-deck to /heatmaps does
 * not experience "a different page", they experience A DIFFERENT PRODUCT.
 *
 * THE SILHOUETTE — common to all ~28 Founder mockups
 *
 *   ┌───────────────────────────────────────────────────────┐
 *   │ MASTHEAD   crest · wordmark · surface · FEED · as-of   │
 *   ├────────┬────────────────────────────────┬─────────────┤
 *   │ RAIL   │ ROOM                           │ CONTEXT     │
 *   │ rooms  │ (children — the work surface)  │ (optional)  │
 *   │ ────   │                                │             │
 *   │ state  │                                │             │
 *   ├────────┴────────────────────────────────┴─────────────┤
 *   │ PROVENANCE  source · fidelity · as-of                  │
 *   └───────────────────────────────────────────────────────┘
 *
 * WHY THE FRAME COMPILES NOTHING ITSELF
 *
 * Every reading it paints — the feed badge, the standing conditions, the
 * provenance line — arrives from `@/lib/os/osChrome`, a pure compiler with
 * UNKNOWN as its default. The chrome appears on EVERY screen and is typed by
 * nobody in particular, which makes it the cheapest place in the codebase to
 * tell a lie. A frame that renders whatever string a route hands it is that
 * lie waiting to happen. So the frame owns SHAPE; osChrome owns TRUTH.
 *
 * TOKENS — Visual Implementation Pack §1: field #07080a, pearl #ede6d3,
 * antique gold #c4a574 for BRAND AND RULES ONLY. Risk wears independent amber.
 */

import * as React from "react";
// ── 2026-09-18: A ROOM MAY NOT REBOOT THE MACHINE ─────────────────────────
//
// Every door in this frame — the desktop rail and the phone bar — was a raw
// `<a href>`. A raw anchor is a DOCUMENT LOAD. Measured live on production by
// clicking the rail's Charts door from /command-deck:
//
//     navType "navigate" · loadEventEnd 745ms · 35 resources refetched
//     a window global set one instant earlier: GONE
//
// That is not navigation between rooms, it is a power cycle between rooms, and
// it takes the whole in-memory session with it — the live tape subscription,
// and `priorStory`, the prior snapshot the Auto-Quiet gate compares against.
// Which means the SECONDARY NOISE readout can only ever say "Unwatched" on the
// first paint after any door is used, no matter how long the trader has been
// watching. A frame whose own chrome claims to remember cannot be the thing
// that forgets.
//
// `next/link` is the fix and the fork's own doc names the defect in its first
// example — it annotates a bare `<a>` with "No prefetching". Kept at
// `prefetch={false}` deliberately: the claim this change makes is ONE claim,
// that crossing a door is a client-side transition. Prefetching 22 rooms on
// viewport entry is a different claim about network cost, unmeasured here, and
// it does not belong in the same commit.
import Link from "next/link";
// Where the product's rooms are has ONE owner. Retyping them here is what made
// this rail a second definition — see the note on OS_ROOMS below.
import { destinationsInGroup, phoneNavDestinations } from "@/lib/routing/wmDestinations";
// WORKSPACE is not a fourth list of destinations — it is what the room the
// trader is ALREADY standing in can hand them. See roomEquipment's header.
import {
  roomEquipment,
  roomEquipmentOfKind,
  type RoomEquipmentKind,
} from "@/lib/workspace/roomEquipment";
import { requestEquipment, subscribeEquipmentStage } from "@/lib/workspace/equipmentChannel";
// The drawn mark on a tile. Keyed by equipment id and exhaustive by sentinel —
// see `equipmentGlyphs.tsx` for why it is not a positional array.
import { ACTIVATOR_GLYPHS, equipmentGlyph } from "./equipmentGlyphs";
import {
  compileFeedStanding,
  compileProvenanceSegments,
  compileStandingConditions,
  FEEDLESS_SURFACE,
  type FeedDeclaration,
  type FeedStanding,
  type StandingCondition,
} from "@/lib/os/osChrome";
import { osFeedChipParts } from "@/lib/os/osFeedChipParts";
import { useFeedEvaluationClock } from "@/lib/marketData/useProvenSessionClosure";
import { WM } from "@/lib/design/wmTokens";

export interface ShellRoom {
  readonly label: string;
  readonly href: string;
  /**
   * M3 quarantine, carried from the destination owner's `authority` field.
   * A legacy door still opens — capability preserved — but it must SAY so,
   * or the rail keeps presenting a demoted surface as a peer of the rooms
   * the loop actually runs through.
   */
  readonly legacy?: boolean;
}

/**
 * The rooms the Founder can actually walk into TODAY.
 *
 * The mockups show "Order Flow" and "Context Library" as rail entries. This
 * app has no such routes, and a rail entry that 404s is a painted door — the
 * most expensive kind of lie, because the user pays for it with a click.
 *
 * A PAINTED DOOR HAS A SUBTLER FORM, and this list carried two of them. It was
 * typed out by hand beside three other hand-typed lists of the same rooms, and
 * had drifted from all of them:
 *
 *   · `/paper` wears this very frame and was MISSING here, so the trader
 *     standing in that room could not find it in the room list.
 *   · `/proof-lane` was listed here and does NOT wear this frame, so the one
 *     door on the rail that left the OS was indistinguishable from the six
 *     that stayed inside it.
 *
 * Neither is a 404, and both cost the user a click on a promise nobody made.
 * So the rooms are read from `wmDestinations` — the single owner — and the
 * labels the trader reads are that owner's labels, which is why the same room
 * can no longer be called "Chart" here and "Charts" one shell over.
 */
export const OS_ROOMS: readonly ShellRoom[] = destinationsInGroup("ROOM").map((d) => ({
  label: d.label,
  href: d.href,
  // Not defaulted to false: absence of authority IS normal authority, and a
  // boolean `false` here would invite a renderer to branch on a fact the
  // owner never stated. Only a genuine "legacy" verdict survives the map.
  ...(d.authority === "legacy" ? { legacy: true } : null),
}));

/**
 * THE REST OF THE PRODUCT.
 *
 * ── The defect this closes ──────────────────────────────────────────────────
 * The rail carried the seven ROOMs and stopped. The other fourteen
 * destinations — the whole TOOL group and the whole COMMUNITY group — had no
 * door anywhere in an OS room. Not a broken door: NO door. A trader in
 * /command-deck could not reach the scanner, the news, the academy, the
 * lounge, the shop, or their own profile page without typing a URL.
 *
 * ── Why they are not simply appended to the room list ───────────────────────
 * Twenty-one flat entries is not a product map, it is a list, and a list is
 * what the trader has to read top-to-bottom every time because nothing in it
 * ranks. The ROOM group is the decision loop and stays whole and unlabelled-by-
 * section at the top; these two sit beneath it under their own headings, in
 * the owner's order. The grouping is not decoration — it is the claim that
 * these fourteen are not where the work happens.
 */
const OS_WORKBENCH = destinationsInGroup("TOOL");
const OS_COMMUNITY = destinationsInGroup("COMMUNITY");

/**
 * The five the phone gets, from the same owner the July shell reads. The
 * alternative — this frame choosing its own five — is how the two shells came
 * to call one room "Chart" and "Charts".
 */
const PHONE_DOORS = phoneNavDestinations();

/**
 * The width at which the rail stops being affordable.
 *
 * ONE OWNER, because the rail and the standing-condition bar must be exactly
 * complementary: a gap between them is a viewport where the two conditions
 * vanish entirely, and an overlap is a viewport that renders each of them
 * TWICE. Writing `900` and `901` as two literals makes that correctness a
 * convention someone has to remember. The `+ 1` below makes it arithmetic.
 */
export const OS_RAIL_BREAKPOINT_PX = 900;

/**
 * How wide the rooms rail is when it is open.
 *
 * ONE OWNER because two things now read it: the rail's own flex basis, and the
 * receipt in `railDefaultOpen`'s doc below that says what closing it gives
 * back. A width quoted in prose beside a width written in code is a claim that
 * goes stale the first time someone nudges the number.
 */
export const OS_RAIL_WIDTH_PX = 176;

/**
 * How wide the EQUIPMENT drawer is — a different number from the rooms rail,
 * because it is a different object.
 *
 * The rooms rail is a column of one-line labels; 176px has always been enough
 * for a word. The equipment drawer carries the canon's TILES — a drawn mark
 * beside a label with the reading's hint under it — and measured at 1440x900
 * with Tools open, 176px gave the hint a 140px measure: "What is resolved,
 * what is missing, what blocks entry" wrapped to three lines per tile, six
 * tiles deep. The approved frame (F24) gives the equipment column ~210px and
 * spends it on the tile rather than on the prose.
 *
 * DESKTOP-EFFECTIVE ONLY, and not by an `if`. Below
 * {@link OS_RAIL_BREAKPOINT_PX} this element is either `display: none` or —
 * in a `phoneDestinations="door"` room — pinned at `width: auto !important`
 * across the whole viewport. Neither reads this number, so widening it cannot
 * reach a phone.
 */
export const OS_EQUIPMENT_RAIL_WIDTH_PX = 264;

/**
 * How tall the pinned phone bar is.
 *
 * ONE OWNER, for the same reason as the breakpoint above. The bar is
 * `position: fixed`, which takes it out of flow — so the room below it must
 * RESERVE exactly this much space or the last line of the trader's provenance
 * sits underneath their own navigation. Two literals is two numbers that drift
 * apart the first time someone adjusts the padding, and the failure is silent:
 * nothing errors, a footer is just quietly unreadable on phones.
 *
 * Declared here and applied in BOTH places from this constant.
 */
export const OS_PHONE_NAV_HEIGHT_PX = 66;

const FIELD = "#07080a";
const PEARL = "#ede6d3";
const GOLD = "#c4a574";
const MUTED = "#8a8271";
const RULE = "rgba(196,165,116,0.20)";
/**
 * The ink a HINT is written in — one step quieter than MUTED, because a hint
 * describes equipment the trader has not picked up and must never compete with
 * the label of equipment they have. Named, rather than the loose literal it was
 * inline, so the drawer's two presentations cannot drift to two quiets.
 */
const HINT_INK = "#6f6857";

const EYEBROW: React.CSSProperties = {
  fontSize: 9,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  fontFamily: "Georgia, 'Times New Roman', serif",
  color: MUTED,
};

const SERIF = "Georgia, 'Times New Roman', serif";

/**
 * One rail door.
 *
 * Extracted because there are now three groups drawing them and the ACTIVE
 * treatment — the gold spine, the pearl label, the tinted ground — is the
 * trader's answer to "where am I". Three copies of that would be three places
 * for the answer to drift, and the drift would read as the room lying about
 * its own location. `quiet` changes the RESTING weight only; it cannot reach
 * the active state.
 */
function RailLink({
  href,
  label,
  activeHref,
  quiet = false,
  legacy = false,
}: {
  href: string;
  label: string;
  activeHref: string;
  quiet?: boolean;
  /**
   * Draws the LEGACY word on the door (M3 quarantine). The chip is part of
   * the accessible name via the visible text itself — a screen reader hears
   * "Command Deck LEGACY", which is exactly the sentence the quarantine
   * exists to say before the click, not after it.
   */
  legacy?: boolean;
}): React.ReactElement {
  const active = href === activeHref;
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? "page" : undefined}
      style={{
        position: "relative",
        display: "block",
        padding: quiet ? "7px 14px" : "9px 14px",
        fontSize: quiet ? 11 : 12,
        letterSpacing: 0.3,
        textDecoration: "none",
        color: active ? PEARL : quiet ? "#6f6857" : MUTED,
        fontWeight: active ? 600 : 400,
        background: active ? "rgba(196,165,116,0.07)" : "transparent",
        minHeight: quiet ? 30 : 36,
      }}
    >
      {active && (
        <span
          aria-hidden
          style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 2, background: GOLD }}
        />
      )}
      {label}
      {legacy && (
        <span
          data-testid="os-rail-legacy-chip"
          style={{
            marginLeft: 7,
            padding: "1px 5px",
            fontSize: 8,
            letterSpacing: 0.8,
            color: "#6f6857",
            border: "1px solid rgba(111,104,87,0.5)",
            borderRadius: 3,
            verticalAlign: "middle",
          }}
        >
          LEGACY
        </span>
      )}
    </Link>
  );
}

/**
 * WORKSPACE — the equipment available to the room you are standing in.
 *
 * ROOMS are working contexts. WORKSPACE is the equipment that context can hand
 * you. That distinction is the whole reason this block exists and the reason
 * its entries are BUTTONS rather than links: an entry here does not take you
 * anywhere, so it cannot become the twenty-second route. It opens something
 * beside the chart you are already looking at.
 *
 * ── Why it renders nothing in a room with no equipment ──────────────────────
 * A "Workspace" heading over an empty list, or over a list of things that are
 * really other pages, is the painted door this rail has been burned by twice
 * already (see the note on OS_ROOMS). Rooms earn the heading by having
 * equipment; until then the rail says nothing about it.
 */
interface RoomWorkspaceRailProps {
  readonly activeHref: string;
  /**
   * When given, this rail shows ONLY that hand of the room's equipment — the
   * canon's two-button split (see `RoomEquipmentKind`). Omitted in rail mode,
   * where the single Workspace heading has always shown everything the room
   * hands you and nothing about that behaviour changes.
   */
  readonly kind?: RoomEquipmentKind;
  readonly heading?: string;
  /**
   * `"list"` — the quiet block under the ROOMS rail, where equipment is one of
   * four things stacked in a 176px orientation column and must not shout over
   * the doors.
   *
   * `"tile"` — the canon's EQUIPMENT DRAWER (F24): a bordered plate per entry
   * with a drawn mark beside the label. Only reachable in equipment mode,
   * where the drawer is the entire contents of the panel and the trader asked
   * for it by name. Giving the rail-mode block the same weight would put six
   * bordered plates under the room list and make the equipment louder than the
   * twenty-one doors it sits beneath.
   */
  readonly presentation?: "list" | "tile";
}

// ONE LINE, DELIBERATELY. `roomAdoptsEquipment.sentinel.test.ts` reads this
// function's body by slicing from `function RoomWorkspaceRail` to the next
// `\n}` — the closing brace in column zero. A destructure broken across lines
// puts `}: RoomWorkspaceRailProps` in column zero first, which truncates the
// slice to the signature and makes FOUR sentinels pass over an empty body:
// they stop checking that equipment is a button, that it subscribes to the
// room, that it announces `aria-pressed`, and that an equipment-less room
// renders nothing. A formatting choice that silently disarms four guards is
// the guards' failure to state this, and it is stated here.
function RoomWorkspaceRail({ activeHref, kind, heading = "Workspace", presentation = "list" }: RoomWorkspaceRailProps): React.ReactElement | null {
  const equipment = kind ? roomEquipmentOfKind(activeHref, kind) : roomEquipment(activeHref);

  // WHAT IS CURRENTLY IN THE TRADER'S HAND.
  //
  // Local to this component and dropped whenever the room changes, so no other
  // room inherits a reading of this one's drawer. The room is the only writer;
  // the rail never infers a stage, because a rail that guessed could mark
  // equipment open that the room had already closed.
  //
  // A SET, NOT ONE SLOT — MEASURED 2026-09-19 ON LIVE /charts.
  // With the drawing tools open (19 tools, 319x385, chart still ticking) this
  // rail reported `aria-pressed="false"` on Draw. The single slot was only ever
  // written by the JOURNEY (`useEquipmentJourney`), and /charts' two items —
  // Draw and Replay — are DIRECT instruments that `isJourneyEquipment` filters
  // out, so they never announced. The rail was structurally blind to exactly
  // the equipment this room has, and the heading above claims to show what is
  // held. A wrong `aria-pressed` is worse than none: it is the screen reader
  // being told the tool is down when it is in the trader's hand.
  //
  // Direct instruments are also not mutually exclusive — Draw and Replay are
  // both legitimately in hand at once — so one slot could not have told the
  // truth here even once the announce existed.
  //
  // The protocol is unchanged and the journey's behaviour is bit-identical:
  // CLOSE still announces `(null, "closed")`, which still clears everything.
  // What is newly expressible is `(id, "closed")` — "put THIS one down".
  const [openIds, setOpenIds] = React.useState<ReadonlySet<string>>(() => new Set());
  React.useEffect(() => {
    setOpenIds(new Set());
    return subscribeEquipmentStage(({ equipmentId, stage }) =>
      setOpenIds((current) => {
        // The honest empty announce — "I am holding nothing."
        if (equipmentId === null) return current.size === 0 ? current : new Set();
        const held = stage !== "closed";
        if (held === current.has(equipmentId)) return current;
        const next = new Set(current);
        if (held) next.add(equipmentId);
        else next.delete(equipmentId);
        return next;
      }),
    );
  }, [activeHref]);

  if (equipment.length === 0) return null;
  const tiled = presentation === "tile";
  return (
    <div data-testid="os-rail-workspace">
      <div
        style={{
          ...EYEBROW,
          padding: tiled ? "14px 14px 10px" : "18px 14px 8px",
          color: GOLD,
          // The drawer's heading names the hand the trader just asked for by
          // pressing a plate. At the eyebrow's 9px it read as a caption over
          // somebody else's list.
          ...(tiled ? { fontSize: 11, letterSpacing: 2.2 } : null),
        }}
      >
        {heading}
      </div>
      {equipment.map((item) => {
        const open = openIds.has(item.id);
        const glyph = equipmentGlyph(item.id);
        return (
        <button
          key={item.id}
          type="button"
          data-equipment={item.id}
          data-equipment-open={open ? "true" : undefined}
          // The state is in the accessible name too, not only in the paint. A
          // gold edge is invisible to a screen reader, and "what am I holding"
          // is exactly the orientation a non-sighted trader has least of.
          aria-pressed={open}
          title={item.hint}
          // A TOGGLE, BECAUSE `aria-pressed` ALREADY PROMISED ONE.
          //
          // MEASURED 2026-09-19 on live /charts, immediately after the announce
          // above started telling the truth: press Replay → `pressed="true"`;
          // press it again → still `"true"`, panel still up. The button
          // described itself as pressed and could not be un-pressed.
          //
          // `aria-pressed` is a contract rather than a lamp — it is the whole
          // meaning of the role that pressing again reverses it — so the honest
          // badge had turned this control into a liar. Fixing it by dropping
          // `aria-pressed` would have been the cheap direction: it would trade
          // a screen reader's only source of "what am I holding" for the
          // silence that made the first defect invisible.
          onClick={() => requestEquipment(item.id, open ? "put-down" : "pick-up")}
          style={
            tiled
              ? {
                  // ── THE CANON DRAWS EQUIPMENT AS A TILE ──────────────────
                  // F24 gives each piece a bordered plate with a drawn mark
                  // and generous air. This shipped as an unbordered text row
                  // in a 176px column, which is a MENU: six labels, each hint
                  // broken over three lines, nothing to aim at. A trader
                  // cannot pick up a list item.
                  //
                  // The border is the tile, so it is drawn at REST as well as
                  // when held — a plate that only appears once you are holding
                  // the thing is not a plate, it is a highlight.
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  width: "calc(100% - 20px)",
                  margin: "0 10px 8px",
                  boxSizing: "border-box" as const,
                  textAlign: "left" as const,
                  minHeight: 64,
                  padding: "12px 14px",
                  borderRadius: 3,
                  border: `1px solid ${open ? GOLD : RULE}`,
                  background: open
                    ? "rgba(196,165,116,0.12)"
                    : "linear-gradient(180deg, rgba(196,165,116,0.05), rgba(196,165,116,0.015))",
                  cursor: "pointer",
                  color: MUTED,
                  fontFamily: "inherit",
                }
              : {
                  display: "block",
                  width: "100%",
                  textAlign: "left" as const,
                  // 44px: this is a control, and the rail is reachable on a tablet.
                  minHeight: 44,
                  padding: "7px 14px",
                  // A LEFT EDGE, NOT A FILLED PILL. The room entries above already
                  // use the filled-and-bordered treatment for "you are HERE"; giving
                  // open equipment the same paint would make the rail look like it
                  // had two current locations.
                  border: "none",
                  borderLeft: open ? `2px solid ${GOLD}` : "2px solid transparent",
                  background: open ? "rgba(196,165,116,0.07)" : "transparent",
                  cursor: "pointer",
                  color: MUTED,
                  fontSize: 11,
                  letterSpacing: 0.3,
                  fontFamily: "inherit",
                }
          }
        >
          {/* The mark is decoration in the accessibility tree and nowhere else
              — the label below is the accessible name and always was, so a
              tile that draws a picture reads identically to the row it
              replaced. A glyph the map does not declare renders NOTHING
              rather than a placeholder; see `equipmentGlyphs.tsx`. */}
          {tiled && glyph ? (
            <span
              aria-hidden
              style={{
                flex: "0 0 auto",
                width: 22,
                height: 22,
                marginTop: 1,
                display: "block",
                color: open ? GOLD : "rgba(196,165,116,0.78)",
              }}
            >
              {glyph}
            </span>
          ) : null}
          <span style={{ display: "block", minWidth: 0 }}>
            <span
              style={{
                display: "block",
                color: open ? GOLD : PEARL,
                ...(tiled
                  ? { fontSize: 12.5, letterSpacing: 0.4, marginBottom: 3, fontWeight: 500 }
                  : null),
              }}
            >
              {item.label}
            </span>
            <span
              style={{
                display: "block",
                // The hint had a 140px measure and 1.3 leading in the old
                // column. Widened by OS_EQUIPMENT_RAIL_WIDTH_PX and loosened
                // here, because a hint nobody can read is the same cost as no
                // hint plus the space it took.
                fontSize: tiled ? 10.5 : 10,
                color: HINT_INK,
                lineHeight: tiled ? 1.45 : 1.3,
                letterSpacing: tiled ? 0.1 : undefined,
              }}
            >
              {/* The hint describes the equipment; when it is already open the
                  trader does not need describing to, they need locating. */}
              {open ? "Open in this room" : item.hint}
            </span>
          </span>
        </button>
        );
      })}
    </div>
  );
}

/**
 * One standing condition, in one of its two layouts.
 *
 * `unresolved` and `alert` wear DIFFERENT ink because they are different
 * facts: "we have no reading" must never look like "we have a reading and it
 * is bad". Collapsing them is how an uncompiled ledger reads as a clean bill
 * of health.
 */
function StateReadout({
  condition,
  layout,
}: {
  condition: StandingCondition;
  /** `bar` = the horizontal provenance strip. `stack` = the rail column. */
  layout: "bar" | "stack";
}): React.ReactElement {
  const { label, value, detail, unresolved, alert } = condition;
  // `alert` on a standing condition means the condition OBJECTS — a rule is
  // engaged, a threshold is breached. It is not a broken feed, so it takes
  // `WM.state.objection` rather than `WM.state.warn`. Pixels unchanged.
  const ink = unresolved ? MUTED : alert ? WM.state.objection : PEARL;
  const stacked = layout === "stack";
  return (
    <div
      style={
        stacked
          ? { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, padding: "0 14px" }
          : { display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, flex: "1 1 220px" }
      }
    >
      <span style={{ ...EYEBROW, whiteSpace: "nowrap" }}>{label}</span>
      <span
        style={{
          fontFamily: SERIF,
          fontSize: stacked ? 13 : 15,
          fontWeight: 600,
          letterSpacing: 0.4,
          color: ink,
          fontStyle: unresolved ? "italic" : "normal",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 10, color: "#6f6a5e", minWidth: 0, ...(stacked ? { lineHeight: 1.3 } : null) }}>
        {detail}
      </span>
    </div>
  );
}

/**
 * The masthead's feed badge — canon F24's trailing chip.
 *
 * The dot is the mockups' single green pip — but it can only be green when
 * `compileFeedStanding` produced a LIVE tone from actual evidence. An
 * unestablished reading wears a HOLLOW dot, because a filled dot of any colour
 * still reads as "we know something" at a glance.
 *
 * ── THE CHIP HAS TWO HALVES, AND ONE OF THEM USED TO BE A TOOLTIP ──────────
 *
 * F24 draws this chip as `INDICATIVE · asOf` — a fidelity word, a separator,
 * and a statement of WHEN. This badge rendered only the first half and put the
 * second in `title={feed.detail}`, which does not exist on touch, does not
 * exist at a glance, and is not shown until a pointer rests on it.
 *
 * That mattered because `detail` is not decoration. Three materially different
 * states share the label `FEED UNKNOWN` — nothing attributed, a provider that
 * answered without a price, and a price that cannot be aged — and the only
 * thing separating them on the glass was the tooltip. The distinction that
 * `osChrome.ts` went to real trouble to preserve in the data was being thrown
 * away at the last inch.
 *
 * Both halves are now composed by ONE owner, `osFeedChipParts`, which also
 * refuses the dangling separator (no detail ⇒ no `·`) and keeps `provenance`
 * off the glass per WM-CHART-PROV-EMERG-01. Tone is deliberately NOT moved
 * there: the ink and the dot already have an owner here, and a second opinion
 * about tone is how two nodes come to disagree about one reading.
 */
function FeedBadge({ feed }: { feed: FeedStanding }): React.ReactElement {
  const toneInk: Record<FeedStanding["tone"], string> = {
    LIVE: "#5fd39a",
    DELAYED: "#d9a441",
    IDLE: WM.state.objection,
    UNKNOWN: MUTED,
  };
  const ink = toneInk[feed.tone];
  const parts = osFeedChipParts(feed);
  return (
    <div
      data-testid="os-feed-standing"
      data-tone={feed.tone}
      data-established={parts.unestablished ? "false" : "true"}
      title={parts.spoken}
      aria-label={parts.spoken}
      style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: "0 1 auto" }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          flex: "0 0 auto",
          // Established ⇒ filled. Unestablished ⇒ hollow ring, so the pip
          // cannot be mistaken for a reading from across the room.
          background: parts.unestablished ? "transparent" : ink,
          border: `1px solid ${ink}`,
        }}
      />
      <span
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontFamily: SERIF,
          color: ink,
          // Deliberately NOT nowrap+ellipsis. The canon fidelity labels are
          // sentences ("LIVE — CERTIFIED QUOTE"), and a truncated fidelity
          // reading is a DIFFERENT claim from the one that was compiled.
          lineHeight: 1.25,
        }}
      >
        {parts.label}
      </span>
      {/* THE SECOND HALF — canon's `· asOf`.
          Separator and detail are rendered as ONE conditional pair, so a
          separator without a reading behind it is unrepresentable rather than
          merely unlikely. Both are aria-hidden because the whole chip is
          already announced once through `aria-label={parts.spoken}` above;
          without that, a screen reader would read the fidelity word, then the
          middot, then the detail as three unrelated fragments. */}
      {parts.separator !== null && (
        <span
          aria-hidden
          data-testid="os-feed-standing-detail"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            fontSize: 10,
            letterSpacing: 0.4,
            fontFamily: SERIF,
            // MUTED, not `ink`. The detail explains the verdict; it is not a
            // second verdict, and giving it the tone colour would make the
            // masthead carry the alarm twice at two different weights.
            color: MUTED,
            lineHeight: 1.25,
          }}
        >
          <span style={{ opacity: 0.55 }}>{parts.separator}</span>
          <span>{parts.detail}</span>
        </span>
      )}
      {/* THE THIRD PART — canon's literal `asOf 09:24:17 ET`.
          `detail` says WHY the reading is what it is; this says WHEN a price was
          actually seen, which "observed" alone cannot tell apart from forty
          minutes ago. Rendered as its own node so a prover can measure it, and
          paired with its separator for the same reason the detail is: a
          dangling `·` promises a reading that is not there.
          The string is composed in `osFeedChipParts` with a pinned locale and a
          pinned America/New_York zone — never here — so this node cannot become
          a render-time clock and re-open the #418 hydration mismatch. */}
      {parts.instantSeparator !== null && (
        <span
          aria-hidden
          data-testid="os-feed-standing-instant"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            minWidth: 0,
            fontSize: 10,
            letterSpacing: 0.4,
            fontFamily: SERIF,
            // MUTED for the same reason the detail is: an instant is evidence
            // for the verdict, not a second verdict. Tone owns the alarm once.
            color: MUTED,
            lineHeight: 1.25,
            // The clock must not be broken across two lines at a narrow
            // masthead — a wrapped "09:24:17" reads as two numbers.
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ opacity: 0.55 }}>{parts.instantSeparator}</span>
          <span>{parts.instant}</span>
        </span>
      )}
    </div>
  );
}

export interface WMOperatingSystemProps {
  /** Route of the room currently rendered, for the rail's active marker. */
  readonly activeHref: string;
  /**
   * Name of the surface, shown in the masthead beside the wordmark. `null`
   * when no room has published one — the slot is then OMITTED rather than
   * filled with a dash, because an empty surface chip reads as a surface.
   */
  readonly surface: string | null;
  /**
   * The caller's own brand mark. When absent the frame draws its crest and
   * wordmark. Exactly one of the two renders, ever: the brand-dedupe law says
   * the frame owns the wordmark, so a caller that supplies one REPLACES it
   * rather than adding a second.
   */
  readonly brand?: React.ReactNode;
  /** One short line under the brand — the current job, not a second title. */
  readonly mastheadCaption?: React.ReactNode;
  /** Controls that belong to the machine, not to the room (e.g. the mode bar). */
  readonly mastheadCenter?: React.ReactNode;
  /** Trailing masthead controls, left of the feed badge. */
  readonly mastheadActions?: React.ReactNode;
  /**
   * A control the caller wants standing AT THE HEAD OF THE WORKSPACE PANEL,
   * above that room's equipment.
   *
   * ── Why this slot exists at all ─────────────────────────────────────────
   *
   * `destinations="equipment"` already says the frame's whole offer on this
   * scene is "the equipment attached to it". A caller with a control that is
   * genuinely equipment — something the trader PICKS UP and sets, as opposed
   * to a reading they consult — had nowhere to put it but `mastheadCenter`,
   * which on this scene is the band standing over live price. That is how the
   * seven-mode bar ended up above the candles on /charts: not because anyone
   * chose the masthead for it, but because the masthead was the only slot the
   * frame published.
   *
   * ONLY DRAWN IN `destinations="equipment"`, and only while the trader is
   * actually holding Workspace. A node handed here in rail mode is not
   * silently relocated to some other corner: a slot that quietly re-homes its
   * contents is how one control ends up drawn twice.
   *
   * ABOVE `RoomWorkspaceRail`, NOT INSIDE IT. That component's list is
   * compiled from `roomEquipment(activeHref)` — one registry, one owner — and
   * injecting a caller's node into it would fork the answer to "what equipment
   * does this room have". This stands beside that list, under the same
   * heading, and the registry keeps saying what it said.
   */
  readonly workspaceLead?: React.ReactNode;
  /**
   * Open evidence items, or `null` when no ledger has been compiled. `0` and
   * `null` are emphatically not the same reading.
   */
  readonly openEvidenceItems: number | null;
  readonly rightOfWay: string;
  readonly rightOfWayResolved: boolean;
  /**
   * What the OS has actually observed about its own feed.
   *
   * `null` ⇒ no room has published yet ⇒ FEED UNKNOWN, never a flattering
   * default. `FEEDLESS_SURFACE` ⇒ the room declares it carries no feed at all,
   * and the masthead OMITS the badge, exactly as `surface: null` omits the
   * surface chip. See FeedDeclaration for why those are not the same value.
   */
  readonly feed: FeedDeclaration;
  /** As-of stamp for the provenance line, or `null` to omit the slot. */
  readonly asOfLabel?: string | null;
  /**
   * Passport / evidence / contextual analysis. Omitted ENTIRELY when absent —
   * an empty context rail is a promise the room did not keep.
   */
  readonly contextRail?: React.ReactNode;
  /**
   * Who paints the black.
   *
   * Default `"frame"` — the frame owns its field. A caller that already paints
   * the field AND layers atmosphere on top of it passes `"caller"`, so the
   * frame stays transparent and that atmosphere remains visible. Two opaque
   * fields stacked is not a colour bug; it is the upper one DELETING the
   * lower one's content while looking perfectly fine in a screenshot.
   */
  readonly field?: "frame" | "caller";
  /**
   * Whether the rooms rail starts OPEN.
   *
   * ── WHY A ROOM GETS AN OPINION ABOUT THIS ────────────────────────────────
   *
   * The rail is permanent chrome: twenty-one doors, a workspace block and the
   * standing conditions, {@link OS_RAIL_WIDTH_PX}px wide, on every route at
   * every moment. On a REFLECTION surface that is correct — the whole job is
   * choosing where to go next.
   *
   * On the instrument view it is the mall standing in front of the market.
   * Measured on the live build at 1920x840 with the rail open, the chart canvas
   * was 1388x596 = 51.3% of the viewport, and the rail was holding the largest
   * single block of width that was not price.
   *
   * So the frame keeps owning the rail — this is not a room drawing its own
   * navigation — and simply accepts one bit from the room about whether the
   * doors should be in front of the trader before they have asked for a door.
   *
   * CLOSED IS NOT GONE. The toggle is always rendered, always labelled, always
   * keyboard-reachable, and carries `aria-expanded`. Nothing is buried; the
   * trader is one click from every room they had before.
   *
   * Deliberately NOT persisted to localStorage. A first render that depends on
   * browser storage is the exact shape of the five separate React #418
   * hydration defects this codebase has already paid for. The room's answer is
   * deterministic on both sides of the wire.
   */
  readonly railDefaultOpen?: boolean;
  /**
   * How the phone reaches the rest of the product from this room.
   *
   * ── THE DEFECT THIS CLOSES (M1) ──────────────────────────────────────────
   *
   * At 1920 the instrument view shows NO destinations until the trader asks:
   * the rail defaults shut ({@link railDefaultOpen}) and the doors live behind
   * one labelled toggle. At 390 the same room showed a pinned five-door strip
   * — /charts, /command-deck, /paper, /journal, /profile — permanently across
   * the bottom of the market, {@link OS_PHONE_NAV_HEIGHT_PX}px of consumer app
   * tab bar plus a matching reservation stolen from the provenance line.
   *
   * That is not a narrower version of the desktop room. It is a DIFFERENT
   * PRODUCT: a destination mall on the phone, a workspace on the desk. The
   * order's words are "390 is not a different application."
   *
   * ── AND THE FIX IS NOT A DELETION ────────────────────────────────────────
   *
   * Removing the bar and stopping there would strand a 390px trader on the
   * chart with no way out, which is the capability amputation the final-lap
   * order forbids by name. So `"door"` does not take the doors away, it puts
   * them behind the SAME one the desk uses — and the phone sheet carries all
   * twenty-one destinations plus the workspace block and the standing
   * conditions, where the strip carried five. The trader gains sixteen doors
   * and loses a permanent strip.
   *
   * `"bar"` (the default) is unchanged July behaviour for every room where
   * choosing where to go next IS the job.
   *
   * ── A ROOM THAT ASKS FOR `"door"` MUST ALSO ASK FOR A CLOSED RAIL ────────
   *
   * `"door"` makes the rail an overlay below the breakpoint. If the room also
   * left `railDefaultOpen` at its `true` default, the first phone paint would
   * be a full-screen navigation the trader never summoned. The frame cannot
   * measure the viewport at render — doing so is the React #418 class this
   * codebase has already paid for five times — so the invariant is asserted in
   * `ShellAccessParity.test.tsx` against the real shell rather than guessed at
   * runtime.
   */
  readonly phoneDestinations?: "bar" | "door";
  /**
   * WHO IS THE OPERATING SYSTEM ON THIS ROUTE: THE MAP, OR THE MARKET.
   *
   * `"rail"` (the default, unchanged July behaviour) says the OS is a set of
   * DESTINATIONS. It draws a masthead control literally labelled "Rooms" and,
   * behind it, a column that lists twenty-one places to go. For /journal,
   * /lounge, /shop — rooms where choosing where to go next IS the job — that
   * is correct and stays.
   *
   * `"equipment"` says the OS is the SCENE the trader is standing in, and the
   * only chrome the frame may offer is the equipment attached to that scene.
   * The Founder's 2026-09-19 order: "You are not redesigning WM Pro. You are
   * removing the legacy shell that is preventing the already-approved WM Pro
   * from appearing on /charts. Preserve the organs. Kill the competing house."
   *
   * ── WHAT THIS ACTUALLY REMOVES, AND WHY NOT JUST A DEFAULT ───────────────
   *
   * `railDefaultOpen={false}` already made first paint quiet. It did not make
   * the architecture true: the control in the masthead still said "Rooms", and
   * a trader who pressed it got a destination mall with the room's own
   * equipment buried as one block inside it. First paint was clean and the
   * PREMISE was still "navigation is the operating system".
   *
   * So `"equipment"` does not hide the rail — it deletes the ROOM LIST from
   * this route's frame entirely, and splits the one "Rooms" button into the
   * two the approved picture shows: WORKSPACE (this scene's equipment) and
   * TOOLS (the instruments). No Rooms toggle, no destination rail, no
   * five-door phone bar. The shot gate's words: "two equipment buttons only".
   *
   * ── AND IT IS NOT AN AMPUTATION ──────────────────────────────────────────
   *
   * The ROOM destinations are not deleted from the product; they are deleted
   * from THIS FRAME. They keep their doors in every `"rail"` room, in the
   * July 72px rail, and in the Workspace drawer. What a trader loses on the
   * instrument view is a permanent advertisement for somewhere else, which is
   * the entire defect. Reaching them is one route away; being sold them is
   * what made two URLs both feel like home.
   *
   * A room asking for `"equipment"` should also ask for `phoneDestinations`
   * `"door"`, so the same answer holds at 390: the panel is the phone's
   * equipment sheet and no pinned strip is drawn.
   */
  readonly destinations?: "rail" | "equipment";
  /**
   * ── MATTING IS FOR PICTURES, NOT FOR INSTRUMENTS ──────────────────────────
   *
   * `"matted"` — the default, and correct for every room whose children are
   * CARDS. Text needs a margin or it collides with the frame, and 14px×18px is
   * that margin.
   *
   * `"bleed"` — for a room whose child is a MACHINE that draws its own edges.
   * The chart canvas already rules its own price axis on the right and its own
   * time axis along the bottom; matting it adds a second, emptier border
   * outside the one the instrument drew, and C-101 spends that glass on
   * "charts 70% FLOOR AREA". MEASURED on production 2026-09-21 at 1440×900:
   * 28px of vertical and 36px of horizontal, i.e. the padding alone was
   * costing the market more height than the entire tool row below it.
   *
   * Default `"matted"` on purpose: a room that says nothing keeps today's
   * pixels. Only a room that has looked at its own child and found an
   * instrument may ask to bleed.
   */
  readonly room?: "matted" | "bleed";
  readonly children: React.ReactNode;
}

/** The single frame every room composes. */
export function WMOperatingSystem({
  activeHref,
  surface,
  brand,
  mastheadCaption,
  mastheadCenter,
  mastheadActions,
  workspaceLead,
  openEvidenceItems,
  rightOfWay,
  rightOfWayResolved,
  feed,
  asOfLabel = null,
  contextRail,
  field = "frame",
  railDefaultOpen = true,
  phoneDestinations = "bar",
  destinations = "rail",
  room = "matted",
  children,
}: WMOperatingSystemProps): React.ReactElement {
  // Read once, named once. Three separate places below branch on it — the bar,
  // the rail's overlay dressing and the stylesheet — and three independently
  // typed comparisons is how two of them end up agreeing and one does not.
  const phoneDoorOnly = phoneDestinations === "door";
  // The room's opinion SEEDS the rail; the trader's click OWNS it from then on.
  // Keyed on the default so that crossing from a rail-open room into the
  // instrument view re-seeds rather than carrying the mall in with it.
  const [railOpen, setRailOpen] = React.useState(railDefaultOpen);
  const seededDefault = React.useRef(railDefaultOpen);
  if (seededDefault.current !== railDefaultOpen) {
    seededDefault.current = railDefaultOpen;
    setRailOpen(railDefaultOpen);
  }
  // ── EQUIPMENT MODE ───────────────────────────────────────────────────────
  // Read once, named once. Six places below branch on it, and six
  // independently-typed string comparisons is how five of them agree and one
  // silently keeps drawing the mall.
  const equipmentMode = destinations === "equipment";
  // Which piece of equipment the trader has picked up. `null` — nothing — is
  // the only legal FIRST value on a market scene, and unlike `railOpen` it is
  // not seeded from a room's opinion: there is no opinion that justifies
  // opening a panel over price before the trader asked.
  const [equipment, setEquipment] = React.useState<"workspace" | "tools" | null>(null);
  // ONE predicate for "is the side panel on screen". The nav element is shared
  // between the two modes precisely so the phone overlay stylesheet, the close
  // control and aria-controls keep describing the thing the trader sees.
  const panelOpen = equipmentMode ? equipment !== null : railOpen;

  /**
   * ESCAPE PUTS THE EQUIPMENT DOWN. THE ADDRESS DOES NOT MOVE.
   *
   * The canon's §3 component law states it as a property of both buttons:
   * "Escape / tap-chart-background closes the overlay. URL unchanged." It is
   * not a convenience. An overlay that can only be dismissed by finding and
   * hitting the same small control again is a MODE, and a mode over a live
   * chart is the thing the trader cannot get out of while price is moving.
   *
   * WHY NOT `router.back()`, WHICH IS THE USUAL REFLEX. Picking equipment up
   * never pushed a history entry — that is the whole point of equipment, and
   * of `direct` in roomEquipment — so `back()` would leave the room entirely.
   * The trader pressed Escape to see the chart, and would land on whatever
   * page they were on before they arrived.
   *
   * RAIL MODE IS DELIBERATELY UNTOUCHED. There the panel is a map of
   * destinations with its own long-standing behaviour, and quietly changing
   * how a shared surface dismisses in one mode only is how two modes come to
   * disagree about what a key does.
   */
  const equipmentTriggers = React.useRef<
    Record<"workspace" | "tools", HTMLButtonElement | null>
  >({ workspace: null, tools: null });

  /**
   * IS THE TRADER ALREADY INSIDE SOMETHING THEY PICKED UP?
   *
   * The room owns a journey of its own — threshold → drawer → full — and it
   * ALSO closes on Escape, one step at a time. Two listeners on one key is one
   * press doing two things: the drawer would step back AND the wall behind it
   * would vanish, so a trader trying to back out one level would lose two.
   *
   * The room is the only writer of its stage; the frame never infers one. With
   * The selected instrument now replaces the rail instead of stacking a
   * second left wall over its cards. Escape therefore closes that instrument
   * one journey level at a time; the rail is already down behind it.
   */
  const [journeyOpen, setJourneyOpen] = React.useState(false);
  React.useEffect(() => {
    if (!equipmentMode) return;
    return subscribeEquipmentStage(({ stage }) => {
      const open = stage !== "closed";
      setJourneyOpen(open);
      if (open) setEquipment(null);
    });
  }, [equipmentMode]);

  React.useEffect(() => {
    if (!equipmentMode || equipment === null || journeyOpen) return;
    const held = equipment;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setEquipment(null);
      equipmentTriggers.current[held]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [equipmentMode, equipment, journeyOpen]);
  // Compiled ONCE. The rail and the provenance bar both read this array; two
  // independently-typed copies of one reading is how a screen ends up
  // disagreeing with itself.
  const standingConditions = compileStandingConditions({
    openEvidenceItems,
    rightOfWay,
    rightOfWayResolved,
  });

  // The frame owns the present moment for every room it renders. See
  // compileFeedStanding — rooms report what the market did, not when it is
  // being read.
  const evaluatedAtMs = useFeedEvaluationClock();

  // ── A ROOM THAT DECLARES IT CARRIES NO FEED GETS NO FEED BADGE ───────────
  //
  // FEED UNKNOWN means "this surface carries a feed and the OS cannot grade it
  // yet". That is right for /charts before its first tick, and wrong for the
  // Vault: measured on the live build, /nectar/TSLA is a memory room — 0
  // canvases, 0 prices, no socket — wearing an open question about a pipeline
  // that does not exist. The canon's own answer for that case is silence.
  //
  // Only an EXPLICIT declaration silences the badge. `null` — no room has
  // published yet — still compiles FEED UNKNOWN, because every room passes
  // through `null` on the way to its first publication and a trading surface
  // must not blink blank in the meantime.
  const feedStanding =
    feed === FEEDLESS_SURFACE
      ? null
      : compileFeedStanding(
          feed ?? {
            source: null,
            // No room has published, so nothing has been observed. This is
            // evidence of absence, not an absent verdict.
            quotePresent: false,
            lastObservedAtMs: null,
            connected: null,
            // A room that has published nothing has certainly not resolved a
            // session calendar. `null` is the only honest value, not `true`.
            sessionOpen: null,
            // Nor has it loaded bars. Same reasoning as `quotePresent` above:
            // this is evidence of absence, and it is what keeps a room in the
            // frames before its first publication reading FEED UNKNOWN rather
            // than inheriting a bars-only verdict it has no grounds for.
            barsPresent: false,
          },
          evaluatedAtMs,
        );

  const provenance = compileProvenanceSegments(feedStanding, asOfLabel);

  return (
    <div
      data-testid="wm-operating-system"
      style={{
        display: "flex",
        flexDirection: "column",
        flex: "1 1 auto",
        minHeight: "100%",
        minWidth: 0,
        background: field === "frame" ? FIELD : "transparent",
        color: PEARL,
      }}
    >
      {/* ── MASTHEAD ─────────────────────────────────────────────────── */}
      <header
        className="wm-os-masthead"
        data-testid="os-masthead"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "10px 18px",
          borderBottom: `1px solid ${RULE}`,
          minWidth: 0,
        }}
      >
        {/* IDENTITY CELL. The caller's brand REPLACES the frame's crest and
            wordmark — it never sits beside it — because two wordmarks in one
            masthead is the brand-dedupe defect in its purest form. */}
        <div
          data-testid="os-identity"
          style={{ display: "flex", flexDirection: "column", gap: 2, flex: "0 0 auto", minWidth: 0 }}
        >
          {brand ?? (
            <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <span
                aria-hidden
                data-testid="os-crest"
                style={{
                  width: 22,
                  height: 22,
                  flex: "0 0 auto",
                  borderRadius: 2,
                  border: `1px solid ${GOLD}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SERIF,
                  fontSize: 11,
                  color: GOLD,
                }}
              >
                W
              </span>
              <span
                style={{
                  fontFamily: SERIF,
                  fontSize: 13,
                  letterSpacing: 2.4,
                  textTransform: "uppercase",
                  color: PEARL,
                  whiteSpace: "nowrap",
                }}
              >
                Wealthy Mindsets
              </span>
            </span>
          )}
          {mastheadCaption}
        </div>

        {/* THE RAIL'S OWN CONTROL, DRAWN BY THE RAIL'S OWNER.
            It sits immediately after identity — leading edge, above the rail
            it opens — so the relationship between the button and the column is
            spatial rather than something a trader has to learn.

            ── AND ON A MARKET SCENE IT IS NOT DRAWN AT ALL ──────────────────
            A control labelled "Rooms" in the masthead of the instrument view
            is the competing house advertising itself above price. In
            `destinations="equipment"` the same slot carries the two things
            that belong to the SCENE — Workspace and Tools — and no list of
            places to go. See the prop's doc. */}
        {equipmentMode ? (
          <div
            className="wm-os-equipment-plates"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}
          >
            {(["workspace", "tools"] as const).map((kind) => {
              const open = equipment === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  // Escape returns focus HERE, not to the top of the document.
                  // A keyboard trader who dismissed the panel and lost their
                  // place has been handed the chart and taken off the chart at
                  // the same time.
                  ref={(el) => {
                    equipmentTriggers.current[kind] = el;
                  }}
                  data-testid={`os-equipment-${kind}`}
                  onClick={() => setEquipment((current) => (current === kind ? null : kind))}
                  aria-expanded={open}
                  // MEASURED 2026-09-19 on live /charts at 1920: with the rail
                  // closed, BOTH of these buttons reported
                  // `aria-controls="wm-os-rail"` while `getElementById` returned
                  // null. The rail comment further down states the design —
                  // "A CLOSED RAIL RENDERS NOTHING" — and the attribute above it
                  // then promised a region that had been deliberately unmounted.
                  //
                  // A dangling `aria-controls` is worse than no `aria-controls`:
                  // it is not ignored, it is FOLLOWED. A screen-reader user who
                  // takes the offered jump lands nowhere and is told nothing,
                  // which reads as a broken page rather than a closed panel.
                  //
                  // Gated on THIS button's own `open`, not on `panelOpen`. The
                  // two share one rail element, so gating on the shared state
                  // would have Workspace claiming to control the panel that
                  // Tools opened — a reference that resolves, and still lies.
                  aria-controls={open ? "wm-os-rail" : undefined}
                  aria-label={kind === "workspace" ? "Workspace" : "Tools"}
                  className="wm-os-equipment-plate"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 7,
                    // THE ONLY TWO DOORS IN THE ROOM ARE DRAWN LIKE DOORS.
                    // The Canon frame gives Workspace and Tools a brass plate
                    // each — adjacent, large, unmistakably the persistent
                    // equipment chrome. They shipped at the same 32px ghost
                    // weight as every incidental control on the page, which is
                    // why the approved frame reads as a sanctuary and the
                    // runtime read as a toolbar. Fitts' argument in §3 of the
                    // Last Mile support doc is explicit: "the two targets sit
                    // adjacent, LARGE".
                    //
                    // THIS IS THE COMPACT FLOOR, NOT THE CANON SIZE. The brass
                    // plate F24 draws — ~180x60 — is applied by
                    // `.wm-os-equipment-plate` in the DESKTOP half of the
                    // stylesheet at the bottom of this file. It is a media
                    // query rather than a `window.innerWidth` branch on
                    // purpose: a measured width read at render time is wrong
                    // on the server, wrong for one frame after hydration, and
                    // wrong again after a rotate. Below the breakpoint the
                    // masthead already wraps to two rows and these two plates
                    // share a 390px line with the crest — 180px each does not
                    // fit there, and the Founder's directive for this shift is
                    // desktop only.
                    minHeight: 34,
                    padding: "7px 13px",
                    borderRadius: 3,
                    border: `1px solid ${open ? GOLD : "rgba(196,165,116,0.42)"}`,
                    background: open
                      ? "rgba(196,165,116,0.14)"
                      : "linear-gradient(180deg, rgba(196,165,116,0.07), rgba(196,165,116,0.02))",
                    cursor: "pointer",
                    ...EYEBROW,
                    // AFTER the spread, not before. EYEBROW carries `color:
                    // MUTED`, so the held/resting ink this control sets was
                    // being overwritten by the typography preset one line
                    // later — the plate could not go gold when its own panel
                    // was open, and the open state lived entirely in a border.
                    color: open ? GOLD : PEARL,
                    fontSize: 10,
                    letterSpacing: 1.8,
                  }}
                >
                  <span
                    aria-hidden
                    className="wm-os-equipment-plate-mark"
                    style={{
                      flex: "0 0 auto",
                      display: "block",
                      width: 12,
                      height: 12,
                      color: GOLD,
                    }}
                  >
                    {ACTIVATOR_GLYPHS[kind]}
                  </span>
                  <span className="wm-os-equipment-plate-word">
                    {kind === "workspace" ? "Workspace" : "Tools"}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
        <button
          type="button"
          data-testid="os-rail-toggle"
          onClick={() => setRailOpen((open) => !open)}
          aria-expanded={railOpen}
          // Same repair as the equipment pair above, same reason: the rail this
          // names is unmounted while closed, so an unconditional reference
          // dangles for the whole time the control is most likely to be used.
          aria-controls={railOpen ? "wm-os-rail" : undefined}
          // The accessible name says what the control REACHES, not what the
          // click does. "Collapse" tells a screen-reader user about a motion;
          // "Rooms" tells them where the twenty-one doors are, which is the
          // thing they would be hunting for with the rail closed.
          aria-label="Rooms"
          title={railOpen ? "Hide the rooms rail" : "Show the rooms rail"}
          style={{
            flex: "0 0 auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            minHeight: 32,
            padding: "6px 10px",
            borderRadius: 3,
            border: `1px solid ${railOpen ? GOLD : RULE}`,
            background: railOpen ? "rgba(196,165,116,0.10)" : "transparent",
            color: railOpen ? GOLD : MUTED,
            cursor: "pointer",
            ...EYEBROW,
          }}
        >
          <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>{railOpen ? "◧" : "▤"}</span>
          Rooms
        </button>
        )}

        {/* An unpublished surface omits the slot ENTIRELY. "—" in a title
            position still occupies the shape of a title. */}
        {surface === null ? null : (
          <>
            <span aria-hidden style={{ width: 1, height: 14, background: RULE, flex: "0 0 auto" }} />
            <span
              data-testid="os-surface"
              style={{ ...EYEBROW, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {surface}
            </span>
          </>
        )}

        <div className="wm-os-masthead-center" style={{ flex: "1 1 auto", minWidth: 0 }}>
          {mastheadCenter}
        </div>
        {mastheadActions}
        {feedStanding !== null && <FeedBadge feed={feedStanding} />}
      </header>

      {/* ── RAIL · ROOM · CONTEXT ────────────────────────────────────── */}
      <div
        className="wm-os-body"
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
          flex: "1 1 auto",
          minWidth: 0,
          /* The containing block for the equipment overlay below. Equipment
             is pinned to the ROOM region, not to the viewport, so it cannot
             ride over the masthead or the provenance footer — the two places
             the frame's standing truths live. */
          position: "relative",
          /* ── THE FLEXBOX TRAP THAT CLIPPED THE DESKTOP FOOTER ────────────
             `flex: 1 1 auto` says "shrink me". `min-height: auto` — the
             default for a flex item, and the value this had — says "but
             never below my content". The second wins, so this region did
             not shrink: measured at 1280x800 it was 828px tall inside a
             frame that only had 696px to give it. The provenance footer,
             next in the column, was pushed to y=901 and the sanctuary's
             overflow:hidden cut it off. No scrollbar, because the document
             was not scrollable — the line saying where the numbers came
             from was simply not on the screen and could not be reached.

             minHeight: 0 releases the shrink. The rail and the room inside
             already carry overflow-y:auto, so once this region is the right
             height they scroll within it — which is the OS frame law working
             as designed rather than being defeated one level up.

             The phone fix (WMExperienceShell, below the rail breakpoint)
             did NOT cover this. That one lets the DOCUMENT scroll on small
             screens; this is the desktop frame, where the document must not
             scroll and the panes must. Two different rooms, two fixes.
             Found by measuring at 1280x800 — the suite was green for both. */
          minHeight: 0,
        }}
      >
        {/* A CLOSED RAIL RENDERS NOTHING — not a zero-width column.
            The doors are reached through the always-present masthead toggle
            above, which carries aria-expanded and aria-controls pointing here.

            WHAT THE TOGGLE GOVERNS DEPENDS ON `phoneDestinations`, and the
            comment that used to sit here said it governed "only the desktop
            frame" — true when written, and exactly the kind of sentence that
            teaches the next reader an architecture the code has left behind.
            In a `"bar"` room the stylesheet still suppresses this column below
            the breakpoint and the phone strip owns navigation. In a `"door"`
            room this same element IS the phone's navigation, pinned. One
            state, one aria-expanded, two presentations. */}
        {!panelOpen ? null : (
        <nav
          className="wm-os-rail"
          id="wm-os-rail"
          // The accessible name is the TRUTH about what the panel contains. In
          // equipment mode it contains no rooms, so calling it "Rooms" would
          // be a label that lies to exactly the users who cannot see it.
          aria-label={equipmentMode ? (equipment === "tools" ? "Tools" : "Workspace") : "Rooms"}
          data-testid="os-rail"
          style={{
            /* ── EQUIPMENT IS PICKED UP OVER THE MARKET, NOT BESIDE IT ──────
               The canon's §3 geometry: the equipment wall is an OVERLAY at
               D≈0 and "the chart stays". As a flex COLUMN — which is what
               ROOMS is, correctly, because a map of destinations is part of
               the furniture — the panel took 176px away from the room, so
               reaching for a tool RESIZED the market: the chart canvas
               reflowed and redrew, and the exact camera the trader was
               reading moved under their hand. That is the opposite of
               equipment. A tool you pick up must not rearrange the room.

               So in equipment mode ONLY, the panel leaves the flex flow and
               is pinned over the room region. `<main>` keeps every pixel it
               had, the chart never reflows, and closing restores the Shot-1
               silhouette exactly because nothing about the room changed.

               OPAQUE, for the same reason the phone sheet is: a translucent
               panel over a moving chart is two readings of price in the same
               pixels.

               ROOMS MODE IS UNTOUCHED — same sticky column it has always
               been. The phone stylesheet below carries `!important` on every
               property it sets, so a pinned phone sheet still wins here. */
            ...(equipmentMode
              ? {
                  position: "absolute" as const,
                  left: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 40,
                  // The EQUIPMENT width, not the rooms width — see the
                  // constant's doc for the measured three-line hint this ends.
                  width: OS_EQUIPMENT_RAIL_WIDTH_PX,
                  flex: "none" as const,
                  background: FIELD,
                }
              : {
                  position: "sticky" as const,
                  top: 0,
                  alignSelf: "flex-start" as const,
                  flex: `0 0 ${OS_RAIL_WIDTH_PX}px`,
                }),
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: "14px 0",
            /* The rail used to hold seven doors and could never outgrow the
               viewport. It now holds twenty-one plus the standing conditions.
               Without this, a short screen simply CUTS the last rooms off —
               the same "no door" defect that adding them was meant to end,
               reintroduced as a layout accident.

               ── AND THE CAP WAS THE WRONG UNIT, SO IT DID NOT WORK ─────────
               This read `100vh`. The rail does not start at the top of the
               viewport: it starts BELOW the 73px masthead and must end ABOVE
               the 31px provenance footer. So `100vh` was 104px too generous.
               Measured at 1280x800: the rail was 828px tall and ran to y=901,
               a hundred and one pixels past the bottom of a frame that clips.
               The last rooms were cut off — precisely the defect this cap was
               written to prevent, by a cap that could never prevent it.

               `100%` is the container, not the screen. The container is the
               rail-room region, whose height is now correct, so the rail can
               no longer outgrow the space it actually occupies. The unit is
               the whole fix; `overflowY: auto` below was always right and was
               simply never reached, because the cap never bound.

               border-box because `maxHeight` on a content-box element caps the
               CONTENT and then adds the padding on top. With `padding: 14px 0`
               that is 28px of overrun — measured, the rail ran 724px inside a
               696px region and still crossed into the footer. The cap has to
               mean the whole box or it is 28px of the same bug. */
            boxSizing: "border-box",
            maxHeight: "100%",
            overflowY: "auto",
            overscrollBehavior: "contain",
            borderRight: `1px solid ${RULE}`,
          }}
        >
          {/* ── THE WAY BACK, AND IT IS NOT DECORATION ──────────────────────
              Above the rail breakpoint this is `display: none` and the always
              visible masthead toggle closes the rail. Below it, in a
              `phoneDestinations="door"` room, the rail is pinned over the
              whole viewport INCLUDING that toggle — so without this control
              the trader who opened the navigation has no way to dismiss it and
              get back to the market. A door that only opens is a trap. */}
          {!phoneDoorOnly ? null : (
            <button
              type="button"
              className="wm-os-rail-close"
              data-testid="os-rail-close"
              onClick={() => (equipmentMode ? setEquipment(null) : setRailOpen(false))}
              aria-label={equipmentMode ? "Put the equipment down" : "Close rooms"}
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                alignSelf: "flex-end",
                /* 44px is the floor a thumb can actually hit — the same floor
                   the phone strip's doors were held to. */
                minHeight: 44,
                minWidth: 44,
                margin: "0 10px 6px",
                padding: "8px 12px",
                borderRadius: 3,
                border: `1px solid ${RULE}`,
                background: "transparent",
                color: MUTED,
                cursor: "pointer",
                ...EYEBROW,
              }}
            >
              <span aria-hidden style={{ fontSize: 13, lineHeight: 1 }}>✕</span>
              Close
            </button>
          )}

          {/* ── THE ROOM LIST, AND WHERE IT IS NOT DRAWN ────────────────────
              This block IS the destination mall. In `destinations="equipment"`
              it is not rendered — not collapsed, not hidden by CSS, not moved
              behind a second click. A frame that still ships the list and only
              declines to show it is a frame that will show it again the first
              time someone flips a default. */}
          {equipmentMode ? null : (
            <>
              <div style={{ ...EYEBROW, padding: "0 14px 10px", color: GOLD }}>Rooms</div>

              {OS_ROOMS.map((room) => (
                <RailLink
                  key={room.href}
                  href={room.href}
                  label={room.label}
                  activeHref={activeHref}
                  legacy={room.legacy}
                />
              ))}
            </>
          )}

          {/* WORKSPACE — the equipment THIS room has.
              Renders nothing at all in a room with none.

              In equipment mode the trader asked for one of two things by name,
              so the panel answers the question that was asked rather than
              stacking both. */}
          {equipmentMode ? (
            equipment === "workspace" ? (
              <>
                {/* The caller's own workspace control, at the head of the hand.
                    See `workspaceLead` for why the frame publishes a slot here
                    at all: without one, a control that IS equipment has no home
                    on this scene except the band standing over live price. */}
                {workspaceLead === undefined ? null : (
                  <div data-testid="os-workspace-lead" style={{ padding: "14px 14px 0" }}>
                    {workspaceLead}
                  </div>
                )}
                <RoomWorkspaceRail activeHref={activeHref} kind="workspace" presentation="tile" />
              </>
            ) : null
          ) : (
            <RoomWorkspaceRail activeHref={activeHref} />
          )}

          {/* TOOLS and COMMUNITY. Quieter than the loop above — smaller
              type, dimmer resting colour — because they are where the trader
              GOES, not where the trader WORKS. The active treatment is
              identical, so a room never changes its "you are here" mark
              depending on which heading it sits under.

              This heading used to read "Workbench", one word away from the
              WORKSPACE block directly above it and meaning the opposite
              thing. Two near-identical nouns stacked on top of each other is
              how "equipment I can pick up here" and "somewhere else I can go"
              became indistinguishable, which is the confusion the Workspace
              restore exists to end. They are TOOLS: other destinations. */}
          {/* ── TOOLS: LENSES IN EQUIPMENT MODE, DESTINATIONS IN RAIL MODE ──
              The two are not the same list and this branch is the whole reason
              the `kind` field exists.

              In RAIL mode "Tools" is a heading over the TOOL destination group
              and always was — /scanner, /news, and the rest are genuinely other
              places, and a rail whose job is orientation should say so.

              In EQUIPMENT mode the same word means the opposite thing. The
              Visual Systems canon's §3 component law is explicit: Tools opens
              "lenses + overlays + graduation toggles" and must NOT "become
              destinations". Rendering OS_WORKBENCH here shipped the destination
              mall one click below a masthead we had just cut it out of — the
              second house, rebuilt inside the first. */}
          {equipmentMode ? (
            equipment === "tools" ? (
              <RoomWorkspaceRail activeHref={activeHref} kind="lens" heading="Tools" presentation="tile" />
            ) : null
          ) : (
            <>
              <div style={{ ...EYEBROW, padding: "18px 14px 8px", color: MUTED }}>Tools</div>
              {OS_WORKBENCH.map((d) => (
                <RailLink key={d.href} href={d.href} label={d.label} activeHref={activeHref} quiet />
              ))}
            </>
          )}

          {/* COMMUNITY is neither equipment nor a tool — it is somewhere else
              to be. It has doors in every other room; it does not get one over
              a live market. */}
          {equipmentMode ? null : (
            <>
              <div style={{ ...EYEBROW, padding: "18px 14px 8px", color: MUTED }}>Community</div>
              {OS_COMMUNITY.map((d) => (
                <RailLink key={d.href} href={d.href} label={d.label} activeHref={activeHref} quiet />
              ))}
            </>
          )}

          {/* STATE — the standing conditions live under the room list, where
              they are visible without a scroll. A "persistent" condition you
              have to go looking for is not persistent. */}
          <div
            data-testid="os-rail-state"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 16,
              paddingTop: 14,
              borderTop: `1px solid ${RULE}`,
            }}
          >
            <div style={{ ...EYEBROW, padding: "0 14px", color: GOLD }}>State</div>
            {standingConditions.map((condition) => (
              <StateReadout key={condition.label} condition={condition} layout="stack" />
            ))}
          </div>
        </nav>
        )}

        <main
          data-testid="os-room"
          /* ── TOUCHING THE MARKET PUTS THE EQUIPMENT DOWN ───────────────────
             The second half of the canon's §3 dismiss clause: "Escape /
             tap-chart-background closes the overlay. URL unchanged." Escape is
             the keyboard's way out; this is the thumb's, and on a phone it is
             the ONLY intuitive one — reaching back to the small control that
             opened the panel is not what a hand does when it wants the chart.

             POINTERDOWN, NOT CLICK, AND NO preventDefault. The press is
             OBSERVED, never consumed: whatever the trader actually aimed at in
             the room still receives its own click. So this cannot become the
             "first tap is eaten" defect, where a trader with equipment open
             has to press every chart control twice.

             It does not run in rail mode. There the panel is a map of
             destinations with its own long-standing behaviour, and a frame
             whose panel dismisses differently depending on an invisible mode
             is a frame that has two answers to one gesture. */
          onPointerDown={
            equipmentMode && equipment !== null && !journeyOpen
              ? () => setEquipment(null)
              : undefined
          }
          style={{
            flex: "1 1 auto",
            minWidth: 0,
            minHeight: 0,
            // The ROOM scrolls, not the machine. A frame that scrolls away
            // takes the feed badge and the standing conditions with it, which
            // is exactly the "persistent condition you have to go looking for"
            // the rail placement above was written to avoid.
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            // BLEED: a machine that draws its own axes needs no mat around
            // it, and no gap between it and a sibling it does not have. See
            // the `room` prop's note — this is the only place either value is
            // spent, so the branch lives here rather than in five call sites.
            gap: room === "bleed" ? 0 : 12,
            padding: room === "bleed" ? 0 : "14px 18px",
          }}
        >
          {children}
        </main>

        {/* An absent context rail renders NOTHING — not an empty panel. */}
        {contextRail ? (
          <aside
            className="wm-os-context"
            aria-label="Context"
            data-testid="os-context-rail"
            style={{
              flex: "0 0 320px",
              minWidth: 0,
              padding: "14px 16px",
              borderLeft: `1px solid ${RULE}`,
            }}
          >
            {contextRail}
          </aside>
        ) : null}
      </div>

      {/* ── PROVENANCE ───────────────────────────────────────────────── */}
      <footer
        className="wm-os-provenance"
        aria-label="Provenance"
        data-testid="os-provenance"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          // ── THE CANON CENTRES THE PROVENANCE ─────────────────────────────
          // The footer laid its two groups out edge-to-edge: the standing
          // conditions hard left, the SOURCE / AS OF segments pushed hard
          // right by `flex: 1 1 auto`. At 1920 that is a metre of dead black
          // between two whispers of 9px type, and it read as a status bar —
          // the thing an operating system puts at the bottom when it has
          // nothing to say. The approved frame
          // (WM_NewMockup_64_F24_Surface_One_Canvas) draws the provenance as
          // ONE centred plate: the room signing its own reading.
          //
          // The vertical budget is fixed — the desktop viewport math above
          // reserves this footer's height exactly, so growing it would clip
          // the canvas. The plate's 1px border and 3px inset are paid for by
          // dropping the footer's own vertical padding 10px → 6px. Net height
          // is unchanged; only the arrangement moved.
          justifyContent: "center",
          gap: 20,
          padding: "6px 18px",
          borderTop: `1px solid rgba(196,165,116,0.30)`,
          background: "linear-gradient(0deg, rgba(196,165,116,0.05) 0%, rgba(7,8,10,0) 100%)",
          minWidth: 0,
        }}
      >
        {/* Below the breakpoint the rail is gone, so the bar is the ONLY
            carrier of the two standing conditions. Deleting it would drop them
            from every phone. */}
        <div
          className="wm-os-standing-bar"
          data-testid="os-standing-bar"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            // `flex: 1 1 auto` was what shoved the provenance plate to the far
            // right edge. The conditions occupy the width they need and no
            // more, so the two groups sit together in the middle of the room.
            flex: "0 1 auto",
            minWidth: 0,
          }}
        >
          {standingConditions.map((condition) => (
            <StateReadout key={condition.label} condition={condition} layout="bar" />
          ))}
        </div>

        <div
          data-testid="os-provenance-segments"
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            minWidth: 0,
            // The engraved plate. Same brass hairline and raised ground as
            // the rail cells, so the room's signature is drawn in the room's
            // own material rather than floating as loose text.
            border: "1px solid rgba(196,165,116,0.28)",
            borderRadius: 2,
            background: "rgba(24,20,14,0.5)",
            padding: "3px 14px",
          }}
        >
          {provenance.map((segment) => (
            <span key={segment} style={{ ...EYEBROW, whiteSpace: "nowrap" }}>
              {segment}
            </span>
          ))}
        </div>
      </footer>

      {/* ── PHONE NAVIGATION ────────────────────────────────────────────────
          The rail is `display: none` below the breakpoint, and until now
          NOTHING replaced it. That is not a degraded experience: a trader who
          opened /command-deck on a phone could not leave it. The standing bar
          above reports conditions; it is not a map.

          Five doors, from the destination owner, same labels and icons as
          every other surface. Hidden above the breakpoint, where the rail
          carries all twenty-one — two navigations on screen at once would be
          two answers to "where can I go".

          ── AND OMITTED ENTIRELY WHERE THE MARKET IS THE JOB (M1) ──────────
          `phoneDestinations="door"` rooms do not draw this strip. Not because
          a phone needs fewer doors, but because on those rooms the rail itself
          becomes the phone's navigation — reached through the masthead toggle
          that is always rendered, always labelled and always keyboard
          reachable — and it carries twenty-one where this carries five. See
          the prop's doc for why removing the strip alone would have been the
          amputation rather than the repair. */}
      {phoneDoorOnly ? null : (
      <nav
        className="wm-os-phone-nav"
        aria-label="Primary navigation"
        data-testid="os-phone-nav"
        style={{
          /* ── PINNED, AND THAT WORD IS THE WHOLE FIX ──────────────────────
             This bar shipped `position: static`. Measured in a real browser
             at 390×844, it laid out at y=1121 — 277px BELOW the fold. Every
             assertion about it was green: the testid was in the markup, all
             five hrefs resolved, the breakpoints were complementary. And the
             trader still could not leave the room without first scrolling to
             the bottom of the page to discover that a navigation existed.

             Presence is not reachability. A render test reads a string; it
             has no viewport, so it cannot tell the difference. That is why
             this was found by looking at it and not by the suite. */
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          /* Above the room's content, below the modal drawers — a nav that
             sits on top of an open dialog is a second way to lose the trap. */
          zIndex: 40,
          height: OS_PHONE_NAV_HEIGHT_PX,
          boxSizing: "content-box",
          display: "flex",
          flexShrink: 0,
          borderTop: `1px solid ${RULE}`,
          background: FIELD,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {PHONE_DOORS.map((d) => {
          const active = d.href === activeHref;
          const Icon = d.icon;
          return (
            <Link
              key={d.href}
              href={d.href}
              prefetch={false}
              aria-current={active ? "page" : undefined}
              style={{
                flex: "1 1 0",
                minWidth: 0,
                /* 44px is the floor a thumb can actually hit. A nav that needs
                   a second attempt is a nav that gets abandoned. */
                minHeight: 52,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "6px 2px",
                textDecoration: "none",
                color: active ? PEARL : MUTED,
                borderTop: `2px solid ${active ? GOLD : "transparent"}`,
              }}
            >
              <Icon size={18} aria-hidden="true" />
              <span
                style={{
                  fontSize: 9,
                  letterSpacing: 0.3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {d.label}
              </span>
            </Link>
          );
        })}
      </nav>
      )}

      <style>{`
        @media (max-width: ${OS_RAIL_BREAKPOINT_PX}px) {
          ${
            phoneDoorOnly
              ? /* ── THE RAIL IS THE PHONE'S NAVIGATION HERE ──────────────
                   It is the SAME element the desk shows as a column, so the
                   toggle's aria-expanded and aria-controls keep describing
                   the thing the trader actually sees, at both widths. A
                   second phone-only drawer component would have been a
                   second navigation with its own drift schedule — which is
                   the defect the whole frame exists to end.

                   The rail renders only when `railOpen`, and a room asking
                   for "door" must seed that false (see the prop's doc), so
                   the first phone paint is the market, not a sheet. */
                `.wm-os-rail {
            position: fixed !important;
            inset: 0 !important;
            z-index: 60 !important;
            /* The desk rail is a 176px column beside the room. Pinned over a
               390px viewport that basis would leave 214px of untouchable
               scrim with no visible way back, so the sheet takes the width
               it is standing on. */
            flex-basis: auto !important;
            width: auto !important;
            max-height: none !important;
            /* Opaque. A translucent navigation over a moving chart is two
               readings of price in the same pixels. */
            background: ${FIELD} !important;
            border-right: none !important;
            padding-bottom: calc(24px + env(safe-area-inset-bottom)) !important;
          }
          /* Shown ONLY here. On the desk the masthead toggle is never covered,
             so a second close control would be a second answer; pinned over
             the market it is the only one left on screen. */
          .wm-os-rail-close { display: flex !important; }`
              : ".wm-os-rail { display: none !important; }"
          }
          .wm-os-context { display: none !important; }
          /* ── THE MASTHEAD THAT ATE THE PHONE ──────────────────────────
             MEASURED 2026-09-16 with Playwright at 390x844 and 360x800:
             the masthead was 349px tall — 41% of the viewport before ANY
             market content — and document.elementFromPoint on the centre
             of EXECUTE returned an <svg>, not the button: the action-icon
             cluster was painted ON TOP of the mode bar.

             Mechanism, both halves needed: this header is one flex ROW
             that never wrapped, and every cell except the centre slot is
             flex:0 0 auto. So the centre slot was squeezed to a sliver,
             ExperienceModeBar's own flex-wrap stacked all seven buttons
             into a 320px column at the 44px tap-target floor, and the
             non-wrapping header kept the icons on the original row —
             over the column. The 44px floor is correct and stays; what
             was wrong is the width it had to wrap inside.

             Letting the header wrap and giving the centre slot a whole
             row of its own separates the two: identity + actions keep
             row one, the mode bar gets the full width on row two and
             folds into two short rows instead of seven. All seven modes
             stay visible — the bar is the phone's job navigation, so
             nothing here may hide behind a scroll. */
          .wm-os-masthead { flex-wrap: wrap !important; row-gap: 8px !important; }
          .wm-os-masthead-center { flex-basis: 100% !important; order: 1; }
          /* The pinned bar is out of flow. Reserve its exact height from the
             same constant it is drawn from, or the provenance line ends up
             underneath the navigation and nothing anywhere reports it. */
          /* The important flag, for the same reason the two rules above carry
             it: the footer sets its padding INLINE, and an inline style beats
             a stylesheet rule. Measured — without it the computed value stayed
             at the inline 10px and the reservation silently did nothing. */
          ${
            phoneDoorOnly
              ? /* No strip, no reservation. Reserving 66px for a bar that is
                   not drawn is a band of dead black under the provenance line
                   on the one room that most needs the height. */
                ""
              : `.wm-os-provenance {
            padding-bottom: calc(${OS_PHONE_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom) + 12px) !important;
          }`
          }
        }
        @media (min-width: ${OS_RAIL_BREAKPOINT_PX + 1}px) {
          .wm-os-standing-bar { display: none !important; }
          .wm-os-phone-nav { display: none !important; }
          /* ── THE BRASS PLATE, AT THE SIZE THE CANON DRAWS IT ─────────────
             F24 ("workspace equipment over live chart") makes these two the
             ENTIRE persistent top chrome: roughly 180x60 each, a hairline of
             warm gold, a drawn mark and the word, generous air. They shipped
             at 34px tall with a 10px eyebrow and a text glyph — the same
             weight as every incidental chip on the page — which is precisely
             the reading the Founder called "the old July shell".

             §3 of the Last Mile support doc states the Fitts argument the
             runtime was failing: "the two targets sit adjacent, large,
             top-left desktop". Adjacent and top-left were already true. LARGE
             is what this block adds, and it is the whole complaint.

             DESKTOP ONLY, by construction: the inline style above is the
             compact floor and this query never fires below the breakpoint,
             where the masthead wraps and 180px plates would not fit. */
          .wm-os-equipment-plates { gap: 10px !important; }
          .wm-os-equipment-plate {
            /* A FIXED width, so the two plates are the same object twice.
               F24 draws them as a matched pair; sizing each to its own word
               makes Tools visibly the lesser control, which is not what the
               canon says about the hand it opens.

               A fixed width also keeps this block free of the
               min-width-colon-pixels shape that
               theStandingConditionsHaveOneOwner forbids anywhere in this
               stylesheet — it reads any such declaration as a re-typed
               breakpoint literal, and that guard is worth more to the product
               than the one property it costs here. */
            width: 176px !important;
            min-height: 58px !important;
            gap: 13px !important;
            padding: 0 22px !important;
            border-radius: 4px !important;
          }
          .wm-os-equipment-plate-mark {
            width: 24px !important;
            height: 24px !important;
          }
          /* The canon sets the word in sentence case at reading size, not in
             the 10px tracked-out uppercase every eyebrow on the page wears.
             An eyebrow is a CAPTION; these two are the controls the whole
             scene is operated with. */
          .wm-os-equipment-plate-word {
            font-size: 15px !important;
            letter-spacing: 0.6px !important;
            text-transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default WMOperatingSystem;
