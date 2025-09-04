// Keep this aligned with your actual plugin API. Prefer importing official types.

import type { DeviceInfo, DeviceId } from '@capacitor/device';
import type { AppInfo } from '@capacitor/app';
import type { NetworkStatus } from '@capacitor/network';

// Generic typed async jest mock: () => Promise<T>
type AsyncFn<T> = jest.MockedFunction<() => Promise<T>>;

export interface TestCapacitor {
  platform: 'android' | 'ios' | 'web';
  isNativePlatform: () => boolean;
  getPlatform: () => 'android' | 'ios' | 'web';
  convertFileSrc: (filePath: string) => string;
  Plugins: {
    Device: {
      getInfo: AsyncFn<DeviceInfo>;
      getId: AsyncFn<DeviceId>;
    };
    App: {
      getInfo: AsyncFn<AppInfo>;
    };
    Network: {
      getStatus: AsyncFn<NetworkStatus>;
    };
  };
}

// Optional helper present in some tests — don’t add it to the typed literal, attach at runtime.
declare global {
  var Capacitor: TestCapacitor & { isPluginAvailable?: (name: string) => boolean };
}
export {};
