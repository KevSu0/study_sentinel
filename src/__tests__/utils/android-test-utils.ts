export type DeviceTier = 'high' | 'mid' | 'low' | string;

export function setDeviceProfile(p: DeviceTier): void {
  globalThis.__MOCK_DEVICE_PROFILE__ = p;
}

export function getDeviceProfile(): DeviceTier {
  return globalThis.__MOCK_DEVICE_PROFILE__ ?? 'mid';
}

export function resetTestEnvironment(): void {
  // Reset the mocked device profile to default state
  delete (globalThis as any).__MOCK_DEVICE_PROFILE__;
}