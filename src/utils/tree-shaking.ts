/**
 * Tree-shaking optimization utilities
 * This module helps ensure proper tree-shaking by providing ESM-compatible exports
 * and avoiding side effects that prevent dead code elimination
 */

// Re-export commonly used utilities with proper ESM structure
// This helps bundlers understand what can be tree-shaken

// Lodash alternatives that are tree-shakable
export const utils = {
  // Array utilities
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },
  
  uniq: <T>(array: T[]): T[] => [...new Set(array)],
  
  groupBy: <T, K extends string | number | symbol>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> => {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  },
  
  sortBy: <T>(array: T[], keyFn: (item: T) => number | string): T[] => {
    return [...array].sort((a, b) => {
      const aKey = keyFn(a);
      const bKey = keyFn(b);
      return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
    });
  },
  
  // Object utilities
  pick: <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) result[key] = obj[key];
    });
    return result;
  },
  
  omit: <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  },
  
  // String utilities
  capitalize: (str: string): string => 
    str.charAt(0).toUpperCase() + str.slice(1).toLowerCase(),
  
  kebabCase: (str: string): string => 
    str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase(),
  
  camelCase: (str: string): string => 
    str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
  
  // Number utilities
  clamp: (value: number, min: number, max: number): number => 
    Math.min(Math.max(value, min), max),
  
  round: (value: number, precision: number = 0): number => {
    const factor = Math.pow(10, precision);
    return Math.round(value * factor) / factor;
  },
  
  // Function utilities
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },
  
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
};

// Optimized React utilities that are tree-shakable
export const reactUtils = {
  // Memoization helpers
  createMemoizedSelector: <T, R>(
    selector: (state: T) => R,
    equalityFn?: (a: R, b: R) => boolean
  ) => {
    let lastArgs: T;
    let lastResult: R;
    
    return (state: T): R => {
      if (state !== lastArgs) {
        const newResult = selector(state);
        if (!equalityFn || !equalityFn(lastResult, newResult)) {
          lastResult = newResult;
        }
        lastArgs = state;
      }
      return lastResult;
    };
  },
  
  // Component optimization helpers
  createStableCallback: <T extends (...args: any[]) => any>(callback: T): T => {
    // This would typically use useCallback in a React component
    // Here we provide the pattern for stable callbacks
    return callback;
  },
  
  // Event handler optimization
  createEventHandler: <T extends Event>(
    handler: (event: T) => void,
    preventDefault: boolean = false,
    stopPropagation: boolean = false
  ) => {
    return (event: T) => {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      handler(event);
    };
  }
};

// CSS-in-JS alternatives that are more tree-shakable
export const styleUtils = {
  // Generate CSS custom properties
  createCSSVars: (vars: Record<string, string | number>): Record<string, string> => {
    const cssVars: Record<string, string> = {};
    Object.entries(vars).forEach(([key, value]) => {
      cssVars[`--${key}`] = String(value);
    });
    return cssVars;
  },
  
  // Conditional class names
  cn: (...classes: (string | undefined | null | false)[]): string => {
    return classes.filter(Boolean).join(' ');
  },
  
  // Responsive utilities
  createResponsiveValue: <T>(
    base: T,
    sm?: T,
    md?: T,
    lg?: T,
    xl?: T
  ): Record<string, T> => {
    const result: Record<string, T> = { base };
    if (sm !== undefined) result.sm = sm;
    if (md !== undefined) result.md = md;
    if (lg !== undefined) result.lg = lg;
    if (xl !== undefined) result.xl = xl;
    return result;
  }
};

// Performance monitoring utilities
export const perfUtils = {
  // Measure component performance
  measureRender: (componentName: string) => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return { start: () => {}, end: () => {} };
    }
    
    let startTime: number;
    
    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const endTime = performance.now();
        console.log(`${componentName} render: ${(endTime - startTime).toFixed(2)}ms`);
      }
    };
  },
  
  // Bundle size tracking
  trackBundleSize: (chunkName: string, size: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Bundle chunk ${chunkName}: ${(size / 1024).toFixed(2)}KB`);
    }
  }
};

// Export individual utilities for better tree-shaking
export const { chunk, uniq, groupBy, sortBy, pick, omit, capitalize, kebabCase, camelCase, clamp, round, debounce, throttle } = utils;
export const { createMemoizedSelector, createStableCallback, createEventHandler } = reactUtils;
export const { createCSSVars, cn, createResponsiveValue } = styleUtils;
export const { measureRender, trackBundleSize } = perfUtils;