'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { DownloadCloud, Info, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type UpdateMessage = {
  type: 'UPDATE_AVAILABLE';
  [key: string]: unknown;
};

interface UsePWAUpdatesResult {
  updateAvailable: boolean;
  waitingWorker: ServiceWorker | null;
  skipWaiting: () => void;
  checkForUpdates: () => Promise<boolean>;
  dismissUpdate: () => void;
  isChecking: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const UPDATE_TOAST = {
  available: 'A new update is ready',
  applied: 'Update applied successfully',
  checkError: 'Unable to check for updates right now',
};

export function usePWAUpdates(): UsePWAUpdatesResult {
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const waitingRef = useRef<ServiceWorker | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const announceUpdate = useCallback((worker: ServiceWorker | null) => {
    if (!worker) {
      return;
    }
    waitingRef.current = worker;
    setWaitingWorker(worker);
    setUpdateAvailable((prev) => {
      if (!prev) {
        toast.success(UPDATE_TOAST.available);
      }
      return true;
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    let cleanupInstalling: (() => void) | undefined;

    const watchInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) {
        return;
      }

      const handleStateChange = () => {
        if (worker.state === 'installed' && isMounted) {
          announceUpdate(worker);
        }
      };

      worker.addEventListener('statechange', handleStateChange);
      cleanupInstalling = () => {
        worker.removeEventListener('statechange', handleStateChange);
      };

      if (worker.state === 'installed') {
        announceUpdate(worker);
      }
    };

    const handleUpdateFound = () => {
      const registration = registrationRef.current;
      if (!registration) {
        return;
      }
      watchInstallingWorker(registration.installing);
    };

    const setupRegistration = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration || !isMounted) {
          return;
        }
        registrationRef.current = registration;
        registration.addEventListener('updatefound', handleUpdateFound);

        if (registration.waiting) {
          announceUpdate(registration.waiting);
        } else {
          watchInstallingWorker(registration.installing);
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
          console.error('Failed to inspect service worker registration', error);
        }
      }
    };

    const handleControllerChange = () => {
      if (!isMounted) {
        return;
      }
      toast.success(UPDATE_TOAST.applied);
      waitingRef.current = null;
      setWaitingWorker(null);
      setUpdateAvailable(false);
    };

    const handleMessage = (event: MessageEvent<UpdateMessage>) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        const waiting = registrationRef.current?.waiting ?? waitingRef.current;
        announceUpdate(waiting ?? null);
      }
    };

    setupRegistration();
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      isMounted = false;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
      registrationRef.current?.removeEventListener('updatefound', handleUpdateFound);
      cleanupInstalling?.();
    };
  }, [announceUpdate]);

  const skipWaiting = useCallback(() => {
    const worker = waitingRef.current;
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    waitingRef.current = null;
    setWaitingWorker(null);
    setUpdateAvailable(false);
  }, []);

  const checkForUpdates = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) {
      return false;
    }
    setIsChecking(true);
    try {
      await registration.update();
      return true;
    } catch (error) {
      toast.error(UPDATE_TOAST.checkError);
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to check for updates', error);
      }
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return {
    updateAvailable,
    waitingWorker,
    skipWaiting,
    checkForUpdates,
    dismissUpdate,
    isChecking,
  };
}

interface PWAUpdateNotificationProps {
  className?: string;
}

export function PWAUpdateNotification({ className }: PWAUpdateNotificationProps) {
  const { updateAvailable, skipWaiting, checkForUpdates, dismissUpdate, isChecking } = usePWAUpdates();
  const [refreshRequested, setRefreshRequested] = useState(false);

  useEffect(() => {
    if (!updateAvailable) {
      setRefreshRequested(false);
    }
  }, [updateAvailable]);

  const handleRefresh = () => {
    setRefreshRequested(true);
    skipWaiting();
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label="Application update status"
      className={cn('fixed bottom-4 right-4 z-50 w-full max-w-sm', className)}
    >
      <Card className="shadow-lg">
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DownloadCloud className="h-4 w-4" aria-hidden="true" />
              Update available
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Dismiss update banner"
              onClick={dismissUpdate}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Ready to install</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <CardDescription>
            A newer version of Study Sentinel has been downloaded. Refresh to switch without losing work.
          </CardDescription>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleRefresh} disabled={refreshRequested} className="sm:flex-1">
              <RefreshCw
                className={cn('mr-2 h-4 w-4', refreshRequested && 'animate-spin')}
                aria-hidden="true"
              />
              Refresh now
            </Button>
            <Button
              variant="outline"
              onClick={checkForUpdates}
              disabled={isChecking}
              className="sm:flex-1"
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', isChecking && 'animate-spin')}
                aria-hidden="true"
              />
              Check again
            </Button>
            <Button variant="ghost" onClick={dismissUpdate} className="sm:flex-1">
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      toast.success('Study Sentinel installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    if (window.matchMedia?.('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installEvent) {
      return;
    }
    try {
      await installEvent.prompt();
      await installEvent.userChoice;
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Installation prompt failed', error);
      }
    } finally {
      setInstallEvent(null);
    }
  }, [installEvent]);

  if (isInstalled || !installEvent) {
    return null;
  }

  return (
    <Card aria-label="Install Study Sentinel" className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Info className="h-4 w-4" aria-hidden="true" />
          Install Study Sentinel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <CardDescription>
          Install the app for quick access and improved offline support.
        </CardDescription>
        <Button onClick={handleInstall} className="w-full">
          Install app
        </Button>
      </CardContent>
    </Card>
  );
}


