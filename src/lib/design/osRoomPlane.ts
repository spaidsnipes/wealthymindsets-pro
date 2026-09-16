/**
 * DOES THIS ROOM PAINT OVER THE SANCTUARY?
 *
 * ── WHY THIS IS A FUNCTION AND NOT MORE REGEXES IN A TEST ───────────────────
 *
 * `founderRoomShell.test.ts` already guards this, and guards it well, but it
 * does so by naming the offenders it has personally met:
 *
 *     .not.toMatch(/background:\s*WM\.surface\.deep/)
 *     .not.toMatch(/background:\s*"radial-gradient[^"]*#050506"/)
 *     .not.toMatch(/\bbg-wm-dark\b/)
 *
 * Every one of those is correct, and every one of them is a spelling. The
 * defect is not the token `bg-wm-black`; the defect is A ROOM PAINTING AN
 * OPAQUE NEAR-BLACK PLANE OVER THE SANCTUARY. There are many ways to write
 * that and only a handful are on the list.
 *
 * ── HOW THAT COST US, MEASURED, THIS SHIFT ──────────────────────────────────
 *
 * Auditing the fourteen `frame: "legacy"` routes for promotion readiness, the
 * scan used was exactly the grammar above — `bg-wm-black`, `bg-wm-dark`,
 * `WM.surface.deep`. It reported `/proof-lane` as the one route with ZERO
 * hazards, and on that reading /proof-lane was about to be promoted into the
 * OS frame.
 *
 * /proof-lane's outer wrapper is:
 *
 *     <div className="h-full overflow-y-auto bg-[#050506] text-neutral-100">
 *
 * `#050506` is the SAME COLOUR /morning-prep was fixed for, in the same
 * position, doing the same damage. It survived the scan because it was spelled
 * as an arbitrary value instead of a token. A room would have been promoted
 * into the sanctuary carrying the exact plane the sanctuary exists to show
 * through, and the gate that guards that would have stayed green, because the
 * gate is a list of names and this was not one of the names.
 *
 * So the rule is stated by EFFECT here, once, and the tests ask this function
 * rather than each re-deriving the grammar.
 *
 * ── WHAT COUNTS, AND THE OVERREACH THAT TAUGHT IT ───────────────────────────
 *
 * The first version of this asked only "is there a near-black opaque fill in
 * this file". Run against the SEVEN rooms already in the OS frame — rooms that
 * were audited and fixed for exactly this — it reported fifteen offences:
 * `#161B22` on a /heatmaps tile, `bg-wm-dark` on a /paper card, `#0D1117` on a
 * /morning-prep panel.
 *
 * None of those is the defect. A dark CARD inside a room is a card. The
 * sanctuary is meant to be seen AROUND the furniture, not through it. The
 * inherited gate's narrowness — naming outer wrappers and sticky bands
 * specifically — was not an oversight; POSITION IS PART OF THE DEFECT, and
 * dropping it turns the gate into a false-positive machine that the next
 * author learns to widen rather than obey.
 *
 * So an offence is a fill that is ALL THREE of:
 *
 *   1. near-black — every channel at or below `NEAR_BLACK_CHANNEL_MAX`. This
 *      is the specific harm: the sanctuary's vignette, grain and water-breath
 *      are dark, so a dark opaque fill does not read as a mistake. It reads as
 *      the room, while cancelling it. A bright plane is caught by the first
 *      person who opens the page; this is the one that ships.
 *   2. OPAQUE. `rgba(11,11,13,0.8)` is the canonical sticky-glass value, and a
 *      pinned band has an honest reason to carry fill because rows scroll
 *      under it. Opacity is the entire difference between a legible band and
 *      a slab, so this reads it and reports neither `rgba()` nor `/40`.
 *   3. ON AN ELEMENT THAT CLAIMS FULL EXTENT — `h-full`, `h-screen`,
 *      `min-h-screen`, `inset-0`, `100vh`. That is what makes it a PLANE
 *      rather than a surface: it spans the room, so there is nothing left for
 *      the sanctuary to show through.
 *
 * Condition 3 is measured on THE ELEMENT — see `enclosingOpenTag` below, which
 * records at length why a ±180-character window was not good enough and what
 * a sidebar, a text input and a light-mode CSS rule looked like through it.
 */

/** Every channel at or below this is "near-black" for room-plane purposes. */
export const NEAR_BLACK_CHANNEL_MAX = 0x22;

