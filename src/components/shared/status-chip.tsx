import React, { useState, useEffect } from 'react';
import { SyncEngine, SyncStatus } from '@/lib/sync';
import { cn } from '@/lib/utils';

const StatusChip = () => {
  const [syncEngine] = useState(() => new SyncEngine(() => {}));
  const [status, setStatus] = useState<SyncStatus>(syncEngine.getSyncStatus());
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
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

  const chipClass = cn(
    'fixed bottom-4 right-4 px-3 py-1 text-sm font-medium text-white rounded-full shadow-lg',
    {
      'bg-gray-500': !isOnline,
      'bg-blue-500': isOnline && status === 'Syncing...',
      'bg-green-500': isOnline && status === 'Up to date',
      'bg-yellow-500': isOnline && status === 'Offline',
    }
  );

  return (
    <div className={chipClass}>
      {!isOnline ? 'Offline' : status}
    </div>
  );
};

export default StatusChip;