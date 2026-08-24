/**
 * BrokerAdapter — canonical contract every broker adapter must satisfy.
 *
 * Founder 2026-08-21 Broker Wiring canon §Broker Golden Path (W2):
 *   "Webull, tastytrade, Alpaca, Finnhub, Polygon, Alpha Vantage,
 *    Yahoo, OANDA, TradeStation, Tradier, IBKR and future sources
 *    terminate at adapters. New provider = new adapter, never a new
 *    UI/domain path."
 *
 * Discovery finding (2026-08-21): the codebase has broker-specific
 * routes and helpers but no single shared contract. Tastytrade
 * ships `src/lib/tastytrade.ts` with its own return shapes; Alpaca
 * ships POST-validation shapes distinct from tastytrade's. The next
 * broker (Webull) will otherwise repeat the divergence.
 *
 * This interface defines the SHAPE every adapter must expose. Real
 * implementations live in `src/lib/broker/adapters/*.ts` and each
 * adapter file's default export must be of type `BrokerAdapter`.
 *
 * PURE TYPE MODULE — no runtime code. Adapters implement; consumers
 * (BrokerExecutionAdapter, order ticket, portfolio surface, Journal
 * Decision Receipt writer) depend on this shape, never on a specific
 * provider's raw return type.
 */

/** Universal broker identifier. Never exposed as market truth. */
export type BrokerId = "webull" | "tastytrade" | "alpaca" | "moomoo" | "oanda" | "tradestation" | "tradier" | "ibkr";

/**
 * Universal order intent. Consumers (chart one-click, paper page,
 * mobile trade sheet) compose one of these; the adapter translates
 * to broker-specific wire format.
 */
export interface UniversalOrderIntent {
  readonly clientOrderId: string;   // idempotency key
  readonly accountId: string;
  readonly symbol: string;
  readonly side: "buy" | "sell";
  readonly type: "market" | "limit" | "stop" | "stop-limit";
  readonly qty: number;
  readonly limitPx?: number;
  readonly stopPx?: number;
  readonly tif?: "day" | "gtc" | "ioc" | "fok";
  /** Adapter reads what it supports; unknown fields must not fabricate defaults. */
  readonly assetClass?: "equity" | "future" | "option" | "crypto" | "fx";
}

/** Canonical account snapshot — normalized across adapters. */
export interface CanonicalAccount {
  readonly accountId: string;
  readonly displayName: string;
  readonly currency: string;
  readonly cash: number;
  readonly equity: number;
  readonly buyingPower: number;
  /** Broker-declared environment marker: paper/live/sandbox. */
  readonly env: "paper" | "live" | "sandbox";
}

/** Canonical order acknowledgement — the adapter returns this after submit. */
export interface CanonicalOrderAck {
  readonly clientOrderId: string;
  readonly brokerOrderId: string | null;   // null when broker hasn't assigned yet
  readonly status: "pending" | "accepted" | "rejected" | "unknown";
  readonly reason?: string;
  readonly acknowledgedAt: string; // ISO 8601
}

/**
 * Adapter capability report — surfaces what THIS broker (for the
 * authenticated account) actually supports. Consumers read this
 * instead of hard-coding capability arrays (canon anti-spaghetti
 * rule W4 ACCOUNT-AWARE CAPABILITY DISCOVERY).
 */
export interface BrokerCapabilities {
  readonly assetClasses: readonly ("equity" | "future" | "option" | "crypto" | "fx")[];
  readonly orderTypes: readonly ("market" | "limit" | "stop" | "stop-limit")[];
  readonly supportsPaper: boolean;
  readonly supportsLive: boolean;
  readonly supportsBracketOrders: boolean;
  readonly supportsShort: boolean;
  /** Free-text broker-declared caveats surfaced to the trader. */
  readonly notes: readonly string[];
}

/**
 * Health report — never returns tokens/secrets. Aggregated by the
 * /api/broker/status endpoint.
 */
export interface BrokerHealth {
  readonly implemented: boolean;
  readonly envConfigured: boolean;
  readonly connected: boolean;
  readonly note: string;
}

/**
 * The contract. Adapters implement these methods. Consumers depend
 * on this interface — never on a raw provider return shape.
 */
export interface BrokerAdapter {
  readonly id: BrokerId;

  /**
   * Cheap synchronous or near-synchronous health snapshot. Must
   * never call the upstream broker; must never read/return secret
   * values. Used by /api/broker/status.
   */
  health(): BrokerHealth;

  /**
   * Authenticated capability discovery. Must return account-aware
   * results — never hard-code assumptions the broker can answer.
   * Throws on auth failure; consumers translate the throw to a
   * truthful UNKNOWN capability state.
   */
  capabilities(accountId: string): Promise<BrokerCapabilities>;

  /**
   * List of authenticated accounts. Empty array = zero accounts
   * (not a failure). Auth failure → throw.
   */
  listAccounts(): Promise<readonly CanonicalAccount[]>;

  /** Single canonical account snapshot. Throws when account unknown. */
  getAccount(accountId: string): Promise<CanonicalAccount>;

  /**
   * Submit an order. MUST honor clientOrderId for idempotency; if
   * the broker rejects a duplicate clientOrderId, return the
   * previous ack instead of a fresh error.
   *
   * Never call this from React components; always through the
   * TradeLine authorization layer.
   */
  submitOrder(intent: UniversalOrderIntent): Promise<CanonicalOrderAck>;

  /** Cancel by client order id. Idempotent. */
  cancelOrder(clientOrderId: string): Promise<CanonicalOrderAck>;
}
