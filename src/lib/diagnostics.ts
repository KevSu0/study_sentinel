import { db } from './database';
import { getSyncEngine } from './sync-engine';
import { initializeE2EEManager, getE2EEManager } from './e2ee';

// Diagnostics and system health manager
export class DiagnosticsManager {
  private static instance: DiagnosticsManager;
  private healthChecks: Map<string, HealthCheck> = new Map();
  private metrics: Map<string, SystemMetric> = new Map();

  private constructor() {
    this.initializeHealthChecks();
    this.startMetricsCollection();
  }

  static getInstance(): DiagnosticsManager {
    if (!DiagnosticsManager.instance) {
      DiagnosticsManager.instance = new DiagnosticsManager();
    }
    return DiagnosticsManager.instance;
  }

  private initializeHealthChecks(): void {
    // Storage health check
    this.healthChecks.set('storage', {
      name: 'Storage Health',
      check: this.checkStorageHealth.bind(this),
      interval: 5 * 60 * 1000, // 5 minutes
      lastCheck: 0,
      status: 'unknown'
    });

    // Sync health check
    this.healthChecks.set('sync', {
      name: 'Sync Health',
      check: this.checkSyncHealth.bind(this),
      interval: 2 * 60 * 1000, // 2 minutes
      lastCheck: 0,
      status: 'unknown'
    });

    // Performance health check
    this.healthChecks.set('performance', {
      name: 'Performance Health',
      check: this.checkPerformanceHealth.bind(this),
      interval: 10 * 60 * 1000, // 10 minutes
      lastCheck: 0,
      status: 'unknown'
    });

    // E2EE health check
    this.healthChecks.set('e2ee', {
      name: 'E2EE Health',
      check: this.checkE2EEHealth.bind(this),
      interval: 15 * 60 * 1000, // 15 minutes
      lastCheck: 0,
      status: 'unknown'
    });

    // Network health check
    this.healthChecks.set('network', {
      name: 'Network Health',
      check: this.checkNetworkHealth.bind(this),
      interval: 1 * 60 * 1000, // 1 minute
      lastCheck: 0,
      status: 'unknown'
    });
  }

