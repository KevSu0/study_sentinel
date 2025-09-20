import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { swTestHarness } from '@/test/sw-test-harness';
import { disableRemoteApis, logRemoteApisState } from '@/test/remote-apis';

// Enforce no-ghost-network posture in tests: default OFF, explicit opt-in per suite
try {
  disableRemoteApis();
  logRemoteApisState('jest.setup');
} catch (e) {
  // In non-jsdom contexts or if localStorage is not available, ignore
}

import { MockCanaryManager, MockMonitoringDashboard } from './src/test/__mocks__/canary-manager-mock';

const NOT_WRAPPED_IN_ACT_WARNING = 'not wrapped in act';
const originalConsoleError = console.error;
console.error = (message, ...args) => {
  const text = typeof message === 'string' ? message : String(message);
  if (text.includes(NOT_WRAPPED_IN_ACT_WARNING)) {
    // React warns when Next's loadable triggers post-render state updates; safe to silence in tests.
    return;
  }
  originalConsoleError.call(console, message, ...args);
};

const isJsdomEnvironment = typeof window !== 'undefined' && typeof window.document !== 'undefined';

const createHeadersPolyfill = () => {
  const NativeHeaders = typeof globalThis.Headers === 'function' ? globalThis.Headers : undefined;

  const normalizeName = (name) => {
    const normalized = String(name);
    if (!/^[-!#$%&'*+.^_`|~0-9A-Za-z]+$/.test(normalized)) {
      throw new TypeError(`Invalid header name: ${normalized}`);
    }
    return normalized.toLowerCase();
  };

  const toHeaderValue = (value) => {
    if (value === undefined || value === null) {
      throw new TypeError('Header value must not be null or undefined');
    }
    return String(value);
  };

  class HeadersPolyfill {
    constructor(init) {
      this._map = new Map();

      if (!init) {
        return;
      }

      if (init instanceof HeadersPolyfill) {
        init.forEach((value, name) => this.set(name, value));
        return;
      }

      if (NativeHeaders && init instanceof NativeHeaders) {
        init.forEach((value, name) => this.set(name, value));
        return;
      }

      if (Array.isArray(init)) {
        init.forEach(([name, value]) => this.append(name, value));
        return;
      }

      Object.keys(init).forEach((key) => this.set(key, init[key]));
    }

    append(name, value) {
      const normalized = normalizeName(name);
      const headerValue = toHeaderValue(value);
      const existing = this._map.get(normalized);

      if (existing) {
        existing.value = `${existing.value}, ${headerValue}`;
        return;
      }

      this._map.set(normalized, { name, value: headerValue });
    }

    delete(name) {
      return this._map.delete(normalizeName(name));
    }

    entries() {
      return this[Symbol.iterator]();
    }

    forEach(callback, thisArg) {
      for (const [name, value] of this) {
        callback.call(thisArg, value, name, this);
      }
    }

    get(name) {
      const entry = this._map.get(normalizeName(name));
      return entry ? entry.value : null;
    }

    has(name) {
      return this._map.has(normalizeName(name));
    }

    keys() {
      return Array.from(this._map.values()).map((entry) => entry.name)[Symbol.iterator]();
    }

    set(name, value) {
      const normalized = normalizeName(name);
      this._map.set(normalized, { name, value: toHeaderValue(value) });
    }

    values() {
      return Array.from(this._map.values()).map((entry) => entry.value)[Symbol.iterator]();
    }

    [Symbol.iterator]() {
      return Array.from(this._map.values()).map((entry) => [entry.name, entry.value])[Symbol.iterator]();
    }
  }

  return HeadersPolyfill;
};

if (typeof globalThis.Headers === 'undefined') {
  globalThis.Headers = createHeadersPolyfill();
}

const createMockFetchResponse = (overrides = {}) => {
  const { headers: headersInit, json, text, ok, status, ...rest } = overrides;
  const headers = headersInit instanceof Headers ? headersInit : new Headers(headersInit || {});

  const response = {
    ok: typeof ok === 'boolean' ? ok : true,
    status: typeof status === 'number' ? status : 200,
    headers,
    json: typeof json === 'function' ? json : async () => ({}),
    text: typeof text === 'function' ? text : async () => '',
    ...rest,
  };

  response.clone = () =>
    createMockFetchResponse({
      ok: response.ok,
      status: response.status,
      headers: new Headers(response.headers),
      json: response.json,
      text: response.text,
      ...rest,
    });

  return response;
};

let defaultFetchImpl;

if (isJsdomEnvironment) {
  defaultFetchImpl = async () => createMockFetchResponse();
  global.fetch = jest.fn(defaultFetchImpl);
  global.createMockFetchResponse = createMockFetchResponse;
}

jest.mock('@/lib/canary-manager', () => ({
  CanaryManager: MockCanaryManager,
}));

jest.mock('@/lib/monitoring-dashboard', () => ({
  MonitoringDashboard: MockMonitoringDashboard,
}));

jest.mock('@/ai/genkit', () => {
  const defineFlow = (_config, handler) => {
    const flow = async (...args) => handler(...args);
    flow.run = async (...args) => ({ result: await handler(...args) });
    return flow;
  };

  return { ai: { defineFlow } };
});

// Mock structuredClone for fake-indexeddb
if (!global.structuredClone) {
  global.structuredClone = (obj) => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => global.structuredClone(item));
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof RegExp) {
      return new RegExp(obj.source, obj.flags);
    }

    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = global.structuredClone(obj[key]);
      }
    }
    return cloned;
  };
}
const React = require('react');

