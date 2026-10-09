/**
 * THE CONNECTIONS PAGE FOR A MEMBER (2026-10-09).
 *
 * Any member reaches /readiness from the Depth sheet's "Check connections →".
 * The operator's view of that page counts configured providers and present
 * variable names — the operator's working vocabulary. A member is owed a
 * different answer to the same question: WHICH MARKETS AND BROKERS CAN I USE
 * HERE, AND IN WHAT STATE — in trader words, with no count of anything the
 * operator set up and no variable name.
 *
 * Read from the audience-trimmed readiness payload (provider, lane, status
 * only). Claims no more than that payload knows: "set up on WM Pro" is
 * presence, never "connected" or "live".
 *
 * PURE.
 */
export interface MemberProviderFact {
  readonly provider: string;
  readonly label: string;
  readonly lane: string;
  readonly status: string;
}

export interface MemberConnectionRow {
  readonly provider: string;
  readonly name: string;
  readonly group: "Market data" | "Brokers" | "Live rooms";
  readonly state: string;
  readonly available: boolean;
}

export interface MemberConnections {
  readonly headline: string;
  readonly rows: readonly MemberConnectionRow[];
  readonly brokerLine: string;
}

/** A trader's name for each provider (the operator's label can carry setup words). */
const NAME: Readonly<Record<string, string>> = {
  "webull-data": "Webull market data",
  "webull-broker": "Webull",
  tastytrade: "tastytrade",
  moomoo: "moomoo",
  "longbridge-data": "Longbridge market data",
  "alpaca-paper": "Alpaca paper trading",
  "alpaca-live": "Alpaca",
  finnhub: "Finnhub market data",
  polygon: "Symbol search",
  livekit: "Lounge live rooms",
};

export const MEMBER_CONNECTIONS_HEADLINE = "Your charts already run on WM's market data." as const;
export const MEMBER_BROKER_LINE =
  "Linking a brokerage account of your own is not enabled for members yet. The broker accounts on this deployment belong to the operator and are never shown to you." as const;

const plainLabel = (label: string) => label.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();

export function memberConnections(providers: readonly MemberProviderFact[] | null | undefined): MemberConnections {
  const rows = (providers ?? []).map((p): MemberConnectionRow => {
    const setUp = p.status === "CONFIGURED";
    const name = NAME[p.provider] ?? plainLabel(p.label);
    if (p.lane === "broker") {
      return { provider: p.provider, name, group: "Brokers", available: false, state: "The operator's own account — not available to members" };
    }
    if (p.lane === "market-data") {
      return {
        provider: p.provider, name, group: "Market data", available: setUp,
        state: setUp ? "Set up on WM Pro — it can supply your charts when its feed is answering" : "Not set up on WM Pro right now — your charts use WM's other sources",
      };
    }
    return { provider: p.provider, name, group: "Live rooms", available: setUp, state: setUp ? "Set up on WM Pro" : "Not set up on WM Pro right now" };
  });
  const order = { "Market data": 0, Brokers: 1, "Live rooms": 2 } as const;
  return {
    headline: MEMBER_CONNECTIONS_HEADLINE,
    rows: [...rows].sort((a, b) => order[a.group] - order[b.group] || a.name.localeCompare(b.name)),
    brokerLine: MEMBER_BROKER_LINE,
  };
}

/** Words a member's Connections view must never carry. */
export const MEMBER_CONNECTIONS_FORBIDDEN = /providers configured|required names|runtime stores|\b\d+\s*\/\s*\d+\b|\b[A-Z][A-Z0-9]{2,}_[A-Z0-9_]{2,}\b|OpenD|bridge|host secret|env/i;
