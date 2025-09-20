import hosts from '@/lib/third-party/hosts.json';
import { areRemoteApisEnabled } from '@/lib/remote-api-gate';

const ALLOWED_HOSTS = new Set<string>(hosts as string[]);

function toURL(input: RequestInfo | URL): URL {
  if (typeof input === 'string') {
    try {
      return new URL(input);
    } catch {
      // Treat as relative; resolve against current origin (or localhost in SSR/tests)
      const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
      return new URL(input, base);
    }
  }
  if (input instanceof URL) return input;
  return new URL((input as Request).url);
}

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isAllowedHost(url: URL): boolean {
  return ALLOWED_HOSTS.has(url.hostname);
}

function makeStubResponse(url: URL): Response {
  const body = JSON.stringify({ stub: true, url: url.toString() });
  return new Response(body, {
    status: 204,
    headers: {
      'Content-Type': 'application/json',
      'X-Third-Party-Stub': 'true'
    }
  });
}

async function parseJsonGuarded(res: Response): Promise<any> {
  if (!res.ok) {
    throw new Error(`thirdPartyGate: response not OK (status ${res.status})`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('thirdPartyGate: expected JSON response');
  }
  return res.json();
}

export const thirdPartyGate = {
  /**
   * Raw fetch wrapper for third-party absolute URLs.
   * - dev/CI: no-op/stub unless remote APIs are explicitly enabled
   * - prod: only allow allowlisted hosts, hard-block unknown
   */
  async fetchRaw(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    const url = toURL(input);

    if (!isProd()) {
      if (!areRemoteApisEnabled()) {
        if (process.env.SHOW_THIRD_PARTY_ATTEMPTS === 'true') {
          // Low-noise logging when opted-in
          // eslint-disable-next-line no-console
          console.info(`[thirdPartyGate] stubbed ${url.toString()}`);
        }
        return makeStubResponse(url);
      }
      // In dev with remote APIs enabled: enforce allowlist for safety
      if (!isAllowedHost(url)) {
        throw new Error(`thirdPartyGate: host not allowlisted in dev: ${url.hostname}`);
      }
      return fetch(url, init);
    }

    // Production: enforce hard allowlist
    if (!isAllowedHost(url)) {
      throw new Error(`thirdPartyGate: host not allowlisted: ${url.hostname}`);
    }
    return fetch(url, init);
  },

  /**
   * JSON helper with standard guards
   */
  async fetchJson<T = any>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
    const res = await this.fetchRaw(input, init);
    return parseJsonGuarded(res) as Promise<T>;
  }
};

export type ThirdPartyGate = typeof thirdPartyGate;
