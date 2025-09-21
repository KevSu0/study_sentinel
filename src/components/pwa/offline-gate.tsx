'use client';

import { thirdPartyGate } from '@/lib/third-party/third-party-gate';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface OfflineGateProps {
  children: React.ReactNode;
  featureName: string;
  fallback?: React.ReactNode;
  className?: string;
}

interface AIFeatureState {
  isOnline: boolean;
  lastCheck: Date | null;
  checkConnectivity: () => Promise<boolean>;
  canUseAI: boolean;
  isAIEnabled: boolean;
  disableAI: () => void;
  isChecking: boolean;
}

const CONNECTIVITY_PROBE = '/offline-check.txt';

export function OfflineGate({ children, featureName, fallback, className }: OfflineGateProps) {
  const { isOnline, isChecking, checkConnectivity } = useAIFeature();

  if (isOnline) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <section role="status" aria-live="polite" aria-label={`${featureName} offline status`}
      className={cn('flex min-h-[60vh] items-center justify-center p-4', className)}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl">{featureName} is offline</CardTitle>
          <CardDescription>
            We could not reach the network. Check your connection and try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>Study Sentinel will retry automatically once you are back online.</span>
          </div>
          <Button
            onClick={checkConnectivity}
            disabled={isChecking}
            className="w-full"
            aria-live="polite"
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Checking connection…
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" aria-hidden="true" />
                Retry connection
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Core features like timers and tasks continue to work offline.
          </p>
        </CardContent>
      </Card>
    </section>
  );
}

export function AILoadingState() {
  return (
    <div className="space-y-4" aria-label="AI loading state">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
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

export function useAIFeature(): AIFeatureState {
  const onlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isOnline, setIsOnline] = useState(onlineRef.current);
  const [isAIEnabled, setIsAIEnabled] = useState(onlineRef.current);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      onlineRef.current = true;
      setIsOnline(true);
      setIsAIEnabled(true);
    };

    const handleOffline = () => {
      onlineRef.current = false;
      setIsOnline(false);
      setIsAIEnabled(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await thirdPartyGate.fetchRaw(CONNECTIVITY_PROBE, {
        method: 'HEAD',
        cache: 'no-store',
      }) /* TODO: consider thirdPartyGate.fetchJson if response is JSON */;
      const online = response.ok;
      onlineRef.current = online;
      setIsOnline(online);
      setIsAIEnabled(online);
      return online;
    } catch {
      onlineRef.current = false;
      setIsOnline(false);
      setIsAIEnabled(false);
      return false;
    } finally {
      setLastCheck(new Date());
      setIsChecking(false);
    }
  }, []);

  const disableAI = useCallback(() => {
    setIsAIEnabled(false);
  }, []);

  return {
    isOnline,
    lastCheck,
    checkConnectivity,
    canUseAI: isOnline && isAIEnabled,
    isAIEnabled,
    disableAI,
    isChecking,
  };
}


