import type { Metadata } from "next";

/** The tab names the room (2026-10-04): every tab used to read the same product title. */
// Nested under /scanner, whose layout carries no template — so the full name is absolute.
export const metadata: Metadata = { title: { absolute: "Opportunity Map · WealthyMindsets Pro" } };

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
