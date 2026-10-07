import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { passportPromo, passportPromoLine } from "./passportPromo";

describe("Passport intro offer — first month half off until the promotion ends", () => {
  const now = Date.UTC(2026, 9, 6, 12);
  it("unset end date → limited time, no invented deadline", () => {
    expect(passportPromoLine(passportPromo(undefined, now))).toBe("Intro offer: your first month is $10 (half off), for a limited time — then $20/month.");
  });
  it("runs through the stated day, then disappears", () => {
    expect(passportPromoLine(passportPromo("2026-10-31", now))).toBe("Intro offer: your first month is $10 (half off), through October 31, 2026 — then $20/month.");
    expect(passportPromo("2026-10-31", Date.UTC(2026, 10, 1, 0, 0, 1)).active).toBe(false);
    expect(passportPromo("2026-10-05", now).active).toBe(false);
  });
  it("a malformed date never extends the offer", () => {
    expect(passportPromo("soon", now).active).toBe(false);
  });
  it("the pricing page shows the line on the Passport tier and keeps billing honest", () => {
    const src = readFileSync(join(__dirname, "../../app/pricing/page.tsx"), "utf8");
    expect(src).toContain("passportPromoLine(passportPromo(process.env.NEXT_PUBLIC_PASSPORT_PROMO_ENDS))");
    expect(src).toContain("Paid plans are not on sale yet.");
  });
});