/** Token-named planes. These stay by name because they ARE names — there is no
 *  colour to inspect at this layer, only the fact that the token is opaque. */
export const OPAQUE_PLANE_TOKENS: readonly string[] = [
  "bg-wm-black",
  "bg-wm-dark",
  "WM.surface.deep",
];

/** Hard bound on how far the element scan will walk before giving up, so an
 *  unbalanced brace in a source file cannot turn this into a runaway. */
export const ELEMENT_SCAN_LIMIT = 4000;

/** The ways an element says "I am the size of the room". */
const EXTENT_CLAIMS: readonly RegExp[] = [
  /\bh-full\b/,
  /\bh-screen\b/,
  /\bmin-h-screen\b/,
  /\binset-0\b/,
  /\bminHeight:\s*["'`]?100vh/,
  /\bheight:\s*["'`]?100vh/,
  /100vh/,
];

/**
 * The ways an element says "I am NOT the size of the room" — a width it chose.
 *
 * A plane spans the room. `/shop`'s cart is `h-full flex flex-col bg-wm-dark`
 * on a spring-animated `motion.div`: full height, but it is a slide-in DRAWER
 * with `w-[400px]`, and a drawer is furniture no matter how tall it is. Same
 * for `/news`'s `w-28` rail and `/tv`'s `w-56` sidebar.
 *
 * Height alone was the wrong test because rooms are taller than they are wide,
 * so `h-full` is the claim that gets typed and `w-full` is usually implicit.
 * An element that names its own width has declined to be the room.
 *
 * `w-full` and `w-screen` are deliberately absent: those are the room's width.
 */
const NARROW_CLAIMS: readonly RegExp[] = [
  /\bw-\d/,            // w-56, w-28
  /\bw-\[/,            // w-[400px]
  /\bmax-w-(?!none\b)/, // max-w-6xl, max-w-sm — but max-w-none is not a limit
  /\bw-\d+\/\d+\b/,    // w-1/2
  /\bwidth:\s*["'`]?\d/, // inline width: 400
];

export interface RoomPlaneOffence {
  /** The exact text found, so a failure message can be acted on without a grep. */
  readonly found: string;
  /** Why it is an offence, in one clause. */
  readonly reason: string;
}

/** #abc / #aabbcc / #aabbccdd → [r,g,b], or null if unparseable. */
function hexChannels(hex: string): [number, number, number] | null {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const [r, g, b] = h.split("").map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  if (h.length === 6 || h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return null;
}

function isNearBlack(hex: string): boolean {
  const ch = hexChannels(hex);
  if (!ch) return false;
  return ch.every((c) => c <= NEAR_BLACK_CHANNEL_MAX);
}

/** Strip comments so PROSE CANNOT SATISFY — OR TRIP — AN ASSERTION.
 *
 *  This is not tidying, and it has bitten twice in this shift alone. A repair's
 *  own comment quotes the value it replaced, so a scan that reads comments
 *  reports the fix as the defect. The mirror case is worse: a comment naming an
 *  element can satisfy a test that the element is mounted. Either way the gate
 *  stops describing the code. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * THE OPENING TAG THAT CARRIES A FILL — the element, not a character window.
 *
 * ── WHY THIS REPLACED A ±180-CHARACTER WINDOW ───────────────────────────────
 *
 * The first cut asked "is there a full-extent claim within 180 characters of
 * this fill". That is cheap and it is wrong at the boundary, and the boundary
 * is exactly where rooms live. Run over the nine blocked legacy rooms it
 * reported, among others:
 *
 *   /tv:216      <div className="w-56 shrink-0 border-r ... bg-wm-dark ...">
 *   /lounge:641  <input className="flex-1 bg-wm-black border ..." />
 *   /news:283    <div className="px-4 py-2 bg-wm-dark border-b shrink-0">
 *   /shop:184    .wm-shop-light .bg-wm-dark { background: rgba(255,255,255,.6) }
 *
 * A 224px sidebar, a text input, a toolbar strip, and a CSS rule that paints
 * the token WHITE in light mode. Every one of them sat near an `h-full`
 * belonging to a DIFFERENT element, and the window could not tell the
 * difference because a window does not know what an element is.
 *
 * That is the same mistake as the fifteen dark cards, one layer down: the rule
 * says the fill and the extent claim must be on THE SAME ELEMENT, so the
 * measurement must be of the same element too, not of nearby text.
 *
 * ── WHAT THIS IS AND IS NOT ─────────────────────────────────────────────────
 *
 * Still not a parse. It walks back to the nearest `<` and forward to the `>`
 * that closes that tag, tracking brace depth and quotes so that `style={{...}}`
 * and `onClick={() => x}` do not end the tag early — the `>` in an arrow is at
 * brace depth 1 and is skipped. Bounded by ELEMENT_SCAN_LIMIT.
 *
 * Its stated limits: it does not understand a fill applied through a variable,
 * a `cn()` call spanning several lines is fine but a fill assembled from
 * fragments is not, and a `>` inside a string attribute value would end the tag
 * early. Each of those fails CLOSED — no tag text, no offence — which is the
 * safe direction for a gate whose false positives teach people to widen it.
 */
export function enclosingOpenTag(code: string, at: number, len: number): string {
  const start = code.lastIndexOf("<", at);
  if (start < 0 || at - start > ELEMENT_SCAN_LIMIT) return "";

  let depth = 0;
  let quote: string | null = null;
  const end = Math.min(code.length, start + ELEMENT_SCAN_LIMIT);

  for (let i = start + 1; i < end; i++) {
    const c = code[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "{") { depth++; continue; }
    if (c === "}") { depth--; continue; }
    if (c === ">" && depth === 0) {
      // The tag closed. It only carries this fill if the fill is inside it.
      return i >= at + len ? code.slice(start, i + 1) : "";
    }
  }
  return "";
}

/**
 * Every opaque near-black plane this source paints. Empty means the room lets
 * the sanctuary through.
 */
export function findOpaqueRoomPlanes(source: string): RoomPlaneOffence[] {
  const code = stripComments(source);
  const offences: RoomPlaneOffence[] = [];

  /** Does the element carrying this fill claim the size of the room? */
  const spansTheRoom = (at: number, len: number): boolean => {
    const tag = enclosingOpenTag(code, at, len);
    if (!tag) return false;
    if (NARROW_CLAIMS.some((re) => re.test(tag))) return false; // a drawer, not a plane
    return EXTENT_CLAIMS.some((re) => re.test(tag));
  };

  const record = (m: RegExpMatchArray, reason: string) => {
    const at = m.index ?? 0;
    if (!spansTheRoom(at, m[0].length)) return; // a dark CARD is furniture
    offences.push({ found: m[0], reason });
  };

  // Token-named opaque planes. Word-bounded so `bg-wm-dark` does not match a
  // longer future token that merely starts the same way.
  for (const token of OPAQUE_PLANE_TOKENS) {
    const re = new RegExp(`(?<![\\w-])${token.replace(".", "\\.")}(?![\\w-])`, "g");
    for (const m of code.matchAll(re)) {
      record(m, "an opaque token plane occludes the sanctuary");
    }
  }

  // Tailwind arbitrary values: bg-[#050506]. A trailing /40 is an opacity
  // modifier and is therefore NOT a slab — the negative lookahead keeps it out.
  for (const m of code.matchAll(/\bbg-\[(#[0-9a-fA-F]{3,8})\](?!\/)/g)) {
    if (isNearBlack(m[1])) {
      record(
        m,
        `near-black arbitrary fill (${m[1]}) — the same plane, spelled around the token gate`,
      );
    }
  }

  // Inline style backgrounds: background: "#050506", backgroundColor: '#0b0b0d'
  for (const m of code.matchAll(
    /background(?:Color)?:\s*["'`]\s*(#[0-9a-fA-F]{3,8})\s*["'`]/g,
  )) {
    if (isNearBlack(m[1])) {
      record(m, `near-black inline fill (${m[1]}) — opaque, so the sanctuary stops here`);
    }
  }

  // A gradient that terminates in a near-black OPAQUE stop is the same slab
  // with a soft edge. rgba() stops are skipped: translucency is the honest case.
  for (const m of code.matchAll(
    /(?:linear|radial)-gradient\([^)]*?(#[0-9a-fA-F]{6,8})[^)]*\)/g,
  )) {
    if (isNearBlack(m[1])) {
      record(m, "a gradient to a near-black opaque stop is a slab with a soft edge");
    }
  }

  return offences;
}

/**
 * The page file that draws a destination's room.
 *
 * One expression, because "where does /journal live" is a fact, and a second
 * copy of it in a test file is a second owner that drifts the first time the
 * app directory is reorganised.
 */
export function roomPageFile(href: string): string {
  return `src/app${href}/page.tsx`;
}
