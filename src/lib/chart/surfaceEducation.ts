/**
 * SURFACE ⓘ RECORDS — Garden 19 §9 / §10, the surfaces the first registry
 * pass left without education (Sheriff batch 3 #2, #13–#15; cert §15a).
 *
 *   SM:<card name>        Smart Money panel cards (29 rows, incl. the two
 *                         bias-named variants). Written from `generateSignals`
 *                         and `readTapeSide`: what each card measures, what it
 *                         cannot measure on this feed, and nothing about what
 *                         to do.
 *   DRAW:<tool id>        Drawing tools — every id in the `DrawingTool` union
 *                         (the rail's 17 and the full panel). Trader-drawn:
 *                         the evidence is the trader's own points.
 *   VIEW:<tab>            The Views sheet (Chart, Absorption, … Profile).
 *   LOADOUT:<id>          Camera loadouts (Scalp / Trend / Sniper / Review).
 *   REPLAY                Workspace → Replay.
 *   BAR_SELECTION         First touch for a bar selected from the Wisdom
 *                         line, the Delta keel or Effort → Response.
 *
 * Same shape as every other record (`InventionEducation` + `what`), read by
 * `educationFor`, so the same preview and the same banned-phrase scan apply.
 */
import type { EvidenceNeed, InventionEducation } from "@/lib/chart/inventionEducation";

export interface SurfaceEducation extends InventionEducation {
  readonly what: string;
}

type Spec = {
  what: string; q: string; needs: EvidenceNeed; evidence: string; appears: string; read: string;
  full: string; partial: string; degraded: string; touch?: string; canon: string;
};
const rec = (s: Spec): SurfaceEducation => ({
  what: s.what, question: s.q, needs: s.needs, evidence: s.evidence, appears: s.appears, grammar: s.read,
  full: s.full, partial: s.partial, degraded: s.degraded, firstTouch: s.touch ?? s.what, canon: s.canon,
});

/* ── Smart Money cards ─────────────────────────────────────────────────── */

const TAPE_FULL = "Every print in the window carries a stated aggressor side.";
const TAPE_PARTIAL = "Sides are inferred (quote test or tick rule) and only the bars since the tape arrived are counted.";
const TAPE_DEGRADED = "No signed tape on this feed — the card reads N/A rather than guessing a side from candle colour.";
const SM_CANON = "Smart Money panel · one tape verdict (readTapeSide)";

function tapeCard(name: string, what: string, q: string, appears: string, read: string): SurfaceEducation {
  return rec({
    what, q, needs: "SIDED_TAPE", evidence: "Per-trade prints that state which side crossed the spread, over the panel's tape window.",
    appears, read, full: TAPE_FULL, partial: TAPE_PARTIAL, degraded: TAPE_DEGRADED, canon: SM_CANON,
    touch: `${name} — ${what.charAt(0).toLowerCase()}${what.slice(1)}`,
  });
}

/** A card this product cannot measure from any feed it has — the card says so, every time. */
function notMeasured(name: string, what: string, q: string, needsWords: string): SurfaceEducation {
  return rec({
    what: `${what} — not measured on any feed this product has`,
    q, needs: "PRINTS",
    evidence: `${needsWords}. Time-and-sales and bars cannot supply it, so the card never shows a number.`,
    appears: `Listed under "Not measured on this feed" with the reason. No value, no arrow, no colour.`,
    read: "Read it as an honest blank: the question is a real one, and this feed cannot answer it. Nothing is inferred in its place.",
    full: "Not reachable on this product's feeds.",
    partial: "Not reachable on this product's feeds.",
    degraded: `Always — ${needsWords.charAt(0).toLowerCase()}${needsWords.slice(1)} is not carried by any connected source.`,
    canon: SM_CANON,
  });
}

