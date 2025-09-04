import type { TestCapacitor } from '@tests/types/capacitor-globals';
import { resolved } from '@tests/setup/jest-helpers';

const lowEnd: TestCapacitor = {
  platform: 'android',
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  convertFileSrc: p => p,
  Plugins: {
    Device: {
      getInfo: resolved({
        platform: 'android',
        model: 'Android Go Edition',
        manufacturer: 'Generic',
        osVersion: '12',
        operatingSystem: 'android',
        isVirtual: true,
        webViewVersion: '124.0.0.0'
      }),
      getId: resolved({ uuid: 'mock-uuid-low', identifier: 'mock-uuid-low' })
    },
    App:     { getInfo: resolved({ name: 'Study Sentinel', id: 'app.studysentinel', version: '1.0.0', build: '100' }) },
    Network: { getStatus: resolved({ connected: true, connectionType: 'cellular' }) }
  }
};
(globalThis as any).Capacitor = lowEnd;
(globalThis as any).Capacitor.isPluginAvailable = (n: string) =>
  !!(globalThis as any).Capacitor?.Plugins?.[n];