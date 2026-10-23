import type { Metadata } from "next";
import LoungeForward from "@/components/lounge/LoungeForward";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
// Plate 36 (Garden 19): there is no Wealthy Mindsets Lounge; this is the WOW OS place, opened inside WM Pro.
export const metadata: Metadata = { title: "WOW Lounge" };

// One Lounge (Oct 22): WM Pro's Lounge door IS the WOW OS Lounge. The old WM page
// below this layout is no longer served; its features live in WOW's Lounge.
export default function RoomLayout(_props: { children: React.ReactNode }) {
  return <LoungeForward />;
}
