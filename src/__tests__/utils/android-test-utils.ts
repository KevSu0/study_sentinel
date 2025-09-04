export type DeviceTier = 'high' | 'mid' | 'low' | string;

export function setDeviceProfile(p: DeviceTier): void {
  globalThis.__MOCK_DEVICE_PROFILE__ = p;
}

export function getDeviceProfile(): DeviceTier {
  return globalThis.__MOCK_DEVICE_PROFILE__ ?? 'mid';
}