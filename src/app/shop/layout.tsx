import type { Metadata } from "next";
import { WowRoomForward } from "@/components/lounge/LoungeForward";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
// Plate 36 (Garden 19): WM Pro owns its trading OS only; the shop is a WOW OS place.
export const metadata: Metadata = { title: "WOW Shop" };

// One destination (Oct 22): this room is WOW OS's. The WM page below is no longer served.
export default function RoomLayout(_props: { children: React.ReactNode }) {
  return <WowRoomForward room="shop" />;
}
