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
          · z-index: 0 with the content plane at z-index: 1 keeps focus
            outlines and drawer transitions above the atmosphere.
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
        .wm-sanctuary::after {
          background-image: url("/wm/grain-256.webp");
          background-repeat: repeat;
          background-size: 256px 256px;
          opacity: 0.06;
          mix-blend-mode: overlay;
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
        surface={standing.surface}
        openEvidenceItems={standing.openEvidenceItems}
        rightOfWay={standing.rightOfWay}
        rightOfWayResolved={standing.rightOfWayResolved}
        feed={standing.feed}
        asOfLabel={standing.asOfLabel}
        brand={brand}
        mastheadCaption={jobCaption}
        mastheadCenter={<ExperienceModeBar bus={bus} />}
        mastheadActions={
          /* The rail toggle is a VIEW control for this room. The access chrome
             is the product's four always-reachable capabilities. Both sit in
             the masthead's action slot, but only the second one is the reason
             a trader can sign out from /command-deck at all. */
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {railToggle}
            <ShellAccessChrome />
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
