// Custom Service Worker for Study Sentinel - Offline-First PWA
const CACHE_NAME = 'study-sentinel-v1';
const STATIC_CACHE = 'study-sentinel-static-v1';
const API_CACHE = 'study-sentinel-api-v1';
const AI_CACHE = 'study-sentinel-ai-v1';
const IMAGES_CACHE = 'study-sentinel-images-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  // Add other critical static assets
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/plans',
  '/api/routines',
  '/api/sessions',
  '/api/stats',
  '/api/badges',
  '/api/logs'
];

// AI endpoints (cache with shorter TTL)
const AI_ENDPOINTS = [
  '/api/ai/suggestions',
  '/api/ai/analysis',
  '/api/ai/recommendations'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE && 
                cacheName !== API_CACHE && 
                cacheName !== AI_CACHE && 
                cacheName !== IMAGES_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(url)) {
      event.respondWith(handleStaticAsset(request));
    } else if (isAPIRequest(url)) {
      event.respondWith(handleAPIRequest(request));
    } else if (isAIRequest(url)) {
      event.respondWith(handleAIRequest(request));
    } else if (isImageRequest(url)) {
      event.respondWith(handleImageRequest(request));
    } else {
      event.respondWith(handleNavigationRequest(request));
    }
  } else if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    event.respondWith(handleMutationRequest(request));
  }
});

// Check if request is for static assets
function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) ||
         STATIC_ASSETS.some(asset => url.pathname === asset);
}

// Check if request is for API
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') && !isAIRequest(url);
}

// Check if request is for AI endpoints
function isAIRequest(url) {
  return AI_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint));
}

// Check if request is for images
function isImageRequest(url) {
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp)$/);
}

// Handle static assets with Cache First strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Static asset fetch failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle API requests with Network First, fallback to cache
async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(API_CACHE);
    
    // Try network first
    try {
      const networkResponse = await fetch(request, {
        headers: {
          ...request.headers,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (networkResponse.ok) {
        // Cache successful responses
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (networkError) {
      console.log('Network failed, trying cache:', networkError);
    }
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      // Add offline header
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    // Return offline response
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This data is not available offline' 
      }), 
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('API request failed:', error);
    return new Response(
      JSON.stringify({ error: 'Service unavailable' }), 
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle AI requests with Cache First (for performance), Network update
async function handleAIRequest(request) {
  try {
    const cache = await caches.open(AI_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Return cached response immediately if available
    if (cachedResponse) {
      // Update cache in background if online
      if (navigator.onLine) {
        fetch(request).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        }).catch(() => {});
      }
      return cachedResponse;
    }
    
    // Try network if no cache
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (networkError) {
      console.log('AI network request failed:', networkError);
    }
    
    // Return offline AI response
    return new Response(
      JSON.stringify({ 
        error: 'AI_OFFLINE', 
        message: 'AI features require internet connection',
        suggestion: 'Please check your connection and try again'
      }), 
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('AI request failed:', error);
    return new Response(
      JSON.stringify({ error: 'AI service unavailable' }), 
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Handle image requests with Cache First strategy
async function handleImageRequest(request) {
  try {
    const cache = await caches.open(IMAGES_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Image fetch failed:', error);
    // Return placeholder image or 404
    return new Response('', { status: 404 });
  }
}

// Handle navigation requests (HTML pages)
async function handleNavigationRequest(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback to cached index.html or offline page
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match('/') || await cache.match('/offline.html');
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Last resort offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Study Sentinel - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .offline { color: #666; }
        </style>
      </head>
      <body>
        <div class="offline">
          <h1>You're Offline</h1>
          <p>Study Sentinel is working in offline mode.</p>
          <p>Some features may be limited until you reconnect.</p>
          <button onclick="window.location.reload()">Try Again</button>
        </div>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// Handle mutation requests (POST, PUT, DELETE)
async function handleMutationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Store in IndexedDB for later sync (handled by app)
    console.log('Mutation request failed, will be queued for sync:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'QUEUED_FOR_SYNC', 
        message: 'Changes saved locally and will sync when online' 
      }), 
      { 
        status: 202, // Accepted
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Background sync for queued requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // This will be handled by the main app's sync engine
  // Send message to main thread to trigger sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'BACKGROUND_SYNC_REQUESTED' });
  });
}

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}

// Periodic cache cleanup
setInterval(async () => {
  try {
    // Clean up expired AI cache entries (older than 1 hour)
    const aiCache = await caches.open(AI_CACHE);
    const requests = await aiCache.keys();
    
    for (const request of requests) {
      const response = await aiCache.match(request);
      if (response) {
        const cacheDate = response.headers.get('date');
        if (cacheDate) {
          const age = Date.now() - new Date(cacheDate).getTime();
          if (age > 60 * 60 * 1000) { // 1 hour
            await aiCache.delete(request);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup failed:', error);
  }
}, 30 * 60 * 1000); // Run every 30 minutes

console.log('Study Sentinel Service Worker loaded');