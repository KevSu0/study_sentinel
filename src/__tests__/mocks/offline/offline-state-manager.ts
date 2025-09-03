/**
 * Offline State Manager
 * 
 * Manages offline/online state transitions and provides utilities for testing
 * offline functionality, network conditions, and state persistence.
 */

import { serviceWorkerTestHelpers } from '../service-worker/service-worker-mock';
import { indexedDBTestHelpers } from '../indexeddb/indexeddb-mock';

export interface NetworkCondition {
  type: 'online' | 'offline' | 'slow' | 'unstable';
  speed?: number; // in Kbps
  latency?: number; // in ms
  reliability?: number; // 0-1, chance of success
}

export interface OfflineState {
  isOnline: boolean;
  networkCondition: NetworkCondition;
  pendingSyncs: string[];
  cachedData: Record<string, any>;
  lastSyncTime: number;
}

class OfflineStateManager {
  private state: OfflineState = {
    isOnline: true,
    networkCondition: { type: 'online' },
    pendingSyncs: [],
    cachedData: {},
    lastSyncTime: Date.now(),
  };
  
  private listeners: Array<(state: OfflineState) => void> = [];
  private syncQueue: Array<{ id: string; data: any; timestamp: number }> = [];
  
  // Network state management
  setOnline(online: boolean = true): void {
    this.state.isOnline = online;
    this.state.networkCondition.type = online ? 'online' : 'offline';
    
    // Update navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: online,
      configurable: true,
    });
    
    // Dispatch network events
    const event = new Event(online ? 'online' : 'offline');
    window.dispatchEvent(event);
    
    // Update service worker offline state
    serviceWorkerTestHelpers.setOffline(!online);
    
    this.notifyListeners();
    
    // Process pending syncs when coming online
    if (online && this.syncQueue.length > 0) {
      this.processPendingSyncs();
    }
  }
  
  setNetworkCondition(condition: NetworkCondition): void {
    this.state.networkCondition = condition;
    
    // Set online/offline based on condition
    const isOnline = condition.type !== 'offline';
    if (this.state.isOnline !== isOnline) {
      this.setOnline(isOnline);
    } else {
      this.notifyListeners();
    }
  }
  
  // Sync queue management
  addToSyncQueue(id: string, data: any): void {
    const existingIndex = this.syncQueue.findIndex(item => item.id === id);
    const syncItem = { id, data, timestamp: Date.now() };
    
    if (existingIndex >= 0) {
      this.syncQueue[existingIndex] = syncItem;
    } else {
      this.syncQueue.push(syncItem);
    }
    
    this.state.pendingSyncs = this.syncQueue.map(item => item.id);
    this.notifyListeners();
  }
  
  removeFromSyncQueue(id: string): void {
    this.syncQueue = this.syncQueue.filter(item => item.id !== id);
    this.state.pendingSyncs = this.syncQueue.map(item => item.id);
    this.notifyListeners();
  }
  
  getSyncQueue(): Array<{ id: string; data: any; timestamp: number }> {
    return [...this.syncQueue];
  }
  
  clearSyncQueue(): void {
    this.syncQueue = [];
    this.state.pendingSyncs = [];
    this.notifyListeners();
  }
  
  // Cache management
  setCachedData(key: string, data: any): void {
    this.state.cachedData[key] = data;
    this.notifyListeners();
  }
  
  getCachedData(key: string): any {
    return this.state.cachedData[key];
  }
  
  clearCachedData(key?: string): void {
    if (key) {
      delete this.state.cachedData[key];
    } else {
      this.state.cachedData = {};
    }
    this.notifyListeners();
  }
  
  // State management
  getState(): OfflineState {
    return { ...this.state };
  }
  
  setState(newState: Partial<OfflineState>): void {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }
  
  // Event listeners
  addListener(listener: (state: OfflineState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }
  
  // Sync processing
  private async processPendingSyncs(): Promise<void> {
    if (!this.state.isOnline || this.syncQueue.length === 0) {
      return;
    }
    
    const syncsToProcess = [...this.syncQueue];
    
    for (const syncItem of syncsToProcess) {
      try {
        // Simulate network request with current network conditions
        await this.simulateNetworkRequest();
        
        // Remove successful sync from queue
        this.removeFromSyncQueue(syncItem.id);
        
        // Simulate background sync event
        await serviceWorkerTestHelpers.simulateBackgroundSync(syncItem.id);
      } catch (error) {
        console.warn(`Sync failed for ${syncItem.id}:`, error);
        // Keep in queue for retry
      }
    }
    
    this.state.lastSyncTime = Date.now();
    this.notifyListeners();
  }
  
  // Network simulation
  private async simulateNetworkRequest(): Promise<void> {
    const { networkCondition } = this.state;
    
    // Simulate latency
    if (networkCondition.latency) {
      await new Promise(resolve => setTimeout(resolve, networkCondition.latency));
    }
    
    // Simulate reliability (chance of failure)
    if (networkCondition.reliability && networkCondition.reliability < 1) {
      if (Math.random() > networkCondition.reliability) {
        throw new Error('Network request failed due to poor reliability');
      }
    }
    
    // Simulate slow network
    if (networkCondition.type === 'slow' && networkCondition.speed) {
      const delay = Math.max(100, 1000 / networkCondition.speed);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Simulate unstable network
    if (networkCondition.type === 'unstable') {
      if (Math.random() < 0.3) { // 30% chance of failure
        throw new Error('Network request failed due to unstable connection');
      }
    }
  }
  
  // Reset state
  reset(): void {
    this.state = {
      isOnline: true,
      networkCondition: { type: 'online' },
      pendingSyncs: [],
      cachedData: {},
      lastSyncTime: Date.now(),
    };
    this.syncQueue = [];
    this.listeners = [];
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true,
    });
    
    // Reset service worker state
    serviceWorkerTestHelpers.resetMocks();
  }
}

