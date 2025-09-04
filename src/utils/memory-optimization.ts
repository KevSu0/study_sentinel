"use client";

import { useEffect, useState, useCallback, useRef } from 'react';

// Memory information interface
export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercent: number;
}

// Memory pressure levels
export type MemoryPressureLevel = 'normal' | 'moderate' | 'critical';

// Performance memory info (extended from Performance API)
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

// Extend Performance interface
declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

// Hook for memory monitoring
export function useMemoryMonitor(options: {
  interval?: number;
  threshold?: number;
} = {}) {
  const { interval = 5000, threshold = 0.8 } = options;
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isHighUsage, setIsHighUsage] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkMemory = useCallback(() => {
    if (typeof window === 'undefined' || !performance.memory) {
      return null;
    }

    const memory = performance.memory;
    const usedPercent = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    
    const info: MemoryInfo = {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercent
    };

    setMemoryInfo(info);
    setIsHighUsage(usedPercent > threshold);
    
    return info;
  }, [threshold]);

  useEffect(() => {
    // Initial check
    checkMemory();

    // Set up interval monitoring
    intervalRef.current = setInterval(checkMemory, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkMemory, interval]);

  return {
    memoryInfo,
    isHighUsage,
    checkMemory,
    refreshMemoryInfo: checkMemory
  };
}

// Hook for memory pressure handling
export function useMemoryPressure(
  onPressure: (level: MemoryPressureLevel) => void,
  options: {
    moderateThreshold?: number;
    criticalThreshold?: number;
    checkInterval?: number;
  } = {}
) {
  const {
    moderateThreshold = 0.7,
    criticalThreshold = 0.9,
    checkInterval = 3000
  } = options;
  
  const [pressureLevel, setPressureLevel] = useState<MemoryPressureLevel>('normal');
  const lastPressureRef = useRef<MemoryPressureLevel>('normal');
  const { memoryInfo } = useMemoryMonitor({ interval: checkInterval });

  useEffect(() => {
    if (!memoryInfo) return;

    let newLevel: MemoryPressureLevel = 'normal';
    
    if (memoryInfo.usedPercent >= criticalThreshold) {
      newLevel = 'critical';
    } else if (memoryInfo.usedPercent >= moderateThreshold) {
      newLevel = 'moderate';
    }

    setPressureLevel(newLevel);

    // Only trigger callback if pressure level changed
    if (newLevel !== lastPressureRef.current && newLevel !== 'normal') {
      onPressure(newLevel);
      lastPressureRef.current = newLevel;
    } else if (newLevel === 'normal') {
      lastPressureRef.current = newLevel;
    }
  }, [memoryInfo, moderateThreshold, criticalThreshold, onPressure]);

  return {
    pressureLevel,
    memoryInfo
  };
}

// Memory utilities class
export class MemoryUtils {
  private static caches = new Map<string, Map<string, any>>();
  private static observers = new Set<MutationObserver>();
  private static performanceObserver: PerformanceObserver | null = null;

