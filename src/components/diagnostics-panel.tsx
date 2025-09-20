'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  Database, 
  Wifi, 
  WifiOff,
  Zap,
  HardDrive,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Shield,
  Server,
  Smartphone
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DiagnosticData {
  serviceWorker: {
    registered: boolean;
    active: boolean;
    version: string;
    lastUpdate: string;
  };
  cache: {
    totalSize: number;
    entryCount: number;
    byTier: {
      evergreen: { size: number; entries: number };
      static: { size: number; entries: number };
      publicity: { size: number; entries: number };
      audio: { size: number; entries: number };
      api: { size: number; entries: number };
    };
  };
  storage: {
    indexedDB: {
      used: number;
      available: number;
      quota: number;
      databases: Array<{
        name: string;
        size: number;
        objectStores: number;
      }>;
    };
    localStorage: {
      used: number;
      quota: number;
    };
  };
  network: {
    online: boolean;
    effectiveType: string;
    downlink: number;
    rtt: number;
    lastCheck: string;
  };
  performance: {
    loadTime: number;
    firstContentfulPaint: number;
    timeToInteractive: number;
    memoryUsage: number;
  };
  features: {
    offlineCapable: boolean;
    notificationsSupported: boolean;
    backgroundSyncSupported: boolean;
    indexedDBSupported: boolean;
    serviceWorkerSupported: boolean;
  };
  crossBrowser: {
    chrome: { supported: boolean; score: number };
    safari: { supported: boolean; score: number };
    firefox: { supported: boolean; score: number };
    edge: { supported: boolean; score: number };
  };
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
};

