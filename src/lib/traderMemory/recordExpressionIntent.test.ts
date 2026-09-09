import { describe, it, expect, vi } from "vitest";
import { recordExpressionIntent } from "./recordExpressionIntent";
import type { DecisionId } from "./decisionIdentity";

const input = { decisionId: "wmd_test" as DecisionId, deviceId: "device", intent: "Review TSLA call; no order requested" };
const response = (body: unknown, status = 200) => Response.json(body, { status });
const projected = (intent = input.intent) => response({ status: "PROJECTED", position: { decisionId: input.decisionId, reconVersion: 1, intent } });

describe("expression intent shared-authority recovery", () => {
  it("only writes after authoritative absence and keeps broker fields out", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response({ status: "NOT_RECORDED" })).mockResolvedValueOnce(response({ verdict: "ACCEPT" }));
    expect((await recordExpressionIntent(input, fetcher, new AbortController().signal, "owner-one")).recorded).toBe(true);
    const write = JSON.parse(String(fetcher.mock.calls[1][1]?.body));
    expect(write).toEqual({ ...input, role: "CLIENT_INTENT", baseReconVersion: 0 });
  });
  it("recovers a lost write acknowledgement without a duplicate POST", async () => {
    const first = vi.fn<typeof fetch>().mockResolvedValueOnce(response({ status: "NOT_RECORDED" })).mockRejectedValueOnce(new Error("lost ACK"));
    expect((await recordExpressionIntent(input, first, new AbortController().signal, "owner-one")).recorded).toBe(false);
    const retry = vi.fn<typeof fetch>().mockResolvedValueOnce(projected());
    expect((await recordExpressionIntent(input, retry, new AbortController().signal, "owner-one")).recorded).toBe(true);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry.mock.calls[0][1]?.method).not.toBe("POST");
  });
  it.each([401, 503])("does not write when the shared record cannot be read (%s)", async status => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response({ status: "UNVERIFIED" }, status));
    expect((await recordExpressionIntent(input, fetcher, new AbortController().signal, "owner-one")).recorded).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refuses mismatched intent instead of overwriting an existing decision", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(projected("another intent"));
    expect((await recordExpressionIntent(input, fetcher, new AbortController().signal, "owner-one")).recorded).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not write after selection cancellation even if the read resolves", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => { controller.abort(); return response({ status: "NOT_RECORDED" }); });
    expect((await recordExpressionIntent(input, fetcher, controller.signal, "owner-one")).recorded).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
