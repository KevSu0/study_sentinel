/**
 * Dependency optimization utilities for reducing bundle size
 * This module provides lightweight alternatives and optimized imports
 */

import React from 'react';

// Lightweight date utilities to replace heavy date libraries
export const dateUtils = {
  formatDate: (date: Date, format: 'short' | 'long' | 'iso' = 'short') => {
    switch (format) {
      case 'short':
        return date.toLocaleDateString();
      case 'long':
        return date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'iso':
        return date.toISOString().split('T')[0];
      default:
        return date.toLocaleDateString();
    }
  },
  
  addDays: (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  isSameDay: (date1: Date, date2: Date) => {
    return date1.toDateString() === date2.toDateString();
  },
  
  startOfDay: (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  },
  
  endOfDay: (date: Date) => {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
  }
};

// Lightweight animation utilities to reduce framer-motion usage
export const animationUtils = {
  // CSS-based animations that can replace framer-motion in simple cases
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },
  
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  },
  
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2 }
  },
  
  // CSS class names for simple animations
  cssClasses: {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scale: 'animate-scale',
    bounce: 'animate-bounce',
    pulse: 'animate-pulse'
  }
};

// Lightweight chart utilities for simple charts
export const chartUtils = {
  // Simple SVG-based charts for basic data visualization
  generatePieChartPath: (percentage: number, radius: number = 50) => {
    const angle = (percentage / 100) * 360;
    const radians = (angle * Math.PI) / 180;
    const x = radius + radius * Math.cos(radians - Math.PI / 2);
    const y = radius + radius * Math.sin(radians - Math.PI / 2);
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    return [
      `M ${radius} ${radius}`,
      `L ${radius} 0`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}`,
      'Z'
    ].join(' ');
  },
  
  generateBarHeight: (value: number, maxValue: number, maxHeight: number = 100) => {
    return (value / maxValue) * maxHeight;
  },
  
  generateLinePoints: (data: number[], width: number, height: number) => {
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const range = maxValue - minValue || 1;
    
    return data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - minValue) / range) * height;
      return `${x},${y}`;
    }).join(' ');
  }
};

// Bundle size monitoring
export const bundleMonitor = {
  // Track component render performance
  trackComponentRender: (componentName: string) => {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now();
      return () => {
        const end = performance.now();
        console.log(`${componentName} render time: ${(end - start).toFixed(2)}ms`);
      };
    }
    return () => {};
  },
  
  // Lazy load heavy dependencies
  lazyImport: function<T>(importFn: () => Promise<T>) {
    let cache: T | null = null;
    return async (): Promise<T> => {
      if (cache) return cache;
      cache = await importFn();
      return cache;
    };
  }
};

// Optimized icon utilities
export const iconUtils = {
  // Common icon SVGs to reduce lucide-react bundle size
  icons: {
    check: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="20,6 9,17 4,12" />
      </svg>
    ),
    x: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    plus: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    minus: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    )
  },
  
  // Generate simple icons programmatically
  createIcon: (path: string, size: number = 16) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d={path} />
    </svg>
  )
};