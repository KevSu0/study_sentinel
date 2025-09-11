// This is a new file to manage the Screen Wake Lock API
'use client';

import { useState, useEffect } from 'react';

export function useWakeLock() {
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          lock = await (navigator as any).wakeLock.request('screen');
          if (lock) {
            setWakeLock(lock);
            lock.addEventListener('release', () => {
              // This happens when the lock is released by the system, e.g., tab visibility change.
              setWakeLock(null);
            });
          }
          
        } catch (err: any) {
          // The request can fail if the document is not visible, or if the feature is disabled by permissions policy.
          // We will log this for debugging but not crash the app. It's a non-critical feature.
          console.warn(`Screen Wake Lock request failed: ${err.name}, ${err.message}`);
          setWakeLock(null);
        }
      } else {
        console.warn('Screen Wake Lock API not supported by this browser.');
      }
    };
    
    requestWakeLock();
    
    const handleVisibilityChange = () => {
        if (wakeLock === null && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleVisibilityChange);

    return () => {
      if (lock) {
        lock.release().catch(() => {}); // Release the lock on cleanup, ignore errors.
        setWakeLock(null);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleVisibilityChange);
    };
  }, []);

  return wakeLock;
}
