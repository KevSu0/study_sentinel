"use client";

import React, { type ReactNode, useEffect, useState, useCallback } from 'react';
import { usePlatformDetection, useMobileOptimizations, useThemeColor, useStatusBarStyle } from '@/utils/platform-optimization';
import { useMemoryPressure } from '@/utils/memory-optimization';
import { usePerformanceMonitor } from '@/utils/performance';

interface MobileAppWrapperProps {
  children: ReactNode;
  enablePullToRefresh?: boolean;
  enableSwipeGestures?: boolean;
  enableHapticFeedback?: boolean;
  enableFullscreen?: boolean;
  themeColor?: string;
  statusBarStyle?: 'default' | 'light-content' | 'dark-content';
  onRefresh?: () => Promise<void> | void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onMemoryWarning?: () => void;
  className?: string;
}

export function MobileAppWrapper({
  children,
  enablePullToRefresh = true,
  enableSwipeGestures = true,
  enableHapticFeedback = true,
  enableFullscreen = false,
  themeColor = '#000000',
  statusBarStyle = 'default',
  onRefresh,
  onSwipeLeft,
  onSwipeRight,
  onMemoryWarning,
  className = ''
}: MobileAppWrapperProps) {
  const { isMobile, isIOS, isAndroid, isTouchDevice } = usePlatformDetection();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Apply mobile optimizations
  useMobileOptimizations({
    preventZoom: true,
    optimizeScrolling: true,
    enableSafeArea: true,
    disableSelection: false
  });

  // Set theme color and status bar style
  useThemeColor(themeColor);
  useStatusBarStyle(statusBarStyle);

  // Monitor memory pressure
  const { pressureLevel } = useMemoryPressure(() => {
    // Handle memory pressure callback
  });
  
  // Monitor performance
  const performanceMonitor = usePerformanceMonitor();
  const metrics = performanceMonitor.getMetrics();

  // Handle memory warnings
  useEffect(() => {
    if (pressureLevel === 'critical' && onMemoryWarning) {
      onMemoryWarning();
    }
  }, [pressureLevel, onMemoryWarning]);

  // Haptic feedback utility
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || !isTouchDevice) return;
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }
  }, [enableHapticFeedback, isTouchDevice]);

  // Pull to refresh logic
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enablePullToRefresh && !enableSwipeGestures) return;
    
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setPullDistance(0);
    setSwipeDirection(null);
  }, [enablePullToRefresh, enableSwipeGestures]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    
    // Pull to refresh (vertical)
    if (enablePullToRefresh && Math.abs(deltaY) > Math.abs(deltaX)) {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (deltaY > 0 && scrollTop === 0 && !isRefreshing) {
        e.preventDefault();
        const distance = Math.min(deltaY * 0.5, 100);
        setPullDistance(distance);
        
        if (distance > 60) {
          triggerHaptic('medium');
        }
      }
    }
    
    // Swipe gestures (horizontal)
    if (enableSwipeGestures && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > 50) {
        const direction = deltaX > 0 ? 'right' : 'left';
        if (swipeDirection !== direction) {
          setSwipeDirection(direction);
          triggerHaptic('light');
        }
      }
    }
  }, [touchStart, enablePullToRefresh, enableSwipeGestures, isRefreshing, swipeDirection, triggerHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!touchStart) return;
    
    // Handle pull to refresh
    if (enablePullToRefresh && pullDistance > 60 && onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('heavy');
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    // Handle swipe gestures
    if (enableSwipeGestures && swipeDirection) {
      if (swipeDirection === 'left' && onSwipeLeft) {
        onSwipeLeft();
      } else if (swipeDirection === 'right' && onSwipeRight) {
        onSwipeRight();
      }
    }
    
    // Reset states
    setTouchStart(null);
    setPullDistance(0);
    setSwipeDirection(null);
  }, [touchStart, pullDistance, swipeDirection, enablePullToRefresh, enableSwipeGestures, onRefresh, onSwipeLeft, onSwipeRight, isRefreshing, triggerHaptic]);

  // Fullscreen handling
  useEffect(() => {
    if (!enableFullscreen || !isMobile) return;
    
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (error) {
        console.warn('Fullscreen not supported or failed:', error);
      }
    };
    
    // Auto-enter fullscreen on mobile
    const timer = setTimeout(enterFullscreen, 1000);
    
    return () => clearTimeout(timer);
  }, [enableFullscreen, isMobile]);

  // Prevent default behaviors on mobile
  useEffect(() => {
    if (!isMobile) return;
    
    const preventDefaultTouch = (e: TouchEvent) => {
      // Prevent pull-to-refresh on iOS Safari
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    const preventContextMenu = (e: Event) => {
      e.preventDefault();
    };
    
    document.addEventListener('touchmove', preventDefaultTouch, { passive: false });
    document.addEventListener('contextmenu', preventContextMenu);
    
    return () => {
      document.removeEventListener('touchmove', preventDefaultTouch);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, [isMobile]);

  // Performance monitoring alerts
  useEffect(() => {
    const clsMetric = metrics.find(m => m.name === 'CLS');
    const lcpMetric = metrics.find(m => m.name === 'LCP');
    const fidMetric = metrics.find(m => m.name === 'FID');
    
    if (clsMetric && clsMetric.value > 0.25) {
      console.warn('High CLS detected:', clsMetric.value);
    }
    if (lcpMetric && lcpMetric.value > 4000) {
      console.warn('Slow LCP detected:', lcpMetric.value);
    }
    if (fidMetric && fidMetric.value > 300) {
      console.warn('High FID detected:', fidMetric.value);
    }
  }, [metrics]);

  const wrapperClasses = [
    'mobile-app-wrapper',
    'min-h-screen',
    'relative',
    'overflow-x-hidden',
    isMobile ? 'touch-manipulation' : '',
    isIOS ? 'ios-app' : '',
    isAndroid ? 'android-app' : '',
    className
  ].filter(Boolean).join(' ');

  const pullToRefreshStyle = {
    transform: `translateY(${pullDistance}px)`,
    transition: isRefreshing || pullDistance === 0 ? 'transform 0.3s ease-out' : 'none'
  };

  return (
    <div 
      className={wrapperClasses}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && (pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm"
          style={{
            height: Math.max(pullDistance, isRefreshing ? 60 : 0),
            opacity: Math.min(pullDistance / 60, 1)
          }}
        >
          <div className="flex items-center space-x-2 text-muted-foreground">
            <div 
              className={`w-5 h-5 border-2 border-current border-t-transparent rounded-full ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: `rotate(${pullDistance * 3}deg)`
              }}
            />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      {/* Swipe indicators */}
      {enableSwipeGestures && swipeDirection && (
        <div className="fixed inset-y-0 z-40 flex items-center pointer-events-none">
          <div 
            className={`w-1 h-20 bg-primary/50 rounded-full transition-opacity duration-200 ${
              swipeDirection === 'left' ? 'right-0 mr-4' : 'left-0 ml-4'
            }`}
          />
        </div>
      )}
      
      {/* Memory pressure indicator */}
      {pressureLevel === 'critical' && (
        <div className="fixed top-4 left-4 right-4 z-50 p-2 bg-destructive text-destructive-foreground text-sm rounded-lg shadow-lg">
          ⚠️ High memory usage detected. Consider closing unused tabs.
        </div>
      )}
      
      {/* Main content */}
      <div 
        className="relative z-10"
        style={enablePullToRefresh ? pullToRefreshStyle : undefined}
      >
        {children}
      </div>
      
      {/* iOS safe area styles */}
      <style jsx>{`
        .mobile-app-wrapper {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
        
        .ios-app {
          -webkit-overflow-scrolling: touch;
        }
        
        .android-app {
          overscroll-behavior: contain;
        }
        
        @media (display-mode: standalone) {
          .mobile-app-wrapper {
            padding-top: max(env(safe-area-inset-top), 20px);
          }
        }
      `}</style>
    </div>
  );
}

// Hook for mobile app wrapper functionality
export function useMobileAppWrapper() {
  const { isMobile, isIOS, isAndroid } = usePlatformDetection();
  const [isStandalone, setIsStandalone] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  useEffect(() => {
    // Check if app is running in standalone mode (PWA)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    
    // Monitor orientation changes
    const handleOrientationChange = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    
    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, []);
  
  const requestFullscreen = useCallback(async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
  }, []);
  
  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
  }, []);
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isStandalone,
    orientation,
    requestFullscreen,
    exitFullscreen
  };
}

// Mobile-specific components
export function MobileStatusBar({ 
  backgroundColor = 'transparent',
  style = 'default' 
}: {
  backgroundColor?: string;
  style?: 'default' | 'light-content' | 'dark-content';
}) {
  useThemeColor(backgroundColor);
  useStatusBarStyle(style);
  
  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 h-safe-top"
      style={{ backgroundColor }}
    />
  );
}

export function MobileBottomSafeArea({ 
  backgroundColor = 'transparent' 
}: {
  backgroundColor?: string;
}) {
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 h-safe-bottom"
      style={{ backgroundColor }}
    />
  );
}

// Utility component for mobile-optimized scrolling
export function MobileScrollContainer({ 
  children,
  className = '',
  enableBounce = true,
  enableMomentum = true
}: {
  children: ReactNode;
  className?: string;
  enableBounce?: boolean;
  enableMomentum?: boolean;
}) {
  const scrollClasses = [
    'overflow-auto',
    enableMomentum ? 'scroll-smooth' : '',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      className={scrollClasses}
      style={{
        WebkitOverflowScrolling: enableMomentum ? 'touch' : 'auto',
        overscrollBehavior: enableBounce ? 'auto' : 'contain'
      }}
    >
      {children}
    </div>
  );
}