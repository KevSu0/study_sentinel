import { Device } from '@capacitor/device';
import { jest } from '@jest/globals';
import {
  createMockDevice,
  offlinePerformanceHelpers,
  setDeviceProfile,
  cleanupMobileTest,
} from '@tests/utils';

// Mock Capacitor Device plugin
jest.mock('@capacitor/device', () => ({
  Device: {
    getId: jest.fn(),
    getInfo: jest.fn(),
    getBatteryInfo: jest.fn(),
    getLanguageCode: jest.fn(),
    getLanguageTag: jest.fn(),
  },
}));

const mockDevice = Device as jest.Mocked<typeof Device>;

describe('Capacitor Device Plugin Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cleanupMobileTest();
  });

  describe('Device Identification', () => {
    it('should get device ID successfully', async () => {
      const mockId = { identifier: 'test-device-123' };
      mockDevice.getId.mockResolvedValue(mockId);

      const result = await Device.getId();
      expect(result).toEqual(mockId);
      expect(mockDevice.getId).toHaveBeenCalledTimes(1);
    });

    it('should get device info successfully', async () => {
      const mockInfo = {
        model: 'Test Device',
        platform: 'android' as const,
        operatingSystem: 'android' as const,
        osVersion: '12.0',
        manufacturer: 'Test Manufacturer',
        isVirtual: false,
        webViewVersion: '100.0.0.0',
        memUsed: 2048,
        diskFree: 16384,
        diskTotal: 32768,
        realDiskFree: 16384,
        realDiskTotal: 32768,
      };
      mockDevice.getInfo.mockResolvedValue(mockInfo);

      const result = await Device.getInfo();
      expect(result).toEqual(mockInfo);
      expect(mockDevice.getInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Battery Information', () => {
    it('should get battery info successfully', async () => {
      const mockBattery = {
        batteryLevel: 0.85,
        isCharging: false,
      };
      mockDevice.getBatteryInfo.mockResolvedValue(mockBattery);

      const result = await Device.getBatteryInfo();
      expect(result).toEqual(mockBattery);
      expect(mockDevice.getBatteryInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Language Information', () => {
    it('should get language code successfully', async () => {
      const mockLanguage = { value: 'en' };
      mockDevice.getLanguageCode.mockResolvedValue(mockLanguage);

      const result = await Device.getLanguageCode();
      expect(result).toEqual(mockLanguage);
      expect(mockDevice.getLanguageCode).toHaveBeenCalledTimes(1);
    });

    it('should get language tag successfully', async () => {
      const mockTag = { value: 'en-US' };
      mockDevice.getLanguageTag.mockResolvedValue(mockTag);

      const result = await Device.getLanguageTag();
      expect(result).toEqual(mockTag);
      expect(mockDevice.getLanguageTag).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle device ID retrieval errors', async () => {
      const error = new Error('Device ID not available');
      mockDevice.getId.mockRejectedValue(error);

      await expect(Device.getId()).rejects.toThrow('Device ID not available');
    });

    it('should handle device info retrieval errors', async () => {
      const error = new Error('Device info not available');
      mockDevice.getInfo.mockRejectedValue(error);

      await expect(Device.getInfo()).rejects.toThrow('Device info not available');
    });
  });
});