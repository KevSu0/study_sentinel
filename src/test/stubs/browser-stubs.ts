// Test stubs for browser APIs that aren't available in Jest/jsdom environment

// Type declarations for missing browser APIs
declare global {
  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }

  interface PeriodicSyncManager {
    register(tag: string, minInterval: number): Promise<void>;
    getTags(): Promise<PeriodicSyncRegistration[]>;
  }

  interface PeriodicSyncRegistration {
    tag: string;
    minInterval: number;
  }

  interface Notifications {
    getPermission(): Promise<NotificationPermission>;
    requestPermission(): Promise<NotificationPermission>;
  }
}

export interface ServiceWorkerTestStub extends ServiceWorker {
  postMessage: jest.Mock;
  state: ServiceWorkerState;
  onstatechange: ((this: ServiceWorker, ev: Event) => any) | null;
  scriptURL: string;
}

export interface ServiceWorkerRegistrationTestStub extends ServiceWorkerRegistration {
  active: ServiceWorkerTestStub | null;
  installing: ServiceWorkerTestStub | null;
  waiting: ServiceWorkerTestStub | null;
  navigationPreload: NavigationPreloadManager | null;
  pushManager: PushManager | null;
  sync: SyncManager | null;
  periodicSync: PeriodicSyncManager | null;
  notifications: Notifications | null;
  onupdatefound: ((this: ServiceWorkerRegistration, ev: Event) => any) | null;
  oncontrollerchange: ((this: ServiceWorkerRegistration, ev: Event) => any) | null;
  onerror: ((this: ServiceWorkerRegistration, ev: Event) => any) | null;
  update: jest.Mock;
  unregister: jest.Mock;
  getNotifications: jest.Mock;
  showNotification: jest.Mock;
}

export function createServiceWorkerStub(overrides: Partial<ServiceWorkerTestStub> = {}): ServiceWorkerTestStub {
  return {
    postMessage: jest.fn(),
    state: 'activated',
    onstatechange: null,
    scriptURL: '/sw.js',
    ...overrides
  } as ServiceWorkerTestStub;
}

export function createServiceWorkerRegistrationStub(overrides: Partial<ServiceWorkerRegistrationTestStub> = {}): ServiceWorkerRegistrationTestStub {
  return {
    active: createServiceWorkerStub(),
    installing: null,
    waiting: null,
    navigationPreload: null,
    pushManager: null,
    sync: null,
    periodicSync: null,
    notifications: null,
    onupdatefound: null,
    oncontrollerchange: null,
    onerror: null,
    update: jest.fn(),
    unregister: jest.fn(),
    getNotifications: jest.fn(),
    showNotification: jest.fn(),
    scope: '/',
    updateViaCache: 'none',
    ...overrides
  } as ServiceWorkerRegistrationTestStub;
}

export function createNotificationStub(overrides: Partial<Notification> = {}): Notification {
  return {
    title: 'Test Notification',
    body: 'This is a test notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    tag: 'test',
    data: {},
    timestamp: Date.now(),
    renotify: false,
    requireInteraction: false,
    actions: [],
    vibrate: [],
    silent: false,
    ...overrides
  } as Notification;
}