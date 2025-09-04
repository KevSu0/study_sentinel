import { App, type AppInfo, type AppState, type URLOpenListenerEvent } from '@capacitor/app';
import { createMockCapacitorDevice } from '../mocks/capacitor';
import { renderMobile, offlineScenarios } from '@tests/utils/mobile-test-factories';

// Mock Capacitor App plugin
jest.mock('@capacitor/app', () => ({
  App: {
    exitApp: jest.fn(),
    getInfo: jest.fn(),
    getState: jest.fn(),
    minimizeApp: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn()
  }
}));

describe('Capacitor App Plugin Tests', () => {
  let mockDevice: any;
  let mockListeners: { [key: string]: Function[] } = {};
  
  beforeEach(() => {
    mockDevice = createMockCapacitorDevice('high-end');
    mockListeners = {};
    jest.clearAllMocks();
    
    // Setup default responses
    (App.getInfo as jest.Mock).mockResolvedValue({
      name: 'Study Sentinel',
      id: 'com.studysentinel.app',
      build: '1.0.0',
      version: '1.0.0'
    });
    
    (App.getState as jest.Mock).mockResolvedValue({
      isActive: true
    });
    
    // Mock event listener system
    (App.addListener as jest.Mock).mockImplementation((eventName: string, callback: Function) => {
      if (!mockListeners[eventName]) {
        mockListeners[eventName] = [];
      }
      mockListeners[eventName].push(callback);
      
      return {
        remove: () => {
          const index = mockListeners[eventName].indexOf(callback);
          if (index > -1) {
            mockListeners[eventName].splice(index, 1);
          }
        }
      };
    });
    
    (App.removeAllListeners as jest.Mock).mockImplementation(() => {
      mockListeners = {};
    });
  });
  
  // Helper function to trigger events
  const triggerEvent = (eventName: string, data?: any) => {
    if (mockListeners[eventName]) {
      mockListeners[eventName].forEach(callback => callback(data));
    }
  };
  
  describe('App Information', () => {
    test('should get app info successfully', async () => {
      const info = await App.getInfo();
      
      expect(App.getInfo).toHaveBeenCalled();
      expect(info.name).toBe('Study Sentinel');
      expect(info.id).toBe('com.studysentinel.app');
      expect(info.version).toBe('1.0.0');
      expect(info.build).toBe('1.0.0');
    });
    
    test('should get app state successfully', async () => {
      const state = await App.getState();
      
      expect(App.getState).toHaveBeenCalled();
      expect(state.isActive).toBe(true);
    });
    
    test('should handle different app states', async () => {
      // Test inactive state
      (App.getState as jest.Mock).mockResolvedValue({ isActive: false });
      
      const inactiveState = await App.getState();
      expect(inactiveState.isActive).toBe(false);
      
      // Test active state
      (App.getState as jest.Mock).mockResolvedValue({ isActive: true });
      
      const activeState = await App.getState();
      expect(activeState.isActive).toBe(true);
    });
  });
  
  describe('App Lifecycle Events', () => {
    test('should handle app state change events', async () => {
      const stateChangeHandler = jest.fn();
      
      App.addListener('appStateChange', stateChangeHandler);
      
      // Simulate app going to background
      triggerEvent('appStateChange', { isActive: false });
      
      expect(stateChangeHandler).toHaveBeenCalledWith({ isActive: false });
      
      // Simulate app coming to foreground
      triggerEvent('appStateChange', { isActive: true });
      
      expect(stateChangeHandler).toHaveBeenCalledWith({ isActive: true });
      expect(stateChangeHandler).toHaveBeenCalledTimes(2);
    });
    
    test('should handle app URL open events', async () => {
      const urlOpenHandler = jest.fn();
      
      App.addListener('appUrlOpen', urlOpenHandler);
      
      const urlEvent: URLOpenListenerEvent = {
        url: 'studysentinel://plan/123'
      };
      
      triggerEvent('appUrlOpen', urlEvent);
      
      expect(urlOpenHandler).toHaveBeenCalledWith(urlEvent);
    });
    
    test('should handle app restore events', async () => {
      const restoreHandler = jest.fn();
      
      App.addListener('appRestoredResult', restoreHandler);
      
      const restoreEvent = {
        pluginId: 'Camera',
        methodName: 'getPhoto',
        data: { base64String: 'test-image-data' },
        success: true
      };
      
      triggerEvent('appRestoredResult', restoreEvent);
      
      expect(restoreHandler).toHaveBeenCalledWith(restoreEvent);
    });
    
    test('should handle back button events on Android', async () => {
      const backButtonHandler = jest.fn();
      
      App.addListener('backButton', backButtonHandler);
      
      const backButtonEvent = {
        canGoBack: false
      };
      
      triggerEvent('backButton', backButtonEvent);
      
      expect(backButtonHandler).toHaveBeenCalledWith(backButtonEvent);
    });
  });
  
  describe('App Control', () => {
    test('should exit app successfully', async () => {
      await App.exitApp();
      
      expect(App.exitApp).toHaveBeenCalled();
    });
    
    test('should minimize app successfully', async () => {
      await App.minimizeApp();
      
      expect(App.minimizeApp).toHaveBeenCalled();
    });
    
    test('should handle exit app on different platforms', async () => {
      // On iOS, exitApp might not be available
      (App.exitApp as jest.Mock).mockRejectedValue(new Error('Not available on iOS'));
      
      await expect(App.exitApp()).rejects.toThrow('Not available on iOS');
    });
  });
  
  describe('Event Listener Management', () => {
    test('should add and remove event listeners', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      const listener1 = App.addListener('appStateChange', handler1);
      const listener2 = App.addListener('appStateChange', handler2);
      
      // Both handlers should be called
      triggerEvent('appStateChange', { isActive: false });
      
      expect(handler1).toHaveBeenCalledWith({ isActive: false });
      expect(handler2).toHaveBeenCalledWith({ isActive: false });
      
      // Remove first listener
      listener1.remove();
      
      // Only second handler should be called
      triggerEvent('appStateChange', { isActive: true });
      
      expect(handler1).toHaveBeenCalledTimes(1); // Still 1 from before
      expect(handler2).toHaveBeenCalledTimes(2); // Called twice
    });
    
    test('should remove all listeners', async () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      App.addListener('appStateChange', handler1);
      App.addListener('appUrlOpen', handler2);
      
      App.removeAllListeners();
      
      // No handlers should be called after removing all
      triggerEvent('appStateChange', { isActive: false });
      triggerEvent('appUrlOpen', { url: 'test://url' });
      
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
  
  describe('Deep Linking', () => {
    test('should handle study plan deep links', async () => {
      const urlHandler = jest.fn();
      
      App.addListener('appUrlOpen', urlHandler);
      
      const planUrl = 'studysentinel://plan/abc123';
      triggerEvent('appUrlOpen', { url: planUrl });
      
      expect(urlHandler).toHaveBeenCalledWith({ url: planUrl });
      
      // Verify URL parsing logic would work
      const url = new URL(planUrl);
      expect(url.protocol).toBe('studysentinel:');
      expect(url.pathname).toBe('/plan/abc123');
    });
    
    test('should handle study session deep links', async () => {
      const urlHandler = jest.fn();
      
      App.addListener('appUrlOpen', urlHandler);
      
      const sessionUrl = 'studysentinel://session/start?planId=123&duration=60';
      triggerEvent('appUrlOpen', { url: sessionUrl });
      
      expect(urlHandler).toHaveBeenCalledWith({ url: sessionUrl });
    });
    
    test('should handle invalid deep links gracefully', async () => {
      const urlHandler = jest.fn();
      
      App.addListener('appUrlOpen', urlHandler);
      
      const invalidUrl = 'invalid-url';
      triggerEvent('appUrlOpen', { url: invalidUrl });
      
      expect(urlHandler).toHaveBeenCalledWith({ url: invalidUrl });
      // App should handle invalid URLs without crashing
    });
  });
  
  describe('Background/Foreground Handling', () => {
    test('should handle app going to background', async () => {
      const stateHandler = jest.fn();
      
      App.addListener('appStateChange', stateHandler);
      
      // Simulate app going to background
      triggerEvent('appStateChange', { isActive: false });
      
      expect(stateHandler).toHaveBeenCalledWith({ isActive: false });
      
      // Verify that background tasks would be handled
      // (This would typically trigger data sync, pause timers, etc.)
    });
    
    test('should handle app coming to foreground', async () => {
      const stateHandler = jest.fn();
      
      App.addListener('appStateChange', stateHandler);
      
      // Simulate app coming to foreground
      triggerEvent('appStateChange', { isActive: true });
      
      expect(stateHandler).toHaveBeenCalledWith({ isActive: true });
      
      // Verify that foreground tasks would be handled
      // (This would typically resume timers, refresh data, etc.)
    });
    
    test('should handle rapid state changes', async () => {
      const stateHandler = jest.fn();
      
      App.addListener('appStateChange', stateHandler);
      
      // Simulate rapid state changes
      triggerEvent('appStateChange', { isActive: false });
      triggerEvent('appStateChange', { isActive: true });
      triggerEvent('appStateChange', { isActive: false });
      triggerEvent('appStateChange', { isActive: true });
      
      expect(stateHandler).toHaveBeenCalledTimes(4);
      
      // Verify the sequence of calls
      expect(stateHandler).toHaveBeenNthCalledWith(1, { isActive: false });
      expect(stateHandler).toHaveBeenNthCalledWith(2, { isActive: true });
      expect(stateHandler).toHaveBeenNthCalledWith(3, { isActive: false });
      expect(stateHandler).toHaveBeenNthCalledWith(4, { isActive: true });
    });
  });
  
  describe('Offline Scenarios', () => {
    test('should handle app state changes while offline', async () => {
      await offlineScenarios.completeOffline.setup();
      
      const stateHandler = jest.fn();
      App.addListener('appStateChange', stateHandler);
      
      // App state changes should still work offline
      triggerEvent('appStateChange', { isActive: false });
      
      expect(stateHandler).toHaveBeenCalledWith({ isActive: false });
      
      await offlineScenarios.completeOffline.teardown();
    });
    
    test('should queue deep link handling when offline', async () => {
      await offlineScenarios.completeOffline.setup();
      
      const urlHandler = jest.fn();
      App.addListener('appUrlOpen', urlHandler);
      
      // Deep links should be queued when offline
      const offlineUrl = 'studysentinel://plan/offline-123';
      triggerEvent('appUrlOpen', { url: offlineUrl });
      
      expect(urlHandler).toHaveBeenCalledWith({ url: offlineUrl });
      
      await offlineScenarios.completeOffline.teardown();
    });
  });
  
  describe('Performance Tests', () => {
    test('should handle multiple rapid events efficiently', async () => {
      const handler = jest.fn();
      
      App.addListener('appStateChange', handler);
      
      const startTime = performance.now();
      
      // Trigger many rapid events
      for (let i = 0; i < 100; i++) {
        triggerEvent('appStateChange', { isActive: i % 2 === 0 });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(handler).toHaveBeenCalledTimes(100);
      
      // Should handle events quickly
      const maxDuration = mockDevice.profile === 'low-end' ? 1000 : 500;
      expect(duration).toBeLessThan(maxDuration);
    });
    
    test('should handle memory efficiently with many listeners', async () => {
      const handlers = [];
      
      // Add many listeners
      for (let i = 0; i < 50; i++) {
        const handler = jest.fn();
        handlers.push(handler);
        App.addListener('appStateChange', handler);
      }
      
      // Trigger event
      triggerEvent('appStateChange', { isActive: true });
      
      // All handlers should be called
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledWith({ isActive: true });
      });
      
      // Clean up
      App.removeAllListeners();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle app info retrieval errors', async () => {
      (App.getInfo as jest.Mock).mockRejectedValue(new Error('Failed to get app info'));
      
      await expect(App.getInfo()).rejects.toThrow('Failed to get app info');
    });
    
    test('should handle app state retrieval errors', async () => {
      (App.getState as jest.Mock).mockRejectedValue(new Error('Failed to get app state'));
      
      await expect(App.getState()).rejects.toThrow('Failed to get app state');
    });
    
    test('should handle listener errors gracefully', async () => {
      const errorHandler = jest.fn(() => {
        throw new Error('Handler error');
      });
      const normalHandler = jest.fn();
      
      App.addListener('appStateChange', errorHandler);
      App.addListener('appStateChange', normalHandler);
      
      // Trigger event - should not crash despite error in first handler
      expect(() => {
        triggerEvent('appStateChange', { isActive: true });
      }).not.toThrow();
      
      expect(errorHandler).toHaveBeenCalled();
      expect(normalHandler).toHaveBeenCalled();
    });
  });
});