import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BookOpen,
  Check,
  Copy,
  Crosshair,
  FlaskConical,
  Globe,
  GraduationCap,
  Handshake,
  Map,
  Newspaper,
  Radio,
  ScanLine,
  Shield,
  ShoppingBag,
  Sun,
  Tv,
  TrendingUp,
  User,
  Users,
  Zap,
} from "lucide-react";

import { INSTRUMENT_VIEW_ROUTE } from "./founderLanding";

/**
 * WHERE THE PRODUCT'S ROOMS ARE — one owner, one list.
 *
 * ── THE DEFECT ──────────────────────────────────────────────────────────────
 *
 * Four hand-maintained lists answered this one question, and they disagreed:
 *
 *   `OS_ROOMS`            WMOperatingSystem.tsx   7 entries   the OS rail
 *   `NAV_CORE` + `NAV_WORKBENCH` + `NAV_BOTTOM`
 *                         MainLayout.tsx         19 entries   the July rail
 *   `MOBILE_NAV_ITEMS`    MainLayout.tsx          5 entries   the phone bar
 *   `FOUNDER_ROOM_ROUTES` founderRoomRoutes.ts    7 entries   who wears the OS
 *
 * Read from source, not guessed, the disagreements they had accumulated:
 *
 *   · `/command-deck` was "Question-Driven" in the OS rail and "Command Deck"
 *     in the July rail. `/charts` was "Chart" and "Charts". One room, two
 *     names, depending on which shell the trader happened to be standing in.
 *   · `/paper` wears the OS frame (it is in FOUNDER_ROOM_ROUTES) but was NOT in
 *     OS_ROOMS — so the trader standing in that room could not see it in the
 *     room list. The rail denied the room it was rendering.
 *   · `/proof-lane` was in OS_ROOMS but NOT in FOUNDER_ROOM_ROUTES — so the OS
 *     rail offered a door that walks the trader OUT of the OS and into the
 *     other shell, with no sign that anything had changed.
 *
 * None of those is a typo. They are what four owners of one fact always
 * produce, given time. So the lists are gone and this is the one that remains:
 * every consumer above now DERIVES from `WM_DESTINATIONS`, and a new room joins
 * the product by editing this file and nothing else.
 *
 * ── WHAT `frame` MEANS ──────────────────────────────────────────────────────
 *
 * `frame: "os"` is the claim that this route has been seen inside
 * WMOperatingSystem and its own layout survived the move. It is a MEASUREMENT,
 * not an aspiration — a route is promoted by looking at it, which is why the
 * field is per-destination rather than a default with exceptions.
 *
 * ── WHY THERE ARE THREE VALUES AND NOT TWO ──────────────────────────────────
 *
 * `"os" | "legacy"` was a binary, and a binary forces a lie in one direction or
 * the other. src/lib/design/osRoomPlane.ts walked all fourteen legacy rooms and
 * cleared thirteen of them of the one defect that reliably breaks a promotion —
 * an opaque near-black plane painted over the sanctuary. That is a real,
 * repeatable, machine-checkable result, and the binary had nowhere to put it.
 * So the result lived in an `expect(...).toEqual([...])` inside that detector's
 * TEST FILE: a fact about a ROUTE, owned by a test's expectation array, in a
 * different directory from the registry that every consumer reads.
 *
 * TWO OWNERS OF ONE FACT, with the weaker one holding the newer information.
 *
 * `frame: "cleared"` is the third state, and it is as strictly measured as the
 * other two: EVERY STRUCTURAL BLOCKER THE INSTRUMENT CAN SEE IS GONE, AND NO
 * HUMAN HAS LOOKED YET. It deliberately does NOT change behaviour — a cleared
 * room still wears the July shell, because `OS_FRAMED_ROUTES` derives from
 * `"os"` alone and nothing else reads this field. Promotion remains a human
 * act. What changed is that the act is now one character per route, performed
 * in the file that owns the answer, instead of an audit re-run from scratch.
 *
 * CLEARED IS NOT PROMOTED. The instrument rules out ONE way of failing; it does
 * not certify a room. Anyone tempted to bulk-flip `"cleared"` to `"os"` should
 * read that sentence again — this field's whole value is that it is a record of
 * looking, and a bulk flip is a record of not having looked.
 */
