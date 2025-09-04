"use client";

import { useEffect, useRef, useCallback } from 'react';

// Performance metric types
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'timing' | 'counter' | 'gauge';
  unit?: string;
}

// Performance monitoring options
export interface PerformanceMonitorOptions {
  onMetric?: (metric: PerformanceMetric) => void;
  enableResourceTiming?: boolean;
  enableUserTiming?: boolean;
  enableNavigationTiming?: boolean;
  enablePaintTiming?: boolean;
  enableLongTasks?: boolean;
  thresholds?: {
    longTask?: number;
    slowResource?: number;
    slowNavigation?: number;
  };
}

// Navigation timing metrics
interface NavigationMetrics {
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

// Resource timing metrics
interface ResourceMetrics {
  name: string;
  duration: number;
  size?: number;
  type: string;
}

// Hook for performance monitoring
export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    onMetric,
    enableResourceTiming = true,
    enableUserTiming = true,
    enableNavigationTiming = true,
    enablePaintTiming = true,
    enableLongTasks = true,
    thresholds = {
      longTask: 50,
      slowResource: 1000,
      slowNavigation: 3000
    }
  } = options;

  const observersRef = useRef<PerformanceObserver[]>([]);
  const metricsRef = useRef<PerformanceMetric[]>([]);

  const reportMetric = useCallback((metric: PerformanceMetric) => {
    metricsRef.current.push(metric);
    onMetric?.(metric);
  }, [onMetric]);

  const setupNavigationTiming = useCallback(() => {
    if (!enableNavigationTiming || typeof window === 'undefined') return;

    const measureNavigationMetrics = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (!navigation) return;

      const metrics: NavigationMetrics = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart
      };

      // Report navigation metrics
      Object.entries(metrics).forEach(([name, value]) => {
        if (value > 0) {
          reportMetric({
            name: `navigation.${name}`,
            value,
            timestamp: Date.now(),
            type: 'timing',
            unit: 'ms'
          });

          // Check thresholds
          if (name === 'loadComplete' && value > (thresholds.slowNavigation || 3000)) {
            reportMetric({
              name: 'navigation.slow',
              value,
              timestamp: Date.now(),
              type: 'counter'
            });
          }
        }
      });
    };

    // Measure after load
    if (document.readyState === 'complete') {
      measureNavigationMetrics();
    } else {
      window.addEventListener('load', measureNavigationMetrics, { once: true });
    }
  }, [enableNavigationTiming, reportMetric, thresholds.slowNavigation]);

  const setupPaintTiming = useCallback(() => {
    if (!enablePaintTiming || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const paintObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          reportMetric({
            name: `paint.${entry.name.replace(/-/g, '_')}`,
            value: entry.startTime,
            timestamp: Date.now(),
            type: 'timing',
            unit: 'ms'
          });
        });
      });

      paintObserver.observe({ entryTypes: ['paint'] });
      observersRef.current.push(paintObserver);
    } catch (error) {
      console.warn('Paint timing not supported:', error);
    }
  }, [enablePaintTiming, reportMetric]);

  const setupResourceTiming = useCallback(() => {
    if (!enableResourceTiming || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          const resource = entry as PerformanceResourceTiming;
          const duration = resource.responseEnd - resource.requestStart;

          reportMetric({
            name: 'resource.load_time',
            value: duration,
            timestamp: Date.now(),
            type: 'timing',
            unit: 'ms'
          });

          // Check for slow resources
          if (duration > (thresholds.slowResource || 1000)) {
            reportMetric({
              name: 'resource.slow',
              value: duration,
              timestamp: Date.now(),
              type: 'counter'
            });
          }

          // Track resource sizes
          if (resource.transferSize) {
            reportMetric({
              name: 'resource.size',
              value: resource.transferSize,
              timestamp: Date.now(),
              type: 'gauge',
              unit: 'bytes'
            });
          }
        });
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      observersRef.current.push(resourceObserver);
    } catch (error) {
      console.warn('Resource timing not supported:', error);
    }
  }, [enableResourceTiming, reportMetric, thresholds.slowResource]);

  const setupUserTiming = useCallback(() => {
    if (!enableUserTiming || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const userTimingObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          reportMetric({
            name: `user.${entry.name}`,
            value: entry.duration || entry.startTime,
            timestamp: Date.now(),
            type: entry.entryType === 'measure' ? 'timing' : 'counter',
            unit: 'ms'
          });
        });
      });

      userTimingObserver.observe({ entryTypes: ['mark', 'measure'] });
      observersRef.current.push(userTimingObserver);
    } catch (error) {
      console.warn('User timing not supported:', error);
    }
  }, [enableUserTiming, reportMetric]);

  const setupLongTaskMonitoring = useCallback(() => {
    if (!enableLongTasks || typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          reportMetric({
            name: 'longtask.duration',
            value: entry.duration,
            timestamp: Date.now(),
            type: 'timing',
            unit: 'ms'
          });

          // Count long tasks
          reportMetric({
            name: 'longtask.count',
            value: 1,
            timestamp: Date.now(),
            type: 'counter'
          });
        });
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      observersRef.current.push(longTaskObserver);
    } catch (error) {
      console.warn('Long task monitoring not supported:', error);
    }
  }, [enableLongTasks, reportMetric]);

  const setupWebVitals = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        reportMetric({
          name: 'vitals.lcp',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          type: 'timing',
          unit: 'ms'
        });
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      observersRef.current.push(lcpObserver);
    } catch (error) {
      console.warn('LCP monitoring not supported:', error);
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'first-input') {
            const fidEntry = entry as PerformanceEventTiming;
            reportMetric({
              name: 'vitals.fid',
              value: fidEntry.processingStart - fidEntry.startTime,
              timestamp: Date.now(),
              type: 'timing',
              unit: 'ms'
            });
          }
        });
      });
      
      fidObserver.observe({ entryTypes: ['first-input'] });
      observersRef.current.push(fidObserver);
    } catch (error) {
      console.warn('FID monitoring not supported:', error);
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        reportMetric({
          name: 'vitals.cls',
          value: clsValue,
          timestamp: Date.now(),
          type: 'gauge'
        });
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      observersRef.current.push(clsObserver);
    } catch (error) {
      console.warn('CLS monitoring not supported:', error);
    }
  }, [reportMetric]);

  useEffect(() => {
    // Setup all monitoring
    setupNavigationTiming();
    setupPaintTiming();
    setupResourceTiming();
    setupUserTiming();
    setupLongTaskMonitoring();
    setupWebVitals();

    // Cleanup function
    return () => {
      observersRef.current.forEach(observer => {
        observer.disconnect();
      });
      observersRef.current = [];
    };
  }, [
    setupNavigationTiming,
    setupPaintTiming,
    setupResourceTiming,
    setupUserTiming,
    setupLongTaskMonitoring,
    setupWebVitals
  ]);

  // Return utility functions
  return {
    getMetrics: () => metricsRef.current,
    clearMetrics: () => {
      metricsRef.current = [];
    },
    mark: (name: string) => {
      if (typeof window !== 'undefined' && performance.mark) {
        performance.mark(name);
      }
    },
    measure: (name: string, startMark?: string, endMark?: string) => {
      if (typeof window !== 'undefined' && performance.measure) {
        try {
          performance.measure(name, startMark, endMark);
        } catch (error) {
          console.warn('Performance measure failed:', error);
        }
      }
    }
  };
}

