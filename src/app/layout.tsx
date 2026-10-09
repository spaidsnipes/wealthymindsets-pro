import type { Metadata, Viewport } from "next";
import { CHUNK_RECOVERY_SCRIPT } from "@/components/layout/chunkRecoveryScript";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { VerifySceneBanner } from "@/components/layout/VerifySceneBanner";
import { SymbolProvider } from "@/contexts/SymbolContext";
import { WMSProvider } from "@/contexts/WMSContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RadioProvider } from "@/contexts/RadioContext";
import { Toaster } from "react-hot-toast";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { CANONICAL_URL } from "@/lib/canonicalUrl";
import { WM_BRAND } from "@/lib/brand/brandCanon";

/* ── PWA + SEO metadata ─────────────────────────────────────
   Positioning aligned with the current WM Pro canon: WM Pro is a
   trading operating system — market intelligence, decision memory,
   process stewardship, longitudinal learning — not a dashboard. */
export const metadata: Metadata = {
  // Absolute URLs for share images resolve against the one canonical host.
  metadataBase: new URL(CANONICAL_URL),
  // Each room names itself through this template: "Scanner · WealthyMindsets Pro".
  title:       { default: "WealthyMindsets Pro — Trading Operating System", template: "%s · WealthyMindsets Pro" },
  description: "A trading operating system for serious traders. Market intelligence, order flow, volume profile, decision memory, and longitudinal edge — with truthful UNKNOWN, MISSING, STALE, and INSUFFICIENT states.",
  keywords:    ["trading operating system", "order flow", "volume profile", "market intelligence", "decision memory", "trader development", "footprint chart", "trade journal"],
  authors:     [{ name: WM_BRAND.legalEntity }],
  manifest:    "/manifest.webmanifest",
  appleWebApp: {
    capable:        true,
    statusBarStyle: "black-translucent",
    title:          "WM Pro",
    startupImage:   ["/icons/icon-512x512.png"],
  },
  icons: {
    icon:    [
      { url: "/icons/icon-32x32.png",  sizes: "32x32",  type: "image/png" },
      { url: "/icons/icon-96x96.png",  sizes: "96x96",  type: "image/png" },
      { url: "/icons/icon-192x192.png",sizes: "192x192",type: "image/png" },
    ],
    apple:   "/icons/icon-180x180.png",
    // Safari mask-icon intentionally omitted: the founder's micro-glyph
    // ("simplified angular W/crown") is not yet delivered as a monochrome
    // vector, and the old /images/wm-logo.svg was an OFF-BRAND orange
    // "W + arrow + $" mark. Per brand canon ("fall back honestly, never to a
    // fabricated mark"), Safari pinned tabs fall back to the real
    // monogram-derived apple-touch/favicon rather than an off-spec silhouette.
  },
  openGraph: {
    title:       "WealthyMindsets Pro — Trading Operating System",
    description: "Market intelligence, order flow, decision memory, and longitudinal edge — with honest UNKNOWN, STALE, and INSUFFICIENT states. Never a beautiful lie.",
    type:        "website",
    siteName:    "WealthyMindsets Pro",
    // A shared link previewed as bare text (2026-10-04). The master crest —
    // the same art the login hero carries.
    images:      [{ url: "/brand/wm-master-crest.jpeg", width: 784, height: 1168, alt: "WEALTHY MINDSETS — Stay Sharp. Stay a Student." }],
  },
  twitter: {
    card:        "summary",
    images:      ["/brand/wm-master-crest.jpeg"],
  },
};

export const viewport: Viewport = {
  width:               "device-width",
  initialScale:        1,
  // WM-RESP-P0-02: maximumScale/userScalable removed — blocking pinch-zoom
  // fails WCAG 2.1 AA SC 1.4.4, and Android Chrome (unlike iOS) actually
  // honours it, so Android traders could not zoom in on a price.
  themeColor:          [
    { media: "(prefers-color-scheme: dark)",  color: "#070A0F" },
    { media: "(prefers-color-scheme: light)", color: "#070A0F" },
  ],
  viewportFit:         "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ height: "100%", width: "100%" }}
      suppressHydrationWarning
    >
      <head>
        {/* PWA / iOS meta tags not covered by Next.js metadata API */}
        <meta name="mobile-web-app-capable"        content="yes" />
        <meta name="application-name"              content="WM Pro" />
        <meta name="msapplication-TileColor"       content="#070A0F" />
        <meta name="msapplication-TileImage"       content="/icons/icon-144x144.png" />
        <meta name="msapplication-config"          content="/browserconfig.xml" />
        {/* Before any chunk is requested: a chunk-load failure (deploy skew)
            reloads once even when the error boundary's own chunk is the one
            that failed — see components/layout/chunkRecoveryScript. */}
        <script dangerouslySetInnerHTML={{ __html: CHUNK_RECOVERY_SCRIPT }} />
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.polygon.io" />
        <link rel="dns-prefetch" href="https://finnhub.io" />
      </head>
      <body
        style={{ height: "100%", width: "100%", overflow: "hidden" }}
        suppressHydrationWarning
      >
        {/* Register SW silently on mount */}
        <ServiceWorkerRegistrar />

        <AuthProvider>
          <RadioProvider>
            <WMSProvider>
              <SymbolProvider>
                <MainLayout>{children}</MainLayout>
                {/* scene=verify: the one visible mark of a verification load — every room, signed-in only. */}
                <VerifySceneBanner />
              </SymbolProvider>
            </WMSProvider>
          </RadioProvider>
        </AuthProvider>

        {/* Toast notifications (above music player bar) */}
        <Toaster
          position="bottom-right"
          containerStyle={{ bottom: 56 }}
          toastOptions={{
            style: {
              background:   "#1C2128",
              color:        "#E8EDF3",
              border:       "1px solid #252D38",
              borderRadius: "8px",
              fontSize:     "12px",
              fontFamily:   "Inter, sans-serif",
            },
          }}
        />

        {/* PWA Install banner — auto-shows after 3-4s on eligible devices */}
        <InstallPrompt />
      </body>
    </html>
  );
}
