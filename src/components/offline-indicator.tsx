'use client';

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(true);
      // Simulate reconnection process
      setTimeout(() => setIsReconnecting(false), 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={cn(
      'fixed bottom-4 right-4 z-50 transition-all duration-300',
      isOnline 
        ? 'bg-green-500'
        : 'bg-red-500'
    )}>
      {isReconnecting ? (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-white" />
          <span className="text-xs text-white font-medium">Reconnecting...</span>
        </div>
      ) : (
        <div className={cn(
          'w-3 h-3 rounded-full',
          isOnline 
            ? 'bg-green-500 shadow-lg shadow-green-500/50'
            : 'bg-red-500 shadow-lg shadow-red-500/50'
        )} />
      )}
    </div>
  );
}

interface OfflineBannerProps {
  className?: string;
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn(
      'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg transition-all duration-300',
      isOnline 
        ? 'bg-green-100 text-green-800 border border-green-200'
        : 'bg-orange-100 text-orange-800 border border-orange-200'
    )}>
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span className="text-sm font-medium">
          {isOnline ? 'Back online' : 'You\'re offline'}
        </span>
      </div>
    </div>
  );
}