export type WmDestinationGroup = "ROOM" | "TOOL" | "COMMUNITY";

export interface WmDestination {
  readonly href: string;
  /** The ONE name this room answers to, in every rail, on every shell. */
  readonly label: string;
  readonly icon: LucideIcon;
  readonly group: WmDestinationGroup;
  /**
   * 1 = a live-decision surface. 2 = a trader-strengthening tool.
   * Read by `selectNavEmphasis` to decide what a rail may withhold while
   * capital is live; it is not a sort key and it is not a visual rank.
   */
  readonly tier: 1 | 2;
  /**
   * Which frame wraps this route today, and how far it has got toward the OS.
   * See the note above — all three values are measurements.
   *
   *   "os"      — seen inside WMOperatingSystem; its layout survived the move.
   *   "cleared" — osRoomPlane found no opaque room plane; still on July; no
   *               human has looked at it under the OS frame yet.
   *   "legacy"  — on July, and not cleared.
   */
  readonly frame: "os" | "cleared" | "legacy";
}

/**
 * Ordered along the founder-canon trader loop:
 * PREP → DECIDE → OBSERVE → DISCOVER → LEARN → REVIEW, then the tools the
 * trader steps out to, then the places they go when they are not trading.
 */
export const WM_DESTINATIONS: readonly WmDestination[] = [
  // ── ROOMS — the decision family, the ones the OS frame holds ────────────
  { href: "/morning-prep", label: "Morning Prep", icon: Sun, group: "ROOM", tier: 1, frame: "os" },
  { href: "/command-deck", label: "Command Deck", icon: Crosshair, group: "ROOM", tier: 1, frame: "os" },
  { href: INSTRUMENT_VIEW_ROUTE, label: "Charts", icon: BarChart2, group: "ROOM", tier: 1, frame: "os" },
  { href: "/heatmaps", label: "Heatmaps", icon: Map, group: "ROOM", tier: 1, frame: "os" },
  { href: "/nectar", label: "Passport", icon: Shield, group: "ROOM", tier: 1, frame: "os" },
  // TIER 1, not 2. Tier 2 is what a rail may withhold while capital is live —
  // and /paper is the room the open book LIVES in. Withholding it at exactly
  // the moment a position is on would trap the trader away from their own
  // position to "protect" them, which `selectNavEmphasis` names as a worse
  // failure than the noise the reduction is fixing.
  { href: "/paper", label: "Paper Trade", icon: TrendingUp, group: "ROOM", tier: 1, frame: "os" },
  { href: "/journal", label: "Journal", icon: BookOpen, group: "ROOM", tier: 2, frame: "os" },

  // ── TOOLS — market work the trader steps out to ─────────────────────────
  { href: "/scanner", label: "Scanner", icon: ScanLine, group: "TOOL", tier: 1, frame: "cleared" },
  { href: "/news", label: "News", icon: Newspaper, group: "TOOL", tier: 1, frame: "legacy" },
  { href: "/education", label: "Academy", icon: GraduationCap, group: "TOOL", tier: 2, frame: "cleared" },
  { href: "/proof-lane", label: "Proof Lane", icon: Check, group: "TOOL", tier: 2, frame: "cleared" },
  { href: "/copy-trading", label: "Copy Trading", icon: Copy, group: "TOOL", tier: 2, frame: "cleared" },
  { href: "/backtesting", label: "Backtest", icon: FlaskConical, group: "TOOL", tier: 2, frame: "cleared" },
  // The page at /ai-bot is titled "Market Intelligence · Observed market data
  // only · no generated signals" and runs the canonical Market Canvas — it does
  // not operate a bot or emit signals. A rail must not promise one.
  { href: "/ai-bot", label: "Market Intel", icon: Zap, group: "TOOL", tier: 2, frame: "cleared" },

  // ── COMMUNITY & BUSINESS ────────────────────────────────────────────────
  { href: "/lounge", label: "Lounge", icon: Users, group: "COMMUNITY", tier: 2, frame: "cleared" },
  { href: "/tv", label: "WM TV", icon: Tv, group: "COMMUNITY", tier: 2, frame: "cleared" },
  { href: "/radio", label: "WM Radio", icon: Radio, group: "COMMUNITY", tier: 2, frame: "cleared" },
  { href: "/creator", label: "Creator", icon: Globe, group: "COMMUNITY", tier: 2, frame: "cleared" },
  { href: "/partnerships", label: "Partnerships", icon: Handshake, group: "COMMUNITY", tier: 2, frame: "cleared" },
  { href: "/shop", label: "Shop", icon: ShoppingBag, group: "COMMUNITY", tier: 2, frame: "cleared" },
  { href: "/profile", label: "Profile", icon: User, group: "COMMUNITY", tier: 2, frame: "cleared" },
];

