import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WebullOrderPreviewRow } from "@/components/chart/WebullOrderPreviewRow";
import { RiskReceiptBar } from "@/components/chart/RiskReceiptBar";

/** TAGS OFF — what a trader actually reads. */
const visible = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const LONG_PLAN = { side: "LONG" as const, entry: 100.25, decisionId: "DEC-1" };

/*
  Found on /charts 2026-09-26 (audit at 3ff5cd7): with a Long plan drawn, the
  Risk Receipt bar offered an ENABLED "Preview buy 1 ES1! @ 100.25" — and the
  same for GC1!, BTCUSD and SPX. Garden 16 §19: UNSUPPORTED MAY NEVER LOOK
  HEALTHY. These render the real component and read the glass.
*/
describe("WebullOrderPreviewRow — only equities get a preview control", () => {
  it.each([
    ["ES1!", "futures"],
    ["GC1!", "futures"],
    ["BTCUSD", "crypto"],
    ["SPX", "an index"],
  ])("%s renders NO preview row at all (L16, Garden 19: one TRADE door carries it)", (symbol) => {
    void 0;
    const html = renderToStaticMarkup(<WebullOrderPreviewRow symbol={symbol} {...LONG_PLAN} />);
    // The healthy-looking control is gone entirely, and so is the second door's refusal.
    expect(html).toBe("");
  });

  it("an equity keeps its enabled preview button, exactly as before", () => {
    const html = renderToStaticMarkup(<WebullOrderPreviewRow symbol="TSLA" {...LONG_PLAN} />);
    expect(visible(html)).toContain("Preview buy 1 TSLA @ 100.25");
    expect(html).toContain('data-testid="webull-preview-button"');
    expect(html).toContain('data-preview-state="IDLE"');
    // Enabled: no `disabled` attribute on the button.
    const button = html.match(/<button[^>]*data-testid="webull-preview-button"[^>]*>/)?.[0] ?? "";
    expect(button).not.toBe("");
    expect(button).not.toMatch(/\sdisabled(=|\s|>)/);
  });

  it("the /charts mount (RiskReceiptBar) shows no Webull preview for a futures plan (L16)", () => {
    const html = renderToStaticMarkup(
      <RiskReceiptBar
        risk={{ drawn: true, reason: null, side: "LONG", entry: 5000.25, stop: 4990 } as never}
        decisionId="DEC-1"
        receipt={null}
        note={null}
        onTear={() => {}}
        symbol="ES1!"
      />,
    );
    expect(html).not.toContain('data-testid="webull-preview-row"');
    expect(visible(html)).not.toContain("Preview at Webull");
  });
});
