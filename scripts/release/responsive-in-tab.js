/**
 * §52 RESPONSIVE RELEASE TEST — SIGNED-IN PAGES, IN YOUR OWN TAB (Garden 19, 2026-10-07).
 *
 * The public script (responsive-public.mjs) holds no session. Signed-in rooms
 * are measured HERE instead: in a tab where you are already signed in, on
 * wealthymindsetspro.com (or your local dev server), open DevTools → Console,
 * paste this whole file, press Enter. Nothing is typed into any form, no
 * order is placed, nothing is saved — each room is only opened in a
 * same-origin iframe at each width and measured.
 *
 * Keep the tab IN FRONT and the Chrome window FOCUSED while it runs. A tab whose
 * document reports visibilityState "hidden" pauses requestAnimationFrame: drawers
 * stay parked at their start position (the Settings drawer read 420 px off-screen,
 * 2026-10-07), so an animated element can read as overflow that a person never
 * sees. If `document.visibilityState` is not "visible", the run refuses to start.
 * It takes ~4 s per room per width.
 *
 * Change ROUTES / WIDTHS below if you want fewer. When it finishes:
 *   console.table(window.__wmRelease52.rows)          — every row
 *   window.__wmRelease52.failures                     — only the failures
 *   copy(JSON.stringify(window.__wmRelease52, null, 2)) — copy the report
 *
 * CHECKS (FAIL):
 *   REACHED (no redirect to /login) · NO_HSCROLL · NO_OVERFLOW (innermost
 *   element past the right edge, outside a horizontal scroller or a clipping
 *   ancestor) · NO_EVICTED (text laid out 0 px)
 * WARN (reported, never fails):
 *   TAP_44 — links / buttons under 44 × 44 at ≤ 1024 px. A WARNING here, not a
 *     failure: this tab is a mouse (fine pointer), so rules that enlarge targets
 *     only under `(pointer: coarse)` do not apply inside the iframe and targets
 *     read small that are 44 px on a real phone. Confirm a TAP_44 warning on a
 *     phone or with responsive-public.mjs (which emulates touch) before filing it.
 *   SMALL_TEXT (< 10 px)
 */
