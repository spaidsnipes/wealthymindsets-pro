import type { Metadata } from "next";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
// Plate 36 (Garden 19): there is no Wealthy Mindsets Lounge; this is the WOW OS place, opened inside WM Pro.
export const metadata: Metadata = { title: "WOW Lounge" };

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
