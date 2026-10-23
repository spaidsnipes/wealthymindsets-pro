import type { Metadata } from "next";
import { Suspense } from "react";
import RadioRoomGate from "@/components/os/RadioRoomGate";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
export const metadata: Metadata = { title: "WOW Radio" };

// One destination (Oct 22): WOW Radio is WOW OS's room; only the upload studio (?studio=1) stays here.
export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}><RadioRoomGate>{children}</RadioRoomGate></Suspense>;
}
