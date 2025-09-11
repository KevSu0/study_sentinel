# Offline-First PWA Implementation Plan

This document outlines the specific code changes required to convert the application to a "completely offline" PWA. The application will check for new content every 6 hours if a network connection is available. The only exceptions to the offline-first rule will be the AI Coach and Daily Briefing features, which will remain network-dependent.

---

## 1. Modify PWA Caching Strategy

**Action:** Change the default runtime caching strategy to `StaleWhileRevalidate`. This will make the application offline-first, but allow it to refresh data from the network periodically.

**Location:** `pwa-options.ts`

**Expected Change:**

*   **Before (entire file):**
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

*   **After (entire file):**
    ```typescript
    import type { PWAConfig } from 'next-pwa';

    export const pwaConfig: PWAConfig = {
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: process.env.NODE_ENV === 'development',
      runtimeCaching: [
        // 1. AI/API Calls (Network Only)
        {
          urlPattern: /^http:\/\/localhost:3000\/chat/i,
          handler: 'NetworkOnly',
        },
        {
            urlPattern: /^http:\/\/localhost:3000\/briefing/i,
            handler: 'NetworkOnly',
        },
        
        // 2. Images (Cache First)
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
        
        // 3. Static Assets (JS, CSS) (Stale-While-Revalidate)
        {
          urlPattern: /\.(?:js|css)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-assets',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 24 * 60 * 60, // 24 hours
            },
          },
        },
        
        // 4. All Other Requests (Stale-While-Revalidate with 6-hour refresh)
        {
          urlPattern: /.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'everything-else',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 6 * 60 * 60, // 6 hours
            },
          },
        },
      ],
    };
    ```

---

## 2. Add a custom worker to handle hard refresh and periodic updates

**Action:** Create a new file `src/worker/index.ts` to add a custom service worker. This worker will handle hard refreshes and the 6-hour periodic update logic.

**Location:** `src/worker/index.ts`

**Expected Change:**

*   **Before:**
    *   File does not exist.

*   **After (new file):**
    ```typescript
    // src/worker/index.ts
    /// <reference lib="webworker" />

    import {precacheAndRoute} from 'workbox-precaching';
    import {registerRoute} from 'workbox-routing';
    import {CacheFirst, NetworkOnly, StaleWhileRevalidate} from 'workbox-strategies';
    import {CacheableResponsePlugin} from 'workbox-cacheable-response';
    import {ExpirationPlugin} from 'workbox-expiration';

    declare const self: ServiceWorkerGlobalScope;

    precacheAndRoute(self.__WB_MANIFEST);

    // ** AI/API Calls (Network Only) **
    registerRoute(
      ({url}) => url.pathname.startsWith('/chat') || url.pathname.startsWith('/briefing'),
      new NetworkOnly()
    );

    // ** Image Caching (Cache First) **
    registerRoute(
      ({request}) => request.destination === 'image',
      new CacheFirst({
        cacheName: 'images',
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          }),
        ],
      })
    );

    // ** Default Handler for All Other Requests (Stale-While-Revalidate) **
    // This makes the app offline-first but checks for updates every 6 hours.
    registerRoute(
      ({request}) => request.mode === 'navigate',
      new StaleWhileRevalidate({
        cacheName: 'pages',
        plugins: [
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
          new ExpirationPlugin({
            maxAgeSeconds: 6 * 60 * 60, // 6 hours
          }),
        ],
      })
    );

    self.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
      }
      if (event.data && event.data.type === 'HARD_REFRESH') {
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.map(cacheName => {
              return caches.delete(cacheName);
            })
          );
        });
      }
    });
    ```

---

## 3. Update `next.config.ts` to use the custom worker

**Action:** Modify `next.config.ts` to point to the new custom service worker and remove the dependency on `pwa-options.ts`.

**Location:** `next.config.ts`

**Expected Change:**

*   **Before:**
    ```typescript
    import type { NextConfig } from 'next';
    import { pwaConfig } from './pwa-options';

    const withPWA = require('next-pwa')(pwaConfig);
    ```

*   **After:**
    ```typescript
    import type { NextConfig } from 'next';

    const withPWA = require('next-pwa')({
        dest: 'public',
        register: true,
        skipWaiting: true,
        customWorkerDir: 'src/worker',
        disable: process.env.NODE_ENV === 'development',
    });
    ```

This updated plan now includes the 6-hour refresh requirement.