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
  serverExternalPackages: [
    'puppeteer-core',
    '@sparticuz/chromium',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
    'clone-deep',
    'merge-deep'
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Ignore all the problematic dynamic requires
      config.ignoreWarnings = [
        { module: /clone-deep/ },
        { module: /merge-deep/ }
      ];
      
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'clone-deep': false,
        'merge-deep': false,
      };
      
      // Mark these as external for server-side
      config.externals = config.externals || [];
      config.externals.push('clone-deep', 'merge-deep');
    }
    
    return config;
  },
};

export default nextConfig;
