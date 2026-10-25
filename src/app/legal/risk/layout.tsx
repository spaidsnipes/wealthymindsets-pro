import type { Metadata } from "next";

/** The tab names the page (guest audit 2026-10-25): public pages all read the same product title. */
export const metadata: Metadata = { title: "Risk disclosure" };

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