export const SMART_MONEY_EDUCATION: Readonly<Record<string, SurfaceEducation>> = {
  VWAP: rec({
    what: "Where the last price sits relative to the session volume-weighted average price",
    q: "Is price above or below this session's volume-weighted average?",
    needs: "VOLUME", evidence: "Traded volume on the session's bars (the chart's own session VWAP).",
    appears: "The VWAP value with an up or down arrow for above / below.",
    read: "Above means the last price is higher than the volume-weighted average paid this session so far; below, lower. It is a location, not a lean.",
    full: "Session bars carry traded volume.", partial: "Some bars report zero volume — VWAP leans on the bars that do.", degraded: "No central volume (spot FX) — the number shown is the typical price, not a VWAP.",
    canon: SM_CANON,
  }),
  "VWAP Upper Band": rec({
    what: "Session VWAP × 1.004 — a fixed 0.4% line above it",
    q: "Is price under a line 0.4% above the session VWAP?",
    needs: "VOLUME", evidence: "The session VWAP.",
    appears: "A value with an arrow when price is below it.",
    read: "This band is a fixed percentage, not a standard deviation — the chart's VWAP Bands indicator uses σ. The two will not agree.",
    full: "Session bars carry traded volume.", partial: "Some bars report zero volume.", degraded: "No central volume — no VWAP to band.",
    canon: SM_CANON,
  }),
  "VWAP Lower Band": rec({
    what: "Session VWAP × 0.996 — a fixed 0.4% line below it",
    q: "Is price over a line 0.4% below the session VWAP?",
    needs: "VOLUME", evidence: "The session VWAP.",
    appears: "A value with an arrow when price is above it.",
    read: "A fixed percentage band, not a σ band. It describes a distance only.",
    full: "Session bars carry traded volume.", partial: "Some bars report zero volume.", degraded: "No central volume — no VWAP to band.",
    canon: SM_CANON,
  }),
  "Order Flow Imbalance": tapeCard("Order Flow Imbalance",
    "Ratio of the dominant aggressor side's volume to the other side's, in the tape window",
    "By how much did one side out-trade the other at the spread?",
    "A ratio (or ONE-SIDED when there is no opposing volume) and the side that was heavier, with the tape verdict's sentence.",
    "160% means the heavier side traded 1.6× the lighter. A side is named only when it took 55% or more; under that the card reads balanced."),
  "Aggressive Buyers vs Sellers": tapeCard("Aggressive Buyers vs Sellers",
    "Market-order volume that lifted the offer against volume that hit the bid",
    "How much aggressive volume did each side put through in this window?",
    "Two totals, Buyers and Sellers, and the side that took 55% or more.",
    "The counts are observed prints by side. Who placed them is not known."),
  Absorption: notMeasured("Absorption", "Aggressors being soaked up by resting size",
    "Did resting orders absorb the aggressive volume at a price?", "Bid / ask fill data from the book"),
  "Volume Tails": notMeasured("Volume Tails", "Volume traded in a bar's wicks",
    "How much traded in the wick of the bar?", "Per-price footprint volume from the feed"),
  "Accumulation / Distribution": tapeCard("Accumulation / Distribution",
    "Which side took the larger share of aggressive volume over the tape window",
    "Over the whole window, did buyers or sellers cross the spread more?",
    "Buyers / Sellers took the larger share, or Balanced, with the shared tape sentence.",
    "A share of observed aggressive volume — the same verdict as every other tape card. It is not a Wyckoff phase."),
  "PDH / PDL Support": notMeasured("PDH / PDL Support", "Prior-session high and low as levels",
    "Where were the prior session's high and low?", "A prior-session level feed into this panel (the chart's Prior Day High/Low indicator draws them from bars; this panel does not)"),
  "Passive Buyers": notMeasured("Passive Buyers", "Resting bid size", "How much size rests on the bid?", "A Level-2 order-book feed"),
  "Passive Sellers": notMeasured("Passive Sellers", "Resting offer size", "How much size rests on the offer?", "A Level-2 order-book feed"),
  "Spoofing Detection": notMeasured("Spoofing Detection", "Orders placed and pulled before they trade",
    "Were resting orders pulled before they could fill?", "A Level-2 order-book feed with order events"),
  "Stop Run": notMeasured("Stop Run", "A sweep through tracked swing liquidity",
    "Did price sweep a tracked swing level and come back?", "A tracked swing / liquidity map inside this panel"),
  "Trapped Traders": notMeasured("Trapped Traders", "Positions caught on the wrong side",
    "Who is offside at this price?", "Positioning data (order book or open interest)"),
  "Pullback + Demand / Supply": notMeasured("Pullback + Demand / Supply", "A pullback into a validated zone",
    "Is price pulling back into a defined demand or supply zone?", "A validated structure zone model inside this panel"),
  "Delta Divergence": tapeCard("Delta Divergence",
    "Whether the tape's side verdict agrees or disagrees with the candle's direction",
    "Does the side that crossed the spread match the way this candle closed?",
    "\"Agrees\" or \"disagrees\", or \"no side leads\" when the tape is balanced.",
    "A disagreement is an observation about this candle — the tape leaned one way, the close went the other. It is not a turn."),
  "CVD (Cumulative Volume Delta)": tapeCard("CVD (Cumulative Volume Delta)",
    "Running total of aggressive buy volume minus sell volume, with its direction",
    "Since the tape was heard, have buyers or sellers crossed the spread more, and is the total rising or falling?",
    "A signed total and rising / falling.",
    "Rising means the recent prints leaned to the buy side. The level depends on when the tape started; read the slope."),
  "Footprint Pattern": tapeCard("Footprint Pattern",
    "Which side's aggressive volume stacks across the tape window",
    "Across this window, which side stacks up?",
    "Buy-side stacking / Sell-side stacking / No side stacks.",
    "The same tape verdict, worded for stacking. It does not read individual footprint cells."),
  "Iceberg Detection": notMeasured("Iceberg Detection", "Hidden resting size that refills",
    "Is a resting order refilling as it trades?", "A Level-2 depth feed"),
  "Dark Pool Prints": notMeasured("Dark Pool Prints", "Off-exchange prints",
    "What traded away from the lit book?", "A consolidated dark-pool print feed"),
  Regime: rec({
    what: "The tape's side verdict for the window, or price's side of VWAP when there is no tape",
    q: "Which side has the tape leaned to in this window?",
    needs: "SIDED_TAPE", evidence: "Signed prints; without them it falls back to price above / below VWAP and says so.",
    appears: "Buy-side tape / Sell-side tape / Balanced tape, or \"Above / Below VWAP — no tape\".",
    read: "A one-window observation. It is not a market-regime classification and it is not the chart's Regime Lighting.",
    full: TAPE_FULL, partial: TAPE_PARTIAL, degraded: "No signed tape — the card shows price location only and labels it as such.",
    canon: SM_CANON,
  }),
  "Wyckoff Phase": notMeasured("Wyckoff Phase", "A Wyckoff accumulation / distribution phase",
    "Which Wyckoff phase is this?", "A phase model, which this product does not implement"),
  "Wyckoff Schematic": notMeasured("Wyckoff Schematic", "A multi-swing Wyckoff schematic",
    "Does the structure fit a Wyckoff schematic?", "Validated multi-swing structure history inside this panel"),
  "Higher Lows at Demand": notMeasured("Higher Lows at Demand", "Higher swing lows forming at a demand zone",
    "Are swing lows stepping up at demand?", "Tracked swing pivots inside this panel"),
  "Lower Highs at Supply": notMeasured("Lower Highs at Supply", "Lower swing highs forming at a supply zone",
    "Are swing highs stepping down at supply?", "Tracked swing pivots inside this panel"),
  "PDL Setup": notMeasured("PDL Setup", "A setup at the prior day's low",
    "Is price at the prior day's low?", "A prior-session level calculation inside this panel"),
  Context: rec({
    what: "Price above or below the session VWAP",
    q: "Which side of VWAP is price on?",
    needs: "VOLUME", evidence: "The session VWAP.",
    appears: "Above VWAP / Below VWAP with an arrow.",
    read: "Location only. The same fact as the VWAP card, placed in the CLC rule's order.",
    full: "Session bars carry traded volume.", partial: "Some bars report zero volume.", degraded: "No central volume — the line is the typical price, not a VWAP.",
    canon: SM_CANON,
  }),
  Location: notMeasured("Location", "Price relative to a validated structure zone",
    "Is price inside a demand or supply zone?", "A validated structure zone model inside this panel"),
  Confirmation: tapeCard("Confirmation",
    "Which side leads the tape, with the net delta",
    "Does one side lead the tape right now, and by how much delta?",
    "\"Buyers lead the tape (Δ …)\", \"Sellers lead …\", or \"Unresolved — balanced tape\".",
    "Unresolved means neither side took 55%. The word is the panel's; it confirms nothing about a trade."),
  "Entry Signal": rec({
    what: "Not produced — this panel observes the tape and proposes no entries",
    q: "Where would I enter?",
    needs: "YOUR_PLAN", evidence: "Your declared plan and its risk — not a tape reading.",
    appears: "A fixed sentence: entries belong to your plan.",
    read: "The panel will never print a price here. If you expected one, that is the point.",
    full: "Not applicable.", partial: "Not applicable.", degraded: "Not applicable.",
    canon: SM_CANON,
  }),
  "Best Opportunity": rec({
    what: "Not produced — no price-offset risk band is generated",
    q: "What is the best trade here?",
    needs: "YOUR_PLAN", evidence: "Your setup's own risk definition.",
    appears: "A fixed N/A line.",
    read: "No synthetic stop or target is drawn from an offset. Risk on Price (the drawing tool) takes the levels you choose.",
    full: "Not applicable.", partial: "Not applicable.", degraded: "Not applicable.",
    canon: SM_CANON,
  }),
};

