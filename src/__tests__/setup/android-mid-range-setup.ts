import type { TestCapacitor } from '@tests/types/capacitor-globals';
import { resolved } from '@tests/setup/jest-helpers';

const midRange: TestCapacitor = {
  platform: 'android',
  isNativePlatform: () => true,
  getPlatform: () => 'android',
  convertFileSrc: p => p,
  Plugins: {
    Device: {
      getInfo: resolved({
        platform: 'android',
        model: 'Pixel 4a',
        manufacturer: 'Google',
        osVersion: '13',
        operatingSystem: 'android',
        isVirtual: true,
        webViewVersion: '124.0.0.0'
      }),
      getId: resolved({ uuid: 'mock-uuid-mid', identifier: 'mock-uuid-mid' })
    },
    App:     { getInfo: resolved({ name: 'Study Sentinel', id: 'app.studysentinel', version: '1.0.0', build: '100' }) },
    Network: { getStatus: resolved({ connected: true, connectionType: 'wifi' }) }
  }
};
(globalThis as any).Capacitor = midRange;
(globalThis as any).Capacitor.isPluginAvailable = (n: string) =>
  !!(globalThis as any).Capacitor?.Plugins?.[n];