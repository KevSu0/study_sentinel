import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
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
  // Ignore the .genkit directory to prevent dev server restarts
  webpack(config, {isServer, dev}) {
    if (dev) {
      // Ensure watchOptions is an object before modifying it.
      config.watchOptions = config.watchOptions || {};
      const ignored = config.watchOptions.ignored || [];
      config.watchOptions.ignored = [
          ...(Array.isArray(ignored) ? ignored : [ignored]),
          '**/.genkit/**',
      ];
    }
    return config;
  },
  serverExternalPackages: ['handlebars', 'dotprompt', '@genkit-ai/core'],
};

export default nextConfig;
