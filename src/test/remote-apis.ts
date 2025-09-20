const FEATURE_FLAGS_KEY = 'featureFlags';

function readFeatureFlags(): Record<string, unknown> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(FEATURE_FLAGS_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore malformed payloads
  }
  return {};
}

function writeFeatureFlags(flags: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  if (Object.keys(flags).length === 0) {
    window.localStorage.removeItem(FEATURE_FLAGS_KEY);
    return;
  }
  window.localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(flags));
}

function setRemoteApis(value: boolean) {
  const flags = readFeatureFlags();
  flags.remote_apis = value;
  writeFeatureFlags(flags);
  if (typeof process !== 'undefined' && process.env) {
    process.env.NEXT_PUBLIC_ENABLE_REMOTE_APIS = value ? 'true' : 'false';
  }
}

export function enableRemoteApis(): void {
  setRemoteApis(true);
}

export function disableRemoteApis(): void {
  setRemoteApis(false);
}

export function clearRemoteApisOverride(): void {
  const flags = readFeatureFlags();
  delete flags.remote_apis;
  writeFeatureFlags(flags);
  if (typeof process !== 'undefined' && process.env) {
    process.env.NEXT_PUBLIC_ENABLE_REMOTE_APIS = 'false';
  }
}

export function areRemoteApisEnabled(): boolean {
  if (typeof window !== 'undefined' && window.localStorage) {
    const flags = readFeatureFlags();
    if (typeof flags.remote_apis === 'boolean') {
      return flags.remote_apis;
    }
  }
  return typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ENABLE_REMOTE_APIS === 'true';
}

export function logRemoteApisState(context = 'test bootstrap'): void {
  const state = areRemoteApisEnabled() ? 'enabled' : 'disabled';
  const cspMode = process.env.CSP_REPORT_ONLY === 'true' ? 'report-only' : 'enforced';
  console.info(`[remote-apis] ${context}: ${state} | CSP=${cspMode}`);
}

export function useRemoteApis(): void {
  if (typeof beforeEach === 'function') {
    beforeEach(enableRemoteApis);
  }
  if (typeof afterEach === 'function') {
    afterEach(disableRemoteApis);
  }
}

export function expectRemoteApisDisabled(): void {
  if (areRemoteApisEnabled()) {
    throw new Error('remote_apis flag expected to be disabled for this test. Call disableRemoteApis() or useRemoteApis().');
  }
}
