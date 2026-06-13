import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'randomuser.me',
                pathname: '/**', // This allows any image path from this domain
            },
        ],
    },
};

export default nextConfig;
