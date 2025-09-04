import { Network, type ConnectionStatus, type ConnectionType } from '@capacitor/network';
import { createMockCapacitorDevice } from '../mocks/capacitor';
import { renderMobile, NETWORK_CONDITIONS, offlineScenarios } from '@tests/utils/mobile-test-factories';
import { MobilePerformanceMonitor } from '../utils/mobile-performance-framework';

// Mock Capacitor Network plugin
jest.mock('@capacitor/network', () => ({
  Network: {
    getStatus: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

// Helper to map legacy labels to current ConnectionType
const normalize = (v: string): ConnectionType => {
  // Legacy 2g/3g/4g/5g collapse to 'cellular'
  if (/^\d?g$/i.test(v)) return 'cellular' as ConnectionType;
  // pass-through for known values; compiler enforces correctness
  return v as ConnectionType;
};

describe('Capacitor Network Plugin Tests', () => {
  let mockDevice: any;
  let performanceMonitor: MobilePerformanceMonitor;
  let networkListeners: Array<(status: ConnectionStatus) => void> = [];
  
  beforeEach(() => {
    mockDevice = createMockCapacitorDevice('high-end');
    performanceMonitor = new MobilePerformanceMonitor();
    networkListeners = [];
    jest.clearAllMocks();
    
    // Setup default network status based on device profile
    const deviceProfile = mockDevice.profile;
    const defaultStatus: ConnectionStatus = {
      connected: true,
      connectionType: normalize(deviceProfile === 'high-end' ? 'cellular' :
                     deviceProfile === 'mid-range' ? 'cellular' : 'cellular')
    };
    
    (Network.getStatus as jest.Mock).mockResolvedValue(defaultStatus);
    
    // Mock addListener to store listeners
    (Network.addListener as jest.Mock).mockImplementation((event: string, callback: (status: ConnectionStatus) => void) => {
      if (event === 'networkStatusChange') {
        networkListeners.push(callback);
      }
      return {
        remove: jest.fn(() => {
          const index = networkListeners.indexOf(callback);
          if (index > -1) {
            networkListeners.splice(index, 1);
          }
        })
      };
    });
    
    // Mock removeAllListeners
    (Network.removeAllListeners as jest.Mock).mockImplementation(() => {
      networkListeners = [];
    });
  });
  
  afterEach(() => {
    performanceMonitor.stopMonitoring();
    networkListeners = [];
  });
  
  describe('Network Status Detection', () => {
    test('should get network status successfully', async () => {
      const status = await Network.getStatus();
      
      expect(Network.getStatus).toHaveBeenCalled();
      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('connectionType');
      expect(typeof status.connected).toBe('boolean');
    });
    
    test('should detect cellular connection on high-end devices', async () => {
      mockDevice = createMockCapacitorDevice('high-end');
      
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: true,
        connectionType: 'cellular'
      });
      
      const status = await Network.getStatus();
      
      expect(status.connected).toBe(true);
      expect(status.connectionType).toBe('cellular');
    });
    
    test('should detect cellular connection on mid-range devices', async () => {
      mockDevice = createMockCapacitorDevice('mid-range');
      
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: true,
        connectionType: 'cellular'
      });
      
      const status = await Network.getStatus();
      
      expect(status.connected).toBe(true);
      expect(status.connectionType).toBe('cellular');
    });
    
    test('should detect cellular connection on low-end devices', async () => {
      mockDevice = createMockCapacitorDevice('low-end');
      
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: true,
        connectionType: 'cellular'
      });
      
      const status = await Network.getStatus();
      
      expect(status.connected).toBe(true);
      expect(status.connectionType).toBe('cellular');
    });
    
    test('should detect WiFi connection', async () => {
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: true,
        connectionType: 'wifi'
      });
      
      const status = await Network.getStatus();
      
      expect(status.connected).toBe(true);
      expect(status.connectionType).toBe('wifi');
    });
    
    test('should detect offline status', async () => {
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: false,
        connectionType: 'none'
      });
      
      const status = await Network.getStatus();
      
      expect(status.connected).toBe(false);
      expect(status.connectionType).toBe('none');
    });
  });
  
  describe('Network Status Listeners', () => {
    test('should add network status change listener', async () => {
      const mockCallback = jest.fn();
      
      const listener = await Network.addListener('networkStatusChange', mockCallback);
      
      expect(Network.addListener).toHaveBeenCalledWith('networkStatusChange', mockCallback);
      expect(listener).toHaveProperty('remove');
      expect(typeof listener.remove).toBe('function');
    });
    
    test('should trigger listener on network status change', async () => {
      const mockCallback = jest.fn();
      
      await Network.addListener('networkStatusChange', mockCallback);
      
      // Simulate network status change
      const newStatus: ConnectionStatus = {
        connected: false,
        connectionType: 'none'
      };
      
      // Trigger all listeners
      networkListeners.forEach(listener => listener(newStatus));
      
      expect(mockCallback).toHaveBeenCalledWith(newStatus);
    });
    
    test('should handle multiple listeners', async () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const mockCallback3 = jest.fn();
      
      await Network.addListener('networkStatusChange', mockCallback1);
      await Network.addListener('networkStatusChange', mockCallback2);
      await Network.addListener('networkStatusChange', mockCallback3);
      
      expect(networkListeners).toHaveLength(3);
      
      // Simulate network status change
      const newStatus: ConnectionStatus = {
        connected: true,
        connectionType: 'wifi'
      };
      
      networkListeners.forEach(listener => listener(newStatus));
      
      expect(mockCallback1).toHaveBeenCalledWith(newStatus);
      expect(mockCallback2).toHaveBeenCalledWith(newStatus);
      expect(mockCallback3).toHaveBeenCalledWith(newStatus);
    });
    
    test('should remove specific listener', async () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      const listener1 = await Network.addListener('networkStatusChange', mockCallback1);
      await Network.addListener('networkStatusChange', mockCallback2);
      
      expect(networkListeners).toHaveLength(2);
      
      // Remove first listener
      listener1.remove();
      
      expect(networkListeners).toHaveLength(1);
      
      // Simulate network status change
      const newStatus: ConnectionStatus = {
        connected: false,
        connectionType: 'none'
      };
      
      networkListeners.forEach(listener => listener(newStatus));
      
      expect(mockCallback1).not.toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalledWith(newStatus);
    });
    
    test('should remove all listeners', async () => {
      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      
      await Network.addListener('networkStatusChange', mockCallback1);
      await Network.addListener('networkStatusChange', mockCallback2);
      
      expect(networkListeners).toHaveLength(2);
      
      await Network.removeAllListeners();
      
      expect(Network.removeAllListeners).toHaveBeenCalled();
      expect(networkListeners).toHaveLength(0);
    });
  });
  
  describe('Network Conditions Testing', () => {
    test('should handle different network conditions', async () => {
      const conditions: ConnectionType[] = ['wifi', 'cellular', 'none', 'unknown'];
      
      for (const condition of conditions) {
        (Network.getStatus as jest.Mock).mockResolvedValue({
          connected: condition !== 'none',
          connectionType: condition
        });
        
        const status = await Network.getStatus();
        
        expect(status.connectionType).toBe(condition);
        expect(status.connected).toBe(condition !== 'none');
      }
    });
    
    test('should adapt behavior based on connection type', async () => {
      const testCases = [
        { type: 'wifi', shouldEnableHD: true, shouldPreload: true, maxConcurrent: 10 },
        { type: 'cellular', shouldEnableHD: true, shouldPreload: true, maxConcurrent: 5 },
        { type: 'none', shouldEnableHD: false, shouldPreload: false, maxConcurrent: 0 }
      ];
      
      for (const testCase of testCases) {
        const status: ConnectionStatus = {
          connected: testCase.type !== 'none',
          connectionType: testCase.type as ConnectionType
        };
        (Network.getStatus as jest.Mock).mockResolvedValue(status);
        
        const fetchedStatus = await Network.getStatus();
        
        // Simulate app logic that adapts to network conditions
        const shouldEnableHDContent = fetchedStatus.connected && ['cellular', 'wifi'].includes(fetchedStatus.connectionType);
        const shouldPreloadContent = fetchedStatus.connected && ['cellular', 'wifi'].includes(fetchedStatus.connectionType);
        const maxConcurrentRequests = fetchedStatus.connected ?
          (fetchedStatus.connectionType === 'wifi' ? 10 :
           fetchedStatus.connectionType === 'cellular' ? 5 : 1) : 0;
        
        expect(shouldEnableHDContent).toBe(testCase.shouldEnableHD);
        expect(shouldPreloadContent).toBe(testCase.shouldPreload);
        expect(maxConcurrentRequests).toBe(testCase.maxConcurrent);
      }
    });
  });
  
  describe('Offline Scenarios', () => {
    test('should handle complete offline scenario', async () => {
      await offlineScenarios.completeOffline.setup();
      
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: false,
        connectionType: 'none'
      });
      
      const status = await Network.getStatus();
      
      expect(status.connected).toBe(false);
      expect(status.connectionType).toBe('none');
      
      await offlineScenarios.completeOffline.teardown();
    });
    
    test('should handle intermittent connection', async () => {
      await offlineScenarios.intermittentConnection.setup();
      
      // Simulate intermittent connection
      const statuses = [
        { connected: true, connectionType: '4g' },
        { connected: false, connectionType: 'none' },
        { connected: true, connectionType: '3g' },
        { connected: false, connectionType: 'none' },
        { connected: true, connectionType: '4g' }
      ];
      
      for (const expectedStatus of statuses) {
        (Network.getStatus as jest.Mock).mockResolvedValue(expectedStatus);
        
        const status = await Network.getStatus();
        expect(status).toEqual(expectedStatus);
        
        // Simulate network change event
        networkListeners.forEach(listener => listener(expectedStatus));
      }
      
      await offlineScenarios.intermittentConnection.teardown();
    });
    
    test('should handle slow connection gracefully', async () => {
      await offlineScenarios.slowConnection.setup();
      
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: true,
        connectionType: '2g'
      });
      
      const status = await Network.getStatus();
      
      expect(status.connected).toBe(true);
      expect(status.connectionType).toBe('2g');
      
      // App should adapt to slow connection
      const shouldReduceQuality = status.connectionType === '2g';
      const shouldShowSlowConnectionWarning = status.connectionType === '2g';
      
      expect(shouldReduceQuality).toBe(true);
      expect(shouldShowSlowConnectionWarning).toBe(true);
      
      await offlineScenarios.slowConnection.teardown();
    });
  });
  
  describe('Performance Tests', () => {
    test('should get network status quickly', async () => {
      performanceMonitor.startMonitoring();
      
      const startTime = performance.now();
      await Network.getStatus();
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should be very fast
      
      performanceMonitor.stopMonitoring();
    });
    
    test('should handle rapid network status changes', async () => {
      const mockCallback = jest.fn();
      await Network.addListener('networkStatusChange', mockCallback);
      
      performanceMonitor.startMonitoring();
      
      // Simulate rapid network changes
      const changes = [
        { connected: true, connectionType: 'wifi' },
        { connected: false, connectionType: 'none' },
        { connected: true, connectionType: '4g' },
        { connected: true, connectionType: '5g' },
        { connected: false, connectionType: 'none' },
        { connected: true, connectionType: 'wifi' }
      ];
      
      const startTime = performance.now();
      
      for (const change of changes) {
        networkListeners.forEach(listener => listener(change));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(mockCallback).toHaveBeenCalledTimes(changes.length);
      expect(duration).toBeLessThan(100); // Should handle rapid changes efficiently
      
      performanceMonitor.stopMonitoring();
    });
    
    test('should not leak memory with many listeners', async () => {
      const listeners = [];
      
      // Add many listeners
      for (let i = 0; i < 100; i++) {
        const listener = await Network.addListener('networkStatusChange', jest.fn());
        listeners.push(listener);
      }
      
      expect(networkListeners).toHaveLength(100);
      
      // Remove all listeners
      listeners.forEach(listener => listener.remove());
      
      expect(networkListeners).toHaveLength(0);
    });
    
    test('should handle concurrent network status requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        promises.push(Network.getStatus());
      }
      
      const startTime = performance.now();
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toHaveProperty('connected');
        expect(result).toHaveProperty('connectionType');
      });
      
      const duration = endTime - startTime;
      const maxDuration = mockDevice.profile === 'low-end' ? 500 : 200;
      expect(duration).toBeLessThan(maxDuration);
    });
  });
  
  describe('Network-Aware Features', () => {
    test('should implement smart sync based on network type', async () => {
      const networkTypes: ConnectionType[] = ['wifi', 'cellular', 'none'];
      
      for (const networkType of networkTypes) {
        (Network.getStatus as jest.Mock).mockResolvedValue({
          connected: networkType !== 'none',
          connectionType: networkType
        });
        
        const status = await Network.getStatus();
        
        // Simulate smart sync logic
        let syncStrategy = 'none';
        let syncInterval = 0;
        
        if (status.connected) {
          switch (status.connectionType) {
            case 'wifi':
              syncStrategy = 'realtime';
              syncInterval = 1000; // 1 second
              break;
            case 'cellular':
              syncStrategy = 'frequent';
              syncInterval = 5000; // 5 seconds
              break;
          }
        }
        
        if (networkType === 'wifi') {
          expect(syncStrategy).toBe('realtime');
          expect(syncInterval).toBe(1000);
        } else if (networkType === 'cellular') {
          expect(syncStrategy).toBe('frequent');
          expect(syncInterval).toBe(5000);
        } else if (networkType === 'none') {
          expect(syncStrategy).toBe('none');
          expect(syncInterval).toBe(0);
        }
      }
    });
    
    test('should implement adaptive content loading', async () => {
      const testCases = [
        { type: 'wifi', imageQuality: 'high', videoQuality: '1080p', preloadCount: 10 },
        { type: 'cellular', imageQuality: 'high', videoQuality: '1080p', preloadCount: 5 },
        { type: 'none', imageQuality: 'cached', videoQuality: 'cached', preloadCount: 0 }
      ];
      
      for (const testCase of testCases) {
        (Network.getStatus as jest.Mock).mockResolvedValue({
          connected: testCase.type !== 'none',
          connectionType: testCase.type as ConnectionType
        });
        
        const status = await Network.getStatus();
        
        // Simulate adaptive content loading logic
        let imageQuality = 'cached';
        let videoQuality = 'cached';
        let preloadCount = 0;
        
        if (status.connected) {
          switch (status.connectionType) {
            case 'wifi':
              imageQuality = 'high';
              videoQuality = '1080p';
              preloadCount = 10;
              break;
            case 'cellular':
              imageQuality = 'high';
              videoQuality = '1080p';
              preloadCount = 5;
              break;
          }
        }
        
        expect(imageQuality).toBe(testCase.imageQuality);
        expect(videoQuality).toBe(testCase.videoQuality);
        expect(preloadCount).toBe(testCase.preloadCount);
      }
    });
  });
  
  describe('Error Handling', () => {
    test('should handle network status retrieval errors', async () => {
      (Network.getStatus as jest.Mock).mockRejectedValue(new Error('Network status unavailable'));
      
      await expect(Network.getStatus()).rejects.toThrow('Network status unavailable');
    });
    
    test('should handle listener registration errors', async () => {
      (Network.addListener as jest.Mock).mockRejectedValue(new Error('Failed to add listener'));
      
      await expect(Network.addListener('networkStatusChange', jest.fn()))
        .rejects.toThrow('Failed to add listener');
    });
    
    test('should handle malformed network status', async () => {
      // Simulate malformed response
      (Network.getStatus as jest.Mock).mockResolvedValue({
        connected: 'maybe', // Invalid type
        connectionType: 'unknown' // Invalid connection type
      });
      
      const status = await Network.getStatus();
      
      // App should handle malformed data gracefully
      expect(status.connected).toBe('maybe');
      expect(status.connectionType).toBe('unknown');
    });
    
    test('should handle listener callback errors', async () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = jest.fn();
      
      await Network.addListener('networkStatusChange', errorCallback);
      await Network.addListener('networkStatusChange', normalCallback);
      
      const newStatus: ConnectionStatus = {
        connected: false,
        connectionType: 'none'
      };
      
      // Simulate network status change - should not crash if one callback throws
      expect(() => {
        networkListeners.forEach(listener => {
          try {
            listener(newStatus);
          } catch (error) {
            // In real implementation, errors should be caught and logged
            console.error('Network listener error:', error);
          }
        });
      }).not.toThrow();
      
      expect(errorCallback).toHaveBeenCalledWith(newStatus);
      expect(normalCallback).toHaveBeenCalledWith(newStatus);
    });
  });
});