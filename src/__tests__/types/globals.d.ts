// Test-only global augmentations
declare global {
  // device profile switch shared by tests/utilities
  var __MOCK_DEVICE_PROFILE__: 'high' | 'mid' | 'low' | string;

  // Optional shims your tests may call
  interface BatteryManager {
    charging: boolean; chargingTime: number; dischargingTime: number; level: number;
    addEventListener?: (t: string, l: (...a:any[]) => void) => void;
    removeEventListener?: (t: string, l: (...a:any[]) => void) => void;
  }
  interface Navigator { getBattery?: () => Promise<BatteryManager>; }
  interface Performance {
    memory?: { jsHeapSizeLimit: number; totalJSHeapSize: number; usedJSHeapSize: number; };
  }
}
export {};