/* ── Drawing tools ─────────────────────────────────────────────────────── */

const DRAW_CANON = "Trader-drawn geometry · no market claim";
function draw(what: string, q: string, appears: string, read: string, points = 2): SurfaceEducation {
  return rec({
    what, q, needs: "YOUR_PLAN",
    evidence: points === 0 ? "Nothing from the market — it acts on your existing drawings." : `${points === 1 ? "One point" : points === 3 ? "Three points" : "Two points"} you place on the chart. The market supplies nothing; the shape is yours.`,
    appears, read,
    full: "Drawn exactly where you placed it; it moves with the camera and stays on this symbol and timeframe.",
    partial: "Snap (the magnet) moves a point to the nearest candle price — the drawn level is then a bar's price, not your pointer.",
    degraded: "Drawings are hidden or locked — the shape is kept but not shown or not editable until you switch it back.",
    canon: DRAW_CANON,
  });
}
const fib = (what: string, appears: string) => draw(what, "Where do the Fibonacci ratios of my chosen move fall?", appears,
  "The levels are fixed fractions (0.382, 0.5, 0.618 …) of the distance between your points. They record arithmetic on your two points, not anything the market did.");
const gann = (what: string, appears: string) => draw(what, "How do fixed Gann angles and squares lie over my chosen anchor?", appears,
  "Gann geometry is fixed ratios of price to time from your anchor. It is a template; the market has not been consulted.");
const pattern = (what: string, points: number) => draw(what, "Can I label these pivots as this pattern?", "Labelled pivot points joined by lines.",
  "The labels are yours. The tool draws the shape you name; it does not detect the pattern or grade how well it fits.", points);
