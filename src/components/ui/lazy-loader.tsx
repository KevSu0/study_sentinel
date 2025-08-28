"use client";

import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

// Loading fallback component
export function LoadingFallback({ 
  message = "Loading...", 
  size = "default",
  showSpinner = true,
  className = ""
}: {
  message?: string;
  size?: "small" | "default" | "large";
  showSpinner?: boolean;
  className?: string;
}) {
  const sizeClasses = {
    small: "h-16 text-sm",
    default: "h-32 text-base",
    large: "h-48 text-lg"
  };

  const spinnerSizes = {
    small: "h-4 w-4",
    default: "h-6 w-6",
    large: "h-8 w-8"
  };

  return (
    <div className={`flex flex-col items-center justify-center ${sizeClasses[size]} ${className}`}>
      {showSpinner && (
        <Loader2 className={`animate-spin text-muted-foreground mb-2 ${spinnerSizes[size]}`} />
      )}
      <p className="text-muted-foreground font-medium">{message}</p>
    </div>
  );
}

// Error boundary fallback
export function ErrorFallback({ 
  error, 
  resetError,
  message = "Something went wrong"
}: {
  error?: Error;
  resetError?: () => void;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-32 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <AlertCircle className="h-6 w-6 text-destructive mb-2" />
      <p className="text-destructive font-medium mb-2">{message}</p>
      {error && (
        <p className="text-sm text-muted-foreground mb-3 text-center">
          {error.message}
        </p>
      )}
      {resetError && (
        <button
          onClick={resetError}
          className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// Lazy loader wrapper component
export function LazyLoader<T extends ComponentType<any>>({
  children,
  fallback,
  errorFallback,
  onError
}: {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  onError?: (error: Error) => void;
}) {
  const defaultFallback = fallback || <LoadingFallback />;
  const defaultErrorFallback = errorFallback || <ErrorFallback />;

  return (
    <ErrorBoundary fallback={defaultErrorFallback} onError={onError}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Error boundary class component
class ErrorBoundary extends React.Component<
  {
    children: ReactNode;
    fallback: ReactNode;
    onError?: (error: Error) => void;
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoader Error Boundary caught an error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return React.isValidElement(this.props.fallback) 
        ? React.cloneElement(this.props.fallback as React.ReactElement, {
            error: this.state.error,
            resetError: () => this.setState({ hasError: false, error: undefined })
          })
        : this.props.fallback;
    }

    return this.props.children;
  }
}

// Utility function to create lazy components with built-in loading states
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: ReactNode;
    errorFallback?: ReactNode;
    onError?: (error: Error) => void;
  } = {}
) {
  const LazyComponent = lazy(importFn);
  
  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    return (
      <LazyLoader
        fallback={options.fallback}
        errorFallback={options.errorFallback}
        onError={options.onError}
      >
        <LazyComponent {...props} />
      </LazyLoader>
    );
  };
}

// Preloader utility for warming up lazy components
export class LazyPreloader {
  private static preloadedComponents = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  static preload<T>(
    key: string,
    importFn: () => Promise<{ default: T }>
  ): Promise<{ default: T }> {
    if (this.preloadPromises.has(key)) {
      return this.preloadPromises.get(key)!;
    }

    const promise = importFn().then(module => {
      this.preloadedComponents.add(key);
      return module;
    }).catch(error => {
      console.warn(`Failed to preload component ${key}:`, error);
      this.preloadPromises.delete(key);
      throw error;
    });

    this.preloadPromises.set(key, promise);
    return promise;
  }

  static isPreloaded(key: string): boolean {
    return this.preloadedComponents.has(key);
  }

  static clearPreloaded(): void {
    this.preloadedComponents.clear();
    this.preloadPromises.clear();
  }

  static getPreloadedCount(): number {
    return this.preloadedComponents.size;
  }
}

// Hook for managing lazy loading state
export function useLazyLoading() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadComponent = React.useCallback(async (
    key: string,
    importFn: () => Promise<{ default: any }>
  ) => {
    if (LazyPreloader.isPreloaded(key)) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await LazyPreloader.preload(key, importFn);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    loadComponent,
    resetError,
    preloadedCount: LazyPreloader.getPreloadedCount()
  };
}

// Progressive loading component for images
export function ProgressiveImage({
  src,
  alt,
  placeholder,
  className = "",
  onLoad,
  onError
}: {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');

  React.useEffect(() => {
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      onLoad?.();
    };
    
    img.onerror = () => {
      setHasError(true);
      onError?.();
    };
    
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted ${className}`}>
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <img
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={() => {
          if (!placeholder) {
            setIsLoaded(true);
            onLoad?.();
          }
        }}
        onError={() => {
          setHasError(true);
          onError?.();
        }}
      />
    </div>
  );
}

// Intersection observer based lazy loader
export function IntersectionLazyLoader({
  children,
  fallback,
  rootMargin = "50px",
  threshold = 0.1,
  triggerOnce = true
}: {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
}) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasTriggered, setHasTriggered] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            setHasTriggered(true);
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce]);

  const shouldRender = isIntersecting || hasTriggered;

  return (
    <div ref={ref}>
      {shouldRender ? children : (fallback || <LoadingFallback size="small" />)}
    </div>
  );
}