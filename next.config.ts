import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Electron and Cloudflare packaging both require the traced standalone tree.
  // Keep the default dev/build output unchanged unless the existing
  // `build:standalone` script explicitly selects it.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  turbopack: {},
};

export default nextConfig;
