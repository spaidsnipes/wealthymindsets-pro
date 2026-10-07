"use client";

/**
 * SPAIDBOT ASK HOST — the Founder shell's answer to "Ask SpaidBot" (Garden 19
 * §30, 2026-10-07).
 *
 * The Founder shell deliberately carries NO floating assistant chrome
 * (MainLayout.residency.sentinel: the July SpaidBotButton launcher is retired
 * there). But FVG Inspect and the Review's FVG block offer "Ask SpaidBot …",
 * and on /charts nothing listened — a dead door (chart lane serving read).
 *
 * This host renders NOTHING and loads nothing until the trader presses an Ask
 * button. Then it mounts the EXISTING SpaidBot panel with its launcher removed
 * (`launcher={false}`), handing it the waiting ask: the panel opens with the
 * question pre-filled (the trader presses Send), and closing it leaves nothing
 * on screen. No new mode, no new chat, no request made here.
 */
import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { SPAIDBOT_ASK_EVENT, readSpaidbotAsk, registerSpaidbotAskListener, rememberPendingAsk } from "@/lib/ai/spaidbotAsk";

const LauncherlessSpaidBot = dynamic(
  () => import("@/components/layout/SpaidBotButton").then(m => {
    const Panel = () => <m.SpadeBotButton launcher={false} />;
    return Panel;
  }),
  { ssr: false },
);

export function SpaidbotAskHost(): React.ReactElement | null {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted) return; // the panel listens for itself once it exists
    const onAsk = (e: Event) => {
      const ask = readSpaidbotAsk((e as CustomEvent).detail);
      if (!ask) return;
      rememberPendingAsk(ask);
      setMounted(true);
    };
    const unregister = registerSpaidbotAskListener();
    window.addEventListener(SPAIDBOT_ASK_EVENT, onAsk);
    return () => { unregister(); window.removeEventListener(SPAIDBOT_ASK_EVENT, onAsk); };
  }, [mounted]);
  return mounted ? <LauncherlessSpaidBot /> : null;
}
