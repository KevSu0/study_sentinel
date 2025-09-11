'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface OfflineGateProps {
  children: React.ReactNode;
  featureName: string;
  fallback?: React.ReactNode;
}

export function OfflineGate({ children, featureName, fallback }: OfflineGateProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state
    setIsOnline(navigator.onLine);

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      // Try to fetch a small resource to test connectivity
      const response = await fetch('/offline.html', { 
        method: 'HEAD',
        cache: 'no-store'
      });
      setIsOnline(response.ok);
    } catch (error) {
      setIsOnline(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isOnline) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{featureName} Unavailable</CardTitle>
          <CardDescription>
            This feature requires an internet connection to function properly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>You appear to be offline</span>
            </div>
            <p className="text-xs">
              Study Sentinel&apos;s AI features need to connect to our servers to provide
              personalized insights and responses.
            </p>
          </div>
          
          <Button 
            onClick={checkConnection} 
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Retry Connection
              </>
            )}
          </Button>
          
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            <p>Other features like stats, tasks, and timers work offline!</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Component for loading state while checking AI features
export function AILoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-32 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// Hook for managing AI feature state with zero-network guarantee
export function useAIFeature() {
  const [isOnline, setIsOnline] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isAIEnabled, setIsAIEnabled] = useState(true);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // AI remains disabled until explicitly re-enabled
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setIsAIEnabled(false); // Hard-disable AI when offline
    };

    setIsOnline(navigator.onLine);
    setIsAIEnabled(navigator.onLine); // Initial state based on connectivity

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnectivity = async () => {
    try {
      await fetch('/offline.html', { method: 'HEAD', cache: 'no-store' });
      setIsOnline(true);
      setLastCheck(new Date());
      return true;
    } catch {
      setIsOnline(false);
      setIsAIEnabled(false); // Ensure AI is disabled when check fails
      setLastCheck(new Date());
      return false;
    }
  };

  // Hard disable AI - cannot be re-enabled manually when offline
  const disableAI = () => {
    setIsAIEnabled(false);
  };

  return {
    isOnline,
    lastCheck,
    checkConnectivity,
    canUseAI: isAIEnabled && isOnline,
    isAIEnabled,
    disableAI
  };
}