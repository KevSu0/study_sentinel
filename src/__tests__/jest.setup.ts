import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import 'core-js/actual/structured-clone';

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
});

// Global safety: ensure no test leaves fake timers enabled
afterEach(() => {
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
});
