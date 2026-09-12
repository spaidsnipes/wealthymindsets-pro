/**
 * "NO ADAPTER" AND "ADAPTER NEVER PROBED" MUST NOT LOOK IDENTICAL.
 *
 * ── The measured defect ──────────────────────────────────────────────────────
 *
 * `deriveReports` in ./route.ts returns:
 *   · `[]`                          when the adapter reports implemented=false
 *   · `[{auth, PENDING}]`           when it is implemented but unprobed
 *
 * `computeCertificationLevel` then maps BOTH onto the same result — level
 * `NONE`, zero passed, zero failed, zero blocked, all twelve stages pending.
 * Before this Sentinel the ONLY surviving difference in the shipped payload was
 * the freeform `note` string, which is English prose. A consumer that wanted to
 * branch on it would have to string-match sentences the adapter authors are
 * free to rewrite.
 *
 * ── Why the collapse is dangerous rather than merely lossy ───────────────────
 *
 * The two states have OPPOSITE remedies:
 *   · implemented=false → nobody has written the integration. Engineering work.
 *   · implemented=true, unprobed → the code exists and the cert harness has
 *     never been pointed at it. Harness work.
 *
 * A certification surface that renders both as "NONE · 0/12 stages passed"
 * sends the Founder at the wrong job, and does it wearing a number that looks
 * measured. That is PACKET_IDENTITY_LOSS: the producer HELD the distinguishing
 * fact — `route.ts` computes `implemented` and used to discard it on the very
 * next line — and the consumer had no way to recover it.
 *
 * ── What this test does NOT claim ────────────────────────────────────────────
 *
 * It does not claim the twelve stages are measured. They are not; they remain
 * PENDING for every broker until a live cert harness runner exists. This guards
 * only that the payload can still tell the two ZERO states apart.
 */

import { describe, it, expect, vi } from "vitest";
import type { BrokerAdapter, BrokerHealth } from "@/lib/broker/BrokerAdapter";

vi.mock("@/lib/requireAuth", () => ({
  requireAuth: vi.fn(async () => ({ ok: true, user: { sub: "u1" } })),
}));

/**
 * Two adapters that differ ONLY in `implemented`. Everything else about them —
 * env, connection, and the fact that nothing has ever probed a cert stage — is
 * deliberately held identical, so any difference this test observes downstream
 * is attributable to that one field and nothing else.
 */
const HEALTH: Record<"absent" | "unprobed", BrokerHealth> = {
  absent: {
    implemented: false,
    envConfigured: false,
    connected: false,
    note: "No adapter shipped for this provider yet.",
  },
  unprobed: {
    implemented: true,
    envConfigured: false,
    connected: false,
    note: "Adapter shipped; credentials absent.",
  },
};

function stubAdapter(id: string, health: BrokerHealth): BrokerAdapter {
  return { id, health: () => health } as unknown as BrokerAdapter;
}

vi.mock("../../../../lib/broker/adapters", () => ({
  listAdapters: () => [
    stubAdapter("alpaca", HEALTH.absent),
    stubAdapter("webull", HEALTH.unprobed),
  ],
  getAdapter: () => null,
  hasAdapter: () => false,
}));

import { GET, type BrokerCertificationResponse } from "./route";

async function read(): Promise<BrokerCertificationResponse> {
  const response = await GET(new Request("http://localhost/api/broker/certification"));
  expect(response.status).toBe(200);
  return (await response.json()) as BrokerCertificationResponse;
}

describe("broker certification keeps 'no adapter' distinct from 'never probed'", () => {
  it("both states really do produce an identical twelve-pending stage set", async () => {
    // The premise, asserted rather than assumed. If a future change starts
    // deriving different stages for these two cases, this expectation fails and
    // whoever reads it learns the collapse below is no longer the thing being
    // guarded — instead of the guard quietly becoming decorative.
    const body = await read();
    const [absent, unprobed] = body.brokers;
    for (const b of [absent, unprobed]) {
      expect(b.certLevel).toBe("NONE");
      expect(b.passedStages).toEqual([]);
      expect(b.failedStages).toEqual([]);
      expect(b.blockedStages).toEqual([]);
      expect(b.pendingStages).toHaveLength(12);
    }
    expect(absent.summary).toBe(unprobed.summary);
  });

  it("carries `implemented` so the two zero states are structurally separable", async () => {
    const body = await read();
    const byId = Object.fromEntries(body.brokers.map((b) => [b.brokerId, b]));

    expect(
      byId.alpaca.implemented,
      "a broker with NO adapter reports implemented=true — the cert surface will " +
        "tell the Founder to run a harness against code that does not exist",
    ).toBe(false);

    expect(
      byId.webull.implemented,
      "a broker whose adapter IS shipped reports implemented=false — the cert " +
        "surface will send the Founder to write an integration that is already written",
    ).toBe(true);
  });

  it("the distinction survives without reading the freeform note prose", async () => {
    const body = await read();
    // Strip the one field that was already different, then prove the payloads
    // are STILL distinguishable. This is the whole point: before `implemented`
    // existed, deleting `note` made the two brokers byte-identical apart from
    // their id, and no structured consumer could branch.
    const shape = (b: BrokerCertificationReport) => {
      const { brokerId: _id, note: _note, ...rest } = b;
      return JSON.stringify(rest);
    };
    const [absent, unprobed] = body.brokers;
    expect(
      shape(absent),
      "with the note prose removed the two states are byte-identical — a consumer " +
        "can only tell them apart by string-matching English an adapter author is " +
        "free to reword",
    ).not.toBe(shape(unprobed));
  });
});

type BrokerCertificationReport = BrokerCertificationResponse["brokers"][number];