// Singleton instance
export const offlineStateManager = new OfflineStateManager();

// Test helpers
export const offlineTestHelpers = {
  // Quick state setters
  goOffline: () => offlineStateManager.setOnline(false),
  goOnline: () => offlineStateManager.setOnline(true),
  
  // Network condition presets
  setSlowNetwork: () => offlineStateManager.setNetworkCondition({
    type: 'slow',
    speed: 50, // 50 Kbps
    latency: 2000, // 2 seconds
    reliability: 0.8,
  }),
  
  setUnstableNetwork: () => offlineStateManager.setNetworkCondition({
    type: 'unstable',
    latency: 500,
    reliability: 0.7,
  }),
  
  setFastNetwork: () => offlineStateManager.setNetworkCondition({
    type: 'online',
    speed: 1000, // 1 Mbps
    latency: 50,
    reliability: 1,
  }),
  
  // Sync testing
  addPendingSync: (id: string, data: any) => offlineStateManager.addToSyncQueue(id, data),
  
  getPendingSyncs: () => offlineStateManager.getSyncQueue(),
  
  clearPendingSyncs: () => offlineStateManager.clearSyncQueue(),
  
  // Cache testing
  setCacheData: (key: string, data: any) => offlineStateManager.setCachedData(key, data),
  
  getCacheData: (key: string) => offlineStateManager.getCachedData(key),
  
  clearCache: (key?: string) => offlineStateManager.clearCachedData(key),
  
  // State inspection
  getOfflineState: () => offlineStateManager.getState(),
  
  // Event listening
  onStateChange: (listener: (state: OfflineState) => void) => offlineStateManager.addListener(listener),
  
  // Reset everything
  reset: () => offlineStateManager.reset(),
  
  // Simulate scenarios
  async simulateOfflineToOnline(): Promise<void> {
    offlineStateManager.setOnline(false);
    await new Promise(resolve => setTimeout(resolve, 100));
    offlineStateManager.setOnline(true);
  },
  
  async simulateNetworkFluctuation(): Promise<void> {
    offlineStateManager.setNetworkCondition({ type: 'unstable', reliability: 0.5 });
    await new Promise(resolve => setTimeout(resolve, 200));
    offlineStateManager.setNetworkCondition({ type: 'online', reliability: 1 });
  },
};