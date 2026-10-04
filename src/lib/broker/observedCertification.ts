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
import { getTastytradeCapabilities } from "../tastytrade";
import { tastytradeOwnerGate } from "./brokerOwner";

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
  webull: async (nowMs) => {
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
    const caps = await getTastytradeCapabilities().catch(() => null);
    if (!caps) return null;
    const observedAt = new Date(nowMs).toISOString();
    const reports: CertStageReport[] = [
      { stage: "auth", status: caps.connected ? "PASS" : "FAIL", note: caps.connected ? "tastytrade session acquired (capability probe)." : "tastytrade session not acquired.", observedAt },
    ];
    if (caps.connected) {
      reports.push({ stage: "account_discovery", status: caps.accounts > 0 ? "PASS" : "FAIL", note: `${caps.accounts} account(s) listed.`, observedAt });
    }
    return { reports, connected: caps.connected };
  },
};

export async function observedCertification(id: BrokerId, nowMs: number, ctx: ObserverContext = {}): Promise<ObservedCertification | null> {
  const o = OBSERVERS[id];
  return o ? o(nowMs, ctx) : null;
}
