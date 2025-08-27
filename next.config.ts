
import type { NextConfig } from 'next';

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // This is required to allow the Next.js dev server to accept requests from the
  // Firebase Studio environment.
  allowedDevOrigins: [
    '*.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev',
    'https://6000-firebase-studio-1752054198332.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev',
    'https://9000-firebase-studio-1752054198332.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  webpack(config, {isServer, dev}) {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        poll: 1000,
        aggregateTimeout: 300,
        ignored: [
          ...(Array.isArray(config.watchOptions.ignored)
            ? config.watchOptions.ignored
            : []),
          '**/.genkit/**',
          '**/.next/**',
        ],
      };
    }
    return config;
  },
  serverExternalPackages: ['handlebars', 'dotprompt', '@genkit-ai/core'],
};

export default withPWA(nextConfig);
