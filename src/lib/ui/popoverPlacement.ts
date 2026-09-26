/**
 * WHERE A FLOATING SURFACE SITS — inside the viewport, and never over the
 * controls that summoned it.
 *
 * Found on the glass 2026-09-26, local /charts at 1600x900, real UI path
 * (Garden 16 §44: a button that does not reach its intended human state is a
 * defect; §70 collision):
 *
 *   1. Tools › Chart tools › [Chart tools]. The menu was `position: fixed` at
 *      `top: trigger.bottom + 4`. Its trigger sits at the foot of the drawer
 *      (bottom 888), so the menu started at y 892 on a 900px screen: 8px of a
 *      630px menu were visible and none of its fourteen items — "Drawing
 *      tools" among them — could be reached by a pointer.
 *   2. Workspace › Draw › Drawing style. The STYLE popover opened to the right
 *      of its anchor, was clamped back to x 1372 inside the 320px drawer, and
 *      covered nine of the sheet's own tool buttons (Select / Move, Ray,
 *      Horizontal Line, Vertical Line, Arrow, Rectangle, Ellipse, Triangle,
 *      Short Position).
 *
 * Two rules, one owner. PURE: rectangles in, pixels out — no DOM, so the
 * geometry is tested as arithmetic and the components only measure.
 */

/** The breathing room kept between a surface and the viewport edge. */
export const POPOVER_VIEWPORT_GUTTER_PX = 8;

export interface ViewportRect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const finite = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

// ── 1. A menu that drops from its trigger ─────────────────────────────────

export interface AnchoredMenuInput {
  /** `window.innerHeight`. */
  readonly viewportHeight: number;
  /** The trigger's viewport rectangle (only its top and bottom are read). */
  readonly anchor: Pick<ViewportRect, "top" | "bottom">;
  /**
   * The menu's natural outer height — what it would be with no cap. Null when
   * it has not been measured yet; the menu then takes the roomier side.
   */
  readonly menuHeight: number | null;
  /** A design cap on the menu's height (e.g. the symbol list's 460px). */
  readonly cap?: number;
  /** Space between the trigger and the menu. */
  readonly gap?: number;
  readonly gutter?: number;
}

export interface AnchoredMenuPlacement {
  readonly side: "below" | "above";
  /** CSS `top` when the menu opens below; undefined when it opens above. */
  readonly top?: number;
  /** CSS `bottom` when the menu opens above (it grows upward from the trigger). */
  readonly bottom?: number;
  /** Never taller than the room on its side: whatever does not fit scrolls. */
  readonly maxHeight: number;
}

/**
 * Below the trigger when the whole menu fits there; above when it fits there
 * instead; otherwise on the roomier side, capped to that room, with the rest
 * reached by scrolling inside the menu. Never past the viewport's edge.
 */
export function placeAnchoredMenu(input: AnchoredMenuInput): AnchoredMenuPlacement {
  const gap = finite(input.gap) ? input.gap : 4;
  const gutter = finite(input.gutter) ? input.gutter : POPOVER_VIEWPORT_GUTTER_PX;
  const vh = finite(input.viewportHeight) && input.viewportHeight > 0 ? input.viewportHeight : 0;
  const cap = finite(input.cap) && input.cap > 0 ? input.cap : Infinity;
  const aTop = finite(input.anchor.top) ? input.anchor.top : 0;
  const aBottom = finite(input.anchor.bottom) ? input.anchor.bottom : aTop;

  const roomBelow = Math.max(0, vh - gutter - (aBottom + gap));
  const roomAbove = Math.max(0, aTop - gap - gutter);
  const need = finite(input.menuHeight) && input.menuHeight > 0 ? Math.min(input.menuHeight, cap) : null;

  const below = (): AnchoredMenuPlacement => ({
    side: "below",
    top: Math.round(Math.min(aBottom + gap, Math.max(gutter, vh - gutter))),
    maxHeight: Math.floor(Math.min(cap, roomBelow)),
  });
  const above = (): AnchoredMenuPlacement => ({
    side: "above",
    bottom: Math.round(Math.max(gutter, vh - (aTop - gap))),
    maxHeight: Math.floor(Math.min(cap, roomAbove)),
  });

  if (need != null && need <= roomBelow) return below();
  // Otherwise the roomier side. A menu that fits above but not below is
  // already on it (roomAbove >= need > roomBelow); one that fits on neither
  // is capped to the larger room and scrolls inside.
  return roomBelow >= roomAbove ? below() : above();
}

