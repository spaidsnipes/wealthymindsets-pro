"use client";
/**
 * WOW Radio is WOW OS's room. Its song upload studio still lives here until WOW
 * takes uploads, so /radio?studio=1 (the door WOW's "Upload" button uses)
 * shows the studio; every other visit opens WOW Radio itself.
 */
import { useSearchParams } from "next/navigation";
import { WowRoomForward } from "@/components/lounge/LoungeForward";

export default function RadioRoomGate({ children }: { children: React.ReactNode }) {
  const q = useSearchParams();
  if (q.get("studio") === "1") return <>{children}</>;
  return <WowRoomForward room="radio" />;
}
