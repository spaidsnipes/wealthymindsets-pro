import * as React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OptionDecisionReceiptAnswer } from "./OptionDecisionReceipt";
import type { DecisionProjection } from "@/lib/traderMemory/projectDecision";

const projected: DecisionProjection = { status: "PROJECTED", note: "Account readback", position: {
  decisionId: "same-decision", reconVersion: 1, intent: "Review TSLA", intentDeviceId: "device",
  quantityFilled: null, quantityProtected: null, executionState: null, protectionState: null,
} };
const render = (answer: DecisionProjection | null) => renderToStaticMarkup(<OptionDecisionReceiptAnswer answer={answer} />);

describe("option scene shared decision readback", () => {
  it("makes no account claim before a read", () => expect(render(null)).toBe(""));
  it("does not manufacture execution, fills or protection from recorded intent", () => {
    const html = render(projected);
    expect(html).toContain("On account record");
    expect(html.match(/Not observed/g)).toHaveLength(4);
    expect(html).toContain("does not certify a live position");
    expect(html).toContain("same-decision");
  });
  it("preserves authoritative zero distinctly from absence", () => {
    const html = render({ ...projected, position: { ...projected.position!, quantityFilled: 0, quantityProtected: 0 } });
    expect(html.match(/<dd>0<\/dd>/g)).toHaveLength(2);
    expect(html.match(/Not observed/g)).toHaveLength(2);
  });
  it.each(["UNVERIFIED", "NOT_RECORDED", "SIGNED_OUT"] as const)("%s cannot render a stale position body", status => {
    const html = render({ ...projected, status, note: status });
    expect(html).toContain(status);
    expect(html).not.toContain("Filled quantity");
    expect(html).not.toContain("Review TSLA");
  });
  it("escapes recorded intent rather than executing markup", () => {
    const html = render({ ...projected, position: { ...projected.position!, intent: "<script>alert(1)</script>" } });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
