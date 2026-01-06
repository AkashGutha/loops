import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Allow OAuth/Firebase popups to call window.close without COOP blocking.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          // Avoid COEP enforcement when COOP is relaxed for popups.
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },
};

export default nextConfig;