const elliott = (what: string, points: number) => draw(what, "Can I label these swings as this wave count?", "Numbered or lettered swing points joined by lines.",
  "A wave count is an interpretation. The tool records yours; it does not check or validate it.", points);
const measure = (what: string, read: string) => draw(what, "How far is it between these two points?", "A box or ruler with the measured distance printed on it.", read);

export const DRAWING_EDUCATION: Readonly<Record<string, SurfaceEducation>> = {
  cursor: draw("The pointer — pan and read the chart without drawing", "How do I stop drawing?", "No mark. The chart pans and the crosshair reads.", "Nothing is placed. Every tap or click reads the market instead.", 0),
  crosshair: draw("Crosshair pointer", "What price and time is under my pointer?", "Two hairlines through the pointer with the price and time on the axes.", "A reading of your pointer's position. It places nothing.", 0),
  select: draw("Select / move an existing drawing", "How do I move or edit what I drew?", "Handles on the selected drawing.", "Drag a handle to move a point; press Delete to remove the drawing.", 0),
  eraser: draw("Erase a drawing", "How do I remove one drawing?", "The drawing under your pointer is removed on click.", "Removes one shape at a time. Clear all removes every drawing after a confirmation.", 0),
  trendline: draw("A straight line between two points", "What line joins these two points?", "A line segment between your two points.", "It is the line you drew. Price touching or crossing it is a fact about your line, not a market reading."),
  ray: draw("A line from one point through a second, extended right", "What line runs from here through there and onward?", "A segment that continues to the right edge.", "Extended geometry from your two points."),
  "info-line": draw("A line that prints its own length and slope", "How long and how steep is this line?", "A line with price change, bars and angle printed beside it.", "The numbers are measurements of your line."),
  "extended-line": draw("A line through two points, extended both ways", "What straight line passes through these two points?", "A line to both edges.", "Geometry from your two points."),
  "trend-angle": draw("A line with its angle printed", "What angle does this line make?", "A line with its angle in degrees.", "The angle depends on the camera's zoom; it changes when you rescale."),
  hline: draw("A horizontal line at one price", "Where is this price across all time?", "A line across the whole chart at the price you placed it.", "A price level you chose. It marks the price, nothing more.", 1),
  hray: draw("A horizontal line from one point to the right", "Where is this price from this bar onward?", "A horizontal segment from your point to the right edge.", "Your price, from your bar onward.", 1),
  vline: draw("A vertical line at one time", "Where is this moment across all prices?", "A line across the whole chart at the time you placed it.", "A time you chose.", 1),
  crossline: draw("A horizontal and a vertical line through one point", "Where do this price and this time cross?", "Two lines through your point.", "Your price and your time.", 1),
  "parallel-channel": draw("Two parallel lines from three points", "Can I bound this move between two parallel lines?", "Two parallel lines and the band between them.", "The band is your geometry; price inside it means price is between your lines.", 3),
  channel: draw("A channel between two parallel lines", "Can I bound this move between two parallel lines?", "Two parallel lines.", "Your geometry.", 3),
  regression: draw("A least-squares line through the closes in a span you choose, with ±σ lines", "What straight line best fits the closes between these two times?", "A regression line and two parallel deviation lines over your span.", "The only tool in this set that reads the bars: the fit uses the closes inside your span. The lines are a statistic of those closes, not a path forward."),
  "flat-channel": draw("A rectangle channel between two prices over a span", "Can I box this range?", "A flat band between two prices.", "Your two prices.", 3),
  "disjoint-channel": draw("Two non-parallel lines bounding a move", "Can I bound a widening or narrowing move?", "Two lines that need not be parallel.", "Your geometry.", 3),
  pitchfork: draw("Andrews pitchfork from three pivots", "Where does the median line of these three pivots run?", "A median line and two parallel tines.", "Fixed geometry from your three points.", 3),
  schiff: draw("Schiff pitchfork", "Where does the shifted median line run?", "A pitchfork whose handle starts at the midpoint of the first leg.", "Fixed geometry from your three points.", 3),
  "modified-schiff": draw("Modified Schiff pitchfork", "Where does the modified median line run?", "A pitchfork with a half-shifted handle.", "Fixed geometry from your three points.", 3),
  "inside-pitchfork": draw("Inside pitchfork", "Where does the inside median line run?", "A pitchfork drawn from the inner pivot.", "Fixed geometry from your three points.", 3),
  fibonacci: fib("Fibonacci retracement levels between two points", "Horizontal lines at the ratio levels between your high and low."),
  "fib-ext": draw("Fibonacci extension from a three-point move", "Where do the ratio extensions of this move fall?", "Levels beyond the third point at fixed ratios.", "Arithmetic on your three points.", 3),
  "fib-channel": fib("Fibonacci levels laid along a channel", "Parallel lines at ratio spacing along your channel."),
  "fib-timezone": fib("Vertical lines at Fibonacci bar counts", "Vertical lines at 1, 2, 3, 5, 8 … bars from your anchor."),
  "fib-speed-fan": fib("Fan lines at Fibonacci ratios", "Lines from your anchor through ratio points of the move."),
  "fib-time": draw("Fibonacci time projections from a move", "At what bar counts do the time ratios of this move fall?", "Vertical lines ahead of your points.", "Arithmetic on the bar counts between your points. A line in the future is a count, not a prediction.", 3),
  "fib-circles": fib("Concentric circles at Fibonacci radii", "Circles centred on your first point."),
  "fib-spiral": fib("A golden-ratio spiral", "A logarithmic spiral from your anchor."),
  "fib-arcs": fib("Arcs at Fibonacci radii", "Arcs centred on your first point."),
  "fib-wedge": fib("A wedge of Fibonacci lines", "Lines from an apex at ratio angles."),
  "fib-pitchfan": fib("A pitchfork fan at Fibonacci ratios", "Fan lines from a median."),
  "gann-box": gann("A Gann time / price box", "A grid between your two corners."),
  "gann-square-fixed": gann("A fixed-ratio Gann square", "A square with fixed internal ratios."),
  "gann-square": gann("A Gann square of time and price", "A square grid from your anchor."),
  "gann-fan": gann("Gann angle lines (1×1, 2×1 …)", "A fan of fixed-slope lines from your anchor."),
  xabcd: pattern("An XABCD pattern you label", 5),
  cypher: pattern("A Cypher pattern you label", 5),
  "head-shoulders": pattern("A head-and-shoulders you label, with a neckline", 7),
  abcd: pattern("An ABCD pattern you label", 4),
  "pattern-triangle": pattern("A triangle you label", 4),
  "three-drives": pattern("A three-drives pattern you label", 7),
  "elliott-impulse": elliott("A five-wave impulse count you label", 6),
  "elliott-correction": elliott("An A-B-C correction you label", 4),
  "elliott-triangle": elliott("An A-B-C-D-E triangle you label", 6),
  "elliott-double": elliott("A W-X-Y combination you label", 4),
  "elliott-triple": elliott("A W-X-Y-X-Z combination you label", 6),
  "cyclic-lines": draw("Evenly spaced vertical lines", "Where do equal time intervals fall from my two points?", "Vertical lines repeating at the spacing of your two points.", "The spacing is yours; the repetition is arithmetic."),
  "time-cycles": draw("Repeating time-cycle marks", "Where does this cycle length repeat?", "Marks at your chosen interval.", "Your interval, repeated."),
  "sine-line": draw("A sine wave fitted between two points", "What sine wave spans these two points?", "A sine curve.", "A curve through your points — decoration, not a reading."),
  "price-range": measure("Price distance between two levels", "The box prints the price change and percent between your two points."),
  "date-range": measure("Time distance between two points", "The box prints the number of bars and the elapsed time between your two points."),
  "date-price-range": measure("Price and time distance in one box", "Both the price change and the bar count between your two points."),
  measure: measure("A quick ruler for price, time and percent", "A temporary ruler that prints price change, percent and bars."),
  "long-position": rec({
    what: "A long position's entry, stop and target drawn on the chart — Risk on Price",
    q: "If I buy here with this stop and this target, what is my risk and reward in price and in R?",
    needs: "YOUR_PLAN", evidence: "Your entry, your stop and your target. Position size comes from your plan.",
    appears: "A green reward box above the entry and a red risk box below it, with the levels and the R multiple printed; the chart's Risk on Price reads these levels.",
    read: "R = (target − entry) ÷ (entry − stop). The boxes are your declared plan on the glass; nothing here says the market will reach either level.",
    full: "All three levels placed; the receipt freezes when you arm it.", partial: "Levels not yet placed read as a template until you set them.", degraded: "Drawings hidden — the plan is kept, not shown.",
    touch: "Long position — your entry, stop and target; the only way Risk on Price learns your plan.",
    canon: "H-1001 Risk on Price · trader-drawn",
  }),
  "short-position": rec({
    what: "A short position's entry, stop and target drawn on the chart — Risk on Price",
    q: "If I sell here with this stop and this target, what is my risk and reward in price and in R?",
    needs: "YOUR_PLAN", evidence: "Your entry, your stop and your target.",
    appears: "A green reward box below the entry and a red risk box above it, with the levels and the R multiple printed.",
    read: "R = (entry − target) ÷ (stop − entry). Your declared plan on the glass; no claim about where price goes.",
    full: "All three levels placed.", partial: "Levels not yet placed read as a template.", degraded: "Drawings hidden — the plan is kept, not shown.",
    touch: "Short position — your entry, stop and target; the only way Risk on Price learns your plan.",
    canon: "H-1001 Risk on Price · trader-drawn",
  }),
  "delta-vp": rec({
    what: "A box you drag; inside it, volume by price split into buy and sell sides",
    q: "At each price in a range I choose, who was the aggressor?",
    needs: "SIDED_TAPE", evidence: "Prints with a stated aggressor side inside your box.",
    appears: "Per-level delta bars on the left (green buy / red sell) and volume-profile bars with the POC on the right, numbers on every row.",
    read: "A row leaning one way shows who pressed at that price. It draws only from prints the tape carried.",
    full: "Every print in the box carries a stated side.", partial: "Sides inferred, or only part of the box has tape.", degraded: "No sided tape — the box draws no sides.",
    canon: "P-110 #11 Bid/Ask Split Profile · trader-drawn range",
  }),
  "anchored-vp": rec({
    what: "Volume by price for exactly the bars you drag across",
    q: "Where did the most business happen in a span I choose?",
    needs: "VOLUME", evidence: "Traded volume on the bars inside your span.",
    appears: "A histogram against the price axis with POC, VAH and VAL, anchored to your span.",
    read: "The longest row is the price your span accepted most. The span is yours; the volume is the bars'.",
    full: "Volume allocated from real prints.", partial: "Volume spread across each bar's range from bar totals.", degraded: "No traded volume — no histogram.",
    canon: "H-601 #8 Fixed Range Profile · trader-drawn range",
  }),
  brush: draw("A freehand stroke", "Can I sketch on the chart?", "Your stroke.", "Decoration you drew.", 1),
  highlighter: draw("A translucent freehand stroke", "Can I highlight an area?", "A wide translucent stroke.", "Decoration you drew.", 1),
  arrow: draw("A straight arrow between two points", "Can I point from here to there?", "An arrow.", "Your annotation."),
  "arrow-up": draw("An up-arrow marker at one point", "Can I mark this bar?", "An arrow mark.", "Your annotation.", 1),
  "arrow-down": draw("A down-arrow marker at one point", "Can I mark this bar?", "An arrow mark.", "Your annotation.", 1),
  rect: draw("A rectangle between two corners", "Can I box this area?", "A rectangle.", "Your box. Price inside it means price is inside your box."),
  "rotated-rect": draw("A rotated rectangle", "Can I box a sloping area?", "A rectangle at an angle.", "Your box.", 3),
  path: draw("A connected path of points", "Can I trace a route?", "Line segments through your points.", "Your path.", 3),
  circle: draw("A circle", "Can I ring this area?", "A circle.", "Your shape."),
  ellipse: draw("An ellipse", "Can I ring this area?", "An ellipse.", "Your shape."),
  polyline: draw("A polyline", "Can I join several points?", "Segments through your points.", "Your shape.", 3),
  triangle: draw("A triangle", "Can I mark three points as a triangle?", "A triangle.", "Your shape.", 3),
  arc: draw("An arc", "Can I draw a curve?", "An arc through your points.", "Your shape.", 3),
  curve: draw("A curve", "Can I draw a curve?", "A smooth curve.", "Your shape.", 3),
  "double-curve": draw("A double curve", "Can I draw an S-curve?", "A two-bend curve.", "Your shape.", 3),
  text: draw("A text note at a point", "Can I write on the chart?", "Your words at the point you placed.", "Your note.", 1),
  note: draw("An anchored note", "Can I attach a note here?", "A note box.", "Your note.", 1),
  "price-note": draw("A note tied to a price", "Can I annotate this price?", "A note with the price printed.", "Your note.", 1),
  pin: draw("A pin marker", "Can I pin this spot?", "A pin.", "Your marker.", 1),
  callout: draw("A callout with a pointer", "Can I call out this spot?", "A speech box pointing at your point.", "Your note.", 2),
  comment: draw("A comment box", "Can I leave a comment?", "A comment box.", "Your note.", 1),
  "price-label": draw("A label showing a price", "Can I label this price?", "The price in a label.", "Your label.", 1),
  signpost: draw("A signpost marker", "Can I flag this bar?", "A signpost.", "Your marker.", 1),
  flag: draw("A flag marker", "Can I flag this bar?", "A flag.", "Your marker.", 1),
};

