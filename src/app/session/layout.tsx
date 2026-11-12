import type { Metadata } from "next";

export const metadata: Metadata = { title: "Session Desk" };

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
