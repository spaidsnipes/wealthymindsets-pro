import type { Metadata } from "next";
import { WowRoomForward } from "@/components/lounge/LoungeForward";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
export const metadata: Metadata = { title: "Academy" };

// One destination (Oct 22): this room is WOW OS's. The WM page below is no longer served.
export default function RoomLayout(_props: { children: React.ReactNode }) {
  return <WowRoomForward room="academy" />;
}
