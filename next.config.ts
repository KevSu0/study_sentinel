
import type { NextConfig } from 'next';

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: false, // Enable PWA in all environments
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Turbopack configuration (stable)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
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
    // Performance optimizations
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 25,
        maxAsyncRequests: 25,
        cacheGroups: {
          // React and Next.js core
          react: {
            test: /[\/]node_modules[\/](react|react-dom|next)[\/]/,
            name: 'react',
            chunks: 'all',
            priority: 40,
          },
          // UI Libraries - Radix UI
          radixui: {
            test: /[\/]node_modules[\/]@radix-ui[\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 35,
          },
          // Charts and visualization
          charts: {
            test: /[\/]node_modules[\/](recharts|d3-)[\/]/,
            name: 'charts',
            chunks: 'all',
            priority: 30,
          },
          // Animation libraries
          animation: {
            test: /[\/]node_modules[\/](framer-motion)[\/]/,
            name: 'animation',
            chunks: 'all',
            priority: 25,
          },
          // Database and data handling
          database: {
            test: /[\/]node_modules[\/](dexie|dexie-react-hooks)[\/]/,
            name: 'database',
            chunks: 'all',
            priority: 20,
          },
          // Utilities and smaller libraries
          utils: {
            test: /[\/]node_modules[\/](date-fns|clsx|class-variance-authority|tailwind-merge|lucide-react)[\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 15,
          },
          // Default vendor chunk for remaining packages
          vendor: {
            test: /[\/]node_modules[\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
            minChunks: 2,
          },
        },
      },
    };

    if (dev) {
      // Development optimizations
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
        cacheDirectory: '.next/cache/webpack',
        compression: 'gzip',
      };
      
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
          '**/node_modules/**',
          '**/.git/**',
          '**/coverage/**',
          '**/dist/**',
        ],
      };
      
      // Enable incremental compilation and other experiments
      config.experiments = {
        ...config.experiments,
        topLevelAwait: true,
        layers: true,
      };
      
      // Optimize module resolution
      config.resolve = {
        ...config.resolve,
        symlinks: false,
        cacheWithContext: false,
      };
      
      // Optimize loader performance
      config.module = {
        ...config.module,
        unsafeCache: true,
      };
    } else {
      // Production optimizations
       config.optimization = {
         ...config.optimization,
         moduleIds: 'deterministic',
         chunkIds: 'deterministic',
         mangleExports: 'deterministic',
         usedExports: true,
         sideEffects: false,
         concatenateModules: true,
         flagIncludedChunks: true,
         providedExports: true,
         removeAvailableModules: true,
         removeEmptyChunks: true,
         mergeDuplicateChunks: true,
       };
       
       // Additional production optimizations
       config.resolve = {
         ...config.resolve,
         symlinks: false,
       };
    }
    
    return config;
  },
  serverExternalPackages: ['handlebars', 'dotprompt', '@genkit-ai/core'],
};

export default withBundleAnalyzer(withPWA(nextConfig));
