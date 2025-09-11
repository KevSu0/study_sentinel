'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw,
  Activity,
  Zap,
  HardDrive,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CacheInfo {
  name: string;
  size: number;
  entries: number;
}

interface PerformanceMetrics {
  coldStartTime: number;
  firstStatsPaint: number;
  shellSize: number;
  cacheUsage: number;
  cacheLimit: number;
}

const PERFORMANCE_BUDGETS = {
  COLD_START_TIME: 2000, // 2 seconds
  FIRST_STATS_PAINT: 1200, // 1.2 seconds
  SHELL_SIZE: 1.2 * 1024 * 1024, // 1.2 MB
  CACHE_LIMIT: 50 * 1024 * 1024, // 50 MB
};

export function PerformanceMonitor() {
  const [isOnline, setIsOnline] = useState(true);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    coldStartTime: 0,
    firstStatsPaint: 0,
    shellSize: 0,
    cacheUsage: 0,
    cacheLimit: PERFORMANCE_BUDGETS.CACHE_LIMIT,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Monitor online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial performance metrics
    measurePerformance();
    getCacheInfo();

    // Periodic performance monitoring
    const interval = setInterval(() => {
      measurePerformance();
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const measurePerformance = async () => {
    try {
      // Measure navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const coldStartTime = navigation.loadEventEnd - navigation.fetchStart;
      
      // Measure first contentful paint
      const paint = performance.getEntriesByType('paint');
      const firstStatsPaint = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

      // Estimate shell size
      const resources = performance.getEntriesByType('resource');
      const shellSize = resources
        .filter(resource => 
          resource.name.includes('.js') || 
          resource.name.includes('.css') ||
          resource.name.includes('.woff2')
        )
        .reduce((total, resource) => total + ((resource as PerformanceResourceTiming).transferSize || 0), 0);

      // Get cache usage
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const cacheUsage = estimate.usage || 0;
        
        setPerformanceMetrics(prev => ({
          ...prev,
          coldStartTime,
          firstStatsPaint,
          shellSize,
          cacheUsage,
        }));
      }
    } catch (error) {
      console.error('Failed to measure performance:', error);
    }
  };

  const getCacheInfo = async () => {
    try {
      const cacheNames = await caches.keys();
      const cacheInfos: CacheInfo[] = [];
      
      for (const name of cacheNames) {
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
        
        cacheInfos.push({
          name,
          size,
          entries: keys.length,
        });
      }
      
      setCacheInfo(cacheInfos);
    } catch (error) {
      console.error('Failed to get cache info:', error);
    }
  };

  const clearCache = async (cacheName?: string) => {
    setLoading(true);
    try {
      if (cacheName) {
        await caches.delete(cacheName);
        toast(`Cleared ${cacheName} cache`, { icon: '🗑️' });
      } else {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        toast('Cleared all caches', { icon: '🗑️' });
      }
      
      await getCacheInfo();
      await measurePerformance();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast('Failed to clear cache', { icon: '❌' });
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    try {
      // Export localStorage data
      const data = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        data: {},
      };
      
      // Collect all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              data.data[key] = JSON.parse(value);
            } catch {
              data.data[key] = value;
            }
          }
        }
      }
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-sentinel-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast('Data exported successfully', { icon: '💾' });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast('Failed to export data', { icon: '❌' });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    return `${ms.toFixed(0)}ms`;
  };

  const getPerformanceStatus = (value: number, budget: number) => {
    const ratio = value / budget;
    if (ratio <= 0.8) return 'good';
    if (ratio <= 1.0) return 'warning';
    return 'poor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Real-time performance metrics and budget status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <><Wifi className="h-4 w-4 text-green-600" /><span className="text-sm text-green-600">Online</span></>
            ) : (
              <><WifiOff className="h-4 w-4 text-red-600" /><span className="text-sm text-red-600">Offline</span></>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cold Start Time</span>
                <span className={`text-sm ${getStatusColor(getPerformanceStatus(performanceMetrics.coldStartTime, PERFORMANCE_BUDGETS.COLD_START_TIME))}`}>
                  {formatTime(performanceMetrics.coldStartTime)} / {formatTime(PERFORMANCE_BUDGETS.COLD_START_TIME)}
                </span>
              </div>
              <Progress value={(performanceMetrics.coldStartTime / PERFORMANCE_BUDGETS.COLD_START_TIME) * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">First Stats Paint</span>
                <span className={`text-sm ${getStatusColor(getPerformanceStatus(performanceMetrics.firstStatsPaint, PERFORMANCE_BUDGETS.FIRST_STATS_PAINT))}`}>
                  {formatTime(performanceMetrics.firstStatsPaint)} / {formatTime(PERFORMANCE_BUDGETS.FIRST_STATS_PAINT)}
                </span>
              </div>
              <Progress value={(performanceMetrics.firstStatsPaint / PERFORMANCE_BUDGETS.FIRST_STATS_PAINT) * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">App Shell Size</span>
                <span className={`text-sm ${getStatusColor(getPerformanceStatus(performanceMetrics.shellSize, PERFORMANCE_BUDGETS.SHELL_SIZE))}`}>
                  {formatBytes(performanceMetrics.shellSize)} / {formatBytes(PERFORMANCE_BUDGETS.SHELL_SIZE)}
                </span>
              </div>
              <Progress value={(performanceMetrics.shellSize / PERFORMANCE_BUDGETS.SHELL_SIZE) * 100} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cache Usage</span>
                <span className={`text-sm ${getStatusColor(getPerformanceStatus(performanceMetrics.cacheUsage, PERFORMANCE_BUDGETS.CACHE_LIMIT))}`}>
                  {formatBytes(performanceMetrics.cacheUsage)} / {formatBytes(PERFORMANCE_BUDGETS.CACHE_LIMIT)}
                </span>
              </div>
              <Progress value={(performanceMetrics.cacheUsage / PERFORMANCE_BUDGETS.CACHE_LIMIT) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Management
          </CardTitle>
          <CardDescription>
            Manage application caches and storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cacheInfo.map((cache) => (
              <div key={cache.name} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{cache.name}</span>
                  <Badge variant="outline">{cache.entries} items</Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {formatBytes(cache.size)}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearCache(cache.name)}
                  disabled={loading}
                  className="w-full"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Clear
                </Button>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => clearCache()}
              disabled={loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All Caches
            </Button>
            
            <Button
              variant="outline"
              onClick={exportData}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                measurePerformance();
                getCacheInfo();
                toast('Refreshed metrics', { icon: '🔄' });
              }}
              disabled={loading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for performance monitoring
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    coldStartTime: 0,
    firstStatsPaint: 0,
    shellSize: 0,
    cacheUsage: 0,
    isOnline: navigator.onLine,
  });

  const measurePerformance = async () => {
    try {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const coldStartTime = navigation.loadEventEnd - navigation.fetchStart;
      
      const paint = performance.getEntriesByType('paint');
      const firstStatsPaint = paint.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;

      const resources = performance.getEntriesByType('resource');
      const shellSize = resources
        .filter(resource => 
          resource.name.includes('.js') || 
          resource.name.includes('.css') ||
          resource.name.includes('.woff2')
        )
        .reduce((total, resource) => total + ((resource as PerformanceResourceTiming).transferSize || 0), 0);

      let cacheUsage = 0;
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        cacheUsage = estimate.usage || 0;
      }

      setMetrics(prev => ({
        ...prev,
        coldStartTime,
        firstStatsPaint,
        shellSize,
        cacheUsage,
      }));
    } catch (error) {
      console.error('Failed to measure performance:', error);
    }
  };

  return {
    metrics,
    measurePerformance,
    isWithinBudget: (metric: keyof typeof metrics, budget: number) => {
      return (metrics[metric] as number) <= budget;
    }
  };
}