/* ── Views (the Views sheet) ───────────────────────────────────────────── */

const VIEW_CANON = "Views sheet · one chart, a different lens";
function view(what: string, q: string, needs: EvidenceNeed, evidence: string, appears: string, read: string, full: string, partial: string, degraded: string): SurfaceEducation {
  return rec({ what, q, needs, evidence, appears, read, full, partial, degraded, canon: VIEW_CANON });
}
const TAPE_VIEW = { full: TAPE_FULL, partial: TAPE_PARTIAL, degraded: "No signed tape on this symbol — the view renders empty and its banner says what is missing." };

export const VIEW_EDUCATION: Readonly<Record<string, SurfaceEducation>> = {
  Chart: view("The candle chart with every switched-on tool", "What is the market doing right now?", "PRICE", "Bars; every tool adds its own need.",
    "Candles, the price axis, and the tools you switched on.", "The default room. Every other view is a lens over the same loaded chart.", "Bars loaded.", "Few bars.", "No bars."),
  Absorption: view("Bars where heavy aggressive volume failed to move price", "Where did effort hit a price and go nowhere?", "SIDED_TAPE", "Signed prints per bar, measured against each bar's displacement.",
    "A full-width surface listing absorbing bars with their effort and displacement.", "High effort with near-zero displacement is absorption. The surface says which bars qualified and why.", TAPE_VIEW.full, TAPE_VIEW.partial, TAPE_VIEW.degraded),
  Aggression: view("The same absorption measurement as a scatter of net aggression against effort", "How does each bar's aggression compare with its effort?", "SIDED_TAPE", "Signed prints per bar.",
    "A scatter plot; the y-axis says whether it shows net aggression or effort.", "The same selector as Absorption, plotted. The two views cannot disagree about which bars absorbed.", TAPE_VIEW.full, TAPE_VIEW.partial, TAPE_VIEW.degraded),
  "Big Trades": view("Unusually large prints from the per-trade tape", "Where did the biggest prints land?", "PRINTS", "Per-trade prints with size.",
    "A list and marks of large prints with time, price and size.", "Size is observed. Who traded, and why, is not.", "Every print carries size and time.", "Only bars since the tape arrived.", "No per-trade tape — empty."),
  "Value Profile": view("Volume by price for the loaded bars, as a full surface", "Where did the most business happen?", "VOLUME", "Traded volume on the bars.",
    "A histogram against price with POC and value area.", "The longest row is the price accepted most.", "Volume from real prints.", "Volume spread from bar totals.", "No central volume — nothing to profile."),
  Continuation: view("Effort → Response for the leg in progress", "Is the current leg still being paid for?", "VOLUME", "Bar volume and displacement along the leg.",
    "The leg's bars with effort and response marks.", "Effort that keeps producing displacement is continuation; effort that stops producing it is not.", "Volume on every bar.", "Some bars lack volume.", "No volume — no effort to read."),
  Worksheet: view("The footprint worksheet — per-bar order-flow cells", "What happened inside each bar, price by price?", "SIDED_TAPE", "Signed prints per price level.",
    "A footprint grid under the chart.", "Each cell is a price level's buy and sell volume. Read bottom-to-top within a bar.", TAPE_VIEW.full, TAPE_VIEW.partial, TAPE_VIEW.degraded),
  Gravity: view("Where the loaded profiles pull — POC and value lines together", "Which prices hold the most accepted volume right now?", "VOLUME", "Traded volume on the bars.",
    "Profile POC / value lines on one surface.", "A reading of where volume concentrated. It describes the past bars, not a pull on the next one.", "Volume from real prints.", "Volume spread from bar totals.", "No central volume."),
  Liquidity: view("Liquidity Weather and lifecycle over the chart", "How expensive is it to move price through each band?", "VOLUME", "Volume per unit of price movement; sided tape sharpens it.",
    "Hot and cool bands over the price axis, and swept / defended pools.", "Hot = it took a lot of size to move price here; cool = price moved far for little size. A description of the bars.", "Sided tape and volume.", "Bar volume only.", "No volume — no weather."),
  Options: view("The options chain for this underlying", "What strikes and expiries trade on this symbol?", "OPTIONS", "An options chain.",
    "Strikes by expiry with open interest and greeks where the feed carries them.", "Open interest is positioning that exists; what it will do is not stated.", "Fresh chain.", "Delayed chain — said in the label.", "No chain for this symbol."),
  ETFs: view("ETFs that hold this symbol", "Which funds hold this stock?", "PRICE", "Reference data from the fundamentals feed.",
    "A list of funds and weights.", "Reference data, as of its own date.", "Feed answered.", "Partial list.", "No reference data for this class."),
  Financials: view("Income statement, balance sheet and cash flow", "What do the company's statements say?", "PRICE", "Reference data from the fundamentals feed.",
    "Statement tables by period.", "Reported figures, as filed.", "Feed answered.", "Some periods missing.", "Not an equity — no statements."),
  Valuation: view("Valuation ratios", "How is this company priced against its earnings, sales and book?", "PRICE", "Reference data from the fundamentals feed.",
    "Ratio tables.", "Ratios are arithmetic on reported figures and the last price.", "Feed answered.", "Some ratios missing.", "Not an equity."),
  "Corporate Actions": view("Dividends, splits and other corporate actions", "What has the company done to its shares?", "PRICE", "Reference data from the fundamentals feed.",
    "A dated list.", "Historical record.", "Feed answered.", "Partial history.", "Not an equity."),
  Shareholders: view("Major holders", "Who holds this stock?", "PRICE", "Reference data from the fundamentals feed.",
    "A list of holders and stakes as of their filing dates.", "Filing data, dated.", "Feed answered.", "Partial list.", "Not an equity."),
  Profile: view("The instrument's reference profile", "What is this instrument — name, venue, contract spec?", "PRICE", "Reference data.",
    "Name, venue, class, contract specifications.", "Reference facts about the instrument.", "Feed answered.", "Some fields missing.", "No reference data."),
};

