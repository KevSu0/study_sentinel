// Memory management utilities for preventing memory leaks

import React, { useEffect, useRef, useCallback } from 'react';

interface CleanupFunction {
  (): void;
}

interface TimerRef {
  id: NodeJS.Timeout | number;
  cleanup: CleanupFunction;
}

class MemoryManager {
  private static instance: MemoryManager;
  private timers: Set<TimerRef> = new Set();
  private eventListeners: Set<{ element: EventTarget; event: string; handler: EventListener }> = new Set();
  private observers: Set<{ observer: IntersectionObserver | MutationObserver | ResizeObserver; cleanup: CleanupFunction }> = new Set();

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // Register a timer for cleanup
  registerTimer(id: NodeJS.Timeout | number, cleanup: CleanupFunction): void {
    this.timers.add({ id, cleanup });
  }

  // Register an event listener for cleanup
  registerEventListener(element: EventTarget, event: string, handler: EventListener): void {
    this.eventListeners.add({ element, event, handler });
  }

  // Register an observer for cleanup
  registerObserver(observer: IntersectionObserver | MutationObserver | ResizeObserver, cleanup: CleanupFunction): void {
    this.observers.add({ observer, cleanup });
  }

  // Clean up all registered resources
  cleanup(): void {
    // Clear timers
    this.timers.forEach(({ id, cleanup }) => {
      if (typeof id === 'number') {
        clearTimeout(id);
        clearInterval(id);
      } else {
        clearTimeout(id);
        clearInterval(id);
      }
      cleanup();
    });
    this.timers.clear();

    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners.clear();

    // Disconnect observers
    this.observers.forEach(({ observer, cleanup }) => {
      observer.disconnect();
      cleanup();
    });
    this.observers.clear();
  }

  // Get memory usage statistics
  getMemoryStats(): {
    timers: number;
    eventListeners: number;
    observers: number;
    estimatedMemoryUsage: number;
  } {
    const estimatedMemoryUsage = 
      (this.timers.size * 0.1) + // ~0.1KB per timer
      (this.eventListeners.size * 0.2) + // ~0.2KB per event listener
      (this.observers.size * 1); // ~1KB per observer

    return {
      timers: this.timers.size,
      eventListeners: this.eventListeners.size,
      observers: this.observers.size,
      estimatedMemoryUsage
    };
  }
}

// React hook for automatic memory management
export function useMemoryManager() {
  const cleanupFunctions = useRef<CleanupFunction[]>([]);
  const manager = MemoryManager.getInstance();

  const addCleanup = useCallback((cleanup: CleanupFunction) => {
    cleanupFunctions.current.push(cleanup);
  }, []);

  const createManagedTimer = useCallback((callback: () => void, delay: number, isInterval = false) => {
    const id = isInterval ? setInterval(callback, delay) : setTimeout(callback, delay);
    const cleanup = () => {
      if (isInterval) {
        clearInterval(id as NodeJS.Timeout);
      } else {
        clearTimeout(id as NodeJS.Timeout);
      }
    };
    
    manager.registerTimer(id, cleanup);
    addCleanup(cleanup);
    
    return id;
  }, [manager, addCleanup]);

  const createManagedEventListener = useCallback((element: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions) => {
    element.addEventListener(event, handler, options);
    const cleanup = () => element.removeEventListener(event, handler);
    
    manager.registerEventListener(element, event, handler);
    addCleanup(cleanup);
    
    return cleanup;
  }, [manager, addCleanup]);

  const createManagedObserver = useCallback(<T extends IntersectionObserver | MutationObserver | ResizeObserver>(
    observer: T,
    cleanup?: CleanupFunction
  ) => {
    const defaultCleanup = () => observer.disconnect();
    const finalCleanup = cleanup || defaultCleanup;
    
    manager.registerObserver(observer, finalCleanup);
    addCleanup(finalCleanup);
    
    return observer;
  }, [manager, addCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []);

  return {
    addCleanup,
    createManagedTimer,
    createManagedEventListener,
    createManagedObserver,
    getMemoryStats: manager.getMemoryStats.bind(manager)
  };
}

// Hook for debounced values with automatic cleanup
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  const { createManagedTimer } = useMemoryManager();

  useEffect(() => {
    const timerId = createManagedTimer(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timerId as NodeJS.Timeout);
    };
  }, [value, delay, createManagedTimer]);

  return debouncedValue;
}

// Hook for throttled callbacks with automatic cleanup
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef<number>(Date.now());
  const { createManagedTimer } = useMemoryManager();

  return useCallback((...args: Parameters<T>) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    } else {
      createManagedTimer(() => {
        callback(...args);
        lastRun.current = Date.now();
      }, delay - (Date.now() - lastRun.current));
    }
  }, [callback, delay, createManagedTimer]) as T;
}

// Hook for intersection observer with automatic cleanup
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  const { createManagedObserver } = useMemoryManager();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = createManagedObserver(
      new IntersectionObserver(callback, options)
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, callback, options, createManagedObserver]);
}

// Hook for resize observer with automatic cleanup
export function useResizeObserver(
  elementRef: React.RefObject<Element>,
  callback: ResizeObserverCallback
) {
  const { createManagedObserver } = useMemoryManager();

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = createManagedObserver(
      new ResizeObserver(callback)
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, callback, createManagedObserver]);
}

// Global cleanup function for app-wide memory management
export function cleanupGlobalMemory(): void {
  const manager = MemoryManager.getInstance();
  manager.cleanup();
  
  // Force garbage collection in development
  if (process.env.NODE_ENV === 'development' && 'gc' in window) {
    (window as any).gc();
  }
}

export default MemoryManager;