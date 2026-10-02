import { describe, expect, it } from "vitest";
import { studyNext } from "./studyRoute";
import type { LedgerEdge } from "@/lib/broker/ledgerEdge";

const b = (key: string, n: number, expectancy: number, vsOverall: number) => ({ key, n, wins: 0, losses: n, net: expectancy * n, expectancy, winRate: 0, vsOverall, evidence: n >= 20 ? "SUPPORTED" as const : "INSUFFICIENT EVIDENCE" as const });

describe("Personal Edge → Academy — only supported, only negative, only real lessons", () => {
  it("routes the heaviest supported drags to the nearest real lesson, never thin groups", () => {
    const edge = { universe: 500, overallExpectancy: -3, daily: {} as never, dimensions: [
      { id: "hold", title: "Hold time", question: "", buckets: [b("1 h – 1 day", 54, -16, -13), b("> 1 day", 17, -40, -37)] },
      { id: "attempt", title: "Attempt", question: "", buckets: [b("1st trade of the day", 238, -4.3, -1.4), b("3rd trade of the day", 130, -0.8, 2.1)] },
      { id: "dte", title: "DTE", question: "", buckets: [b("3–7 DTE", 28, -8.8, -5.9)] },
    ] } as unknown as LedgerEdge;
    const s = studyNext(edge);
    expect(s.map(x => [x.bucket.key, x.lesson?.id ?? null])).toEqual([["1 h – 1 day", "clc-6"], ["1st trade of the day", "clc-5"], ["3–7 DTE", null]]);
  });
});
