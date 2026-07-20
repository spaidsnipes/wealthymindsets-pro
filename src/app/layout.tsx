import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { SymbolProvider } from "@/contexts/SymbolContext";
import { WMSProvider } from "@/contexts/WMSContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RadioProvider } from "@/contexts/RadioContext";
import { Toaster } from "react-hot-toast";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { Analytics } from "@vercel/analytics/next";

/* ── PWA + SEO metadata ───────────────────────────────────── */
export const metadata: Metadata = {
  title:       "WealthyMindsets Pro — Elite Trading & Creator Platform",
  description: "Trading dashboard with source-aware charts, volume analysis, journaling, education, paper trading, music, and community tools.",
  keywords:    ["trading", "order flow", "volume profile", "trade journal", "footprint chart", "paper trading"],
  authors:     [{ name: "WealthyMindsets LLC" }],
  manifest:    "/manifest.json",
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
    other:   [{ rel: "mask-icon", url: "/images/wm-logo.svg", color: "#F0B429" }],
  },
  openGraph: {
    title:       "WealthyMindsets Pro",
    description: "Source-aware charts, volume analysis, journaling, education, and community tools",
    type:        "website",
    siteName:    "WealthyMindsets Pro",
  },
};

export const viewport: Viewport = {
  width:               "device-width",
  initialScale:        1,
  maximumScale:        1,
  userScalable:        false,
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

        <Analytics />
      </body>
    </html>
  );
}
