# Next.js Configuration Optimization Plan

This document outlines the step-by-step execution plan to optimize the Next.js configuration for improved performance, code quality, and PWA functionality.

### **Task 1: Update Dependencies**

1.  **Action**: Add the `next-pwa` and `@next/bundle-analyzer` packages to the project's `devDependencies`. These are essential for enabling PWA functionality and analyzing the application's bundle size.
2.  **Location**: `package.json`
3.  **Expected Change**:

    *Before*:
    ```json
    "devDependencies": {
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "eslint": "^8",
        "eslint-config-next": "14.2.4",
        "postcss": "^8",
        "tailwindcss": "^3.4.1",
        "typescript": "^5"
    }
    ```

    *After*:
    ```json
    "devDependencies": {
        "@next/bundle-analyzer": "^14.2.4",
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "eslint": "^8",
        "eslint-config-next": "14.2.4",
        "next-pwa": "^5.6.0",
        "postcss": "^8",
        "tailwindcss": "^3.4.1",
        "typescript": "^5"
    }
    ```
4.  **Post-Action Instruction**: After updating `package.json`, run `npm install` to install the new dependencies.

### **Task 2: Create PWA Configuration Module**

1.  **Action**: Create a dedicated module to house the PWA configuration. This improves modularity and keeps the main `next.config.ts` file clean and readable. The configuration is based on the strategy outlined in `documentation/pwa.md`.
2.  **Location**: Create a new file named `pwa-options.ts`.
3.  **Expected Change**:

    *New File Content* (`pwa-options.ts`):
    ```typescript
    import type { PWAConfig } from 'next-pwa';

    export const pwaConfig: PWAConfig = {
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
      runtimeCaching: [
        {
          urlPattern: /^https$/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'start-url',
            expiration: {
              maxEntries: 1,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        },
        {
          urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'images',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
            },
          },
        },
        {
          urlPattern: /\.(?:js)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-js-assets',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        },
        {
          urlPattern: /\.(?:css|less)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-style-assets',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        },
        {
          urlPattern: /\.(?:json|xml|csv)$/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'static-data-assets',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        },
        {
          urlPattern: /.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'others',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
            networkTimeoutSeconds: 10,
          },
        },
      ],
    };
    ```

### **Task 3: Optimize Next.js Configuration**

1.  **Action**: Refactor the main `next.config.ts` file to implement all optimizations. This includes:
    *   Removing the suppression of TypeScript and ESLint errors to enforce code quality.
    *   Enabling the `standalone` output mode for smaller production deployments.
    *   Integrating the `next-pwa` configuration from the new `pwa-options.ts` module.
    *   Integrating the `@next/bundle-analyzer` to allow for bundle analysis when needed.
2.  **Location**: `next.config.ts`
3.  **Expected Change**:

    *Before*:
    ```typescript
    import type {NextConfig} from 'next';

    const nextConfig: NextConfig = {
      reactStrictMode: true,
      typescript: {
        ignoreBuildErrors: true,
      },
      eslint: {
        ignoreDuringBuilds: true,
      },
      // This is required to allow the Next.js dev server to accept requests from the
      // Firebase Studio environment.
      allowedDevOrigins: ['*.cloudworkstations.dev'],
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

    export default nextConfig;
    ```

    *After*:
    ```typescript
    import type { NextConfig } from 'next';
    import { pwaConfig } from './pwa-options';

    const withPWA = require('next-pwa')(pwaConfig);

    const withBundleAnalyzer = require('@next/bundle-analyzer')({
      enabled: process.env.ANALYZE === 'true',
    });

    const nextConfig: NextConfig = {
      reactStrictMode: true,
      output: 'standalone',
      // This is required to allow the Next.js dev server to accept requests from the
      // Firebase Studio environment.
      allowedDevOrigins: ['*.cloudworkstations.dev'],
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
      webpack(config, { isServer, dev }) {
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

    export default withBundleAnalyzer(withPWA(nextConfig));