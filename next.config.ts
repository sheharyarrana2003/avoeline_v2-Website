import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

/**
 * Content-Security-Policy (ENGINEERING_RULES S14) — enforced (Phase 10).
 * Keep unsafe-inline/eval until Next script nonces are wired; still blocks
 * object embeds and foreign frames.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://challenges.cloudflare.com https://apis.google.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://ssl.gstatic.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vitals.vercel-insights.com https://challenges.cloudflare.com https://www.googleapis.com https://accounts.google.com",
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.openstreetmap.org https://challenges.cloudflare.com https://docs.google.com https://drive.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Strip console.* from the production bundle (keep errors/warnings for observability).
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // Tree-shake large barrel-style icon/chart packages so only what's actually
  // used gets bundled instead of the whole library.
  experimental: {
    optimizePackageImports: ["recharts", "react-icons", "lucide-react"],
    // Server actions receive uploaded files; default body limit is 1MB, too small
    // for images and short video clips uploaded via uploadMedia.
    serverActions: {
      bodySizeLimit: "50mb",
    },
    // Requests pass through proxy.ts (Next 16 middleware), whose client body buffer
    // defaults to 10MB — SEPARATE from serverActions.bodySizeLimit above. Without this,
    // uploads >10MB get truncated and the server-action multipart parser throws
    // "Unexpected end of form" (500) before uploadMedia() ever runs. Keep in step with
    // bodySizeLimit. (Formerly experimental.middlewareClientMaxBodySize, renamed in Next 16.)
    proxyClientMaxBodySize: "50mb",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pfepncjkjamukhvsfwkx.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    const securityHeaders = [
      { key: "Content-Security-Policy", value: csp },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ];

    const appNoIndexPrefixes = [
      "/organizer/:path*",
      "/vendor/:path*",
      "/attendee/:path*",
      "/admin/:path*",
      "/department/:path*",
      "/clubs/:path*",
      "/auth/:path*",
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...appNoIndexPrefixes.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "true" })(nextConfig);