// Mock PointerEvent for Radix UI components, only if in a browser-like environment
if (typeof MouseEvent !== 'undefined' && !global.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type, props) {
      super(type, props);
      this.pointerId = props.pointerId;
    }
  }
  global.PointerEvent = PointerEvent;
}

// Only run this setup in a browser-like environment
if (typeof Element !== 'undefined') {
  beforeAll(() => {
    if (typeof Element.prototype.hasPointerCapture === 'undefined') {
      Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
    }
    if (typeof Element.prototype.setPointerCapture === 'undefined') {
      Element.prototype.setPointerCapture = jest.fn();
    }
    if (typeof Element.prototype.releasePointerCapture === 'undefined') {
      Element.prototype.releasePointerCapture = jest.fn();
    }
    if (typeof Element.prototype.scrollIntoView === 'undefined') {
      Element.prototype.scrollIntoView = jest.fn();
    }
  });
}

jest.mock('lucide-react', () => {
  return new Proxy(
    {},
    {
      get(target, prop) {
        if (typeof prop === 'string' && prop[0] === prop[0].toUpperCase()) {
          const MockIcon = (props) => {
            const testId = prop
              .replace(/([a-z0-9])([A-Z])/g, '-')
              .toLowerCase() + '-icon';
            return React.createElement('div', { 'data-testid': testId, ...props });
          };
          MockIcon.displayName = prop;
          return MockIcon;
        }
        return jest.fn();
      },
    }
  );
});

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

if (!global.swTestHarness) {
  global.swTestHarness = swTestHarness;
}

beforeEach(() => {
  swTestHarness.reset();
  swTestHarness.setOnline(true);
  if (isJsdomEnvironment && typeof global.fetch?.mockClear === 'function') {
    global.fetch.mockClear();
    global.fetch.mockImplementation(defaultFetchImpl);
  }
});

if (isJsdomEnvironment && !global.caches) {
  const cacheStore = new Map();
  global.caches = {
    keys: jest.fn(async () => Array.from(cacheStore.keys())),
    open: jest.fn(async (name) => {
      if (!cacheStore.has(name)) {
        cacheStore.set(name, new Map());
      }
      const entries = cacheStore.get(name);
      return {
        keys: jest.fn(async () => Array.from(entries.keys()).map((url) => ({ url }))),
        match: jest.fn(async (request) => {
          const key = typeof request === 'string' ? request : request.url;
          return entries.get(key) ?? null;
        }),
        put: jest.fn(async (request, value) => {
          const key = typeof request === 'string' ? request : request.url;
          entries.set(key, value);
        }),
        delete: jest.fn(async (request) => {
          const key = typeof request === 'string' ? request : request.url;
          return entries.delete(key);
        }),
      };
    }),
    delete: jest.fn(async (name) => cacheStore.delete(name)),
  };
}

if (isJsdomEnvironment && !('storage' in navigator)) {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    value: {
      estimate: jest.fn(async () => ({ usage: 0, quota: 1024 * 1024 * 512 })),
    },
  });
}




