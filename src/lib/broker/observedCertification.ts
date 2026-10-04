/**
 * OBSERVED CERTIFICATION — the brokers whose stages can be read from a real,
 * durable, timestamped observation instead of `adapter.health()`'s
 * never-probing booleans. Keyed by broker id so the routes stay generic (no
 * broker name is typed in /api/broker/status or /certification).
 *
 * A broker absent here keeps the health()-derived answer, unchanged.
 */
import type { BrokerId } from "./BrokerAdapter";
import type { CertStageReport } from "./certification";
import { webullConnectedFromKeeper, webullStagesFromKeeper } from "./webullKeeperCertification";
import { readWebullKeeperRecord } from "../marketData/webullSessionKeeperJob";
import { webullWorkerEnv } from "../marketData/webullSessionStore";
import { getTastytradeAccounts, getTastytradeCapabilities, getTastytradePositions, getTastytradeQuoteToken, ttGet } from "../tastytrade";
import { planMarketDataByTypeQuery } from "../marketData/tastytradeByType";
import { tastytradeOwnerGate } from "./brokerOwner";
import { webullOwnerGate } from "./webullOwner";

export interface ObservedCertification {
  readonly reports: CertStageReport[];
  /** null = no fresh observation (UNKNOWN), never a guessed false. */
  readonly connected: boolean | null;
}

/** Who is asking. A broker's live session is the OWNER's truth (Garden 16 §35). */
export interface ObserverContext {
  readonly userId?: string | null;
}

type Observer = (nowMs: number, ctx: ObserverContext) => Promise<ObservedCertification | null>;

const OBSERVERS: Partial<Record<BrokerId, Observer>> = {
  // Guest audit 2026-10-04: this observer ignored WHO asked, so every
  // signed-in trader read "Your broker is connected — webull READ_ONLY" from
  // the Founder's keeper. Owner only, like tastytrade below.
  webull: async (nowMs, ctx) => {
    if (!ctx.userId || !webullOwnerGate(ctx.userId, process.env).allowed) return null;
    const record = await readWebullKeeperRecord(await webullWorkerEnv()).catch(() => null);
    return { reports: webullStagesFromKeeper(record, nowMs), connected: webullConnectedFromKeeper(record, nowMs) };
  },
  // tastytrade (2026-10-03): /api/broker/status said "connected: false —
  // wrapped for health only" while /api/broker/tastytrade/status, on the same
  // host, proved a live session with 2 accounts. The aggregate now reads the
  // same capability probe — for the OWNER only; anyone else keeps the health()
  // answer, because the Founder's broker session is not theirs to see.
  tastytrade: async (nowMs, ctx) => {
    if (!ctx.userId || !tastytradeOwnerGate(ctx.userId, process.env).allowed) return null;
    if (ttMemo && nowMs - ttMemo.at < TT_TTL_MS) return ttMemo.value;
    const value = await observeTastytrade(nowMs);
    if (value) ttMemo = { at: nowMs, value };
    return value;
  },
};

// Every stage below is a REAL read made now — a session, an account list, a
// per-symbol quote, positions on every account, and the market-data level
// tastytrade states with the quote token. Held 5 min so /api/broker/status
// does not re-ask tastytrade on every page that reads it.
const TT_TTL_MS = 5 * 60_000;
let ttMemo: { at: number; value: ObservedCertification } | null = null;

async function observeTastytrade(nowMs: number): Promise<ObservedCertification | null> {
  const observedAt = new Date(nowMs).toISOString();
  const caps = await getTastytradeCapabilities().catch(() => null);
  if (!caps) return null;
  const reports: CertStageReport[] = [
    { stage: "auth", status: caps.connected ? "PASS" : "FAIL", note: caps.connected ? "tastytrade session acquired (capability probe)." : "tastytrade session not acquired.", observedAt },
  ];
  if (!caps.connected) return { reports, connected: false };
  reports.push({ stage: "account_discovery", status: caps.accounts > 0 ? "PASS" : "FAIL", note: `${caps.accounts} account(s) listed.`, observedAt });

  const token = await getTastytradeQuoteToken().catch(() => null);
  reports.push(token
    ? { stage: "capabilities", status: "PASS", note: `Market-data entitlement stated by tastytrade with the quote token: level ${token.level ?? "unstated"}.`, observedAt }
    : { stage: "capabilities", status: "FAIL", note: "tastytrade issued no quote token, so no market-data entitlement was stated.", observedAt });

  const plan = planMarketDataByTypeQuery({ equity: ["SPY"] });
  const md = plan.path ? await ttGet<{ data?: { items?: unknown[] } }>(plan.path).catch(() => null) : null;
  const mdItems = md?.data?.items?.length ?? 0;
  reports.push(mdItems > 0
    ? { stage: "read_market_data", status: "PASS", note: `Per-symbol market-data read answered (SPY, ${mdItems} item).`, observedAt }
    : { stage: "read_market_data", status: "FAIL", note: "Per-symbol market-data read (SPY) returned nothing.", observedAt });

  const accounts = await getTastytradeAccounts().catch(() => []);
  const reads = await Promise.all(accounts.map(a => getTastytradePositions(a.accountNumber).then(p => p.length).catch(() => null)));
  const ok = reads.filter((n): n is number => n != null);
  reports.push(accounts.length > 0 && ok.length === accounts.length
    ? { stage: "read_account_state", status: "PASS", note: `Positions read on ${ok.length} account(s) (${ok.reduce((a, b) => a + b, 0)} open).`, observedAt }
    : { stage: "read_account_state", status: ok.length ? "PENDING" : "FAIL", note: `Positions read on ${ok.length} of ${accounts.length} account(s).`, observedAt });

  return { reports, connected: true };
}

export async function observedCertification(id: BrokerId, nowMs: number, ctx: ObserverContext = {}): Promise<ObservedCertification | null> {
  const o = OBSERVERS[id];
  return o ? o(nowMs, ctx) : null;
}
