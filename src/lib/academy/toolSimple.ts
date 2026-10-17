/**
 * EVERY TOOL, SAID SIMPLY (Founder 2026-10-16: "the full detail … and also the keep-it-simple breakdown … a
 * fifth grader, a four-year-old could understand … I'm gonna teach this to the professional and the kid").
 *
 * One name and one plain explanation per ⓘ record. The full, graded detail stays the ⓘ record's own
 * (inventionEducation.ts); these are the doorway words in front of it. No market claim here that the record
 * does not make — only simpler words. No imports: academyDoorForTool and the ⓘ owner both read this.
 */
export interface ToolSimple {
  /** The tool's name as the menus print it. */
  readonly label: string;
  /** The keep-it-simple explanation — short words, one picture. */
  readonly simple: string;
}

export const TOOL_SIMPLE: Readonly<Record<string, ToolSimple>> = {
  FIXED_RANGE: { label: "Fixed Range Profile", simple: "Pick a stretch of the chart. The bars on the side show which prices people traded at the most in that stretch — the longest bar is the busiest price." },
  SESSION: { label: "Session Volume Profile", simple: "For today's session only: a sideways bar chart of where people traded. Long bars = busy prices, short bars = prices people rushed through." },
  DELTA_VP: { label: "Bid/Ask Split Profile", simple: "The same busy-price bars, split in two colours: one side is buyers who pushed, the other is sellers who pushed. Bigger side = who was more eager there." },
  ABSORPTION: { label: "Absorption Shelf", simple: "Lots of people pushed hard, but price barely moved — like pushing a wall. The shelf marks where someone big quietly soaked it all up." },
  EXHAUSTION: { label: "Exhaustion", simple: "Price tried to keep going, but the push ran out of breath — fewer and fewer people kept pushing. It marks where a move got tired." },
  IMBALANCE_STACK: { label: "Imbalance Stack", simple: "Several prices in a row where one side traded far more than the other. A stack is a staircase of one-sided pushing." },
  FLOW_CURRENT: { label: "Flow Current", simple: "Arrows that show which way the buying and selling is flowing right now, and how strong — like the current in a river." },
  VALUE_CANDLE: { label: "Value Candle", simple: "Inside each candle, a small mark of the price where most trading happened in that bar — the candle's 'centre of gravity'." },
  CLARITY_CANDLE: { label: "Clarity Candle", simple: "A score on a candle: was this bar clear (one side clearly won) or messy (both sides fought to a draw)?" },
  DELTA_DIVERGENCE: { label: "Delta Divergence", simple: "Price made a new high (or low), but the buyers (or sellers) behind it got weaker. The move is going up while the push underneath is fading." },
  LIQUIDITY_WEATHER: { label: "Liquidity Weather", simple: "A weather map of where orders are piled up waiting. Thick clouds = lots of orders that can slow price down; clear sky = price can move easily." },
  EFFORT_MARK: { label: "Effort Mark", simple: "A mark where a lot of trading (effort) happened. Then look: did price move a lot (good result) or barely (effort wasted)?" },
  DELTA_LEVELS: { label: "Delta Levels", simple: "Bars at prices where buyers or sellers pushed the most, coloured by who won there. Longer bar = bigger win." },
  LIVING_PROFILE: { label: "Living Profile", simple: "A sideways bar chart of today's busiest prices that grows while you watch. The gold line is the busiest price of all (the POC)." },
  TPO_PROFILE: { label: "TPO Profile", simple: "Each letter is a slice of time. Stacked letters show where price spent the most time. Early letters are blue, late letters are red." },
  STRUCTURE_PROFILE: { label: "Structure Profile", simple: "The busy-price bars for just the latest swing — from the last turning point to now — so you see where this move did its business." },
  PROFILE_DNA: { label: "Profile DNA", simple: "The shape of the day's profile, named — like a 'P' shape or a 'b' shape — because the shape tells the story of who was in control." },
  VALUE_MIGRATION: { label: "Value Migration", simple: "Steps that show where the fair-price zone moved each session — up, down or sideways. It's the market's footprints over days." },
  PROFILE_MEMORY: { label: "Profile Memory", simple: "Yesterday's busy prices, drawn faintly behind today, so you can see if price is coming back to an old meeting place." },
  PROFILE_FUSION: { label: "Profile Fusion", simple: "When two profiles agree on the same busy price, they join into one knot. Two witnesses saying the same thing." },
  COMPOSITE_PROFILE: { label: "Composite Profile", simple: "Several days of busy prices added together into one big profile. It shows the bigger, longer meeting places." },
  VISIBLE_RANGE_PROFILE: { label: "Visible Range Profile", simple: "The busy-price bars for exactly what's on your screen. Scroll or zoom and it redraws." },
  ANCHORED_RANGE: { label: "Anchored Range", simple: "Pick a starting bar and everything is measured from there to now — your own chosen 'since when'." },
  REGIME_LIGHTING: { label: "Regime Lighting", simple: "Tells you what kind of market this is right now — calm and ranging, or trending and fast — and draws the channel price is living in." },
  QUESTION_LENS: { label: "Question Lens", simple: "Ask the chart one question (like 'is this a good place to buy?') and it dims everything that doesn't help answer it." },
  SCAFFOLDING: { label: "Scaffolding", simple: "Training wheels for reading a chart: it marks the swing highs and lows and tells you, step by step, what the price is doing between them." },
  ANATOMY_CARDS: { label: "Anatomy Cards", simple: "Tap a mark on the chart and a card explains what it is, like a label in a museum." },
  MEMORY_GHOST: { label: "Memory Ghost", simple: "A faint ghost of an older day that looked like today, laid on top, so you can see how that day played out next." },
  EXPECTED_ENVELOPE: { label: "Expected Envelope", simple: "A shaded fan of how far price usually travels from here, built from past days that started like today. Outside the fan = unusual." },
  CONTRADICTION: { label: "Contradiction", simple: "When two tools disagree at the same price, it says so out loud instead of picking one. Disagreement is a reason to be careful." },
  RISK_ON_PRICE: { label: "Risk on Price", simple: "Draw your trade — entry, stop, target — and it shows, right on the chart, how much you risk and how much you could make." },
  LIQUIDITY_LIFECYCLE: { label: "Liquidity Lifecycle", simple: "Follows a pool of waiting orders from birth to end: did price take it out, did it get pulled, or is it still sitting there?" },
  MARKET_STRUCTURE: { label: "Market Structure", simple: "Marks higher highs and lower lows. Up-staircase = uptrend, down-staircase = downtrend, and a 'BROKEN' tag when the staircase breaks." },
  MTF_ANCESTRY: { label: "MTF Ancestry", simple: "Shows the bigger timeframes on your chart: the 4-hour band, the 1-hour busy box and yesterday's high or low — one chart, not four." },
  DERIVATIVES_PRESSURE: { label: "Derivatives Pressure", simple: "Shows where options traders have big bets (open interest) near price. Big bets can act like magnets or walls." },
  BRICK_WALLS: { label: "Brick Walls", simple: "Thick walls at option strikes with the most open interest — prices where lots of money is riding, which price often reacts to." },
  CALL_WALL: { label: "Call Wall", simple: "The strike above price with the most call bets. It often acts like a ceiling." },
  PUT_WALL: { label: "Put Wall", simple: "The strike below price with the most put bets. It often acts like a floor." },
  GAMMA_HEATMAP: { label: "Gamma Heatmap", simple: "A heat map of where option dealers would have to buy or sell as price moves. Warm = they lean against moves, cool = they go with them (a model, not a fact)." },
  GAMMA_POSITIVE: { label: "Positive Gamma", simple: "Zones where the model says dealers buy dips and sell rips — price tends to calm down there." },
  GAMMA_NEGATIVE: { label: "Negative Gamma", simple: "Zones where the model says dealers chase the move — price can get jumpier there." },
  GAMMA_FLIP: { label: "Gamma Flip", simple: "The price where the model switches from 'calm' to 'jumpy'. A line to watch." },
  GAMMA_CONCENTRATION: { label: "Gamma Concentration", simple: "The single strike with the most modelled gamma — the strongest option magnet nearby." },
  SESSION_BANDS: { label: "Session Bands", simple: "Coloured bands for each trading session (Asia, London, New York) so you know whose hours you're looking at." },
  EFFORT_RESPONSE: { label: "Effort → Response", simple: "Compares how hard people pushed (volume) with how far price went. Big push, small move = someone is blocking." },
  DELTA_KEEL: { label: "Delta Keel", simple: "A small fin under each candle: buyer-push or seller-push for that bar. Bigger fin = bigger push." },
  WISDOM_LINE: { label: "Wisdom Line", simple: "One sentence that reads the other tools together and says what they agree on, in plain words." },
  BREATH_RIBBON: { label: "Breath Ribbon", simple: "A ribbon that swells when the market is breathing in (squeezing quiet) and releases when it breathes out (moves fast)." },
  CVD_NOTCH: { label: "CVD Notch", simple: "A notch where the running total of buying minus selling turns. It marks where the push changed hands." },
  RVOL_TONE: { label: "RVOL Tone", simple: "Is today busier or quieter than a normal day at this time? Brighter = busier than usual." },
  "FP_bid-ask": { label: "Bid × Ask Footprint", simple: "Inside each candle, two numbers per price: how much sold into buyers (left) and how much bought from sellers (right)." },
  FP_delta: { label: "Delta Bubbles", simple: "Bubbles on the candles: green when buyers pushed more, red when sellers did. Bigger bubble = bigger push." },
  "FP_volume-profile": { label: "Candle Volume Profile", simple: "A tiny busy-price chart inside every candle, so you see where each bar did its business." },
  FP_imbalance: { label: "Imbalance Footprint", simple: "Highlights prices inside a candle where one side traded way more than the other (like 3 to 1)." },
  "FP_aggressive-passive": { label: "Aggressive · Passive", simple: "Splits each bar into people who rushed in (aggressive) and people who waited with orders (passive). Who was hungrier?" },
  "FP_big-trades": { label: "Big Trades", simple: "A bubble for each unusually large trade, at the price and time it happened. Bigger bubble = bigger trade." },
  FVG_IMBALANCE: { label: "Fair Value Gap", simple: "A gap price jumped over so fast that one side barely got to trade. Price often comes back to fill it." },
};

export const toolSimpleFor = (id: string): ToolSimple | null => TOOL_SIMPLE[id] ?? null;
export const primerSlugFor = (id: string): string => id.toLowerCase().replace(/[_\s]+/g, "-");
