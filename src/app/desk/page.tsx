"use client";

import { DeskShell } from "@/components/desk/DeskShell";
import { usePublishOsStanding } from "@/components/os/osStandingContext";
import { FEEDLESS_SURFACE } from "@/lib/os/osChrome";

/** Garden 18 §XIV–§XVI — several trade screens, one operating system. */
export default function DeskPage() {
  // A desk has no SINGLE feed for the frame to grade: each screen carries its
  // own feed and fidelity chrome (the same MainChart /charts uses). The frame
  // therefore says nothing rather than print one market's state over four.
  usePublishOsStanding({ surface: "Desk", feed: FEEDLESS_SURFACE });
  return <DeskShell />;
}
