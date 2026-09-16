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
// Where the product's rooms are has ONE owner. Retyping them here is what made
// this rail a second definition — see the note on OS_ROOMS below.
import { destinationsInGroup, phoneNavDestinations } from "@/lib/routing/wmDestinations";
import {
  compileFeedStanding,
  compileProvenanceSegments,
  compileStandingConditions,
  type FeedObservation,
  type FeedStanding,
  type StandingCondition,
} from "@/lib/os/osChrome";

export interface ShellRoom {
  readonly label: string;
  readonly href: string;
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
}: {
  href: string;
  label: string;
  activeHref: string;
  quiet?: boolean;
}): React.ReactElement {
  const active = href === activeHref;
  return (
    <a
      href={href}
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
    </a>
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
  const ink = unresolved ? MUTED : alert ? "#e07b5c" : PEARL;
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
 * The masthead's feed badge.
 *
 * The dot is the mockups' single green pip — but it can only be green when
 * `compileFeedStanding` produced a LIVE tone from actual evidence. An
 * unestablished reading wears a HOLLOW dot, because a filled dot of any colour
 * still reads as "we know something" at a glance.
 */
function FeedBadge({ feed }: { feed: FeedStanding }): React.ReactElement {
  const toneInk: Record<FeedStanding["tone"], string> = {
    LIVE: "#5fd39a",
    DELAYED: "#d9a441",
    IDLE: "#e07b5c",
    UNKNOWN: MUTED,
  };
  const ink = toneInk[feed.tone];
  return (
    <div
      data-testid="os-feed-standing"
      data-tone={feed.tone}
      data-established={feed.established ? "true" : "false"}
      title={feed.detail}
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
          background: feed.established ? ink : "transparent",
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
        {feed.label}
      </span>
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
   * Open evidence items, or `null` when no ledger has been compiled. `0` and
   * `null` are emphatically not the same reading.
   */
  readonly openEvidenceItems: number | null;
  readonly rightOfWay: string;
  readonly rightOfWayResolved: boolean;
  /**
   * What the OS has actually observed about its own feed. `null` when the
   * route has not wired one — which compiles to FEED UNKNOWN, never to a
   * flattering default.
   */
  readonly feed: FeedObservation | null;
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
  openEvidenceItems,
  rightOfWay,
  rightOfWayResolved,
  feed,
  asOfLabel = null,
  contextRail,
  field = "frame",
  children,
}: WMOperatingSystemProps): React.ReactElement {
  // Compiled ONCE. The rail and the provenance bar both read this array; two
  // independently-typed copies of one reading is how a screen ends up
  // disagreeing with itself.
  const standingConditions = compileStandingConditions({
    openEvidenceItems,
    rightOfWay,
    rightOfWayResolved,
  });

  const feedStanding = compileFeedStanding(
    feed ?? {
      source: null,
      fidelity: null,
      lastObservedAtMs: null,
      // No observation means no instant to evaluate at either. Zero is not a
      // time; it is the absence of one, and the compiler treats it as such
      // because every field above is already null.
      evaluatedAtMs: 0,
      connected: null,
    },
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

        <div style={{ flex: "1 1 auto", minWidth: 0 }}>{mastheadCenter}</div>
        {mastheadActions}
        <FeedBadge feed={feedStanding} />
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
        <nav
          className="wm-os-rail"
          aria-label="Rooms"
          data-testid="os-rail"
          style={{
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            flex: "0 0 176px",
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
          <div style={{ ...EYEBROW, padding: "0 14px 10px", color: GOLD }}>Rooms</div>

          {OS_ROOMS.map((room) => (
            <RailLink key={room.href} href={room.href} label={room.label} activeHref={activeHref} />
          ))}

          {/* WORKBENCH and COMMUNITY. Quieter than the loop above — smaller
              type, dimmer resting colour — because they are where the trader
              GOES, not where the trader WORKS. The active treatment is
              identical, so a room never changes its "you are here" mark
              depending on which heading it sits under. */}
          <div style={{ ...EYEBROW, padding: "18px 14px 8px", color: MUTED }}>Workbench</div>
          {OS_WORKBENCH.map((d) => (
            <RailLink key={d.href} href={d.href} label={d.label} activeHref={activeHref} quiet />
          ))}

          <div style={{ ...EYEBROW, padding: "18px 14px 8px", color: MUTED }}>Community</div>
          {OS_COMMUNITY.map((d) => (
            <RailLink key={d.href} href={d.href} label={d.label} activeHref={activeHref} quiet />
          ))}

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

        <main
          data-testid="os-room"
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
            gap: 12,
            padding: "14px 18px",
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
          gap: 20,
          padding: "10px 18px",
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
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20, flex: "1 1 auto", minWidth: 0 }}
        >
          {standingConditions.map((condition) => (
            <StateReadout key={condition.label} condition={condition} layout="bar" />
          ))}
        </div>

        <div
          data-testid="os-provenance-segments"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, minWidth: 0 }}
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
          two answers to "where can I go". */}
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
            <a
              key={d.href}
              href={d.href}
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
            </a>
          );
        })}
      </nav>

      <style>{`
        @media (max-width: ${OS_RAIL_BREAKPOINT_PX}px) {
          .wm-os-rail { display: none !important; }
          .wm-os-context { display: none !important; }
          /* The pinned bar is out of flow. Reserve its exact height from the
             same constant it is drawn from, or the provenance line ends up
             underneath the navigation and nothing anywhere reports it. */
          /* The important flag, for the same reason the two rules above carry
             it: the footer sets its padding INLINE, and an inline style beats
             a stylesheet rule. Measured — without it the computed value stayed
             at the inline 10px and the reservation silently did nothing. */
          .wm-os-provenance {
            padding-bottom: calc(${OS_PHONE_NAV_HEIGHT_PX}px + env(safe-area-inset-bottom) + 12px) !important;
          }
        }
        @media (min-width: ${OS_RAIL_BREAKPOINT_PX + 1}px) {
          .wm-os-standing-bar { display: none !important; }
          .wm-os-phone-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}

export default WMOperatingSystem;
