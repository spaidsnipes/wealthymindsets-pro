/**
 * THE WORD REGISTRY — one owner for every word on the chart glass.
 *
 * Serving all-on at 390 and 834 (92895d6, 2026-10-09): each painter that had
 * been taught the keep-out was clean, and the glass still failed — the lens
 * question, the TAPE REGIME line and the folded silence line shared one row;
 * SUPPORT · BROKEN and the WAIT plaque sat across the newest candles; note
 * anchors landed on lens words. Fixing them painter by painter leaves the next
 * painter free to do it again. So the rule moves to the ONE place no painter
 * can avoid: the context's own `fillText`.
 *
 * `installWordGate(ctx)` wraps `ctx.fillText` once. Every word is boxed
 * (measured width × font size, in CSS pixels, transform-corrected) and CLAIMS
 * its rect from the frame's registry before it paints:
 *
 *   PAINT        the rect is free — it is registered, the word paints
 *   HELD_COLUMN  the rect touches the newest candles' column — at every width
 *   HELD_WORD    the rect covers > 25% of a word already on the glass
 *
 * A held word is never silently dropped: `onHeld` receives it (the room folds
 * it into the §16 note composer, or counts it as withheld with a receipt).
 *
 * MODES. `OBSERVE` registers and reports but paints everything — the gate's
 * verdicts are a receipt, nothing on the glass changes. `ENFORCE` withholds.
 * The room ENFORCES by default (flipped 2026-10-09 after the verdicts were read
 * on serving at six sizes); `gate=observe` on the address observes instead.
 *
 * NOT WORDS (pass through, never registered): text under 3 characters (glyphs,
 * "×5"), ink at or under 0.15 alpha, rotated text, and anything painted inside
 * `gate.sovereign(…)` — the allow-list for the axis and the price scale.
 * The same text at the same place twice (a halo, then its fill) is one word.
 */