  private startMetricsCollection(): void {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30 * 1000);
  }

  // Health check implementations
  private async checkStorageHealth(): Promise<HealthStatus> {
    try {
      // Check IndexedDB accessibility
      const settings = await db.settings.get('default');
      
      // Check storage quota
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usagePercent = (estimate.usage || 0) / (estimate.quota || 1) * 100;
        
        if (usagePercent > 90) {
          return { status: 'warning', message: `Storage usage is ${usagePercent.toFixed(1)}%` };
        }
        
        if (usagePercent > 95) {
          return { status: 'critical', message: `Storage usage is critically high at ${usagePercent.toFixed(1)}%` };
        }
      }

      // Check event count
      const eventCount = await db.events.count();
      if (eventCount > 10000) {
        return { status: 'warning', message: `High event count: ${eventCount}` };
      }

      return { status: 'healthy', message: 'Storage is healthy' };
    } catch (error) {
      return { status: 'critical', message: `Storage error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async checkSyncHealth(): Promise<HealthStatus> {
    try {
      const syncEngine = getSyncEngine();
      if (!syncEngine) {
        return { status: 'warning', message: 'Sync engine not initialized' };
      }

      const syncStatus = await syncEngine.getSyncStatus();
      
      if (syncStatus.failedEvents > 10) {
        return { status: 'warning', message: `${syncStatus.failedEvents} failed sync events` };
      }

      if (syncStatus.pendingEvents > 100) {
        return { status: 'warning', message: `${syncStatus.pendingEvents} pending sync events` };
      }

      if (syncStatus.isOnline) {
        return { status: 'healthy', message: 'Sync is healthy' };
      } else {
        return { status: 'info', message: 'Offline - sync paused' };
      }
    } catch (error) {
      return { status: 'critical', message: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async checkPerformanceHealth(): Promise<HealthStatus> {
    try {
      // Check memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedJSHeapSize = memory.usedJSHeapSize;
        const totalJSHeapSize = memory.totalJSHeapSize;
        const memoryUsagePercent = (usedJSHeapSize / totalJSHeapSize) * 100;
        
        if (memoryUsagePercent > 90) {
          return { status: 'warning', message: `High memory usage: ${memoryUsagePercent.toFixed(1)}%` };
        }
      }

      // Check page load performance
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
        if (loadTime > 3000) {
          return { status: 'warning', message: `Slow page load: ${loadTime}ms` };
        }
      }

      return { status: 'healthy', message: 'Performance is good' };
    } catch (error) {
      return { status: 'warning', message: `Performance check failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async checkE2EEHealth(): Promise<HealthStatus> {
    try {
      const e2eeManager = getE2EEManager();
      if (!e2eeManager) {
        return { status: 'info', message: 'E2EE not initialized' };
      }

      const keyInfo = await e2eeManager.getKeyInfo();
      
      if (!keyInfo.hasKey) {
        return { status: 'info', message: 'E2EE not enabled' };
      }

      if (keyInfo.lastUsed && Date.now() - keyInfo.lastUsed > 7 * 24 * 60 * 60 * 1000) {
        return { status: 'warning', message: 'E2EE key not used recently' };
      }

      return { status: 'healthy', message: 'E2EE is healthy' };
    } catch (error) {
      return { status: 'warning', message: `E2EE check failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async checkNetworkHealth(): Promise<HealthStatus> {
    try {
      if (!navigator.onLine) {
        return { status: 'info', message: 'Network is offline' };
      }

      // Test connectivity
      const startTime = performance.now();
      try {
        const response = await fetch('/offline.html', { method: 'HEAD', cache: 'no-store' });
        const endTime = performance.now();
        const latency = endTime - startTime;

        if (latency > 2000) {
          return { status: 'warning', message: `High network latency: ${latency.toFixed(0)}ms` };
        }

        if (!response.ok) {
          return { status: 'warning', message: `Network response error: ${response.status}` };
        }

        return { status: 'healthy', message: `Network latency: ${latency.toFixed(0)}ms` };
      } catch (error) {
        return { status: 'warning', message: 'Network connectivity test failed' };
      }
    } catch (error) {
      return { status: 'critical', message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private collectSystemMetrics(): void {
    // Storage metrics
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      navigator.storage.estimate().then(estimate => {
        this.metrics.set('storage_usage', {
          name: 'Storage Usage',
          value: estimate.usage || 0,
          unit: 'bytes',
          timestamp: Date.now()
        });
        
        this.metrics.set('storage_quota', {
          name: 'Storage Quota',
          value: estimate.quota || 0,
          unit: 'bytes',
          timestamp: Date.now()
        });
      });
    }

    // Memory metrics
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.set('memory_used', {
        name: 'Memory Used',
        value: memory.usedJSHeapSize,
        unit: 'bytes',
        timestamp: Date.now()
      });
      
      this.metrics.set('memory_total', {
        name: 'Memory Total',
        value: memory.totalJSHeapSize,
        unit: 'bytes',
        timestamp: Date.now()
      });
    }

    // Performance metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      this.metrics.set('page_load_time', {
        name: 'Page Load Time',
        value: navigation.loadEventEnd - navigation.loadEventStart,
        unit: 'ms',
        timestamp: Date.now()
      });
    }
  }

  // Public methods
  async runHealthCheck(name: string): Promise<HealthStatus> {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) {
      throw new Error(`Health check '${name}' not found`);
    }

    const result = await healthCheck.check();
    healthCheck.status = result.status;
    healthCheck.lastCheck = Date.now();
    
    return result;
  }

  async runAllHealthChecks(): Promise<Record<string, HealthStatus>> {
    const results: Record<string, HealthStatus> = {};
    
    for (const [name, check] of this.healthChecks) {
      if (Date.now() - check.lastCheck > check.interval) {
        results[name] = await this.runHealthCheck(name);
      } else {
        results[name] = { status: check.status as 'healthy' | 'warning' | 'critical' | 'info', message: 'Not checked yet' };
      }
    }
    
    return results;
  }

  getHealthChecks(): Record<string, HealthCheckInfo> {
    const result: Record<string, HealthCheckInfo> = {};
    
    for (const [name, check] of this.healthChecks) {
      result[name] = {
        name: check.name,
        status: check.status,
        lastCheck: check.lastCheck,
        interval: check.interval
      };
    }
    
    return result;
  }

  getMetrics(): Record<string, SystemMetric> {
    const result: Record<string, SystemMetric> = {};
    
    for (const [key, metric] of this.metrics) {
      result[key] = metric;
    }
    
    return result;
  }

  async getSystemHealth(): Promise<SystemHealthReport> {
    const healthChecks = await this.runAllHealthChecks();
    const metrics = this.getMetrics();
    
    const overallStatus = this.calculateOverallStatus(healthChecks);
    
    return {
      overallStatus,
      healthChecks,
      metrics,
      timestamp: Date.now()
    };
  }

  private calculateOverallStatus(healthChecks: Record<string, HealthStatus>): 'healthy' | 'warning' | 'critical' {
    const statuses = Object.values(healthChecks).map(check => check.status);
    
    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'healthy';
  }

  // Storage management
  async getStorageUsage(): Promise<StorageUsage> {
    if (!('storage' in navigator) || !('estimate' in navigator.storage)) {
      throw new Error('Storage API not supported');
    }

    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 1;
    
    // Get detailed breakdown
    const eventCount = await db.events.count();
    const outboxCount = await db.outbox.count();
    const rollupCount = await db.dailyRollups.count() + 
                       await db.weeklyRollups.count() + 
                       await db.monthlyRollups.count();

    return {
      totalUsage: usage,
      totalQuota: quota,
      usagePercent: (usage / quota) * 100,
      breakdown: {
        events: eventCount,
        outbox: outboxCount,
        rollups: rollupCount,
        other: usage - (eventCount * 1024) - (outboxCount * 512) - (rollupCount * 256)
      }
    };
  }

  async clearCaches(): Promise<CacheClearResult> {
    const result: CacheClearResult = {
      clearedCaches: [],
      errors: [],
      totalCleared: 0
    };

    try {
      // Clear service worker caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          if (cacheName.includes('workbox') || cacheName.includes('assets')) {
            try {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              await cache.delete(keys[0].url);
              result.clearedCaches.push(cacheName);
              result.totalCleared++;
            } catch (error) {
              result.errors.push(`Failed to clear cache ${cacheName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }

      // Clear browser storage (commented out as it's not supported in current API)
      // if ('storage' in navigator && 'clear' in navigator.storage) {
      //   await navigator.storage.clear();
      //   result.clearedCaches.push('browser_storage');
      //   result.totalCleared++;
      // }

      return result;
    } catch (error) {
      result.errors.push(`Cache clearing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  async exportDiagnostics(): Promise<DiagnosticsExport> {
    const healthReport = await this.getSystemHealth();
    const storageUsage = await this.getStorageUsage();
    const syncEngine = getSyncEngine();
    const syncStatus = syncEngine ? await syncEngine.getSyncStatus() : null;
    const e2eeManager = getE2EEManager();
    const e2eeInfo = e2eeManager ? await e2eeManager.getKeyInfo() : null;

    return {
      version: '1.0',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      healthReport,
      storageUsage,
      syncStatus,
      e2eeInfo,
      environment: this.getEnvironmentInfo()
    };
  }

  private getEnvironmentInfo() {
    return {
      online: navigator.onLine,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      language: navigator.language,
      screenResolution: `${screen.width}x${screen.height}`,
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null
    };
  }
}

// Cache management utilities
export class CacheManager {
  static async clearAllCaches(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      return true;
    } catch (error) {
      console.error('Failed to clear caches:', error);
      return false;
    }
  }

  static async clearPublicityCaches(): Promise<boolean> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const publicityCaches = cacheNames.filter(name => 
          name.includes('publicity') || name.includes('images') || name.includes('cdn')
        );
        
        await Promise.all(publicityCaches.map(name => caches.delete(name)));
      }
      return true;
    } catch (error) {
      console.error('Failed to clear publicity caches:', error);
      return false;
    }
  }

  static async getCacheInfo(): Promise<CacheInfo[]> {
    const cacheInfo: CacheInfo[] = [];
    
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      
      for (const name of cacheNames) {
        try {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          let size = 0;
          
          for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              size += blob.size;
            }
          }
          
          cacheInfo.push({
            name,
            entryCount: keys.length,
            sizeBytes: size
          });
        } catch (error) {
          console.error(`Failed to get cache info for ${name}:`, error);
        }
      }
    }
    
    return cacheInfo;
  }
}

// Type definitions
export interface HealthCheck {
  name: string;
  check: () => Promise<HealthStatus>;
  interval: number;
  lastCheck: number;
  status: string;
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical' | 'info';
  message: string;
}

export interface HealthCheckInfo {
  name: string;
  status: string;
  lastCheck: number;
  interval: number;
}

export interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface SystemHealthReport {
  overallStatus: 'healthy' | 'warning' | 'critical';
  healthChecks: Record<string, HealthStatus>;
  metrics: Record<string, SystemMetric>;
  timestamp: number;
}

export interface StorageUsage {
  totalUsage: number;
  totalQuota: number;
  usagePercent: number;
  breakdown: {
    events: number;
    outbox: number;
    rollups: number;
    other: number;
  };
}

export interface CacheClearResult {
  clearedCaches: string[];
  errors: string[];
  totalCleared: number;
}

export interface DiagnosticsExport {
  version: string;
  timestamp: number;
  userAgent: string;
  platform: string;
  healthReport: SystemHealthReport;
  storageUsage: StorageUsage;
  syncStatus?: any;
  e2eeInfo?: any;
  environment: any;
}

export interface CacheInfo {
  name: string;
  entryCount: number;
  sizeBytes: number;
}

// Initialize diagnostics manager
export const diagnosticsManager = DiagnosticsManager.getInstance();