/* ── Loadouts, Replay, bar selection ───────────────────────────────────── */

const LOADOUT_CANON = "Garden 16 §59 Camera loadouts · a preset of switches, not a new workspace";
function loadout(label: string, senses: string, tools: string, q: string): SurfaceEducation {
  return rec({
    what: `A preset that switches on ${senses} and switches the other tools off`,
    q, needs: "OTHER_LAYERS", evidence: `The tools it arms: ${tools}. Each keeps its own evidence needs and its own ⓘ.`,
    appears: "Those tools come on together; everything else on the camera goes quiet. Your own drawings are untouched.",
    read: "A loadout chooses which readings speak. It adds no reading of its own and makes no claim about the market.",
    full: "Every armed tool has its evidence on this symbol.", partial: "Some armed tools are silent here (no volume or no tape) — each says so on its own row.", degraded: "No bars — nothing to arm.",
    touch: `${label} loadout — ${senses}.`,
    canon: LOADOUT_CANON,
  });
}

export const LOADOUT_EDUCATION: Readonly<Record<string, SurfaceEducation>> = {
  SCALP: loadout("Scalp", "Flow + Liquidity + Structure", "Absorption, Stacked Imbalance, Delta Divergence, Liquidity Weather, Liquidity Lifecycle, Market Structure", "Which tools read the next few bars' order flow and structure?"),
  TREND: loadout("Trend", "Regime + Profile + Memory", "Regime Lighting, Derivatives Pressure, Session Profile, Fixed Range Profile, Living Profile, Profile Memory, Memory Ghost, Market Structure", "Which tools read where value has been and which regime the bars are in?"),
  SNIPER: loadout("Sniper", "Structure + Flow + Anatomy", "Market Structure, Absorption, Anatomy Cards, Effort mark, Value Candle, Structure Profile", "Which tools read one level closely — structure, absorption and the anatomy of a bar?"),
  REVIEW: loadout("Review", "Memory + Session + Effort", "Session Profile, Effort mark, Profile Memory, Memory Ghost, Value Migration", "Which tools read how a session unfolded, for review after the fact?"),
};

