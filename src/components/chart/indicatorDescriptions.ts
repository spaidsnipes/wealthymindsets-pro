// Rich, TradingView-style indicator descriptions.
//
// Each indicator's "?" button opens a structured modal with five sections:
// Definition, Calculation, How to use, What to look for, and Summary.
//
// We author detailed content for the common/major indicators, and provide a
// category-aware structured fallback so EVERY indicator (160+) shows a rich,
// professional multi-section description instead of a single dummy line.

export interface IndicatorInfo {
  definition:    string;
  calculation:   string;
  howToUse:      string;
  whatToLookFor: string;
  summary:       string;
}

type Author = Partial<IndicatorInfo> & { definition: string };

// ── Authored entries (exact-name or prefix matches) ────────────────────────
// Keys are matched case-insensitively. A key ending in "*" is a prefix match
// (e.g. "EMA *" matches "EMA 8", "EMA 144", …).
const AUTHORED: Record<string, Author> = {
  "Bid × Ask": {
    definition:
      "Bid × Ask footprint splits each candle into horizontal price rows and shows the volume that traded into the bid versus the ask at every level. It exposes who was in control — aggressive buyers lifting the offer or aggressive sellers hitting the bid — inside a single bar.",
    calculation:
      "For each price level within the bar, trades that print on the ask (uptick) are counted as ask/buy volume and trades on the bid (downtick) as bid/sell volume. Cells are colored toward the dominant side and shaded by how lopsided the bid/ask ratio is.",
    howToUse:
      "Read it bottom-to-top to see where buyers or sellers stepped in. Heavy ask volume at the lows of a candle (absorption) often precedes a bounce; heavy bid volume at the highs warns of distribution. Use the per-row dominance to confirm whether a breakout was actually backed by aggressive flow.",
    whatToLookFor:
      "Stacked one-sided rows, absorption at extremes (large opposing volume that fails to move price), and the Point of Control row where the most volume traded.",
    summary:
      "An x-ray of the order flow inside each candle. Teal = buyers lifting the ask, purple = sellers hitting the bid. The fastest way to see who actually won the bar.",
  },
  "Delta": {
    definition:
      "Delta footprint shows the net of ask volume minus bid volume at each price row — the directional pressure inside the candle. Positive delta means aggressive buying dominated; negative delta means aggressive selling dominated.",
    calculation:
      "Delta = ask (buy) volume − bid (sell) volume, computed per price level and summed for the bar. Cells are tinted teal for positive net delta and purple for negative, with intensity scaled to the magnitude.",
    howToUse:
      "Confirm trend strength: rising price with strongly positive delta is healthy; rising price with negative delta is a divergence and a warning. Watch for delta flipping sign at support/resistance as an early sign of a turn.",
    whatToLookFor:
      "Delta divergence (price up, delta down or vice-versa), exhaustion spikes, and large delta that fails to push price (absorption).",
    summary:
      "Net aggressive pressure per bar. Green/teal = buyers winning, purple = sellers winning. Divergence between price and delta is the key reversal tell.",
  },
  "Vol Profile": {
    definition:
      "The per-candle Volume Profile draws horizontal bars showing how much volume traded at each price level within the bar, revealing where activity concentrated rather than just the open/close.",
    calculation:
      "Volume is bucketed into price levels across the candle's range; each level's bar length is proportional to the volume that traded there. The widest level is the bar's Point of Control.",
    howToUse:
      "Spot the price where the most business was done inside each bar — these high-volume nodes act as magnets and future support/resistance. Thin areas mark prices the market moved through quickly and may revisit.",
    whatToLookFor:
      "High-volume nodes (acceptance), low-volume gaps (rejection), and shifts of the Point of Control up or down across consecutive bars.",
    summary:
      "Where volume actually traded inside each candle. Fat nodes = acceptance/support, thin nodes = rejection. Reveals structure the candle body hides.",
  },
  "Imbalance": {
    definition:
      "The Imbalance overlay highlights price levels where buy or sell aggression overwhelmed the opposite side by a large ratio (≥2.5×), marking spots where one side of the book was run over and trapped traders may be forced to cover.",
    calculation:
      "At each price row the diagonal bid/ask ratio is computed; rows where the dominant side exceeds the other by the threshold (default 2.5×) are flagged as imbalances. Consecutive flagged rows form stacked imbalances.",
    howToUse:
      "Use imbalances as evidence of conviction behind a move and as support/resistance: buy imbalances below price tend to hold on pullbacks, sell imbalances above price tend to cap rallies. Stacked imbalances mark strong initiative moves.",
    whatToLookFor:
      "Stacked (consecutive) imbalances, unfilled imbalances acting as magnets, and imbalances at the extreme of a move signaling exhaustion.",
    summary:
      "Levels where one side ran the other over (≥2.5×). Marks trapped traders and high-conviction support/resistance. Stacked imbalances = strong initiative.",
  },
  "Agg/Passive": {
    definition:
      "Aggressive/Passive coloring distinguishes initiative order flow (market orders crossing the spread) from passive resting liquidity, so you can see who is driving price versus who is providing it.",
    calculation:
      "Trades lifting the ask are classed as aggressive buying (teal); trades hitting the bid as aggressive selling (purple). Passive fills against resting limit orders are shaded more neutrally. Intensity scales with the aggression at each level.",
    howToUse:
      "Confirm breakouts with aggression: a breakout on heavy aggressive buying is more trustworthy than one on passive drift. Watch for aggressive selling being absorbed by passive bids at support — a classic reversal setup.",
    whatToLookFor:
      "Aggression clustering at breakouts, absorption (aggression meeting equal passive size with no price progress), and aggression drying up into a high.",
    summary:
      "Teal = aggressive buyers lifting the ask, purple = aggressive sellers hitting the bid. Separates who's driving price from who's providing liquidity.",
  },
  "Big Trades": {
    definition:
      "Big Trades plots circles on the chart for unusually large individual prints, surfacing institutional-sized order flow that a normal candle would hide inside its body.",
    calculation:
      "Each trade's notional size is compared to a rolling baseline; prints above the large-trade threshold are drawn as bubbles sized by notional and colored by side (buy vs sell), positioned at the trade's price and time.",
    howToUse:
      "Track where size is hitting: clusters of large buys at a level signal institutional accumulation; large sells into a rally warn of distribution. Combine with Volume Profile to see if big prints land on key nodes.",
    whatToLookFor:
      "Clusters of same-side big prints, a single outsized print marking a reversal, and big trades being absorbed without moving price.",
    summary:
      "Institutional-sized prints as bubbles. Buy clusters = accumulation, sell clusters into strength = distribution. Shows the size that candles hide.",
  },
  "EMA *": {
    definition:
      "An Exponential Moving Average (EMA) is a trend-following overlay that averages price over a chosen number of periods while giving exponentially more weight to the most recent bars. Compared with a Simple Moving Average, it reacts faster to new price information and hugs price more closely.",
    calculation:
      "EMA = Price(today) × k + EMA(yesterday) × (1 − k), where the smoothing factor k = 2 ÷ (period + 1). A shorter period raises k, making the line more responsive; a longer period lowers k, making it smoother and slower.",
    howToUse:
      "Use the slope and the price-to-EMA relationship to gauge trend: price above a rising EMA is bullish, price below a falling EMA is bearish. Shorter EMAs (8–21) track momentum and intraday structure; longer EMAs (50/100/200) define the dominant trend and act as dynamic support/resistance. Crossovers between a fast and a slow EMA are classic entry/exit triggers.",
    whatToLookFor:
      "Watch for price reclaiming or losing the EMA, the EMA flattening (trend exhaustion), fast/slow EMA crossovers, and price repeatedly bouncing off a key EMA (200 especially) as institutional support/resistance.",
    summary:
      "A responsive, weighted trend line. Above & rising = strength; below & falling = weakness. The 50/100/200 EMAs are the most watched dynamic support/resistance levels in the market.",
  },
  "SMA *": {
    definition:
      "A Simple Moving Average (SMA) is the unweighted mean of price over the last N periods. It smooths out short-term noise to reveal the underlying trend direction and is the most widely referenced moving average in technical analysis.",
    calculation:
      "SMA = (P₁ + P₂ + … + Pₙ) ÷ N — the arithmetic average of the closing prices of the last N bars. Every bar in the window carries equal weight, so the SMA reacts more slowly than an EMA to recent moves.",
    howToUse:
      "Treat the SMA as a baseline for trend: sustained trade above a rising SMA is constructive, below a falling SMA is bearish. The 50 and 200 SMA, and the 'golden cross' (50 crossing above 200) / 'death cross' (50 below 200), are benchmark long-term signals followed across the whole market.",
    whatToLookFor:
      "Golden/death crosses, price testing the 200-SMA as major support/resistance, and the slope of the average flattening as a sign momentum is fading.",
    summary:
      "The classic equal-weight trend baseline. Slower than an EMA but more stable. The 50/200 SMA and golden/death cross are the market's most-watched long-term levels.",
  },
  "VWAP": {
    definition:
      "Volume-Weighted Average Price (VWAP) is the average price a security has traded at over the session, weighted by volume. It represents the true 'fair value' or average cost basis for the day and is the primary execution benchmark used by institutions.",
    calculation:
      "VWAP = Σ(Typical Price × Volume) ÷ Σ(Volume), accumulated from the session open, where Typical Price = (High + Low + Close) ÷ 3. It resets at the start of each session.",
    howToUse:
      "Use VWAP as an intraday line in the sand: price above VWAP favors buyers and longs, below favors sellers and shorts. Institutions try to buy below and sell above VWAP, so it frequently acts as a magnet and as dynamic support/resistance for pullback entries.",
    whatToLookFor:
      "First test and hold of VWAP after the open, reclaims/rejections of VWAP, and price stretching far from VWAP (mean-reversion setups). Trending days ride one side of VWAP; balanced days oscillate around it.",
    summary:
      "The institutional fair-value line for the session. Above = bullish control, below = bearish control. The single most important intraday reference level.",
  },
  "RSI": {
    definition:
      "The Relative Strength Index (RSI) is a momentum oscillator that measures the speed and magnitude of recent price changes on a 0–100 scale to assess overbought and oversold conditions.",
    calculation:
      "RSI = 100 − [100 ÷ (1 + RS)], where RS = average gain ÷ average loss over the lookback period (default 14). Gains and losses are smoothed with a Wilder moving average.",
    howToUse:
      "Readings above 70 flag overbought conditions, below 30 oversold. In strong trends use 80/20 bands and trade with the trend (buy dips that hold above 40, sell rallies that fail below 60). Divergence between RSI and price is a powerful early reversal warning.",
    whatToLookFor:
      "Bullish/bearish divergences, failure swings, the 50 line as a trend filter, and RSI staying pinned above 70 (or below 30) as a sign of trend strength rather than imminent reversal.",
    summary:
      "A 0–100 momentum gauge. >70 overbought, <30 oversold, 50 = trend pivot. Divergence is its highest-value signal.",
  },
  "MACD": {
    definition:
      "Moving Average Convergence Divergence (MACD) is a trend-and-momentum indicator showing the relationship between two EMAs of price, plotted with a signal line and a histogram.",
    calculation:
      "MACD line = EMA(12) − EMA(26). Signal line = EMA(9) of the MACD line. Histogram = MACD line − Signal line, visualizing the gap between them.",
    howToUse:
      "MACD crossing above its signal line is a bullish momentum trigger; crossing below is bearish. The histogram expanding shows accelerating momentum; contracting shows it fading. The zero line separates bullish (above) from bearish (below) regimes.",
    whatToLookFor:
      "Signal-line crossovers, zero-line crosses, histogram peaks/troughs, and MACD/price divergence ahead of reversals.",
    summary:
      "Two-EMA momentum engine. Cross above signal = bullish, below = bearish; histogram shows momentum strength; divergence warns of turns.",
  },
  "Bollinger Bands": {
    definition:
      "Bollinger Bands plot a moving-average midline with an upper and lower band set a number of standard deviations away, creating an adaptive volatility envelope around price.",
    calculation:
      "Midline = 20-period SMA. Upper band = SMA + 2σ, Lower band = SMA − 2σ, where σ is the standard deviation of price over the same 20 periods. The bands widen with volatility and contract when it falls.",
    howToUse:
      "Price tagging the upper band signals strength (or overextension); the lower band signals weakness (or a bounce zone). A 'squeeze' — bands contracting tightly — precedes explosive moves. In trends, price walks the band; in ranges, it reverts to the midline.",
    whatToLookFor:
      "Squeezes (low volatility before breakouts), band walks (strong trends), and reversion from the outer bands back to the 20-SMA midline.",
    summary:
      "An adaptive volatility envelope. Squeeze = breakout pending; band-walk = strong trend; outer-band tags = stretch/reversion zones.",
  },
  "ATR": {
    definition:
      "Average True Range (ATR) measures market volatility by averaging the true range of price over a period. It quantifies how much an asset typically moves, without indicating direction.",
    calculation:
      "True Range = max(High−Low, |High−PrevClose|, |Low−PrevClose|). ATR = Wilder-smoothed average of True Range over the lookback period (default 14).",
    howToUse:
      "Use ATR to size stops and targets relative to current volatility (e.g. stop = 1.5–2× ATR), to filter breakouts, and to compare volatility regimes. Rising ATR = expanding volatility; falling ATR = quiet, compressing markets.",
    whatToLookFor:
      "ATR spikes (volatility events), ATR contraction (pre-breakout coiling), and using ATR multiples to place logical, volatility-adjusted stops.",
    summary:
      "A pure volatility gauge (no direction). Essential for volatility-based stop placement and position sizing.",
  },
  "Supertrend": {
    definition:
      "Supertrend is an ATR-based trend-following overlay that prints a single line which flips above or below price to signal the prevailing trend and provide a trailing stop.",
    calculation:
      "Bands = (High+Low)/2 ± (Multiplier × ATR). The line locks to the lower band in uptrends and the upper band in downtrends, flipping when price closes through it. Defaults: ATR period 10, multiplier 3.",
    howToUse:
      "Green line below price = uptrend (hold longs); red line above price = downtrend (hold shorts/stay out). The line itself doubles as a trailing stop. Best in trending conditions; choppy ranges produce whipsaws.",
    whatToLookFor:
      "Color flips for entries/exits, the line acting as trailing support/resistance, and avoiding signals during low-volatility chop.",
    summary:
      "An ATR trailing trend line. Below price = bullish, above = bearish, and it doubles as a dynamic stop.",
  },
  "Ichimoku Cloud": {
    definition:
      "Ichimoku Kinko Hyo ('one-glance equilibrium chart') is a complete trend system showing support/resistance, momentum and trend direction through five components, the most prominent being the Kumo (cloud).",
    calculation:
      "Tenkan = (9-high + 9-low)/2; Kijun = (26-high + 26-low)/2; Senkou A = (Tenkan+Kijun)/2 plotted 26 ahead; Senkou B = (52-high+52-low)/2 plotted 26 ahead; the cloud is the area between Senkou A and B; Chikou = close plotted 26 behind.",
    howToUse:
      "Price above the cloud = uptrend, below = downtrend, inside = neutral/transition. Tenkan/Kijun crosses give momentum signals; a thick cloud is strong support/resistance; the future cloud color hints at trend bias ahead.",
    whatToLookFor:
      "Cloud breakouts, Tenkan/Kijun crosses, cloud thickness, and Chikou span confirming above/below price.",
    summary:
      "An all-in-one trend system. Above cloud = bullish, below = bearish; cloud thickness = strength of support/resistance.",
  },
  "Stochastic *": {
    definition:
      "The Stochastic Oscillator is a momentum indicator comparing the close to its high-low range over a lookback window, on a 0–100 scale, to identify overbought/oversold momentum extremes.",
    calculation:
      "%K = 100 × (Close − LowestLow) ÷ (HighestHigh − LowestLow) over N periods. %D = SMA of %K (signal line). Defaults commonly 14, 3, 3.",
    howToUse:
      "Above 80 = overbought, below 20 = oversold. %K crossing %D generates signals; trade crossovers in the direction of the larger trend. Divergence flags weakening momentum.",
    whatToLookFor:
      "%K/%D crossovers in overbought/oversold zones, divergence with price, and the oscillator embedding (staying >80 or <20) during strong trends.",
    summary:
      "A 0–100 range-position momentum gauge. >80 overbought, <20 oversold; %K/%D crossovers and divergence are the key signals.",
  },
  "OBV": {
    definition:
      "On-Balance Volume (OBV) is a cumulative volume-flow indicator that adds volume on up days and subtracts it on down days to reveal whether volume is confirming price (accumulation vs distribution).",
    calculation:
      "If Close > PrevClose: OBV += Volume. If Close < PrevClose: OBV −= Volume. Unchanged: OBV holds. The result is a running total whose direction matters more than its absolute value.",
    howToUse:
      "Rising OBV confirms buying pressure behind an uptrend; falling OBV confirms selling. The most valuable use is divergence: OBV making new highs/lows ahead of price often leads the move.",
    whatToLookFor:
      "OBV/price divergence, OBV trendline breaks, and OBV confirming (or failing to confirm) price breakouts.",
    summary:
      "Cumulative volume flow. Confirms trends and, via divergence, often leads price turns.",
  },
  "Volume Profile *": {
    definition:
      "Volume Profile displays traded volume horizontally across price levels rather than over time, revealing where the most activity (and therefore the strongest support/resistance) occurred.",
    calculation:
      "Volume is bucketed by price level over the chosen range. The Point of Control (POC) is the price with the highest volume; the Value Area (typically 70% of volume) spans the Value Area High (VAH) and Value Area Low (VAL).",
    howToUse:
      "High-volume nodes (HVN) act as magnets and strong support/resistance; low-volume nodes (LVN) are areas price moves through quickly. Trade reactions at the POC, VAH and VAL; use value-area migration to read auction direction.",
    whatToLookFor:
      "POC tests, value-area breakouts/acceptance, high-volume nodes as S/R, and low-volume gaps as fast-travel zones.",
    summary:
      "Volume by price, not time. POC/VAH/VAL are high-probability support/resistance; HVN = magnets, LVN = fast zones.",
  },
};

