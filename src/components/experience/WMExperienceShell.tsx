"use client";
import * as React from "react";
import { WM } from "@/lib/design/wmTokens";
import type { DecisionContextBus } from "@/lib/experience/decisionContextBus";
import { useDecisionContext } from "@/lib/experience/useDecisionContext";
import { useSanctuarySession } from "@/lib/experience/sanctuarySessionContext";
import { shellEmphasis } from "@/lib/experience/shellLayout";
import ExperienceModeBar from "./ExperienceModeBar";
import { WMOperatingSystem, OS_RAIL_BREAKPOINT_PX } from "@/components/os/WMOperatingSystem";
import { OsStandingProvider, useOsStanding } from "@/components/os/osStandingContext";
/**
 * Search, notifications, settings and sign-out. They were drawn ONLY in the
 * July `wm-universe` branch of MainLayout, which meant an OS room could not
 * reach any of them — including the one that ends the session.
 */
import { ShellAccessChrome } from "@/components/layout/ShellAccessChrome";
import { usePathname } from "next/navigation";
import { INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/**
 * WMExperienceShell — the persistent Wealth Command Environment frame
 * (Founder Phase 1: Skeleton).
 *
 * Founder transformation: WM Pro is not a feature-organised dashboard; it is a
 * living environment organised around the human's CURRENT JOB
 * (PREP · OBSERVE · WAIT · EXECUTE · MANAGE · REVIEW · LEARN). The market truth
 * stays the same — the shell only changes its EMPHASIS around that job.
 *
 * This shell is a pure layout frame: a quiet brand line + the seven-mode bar +
 * a single job caption on top, the SACRED market canvas (children) filling the
 * body, and a collapsible contextual guest rail that opens by default only in
 * the reflection modes. It performs NO market computation and touches NO market
 * logic — it wraps whatever canvas the caller provides.
 */
/**
 * Session dimension the sanctuary is allowed to observe.
 *
 * The Founder brief (2026-09-13) is explicit that CLOSED reads CALM: "last
 * verified market picture remains. Calm. No fake candle activity." Ambient
 * WATER-BREATH is not market truth, but reading like a busy trading room
 * behind a closed tape is exactly the pretend-alive shape the brief was
 * written to abolish. So the sanctuary accepts ONE session signal, tunes
 * its tempo to it, and refuses everything else.
 *
 * Kept as a small closed union — never a canonical MarketQualityState —
 * because those states are producer identities and the sanctuary is a
 * consumer costume. "OPEN" is the default and covers PREMARKET/RTH/AFTER
 * as a single "the tape can move" bucket; "CLOSED" is the founder canon
 * word from §7; "UNKNOWN" is the honest default when the caller has not
 * yet resolved a session.
 */
export type WMExperienceSessionSignal = "OPEN" | "CLOSED" | "UNKNOWN";

export interface WMExperienceShellProps {
  /** Quiet brand slot — caller passes the compact wordmark. */
  readonly brand?: React.ReactNode;
  /** The sacred market canvas (chart / command surface). */
  readonly children: React.ReactNode;
  /** Contextual guest content (watchlist / prep / review). Collapsible. */
  readonly rail?: React.ReactNode;
  /** Optional label for the guest rail toggle. */
  readonly railLabel?: string;
  /** Injected bus for tests/stories; defaults to the singleton. */
  readonly bus?: DecisionContextBus;
  readonly className?: string;
  /**
   * The scene's session, if the caller knows it. When absent or "UNKNOWN"
   * the sanctuary defaults to OBSERVE tempo — the brief allows breath at
   * that intensity; what it forbids is BUSY behind a CLOSED tape.
   */
  readonly session?: WMExperienceSessionSignal;
}

/**
 * The sanctuary is the ATMOSPHERE and the OS is the SILHOUETTE.
 *
 * It used to be both. It drew its own header (brand · job · mode bar · rail
 * toggle) and its own 320px aside — which meant that once /command-deck grew
 * the OS frame, the deck carried TWO mastheads. Measured live on production
 * before this change: FIVE `<header>` elements on one route.
 *
 * So the sanctuary keeps exactly what only it can own — the three atmosphere
 * planes and the mode-keyed tempo — and hands every piece of chrome it used to
 * draw to `WMOperatingSystem` through that frame's slots. Same words on screen,
 * one silhouette carrying them.
 *
 * The provider is mounted HERE, above the frame, because the frame must be the
 * OUTERMOST thing a room sits inside. A room cannot wrap itself in the frame
 * without recreating the separate-shells defect, so rooms publish upward
 * instead — and what they have not published reads UNKNOWN.
 */
export function WMExperienceShell(props: WMExperienceShellProps) {
  return (
    <OsStandingProvider>
      <SanctuaryRoom {...props} />
    </OsStandingProvider>
  );
}

function SanctuaryRoom({
  brand,
  children,
  rail,
  railLabel = "Context",
  bus,
  className,
  session = "UNKNOWN",
}: WMExperienceShellProps) {
  const { context } = useDecisionContext(bus);
  // What the room currently in the frame has told the OS about itself. A room
  // that has published nothing leaves every reading at UNKNOWN.
  const standing = useOsStanding();
  const pathname = usePathname();
  const emphasis = shellEmphasis(context.mode);
  // The prop wins over the context — an explicit caller (mostly tests and
  // the founder-room preview) can override the surrounding page's signal
  // without a Provider hop. When the prop is UNKNOWN (the default), the
  // context's answer takes over.
  const contextSession = useSanctuarySession();
  const resolvedSession = session === "UNKNOWN" ? contextSession : session;

  /**
   * "Is this the room where the market itself is the job?"
   *
   * Declared ONCE. Two separate pieces of chrome — the rooms rail and the seven
   * experience states — both step aside here, and they step aside for the same
   * reason. Two copies of the predicate would let one of them be re-pointed at a
   * future instrument route while the other silently kept the old answer, and
   * the symptom would be half a masthead collapsing.
   */
  const onInstrumentView = (pathname ?? "") === INSTRUMENT_VIEW_ROUTE;

  // The guest rail's default follows the current job's emphasis; a mode switch
  // reorganises the environment around the new job. The human may still toggle.
  const [railOpen, setRailOpen] = React.useState(emphasis.railDefaultOpen);
  const lastMode = React.useRef(context.mode);
  React.useEffect(() => {
    if (lastMode.current !== context.mode) {
      lastMode.current = context.mode;
      setRailOpen(emphasis.railDefaultOpen);
    }
  }, [context.mode, emphasis.railDefaultOpen]);

  const hasRail = !!rail;
  const showRail = hasRail && railOpen;

  /*
    SCENE_FRAGMENTATION repair (Founder audit 2026-09-13). The job sentence
    used to be its OWN full-width horizontal band with its own bottom hairline.
    Measured live on production at 1920x847: a 69px nav rail, then a 26px
    stripe carrying one sentence, then the room. Two stacked bars of permanent
    chrome consumed 11% of the viewport before the trader reached any market
    pixel, and the audit names permanent chrome as a fragmentation vector.

    The sentence is not chrome in its own right — it is the CAPTION OF THE
    SELECTED MODE, which is the control immediately to its right. It rides
    under the brand inside the one masthead, stated exactly once.
  */
  const jobCaption = (
    <span
      data-testid="shell-job-caption"
      style={{
        fontSize: 10,
        letterSpacing: 0.3,
        color: WM.gold.mark,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: 260,
      }}
    >
      {emphasis.job}
    </span>
  );

  /**
   * The seven states as a piece of WORKSPACE EQUIPMENT rather than a masthead
   * band — handed to the frame's `workspaceLead` slot on the instrument view.
   * See the prop site below for the measurement that moved it.
   *
   * IT CARRIES ITS OWN NAME. The frame publishes an unlabelled slot, and
   * `RoomWorkspaceRail` draws the "WORKSPACE" eyebrow over ITS OWN list a few
   * pixels lower. Without a heading here the panel's first content would sit
   * above a caption belonging to something else, and a sighted trader would
   * read "WORKSPACE" as the label of the seven buttons above it. The `<nav>`
   * inside already announces itself as "Experience mode" to a screen reader;
   * this is the same fact, said to the eye.
   */
  const modeEquipment = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          color: WM.gold.mark,
        }}
      >
        Mode
      </div>
      <ExperienceModeBar bus={bus} />
    </div>
  );

  /** Rendered only when there is actually a rail to toggle. */
  const railToggle = hasRail ? (
    <button
      type="button"
      onClick={() => setRailOpen((v) => !v)}
      aria-pressed={showRail}
      aria-label={`${showRail ? "Hide" : "Show"} ${railLabel}`}
      style={{
        flexShrink: 0,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.6,
        textTransform: "uppercase",
        padding: "5px 10px",
        borderRadius: WM.radius.md,
        border: `1px solid ${showRail ? WM.border.strong : WM.border.hair}`,
        color: showRail ? WM.text.hero : WM.text.muted,
        background: showRail ? WM.surface.raised : "transparent",
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {railLabel}
    </button>
  ) : null;

  return (
    <div
      className={`wm-sanctuary ${className ?? ""}`}
      data-mode={context.mode}
      data-session={resolvedSession}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: WM.surface.deepest,
        /*
          KEY AND FILL — the two lights the Canon puts in the room, and the
          layer that was simply absent before. A desk lamp above-left, a cold
          window above-right, both at single-digit alpha. They are what stop a
          near-black field from reading as a switched-off screen: the eye needs
          a luminance gradient to believe it is looking at a lit space rather
          than at nothing.

          Set inline rather than in the stylesheet below because this element
          carries an inline `backgroundColor`, and an inline background would
          beat any `background-image` a class rule tried to add. Splitting the
          shorthand is what lets both live together without an `!important`.

          The Canon names the field `#07080a`; `WM.surface.deepest` is
          `#050506`. The token is not overridden here. Two grey levels are
          nothing at these alphas, and writing a literal into this one file
          would fork the answer to "what colour is the field" — the exact
          second-answer failure the design system exists to prevent. If the
          Canon's value must win, it wins by changing the token.
        */
        backgroundImage: [
          "radial-gradient(1200px 700px at 28% 16%, rgba(212,175,106,0.07), transparent 58%)",
          "radial-gradient(900px 620px at 78% 8%, rgba(255,248,235,0.035), transparent 52%)",
        ].join(", "),
        color: WM.text.body,
        // The sanctuary layers below must sit UNDER interactive content.
        // isolate contains their z-order to this subtree.
        isolation: "isolate",
      }}
    >
      {/*
        THE THREE PLANES (Founder audit 2026-09-13):

          STATIC MATERIAL PLANE — key/fill light + vignette + grain +
                                  brass hairline
          AMBIENT PLANE          — WATER-BREATH, gentle, non-market
          SEMANTIC MARKET PLANE  — children (chart, decisions, receipts)

        WATER MAY BREATHE. PRICE MAY ONLY MOVE WHEN TRUTH MOVES.
        NO OWNER = STILL.

        Rules the sanctuary keeps:
          · The three layers are STATIC CSS.  No JS animation loop,
            no requestAnimationFrame, no per-frame noise.
          · Grain is ONE static 256x256 image tile at 6% opacity,
            fetched once and repeated by the compositor — never
            regenerated, never animated, never a second canvas.
          · WATER-BREATH is one 26s transform on ONE element and is
            AUTOMATICALLY DISABLED under prefers-reduced-motion.
          · Nothing here is keyed on market state. Green never means
            bullish; red never means bearish; nothing speeds up when a
            candle prints. If a future revision wants to drive an
            atmospheric cue from market truth, it must own the
            MOTION_OWNER / SOURCE_EVENT / FIDELITY_ROLE / AS_OF quartet
            or the audit's "NO OWNER = STILL" rule kills it.
          · pointer-events: none on every atmosphere layer so click/tap
            never lands on the vignette by accident.
          · The content plane sits at z-index: 1, which keeps focus
            outlines and drawer transitions above the VIGNETTE — that
            one is load-bearing for legibility, not taste, and
            atmosphereLegibility.enforcement.test.ts carries the
            arithmetic (a vignette over the text as well as its ground
            takes the body token to 3.68:1).
          · The GRAIN is the exception and rides at z-index: 40, over
            the room, per the Canon's §6. It is luminance-neutral by
            construction, and the same suite proves every legal
            text/surface pair still clears AA through it.
      */}
      <style>{`
        /* ── THE OS ROOM CLIPPED ITSELF ON A PHONE ────────────────────────
           The sanctuary is height:100dvh + overflow:hidden. That is the OS
           frame law and it is right on a desktop: an operating system does
           not scroll as a document, its panes scroll inside a fixed frame.

           MEASURED at 390x844: clientHeight 844, scrollHeight 1189. Three
           hundred and forty-five pixels of the room — the whole provenance
           footer, the line that says where the numbers came from — were cut
           off with NO WAY TO SCROLL TO THEM. Not below the fold. Gone.

           Below the rail breakpoint the frame law does not hold, because a
           phone has no room for a fixed frame AND its contents. There, the
           document scrolls, which is what every other phone surface does.

           Found by opening it at 390px and reading the box. The suite was
           648 files green throughout; a renderToStaticMarkup string has no
           viewport, so no assertion in it can ever see this. */
        @media (max-width: ${OS_RAIL_BREAKPOINT_PX}px) {
          .wm-sanctuary {
            height: auto !important;
            min-height: 100dvh !important;
            overflow: visible !important;
          }
        }
        .wm-sanctuary::before,
        .wm-sanctuary::after,
        .wm-sanctuary > .wm-water-breath {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 0;
        }
        /* Vignette — static inset radial darkening so MARKET feels
           spatially deeper than the outer chrome. Never breathes.

           Canon values: centred at 50% 42% rather than dead centre, because
           the room's content mass sits above the midline and a vignette
           centred below it darkens the chart before it darkens the chrome. */
        .wm-sanctuary::before {
          background: radial-gradient(
            ellipse at 50% 42%,
            transparent 42%,
            rgba(0,0,0,0.42) 100%
          );
        }
        /* ── GRAIN ────────────────────────────────────────────────────────
           This was a repeating-linear-gradient crosshatch: two 3px orthogonal
           rules, which is a SCREEN DOOR, not grain. Film grain is stochastic;
           a regular lattice is the one thing it never is. At 3px it also sat
           close enough to the pixel pitch of a HiDPI display to beat against
           the candle canvas underneath and produce moiré — a shimmer that
           moves when the chart scrolls, which is exactly the kind of motion
           with no owner the audit above forbids.

           Replaced with the Canon's production tile: 256x256 seamless
           monochrome noise at 0.06 under overlay, produced by
           scripts/generate-grain-tile.mjs and measured by
           grainTile.enforcement.test.ts. The tile's decoded mean is pinned to
           128 because overlay treats mid-grey as identity — any drift there
           would silently shift the luminance of the whole product.

           Opacity lives on the layer, not in the tile. The Canon's window is
           0.04-0.07; above 0.10 is FALSE_RIPENESS and fails the merge. */
        /* ── THE GRAIN SITS ON THE ROOM, NOT BEHIND IT ────────────────────
           This layer used to share the z-index: 0 above, which put it UNDER
           the content plane. The tile was therefore only ever visible in the
           gaps between panels: dirt on the wallpaper, not grain on the
           photograph. The Canon's §6 is explicit — "z 40 grain overlay ...
           vignette and grain are ABOVE the room and BELOW dialogs" — and the
           mockups it describes are single exposures, where one film stock
           covers the whole frame and ties the panels to the field.

           Lifting it is only safe because the ratio was MEASURED first.
           atmosphereLegibility.enforcement.test.ts composites every pair
           TEXT_ON_SURFACE permits through this exact layer at this exact
           opacity, using the shipped tile's real excursion, and holds the lot
           to 4.5:1. The thinnest rung, muted-on-mid, spends 4.86 -> 4.66 and
           keeps AA. That guard is what licenses this line; without it this is
           a pretty change that quietly costs legibility.

           The vignette deliberately does NOT come with it, and that is not an
           oversight — the same suite shows a vignette over the text taking the
           body token to 3.68:1. Grain is luminance-neutral by construction
           (mean 128 is overlay's identity); the vignette is not. One may rise.
           The other may not.

           40 clears the room without a tie: every direct child of the
           sanctuary is given its own stacking context at z-index 1 below, so
           the equipment layer's local 60/70 stays inside the room and under
           this tile. Dialogs are portaled out of the sanctuary entirely and
           are unreachable from here, which is the Canon's "below dialogs"
           arrived at structurally rather than by number. */
        .wm-sanctuary::after {
          background-image: url("/wm/grain-256.webp");
          background-repeat: repeat;
          background-size: 256px 256px;
          opacity: 0.06;
          mix-blend-mode: overlay;
          z-index: 40;
        }
        /* A phone is held closer and its pixels are smaller; the same tile
           reads stronger there. */
        @media (max-width: ${OS_RAIL_BREAKPOINT_PX}px) {
          .wm-sanctuary::after { opacity: 0.04; }
        }
        /* Atmosphere is the first thing to go when a reader has asked for
           contrast. Grain and vignette both reduce effective contrast against
           text, and neither carries any information, so neither has an
           argument for staying. */
        @media (prefers-contrast: more) {
          .wm-sanctuary::before,
          .wm-sanctuary::after {
            display: none;
          }
          /* The key and fill lights are set inline (see the style object
             above, which explains why), so the cascade alone cannot reach
             them. This is the case !important is actually for: a user
             preference overriding an author decision. */
          .wm-sanctuary {
            background-image: none !important;
          }
        }
        /* WATER-BREATH — very subtle brass radial wash, drifting.
           Non-market. Zero information. Only present when the OS has
           NOT asked for reduced motion. Kept intentionally low-contrast
           and low-amplitude so it reads as room air, not as a signal. */
        .wm-sanctuary > .wm-water-breath {
          background: radial-gradient(
            ellipse 60% 40% at 30% 20%,
            rgba(201,165,92,0.045) 0%,
            transparent 60%
          );
          opacity: 0.9;
        }
        /* MODE-KEYED (not market-keyed) atmosphere intensity.
           The audit's law is that market truth cannot drive atmosphere.
           EXPERIENCE MODE is different: it is the trader's own DECLARED
           intent — PREP/OBSERVE/WAIT/EXECUTE/MANAGE/REVIEW/LEARN —
           committed through the seven-mode bar with source=user. That is
           not a market claim; it is a self-report about which job the
           trader is on. Dimming the room in WAIT (no pulse baiting a
           trade) and steadying it in EXECUTE (place the planned
           decision) is exactly the audit's WAIT/EXECUTE atmosphere spec.
           No color changes, no red/green — only intensity, so the "state
           carried by labels, not decoration" law is preserved. */
        .wm-sanctuary[data-mode="WAIT"] > .wm-water-breath { opacity: 0.55; }
        .wm-sanctuary[data-mode="EXECUTE"] > .wm-water-breath { opacity: 1; }
        .wm-sanctuary[data-mode="MANAGE"] > .wm-water-breath { opacity: 0.95; }
        @media (prefers-reduced-motion: no-preference) {
          .wm-sanctuary > .wm-water-breath {
            animation: wm-breathe 26s ease-in-out infinite;
            will-change: transform, opacity;
          }
          /* In WAIT the room is very quiet: the audit's exact word.
             Slow the ambient cycle by half so the ceremony reads calm. */
          .wm-sanctuary[data-mode="WAIT"] > .wm-water-breath {
            animation-duration: 52s;
          }
          /* Founder brief (2026-09-13): "CLOSED: last verified market picture
             remains. Calm. No fake candle activity." Ambient breath is not
             market truth, but reading BUSY behind a closed tape is exactly the
             pretend-alive shape the brief was written to abolish. When the
             session signal is CLOSED, the sanctuary reads at WAIT's tempo
             regardless of the trader's job — the room is calm because the
             market is calm, not because the trader is waiting. */
          .wm-sanctuary[data-session="CLOSED"] > .wm-water-breath {
            animation-duration: 52s;
            opacity: 0.55;
          }
        }
        @keyframes wm-breathe {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.85; }
          50%      { transform: translate3d(8px, 4px, 0) scale(1.02); opacity: 1; }
        }
        /* Content plane sits above the atmosphere. Direct children of
           .wm-sanctuary get lifted (except the water-breath layer
           itself, which stays behind). */
        .wm-sanctuary > *:not(.wm-water-breath) {
          position: relative;
          z-index: 1;
        }
      `}</style>
      <div className="wm-water-breath" aria-hidden="true" />
      {/* ONE OS. The sanctuary no longer draws a header or an aside of its own;
          it composes the single frame and fills that frame's slots with the
          things only the sanctuary knows — the brand, the current job, the
          seven-mode bar, the guest rail and its toggle.

          `field="caller"` keeps the frame transparent. The sanctuary already
          paints the field and layers three atmosphere planes on top of it; a
          second opaque field above them would not look wrong in a screenshot,
          it would simply DELETE the atmosphere. */}
      <WMOperatingSystem
        field="caller"
        activeHref={pathname ?? ""}
        /* THE MARKET GETS THE FIRST VIEWPORT ON THE INSTRUMENT VIEW.
           Everywhere else the doors stay in front of the trader, because
           everywhere else choosing where to go IS part of the job. See
           WMOperatingSystem's railDefaultOpen for the measurement. */
        railDefaultOpen={!onInstrumentView}
        /* AND THE PHONE GETS THE SAME ANSWER, WHICH IS THE WHOLE POINT.
           `railDefaultOpen` alone only cleared the desk: at 390 the instrument
           view still carried a pinned five-door strip across the bottom of the
           market, so one room was a workspace at one width and a destination
           mall at the other. ONE predicate, BOTH widths — the doors sit behind
           one labelled toggle everywhere, and on the phone that toggle now
           reaches twenty-one of them where the strip reached five. */
        phoneDestinations={onInstrumentView ? "door" : "bar"}
        /* AND THE INSTRUMENT VIEW STOPS BEING A MAP AT ALL.
           `railDefaultOpen={false}` above only made first paint quiet; the
           masthead still carried a button labelled "Rooms" over a live market,
           and behind it a list of twenty-one places that are not here. The
           Founder's 2026-09-19 order removes the competing house rather than
           collapsing it: on /charts the frame offers the two pieces of
           equipment that belong to this scene — Workspace and Tools — and no
           destination rail. Every other room keeps its rail unchanged. */
        destinations={onInstrumentView ? "equipment" : "rail"}
        /* ── THE MARKET IS NOT A PICTURE, SO IT IS NOT MATTED ─────────────────
           C-101 spends the floor on the market: "charts 70% FLOOR AREA", with
           exactly two pieces of axis furniture — price on the RIGHT, time
           along the BOTTOM — and no third border outside them.

           The build drew one anyway. MEASURED on production 2026-09-21 at
           1440×900, `os-room` carried `padding: "14px 18px"`: 28px of height
           and 36px of width spent framing an instrument that had already
           ruled its own edges. For scale, the entire `wm-chart-toolbar`
           beneath it is 32px — the matting alone cost the candles very nearly
           a second tool row, and bought a margin nobody reads.

           ROUTE-SCOPED, the eighth decision on this predicate, and scoped in
           the same direction as the other seven: every room whose children
           are CARDS keeps its mat, because text against a frame edge is a
           legibility defect, not a reclaimed pixel. Only the room whose child
           is a machine bleeds. */
        room={onInstrumentView ? "bleed" : "matted"}
        /* ── THE ROOM DOES NOT NEED A NAMEPLATE WHEN THE ROOM IS THE MARKET ──
           F24's top band carries the two brass plates and the trailing chip.
           It does not carry a room name, and the build's band did: measured
           live at 1440, `wm-os-masthead` read

             "Workspace Tools Instrument View OBSERVE▾ 0 WM pts ACTIVE DEGRADED"

           `Instrument View` is a nameplate — it answers "which room is this?".
           On every other OS room that question is worth answering, because the
           rooms look alike and the rail is how you tell them apart. Here the
           candles answer it before any text does, and the nameplate is sitting
           between the equipment and the only reading in the band.

           ROUTE-SCOPED, NOT DELETED — the same treatment `brand`,
           `mastheadCaption`, `destinations` and `railDefaultOpen` already get
           four lines up. Every other room still publishes and still shows its
           surface, and `usePublishOsStanding` is untouched: /charts goes on
           publishing "Instrument View" so the standing context, the phone
           masthead and the provenance footer keep reading a real name. Only
           this band stops PAINTING it.

           `null`, NOT `undefined`, AND THE DIFFERENCE IS LOAD-BEARING. The
           frame omits the slot ENTIRELY on `surface === null`
           (WMOperatingSystem.tsx:1221-1233) — including the 1px divider that
           precedes it. Anything else leaves a separator floating beside
           nothing, which is the same dangling-furniture defect the feed chip's
           separator rule exists to prevent. */
        surface={onInstrumentView ? null : standing.surface}
        openEvidenceItems={standing.openEvidenceItems}
        rightOfWay={standing.rightOfWay}
        rightOfWayResolved={standing.rightOfWayResolved}
        feed={standing.feed}
        asOfLabel={standing.asOfLabel}
        /* ── THE HOME KEEPS ITS ONE CANONICAL HOUSE MARK ──────────────────
           RE-READ FROM THE EXACT CURRENT FILES, SIDE BY SIDE WITH SERVING
           /charts, 2026-09-21: both V01 one-canvas (file 64/F24) and V12
           finished WAIT (file 123/F16) carry the WealthyMindsets sanctuary
           lockup above the market camera. The former empty fragment came from
           a stale comparison and made HOME the only operating room that hid
           the identity its own approved frames publish.

           This restores the EXISTING brand owner; it does not add a banner,
           duplicate a wordmark, or restore the job-caption stripe. The mark
           stays inside the masthead whose 58px equipment plates already set
           the row height, so MARKET loses no vertical floor area. */
        brand={brand}
        mastheadCaption={onInstrumentView ? undefined : jobCaption}
        /* ── THE MODE IS EQUIPMENT, SO IT STANDS ON THE EQUIPMENT WALL ───────
           LOOKED AT, NOT INFERRED. 2026-09-21, canon frame F24 beside a 1440
           shot of this build, `wm-os-masthead` read

             "Workspace Tools OBSERVE ▾ ACTIVE DEGRADED · observed ·
              asOf 20:13:42 ET"

           F24's band carries the two brass plates at the leading edge and ONE
           fidelity chip at the trailing edge. `OBSERVE ▾` is the last thing
           standing in it that the canon does not draw.

           IT IS NOT DELETED, AND DELETING IT WOULD BE THE WRONG REPAIR TWICE
           OVER. OBSERVE is the trader's currently committed operating state —
           truth, not decoration — and it is the only surface that names which
           of the seven jobs the whole product is currently reorganised around.
           Removing it would hide a committed mode AND orphan the
           aria-controls/`EXPERIENCE_MODE_GROUP_ID` relationship that
           `AriaControlsResolves.sentinel` pins.

           SO IT MOVES, and it moves somewhere it belongs rather than somewhere
           it fits. Mode is something the trader PICKS UP AND SETS; it is not a
           reading they consult, which is what everything else left in this band
           is. The frame already publishes the wall for exactly that class of
           control, and an audit this session measured the Workspace wall
           holding two tiles — Draw and Replay — where the canon draws six. The
           room had space and the band did not.

           AND IT ARRIVES EXPANDED, WHICH IS THE POINT OF MOVING IT. The
           `collapsed` chip was the right answer for a masthead: one gold chip
           instead of the widest non-price object above the candles. Inside the
           Workspace panel there is no price to stand over — the panel is an
           overlay the trader opened deliberately — so the reason to collapse is
           gone, and collapsing here would cost a click for nothing. MEASURED
           this session at 1440: that panel is 264px wide, and the bar's own
           `flexWrap: "wrap"` lays the seven out at the 44px tap-target floor
           inside it with no clipping. One click on Workspace shows all seven
           with OBSERVE carrying `aria-current` — the SAME number of clicks the
           collapsed chip cost, reaching all six others instead of one.

           ROUTE-SCOPED, THE NINTH DECISION ON THIS PREDICATE. Every other room
           keeps the seven-tab bar in its masthead exactly as it was, because
           nowhere else is that band standing over a live market and nowhere
           else is there an equipment wall to stand on. */
        mastheadCenter={onInstrumentView ? undefined : <ExperienceModeBar bus={bus} />}
        workspaceLead={onInstrumentView ? modeEquipment : undefined}
        mastheadActions={
          /* The rail toggle is a VIEW control for this room. The access chrome
             is the product's four always-reachable capabilities. Both sit in
             the masthead's action slot, but only the second one is the reason
             a trader can sign out from /command-deck at all. */
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {railToggle}
            {/* ── A GAMIFICATION COUNTER DOES NOT STAND OVER A LIVE MARKET ──
                Same measured band, same canon frame as `surface` above: F24
                draws the two plates and the trailing fidelity chip, and the
                build's band read "… OBSERVE▾ 0 WM pts ACTIVE DEGRADED". `0 WM
                pts` is a local app-points balance — WMSBar.tsx:2-4 says so in
                its own words — and on /charts it sits BETWEEN the equipment and
                the one node in the band that is a market reading.

                ROUTE-SCOPED, the seventh decision on this predicate. Every
                other room keeps the balance, because nowhere else is the band
                standing over price. The P&L badge beside it STAYS everywhere:
                realized paper P&L is a fact about the trader's positions, which
                is the same subject as the candles, not a competing one. */}
            <ShellAccessChrome showPoints={!onInstrumentView} />
          </div>
        }
        contextRail={showRail ? rail : undefined}
      >
        {children}
      </WMOperatingSystem>
    </div>
  );
}

export default WMExperienceShell;