export const REPLAY_EDUCATION: SurfaceEducation = rec({
  what: "Bar replay — the loaded history stepped forward one closed bar at a time, with the live clock switched off",
  q: "What did this chart know at a past bar, before the bars after it existed?",
  needs: "PRICE", evidence: "The bars already loaded. Nothing is fetched while replaying.",
  appears: "A replay control with the cursor bar's time and position (for example 4880 / 5000); the chart draws only bars up to the cursor; every tool reads as of that bar.",
  read: "Everything on the glass is as of the cursor. A tool's state at the cursor comes from the bars closed by then — never from later bars (the FVG layer receipts LEAK:0). Step forward to watch how a reading developed.",
  full: "Loaded bars cover the stretch you replay.", partial: "Bars that need a tape (footprint, big trades) show only what the tape recorded during replay's loaded window.", degraded: "No bars loaded — nothing to replay.",
  touch: "Replay — the chart as of the cursor bar; the live clock is off.",
  canon: "§38 Replay lifecycle · AS-OF-TIME, no future leakage",
});

export const BAR_SELECTION_EDUCATION: SurfaceEducation = rec({
  what: "One bar, selected from the Wisdom line, the Delta keel or Effort → Response",
  q: "What is this bar made of — its prices, volume, effort and the tape inside it?",
  needs: "PRICE", evidence: "The bar's open, high, low, close and volume; the tape inside it when the feed carries one.",
  appears: "The bar's candle is marked and Inspect opens on it. The word that selected it (the wisdom line's sentence, the keel, the effort mark) is the reason it was chosen.",
  read: "Inspect lists what this bar measured: its range, its volume against normal, its effort against its response, and the sided tape if any. Each row names its own evidence class.",
  full: "Bar with volume and a signed tape.", partial: "Bar with volume, no tape — the tape rows say so.", degraded: "A bar with no volume (spot FX) — price rows only.",
  touch: "Selected bar — the candle the wisdom line, keel or effort mark pointed at; Inspect shows what it is made of.",
  canon: "G19.WISDOM · F04A · barDeltaKeel — one selection, Inspect is the evidence",
});