  // Clear all application caches
  static clearAllCaches(): void {
    this.caches.clear();
    
    // Clear browser caches if available
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      }).catch(console.warn);
    }

    // Force garbage collection if available (Chrome DevTools)
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
  }

  // Clear specific cache by name
  static clearCache(cacheName: string): void {
    this.caches.delete(cacheName);
  }

  // Get or set cache value
  static cache<T>(cacheName: string, key: string, value?: T): T | undefined {
    if (!this.caches.has(cacheName)) {
      this.caches.set(cacheName, new Map());
    }
    
    const cache = this.caches.get(cacheName)!;
    
    if (value !== undefined) {
      cache.set(key, value);
      return value;
    }
    
    return cache.get(key);
  }

  // Optimize DOM by removing unused elements
  static optimizeDOM(): void {
    // Remove hidden elements that are not needed
    const hiddenElements = document.querySelectorAll('[style*="display: none"], [hidden]');
    hiddenElements.forEach(el => {
      if (el.getAttribute('data-keep') !== 'true') {
        el.remove();
      }
    });

    // Remove empty text nodes
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          return !node.textContent?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
    
    const emptyTextNodes: Node[] = [];
    let node;
    while (node = walker.nextNode()) {
      emptyTextNodes.push(node);
    }
    
    emptyTextNodes.forEach(node => {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }

  // Debounce function to reduce memory pressure from frequent calls
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Throttle function to limit execution frequency
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Start performance monitoring
  static startPerformanceMonitoring(): () => void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return () => {};
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.entryType === 'measure' || entry.entryType === 'navigation') {
            // Log performance metrics in development
            if (process.env.NODE_ENV === 'development') {
              console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
            }
          }
        });
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      });

      return () => {
        if (this.performanceObserver) {
          this.performanceObserver.disconnect();
          this.performanceObserver = null;
        }
      };
    } catch (error) {
      console.warn('Performance monitoring not supported:', error);
      return () => {};
    }
  }

  // Get current memory usage
  static getCurrentMemoryUsage(): MemoryInfo | null {
    if (typeof window === 'undefined' || !performance.memory) {
      return null;
    }

    const memory = performance.memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usedPercent: memory.usedJSHeapSize / memory.jsHeapSizeLimit
    };
  }

  // Create a memory-efficient image loader
  static createImageLoader(options: {
    maxCacheSize?: number;
    quality?: number;
  } = {}) {
    const { maxCacheSize = 50, quality = 0.8 } = options;
    const imageCache = new Map<string, HTMLImageElement>();

    return {
      loadImage: async (src: string): Promise<HTMLImageElement> => {
        // Check cache first
        if (imageCache.has(src)) {
          return imageCache.get(src)!;
        }

        // Clear cache if it's too large
        if (imageCache.size >= maxCacheSize) {
          const firstKey = imageCache.keys().next().value;
          if (firstKey) {
            imageCache.delete(firstKey);
          }
        }

        // Load new image
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            imageCache.set(src, img);
            resolve(img);
          };
          img.onerror = reject;
          img.src = src;
        });
      },
      clearCache: () => imageCache.clear(),
      getCacheSize: () => imageCache.size
    };
  }

  // Memory-efficient event listener manager
  static createEventManager() {
    const listeners = new Map<Element, Map<string, EventListener>>();

    return {
      addEventListener: (element: Element, event: string, listener: EventListener) => {
        if (!listeners.has(element)) {
          listeners.set(element, new Map());
        }
        
        const elementListeners = listeners.get(element)!;
        
        // Remove existing listener if any
        if (elementListeners.has(event)) {
          element.removeEventListener(event, elementListeners.get(event)!);
        }
        
        elementListeners.set(event, listener);
        element.addEventListener(event, listener);
      },
      
      removeEventListener: (element: Element, event: string) => {
        const elementListeners = listeners.get(element);
        if (elementListeners && elementListeners.has(event)) {
          element.removeEventListener(event, elementListeners.get(event)!);
          elementListeners.delete(event);
          
          if (elementListeners.size === 0) {
            listeners.delete(element);
          }
        }
      },
      
      cleanup: () => {
        listeners.forEach((elementListeners, element) => {
          elementListeners.forEach((listener, event) => {
            element.removeEventListener(event, listener);
          });
        });
        listeners.clear();
      }
    };
  }
}

// Global memory pressure handler
if (typeof window !== 'undefined') {
  // Listen for memory pressure events (if supported)
  if ('memory' in performance) {
    let lastCheck = 0;
    const checkInterval = 10000; // 10 seconds
    
    const checkMemoryPressure = () => {
      const now = Date.now();
      if (now - lastCheck < checkInterval) return;
      
      lastCheck = now;
      const memoryInfo = MemoryUtils.getCurrentMemoryUsage();
      
      if (memoryInfo && memoryInfo.usedPercent > 0.85) {
        console.warn('High memory usage detected, running cleanup...');
        MemoryUtils.clearAllCaches();
        MemoryUtils.optimizeDOM();
      }
    };

    // Check on visibility change (when user returns to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkMemoryPressure();
      }
    });
  }
}