// ── Category-aware fallback ────────────────────────────────────────────────
const CATEGORY_FALLBACK: Record<string, Omit<IndicatorInfo, "definition">> = {
  Trend: {
    calculation:
      "Derived from smoothed price (moving averages, channels or regression) so the line(s) lag price by design — the trade-off that filters noise to expose direction.",
    howToUse:
      "Read direction and slope: price holding above a rising overlay is bullish, below a falling one is bearish. Use the lines as dynamic support/resistance and crossovers as trade triggers.",
    whatToLookFor:
      "Slope changes, price reclaiming/losing the line, crossovers, and the indicator flattening as a sign the trend is stalling.",
    summary:
      "A trend-direction tool. Trade with its slope; use its levels as dynamic support/resistance.",
  },
  Momentum: {
    calculation:
      "Compares recent price change (or close-vs-range) over a lookback window to produce an oscillator, usually bounded, that leads or coincides with price turns.",
    howToUse:
      "Identify overbought/oversold extremes and momentum shifts. Trade signals in the direction of the larger trend; treat divergence with price as an early reversal warning.",
    whatToLookFor:
      "Overbought/oversold readings, signal-line or zero-line crosses, and divergence between the oscillator and price.",
    summary:
      "A momentum oscillator. Watch extremes, crossovers, and especially divergence with price.",
  },
  Volume: {
    calculation:
      "Built from traded volume — cumulatively, by price level, or weighted into price — to expose the conviction (participation) behind a move.",
    howToUse:
      "Confirm price moves with volume: breakouts and trends backed by rising volume are more reliable. Spot accumulation/distribution and high-activity price levels that act as support/resistance.",
    whatToLookFor:
      "Volume confirming or diverging from price, volume spikes at turning points, and high-volume price levels as support/resistance.",
    summary:
      "A participation/conviction gauge. Use it to confirm moves and locate volume-based support/resistance.",
  },
  Volatility: {
    calculation:
      "Measures the dispersion or range of price (standard deviation, true range or channel width) to quantify how much the market is moving, independent of direction.",
    howToUse:
      "Size stops and targets to current volatility, anticipate breakouts after volatility contraction (squeezes), and gauge whether conditions favor trend-following or mean-reversion.",
    whatToLookFor:
      "Contraction (coiling before breakouts), expansion (volatility events), and using the readings to set volatility-adjusted stops.",
    summary:
      "A volatility gauge (no direction). Drives stop placement and breakout anticipation.",
  },
  Pivots: {
    calculation:
      "Calculated from the prior period's high, low and close to project objective support and resistance levels for the current period.",
    howToUse:
      "Use the central pivot as the day's bias line and R1–R3 / S1–S3 as pre-defined reaction zones for entries, targets and stops.",
    whatToLookFor:
      "Reactions at pivot levels, the central pivot as intraday bias, and clusters of pivots aligning with other support/resistance.",
    summary:
      "Objective, math-derived support/resistance levels for the session. Central pivot = bias; R/S levels = reaction zones.",
  },
  "Order Flow": {
    calculation:
      "Aggregates executed trades, bid/ask activity or delta to reveal real-time buying vs selling pressure beneath the candles.",
    howToUse:
      "Read who is in control: persistent buying (positive delta) supports longs, selling (negative delta) supports shorts. Spot absorption, imbalances and large prints at key levels.",
    whatToLookFor:
      "Delta divergence, absorption at support/resistance, large block prints, and bid/ask imbalances ahead of moves.",
    summary:
      "A real-time buying-vs-selling-pressure read. Confirms intent behind price at key levels.",
  },
};

