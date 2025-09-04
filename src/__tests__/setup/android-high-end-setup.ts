import type { TestCapacitor } from '@tests/types/capacitor-globals';
import { resolved } from '@tests/setup/jest-helpers';

const highEnd: TestCapacitor = {
  platform: 'android',
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  convertFileSrc: p => p,
  Plugins: {
    Device: {
      getInfo: resolved({
        platform: 'android',
        model: 'Pixel 6 Pro',
        manufacturer: 'Google',
        osVersion: '14',
        operatingSystem: 'android',
        isVirtual: true,
        webViewVersion: '124.0.0.0'
      }),
      getId: resolved({ uuid: 'mock-uuid-high', identifier: 'mock-uuid-high' })
    },
    App:     { getInfo: resolved({ name: 'Study Sentinel', id: 'app.studysentinel', version: '1.0.0', build: '100' }) },
    Network: { getStatus: resolved({ connected: true, connectionType: 'cellular' }) }
  }
};
(globalThis as any).Capacitor = highEnd;
(globalThis as any).Capacitor.isPluginAvailable = (n: string) =>
  !!(globalThis as any).Capacitor?.Plugins?.[n];