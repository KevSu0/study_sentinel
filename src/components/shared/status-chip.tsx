'use client';

import React, { useState, useEffect } from 'react';
import { syncEngine, SyncStatus } from '@/lib/sync';
import { cn } from '@/lib/utils';

const StatusChip = () => {
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getSyncStatus());
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);
    const handleStatusChange = (event: CustomEvent) => {
      setStatus(event.detail.status);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('sync-status-change', handleStatusChange as EventListener);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('sync-status-change', handleStatusChange as EventListener);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getDotColor = () => {
    if (!isOnline) return 'bg-gray-500';
    if (status.isSyncing) return 'bg-blue-500';
    if (status.pendingChanges > 0) return 'bg-red-500';
    return 'bg-green-500';
  };

  const getTooltipText = () => {
    if (!isOnline) return 'Offline';
    if (status.isSyncing) return 'Syncing...';
    if (status.pendingChanges > 0) return `${status.pendingChanges} pending`;
    return 'Up to date';
  };

  // Only render after component is mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div 
      className={cn(
        'fixed bottom-4 right-4 w-3 h-3 rounded-full shadow-lg transition-colors cursor-pointer hover:scale-110',
        getDotColor()
      )}
      title={getTooltipText()}
    >
      {status.isSyncing && (
        <div className="w-2 h-2 rounded-full bg-white animate-pulse absolute top-0.5 left-0.5" />
      )}
    </div>
  );
};

export default StatusChip;