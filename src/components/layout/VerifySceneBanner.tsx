"use client";

/**
 * `scene=verify` — the VERIFICATION banner (coordinator order 2026-10-09).
 *
 * One fixed line on every room, for a signed-in trader, while the page load is
 * a verification load: real data, real reads, nothing saved. It is the ONLY
 * visible difference the token makes. Mounted once in the root layout, outside
 * every room's own shell; it takes no layout space and no pointer.
 */
import React, { useEffect, useState } from "react";
import { PROOF_VERIFY_BANNER, proofVerifyOpen } from "@/lib/chart/proofScene";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function VerifySceneBanner(): React.ReactElement | null {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Read after mount (the address is a browser fact); latched by the owner.
  useEffect(() => { setOpen(proofVerifyOpen()); }, []);
  /*
    AT THE TOP EDGE, UNDER THE MASTHEAD (coordinator order 2026-10-09). The
    banner sat at the bottom, on the phone's thumb bar / nav and over the
    chart's bottom strip — covering exactly what a verifier came to read. It
    now stands just below whichever shell header the room has (measured, since
    the masthead's height differs by room and width), never over navigation,
    the thumb bar or the chart's foot. With no header found it sits at the top
    safe-area edge.
  */
  const [headerBottom, setHeaderBottom] = useState<number | null>(null);
  useEffect(() => {
    if (!open || !user) return;
    // NO TIMER. Nothing on a chart page runs a clock it does not need — candle
    // and countdown smoothness outrank this banner. The header is watched, not
    // polled: a MutationObserver waits only until the shell header first
    // appears and is then disconnected; after that a ResizeObserver on that one
    // element (and the window's resize event) re-reads its bottom edge.
    const SELECTOR = ".wm-os-masthead, .wm-shell-header";
    let header: HTMLElement | null = null;
    let sized: ResizeObserver | null = null;
    let waiting: MutationObserver | null = null;
    const measure = () => {
      const r = header?.getBoundingClientRect();
      setHeaderBottom(r && r.height > 0 && r.bottom > 0 ? Math.round(r.bottom) : null);
    };
    const adopt = (): boolean => {
      header = document.querySelector<HTMLElement>(SELECTOR);
      if (!header) return false;
      waiting?.disconnect();
      waiting = null;
      if (typeof ResizeObserver !== "undefined") { sized = new ResizeObserver(measure); sized.observe(header); }
      measure();
      return true;
    };
    if (!adopt() && typeof MutationObserver !== "undefined") {
      waiting = new MutationObserver(() => { adopt(); });
      waiting.observe(document.body, { childList: true, subtree: true });
    }
    window.addEventListener("resize", measure);
    return () => { waiting?.disconnect(); sized?.disconnect(); window.removeEventListener("resize", measure); };
    // `pathname`: a client-side route change can replace the shell header
    // element. The effect then runs again — the old observers are disconnected
    // by the cleanup above and the one-shot wait re-finds the new header.
  }, [open, user, pathname]);
  if (!open || !user) return null;
  return (
    <div role="status" data-testid="verify-scene-banner" data-proof-scene="verify" data-banner-edge="top"
      style={{
        // Centred with auto margins, not `left: 50%` + translate: a fixed box at
        // left 50% can only shrink-to-fit HALF the viewport, so at 390 the line
        // wrapped to two rows (43px) and covered the room's title (read on
        // serving 6944df9). One line, sized to its words.
        position: "fixed", left: 0, right: 0, marginInline: "auto", width: "fit-content", whiteSpace: "nowrap", zIndex: 2147483000, pointerEvents: "none",
        top: headerBottom != null ? headerBottom + 4 : "calc(env(safe-area-inset-top) + 6px)",
        maxWidth: "calc(100vw - 24px)", padding: "4px 10px", borderRadius: 8, border: "1px solid #d4af37",
        background: "rgba(11,10,8,0.92)", color: "#d4af37", fontSize: 11, fontWeight: 800, letterSpacing: ".06em", textAlign: "center",
      }}>
      {PROOF_VERIFY_BANNER}
    </div>
  );
}
