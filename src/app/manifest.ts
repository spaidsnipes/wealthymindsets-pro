import type { MetadataRoute } from "next";

import { FOUNDER_LANDING_ROUTE, INSTRUMENT_VIEW_ROUTE } from "@/lib/routing/founderLanding";

/**
 * The web app manifest — and the FOURTH no-destination arrival.
 *
 * ── Why this stopped being public/manifest.json ──────────────────────────────
 *
 * `start_url` is a landing decision. A human who taps the installed WM Pro icon
 * on their home screen has named no destination, exactly like the human who
 * types the bare domain, the signed-in human sitting on /login, and the human
 * who clicks a confirmation link in their inbox. founderLanding.ts exists
 * because those three each held a private copy of the answer.
 *
 * This file held a FOURTH copy — `"start_url": "/charts"` — and it was the one
 * copy that could not be fixed by editing TypeScript, because static JSON
 * cannot import. The Ticket T cutover moved the other three and left the
 * installed app still opening the July composition. That is the worst shape the
 * defect can take: the cutover LOOKS complete from inside the codebase, and the
 * Founder's own home-screen icon quietly disagrees with it.
 *
 * Next.js generates a manifest from `app/manifest.ts` (see
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md).
 * Generating it is what lets the manifest DERIVE the landing decision instead of
 * restating it. The served path becomes /manifest.webmanifest — layout.tsx and
 * the service worker's precache list were updated to match, since a manifest
 * link pointing at a path nobody serves is an install that silently degrades.
 *
 * The Charts shortcut below is deliberately NOT the landing route. A shortcut is
 * a NAMED destination — the human said the word "Charts" — so it derives from
 * INSTRUMENT_VIEW_ROUTE. Landing and instrument-view are two decisions that were
 * the same string for months; this file must not be the place they collapse back
 * together.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WealthyMindsets Pro",
    short_name: "WM Pro",
    description: "Elite trading dashboard, smart money tools, social community & creator economy",
    start_url: FOUNDER_LANDING_ROUTE,
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    background_color: "#070A0F",
    theme_color: "#070A0F",
    // A trader turns the phone sideways to read a chart. Locking orientation
    // would take that away; "any" is load-bearing and pinned by a test.
    orientation: "any",
    scope: "/",
    lang: "en",
    categories: ["finance", "business", "productivity"],
    icons: [
      { src: "/icons/icon-72x72.png", sizes: "72x72", type: "image/png", purpose: "any" },
      { src: "/icons/icon-96x96.png", sizes: "96x96", type: "image/png", purpose: "any" },
      { src: "/icons/icon-128x128.png", sizes: "128x128", type: "image/png", purpose: "any" },
      { src: "/icons/icon-144x144.png", sizes: "144x144", type: "image/png", purpose: "any" },
      { src: "/icons/icon-152x152.png", sizes: "152x152", type: "image/png", purpose: "any" },
      // 192 and 512 carried `purpose: "any maskable"` in the JSON. The Manifest
      // type accepts one purpose per entry, so the same icon is declared twice
      // rather than having a purpose silently dropped. Per the Web Manifest
      // spec these are equivalent — an installer looking for either purpose
      // still finds this file. Narrowing to "maskable" alone would have left
      // both sizes with no general-purpose icon, which is a real install
      // regression bought to satisfy a type.
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-384x384.png", sizes: "384x384", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    screenshots: [
      {
        src: "/screenshots/desktop.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "WealthyMindsets Pro — Trading Dashboard",
      },
    ],
    shortcuts: [
      {
        name: "Charts",
        short_name: "Charts",
        description: "Open the trading chart",
        url: INSTRUMENT_VIEW_ROUTE,
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
      {
        name: "Scanner",
        short_name: "Scanner",
        description: "Market scanner",
        url: "/scanner",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
      {
        name: "The Lounge",
        short_name: "Lounge",
        description: "Social community",
        url: "/lounge",
        icons: [{ src: "/icons/icon-96x96.png", sizes: "96x96" }],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
