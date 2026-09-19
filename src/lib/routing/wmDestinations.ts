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
 *
 * ── HOW THE 2026-09-16 LOOKING WAS DONE, AND WHAT IT CANNOT SEE ─────────────
 *
 * Looking had been blocked: every interior route redirects to /login without a
 * session, and three sanctioned ways to get a local session all failed (a
 * second `next dev` is refused; Turbopack rejects a worktree's symlinked
 * node_modules; restarting the running server was not permitted). No
 * credential was touched and no token was forged to get around that.
 *
 * The way through was to render the room rather than visit it:
 * `renderToStaticMarkup(<WMExperienceShell><Page /></WMExperienceShell>)` to an
 * HTML file, with the REAL compiled stylesheet attached, then opened in Chrome
 * and both screenshotted and probed for computed styles.
 *
 * THE LIMIT, STATED PLAINLY: this is STATIC FIRST PAINT. No client effects, no
 * live data, no router, no interaction. A room promoted on this evidence has
 * been seen STANDING STILL. It has not been seen working. That is more than
 * "cleared" and less than a session, and any promotion below carries exactly
 * that weight.
 *
 * Attaching the stylesheet mattered: the first pass omitted it and reported
 * /education as visually broken. That verdict was an artifact of the harness,
 * not the room. A look is only a look when the thing being looked at is dressed.
 *
 * Rooms that could not be rendered at all, and so could not be looked at:
 * /ai-bot, /news and /scanner ("invariant expected app router to be mounted")
 * and /radio ("useRadio must be used inside RadioProvider"). They stay
 * "cleared" — not because they failed, but because nobody has seen them.
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
  /**
   * ROUTE AUTHORITY, not frame. `frame` is a measurement of which chrome wraps
   * the route and must not be bent into a verdict about whether the route
   * SHOULD be walked into — /command-deck is genuinely inside the OS frame
   * (frame: "os" is true) while having lost its claim to be a normal
   * destination. That loss is this field.
   *
   * "legacy" means: the Founder's 2026-09-19 order ("as soon as /charts is
   * legal HOME, Command Deck loses normal-route authority → explicit
   * legacy/debug quarantine") applies to this room. The door stays — capability
   * is preserved, every organ reachable — but any rail that draws the door must
   * SAY the word, so a trader walking in knows they are entering a surface the
   * product no longer treats as part of the normal loop. Absent means normal
   * authority. No room may take this value without its own recorded order;
   * `commandDeckQuarantine.test.ts` pins the count at exactly one.
   */
  readonly authority?: "legacy";
}

/**
 * Ordered along the founder-canon trader loop:
 * PREP → DECIDE → OBSERVE → DISCOVER → LEARN → REVIEW, then the tools the
 * trader steps out to, then the places they go when they are not trading.
 */
