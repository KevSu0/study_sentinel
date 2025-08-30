'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Wifi, 
  WifiOff, 
  Signal, 
  SignalLow, 
  SignalMedium, 
  SignalHigh,
  RefreshCw,
  RotateCw,
  Clock,
  AlertCircle,
  CheckCircle,
  Cloud, 
  CloudOff, 
  Loader2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { NetworkStatus, networkStatusService } from '@/lib/services/network-status.service';
import { syncEngine, SyncStatus } from '@/lib/sync';
import { ConflictResolutionDialog } from '@/components/ui/conflict-resolution-dialog';
import { SyncConflict } from '@/lib/db';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OfflineStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function OfflineStatusIndicator({ 
  className, 
  showDetails = false, 
  compact = false 
}: OfflineStatusIndicatorProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(networkStatusService.getNetworkStatus());
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const subscription = networkStatusService.onNetworkStatusChange().subscribe(setNetworkStatus);
    return () => subscription.unsubscribe();
  }, []);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      await networkStatusService.checkConnectivity();
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }

    if (!networkStatus.isOnline) {
      return <WifiOff className="h-4 w-4" />;
    }

    const quality = networkStatusService.getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-blue-500" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusText = () => {
    if (!networkStatus.isOnline) {
      return 'Offline';
    }

    const quality = networkStatusService.getConnectionQuality();
    return `Online (${quality})`;
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) {
      return 'text-red-500';
    }

    const quality = networkStatusService.getConnectionQuality();
    switch (quality) {
      case 'excellent':
        return 'text-green-500';
      case 'good':
        return 'text-blue-500';
      case 'poor':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  // Always return a small dot indicator
  return (
    <button
      onClick={handleManualCheck}
      className={cn(
        'flex items-center justify-center w-3 h-3 rounded-full transition-colors',
        'hover:scale-110 cursor-pointer',
        networkStatus.isOnline ? 'bg-green-500' : 'bg-red-500',
        className
      )}
      title={`Network Status: ${getStatusText()}`}
      disabled={isChecking}
    >
      {isChecking && (
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      )}
    </button>
  );
}

// Sync Status Indicator Component
interface SyncStatusIndicatorProps {
  className?: string;
}

export function SyncStatusIndicator({
  className
}: SyncStatusIndicatorProps) {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(networkStatusService.getNetworkStatus());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncEngine.getSyncStatus());
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    const subscription = networkStatusService.onNetworkStatusChange().subscribe(setNetworkStatus);
    
    // Subscribe to sync status changes
    const handleSyncStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
    };

    syncEngine.addSyncListener(handleSyncStatusChange);

    // Load initial data
     const loadSyncData = async () => {
       try {
         const [pendingCount, conflictCount, conflicts] = await Promise.all([
           syncEngine.getPendingChangesCount(),
           syncEngine.getConflictCount(),
           syncEngine.getConflicts()
         ]);
         
         setPendingChanges(pendingCount);
         setConflictCount(conflictCount);
         setConflicts(conflicts);
       } catch (error) {
         console.error('Failed to load sync data:', error);
       }
     };

    loadSyncData();

    // Refresh data periodically
    const interval = setInterval(loadSyncData, 10000);

    return () => {
      subscription.unsubscribe();
      syncEngine.removeSyncListener(handleSyncStatusChange);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    
    try {
      const result = await syncEngine.manualSync();
      
      if (result.success) {
         // Refresh data after successful sync
         const [pendingCount, conflictCount, conflicts] = await Promise.all([
           syncEngine.getPendingChangesCount(),
           syncEngine.getConflictCount(),
           syncEngine.getConflicts()
         ]);
         
         setPendingChanges(pendingCount);
         setConflictCount(conflictCount);
         setConflicts(conflicts);
       }
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleShowConflicts = async () => {
    try {
      const latestConflicts = await syncEngine.getConflicts();
      setConflicts(latestConflicts);
      setShowConflictDialog(true);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
      toast.error('Failed to load conflicts');
    }
  };

  const handleConflictsResolved = async () => {
     try {
       const [pendingCount, conflictCount, conflicts] = await Promise.all([
         syncEngine.getPendingChangesCount(),
         syncEngine.getConflictCount(),
         syncEngine.getConflicts()
       ]);
       
       setPendingChanges(pendingCount);
       setConflictCount(conflictCount);
       setConflicts(conflicts);
       toast.success('All conflicts resolved!');
     } catch (error) {
       console.error('Failed to refresh after conflict resolution:', error);
     }
   };

  const getSyncStatusInfo = () => {
    if (syncStatus.isSyncing || isManualSyncing) {
      return {
        icon: <RotateCw className="h-3 w-3 animate-spin" />,
        label: 'Syncing...',
        variant: 'secondary' as const,
        color: 'text-blue-600'
      };
    }
    
    if (!syncStatus.isOnline) {
      return {
        icon: <WifiOff className="h-3 w-3" />,
        label: 'Offline',
        variant: 'secondary' as const,
        color: 'text-gray-600'
      };
    }
    
    if (conflictCount > 0) {
      return {
        icon: <AlertTriangle className="h-3 w-3" />,
        label: `${conflictCount} conflicts`,
        variant: 'destructive' as const,
        color: 'text-red-600'
      };
    }
    
    if (pendingChanges > 0) {
      return {
        icon: <Clock className="h-3 w-3" />,
        label: `${pendingChanges} pending`,
        variant: 'secondary' as const,
        color: 'text-amber-600'
      };
    }
    
    return {
      icon: <CheckCircle className="h-3 w-3" />,
      label: 'Up to date',
      variant: 'outline' as const,
      color: 'text-green-600'
    };
  };

  const formatLastSyncTime = (time: Date | null) => {
    if (!time) return 'Never';
    
    const now = new Date();
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const statusInfo = getSyncStatusInfo();
  
  // Determine dot color based on sync status
  const getDotColor = () => {
    if (syncStatus.isSyncing || isManualSyncing) {
      return 'bg-blue-500'; // Syncing
    }
    
    if (!syncStatus.isOnline) {
      return 'bg-gray-500'; // Offline
    }
    
    if (conflictCount > 0 || pendingChanges > 0) {
      return 'bg-red-500'; // Issues (conflicts or pending changes)
    }
    
    return 'bg-green-500'; // Up to date
  };

  const getTooltipText = () => {
    if (syncStatus.isSyncing || isManualSyncing) {
      return 'Syncing...';
    }
    
    if (!syncStatus.isOnline) {
      return 'Offline';
    }
    
    if (conflictCount > 0) {
      return `${conflictCount} conflicts need resolution`;
    }
    
    if (pendingChanges > 0) {
      return `${pendingChanges} changes pending sync`;
    }
    
    return 'Up to date';
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={handleManualSync}
        disabled={isManualSyncing || !syncStatus.isOnline}
        className={cn(
          'flex items-center justify-center w-3 h-3 rounded-full transition-colors',
          'hover:scale-110 cursor-pointer',
          getDotColor()
        )}
        title={getTooltipText()}
      >
        {(syncStatus.isSyncing || isManualSyncing) && (
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        )}
      </button>
      
      {conflictCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleShowConflicts}
          className="h-6 px-2 text-xs text-red-600 border-red-200 hover:bg-red-50"
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Resolve
        </Button>
      )}
      
      <ConflictResolutionDialog
        open={showConflictDialog}
        onOpenChange={setShowConflictDialog}
        conflicts={conflicts}
        onConflictsResolved={handleConflictsResolved}
      />
    </div>
  );
}