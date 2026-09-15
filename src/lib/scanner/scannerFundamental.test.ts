/**
 * Sentinel — /scanner Mkt Cap + Float.
 *
 * PINNED TO MEANING. Each assertion fails when WM either invents a figure it
 * does not hold, or discards a figure it does.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  abbreviateMagnitude,
  classifyReportedFundamental,
  unaskedFundamental,
  unconfiguredFundamental,
  absentFundamental,
  preferKnownFundamental,
  type FundamentalFigure,
} from "./scannerFundamental";

const cap = (raw: unknown) => classifyReportedFundamental(raw, "Market cap", "AAPL");

describe("classifyReportedFundamental", () => {
  it("states a real figure", () => {
    expect(cap(3.2e12).text).toBe("3.2T");
    expect(cap(4.1e9).text).toBe("4.1B");
    expect(cap(7e6).text).toBe("7M");
    expect(cap(3.2e12).state).toBe("MEASURED");
  });

  it("× THE DEFECT: an unreported figure must NOT be claimed as zero", () => {
    for (const raw of [0, undefined, null, NaN, -1, "3", {}]) {
      const f = cap(raw);
      expect(f.state).toBe("NOT_REPORTED");
      expect(f.text).not.toBe("0");
      expect(f.text).not.toBe("$0");
    }
  });

  it("the NOT_REPORTED reason admits the provider cannot be distinguished", () => {
    expect(cap(0).reason.toLowerCase()).toContain("zero");
    expect(cap(0).reason).toMatch(/not report/i);
  });

  it("NOT_ASKED is a different fact from NOT_REPORTED", () => {
    const a = unaskedFundamental("Float", "AAPL");
    expect(a.state).toBe("NOT_ASKED");
    expect(a.text).not.toBe(cap(0).text);
    expect(a.reason).not.toBe(cap(0).reason);
  });

  it("no state renders a bare glyph", () => {
    const all: FundamentalFigure[] = [
      cap(1e9), cap(0),
      unaskedFundamental("Float", "AAPL"),
      unconfiguredFundamental("Float", "AAPL", ["FMP_KEY"]),
    ];
    for (const f of all) {
      expect(f.text.trim()).not.toBe("—");
      expect(f.text.trim()).not.toBe("-");
      expect(f.text.trim().length).toBeGreaterThan(1);
      expect(f.reason.length).toBeGreaterThan(40);
    }
  });
});

describe("unconfiguredFundamental / absentFundamental", () => {
  const conf = (missing: readonly string[] = ["FMP_KEY"]) =>
    unconfiguredFundamental("Market cap", "AAPL", missing);

  it("× THE DEFECT: a route that SAID why must not be reduced to 'not retrieved'", () => {
    const c = conf();
    const u = unaskedFundamental("Market cap", "AAPL");
    expect(c.state).toBe("NOT_CONFIGURED");
    expect(c.text).not.toBe(u.text);
    expect(c.reason).not.toBe(u.reason);
    // The whole point: it names what the route named.
    expect(c.reason).toContain("FMP_KEY");
  });

  it("× THE FALSE PROMISE: a permanent gap must not imply the next scan fixes it", () => {
    expect(conf().reason).toMatch(/not a gap that the next scan will fill/i);
  });

  it("does not invent a credential name when the route named none", () => {
    expect(conf([]).reason).not.toContain("FMP_KEY");
    expect(conf([]).reason).toMatch(/unnamed credential/i);
  });

  it("absentFundamental routes to the SHARPER fact when one is available", () => {
    expect(absentFundamental("Float", "AAPL", ["FMP_KEY"]).state).toBe("NOT_CONFIGURED");
    expect(absentFundamental("Float", "AAPL", null).state).toBe("NOT_ASKED");
  });

  it("a configuration refusal still never displaces a measured figure", () => {
    expect(preferKnownFundamental(conf(), cap(4.1e9)).text).toBe("4.1B");
  });
});

describe("preferKnownFundamental", () => {
  const measured = cap(4.1e9);
  const notReported = cap(0);
  const notAsked = unaskedFundamental("Market cap", "AAPL");

  it("× THE DEFECT: a refusal must NOT shadow a figure WM already measured", () => {
    expect(preferKnownFundamental(notReported, measured).state).toBe("MEASURED");
    expect(preferKnownFundamental(notReported, measured).text).toBe("4.1B");
    expect(preferKnownFundamental(notAsked, measured).text).toBe("4.1B");
  });

  it("a carried-over figure says that it is carried over", () => {
    expect(preferKnownFundamental(notReported, measured).reason).toMatch(/earlier scan/i);
  });

  it("a fresh measurement always wins", () => {
    const fresher = cap(9e9);
    expect(preferKnownFundamental(fresher, measured).text).toBe("9.0B");
    expect(preferKnownFundamental(fresher, measured).reason).not.toMatch(/earlier scan/i);
  });

  it("two refusals stay a refusal — nothing is invented", () => {
    expect(preferKnownFundamental(notReported, notAsked).state).toBe("NOT_REPORTED");
    expect(preferKnownFundamental(notAsked, undefined).state).toBe("NOT_ASKED");
  });
});

describe("abbreviateMagnitude", () => {
  it("does not lie about scale", () => {
    expect(abbreviateMagnitude(999)).toBe("999");
    expect(abbreviateMagnitude(1e6)).toBe("1M");
    expect(abbreviateMagnitude(1e9)).toBe("1.0B");
  });
});

describe("/scanner page", () => {
  const src = readFileSync(join(process.cwd(), "src/app/scanner/page.tsx"), "utf8");

  it("× THE DEFECT: the glyph must not be stored as a profile value", () => {
    expect(src).not.toMatch(/mktcap:\s*mc\s*>\s*0\s*\?/);
  });

  it("× THE SHADOWING: the merge must not be a `??` chain over strings", () => {
    expect(src).not.toMatch(/float:\s*prf\?\.float\s*\?\?/);
    expect(src).not.toMatch(/mktcap:\s*prf\?\.mktcap\s*\?\?/);
  });

  it("the page routes both figures through the owner", () => {
    expect(src).toContain("preferKnownFundamental");
    expect(src).toContain("classifyReportedFundamental");
    expect(src).toContain("absentFundamental");
  });

  it("× THE DISCARDED DIAGNOSIS: a refused fetch must not drop the route's reason", () => {
    // `if (!res.ok) return map;` threw away a 503 body that said
    // `{ edge: "NOT CONFIGURED", missing: [...] }` — a `—` in control flow.
    expect(src).not.toMatch(/if\s*\(!res\.ok\)\s*return\s+map;/);
    expect(src).toContain('body?.edge === "NOT CONFIGURED"');
  });
});
