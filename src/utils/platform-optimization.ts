"use client";

import { useEffect, useState, useCallback } from 'react';

// Platform detection types
export interface PlatformInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMacOS: boolean;
  isLinux: boolean;
  isTouchDevice: boolean;
  browser: string;
  browserVersion: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
  screenSize: { width: number; height: number };
  viewportSize: { width: number; height: number };
  colorScheme: 'light' | 'dark';
  reducedMotion: boolean;
  highContrast: boolean;
}

// Mobile optimization settings
export interface MobileOptimizationOptions {
  preventZoom?: boolean;
  optimizeScrolling?: boolean;
  enableSafeArea?: boolean;
  disableSelection?: boolean;
}

export interface MobileOptimizations {
  enableFastClick: boolean;
  disableZoom: boolean;
  enableHardwareAcceleration: boolean;
  optimizeScrolling: boolean;
  reducedMotion: boolean;
}

// Hook for platform detection
export function usePlatformDetection(): PlatformInfo {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isIOS: false,
    isAndroid: false,
    isWindows: false,
    isMacOS: false,
    isLinux: false,
    isTouchDevice: false,
    browser: '',
    browserVersion: '',
    deviceType: 'desktop',
    orientation: 'landscape',
    pixelRatio: 1,
    screenSize: { width: 0, height: 0 },
    viewportSize: { width: 0, height: 0 },
    colorScheme: 'light',
    reducedMotion: false,
    highContrast: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isMobile = isIOS || isAndroid || /mobile/.test(userAgent);
    
    const isTablet = /ipad|tablet/.test(userAgent) || (isAndroid && !/mobile/.test(userAgent));
    const isDesktop = !isMobile && !isTablet;
    const isWindows = /windows/.test(userAgent);
    const isMacOS = /mac os/.test(userAgent);
    const isLinux = /linux/.test(userAgent);
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Detect browser
    let browser = 'unknown';
    let browserVersion = '';
    if (userAgent.includes('chrome')) browser = 'chrome';
    else if (userAgent.includes('firefox')) browser = 'firefox';
    else if (userAgent.includes('safari')) browser = 'safari';
    else if (userAgent.includes('edge')) browser = 'edge';
    
    const deviceType: 'mobile' | 'tablet' | 'desktop' = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    const orientation: 'portrait' | 'landscape' = window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    const pixelRatio = window.devicePixelRatio || 1;
    const screenSize = { width: window.screen.width, height: window.screen.height };
    const viewportSize = { width: window.innerWidth, height: window.innerHeight };
    const colorScheme: 'light' | 'dark' = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const highContrast = window.matchMedia('(prefers-contrast: high)').matches;

    setPlatformInfo({
      isMobile,
      isTablet,
      isDesktop,
      isIOS,
      isAndroid,
      isWindows,
      isMacOS,
      isLinux,
      isTouchDevice,
      browser,
      browserVersion,
      deviceType,
      orientation,
      pixelRatio,
      screenSize,
      viewportSize,
      colorScheme,
      reducedMotion,
      highContrast
    });
  }, []);

  return platformInfo;
}

// Hook for mobile optimizations
export function useMobileOptimizations(options?: MobileOptimizationOptions) {
  const platform = usePlatformDetection();
  const [optimizations, setOptimizations] = useState<MobileOptimizations>({
    enableFastClick: false,
    disableZoom: false,
    enableHardwareAcceleration: false,
    optimizeScrolling: false,
    reducedMotion: false
  });

  const {
    preventZoom = true,
    optimizeScrolling = true,
    enableSafeArea = true,
    disableSelection = false
  } = options || {};

  useEffect(() => {
    if (!platform.isMobile) return;

    // Apply mobile-specific optimizations
    const opts: MobileOptimizations = {
      enableFastClick: true,
      disableZoom: platform.isMobile,
      enableHardwareAcceleration: true,
      optimizeScrolling: true,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };

    setOptimizations(opts);

    // Apply CSS optimizations
    if (opts.enableHardwareAcceleration) {
      document.documentElement.style.setProperty('transform', 'translateZ(0)');
    }

    if (opts.optimizeScrolling) {
      document.documentElement.style.setProperty('-webkit-overflow-scrolling', 'touch');
      document.documentElement.style.setProperty('scroll-behavior', 'smooth');
    }

    // Disable zoom if needed
    if (opts.disableZoom) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        );
      }
    }

  }, [platform]);

  return optimizations;
}

// Hook for theme color management
export function useThemeColor(color: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set theme color for mobile browsers
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.setAttribute('name', 'theme-color');
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.setAttribute('content', color);

    // Set Apple-specific theme color
    let appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!appleStatusBarMeta) {
      appleStatusBarMeta = document.createElement('meta');
      appleStatusBarMeta.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
      document.head.appendChild(appleStatusBarMeta);
    }
    appleStatusBarMeta.setAttribute('content', 'black-translucent');

    // Set Microsoft tile color
    let msTileColorMeta = document.querySelector('meta[name="msapplication-TileColor"]');
    if (!msTileColorMeta) {
      msTileColorMeta = document.createElement('meta');
      msTileColorMeta.setAttribute('name', 'msapplication-TileColor');
      document.head.appendChild(msTileColorMeta);
    }
    msTileColorMeta.setAttribute('content', color);

  }, [color]);
}

// Hook for status bar styling
export function useStatusBarStyle(style: 'default' | 'light-content' | 'dark-content' = 'default') {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set status bar style for mobile browsers
    const statusBarStyleMap = {
      'default': 'default',
      'light-content': 'black-translucent',
      'dark-content': 'black'
    };
    
    const metaStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
    if (metaStatusBar) {
      metaStatusBar.content = statusBarStyleMap[style];
    } else {
      const meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-status-bar-style';
      meta.content = statusBarStyleMap[style];
      document.head.appendChild(meta);
    }

    // Also set for Android Chrome
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta && style === 'dark-content') {
      themeColorMeta.setAttribute('content', '#000000');
    }

  }, [style]);
}

// Utility functions for platform-specific operations
export const PlatformUtils = {
  // Check if device supports touch
  isTouchDevice(): boolean {
    return typeof window !== 'undefined' && 
           ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  },

  // Get safe area insets for notched devices
  getSafeAreaInsets() {
    if (typeof window === 'undefined') return { top: 0, right: 0, bottom: 0, left: 0 };
    
    const computedStyle = getComputedStyle(document.documentElement);
    return {
      top: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0')
    };
  },

  // Vibrate device (if supported)
  vibrate(pattern: number | number[]): boolean {
    if (typeof window === 'undefined' || !navigator.vibrate) return false;
    return navigator.vibrate(pattern);
  },

  // Request fullscreen
  async requestFullscreen(element?: Element): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const elem = element || document.documentElement;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
        return true;
      }
    } catch (error) {
      console.warn('Fullscreen request failed:', error);
    }
    return false;
  },

  // Exit fullscreen
  async exitFullscreen(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        return true;
      }
    } catch (error) {
      console.warn('Exit fullscreen failed:', error);
    }
    return false;
  }
};