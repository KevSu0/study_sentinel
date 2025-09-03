/**
 * Service Worker Mock
 * 
 * Provides a mock implementation of Service Worker API for testing offline
 * functionality, caching, and background sync capabilities.
 */

// Mock Service Worker registration
export class ServiceWorkerRegistrationMock implements Partial<ServiceWorkerRegistration> {
  active: ServiceWorker | null = {
    scriptURL: '/service-worker.js',
    state: 'activated',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn().mockReturnValue(true),
    onerror: null,
    onstatechange: null,
  };
  
  installing: ServiceWorker | null = null;
  waiting: ServiceWorker | null = null;
  scope: string = '/';
  updateViaCache: ServiceWorkerUpdateViaCache = 'imports';
  navigationPreload: NavigationPreloadManager = {
    enable: jest.fn().mockResolvedValue(undefined),
    disable: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn().mockResolvedValue({ enabled: false }),
    setHeaderValue: jest.fn().mockResolvedValue(undefined),
  };
  
  // Methods
  update = jest.fn().mockResolvedValue(undefined);
  unregister = jest.fn().mockResolvedValue(true);
  
  // Event handlers
  onupdatefound: ((this: ServiceWorkerRegistration, ev: Event) => any) | null = null;
  
  // Background Sync API
  sync: SyncManager = {
    register: jest.fn().mockResolvedValue(undefined),
    getTags: jest.fn().mockResolvedValue([]),
  } as SyncManager;
  
  // Periodic Sync API (partial implementation)
  periodicSync = {
    register: jest.fn().mockResolvedValue(undefined),
    unregister: jest.fn().mockResolvedValue(undefined),
    getTags: jest.fn().mockResolvedValue([]),
  };
  
  // Push API
  pushManager: PushManager = {
    subscribe: jest.fn().mockResolvedValue({
      endpoint: 'https://fcm.googleapis.com/fcm/send/mock-subscription-id',
      expirationTime: null,
      getKey: jest.fn().mockReturnValue(new Uint8Array(16)),
      options: { userVisibleOnly: true },
      toJSON: jest.fn().mockReturnValue({}),
    }),
    getSubscription: jest.fn().mockResolvedValue(null),
    permissionState: jest.fn().mockResolvedValue('prompt'),
  } as PushManager;
  
  // Event listeners
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn().mockReturnValue(true);
}

// Mock Service Worker container
export class ServiceWorkerContainerMock implements Partial<ServiceWorkerContainer> {
  controller: ServiceWorker | null = null;
  ready: Promise<ServiceWorkerRegistration> = Promise.resolve(new ServiceWorkerRegistrationMock());
  
  // Methods
  register = jest.fn().mockResolvedValue(new ServiceWorkerRegistrationMock());
  getRegistration = jest.fn().mockResolvedValue(new ServiceWorkerRegistrationMock());
  getRegistrations = jest.fn().mockResolvedValue([new ServiceWorkerRegistrationMock()]);
  startMessages = jest.fn();
  
  // Event handlers
  oncontrollerchange: ((this: ServiceWorkerContainer, ev: Event) => any) | null = null;
  onmessage: ((this: ServiceWorkerContainer, ev: MessageEvent) => any) | null = null;
  onmessageerror: ((this: ServiceWorkerContainer, ev: MessageEvent) => any) | null = null;
  
  // Event listeners
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn().mockReturnValue(true);
}

// Mock Cache API
export class CacheStorageMock implements Partial<CacheStorage> {
  private caches: Map<string, CacheMock> = new Map();
  
  open = jest.fn().mockImplementation((cacheName: string) => {
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new CacheMock());
    }
    return Promise.resolve(this.caches.get(cacheName));
  });
  
  has = jest.fn().mockImplementation((cacheName: string) => {
    return Promise.resolve(this.caches.has(cacheName));
  });
  
  delete = jest.fn().mockImplementation((cacheName: string) => {
    return Promise.resolve(this.caches.delete(cacheName));
  });
  
  keys = jest.fn().mockImplementation(() => {
    return Promise.resolve(Array.from(this.caches.keys()));
  });
  
  match = jest.fn().mockImplementation(() => {
    return Promise.resolve(undefined);
  });
}

// Mock Cache
export class CacheMock implements Partial<Cache> {
  private cache: Map<string, Response> = new Map();
  
  match = jest.fn().mockImplementation((request: RequestInfo) => {
    const url = typeof request === 'string' ? request : request.url;
    return Promise.resolve(this.cache.get(url) || undefined);
  });
  
  matchAll = jest.fn().mockImplementation(() => {
    return Promise.resolve(Array.from(this.cache.values()));
  });
  
  add = jest.fn().mockImplementation((request: RequestInfo) => {
    const url = typeof request === 'string' ? request : request.url;
    this.cache.set(url, new Response('Cached response'));
    return Promise.resolve();
  });
  
  addAll = jest.fn().mockImplementation((requests: RequestInfo[]) => {
    requests.forEach(request => {
      const url = typeof request === 'string' ? request : request.url;
      this.cache.set(url, new Response('Cached response'));
    });
    return Promise.resolve();
  });
  
  put = jest.fn().mockImplementation((request: RequestInfo, response: Response) => {
    const url = typeof request === 'string' ? request : request.url;
    this.cache.set(url, response);
    return Promise.resolve();
  });
  
  delete = jest.fn().mockImplementation((request: RequestInfo) => {
    const url = typeof request === 'string' ? request : request.url;
    return Promise.resolve(this.cache.delete(url));
  });
  
  keys = jest.fn().mockImplementation(() => {
    return Promise.resolve(
      Array.from(this.cache.keys()).map(url => new Request(url))
    );
  });
}

// Setup function to install the mocks
export function setupServiceWorkerMock(): void {
  // Mock service worker
  Object.defineProperty(navigator, 'serviceWorker', {
    value: new ServiceWorkerContainerMock(),
    configurable: true,
  });
  
  // Mock caches
  Object.defineProperty(window, 'caches', {
    value: new CacheStorageMock(),
    configurable: true,
  });
}

// Helper functions for testing
export const serviceWorkerTestHelpers = {
  // Simulate service worker installation
  async simulateInstall(): Promise<void> {
    const registration = await (navigator.serviceWorker as ServiceWorkerContainerMock).getRegistration();
    const installEvent = new Event('install');
    registration.active?.dispatchEvent(installEvent);
  },
  
  // Simulate service worker activation
  async simulateActivate(): Promise<void> {
    const registration = await (navigator.serviceWorker as ServiceWorkerContainerMock).getRegistration();
    const activateEvent = new Event('activate');
    registration.active?.dispatchEvent(activateEvent);
  },
  
  // Simulate fetch event
  async simulateFetch(url: string): Promise<Response | undefined> {
    const cache = await (window.caches as CacheStorageMock).open('study-sentinel-v1');
    return cache.match(url);
  },
  
  // Simulate offline mode
  setOffline(offline: boolean = true): void {
    Object.defineProperty(navigator, 'onLine', {
      value: !offline,
      configurable: true,
    });
    
    // Dispatch online/offline event
    const event = new Event(offline ? 'offline' : 'online');
    window.dispatchEvent(event);
  },
  
  // Simulate background sync
  async simulateBackgroundSync(tag: string = 'sync-plans'): Promise<void> {
    const registration = await (navigator.serviceWorker as ServiceWorkerContainerMock).getRegistration();
    const syncEvent = new Event('sync');
    (syncEvent as any).tag = tag;
    registration.active?.dispatchEvent(syncEvent);
  },
  
  // Reset all mocks
  resetMocks(): void {
    setupServiceWorkerMock();
  },
};