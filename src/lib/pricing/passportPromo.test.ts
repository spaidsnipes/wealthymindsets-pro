import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { passportPromo, passportPromoLine } from "./passportPromo";

describe("Holiday special — WM Pro Premium first month half off through Dec 25 2026 11:59 PM CT", () => {
  const now = Date.UTC(2026, 9, 25, 12);
  it("unset end date → the holiday deadline, stated plainly", () => {
    expect(passportPromoLine(passportPromo(undefined, now))).toBe("Holiday special: your first month of WM Pro Premium is $10 (half off) when you subscribe by December 25, 2026, 11:59 PM CT. Then $20/month until you cancel.");
  });
  it("disappears by itself after Dec 25 2026 11:59 PM CT (CST, UTC−6)", () => {
    expect(passportPromo(undefined, Date.UTC(2026, 11, 26, 5, 59, 59)).active).toBe(true);
    expect(passportPromo(undefined, Date.UTC(2026, 11, 26, 6, 0, 0)).active).toBe(false);
    expect(passportPromoLine(passportPromo(undefined, Date.UTC(2027, 0, 1)))).toBeNull();
  });
  it("configuration can end it earlier (end of that day in Central), never extend it", () => {
    expect(passportPromoLine(passportPromo("2026-11-30", now))).toBe("Holiday special: your first month of WM Pro Premium is $10 (half off) when you subscribe by November 30, 2026, 11:59 PM CT. Then $20/month until you cancel.");
    expect(passportPromo("2026-11-30", Date.UTC(2026, 11, 1, 5, 59, 59)).active).toBe(true);
    expect(passportPromo("2026-11-30", Date.UTC(2026, 11, 1, 6, 0, 0)).active).toBe(false);
    expect(passportPromo("2027-03-01", Date.UTC(2026, 11, 26, 6)).active).toBe(false);
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
