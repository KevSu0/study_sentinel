
// src/worker/index.ts
/// <reference lib="webworker" />

import {precacheAndRoute} from 'workbox-precaching';
import {registerRoute} from 'workbox-routing';
import {CacheFirst, StaleWhileRevalidate, NetworkOnly} from 'workbox-strategies';
import {CacheableResponsePlugin} from 'workbox-cacheable-response';
import {ExpirationPlugin} from 'workbox-expiration';
import { RouteHandlerCallbackOptions } from 'workbox-core';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// ** API Data Caching (Custom Strategy: 6-Hour "Stale-After-Update") **
// This custom strategy ensures data is fetched from the cache if it's less than 6 hours old.
// If data is older or not in the cache, it fetches from the network.
// If the network fails, it serves the stale data, ensuring full offline functionality.
const SIX_HOURS_IN_SECONDS = 6 * 60 * 60;

const apiCacheHandler = async ({ request, url }: RouteHandlerCallbackOptions) => {
  const cache = await caches.open('api-data');

  const fetchAndCache = async () => {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const responseToCache = networkResponse.clone();
        // Create a new headers object to add the timestamp, as the original is immutable.
        const headers = new Headers(responseToCache.headers);
        headers.set('x-sw-cache-timestamp', new Date().toISOString());
        
        const body = await responseToCache.blob();
        
        await cache.put(request, new Response(body, {
          status: responseToCache.status,
          statusText: responseToCache.statusText,
          headers: headers
        }));
      }
      return networkResponse;
    } catch (error) {
      console.error(`[SW] Network fetch for ${url.href} failed. Serving stale content if available.`, error);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      // If there's no network and no cache, the request will fail.
      // This is expected if the app is opened for the first time offline.
      throw error;
    }
  };

  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    const timestampHeader = cachedResponse.headers.get('x-sw-cache-timestamp');
    if (timestampHeader) {
      const cachedTime = new Date(timestampHeader).getTime();
      const now = new Date().getTime();
      const ageInSeconds = (now - cachedTime) / 1000;

      if (ageInSeconds < SIX_HOURS_IN_SECONDS) {
        return cachedResponse;
      }
    }
    // If cache is stale or has no timestamp, re-fetch.
    // The fetchAndCache function will handle returning the stale response on network failure.
    return fetchAndCache();
  }

  // No cached response, must fetch.
  return fetchAndCache();
};

registerRoute(
  ({url}) => url.pathname.startsWith('/api/'),
  apiCacheHandler
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

// ** Page/Navigation Caching (Cache First) **
// This ensures the app shell is always available from the cache first for instant navigation.
registerRoute(
  ({request}) => request.mode === 'navigate',
  new CacheFirst({
    cacheName: 'pages',
  })
);

// ** Offline Mutations with Background Sync **
// This queues failed POST, PUT, and DELETE requests and retries them when the network is available.
const bgSyncPlugin = new BackgroundSyncPlugin('api-mutation-queue', {
  maxRetentionTime: 24 * 60 // Retry for up to 24 hours
});

registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/') &&
    ['POST', 'PUT', 'DELETE'].includes(request.method),
  new NetworkOnly({
    plugins: [bgSyncPlugin]
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