export const WM_DESTINATIONS: readonly WmDestination[] = [
  // ── ROOMS — the decision family, the ones the OS frame holds ────────────
  { href: "/morning-prep", label: "Morning Prep", icon: Sun, group: "ROOM", tier: 1, frame: "os" },
  { href: "/command-deck", label: "Command Deck", icon: Crosshair, group: "ROOM", tier: 1, frame: "os", authority: "legacy" },
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
  // LOOKED AT 2026-09-16, AND ONLY BECAUSE THE HARNESS GREW A ROUTER.
  //
  // /scanner, /news, /ai-bot and /radio were not held back on their merits.
  // They could not be RENDERED at all — three threw "invariant expected app
  // router to be mounted" and one threw "useRadio must be used inside
  // RadioProvider" — so they sat at "cleared" for a reason that had nothing
  // to do with them. That is the failure mode "cleared" is most exposed to:
  // it is supposed to be a MEASUREMENT, and an unmeasurable room parks there
  // forever while looking like a verdict. The harness now supplies the two
  // providers app/layout.tsx supplies in production, and all four became
  // judgeable in the same pass.
  //
  // /scanner: the signal table, filter rail and AUTO-30s control all sit
  // correctly under the masthead, obsidian throughout, and the footer states
  // "QUOTE STATE: DELAYED" and "Not yet received" rather than implying live
  // ticks. The honesty is on the page, not in a tooltip.
  { href: "/scanner", label: "Scanner", icon: ScanLine, group: "TOOL", tier: 1, frame: "os" },
  // /news WAS HELD ON A MEASURED PHONE DEFECT, THE DEFECT WAS FIXED, AND IT IS
  // PROMOTED ON THE REPAIR — not on a second opinion about the same pixels.
  //
  // The hold, written earlier the same day: at 390x844 the search field and the
  // right-most source chip were cut off by the viewport edge, and the LIVE NEWS
  // stream rail ran off-screen carrying Mute and Minimize past it with no
  // gesture that brought them back. Not small, not awkward — gone. The phone is
  // the primary device, so a room that loses controls there has not cleared the
  // frame however correct it looks at 1440.
  //
  // Two structures caused it and each needed a DIFFERENT cure, because the
  // constraint above them differs:
  //   • The topbar has a `minHeight`, so it is allowed to become two lines. It
  //     wraps: `flex-wrap`, the search field made `min-w-0 flex-1` so it yields
  //     width instead of forcing overflow, and the action group wraps rather
  //     than being pushed off the edge.
  //   • The LIVE NEWS bar sits inside a FIXED 300px parent, so wrapping there
  //     would eat the video. It scrolls instead: the rail takes `min-w-0
  //     overflow-x-auto` and the Mute/Minimize controls take `shrink-0`, so the
  //     rail is the part that gives way and the controls stay put.
  // In both cases `min-w-0` is the load-bearing class — without it a flex child
  // refuses to shrink below its content and overflows its parent instead.
  //
  // RE-MEASURED at 390x844 after the fix: search field, AUTO-REFRESH, Connect
  // API Keys, every filter chip and Minimize are all inside the viewport. Same
  // method and the same limit as its siblings (static first paint).
  { href: "/news", label: "News", icon: Newspaper, group: "TOOL", tier: 1, frame: "os" },
  // LOOKED AT 2026-09-16 (static first paint, see header): lesson rail, progress
  // ring and challenge chip all sit correctly under the masthead; on-canon.
  { href: "/education", label: "Academy", icon: GraduationCap, group: "TOOL", tier: 2, frame: "os" },
  // LOOKED AT 2026-09-16: the most on-canon of the cleared rooms — gold on
  // obsidian throughout, pace table and challenge lab both legible.
  { href: "/proof-lane", label: "Proof Lane", icon: Check, group: "TOOL", tier: 2, frame: "os" },
  // LOOKED AT 2026-09-16 (static first paint, see header). The whole room is a
  // truthful gate — "Fictional traders removed", "Connect a real supported
  // broker first", and the state read from /api/broker/status described as "a
  // measurement, not a notice". On-canon, and the honesty is the content.
  { href: "/copy-trading", label: "Copy Trading", icon: Copy, group: "TOOL", tier: 2, frame: "os" },
  // LOOKED AT 2026-09-16, HELD BACK, AND THE HOLD WITHDRAWN THE SAME DAY.
  //
  // The hold said: "the room paints cyan and purple accents … those are not in
  // the WM palette, so promoting it would put a second visual system inside the
  // one OS." Two things were wrong with it, and both were found by looking at
  // the OS rather than at this one room.
  //
  //   1. `wm-blue` (#4FA3E0) and `wm-purple` (#8B5CF6) are DEFINED WM tokens in
  //      tailwind.config, sitting alongside gold, green and red. They ARE the
  //      palette, not an escape from it. "Cyan" was my own misreading of #4FA3E0.
  //   2. The exact selection idiom I objected to already ships in rooms that
  //      have been OS-framed since the original seven:
  //        bg-wm-blue/20 text-wm-blue border-wm-blue/40       — /paper 859, 1350, 1579
  //        bg-wm-purple/20 text-wm-purple border-wm-purple/40 — /journal 1589, 2005, 2376
  //      Holding /backtesting for a pattern /paper and /journal already carry
  //      would not have protected one visual system. It would have invented a
  //      second standard and applied it to the newest room only.
  //
  // A verdict of mine that the OS itself contradicts gets corrected in the open,
  // the way the /education verdict was. Promoted on the same static-first-paint
  // evidence as its siblings, carrying the same limit.
  { href: "/backtesting", label: "Backtest", icon: FlaskConical, group: "TOOL", tier: 2, frame: "os" },
  // The page at /ai-bot is titled "Market Intelligence · Observed market data
  // only · no generated signals" and runs the canonical Market Canvas — it does
  // not operate a bot or emit signals. A rail must not promise one.
  //
  // LOOKED AT 2026-09-16 once the harness could mount it. Obsidian and gold
  // throughout: the LIVE MARKET MONITOR band, the Market Canvas block and the
  // symbol rail all sit correctly inside the frame. Its right-hand column is
  // three truth panels — "Accuracy policy", "What is available", "No
  // substitute data" — which is the room saying out loud what it does not
  // know. Promoted on static first paint, carrying that limit.
  { href: "/ai-bot", label: "Market Intel", icon: Zap, group: "TOOL", tier: 2, frame: "os" },

  // ── COMMUNITY & BUSINESS ────────────────────────────────────────────────
  // LOOKED AT 2026-09-16: on this runtime Lounge renders its honest
  // "not configured — Supabase connection required" state, and that state sits
  // correctly under the masthead with the sanctuary intact. Promoted on the
  // degradation path; the populated path has not been seen.
  { href: "/lounge", label: "Lounge", icon: Users, group: "COMMUNITY", tier: 2, frame: "os" },
  // LOOKED AT 2026-09-16: channel guide, studio rail and the gold wordmark
  // block all sit correctly inside the frame; obsidian and warm gold
  // throughout.
  { href: "/tv", label: "WM TV", icon: Tv, group: "COMMUNITY", tier: 2, frame: "os" },
  // /radio IS HELD, AND THE EVIDENCE IS ITS OWN SIBLING.
  //
  // Looked at 2026-09-16. The room renders and the sanctuary shows through,
  // so it passes both sanctuary laws. What it does not pass is "one OS": the
  // channel grid is six opaque saturated cards — yellow, purple, green, blue,
  // pink, green — each a full-bleed hue with no obsidian and no gold. That is
  // a streaming-service visual system, not this one.
  //
  // THE REASON THIS IS NOT THE /backtesting MISTAKE AGAIN: that hold died
  // because the idiom I objected to already shipped in /paper and /journal, so
  // I was inventing a second standard for the newest room. Here the OS was
  // consulted FIRST and says the opposite. /tv is the direct sibling — same
  // group, same media shape, same channel-grid problem — and it solves it
  // entirely in obsidian and warm gold. So the WM answer to "how does a media
  // room show its channels" already exists and /radio is not using it.
  //
  // Held until the channel cards adopt the /tv treatment. That is a repair, not
  // a rejection, and it is the cheapest of the three open holds.
  //
  // ── THE REPAIR WAS DONE, SAME DAY. ───────────────────────────────────────
  //
  // The hold named /tv as the answer, so /tv was read rather than
  // re-interpreted. Its idiom (tv/page.tsx ~348) is specific and it is not
  // "use less colour": colour arrives as LOW-ALPHA GLOW AND HAIRLINE over a
  // dark base — `rgba(232,185,35,0.15)` radial washes, a 0.45-alpha border —
  // and a SOLID gradient is reserved for small action elements, a 16px icon
  // tile and a button. Never for a card the size of a hand.
  //
  // Applied to the seven Heritage tiles: each keeps its hue and loses its
  // slab. Obsidian base, the hue as a corner glow and a hairline, and the
  // waveform — which was already carrying the channel's character and was
  // being drowned in white laid over full-strength colour — now drawn in the
  // genre's own colour. Re-rendered and looked at: the strip reads as seven
  // cards in one room instead of a rainbow band across it.
  //
  // One unrelated thing was found by looking and fixed in the same pass: the
  // section header rendered the literal string "#E8B923" beside its title, a
  // swatch label from designing the strip that had been shipping as product
  // copy. Deleted.
  //
  // Promoted on the repair. Same method and same limit as its siblings
  // (static first paint).
  { href: "/radio", label: "WM Radio", icon: Radio, group: "COMMUNITY", tier: 2, frame: "os" },
  // LOOKED AT 2026-09-16, and promoted only AFTER its hero band was cured. The
  // band ended on linear-gradient(..., #050506) — the shell's own floor, laid
  // across the top of the room. The tier cards and the "ENROLLMENT NOT
  // CONNECTED" disclosure are on-canon.
  { href: "/creator", label: "Creator", icon: Globe, group: "COMMUNITY", tier: 2, frame: "os" },
  // LOOKED AT 2026-09-16: the most disciplined empty state in the product.
  // "No verified partners published yet" and "Rather than send you to a room
  // that is not there, this page says so." Nothing is invented to fill space.
  { href: "/partnerships", label: "Partnerships", icon: Handshake, group: "COMMUNITY", tier: 2, frame: "os" },
  // LOOKED AT 2026-09-16 and HELD BACK — and this hold was checked against the
  // OS before it was written, which is the lesson /backtesting taught the same
  // day.
  //
  // /shop paints a CREAM PAGE. It declares its own `.wm-shop-light` theme
  // (page.tsx:186) and renders white cards on a light field inside an OS that
  // is obsidian everywhere else. This is the one room in the product that does
  // that: a grep for `wm-light` across src/app/*/page.tsx returns NOTHING but
  // the global toggle in MainLayout:225. So unlike the /backtesting hold, this
  // is not my taste disagreeing with a shipped pattern — it is a genuine
  // second visual system, and one OS may not contain two.
  //
  // Promoting it would frame a light room in a dark shell, which is worse than
  // leaving it "cleared": the sanctuary would be visible around its edges,
  // making the mismatch louder rather than quieter. The decision this needs is
  // the Founder's (is the Marketplace deliberately a different world?), not a
  // frame flag.
  { href: "/shop", label: "Shop", icon: ShoppingBag, group: "COMMUNITY", tier: 2, frame: "cleared" },
  // LOOKED AT 2026-09-16 and NOT PROMOTED, for a reason that is about the
  // LOOKING rather than the room: /profile renders its body inside a
  // React.Suspense boundary (page.tsx:104), so static first paint shows an
  // empty room. Nothing is wrong with it — the harness simply cannot see it.
  // It stays "cleared" for the same reason /ai-bot, /news, /scanner and /radio
  // do: not because it failed, but because nobody has seen it.
  //
  // RE-CONFIRMED the same day with the router mounted. The other four rooms in
  // that sentence were unmeasurable for a harness reason and all four became
  // judgeable the moment the harness supplied a router — three were resolved on
  // the spot. /profile was NOT: with the router present the room area is still
  // blank, because the Suspense boundary is a real property of the page and not
  // an artefact of the instrument. So this stays the one honest "nobody has
  // seen it" left, and closing it needs a harness that RESOLVES Suspense, not
  // one that mounts more context.
  { href: "/profile", label: "Profile", icon: User, group: "COMMUNITY", tier: 2, frame: "cleared" },
];