// Performance utilities
export const PerformanceUtils = {
  // Measure function execution time
  measureFunction: <T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T => {
    return ((...args: Parameters<T>) => {
      const markName = name || fn.name || 'anonymous';
      const startMark = `${markName}-start`;
      const endMark = `${markName}-end`;
      const measureName = `${markName}-duration`;

      if (typeof window !== 'undefined' && performance.mark) {
        performance.mark(startMark);
      }

      const result = fn.apply(this, args);

      if (typeof window !== 'undefined' && performance.mark && performance.measure) {
        performance.mark(endMark);
        try {
          performance.measure(measureName, startMark, endMark);
        } catch (error) {
          console.warn('Performance measure failed:', error);
        }
      }

      return result;
    }) as T;
  },

  // Measure async function execution time
  measureAsyncFunction: <T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name?: string
  ): T => {
    return (async (...args: Parameters<T>) => {
      const markName = name || fn.name || 'async-anonymous';
      const startMark = `${markName}-start`;
      const endMark = `${markName}-end`;
      const measureName = `${markName}-duration`;

      if (typeof window !== 'undefined' && performance.mark) {
        performance.mark(startMark);
      }

      try {
        const result = await fn.apply(this, args);

        if (typeof window !== 'undefined' && performance.mark && performance.measure) {
          performance.mark(endMark);
          try {
            performance.measure(measureName, startMark, endMark);
          } catch (error) {
            console.warn('Performance measure failed:', error);
          }
        }

        return result;
      } catch (error) {
        if (typeof window !== 'undefined' && performance.mark && performance.measure) {
          performance.mark(endMark);
          try {
            performance.measure(`${measureName}-error`, startMark, endMark);
          } catch (measureError) {
            console.warn('Performance measure failed:', measureError);
          }
        }
        throw error;
      }
    }) as T;
  },

  // Get current performance metrics
  getCurrentMetrics: () => {
    if (typeof window === 'undefined') return null;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    return {
      navigation: navigation ? {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
        domComplete: navigation.domComplete - navigation.fetchStart
      } : null,
      paint: paint.reduce((acc, entry) => {
        acc[entry.name.replace(/-/g, '_')] = entry.startTime;
        return acc;
      }, {} as Record<string, number>),
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null
    };
  },

  // Clear all performance entries
  clearPerformanceEntries: () => {
    if (typeof window !== 'undefined' && performance.clearMarks && performance.clearMeasures) {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
};