/* ── Lookup ────────────────────────────────────────────────────────────── */

export const smartMoneyEducationId = (cardName: string): string => `SM:${cardName}`;
export const drawingEducationId = (toolId: string): string => `DRAW:${toolId}`;
export const viewEducationId = (tab: string): string => `VIEW:${tab}`;
export const loadoutEducationId = (id: string): string => `LOADOUT:${id}`;
export const REPLAY_EDUCATION_ID = "REPLAY";
export const BAR_SELECTION_EDUCATION_ID = "BAR_SELECTION";

export function surfaceEducationFor(id: string): SurfaceEducation | null {
  if (id === REPLAY_EDUCATION_ID) return REPLAY_EDUCATION;
  if (id === BAR_SELECTION_EDUCATION_ID) return BAR_SELECTION_EDUCATION;
  if (id.startsWith("SM:")) return SMART_MONEY_EDUCATION[id.slice(3)] ?? null;
  if (id.startsWith("DRAW:")) return DRAWING_EDUCATION[id.slice(5)] ?? null;
  if (id.startsWith("VIEW:")) return VIEW_EDUCATION[id.slice(5)] ?? null;
  if (id.startsWith("LOADOUT:")) return LOADOUT_EDUCATION[id.slice(8)] ?? null;
  return null;
}
