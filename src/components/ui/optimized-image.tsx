// Optimized image component with lazy loading and memory management

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useIntersectionObserver, useMemoryManager } from '@/utils/memory-manager';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  blurDataURL?: string;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
  lazy?: boolean;
  fadeIn?: boolean;
}

interface ImageState {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  isInView: boolean;
}

export const OptimizedImage = React.memo<OptimizedImageProps>((
  {
    src,
    alt,
    width,
    height,
    className = '',
    placeholder,
    blurDataURL,
    priority = false,
    quality = 75,
    sizes,
    onLoad,
    onError,
    lazy = true,
    fadeIn = true
  }
) => {
  const [state, setState] = useState<ImageState>({
    isLoading: true,
    isLoaded: false,
    hasError: false,
    isInView: !lazy || priority
  });
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { addCleanup } = useMemoryManager();

  // Handle intersection observer for lazy loading
  useIntersectionObserver(
    containerRef,
    useCallback(([entry]) => {
      if (entry.isIntersecting && !state.isInView) {
        setState(prev => ({ ...prev, isInView: true }));
      }
    }, [state.isInView]),
    {
      threshold: 0.1,
      rootMargin: '50px'
    }
  );

  // Handle image load
  const handleLoad = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      isLoaded: true,
      hasError: false
    }));
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      isLoaded: false,
      hasError: true
    }));
    onError?.();
  }, [onError]);

  // Generate optimized src with quality and format
  const optimizedSrc = useMemo(() => {
    if (!state.isInView) return '';
    
    // For external URLs, return as-is
    if (src.startsWith('http')) {
      return src;
    }
    
    // For internal images, add optimization parameters
    const url = new URL(src, window.location.origin);
    url.searchParams.set('q', quality.toString());
    
    if (width) url.searchParams.set('w', width.toString());
    if (height) url.searchParams.set('h', height.toString());
    
    return url.toString();
  }, [src, quality, width, height, state.isInView]);

  // Generate srcSet for responsive images
  const srcSet = useMemo(() => {
    if (!state.isInView || !width) return undefined;
    
    const breakpoints = [0.5, 1, 1.5, 2];
    return breakpoints
      .map(multiplier => {
        const scaledWidth = Math.round(width * multiplier);
        const url = new URL(src, window.location.origin);
        url.searchParams.set('q', quality.toString());
        url.searchParams.set('w', scaledWidth.toString());
        if (height) {
          url.searchParams.set('h', Math.round(height * multiplier).toString());
        }
        return `${url.toString()} ${scaledWidth}w`;
      })
      .join(', ');
  }, [src, width, height, quality, state.isInView]);

  // Placeholder component
  const PlaceholderComponent = useMemo(() => {
    if (state.isLoaded && !state.hasError) return null;
    
    return (
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800',
          fadeIn && state.isLoading && 'animate-pulse'
        )}
        style={{
          backgroundImage: blurDataURL ? `url(${blurDataURL})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: blurDataURL ? 'blur(10px)' : undefined
        }}
      >
        {state.hasError ? (
          <div className="text-gray-400 text-sm text-center p-4">
            <svg className="w-8 h-8 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            Failed to load image
          </div>
        ) : placeholder ? (
          <img
            src={placeholder}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  }, [state.isLoaded, state.hasError, state.isLoading, blurDataURL, placeholder, fadeIn]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {state.isInView && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            fadeIn && state.isLoading && 'opacity-0',
            fadeIn && state.isLoaded && 'opacity-100',
            !fadeIn && 'opacity-100'
          )}
          style={{
            display: state.hasError ? 'none' : 'block'
          }}
        />
      )}
      
      {PlaceholderComponent}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

// Hook for preloading images
export function useImagePreloader() {
  const { addCleanup } = useMemoryManager();
  const preloadedImages = useRef<Set<string>>(new Set());

  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (preloadedImages.current.has(src)) {
        resolve();
        return;
      }

      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
      };
      
      img.onload = () => {
        preloadedImages.current.add(src);
        cleanup();
        resolve();
      };
      
      img.onerror = () => {
        cleanup();
        reject(new Error(`Failed to preload image: ${src}`));
      };
      
      img.src = src;
      addCleanup(cleanup);
    });
  }, [addCleanup]);

  const preloadImages = useCallback(async (sources: string[]): Promise<void> => {
    const promises = sources.map(src => preloadImage(src).catch(() => {})); // Ignore errors
    await Promise.all(promises);
  }, [preloadImage]);

  const isPreloaded = useCallback((src: string): boolean => {
    return preloadedImages.current.has(src);
  }, []);

  return {
    preloadImage,
    preloadImages,
    isPreloaded
  };
}

// Image gallery component with virtual scrolling
interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    width?: number;
    height?: number;
  }>;
  itemsPerRow?: number;
  gap?: number;
  className?: string;
}

export const ImageGallery = React.memo<ImageGalleryProps>((
  {
    images,
    itemsPerRow = 3,
    gap = 16,
    className = ''
  }
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate item dimensions
  const itemWidth = useMemo(() => {
    if (containerWidth === 0) return 0;
    return (containerWidth - (gap * (itemsPerRow - 1))) / itemsPerRow;
  }, [containerWidth, itemsPerRow, gap]);

  // Handle container resize
  useIntersectionObserver(
    containerRef,
    useCallback(() => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    }, [])
  );

  return (
    <div
      ref={containerRef}
      className={cn('grid gap-4', className)}
      style={{
        gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
        gap
      }}
    >
      {images.map((image, index) => (
        <OptimizedImage
          key={`${image.src}-${index}`}
          src={image.src}
          alt={image.alt}
          width={itemWidth}
          height={itemWidth}
          className="rounded-lg"
          lazy={true}
          fadeIn={true}
        />
      ))}
    </div>
  );
});

ImageGallery.displayName = 'ImageGallery';

export default OptimizedImage;