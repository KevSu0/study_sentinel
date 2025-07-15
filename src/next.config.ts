
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Ignore the .genkit directory to prevent dev server restarts
  webpack(config, {isServer, dev}) {
    if (dev) {
      const originalWatchOptions = config.watchOptions;
      config.watchOptions = {
        ...originalWatchOptions,
        ignored: [
          ...(originalWatchOptions.ignored || []),
          '**/.genkit/**',
        ],
      };
    }
    return config;
  },
  serverExternalPackages: ['handlebars', 'dotprompt', '@genkit-ai/core'],
};

export default nextConfig;
