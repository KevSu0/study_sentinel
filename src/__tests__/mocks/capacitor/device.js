/**
 * Capacitor Device Plugin Mock
 * 
 * Mocks the Capacitor Device plugin for testing device information,
 * platform detection, and device-specific functionality.
 */

const DeviceMock = {
  // Device information
  getInfo: jest.fn().mockResolvedValue({
    model: 'Android SDK built for x86',
    platform: 'android',
    operatingSystem: 'android',
    osVersion: '11',
    manufacturer: 'Google',
    isVirtual: true,
    memUsed: 2048000000, // 2GB in bytes
    diskFree: 8000000000, // 8GB in bytes
    diskTotal: 16000000000, // 16GB in bytes
    realDiskFree: 8000000000,
    realDiskTotal: 16000000000,
    webViewVersion: '91.0.4472.120',
    name: 'Android SDK built for x86'
  }),
  
  // Get device ID
  getId: jest.fn().mockResolvedValue({
    uuid: 'mock-device-uuid-12345'
  }),
  
  // Get language code
  getLanguageCode: jest.fn().mockResolvedValue({
    value: 'en'
  }),
  
  // Get language tag
  getLanguageTag: jest.fn().mockResolvedValue({
    value: 'en-US'
  }),
  
  // Get battery info
  getBatteryInfo: jest.fn().mockResolvedValue({
    batteryLevel: 0.85,
    isCharging: false
  }),
  
  // Test helpers - not part of actual API
  __setDeviceInfo: (info) => {
    DeviceMock.getInfo.mockResolvedValue({
      model: 'Android SDK built for x86',
      platform: 'android',
      operatingSystem: 'android',
      osVersion: '11',
      manufacturer: 'Google',
      isVirtual: true,
      memUsed: 2048000000,
      diskFree: 8000000000,
      diskTotal: 16000000000,
      realDiskFree: 8000000000,
      realDiskTotal: 16000000000,
      webViewVersion: '91.0.4472.120',
      name: 'Android SDK built for x86',
      ...info
    });
  },
  
  __setBatteryInfo: (batteryInfo) => {
    DeviceMock.getBatteryInfo.mockResolvedValue({
      batteryLevel: 0.85,
      isCharging: false,
      ...batteryInfo
    });
  },
  
  __setLanguage: (languageCode, languageTag) => {
    DeviceMock.getLanguageCode.mockResolvedValue({ value: languageCode || 'en' });
    DeviceMock.getLanguageTag.mockResolvedValue({ value: languageTag || 'en-US' });
  },
  
  __simulateLowMemory: () => {
    DeviceMock.getInfo.mockResolvedValue({
      model: 'Android SDK built for x86',
      platform: 'android',
      operatingSystem: 'android',
      osVersion: '11',
      manufacturer: 'Google',
      isVirtual: true,
      memUsed: 3500000000, // 3.5GB - high memory usage
      diskFree: 500000000, // 500MB - low disk space
      diskTotal: 16000000000,
      realDiskFree: 500000000,
      realDiskTotal: 16000000000,
      webViewVersion: '91.0.4472.120',
      name: 'Android SDK built for x86'
    });
  },
  
  __simulateLowBattery: () => {
    DeviceMock.getBatteryInfo.mockResolvedValue({
      batteryLevel: 0.15, // 15% battery
      isCharging: false
    });
  },
  
  __reset: () => {
    DeviceMock.getInfo.mockResolvedValue({
      model: 'Android SDK built for x86',
      platform: 'android',
      operatingSystem: 'android',
      osVersion: '11',
      manufacturer: 'Google',
      isVirtual: true,
      memUsed: 2048000000,
      diskFree: 8000000000,
      diskTotal: 16000000000,
      realDiskFree: 8000000000,
      realDiskTotal: 16000000000,
      webViewVersion: '91.0.4472.120',
      name: 'Android SDK built for x86'
    });
    
    DeviceMock.getId.mockResolvedValue({
      uuid: 'mock-device-uuid-12345'
    });
    
    DeviceMock.getLanguageCode.mockResolvedValue({
      value: 'en'
    });
    
    DeviceMock.getLanguageTag.mockResolvedValue({
      value: 'en-US'
    });
    
    DeviceMock.getBatteryInfo.mockResolvedValue({
      batteryLevel: 0.85,
      isCharging: false
    });
  }
};

module.exports = DeviceMock;