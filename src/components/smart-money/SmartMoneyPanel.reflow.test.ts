import { describe, expect, it } from "vitest";
import { getSmartMoneyPanelLayout } from "./smartMoneyLayout";

describe("Smart Money responsive panel layout", () => {
  it.each([1920, 1440, 1024])("keeps desktop drawer below both chart toolbars at %ipx", width => {
    expect(getSmartMoneyPanelLayout(width)).toEqual({
      modal: false,
      top: 172,
      height: "calc(100dvh - 172px)",
    });
  });

  it.each([834, 390, 360])("uses a modal sheet below global chrome at %ipx", width => {
    expect(getSmartMoneyPanelLayout(width)).toEqual({
      modal: true,
      top: 64,
      height: "calc(100dvh - 64px)",
    });
  });
});
