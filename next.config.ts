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
    // Server actions receive uploaded files; default body limit is 1MB, too small
    // for images and short video clips uploaded via uploadMedia.
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
        pathname: "/**", // This allows any image path from this domain
      },
      {
        protocol: "https",
        hostname: "pfepncjkjamukhvsfwkx.supabase.co",
        pathname: "/storage/v1/object/public/**", // Supabase public media bucket
      },
    ],
  },
};

export default nextConfig;