export interface WordRect { readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export type WordVerdict = "PAINT" | "HELD_COLUMN" | "HELD_WORD" | "HELD_PRIORITY";
/**
 * PRIORITY (coordinator ruling 2026-10-09). TRUTH lines — a named silence, a
 * WITHHELD, a CONTRADICTION, "N SENSES SILENT", data-quality words — are never
 * held and never folded into the note list: they claim their band first.
 * PRIMARY is the asked question's own words (the answer). Everything else is
 * OTHER. A lower word yields to a higher one; never the reverse.
 */
export type WordTier = "TRUTH" | "PRIMARY" | "OTHER";
const RANK: Readonly<Record<WordTier, number>> = { TRUTH: 3, PRIMARY: 2, OTHER: 1 };
export interface ReservedWord { readonly text: string; readonly rect: WordRect; readonly tier: WordTier }

/**
 * Is this text a truth line? One classifier, here, so no painter decides for
 * itself. These are the words that say what the glass does NOT know or is NOT
 * showing — the ones a trader must never lose to decoration.
 */
// The SECOND net. The first is declaration: the silence stack's one function
// (and any painter of provenance) DECLARES its line as truth through the gate,
// so truth no longer depends on wording (enforce audit, serving b94f28c,
// 2026-10-09: "LIQUIDITY LIFECYCLE · ACTIVE · NO POOL IN VIEW", "FOUNDER ANATOMY ·
// ACTIVE · NO CURRENT ABSORPTION / EXHAUSTION EVENT", "RISK ON PRICE · no position
// drawn" and the envelope's "n=10 · prior sessions" caption were held and listed
// because this list did not know their words).
const TRUTH_WORDS = /\b(SILENT|SILENCE|WITHHELD|CONTRADICTION|UNAVAILABLE|UNSUPPORTED|UNMEASURED|UNRESOLVED|STALE|DELAYED|DEGRADED|NOT ENOUGH|NOT ASKABLE|NO TAPE|NO DATA|NO BAR|NO VOLUME|NO CURRENT|NO READING|NO POOL|NO POSITION|NO PRIOR|REFUSED|WAITING FOR|TAPE REQUIRED|CANDLE-ESTIMATED|ESTIMATED|PARTIAL|DATA GAP|BARS BEHIND|PROOF SCENE|SAMPLE|BAR TOTALS ONLY|CARRY NONE|NEEDS \d|ACTIVE · NO|PRIOR SESSIONS)\b|\bn=\d/i;
export function isTruthLine(text: string): boolean {
  return TRUTH_WORDS.test(text);
}
export type WordGateMode = "OBSERVE" | "ENFORCE";
export interface HeldWord { readonly text: string; readonly rect: WordRect; readonly verdict: Exclude<WordVerdict, "PAINT">; readonly against: string; readonly tier?: WordTier }

/** A later word may cover at most this share of the smaller of the two boxes. */
export const WORD_OVERLAP_MAX = 0.25;
/** Text shorter than this is a glyph, not a word. */
export const WORD_MIN_CHARS = 3;
/** Under the enforced column rule a two-character mark is judged too. */
export const COLUMN_MIN_CHARS = 2;
/** Ink at or under this alpha is texture, not a word. */
export const WORD_MIN_ALPHA = 0.15;

const area = (r: WordRect) => Math.max(0, r.w) * Math.max(0, r.h);
const cut = (a: WordRect, b: WordRect) => {
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ix > 0 && iy > 0 ? ix * iy : 0;
};

/** A word this much inside a panel is one of the panel's rows. */
export const PANEL_ROW_INSIDE = 0.6;

export interface WordRegistry {
  /** Ask for a rect. PAINT registers it. `tier` defaults to TRUTH for a truth line, else OTHER. */
  claim(text: string, rect: WordRect, tier?: WordTier): { verdict: WordVerdict; against: string };
  /** This frame's TRUTH and PRIMARY words — the next frame's reservations. */
  reservations(): readonly ReservedWord[];
  readonly truthWords: number;
  /**
   * A chip or card asks for its BOX before it draws the backing. PAINT → the
   * box is registered and the rows inside it paint without asking again; held →
   * the rows inside it are held with it, so no word is left without its box and
   * no box without its word.
   */
  claimPanel(label: string, rect: WordRect, tier?: WordTier, rows?: boolean): { verdict: WordVerdict; against: string };
  /**
   * A box that is MEANT to sit on top (the crosshair's words, Inspect and
   * selection words, an opaque card's rows). Never judged, never held; its rows
   * paint. `reason` is kept for the receipt.
   */
  sovereignPanel(rect: WordRect, reason: string): void;
  readonly sovereignReasons: readonly string[];
  /** Is this rect inside a box that is meant to sit on top? */
  isSovereign(rect: WordRect): boolean;
  /** The newest candles' column — a blocker at every width. `null` = none this frame. */
  setColumn(rect: WordRect | null): void;
  /** Every registered word's rect, for a placer that wants to step around them (note anchors). */
  rects(): readonly WordRect[];
  readonly words: number;
  readonly held: readonly HeldWord[];
}

/**
 * `reserved` = the TRUTH and PRIMARY words of the PREVIOUS frame. Truth lines
 * are painted late (they have a fixed home at the foot of the glass), so "truth
 * claims its band first" is kept by memory: a lower word that would cover a
 * band a higher word held last frame yields before the higher word even asks.
 * One frame of lag in, none out (the reservation is rebuilt every frame).
 */
export function createWordRegistry(reserved: readonly ReservedWord[] = []): WordRegistry {
  const placed: { text: string; rect: WordRect; tier: WordTier }[] = [];
  const held: HeldWord[] = [];
  const panels: WordRect[] = [];
  const heldPanels: HeldWord[] = [];
  const sovereign: WordRect[] = [];
  const sovereignReasons: string[] = [];
  let column: WordRect | null = null;
  const inside = (rect: WordRect, box: WordRect) => cut(rect, box) / Math.max(1, area(rect)) >= PANEL_ROW_INSIDE;
  const same = (a: WordRect, b: WordRect) => cut(a, b) / Math.max(1, Math.min(area(a), area(b))) > 0.5;
  const judge = (text: string, rect: WordRect, tierIn?: WordTier): { verdict: WordVerdict; against: string } => {
      const tier: WordTier = tierIn ?? (isTruthLine(text) ? "TRUTH" : "OTHER");
      // TRUTH IS NEVER HELD — not by a word, a panel, the column or a reservation.
      if (tier === "TRUTH") {
        if (!placed.some(p => p.text === text && same(rect, p.rect))) placed.push({ text, rect, tier });
        return { verdict: "PAINT", against: "" };
      }
      if (sovereign.some(z => inside(rect, z))) return { verdict: "PAINT", against: "" };
      // A row of a panel shares the panel's verdict.
      for (const h of heldPanels) if (inside(rect, h.rect)) return { verdict: h.verdict, against: h.against };
      if (panels.some(b => inside(rect, b))) return { verdict: "PAINT", against: "" };
      // The same word asking again (a halo then its fill; a chip's box then its text).
      for (const p of placed) {
        if (p.text === text && cut(rect, p.rect) / Math.max(1, Math.min(area(rect), area(p.rect))) > 0.5) return { verdict: "PAINT", against: "" };
      }
      for (const h of held) {
        if (h.text === text && cut(rect, h.rect) / Math.max(1, Math.min(area(rect), area(h.rect))) > 0.5) return { verdict: h.verdict, against: h.against };
      }
      if (column && cut(rect, column) > 4) {
        held.push({ text, rect, verdict: "HELD_COLUMN", against: "NEWEST_COLUMN" });
        return { verdict: "HELD_COLUMN", against: "NEWEST_COLUMN" };
      }
      const a = area(rect);
      // A band a HIGHER word held last frame is already taken (truth first).
      for (const r of reserved) {
        if (RANK[r.tier] <= RANK[tier] || r.text === text) continue;
        const c = cut(rect, r.rect);
        if (c > 0 && c / Math.max(1, Math.min(a, area(r.rect))) > WORD_OVERLAP_MAX) {
          held.push({ text, rect, verdict: "HELD_PRIORITY", against: r.text, tier });
          return { verdict: "HELD_PRIORITY", against: r.text };
        }
      }
      for (const p of placed) {
        // A higher word never yields to a lower one already on the glass.
        if (RANK[p.tier] < RANK[tier]) continue;
        const c = cut(rect, p.rect);
        if (c > 0 && c / Math.max(1, Math.min(a, area(p.rect))) > WORD_OVERLAP_MAX) {
          held.push({ text, rect, verdict: "HELD_WORD", against: p.text, tier });
          return { verdict: "HELD_WORD", against: p.text };
        }
      }
      placed.push({ text, rect, tier });
      return { verdict: "PAINT", against: "" };
  };
  return {
    claim: judge,
    reservations: () => placed.filter(p => p.tier !== "OTHER").map(p => ({ text: p.text, rect: p.rect, tier: p.tier })),
    get truthWords() { return placed.filter(p => p.tier === "TRUTH").length; },
    claimPanel(label, rect, tier, rows = false) {
      const before = held.length;
      // A chip's box is judged exactly like its word (same text, same place —
      // the word that follows is recognised as the same claim). It is NOT a
      // free pass for whatever is painted inside it later: on serving 834
      // (enforce, c9303a7) "MID" and "WAIT" painted over OI chips because any
      // word mostly inside a painted box was taken for one of its rows. Only a
      // box declared with `rows` (a multi-line card) owns the rows inside it.
      const v = judge(label, rect, tier);
      if (rows) {
        if (v.verdict === "PAINT") panels.push(rect);
        else if (held.length > before) heldPanels.push(held[held.length - 1]);
        else heldPanels.push({ text: label, rect, verdict: v.verdict, against: v.against });
      }
      return v;
    },
    sovereignPanel(rect, reason) { sovereign.push(rect); if (!sovereignReasons.includes(reason)) sovereignReasons.push(reason); },
    sovereignReasons,
    isSovereign: rect => sovereign.some(z => inside(rect, z)),
    setColumn(rect) { column = rect; },
    rects: () => placed.map(p => p.rect),
    get words() { return placed.length; },
    held,
  };
}

type GateCtx = Pick<CanvasRenderingContext2D, "fillText" | "strokeText" | "measureText" | "getTransform" | "font" | "textAlign" | "textBaseline" | "globalAlpha">;

export interface WordGate {
  /** A new frame: an empty registry, the mode, and where held words go. */
  beginFrame(opts: { mode: WordGateMode; dpr: number; column?: WordRect | null; onHeld?: (w: HeldWord) => void }): void;
  setColumn(rect: WordRect | null): void;
  /** The allow-list: axis and price-scale text paints as-is and is not registered. */
  sovereign<T>(paint: () => T): T;
  /** A chip / card asks for its box BEFORE drawing the backing. False = draw nothing (ENFORCE only). */
  panel(label: string, rect: WordRect): boolean;
  /**
   * PRICE SOVEREIGNTY (narrow glass): enforce the COLUMN rule alone — a word or
   * a two-character mark that touches the newest candles' column (widened to
   * the left by `padLeft` px) is withheld and handed to `onHeld`, even while
   * the registry's mode is OBSERVE. Truth lines and sovereign boxes are exempt
   * as always. Reset to off every frame.
   */
  setColumnRule(opts: { enforce: boolean; padLeft?: number }): void;
  /** How many words / marks the enforced column rule withheld this frame. */
  columnHeld(): number;
  /** The asked question's own words paint as PRIMARY between setTier("PRIMARY") and setTier("OTHER"). Reset every frame. */
  setTier(tier: Exclude<WordTier, "TRUTH">): void;
  /**
   * The owner of a line DECLARES it truth before painting it (the silence
   * stack's one function; a provenance caption). A declared line is never held,
   * whatever its wording. Per frame.
   */
  declareTruth(text: string): void;
  /** Declared this frame, or truth by wording. */
  isTruth(text: string): boolean;
  /** `TRUTH:n|TRUTH_HELD:0|DECLARED:d|YIELDED_TO_HIGHER:k` — TRUTH_HELD must always read 0. */
  truthReceipt(): string;
  /** Words meant to sit on top (crosshair, Inspect / selection, an opaque card): never judged. One-line reason required. */
  sovereignPanel(rect: WordRect, reason: string): void;
  rects(): readonly WordRect[];
  /** `MODE|WORDS:n|HELD:k|COLUMN:c` */
  receipt(): string;
  /** The first few held words, for the proof file. */
  heldSample(max?: number): string;
}

const GATES = new WeakMap<object, WordGate>();

/** Box a text call in CSS pixels. `null` = not a word the registry judges. */
export function wordBox(ctx: GateCtx, text: string, x: number, y: number, dpr: number, minChars: number = WORD_MIN_CHARS): WordRect | null {
  if (text.trim().length < minChars || ctx.globalAlpha <= WORD_MIN_ALPHA) return null;
  const tr = ctx.getTransform();
  if (Math.abs(tr.b) > 1e-6 || Math.abs(tr.c) > 1e-6) return null;
  const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
  const fs = m ? Number(m[1]) : 10;
  const w = ctx.measureText(text).width;
  let x0 = x;
  if (ctx.textAlign === "center") x0 = x - w / 2;
  else if (ctx.textAlign === "right" || ctx.textAlign === "end") x0 = x - w;
  let y0 = y - fs * 0.8;
  if (ctx.textBaseline === "top" || ctx.textBaseline === "hanging") y0 = y;
  else if (ctx.textBaseline === "middle") y0 = y - fs / 2;
  else if (ctx.textBaseline === "bottom" || ctx.textBaseline === "ideographic") y0 = y - fs;
  const k = dpr > 0 ? dpr : 1;
  const rect = { x: (tr.a * x0 + tr.e) / k, y: (tr.d * y0 + tr.f) / k, w: (w * tr.a) / k, h: (fs * tr.d) / k };
  return rect.w < 4 || rect.h < 4 ? null : rect;
}

/** Wrap `ctx.fillText` once (idempotent). The gate does nothing until `beginFrame`. */
export function installWordGate(ctx: GateCtx): WordGate {
  const have = GATES.get(ctx);
  if (have) return have;
  const raw = ctx.fillText;
  const rawStroke = ctx.strokeText;
  let registry = createWordRegistry();
  let mode: WordGateMode = "OBSERVE";
  let dpr = 1;
  let onHeld: ((w: HeldWord) => void) | undefined;
  let sovereignDepth = 0;
  let live = false;
  let scopeTier: WordTier = "OTHER";
  // PRICE SOVEREIGNTY ON NARROW GLASS: the column rule alone may be enforced
  // while the rest of the registry still only observes.
  let columnEnforce = false;
  let columnPadLeft = 0;
  let columnRect: WordRect | null = null;
  let columnHeld = 0;
  const padded = (r: WordRect | null): WordRect | null => (r && columnPadLeft > 0 ? { x: r.x - columnPadLeft, y: r.y, w: r.w + columnPadLeft, h: r.h } : r);
  // Lines DECLARED truth this frame by their owner (the silence stack, a
  // provenance caption). Declaration beats wording; rebuilt every frame.
  let declared = new Set<string>();
  let declaredHeld = 0;
  const isTruth = (text: string): boolean => declared.has(text) || isTruthLine(text);
  const tierOf = (text: string): WordTier => (isTruth(text) ? "TRUTH" : scopeTier);
  const gated = (fn: CanvasRenderingContext2D["fillText"]) => function gatedText(this: GateCtx, text: string, x: number, y: number, maxWidth?: number) {
    const paint = () => (maxWidth === undefined ? fn.call(this as CanvasRenderingContext2D, text, x, y) : fn.call(this as CanvasRenderingContext2D, text, x, y, maxWidth));
    if (!live || sovereignDepth > 0) return paint();
    let rect: WordRect | null = null;
    try { rect = wordBox(this, String(text), x, y, dpr, columnEnforce ? COLUMN_MIN_CHARS : WORD_MIN_CHARS); } catch { rect = null; }
    if (!rect) return paint();
    // A two-character mark ("LH", "HL") is judged by the column rule only.
    if (String(text).trim().length < WORD_MIN_CHARS) {
      const col = padded(columnRect);
      if (col && !isTruth(String(text)) && !registry.isSovereign(rect) && rect.x < col.x + col.w && rect.x + rect.w > col.x && rect.y < col.y + col.h && rect.y + rect.h > col.y) { columnHeld++; return; }
      return paint();
    }
    const before = registry.held.length;
    const { verdict } = registry.claim(String(text), rect, tierOf(String(text)));
    if (verdict !== "PAINT" && registry.held.length > before) {
      try { onHeld?.(registry.held[registry.held.length - 1]); } catch { /* a receipt must never stop the frame */ }
    }
    if (verdict === "HELD_COLUMN" && columnEnforce) { columnHeld++; return; }
    if (verdict === "PAINT" || mode === "OBSERVE") return paint();
  } as CanvasRenderingContext2D["fillText"];
  // A word's halo (strokeText) is the word: it asks the same registry, so a
  // withheld word never leaves its outline behind.
  ctx.fillText = gated(raw);
  ctx.strokeText = gated(rawStroke);
  const gate: WordGate = {
    beginFrame(o) {
      // Truth claims its band first: last frame's TRUTH and PRIMARY words are
      // this frame's reservations (rebuilt every frame — nothing lingers).
      registry = createWordRegistry(live ? registry.reservations() : []);
      scopeTier = "OTHER";
      columnEnforce = false; columnPadLeft = 0; columnHeld = 0; columnRect = o.column ?? null;
      declared = new Set<string>(); declaredHeld = 0;
      registry.setColumn(o.column ?? null);
      mode = o.mode; dpr = o.dpr; onHeld = o.onHeld; sovereignDepth = 0; live = true;
    },
    setColumn: rect => { columnRect = rect; registry.setColumn(padded(rect)); },
    setColumnRule(o) { columnEnforce = o.enforce; columnPadLeft = o.enforce ? Math.max(0, o.padLeft ?? 0) : 0; registry.setColumn(padded(columnRect)); },
    columnHeld: () => columnHeld,
    sovereign(p) { sovereignDepth++; try { return p(); } finally { sovereignDepth--; } },
    panel(label, rect) {
      if (!live) return true;
      const before = registry.held.length;
      const { verdict } = registry.claimPanel(label, rect, tierOf(label));
      if (verdict !== "PAINT" && registry.held.length > before) {
        try { onHeld?.(registry.held[registry.held.length - 1]); } catch { /* a receipt must never stop the frame */ }
      }
      if (verdict === "HELD_COLUMN" && columnEnforce) { columnHeld++; return false; }
      return verdict === "PAINT" || mode === "OBSERVE";
    },
    sovereignPanel(rect, reason) { if (live) registry.sovereignPanel(rect, reason); },
    setTier(t) { scopeTier = t; },
    declareTruth(text) { if (live && text) declared.add(text); },
    isTruth,
    // TRUTH_HELD counts every held word that is truth by DECLARATION or by wording
    // — a line declared after it was held is counted too, so the receipt cannot
    // read 0 while a silence line sits in the note list.
    truthReceipt: () => `TRUTH:${registry.truthWords}|TRUTH_HELD:${registry.held.filter(h => h.tier === "TRUTH" || isTruth(h.text)).length + declaredHeld}|DECLARED:${declared.size}|YIELDED_TO_HIGHER:${registry.held.filter(h => h.verdict === "HELD_PRIORITY").length}`,
    rects: () => registry.rects(),
    receipt: () => `${mode}|WORDS:${registry.words}|HELD:${registry.held.length}|COLUMN:${registry.held.filter(h => h.verdict === "HELD_COLUMN").length}${registry.sovereignReasons.length ? `|SOVEREIGN:${registry.sovereignReasons.join("+")}` : ""}`,
    heldSample: (max = 6) => registry.held.slice(0, max).map(h => `${h.verdict === "HELD_COLUMN" ? "COL" : h.verdict === "HELD_PRIORITY" ? "YIELD" : "WORD"}:${h.text.slice(0, 28)}`).join("|"),
  };
  GATES.set(ctx, gate);
  return gate;
}

/** `gate=enforce` on the address turns withholding on for this page load. */
/**
 * THE FLIP (coordinator ruling 2026-10-09 evening, after two enforce audits on
 * serving — c9303a7 and b72f896: truth lines in the note list 0 at every size
 * read, the asked question's words paint, selections keep their words). The
 * registry now ENFORCES by default. `gate=observe` on the address is the way
 * back for one page load: it paints everything and only reports.
 */
export const WORD_GATE_DEFAULT_MODE: WordGateMode = "ENFORCE";
export function wordGateModeFor(search: string): WordGateMode {
  try {
    const g = new URLSearchParams(search).get("gate");
    return g === "observe" ? "OBSERVE" : g === "enforce" ? "ENFORCE" : WORD_GATE_DEFAULT_MODE;
  } catch { return WORD_GATE_DEFAULT_MODE; }
}
