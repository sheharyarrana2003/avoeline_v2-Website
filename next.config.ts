import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strip console.* from the production bundle (keep errors/warnings for observability).
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  // Tree-shake large barrel-style icon/chart packages so only what's actually
  // used gets bundled instead of the whole library.
  // NOTE: do NOT add "firebase" here — the modular SDK relies on side-effectful
  // service registration that import-rewriting drops ("Service firestore is not available").
  experimental: {
    optimizePackageImports: ["recharts", "react-icons", "lucide-react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/**", // This allows any image path from this domain
      },
    ],
  },
};

export default nextConfig;