/** Every destination in one group, in canon order. */
export function destinationsInGroup(group: WmDestinationGroup): readonly WmDestination[] {
  return WM_DESTINATIONS.filter((d) => d.group === group);
}

/**
 * THE FIVE DOORS A PHONE GETS.
 *
 * A phone cannot hold twenty-one. The rail is `display: none` under 900px in
 * the OS frame, so whatever is here is the trader's ENTIRE map on the smallest
 * screen — which is why it lives with the destination owner and not inside one
 * shell. It was a private array in `MainLayout`, reachable only from the July
 * branch, and the consequence was measurable: an OS room on a phone had no
 * navigation of any kind.
 *
 * Five, not seven: the loop's other two rooms (`/morning-prep`, `/heatmaps`)
 * are reachable from inside the rooms that ARE here. A sixth slot at 390px
 * makes every slot too narrow to hit, which trades a reachability problem for
 * an accuracy one.
 */
export const PHONE_SLOT_HREFS: readonly string[] = [
  INSTRUMENT_VIEW_ROUTE,
  "/command-deck",
  "/paper",
  "/journal",
  "/profile",
];

/**
 * The phone slots as full destinations — same labels, same icons, one owner.
 *
 * THROWS at module load on an unknown href. A phone slot pointing at a route
 * the registry does not know is a painted door on the smallest screen, where a
 * trader has the least room to recover from it. Fail where a human is looking,
 * not silently at 390px.
 */
export function phoneNavDestinations(): readonly WmDestination[] {
  return PHONE_SLOT_HREFS.map((href) => {
    const found = WM_DESTINATIONS.find((d) => d.href === href);
    if (!found) throw new Error(`PHONE_SLOT_HREFS names ${href}, which is not a WM destination`);
    return found;
  });
}

/** Every route that wears the OS frame today. */
export const OS_FRAMED_ROUTES: readonly string[] = WM_DESTINATIONS.filter(
  (d) => d.frame === "os",
).map((d) => d.href);

/**
 * The destination the trader is currently inside, or `null`.
 *
 * Prefix-match, so a nested view (`/nectar/TSLA`, `/journal/2026-09-13`) still
 * reports the room it belongs to — a trader who navigated INTO a detail has not
 * walked out of the room. Never matches by suffix or by bare substring: a route
 * that merely CONTAINS "/journal" (say "/legal/journalism-policy", if one is
 * ever added) is a different place.
 */
export function activeDestination(pathname: string): WmDestination | null {
  let best: WmDestination | null = null;
  for (const d of WM_DESTINATIONS) {
    if (pathname !== d.href && !pathname.startsWith(d.href + "/")) continue;
    // Longest match wins, so a future "/journal/review" destination would beat
    // "/journal" rather than losing to declaration order.
    if (best === null || d.href.length > best.href.length) best = d;
  }
  return best;
}
