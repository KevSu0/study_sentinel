/**
 * Optimized barrel exports for better tree shaking
 * This file provides selective exports to help bundlers eliminate unused code
 */

// Re-export only the utilities that are actually used
// This helps with tree shaking by making imports more explicit

// Dependency optimization utilities
export {
  dateUtils,
  animationUtils,
  chartUtils,
  bundleMonitor
} from '@/utils/dependency-optimization';

// Tree-shakable utilities
export {
  chunk,
  uniq,
  groupBy,
  sortBy,
  pick,
  omit,
  capitalize,
  kebabCase,
  camelCase,
  clamp,
  round,
  debounce,
  throttle,
  createMemoizedSelector,
  createStableCallback,
  createEventHandler,
  createCSSVars,
  cn,
  createResponsiveValue,
  measureRender,
  trackBundleSize
} from '@/utils/tree-shaking';

// Lazy-loaded chart components
export {
  LazyPieChart,
  LazyBarChart,
  LazyLineChart,
  LazyRadarChart,
  LazyRadialBarChart,
  LazyResponsiveContainer,
  LazyPie,
  LazyBar,
  LazyLine,
  LazyRadar,
  LazyRadialBar,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyPolarGrid,
  LazyPolarAngleAxis,
  LazyPolarRadiusAxis,
  LazyTooltip,
  LazyLegend,
  LazyCell,
  LazySector
} from '@/components/lazy/chart-components';

// Lazy-loaded animation components
export {
  LazyMotionDiv,
  LazyAnimatePresence,
  LazyMotion,
  domAnimation,
  useLazyMotion,
  fadeInVariants,
  slideUpVariants,
  scaleVariants
} from '@/components/lazy/animation-components';

// Performance monitoring
export const perf = {
  // Component performance tracking
  trackComponent: (name: string) => {
    if (process.env.NODE_ENV !== 'development') return { start: () => {}, end: () => {} };
    
    let startTime: number;
    return {
      start: () => { startTime = performance.now(); },
      end: () => {
        const duration = performance.now() - startTime;
        console.log(`🚀 ${name}: ${duration.toFixed(2)}ms`);
      }
    };
  },
  
  // Bundle size monitoring
  trackBundle: (chunkName: string, size: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📦 ${chunkName}: ${(size / 1024).toFixed(2)}KB`);
    }
  },
  
  // Memory usage tracking
  trackMemory: (label: string) => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      console.log(`🧠 ${label}:`, {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
  }
};

// Optimized CSS utilities
export const css = {
  // Conditional classes with better performance
  cx: (...classes: (string | undefined | null | false | 0)[]): string => {
    return classes.filter(Boolean).join(' ');
  },
  
  // CSS custom properties helper
  vars: (variables: Record<string, string | number>): React.CSSProperties => {
    const cssVars: Record<string, string> = {};
    Object.entries(variables).forEach(([key, value]) => {
      cssVars[`--${key}` as keyof React.CSSProperties] = String(value);
    });
    return cssVars as React.CSSProperties;
  },
  
  // Responsive breakpoints
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px'
  } as const
};

// Type-safe event handlers
export const events = {
  // Prevent default wrapper
  prevent: <T extends Event>(handler: (event: T) => void) => {
    return (event: T) => {
      event.preventDefault();
      handler(event);
    };
  },
  
  // Stop propagation wrapper
  stop: <T extends Event>(handler: (event: T) => void) => {
    return (event: T) => {
      event.stopPropagation();
      handler(event);
    };
  },
  
  // Combined prevent + stop
  preventStop: <T extends Event>(handler: (event: T) => void) => {
    return (event: T) => {
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    };
  }
};

// Async utilities
export const async = {
  // Delay utility
  delay: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Timeout wrapper
  timeout: <T>(promise: Promise<T>, ms: number): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      )
    ]);
  },
  
  // Retry utility
  retry: async <T>(
    fn: () => Promise<T>,
    attempts: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (attempts <= 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      return async.retry(fn, attempts - 1, delay);
    }
  }
};