/** Every destination in one group, in canon order. */
export function destinationsInGroup(group: WmDestinationGroup): readonly WmDestination[] {
  return WM_DESTINATIONS.filter((d) => d.group === group);
}

/**
 * THE DOORS A PHONE GETS.
 *
 * A phone cannot hold twenty-one. The rail is `display: none` under 900px in
 * the OS frame, so whatever is here is the trader's ENTIRE map on the smallest
 * screen — which is why it lives with the destination owner and not inside one
 * shell. It was a private array in `MainLayout`, reachable only from the July
 * branch, and the consequence was measurable: an OS room on a phone had no
 * navigation of any kind.
 *
 * Few, not seven: the loop's other rooms are reachable from inside the rooms
 * that ARE here. An extra slot at 390px makes every slot too narrow to hit,
 * which trades a reachability problem for an accuracy one.
 *
 * ── /command-deck LOST ITS SLOT HERE (M3, 2026-09-19) ───────────────────────
 *
 * The landing decision moved to /charts on 2026-09-17 (founderLanding.ts holds
 * the receipt), and after that cut this strip was the LAST surface where the
 * deck still stood beside Charts as a peer top-level home — one of only five
 * doors on the smallest screen, where door-count is the strongest possible
 * claim about what the product is. Two rooms presenting as home on the phone
 * is the second-throne defect the final-lap order names: "parity before
 * demotion is how a second home survives forever."
 *
 * This is a demotion of AUTHORITY, not an amputation of CAPABILITY. The deck
 * keeps its route, its family membership and its rail door — on the phone it
 * is two taps away (any strip door → the Rooms toggle → the full 21-door
 * sheet). What it no longer gets is a permanent slot on the market's own map.
 * Four doors also means each slot is wider at 390px, which the paragraph
 * above already names as the accuracy/reachability trade.
 */
export const PHONE_SLOT_HREFS: readonly string[] = [
  INSTRUMENT_VIEW_ROUTE,
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
