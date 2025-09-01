import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import 'core-js/actual/structured-clone';
import { __setTestDB, getDB } from '@/lib/db';
import { cleanup } from '@testing-library/react';
// Node polyfills for server-side rendering in tests
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const util = require('util');
  if (!(global as any).TextEncoder) {
    (global as any).TextEncoder = util.TextEncoder;
  }
  if (!(global as any).TextDecoder) {
    (global as any).TextDecoder = util.TextDecoder;
  }
} catch {}
// Minimal dynamic() mock to avoid Next.js runtime in tests
jest.mock('next/dynamic', () => () => {
  const DynamicComponent = (_props: any) => null;
  (DynamicComponent as any).displayName = 'DynamicMock';
  return DynamicComponent;
});

// Force a consistent timezone for date-fns and study-day logic
try { (process as any).env.TZ = (process as any).env.TZ || 'UTC'; } catch {}

// Ensure window is available in jsdom environment
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock ResizeObserver
  class MockResizeObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  }
  // @ts-ignore
  window.ResizeObserver = MockResizeObserver as any;
  // @ts-ignore
  global.ResizeObserver = MockResizeObserver as any;

  // Mock IntersectionObserver
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    })),
  });

  // Mock performance.memory for performance monitoring
  Object.defineProperty(window.performance, 'memory', {
    writable: true,
    value: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000,
    },
  });

  // Mock performance.mark and performance.measure
  Object.defineProperty(window.performance, 'mark', {
    writable: true,
    value: jest.fn(),
  });

  Object.defineProperty(window.performance, 'measure', {
    writable: true,
    value: jest.fn(),
  });

  Object.defineProperty(window.performance, 'getEntriesByName', {
    writable: true,
    value: jest.fn().mockReturnValue([]),
  });

  Object.defineProperty(window.performance, 'clearMarks', {
    writable: true,
    value: jest.fn(),
  });

  Object.defineProperty(window.performance, 'clearMeasures', {
    writable: true,
    value: jest.fn(),
  });

  // Polyfill pointer capture APIs used by Radix UI components
  if (!('hasPointerCapture' in Element.prototype)) {
    // @ts-ignore
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!('setPointerCapture' in Element.prototype)) {
    // @ts-ignore
    Element.prototype.setPointerCapture = () => {};
  }
  if (!('releasePointerCapture' in Element.prototype)) {
    // @ts-ignore
    Element.prototype.releasePointerCapture = () => {};
  }

  // Polyfill createRange for components relying on selection APIs
  if (!document.createRange) {
    // @ts-ignore
    document.createRange = () => ({
      setStart: () => {},
      setEnd: () => {},
      commonAncestorContainer: document.documentElement,
      createContextualFragment: (html: string) => {
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content;
      },
      selectNodeContents: () => {},
      extractContents: () => document.createDocumentFragment(),
      cloneContents: () => document.createDocumentFragment(),
      insertNode: () => {},
      surroundContents: () => {},
    } as any);
  }

  // Mock scrollIntoView to avoid errors in JSDOM
  if (!('scrollIntoView' in Element.prototype)) {
    // @ts-ignore
    Element.prototype.scrollIntoView = () => {};
  }
}

// Mock global fetch if not available
if (!global.fetch) {
  global.fetch = jest.fn();
}

// Minimal Request polyfill for offline tests
if (typeof (global as any).Request === 'undefined') {
  class MockRequest {
    url: string;
    constructor(input: string) { this.url = input; }
  }
  // @ts-ignore
  (global as any).Request = MockRequest;
}

// Minimal Response polyfill to support NextResponse in tests
if (typeof (global as any).Response === 'undefined') {
  class MockResponse {
    status: number;
    private _body: any;
    constructor(body?: any, init?: { status?: number }) {
      this.status = init?.status ?? 200;
      this._body = body;
    }
    async text() { return typeof this._body === 'string' ? this._body : JSON.stringify(this._body ?? ''); }
    async json() { return typeof this._body === 'string' ? JSON.parse(this._body || '{}') : this._body; }
  }
  // @ts-ignore
  (global as any).Response = MockResponse as any;
}

// Cache API polyfill for offline tests
if (typeof (global as any).caches === 'undefined') {
  const mockResponse = (body: string) => ({ text: async () => body } as any);
  (global as any).caches = {
    open: async (_: string) => ({
      match: async (_req: any) => mockResponse('cached content'),
      put: async () => undefined,
    }),
  } as any;
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Service worker registration mock for offline tests
if (typeof (global as any).navigator === 'undefined') {
  // @ts-ignore
  global.navigator = {} as any;
}
// @ts-ignore
(navigator as any).serviceWorker = (navigator as any).serviceWorker || { register: jest.fn().mockResolvedValue({}) };

// Ensure react-hot-toast named export compatibility in tests
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rht = require('react-hot-toast');
  if (rht && !rht.toast && rht.default) {
    rht.toast = rht.default;
  }
} catch {}

// Trivial test to satisfy Jest when scanning __tests__ helpers.
test('jest setup runs', () => {
  expect(typeof window).toBe('object');
});

// Default to real timers at the start of each test
beforeEach(() => {
  try { jest.useRealTimers(); } catch {}
  try {
    const make = (global as any).__makeDBName || ((ns: string) => `${ns}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    __setTestDB(make('TestDB'));
  } catch {}
});

// Global safety: ensure no test leaves fake timers enabled
afterEach(async () => {
  try { cleanup(); } catch {}
  try { await ((global as any).tick?.() || Promise.resolve()); } catch {}
  try {
    // Reset to real timers to prevent polling/waitFor hangs in later tests
    jest.useRealTimers();
  } catch {}
  try {
    // Avoid cross-test leakage of persisted state
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  } catch {}
  try {
    // Clear Dexie DB used in this test
    if (typeof indexedDB !== 'undefined') {
      const name = getDB().name;
      try { getDB().close(); } catch {}
      indexedDB.deleteDatabase(name);
    }
  } catch {}
});

// Provide deterministic element sizes for charting libraries in JSDOM
try {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
} catch {}

// Some chart libs query SVG getBBox; provide a stable stub
try {
  // @ts-ignore
  if (!SVGElement.prototype.getBBox) {
    // @ts-ignore
    SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 50 });
  }
} catch {}

// Small async tick helper to flush microtasks/batched updates in tests
// Usage: await (global as any).tick();
try {
  // @ts-ignore
  global.tick = () => new Promise(resolve => setTimeout(resolve, 0));
} catch {}

// Helper to generate unique names (e.g., for DBs) if needed
try {
  // @ts-ignore
  global.__makeDBName = (ns = 'AppDB') => `${ns}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
} catch {}

// Surface unexpected console errors as test failures (helps catch act/Dexie issues)
try {
  const originalError = console.error;
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
      originalError(...args);
      const msg = args.join(' ');
      if (/ConstraintError|Failed to add item to sessions|not wrapped in act|Unhandled/i.test(msg)) {
        throw new Error(`ConsoleError surfaced by test: ${msg}`);
      }
    });
  });
  afterAll(() => (console.error as any).mockRestore?.());
} catch {}

// Surface problematic console.warn to catch layout/observer issues early
try {
  const originalWarn = console.warn;
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation((...args: any[]) => {
      originalWarn(...args);
      const msg = args.join(' ');
      if (/act\(|deprecated|ResizeObserver loop limit exceeded/i.test(msg)) {
        throw new Error(`ConsoleWarn surfaced by test: ${msg}`);
      }
    });
  });
  afterAll(() => (console.warn as any).mockRestore?.());
} catch {}
