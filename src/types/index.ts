// ─── Market Data ──────────────────────────────────────────────────────────────
export interface OHLCVBar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderFlowData {
  aggressiveBuy: number;
  aggressiveSell: number;
  passiveBid: number;
  passiveAsk: number;
  delta: number;
  imbalance: number;
  isImbalance: boolean;
  absorption: boolean;
}

export interface DOMLevel {
  price: number;
  bidSize: number;
  askSize: number;
  isLiquidityWall: boolean;
}

// ─── Smart Money Signals ──────────────────────────────────────────────────────
export type SignalStrength = "strong" | "moderate" | "weak" | "neutral";
export type MarketRegime = "trending-up" | "trending-down" | "ranging" | "reversal";
export type WyckoffPhase = "A" | "B" | "C" | "D" | "E";

export interface SmartMoneySignal {
  id: string;
  name: string;
  value: string;
  strength: SignalStrength;
  bullish: boolean | null;
  description?: string;
  timestamp: number;
}

// ─── User / Creator Economy ───────────────────────────────────────────────────
export type SubscriptionTier = "basic" | "creator" | "pro";

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  tier: SubscriptionTier;
  verified: boolean;
  followers: number;
  following: number;
  avatarColor: string;
  bio?: string;
}

// ─── Social ───────────────────────────────────────────────────────────────────
export interface Post {
  id: string;
  userId: string;
  content: string;
  tags: string[];
  likes: number;
  comments: number;
  shares: number;
  timestamp: number;
  tradeCard?: TradeCard;
  musicAttachment?: MusicTrack;
}

export interface TradeCard {
  symbol: string;
  direction: "LONG" | "SHORT";
  entry: string;
  target: string;
  stop: string;
  rr: string;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  plays: number;
  streamUrl?: string;
}
