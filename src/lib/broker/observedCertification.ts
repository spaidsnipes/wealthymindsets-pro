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

export interface ObservedCertification {
  readonly reports: CertStageReport[];
  /** null = no fresh observation (UNKNOWN), never a guessed false. */
  readonly connected: boolean | null;
}

const OBSERVERS: Partial<Record<BrokerId, (nowMs: number) => Promise<ObservedCertification>>> = {
  webull: async (nowMs) => {
    const record = await readWebullKeeperRecord(await webullWorkerEnv()).catch(() => null);
    return { reports: webullStagesFromKeeper(record, nowMs), connected: webullConnectedFromKeeper(record, nowMs) };
  },
};

export async function observedCertification(id: BrokerId, nowMs: number): Promise<ObservedCertification | null> {
  const o = OBSERVERS[id];
  return o ? o(nowMs) : null;
}
