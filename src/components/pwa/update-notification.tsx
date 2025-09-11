'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, X, RefreshCw, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PWAUpdateNotificationProps {
  className?: string;
}

export function PWAUpdateNotification({ className }: PWAUpdateNotificationProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateInstalled, setUpdateInstalled] = useState(false);

  useEffect(() => {
    // Listen for service worker updates
    const handleServiceWorkerUpdate = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setUpdateAvailable(true);
        toast('Update available!', {
          icon: '📱',
          duration: 4000,
        });
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerUpdate);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerUpdate);
    };
  }, []);

  const downloadUpdate = async () => {
    setUpdateDownloading(true);
    try {
      // Register the new service worker
      const registration = await navigator.serviceWorker?.getRegistration();
      if (registration) {
        // Send message to skip waiting
        registration.active?.postMessage({ type: 'SKIP_WAITING' });
        
        // Wait for the new service worker to activate
        registration.addEventListener('controllerchange', () => {
          setUpdateInstalled(true);
          setUpdateDownloading(false);
          
          toast('Update installed! Refresh to apply.', {
            icon: '✅',
            duration: 4000,
          });
        });
      }
    } catch (error) {
      console.error('Failed to download update:', error);
      toast('Failed to download update', {
        icon: '❌',
        duration: 4000,
      });
      setUpdateDownloading(false);
    }
  };

  const refreshApp = () => {
    window.location.reload();
  };

  const dismissNotification = () => {
    setUpdateAvailable(false);
    setUpdateInstalled(false);
  };

  if (!updateAvailable && !updateInstalled) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 max-w-sm ${className}`}>
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Download className="h-4 w-4" />
              App Update
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissNotification}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={updateInstalled ? "default" : "secondary"}>
              {updateInstalled ? "Ready" : "Available"}
            </Badge>
            {updateDownloading && (
              <Badge variant="outline" className="animate-pulse">
                Downloading...
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <CardDescription className="text-xs mb-3">
            {updateInstalled 
              ? "The update has been installed. Refresh to apply changes."
              : "A new version of Study Sentinel is available with improvements and bug fixes."
            }
          </CardDescription>
          
          <div className="flex gap-2">
            {updateInstalled ? (
              <Button onClick={refreshApp} size="sm" className="flex-1">
                <RefreshCw className="mr-1 h-3 w-3" />
                Refresh Now
              </Button>
            ) : (
              <Button 
                onClick={downloadUpdate} 
                size="sm" 
                className="flex-1"
                disabled={updateDownloading}
              >
                {updateDownloading ? (
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3 w-3" />
                )}
                Update
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={dismissNotification}
              disabled={updateDownloading}
            >
              Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing service worker updates
export function usePWAUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker and listen for updates
    const registerServiceWorker = async () => {
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        setRegistration(reg);
        
        if (reg) {
          // Check for updates periodically
          setInterval(() => {
            reg.update();
          }, 60 * 60 * 1000); // Check every hour
        }
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    };

    registerServiceWorker();

    // Listen for controller changes (new service worker activated)
    const handleControllerChange = () => {
      setUpdateAvailable(true);
    };

    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const checkForUpdates = async () => {
    if (registration) {
      try {
        await registration.update();
        return true;
      } catch (error) {
        console.error('Failed to check for updates:', error);
        return false;
      }
    }
    return false;
  };

  return {
    updateAvailable,
    checkForUpdates,
    registration
  };
}

// Component for displaying PWA install prompt
export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      toast('Study Sentinel installed successfully!', {
        icon: '📱',
        duration: 4000,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        setInstallPrompt(null);
      } catch (error) {
        console.error('Failed to install app:', error);
      }
    }
  };

  if (isInstalled || !installPrompt) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          Install App
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-xs mb-3">
          Install Study Sentinel on your device for quick access and offline support.
        </CardDescription>
        <Button onClick={installApp} size="sm" className="w-full">
          Install Now
        </Button>
      </CardContent>
    </Card>
  );
}