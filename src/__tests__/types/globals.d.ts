declare global {
  // Custom test switches
  var __MOCK_DEVICE_PROFILE__: 'high' | 'mid' | 'low' | string;

  // Battery API (removed from lib.dom in most TS versions)
  interface BatteryManager {
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
    level: number;
    addEventListener?: (t: string, l: (...a:any[]) => void) => void;
    removeEventListener?: (t: string, l: (...a:any[]) => void) => void;
  }
  interface Navigator {
    getBattery?: () => Promise<BatteryManager>;
  }

  // Optional memory stats used by some perf tests
  interface Performance {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }
}
export {};
