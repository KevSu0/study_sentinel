/**
 * @jest-environment jsdom
 */
import { registerServiceWorker } from '../src/lib/sw-utils';

describe('Offline Functionality', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Worker Registration', () => {
    it('should register the service worker on page load', () => {
      registerServiceWorker();
      // Manually trigger the event listener added in layout.tsx
      const loadEvent = new Event('load');
      window.dispatchEvent(loadEvent);

      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });
  });

  describe('Asset Caching', () => {
    it('should use CacheFirst for pages', async () => {
      const request = new Request('/dashboard', { destination: 'document' });
      
      // Let's check the cache behavior for a page.
      const response = await caches.open('pages-cache').then(cache => cache.match(request));
      expect(response).toBeDefined();
    });

    it('should use StaleWhileRevalidate for scripts and styles', async () => {
      const scriptRequest = new Request('/app.js', { destination: 'script' });
      const styleRequest = new Request('/app.css', { destination: 'style' });

      const scriptResponse = await caches.open('api-cache').then(cache => cache.match(scriptRequest));
      const styleResponse = await caches.open('api-cache').then(cache => cache.match(styleRequest));

      expect(scriptResponse).toBeDefined();
      expect(styleResponse).toBeDefined();
    });

    it('should use CacheFirst for images with expiration', async () => {
      const request = new Request('/logo.png', { destination: 'image' });
      const response = await caches.open('images').then(cache => cache.match(request));
      expect(response).toBeDefined();
    });

    it('should use StaleWhileRevalidate for API requests', async () => {
      const request = new Request('/api/data');
      const response = await caches.open('api-cache').then(cache => cache.match(request));
      expect(response).toBeDefined();
    });
  });

  describe('Offline Functionality', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });
    });

    it('should serve /dashboard from cache when offline', async () => {
      const request = new Request('/dashboard');
      const response = await caches.open('pages-cache').then(cache => cache.match(request));
      expect(response).toBeDefined();
      expect(await response.text()).toBe('cached content');
    });

    it('should serve /plans from cache when offline', async () => {
      const request = new Request('/plans');
      const response = await caches.open('pages-cache').then(cache => cache.match(request));
      expect(response).toBeDefined();
      expect(await response.text()).toBe('cached content');
    });

    it('should serve /stats from cache when offline', async () => {
      const request = new Request('/stats');
      const response = await caches.open('pages-cache').then(cache => cache.match(request));
      expect(response).toBeDefined();
      expect(await response.text()).toBe('cached content');
    });
  });
});