// ── 2. A panel that opens beside a group of controls ──────────────────────

export type BesidePanelSide = "right" | "left" | "below" | "above" | "overlap";

export interface BesidePanelInput {
  readonly viewport: { readonly width: number; readonly height: number };
  /** The control that summoned the panel: the panel lines up with it. */
  readonly anchor: ViewportRect;
  /** The controls the panel must not cover (the rail, or the sheet's tool group). */
  readonly avoid: ViewportRect;
  /** The panel's own outer size. */
  readonly panel: { readonly width: number; readonly height: number };
  readonly gap?: number;
  readonly gutter?: number;
}

export interface BesidePanelPlacement {
  readonly side: BesidePanelSide;
  readonly left: number;
  readonly top: number;
  /** The panel scrolls inside itself beyond this; it never runs off-screen. */
  readonly maxHeight: number;
}

/**
 * Right of the controls, else left of them, else below, else above — the
 * first side where the whole panel fits inside the viewport without touching
 * the `avoid` rectangle. Level with the anchor on the left/right sides, under
 * or over it on the others. Only when no side has room (a viewport smaller
 * than controls + panel) does it overlap, and then it is still clamped inside
 * the viewport with its height capped.
 */
export function placePanelBeside(input: BesidePanelInput): BesidePanelPlacement {
  const gap = finite(input.gap) ? input.gap : 6;
  const g = finite(input.gutter) ? input.gutter : POPOVER_VIEWPORT_GUTTER_PX;
  const vw = Math.max(0, input.viewport.width);
  const vh = Math.max(0, input.viewport.height);
  const w = Math.max(0, input.panel.width);
  const h = Math.max(0, input.panel.height);
  const { anchor, avoid } = input;
  const fullHeight = Math.max(0, vh - 2 * g);

  const levelTop = () => (h <= fullHeight ? clamp(anchor.top, g, vh - g - h) : g);
  const levelLeft = () => clamp(anchor.left, g, vw - g - w);
  const out = (side: BesidePanelSide, left: number, top: number): BesidePanelPlacement => ({
    side, left: Math.round(left), top: Math.round(top),
    maxHeight: Math.floor(Math.max(0, Math.min(h, vh - g - top))),
  });

  const rightLeft = avoid.right + gap;
  if (rightLeft + w <= vw - g) return out("right", rightLeft, levelTop());

  const leftLeft = avoid.left - gap - w;
  if (leftLeft >= g) return out("left", leftLeft, levelTop());

  const belowTop = avoid.bottom + gap;
  if (w <= vw - 2 * g && belowTop + h <= vh - g) return out("below", levelLeft(), belowTop);

  const aboveTop = avoid.top - gap - h;
  if (w <= vw - 2 * g && aboveTop >= g) return out("above", levelLeft(), aboveTop);

  // No side has room: stay on screen, as low as the panel's height allows.
  const top = h <= fullHeight ? vh - g - h : g;
  return { side: "overlap", left: Math.round(levelLeft()), top: Math.round(top), maxHeight: Math.floor(fullHeight) };
}

