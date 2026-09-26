/**
 * W — WM SMART MONEY / MARKET INTELLIGENCE. THE ONE OWNER OF THE W DOOR'S WORDS.
 *
 * Garden 16 §14: "The W control is WM SMART MONEY / MARKET INTELLIGENCE. Use
 * the actual W/logo identity. W owns intelligence families: FLOW, LIQUIDITY,
 * VOLUME / PROFILE, STRUCTURE, MEMORY / CONTEXT. A guest should immediately
 * understand: CAMERA CHANGES HOW I VIEW THE SAME MARKET. W ACTIVATES WM
 * INTELLIGENCE."
 *
 * ── THE COLLISION THIS ENDS ───────────────────────────────────────────────
 * Measured on local /charts before this change: the Workspace plate listed a
 * desk called "Order Flow" and the Tools plate listed a reading called "Order
 * flow" — one letter's case apart, two different machines. One re-arranges
 * which readings are painted on the SAME market (a camera); the other opens
 * WM's intelligence about who is pressing (the W door). A guest could not tell
 * which "order flow" did what, which is the exact confusion §14 forbids.
 *
 * So the words are split by job and each has ONE owner:
 *   · camera words  → `selectChartArrangement.ts` (`arrangementCameraLabel`)
 *   · W words       → this file
 * The equipment registry, the room descriptors and the depth panel all read
 * from here; `oneWDoor.sentinel.test.ts` fails if any of them re-types them.
 *
 * Lives in `lib/`, not beside the panel, because the registry (`lib/`) must
 * read it and `lib/` does not import components.
 */

/**
 * The Market Intelligence family, in the bolt-on's own order. Named once so
 * the wing tags, the confession line and the W tile's hint cannot drift into
 * two spellings.
 */
export const MARKET_INTELLIGENCE_WINGS = {
  FLOW: "Flow",
  LIQUIDITY: "Liquidity",
  VOLUME_PROFILE: "Volume/Profile",
  STRUCTURE: "Structure",
  MEMORY_CONTEXT: "Memory/Context",
} as const;

export type MarketIntelligenceWing =
  (typeof MARKET_INTELLIGENCE_WINGS)[keyof typeof MARKET_INTELLIGENCE_WINGS];

/**
 * The wings with no installed instrument today. Confessed, never faked (§20):
 * a W tile promising five families and opening onto three would be the painted
 * door. When an instrument lands in one, remove it here and mount the reading
 * in `OrderFlowDepthPanel` — the hint below changes with it, by construction.
 */
export const UNBUILT_WINGS: readonly MarketIntelligenceWing[] = [
  MARKET_INTELLIGENCE_WINGS.STRUCTURE,
  MARKET_INTELLIGENCE_WINGS.MEMORY_CONTEXT,
];

/**
 * The W door's name. The brand's own two words for its intelligence; NOT
 * "Order flow" — that phrase now belongs to exactly one thing, the camera.
 */
export const W_DOOR_LABEL = "WM Smart Money";

/** What the W door opens onto, stated before the press. */
export const W_DOOR_ROLE = "Market intelligence";

/**
 * The W tile's hint: role, the installed families, and the ones that are not
 * installed — derived, so it cannot claim a wing the panel does not mount.
 */
export function wDoorHint(): string {
  const installed = Object.values(MARKET_INTELLIGENCE_WINGS).filter(
    (w) => !UNBUILT_WINGS.includes(w),
  );
  const missing = UNBUILT_WINGS.length
    ? ` · ${UNBUILT_WINGS.join(", ")} not installed yet`
    : "";
  return `${W_DOOR_ROLE} — ${installed.join(" · ")}${missing}`;
}
