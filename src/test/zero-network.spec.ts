import { expectRemoteApisDisabled, logRemoteApisState } from '@/test/remote-apis';

// Runtime tripwire: when remote off, block raw fetch outside of gates
beforeAll(() => {
  logRemoteApisState('zero-network.spec');
  const originalFetch = global.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Allow relative URLs (local assets/offline.html)
    const url = typeof input === 'string' ? input : (input as Request).url;
    if (typeof url === 'string' && url.startsWith('/')) {
      return originalFetch(input as any, init);
    }
    throw new Error('Runtime tripwire: outbound fetch must use a gate (internalApiGate/thirdPartyGate) with remote_apis disabled');
  };
});

afterAll(() => {
  // restore not needed in isolated test envs
});

it('enforces zero-network posture by default', () => {
  expect(() => expectRemoteApisDisabled()).not.toThrow();
});