/** Whether two viewport rectangles share any pixel. */
export function rectsOverlap(a: ViewportRect, b: ViewportRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// ── 3. The components' own wiring, as pure functions (Garden 16 §65) ──────
//
// The arithmetic above was tested; the components' USE of it was pinned only
// by reading their source. These two carry the exact style each component
// paints, so "opens upward at the drawer's foot" and "is ever shown at all"
// are asserted as values.

export interface FixedMenuStyle {
  readonly position: "fixed";
  readonly top?: number;
  readonly bottom?: number;
  readonly maxHeight: number;
  readonly overflowY: "auto";
  readonly right: number;
}

/**
 * The Chart tools ("More chart tools") menu in ChartToolbar: right-aligned
 * under its trigger's right edge, on the side `placeAnchoredMenu` picks,
 * capped to that side's room and scrolling inside. A trigger not yet laid
 * out (null rect) is treated as the old top-of-screen default.
 */
export function placeChartToolsMenu(input: {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly trigger: ViewportRect | null | undefined;
  readonly menuHeight: number | null;
}): { readonly side: AnchoredMenuPlacement["side"]; readonly style: FixedMenuStyle } {
  const t = input.trigger;
  const place = placeAnchoredMenu({
    viewportHeight: input.viewport.height,
    anchor: { top: t?.top ?? 0, bottom: t?.bottom ?? 36 },
    menuHeight: input.menuHeight,
  });
  return {
    side: place.side,
    style: {
      position: "fixed",
      top: place.top,
      bottom: place.bottom,
      maxHeight: place.maxHeight,
      overflowY: "auto",
      right: Math.max(POPOVER_VIEWPORT_GUTTER_PX, input.viewport.width - (t?.right ?? input.viewport.width)),
    },
  };
}

export type StylePopoverPosition =
  | { readonly left: number; readonly top: number; readonly maxHeight: number; readonly overflowY: "auto" }
  | { readonly left: 0; readonly top: 0; readonly visibility: "hidden" }
  | { readonly left: number; readonly top: number };

/**
 * Where DrawingStylePopover sits and whether it is painted. With `beside`
 * (the summoning control + the group to keep off): hidden until it has
 * measured its own height, then placed by `placePanelBeside` and shown.
 * Without it: the legacy fixed anchor, shown at once.
 */
export function positionStylePopover(input: {
  readonly viewport: { readonly width: number; readonly height: number } | null;
  readonly anchor: { readonly left: number; readonly top: number };
  readonly beside: { readonly anchor: ViewportRect; readonly avoid: ViewportRect } | null | undefined;
  readonly panelWidth: number;
  readonly measuredHeight: number | null;
}): { readonly side: BesidePanelSide | undefined; readonly style: StylePopoverPosition } {
  if (!input.beside) return { side: undefined, style: { left: input.anchor.left, top: input.anchor.top } };
  if (input.measuredHeight == null || input.viewport == null) {
    // Laid out but not painted, so it never flashes over the controls it is
    // about to step off.
    return { side: undefined, style: { left: 0, top: 0, visibility: "hidden" } };
  }
  const placed = placePanelBeside({
    viewport: input.viewport,
    anchor: input.beside.anchor,
    avoid: input.beside.avoid,
    panel: { width: input.panelWidth, height: input.measuredHeight },
  });
  return {
    side: placed.side,
    style: { left: placed.left, top: placed.top, maxHeight: placed.maxHeight, overflowY: "auto" },
  };
}

/**
 * What the drawing sidebar hands the popover: the summoning control, and the
 * whole tool group (the rail, or the `wm-draw-sheet` drawer) as the rectangle
 * to keep off. With no group rect — the root's ref detached — it falls back
 * to the control alone, which is exactly how the popover landed on nine of
 * the sheet's buttons; the sidebar sentinel pins the ref for that reason.
 */
export function styleBesideFor(
  control: ViewportRect,
  group: ViewportRect | null | undefined,
): { anchor: ViewportRect; avoid: ViewportRect } {
  const g = group ?? control;
  return {
    anchor: { left: control.left, top: control.top, right: control.right, bottom: control.bottom },
    avoid: { left: g.left, top: g.top, right: g.right, bottom: g.bottom },
  };
}
