import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
    ],
  },
  // Use serverExternalPackages instead of experimental
  serverExternalPackages: [
    'puppeteer-core',
    '@sparticuz/chromium'
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Make sure puppeteer-extra and stealth are BUNDLED, not externalized
      config.externals = config.externals || [];
      
      // Filter out any existing puppeteer-extra externalizations
      if (Array.isArray(config.externals)) {
        config.externals = config.externals.filter((external: any) => {
          if (typeof external === 'string') {
            return !external.includes('puppeteer-extra');
          }
          return true;
        });
      }
    }
    return config;
  },
};

export default nextConfig;
