import type { Metadata } from "next";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
export const metadata: Metadata = { title: "Command Deck" };

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