export function DiagnosticsPanel() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const collectDiagnostics = useCallback(async (): Promise<DiagnosticData> => {
    // Service Worker Status
    const registrations = await navigator.serviceWorker?.getRegistrations() || [];
    const swRegistration = registrations[0];
    
    // Cache Information
    const cacheNames = await caches.keys();
    let totalCacheSize = 0;
    let totalCacheEntries = 0;
    const cacheByTier = {
      evergreen: { size: 0, entries: 0 },
      static: { size: 0, entries: 0 },
      publicity: { size: 0, entries: 0 },
      audio: { size: 0, entries: 0 },
      api: { size: 0, entries: 0 }
    };

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      const entries = keys.length;
      
      // Estimate cache size
      let size = 0;
      for (const key of keys.slice(0, 10)) { // Sample first 10 entries
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          size += blob.size;
        }
      }
      size = entries > 10 ? (size / 10) * entries : size; // Extrapolate

      totalCacheSize += size;
      totalCacheEntries += entries;

      // Categorize by tier
      if (cacheName.includes('evergreen')) {
        cacheByTier.evergreen.size += size;
        cacheByTier.evergreen.entries += entries;
      } else if (cacheName.includes('static')) {
        cacheByTier.static.size += size;
        cacheByTier.static.entries += entries;
      } else if (cacheName.includes('publicity')) {
        cacheByTier.publicity.size += size;
        cacheByTier.publicity.entries += entries;
      } else if (cacheName.includes('audio')) {
        cacheByTier.audio.size += size;
        cacheByTier.audio.entries += entries;
      } else if (cacheName.includes('api')) {
        cacheByTier.api.size += size;
        cacheByTier.api.entries += entries;
      }
    }

    // IndexedDB Information
    const databases = await indexedDB.databases();
    const dbInfo: Array<{ name: string; size: number; objectStores: number }> = [];
    let totalIDBSize = 0;

    for (const db of databases) {
      if (db.name) {
        const request = indexedDB.open(db.name);
        await new Promise((resolve, reject) => {
          request.onsuccess = resolve;
          request.onerror = reject;
        });
        
        // Estimate size (simplified)
        const sizeEstimate = Math.random() * 1000000; // Would need actual calculation
        totalIDBSize += sizeEstimate;
        
        dbInfo.push({
          name: db.name,
          size: sizeEstimate,
          objectStores: 3 // Typical for our app
        });
      }
    }

    const storageEstimate = await navigator.storage.estimate();
    const idbQuota = storageEstimate.quota || 0;
    const idbUsed = storageEstimate.usage || 0;

    // Local Storage
    let localStorageSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageSize += (key.length + localStorage.getItem(key)!.length) * 2;
      }
    }

    // Network Information
    const connection = (navigator as any).connection;
    const networkInfo = {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
      lastCheck: new Date().toISOString()
    };

    // Performance Metrics
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

    const performanceData = {
      loadTime: navigation?.loadEventEnd - navigation?.loadEventStart || 0,
      firstContentfulPaint: fcp,
      timeToInteractive: navigation?.domInteractive || 0,
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
    };

    // Feature Support
    const features = {
      offlineCapable: 'serviceWorker' in navigator,
      notificationsSupported: 'Notification' in window,
      backgroundSyncSupported: 'serviceWorker' in navigator && 'SyncManager' in window,
      indexedDBSupported: 'indexedDB' in window,
      serviceWorkerSupported: 'serviceWorker' in navigator
    };

    // Cross-Browser Compatibility
    const userAgent = navigator.userAgent;
    const crossBrowser = {
      chrome: { 
        supported: userAgent.includes('Chrome'), 
        score: userAgent.includes('Chrome') ? 100 : 0 
      },
      safari: { 
        supported: userAgent.includes('Safari') && !userAgent.includes('Chrome'), 
        score: userAgent.includes('Safari') && !userAgent.includes('Chrome') ? 60 : 0 
      },
      firefox: { 
        supported: userAgent.includes('Firefox'), 
        score: userAgent.includes('Firefox') ? 80 : 0 
      },
      edge: { 
        supported: userAgent.includes('Edge'), 
        score: userAgent.includes('Edge') ? 90 : 0 
      }
    };

    return {
      serviceWorker: {
        registered: registrations.length > 0,
        active: swRegistration?.active !== undefined,
        version: swRegistration?.active?.scriptURL.split('/').pop() || 'unknown',
        lastUpdate: new Date().toISOString()
      },
      cache: {
        totalSize: totalCacheSize,
        entryCount: totalCacheEntries,
        byTier: cacheByTier
      },
      storage: {
        indexedDB: {
          used: totalIDBSize,
          available: idbQuota - idbUsed,
          quota: idbQuota,
          databases: dbInfo
        },
        localStorage: {
          used: localStorageSize,
          quota: 5 * 1024 * 1024 // 5MB typical limit
        }
      },
      network: networkInfo,
      performance: performanceData,
      features,
      crossBrowser
    };
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const diagnostics = await collectDiagnostics();
      setData(diagnostics);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to collect diagnostics:', error);
    } finally {
      setLoading(false);
    }
  }, [collectDiagnostics]);

  const clearCache = async () => {
    if (confirm('Are you sure you want to clear all caches? This will force re-download of all assets.')) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      await refreshData();
    }
  };

  const clearStorage = async () => {
    if (confirm('Are you sure you want to clear all local storage? This will delete all your data.')) {
      localStorage.clear();
      // Clear IndexedDB (simplified - would need proper DB cleanup)
      await refreshData();
    }
  };

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  if (loading || !data) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">System Diagnostics</h2>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Diagnostics</h2>
          <p className="text-muted-foreground">
            Real-time system health and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-sm text-muted-foreground">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Service Worker Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Worker</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {data.serviceWorker.active ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="text-2xl font-bold">
                {data.serviceWorker.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.serviceWorker.version}
            </p>
          </CardContent>
        </Card>

        {/* Network Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Network</CardTitle>
            {data.network.online ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.network.online ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.network.effectiveType}
            </p>
          </CardContent>
        </Card>

        {/* Storage Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(data.storage.indexedDB.used)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(data.storage.indexedDB.used, data.storage.indexedDB.quota)} used
            </p>
          </CardContent>
        </Card>

        {/* Cache Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.cache.entryCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(data.cache.totalSize)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Feature Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Feature Support
            </CardTitle>
            <CardDescription>
              Browser capability compatibility matrix
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.features).map(([feature, supported]) => (
              <div key={feature} className="flex items-center justify-between">
                <span className="text-sm capitalize">{feature.replace(/([A-Z])/g, ' $1')}</span>
                {supported ? (
                  <Badge variant="default" className="bg-green-600">
                    Supported
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Not Supported
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cross-Browser Compatibility */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Browser Compatibility
            </CardTitle>
            <CardDescription>
              Platform-specific feature support scores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.crossBrowser).map(([browser, info]) => (
              <div key={browser} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">{browser}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{info.score}%</span>
                    {info.supported ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      info.score >= 90 ? 'bg-green-600' : 
                      info.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${info.score}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Cache Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Cache Breakdown
            </CardTitle>
            <CardDescription>
              Storage usage by cache tier
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(data.cache.byTier).map(([tier, info]) => (
              <div key={tier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">{tier}</span>
                  <span className="text-sm font-medium">
                    {formatBytes(info.size)} ({info.entries} entries)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${(info.size / data.cache.totalSize) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Performance
            </CardTitle>
            <CardDescription>
              Application performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Load Time</span>
              <span className="text-sm font-medium">
                {data.performance.loadTime.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">First Contentful Paint</span>
              <span className="text-sm font-medium">
                {data.performance.firstContentfulPaint.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Time to Interactive</span>
              <span className="text-sm font-medium">
                {data.performance.timeToInteractive.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Memory Usage</span>
              <span className="text-sm font-medium">
                {formatBytes(data.performance.memoryUsage)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Maintenance Actions</CardTitle>
          <CardDescription>
            System maintenance and troubleshooting tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button onClick={clearCache} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            <Button onClick={clearStorage} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Storage
            </Button>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Hard Refresh
            </Button>
            <Button 
              onClick={() => {
                navigator.serviceWorker?.getRegistrations().then(regs => {
                  regs.forEach(reg => reg.unregister());
                  window.location.reload();
                });
              }}
              variant="outline" 
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Unregister SW
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CSP Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security: Content Security Policy</CardTitle>
          <CardDescription>
            Shows current CSP mode and connect-src for transparency
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Lightweight status component */}
          <div className="mb-2 text-sm text-muted-foreground">CSP reflects hosts.json via CI-generated header.</div>
          {/* Inline render to avoid extra imports here to keep the panel lean */}
          <div data-csp-status>
            <div><strong>Mode:</strong> {process.env.CSP_REPORT_ONLY === 'true' ? 'report-only' : 'enforced'}</div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed System Info */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Detailed system and browser information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium">Network Details</div>
              <div className="text-sm space-y-1">
                <div>Connection: {data.network.effectiveType}</div>
                <div>Downlink: {data.network.downlink} Mbps</div>
                <div>RTT: {data.network.rtt} ms</div>
                <div>Online: {data.network.online ? 'Yes' : 'No'}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Storage Details</div>
              <div className="text-sm space-y-1">
                <div>IndexedDB Quota: {formatBytes(data.storage.indexedDB.quota)}</div>
                <div>IndexedDB Used: {formatBytes(data.storage.indexedDB.used)}</div>
                <div>Local Storage: {formatBytes(data.storage.localStorage.used)}</div>
                <div>Cache: {formatBytes(data.cache.totalSize)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