const GENERIC_FALLBACK: Omit<IndicatorInfo, "definition"> = {
  calculation:
    "Computed from price and/or volume over a configurable lookback window to transform raw data into an actionable signal.",
  howToUse:
    "Combine it with price action and at least one other non-correlated indicator for confirmation rather than trading its signals in isolation.",
  whatToLookFor:
    "Confirmation or divergence versus price, behavior at key support/resistance, and signal reliability across different market regimes.",
  summary:
    "Best used as confirmation alongside price action and complementary tools — not as a standalone trigger.",
};

function findAuthored(name: string): Author | null {
  const lower = name.toLowerCase();
  // exact match first
  for (const key of Object.keys(AUTHORED)) {
    if (!key.endsWith("*") && key.toLowerCase() === lower) return AUTHORED[key];
  }
  // prefix match (key like "EMA *")
  for (const key of Object.keys(AUTHORED)) {
    if (key.endsWith("*")) {
      const prefix = key.slice(0, -1).trim().toLowerCase();
      if (lower.startsWith(prefix)) return AUTHORED[key];
    }
  }
  return null;
}

export function getIndicatorInfo(
  name: string,
  cat: string,
  desc: string,
): IndicatorInfo {
  const authored = findAuthored(name);
  const base = CATEGORY_FALLBACK[cat] ?? GENERIC_FALLBACK;
  if (authored) {
    return {
      definition:    authored.definition,
      calculation:   authored.calculation   ?? base.calculation,
      howToUse:      authored.howToUse       ?? base.howToUse,
      whatToLookFor: authored.whatToLookFor  ?? base.whatToLookFor,
      summary:       authored.summary        ?? base.summary,
    };
  }
  // Structured fallback — still rich and multi-section, never a single line.
  const article = /^[aeiou]/i.test(cat) ? "an" : "a";
  return {
    definition:
      `${name} is ${article} ${cat.toLowerCase()} indicator. ${desc}. It is used to interpret market structure and to support trade decisions within the ${cat.toLowerCase()} category.`,
    ...base,
  };
}
