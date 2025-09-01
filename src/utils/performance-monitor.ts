// Performance monitoring utilities for runtime optimization
import React from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentName: string;
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Monitor component render performance
  measureRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    const memoryUsage = this.getMemoryUsage();
    
    this.recordMetric({
      renderTime,
      memoryUsage,
      componentName,
      timestamp: Date.now()
    });
    
    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
    
    return result;
  }

  // Get current memory usage
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }

  // Record performance metric
  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  // Get performance summary
  getPerformanceSummary(): {
    averageRenderTime: number;
    slowestComponent: string;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    totalMetrics: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageRenderTime: 0,
        slowestComponent: 'none',
        memoryTrend: 'stable',
        totalMetrics: 0
      };
    }

    const totalRenderTime = this.metrics.reduce((sum, m) => sum + m.renderTime, 0);
    const averageRenderTime = totalRenderTime / this.metrics.length;
    
    const slowestMetric = this.metrics.reduce((slowest, current) => 
      current.renderTime > slowest.renderTime ? current : slowest
    );
    
    const memoryTrend = this.calculateMemoryTrend();
    
    return {
      averageRenderTime,
      slowestComponent: slowestMetric.componentName,
      memoryTrend,
      totalMetrics: this.metrics.length
    };
  }

  // Calculate memory usage trend
  private calculateMemoryTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.metrics.length < 10) return 'stable';
    
    const recent = this.metrics.slice(-10);
    const older = this.metrics.slice(-20, -10);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.memoryUsage, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 1) return 'increasing'; // More than 1MB increase
    if (diff < -1) return 'decreasing'; // More than 1MB decrease
    return 'stable';
  }

  // Initialize performance observers
  initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observe long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`);
          }
        }
      });
      
      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // Long task API not supported
      }
    }
  }

  // Cleanup observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }

  // Memory cleanup utility
  static cleanupUnusedObjects(): void {
    // Force garbage collection in development (if available)
    if (process.env.NODE_ENV === 'development' && 'gc' in window) {
      (window as any).gc();
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  const measureRender = <T>(renderFn: () => T): T => {
    return monitor.measureRender(componentName, renderFn);
  };
  
  return { measureRender };
}

// HOC for automatic performance monitoring
export function withPerformanceMonitoring<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name;
  
  const MonitoredComponent = React.memo((props: P) => {
    const { measureRender } = usePerformanceMonitor(displayName);
    
    return measureRender(() => React.createElement(WrappedComponent, props));
  });
  
  MonitoredComponent.displayName = `withPerformanceMonitoring(${displayName})`;
  
  return MonitoredComponent;
}

export default PerformanceMonitor;