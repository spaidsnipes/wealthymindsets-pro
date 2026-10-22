import type { Metadata } from "next";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
// Plate 36 (Garden 19): WM Pro owns its trading OS only; the shop is a WOW OS place.
export const metadata: Metadata = { title: "WOW Shop" };

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
