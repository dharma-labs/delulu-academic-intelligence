import type { NextConfig } from "next";

// Two build targets:
//   - "standalone" (default) -> self-contained Node server (web hosting, Electron)
//   - "export"              -> pure static HTML/JS (Electron desktop, Capacitor, PWA)
// Switch with the NEXT_OUTPUT env var:  NEXT_OUTPUT=export next build
const isExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  output: isExport ? "export" : "standalone",
  images: {
    unoptimized: true, // required for static export + Electron file:// loading
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
