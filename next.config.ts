
import type { NextConfig } from 'next';

const withPWA = require('next-pwa')({
    dest: 'public',
    register: true,
    skipWaiting: true,
    customWorkerDir: 'src/worker',
    disable: process.env.NODE_ENV === 'development',
});

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // This is required to allow the Next.js dev server to accept requests from the
  // Firebase Studio environment.
  allowedDevOrigins: [
    '*.cloudworkstations.dev',
    'https://6000-firebase-studio-1752054198332.cluster-sumfw3zmzzhzkx4mpvz3ogth4y.cloudworkstations.dev',
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
  eslint: {
    // Skip ESLint during next build to avoid long lint phase in CI/limited environments
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Keep type checks enabled (we fixed TS errors). Set to true only if you want to bypass TS checks.
    ignoreBuildErrors: false,
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
            key: 'Time-Zone',
            value: process.env.TZ || 'Asia/Kolkata',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: process.env.CSP_REPORT_ONLY === 'true' ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
            value: (() => {
              try {
                const { value } = require('./scripts/generated-csp.json');
                return value;
              } catch {
                // Fallback for dev before generation
                return "connect-src 'self' http://localhost:* ws://localhost:*; img-src 'self' data:; font-src 'self'; media-src 'self' https://actions.google.com; worker-src 'self'";
              }
            })(),
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

const finalConfig = process.env.NODE_ENV === 'development'
  ? nextConfig
  : withPWA(nextConfig);

export default withBundleAnalyzer(finalConfig);