(async () => {
  const ROUTES = [
    "/charts", "/command-deck", "/desk", "/journal", "/paper", "/scanner", "/backtesting",
    "/morning-prep", "/education", "/education?lesson=fvg-1", "/news", "/lounge", "/settings", "/profile",
  ];
  /** Routes that are ALIASES by design: where they land (src/lib/legacyRouteAliases). */
  const LANDS_ON = { "/settings": "/charts" }; // the Settings drawer over the chart
  const WIDTHS = [1440, 1024, 834, 768, 390, 360];
  const HEIGHT = (w) => (w <= 430 ? 844 : w <= 1024 ? 1112 : 900);
  const SETTLE_MS = 4000;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function measure(win, coarse) {
    const doc = win.document, vw = win.innerWidth;
    const cs = (el) => win.getComputedStyle(el);
    // checkVisibility walks the ancestors (a collapsed drawer at opacity 0
    // hides its children — /scanner's filter drawer, 2026-10-07).
    const shown = (el) => (typeof el.checkVisibility === "function" ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true);
    const visible = (el) => {
      if (!shown(el)) return false;
      const s = cs(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const inHScroller = (el) => {
      for (let p = el.parentElement; p && p !== doc.body; p = p.parentElement) {
        const ox = cs(p).overflowX;
        if ((ox === "auto" || ox === "scroll") && p.scrollWidth > p.clientWidth) return true;
        if ((ox === "hidden" || ox === "clip") && p.getBoundingClientRect().right <= vw + 1) return true;
      }
      return false;
    };
    const name = (el) => `${el.tagName.toLowerCase()}${el.dataset && el.dataset.testid ? `[data-testid=${el.dataset.testid}]` : ""} "${(el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 36)}"`;
    const all = [...doc.body.querySelectorAll("*")];
    const hasText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

    const over = all.filter((el) => visible(el) && el.getBoundingClientRect().right > vw + 1 && !inHScroller(el));
    const overflow = over.filter((el) => !over.some((o) => o !== el && el.contains(o))).slice(0, 6).map((el) => `${name(el)} right=${Math.round(el.getBoundingClientRect().right)}`);

    const evicted = all.filter((el) => {
      if (!hasText(el)) return false;
      const s = cs(el);
      if (s.display === "none" || s.visibility === "hidden") return false;
      if (el.closest("[aria-hidden=true], .sr-only, [hidden]")) return false;
      if (el.getClientRects().length === 0) return false;
      if (!shown(el)) return false;
      if (s.position === "absolute" && (s.clip !== "auto" || s.clipPath !== "none")) return false;
      const r = el.getBoundingClientRect();
      return r.width === 0 || r.height === 0;
    }).slice(0, 6).map(name);

    const small = [];
    if (coarse) {
      for (const el of doc.querySelectorAll("a[href], button, [role=button], input:not([type=hidden]), select, textarea, summary")) {
        if (!visible(el) || el.closest("[aria-hidden=true]")) continue;
        const r = el.getBoundingClientRect();
        if (r.height >= 44 && r.width >= 44) continue;
        const inProse = el.tagName === "A" && cs(el).display === "inline" && el.parentElement && /^(P|LI|SPAN|DD)$/.test(el.parentElement.tagName);
        if (inProse && el.parentElement.getBoundingClientRect().height >= 44) continue;
        small.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    const tiny = [];
    for (const el of all) {
      if (tiny.length >= 6) break;
      if (visible(el) && hasText(el) && parseFloat(cs(el).fontSize) < 10) tiny.push(`${name(el)} ${cs(el).fontSize}`);
    }
    return { path: win.location.pathname, hScroll: doc.documentElement.scrollWidth > vw, overflow, evicted, small, tiny };
  }

  if (document.visibilityState !== "visible") {
    console.warn("§52 in-tab: this tab is hidden — bring it to the front of a focused window and paste again.");
    return;
  }
  const rows = [];
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);
  try {
    for (const w of WIDTHS) {
      frame.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${HEIGHT(w)}px;z-index:2147483647;border:0;background:#000`;
      for (const route of ROUTES) {
        frame.src = route + (route.includes("?") ? "&" : "?") + "r52=" + Date.now();
        await new Promise((res) => { frame.onload = res; setTimeout(res, 15000); });
        await sleep(SETTLE_MS);
        let m;
        try { m = measure(frame.contentWindow, w <= 1024); } catch (e) { m = { error: String(e) }; }
        const want = route.split("?")[0];
        const reached = !m.error && m.path === (LANDS_ON[want] || want);
        const checks = {
          REACHED: reached,
          NO_HSCROLL: reached && !m.hScroll,
          NO_OVERFLOW: reached && m.overflow.length === 0,
          NO_EVICTED: reached && m.evicted.length === 0,
        };
        const pass = Object.values(checks).every(Boolean);
        const row = {
          width: w, route, pass,
          failed: Object.entries(checks).filter(([, v]) => !v).map(([k]) => k).join(","),
          overflow: (m.overflow || []).join(" | "),
          evicted: (m.evicted || []).join(" | "),
          warnTap44: (m.small || []).length ? `${m.small.length}: ${m.small.slice(0, 4).join(" | ")}` : "",
          warnSmallText: (m.tiny || []).join(" | "),
          landedOn: m.path || m.error,
        };
        rows.push(row);
        console.log(`${pass ? "PASS" : "FAIL"} ${w} ${route}${pass ? "" : "  " + row.failed}`);
      }
    }
  } finally {
    frame.remove();
  }
  window.__wmRelease52 = { at: new Date().toISOString(), origin: location.origin, rows, failures: rows.filter((r) => !r.pass) };
  console.table(rows.map(({ width, route, pass, failed, warnTap44 }) => ({ width, route, pass, failed, warnTap44: warnTap44 ? warnTap44.split(":")[0] : "" })));
  console.log(`${rows.filter((r) => r.pass).length}/${rows.length} passed — details: window.__wmRelease52`);
})();
