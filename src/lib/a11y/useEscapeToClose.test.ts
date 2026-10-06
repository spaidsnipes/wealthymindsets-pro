import { describe, expect, it, vi } from "vitest";
import { restoreFocusTo } from "./useEscapeToClose";

describe("focus returns to the opener when a popover closes (ATHOS §5)", () => {
  const body = { isConnected: true };
  const el = () => ({ isConnected: true, focus: vi.fn() });

  it("focus lost with the popover (on body / detached) → back to the opener", () => {
    const opener = el();
    expect(restoreFocusTo(opener, { activeElement: body, body })).toBe(true);
    expect(opener.focus).toHaveBeenCalledWith({ preventScroll: true });
    const o2 = el();
    expect(restoreFocusTo(o2, { activeElement: { isConnected: false }, body })).toBe(true);
  });

  it("never steals focus the trader moved elsewhere, and never focuses a gone or absent opener", () => {
    const opener = el();
    expect(restoreFocusTo(opener, { activeElement: el(), body })).toBe(false);
    expect(opener.focus).not.toHaveBeenCalled();
    expect(restoreFocusTo({ isConnected: false, focus: vi.fn() }, { activeElement: body, body })).toBe(false);
    expect(restoreFocusTo(null, { activeElement: body, body })).toBe(false);
    expect(restoreFocusTo(body, { activeElement: body, body })).toBe(false);
  });
});
