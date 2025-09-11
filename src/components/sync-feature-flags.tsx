'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Shield, 
  Cloud, 
  RefreshCw, 
  Settings, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Wifi,
  WifiOff,
  Server,
  Database,
  User,
  Clock,
  BarChart3,
  Activity,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface SyncFeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  category: 'sync' | 'uplink' | 'downlink' | 'batching' | 'observability';
  lastUpdated: string;
  serverOverride: boolean;
  rolloutPercentage: number;
}

interface ServerKillSwitch {
  enabled: boolean;
  reason: string;
  timestamp: string;
  affectedFeatures: string[];
}

interface SyncStatus {
  connected: boolean;
  lastSync: string | null;
  pendingUploads: number;
  pendingDownloads: number;
  conflicts: number;
  provider: string;
  region: string;
}

export function SyncFeatureFlags() {
  const [flags, setFlags] = useState<SyncFeatureFlag[]>([]);
  const [killSwitch, setKillSwitch] = useState<ServerKillSwitch | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Initialize feature flags
  useEffect(() => {
    loadFeatureFlags();
    loadKillSwitchStatus();
    loadSyncStatus();
  }, []);

  const loadFeatureFlags = async () => {
    // Simulate loading feature flags from server/local storage
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockFlags: SyncFeatureFlag[] = [
      {
        name: 'sync_uplink',
        enabled: false,
        description: 'Enable data synchronization to cloud servers',
        category: 'uplink',
        lastUpdated: '2024-01-15T10:30:00Z',
        serverOverride: false,
        rolloutPercentage: 0
      },
      {
        name: 'sync_downlink',
        enabled: false,
        description: 'Enable data synchronization from cloud servers',
        category: 'downlink',
        lastUpdated: '2024-01-15T10:30:00Z',
        serverOverride: false,
        rolloutPercentage: 0
      },
      {
        name: 'sync_batching',
        enabled: false,
        description: 'Batch multiple sync operations for efficiency',
        category: 'batching',
        lastUpdated: '2024-01-15T10:30:00Z',
        serverOverride: false,
        rolloutPercentage: 0
      },
      {
        name: 'sync_observability',
        enabled: false,
        description: 'Enable sync metrics and monitoring',
        category: 'observability',
        lastUpdated: '2024-01-15T10:30:00Z',
        serverOverride: false,
        rolloutPercentage: 0
      },
      {
        name: 'sync_conflict_resolution',
        enabled: false,
        description: 'Automatic conflict resolution for sync conflicts',
        category: 'sync',
        lastUpdated: '2024-01-15T10:30:00Z',
        serverOverride: false,
        rolloutPercentage: 0
      }
    ];
    
    setFlags(mockFlags);
  };

  const loadKillSwitchStatus = async () => {
    // Simulate checking server kill switch status
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // For now, kill switch is disabled (safe to enable features)
    setKillSwitch({
      enabled: false,
      reason: '',
      timestamp: '',
      affectedFeatures: []
    });
  };

  const loadSyncStatus = async () => {
    // Simulate loading current sync status
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setSyncStatus({
      connected: navigator.onLine,
      lastSync: null,
      pendingUploads: 0,
      pendingDownloads: 0,
      conflicts: 0,
      provider: 'none',
      region: 'local'
    });
  };

  const toggleFeatureFlag = async (flagName: string) => {
    setUpdating(flagName);
    
    try {
      // Check kill switch first
      if (killSwitch?.enabled && killSwitch.affectedFeatures.includes(flagName)) {
        alert(`Cannot enable ${flagName}: Server kill switch is active`);
        return;
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFlags(prev => prev.map(flag => 
        flag.name === flagName 
          ? { ...flag, enabled: !flag.enabled, lastUpdated: new Date().toISOString() }
          : flag
      ));
      
      // Update sync status if uplink/downlink changed
      if (flagName === 'sync_uplink' || flagName === 'sync_downlink') {
        loadSyncStatus();
      }
      
    } finally {
      setUpdating(null);
    }
  };

  const enableAllSync = async () => {
    const confirm = window.confirm(
      'Enable all sync features? This will begin cloud synchronization of your data.'
    );
    if (!confirm) return;
    
    if (killSwitch?.enabled) {
      alert('Cannot enable sync: Server kill switch is active');
      return;
    }
    
    setUpdating('all');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setFlags(prev => prev.map(flag => ({
        ...flag,
        enabled: true,
        lastUpdated: new Date().toISOString()
      })));
      
      loadSyncStatus();
      
    } finally {
      setUpdating(null);
    }
  };

  const disableAllSync = async () => {
    const confirm = window.confirm(
      'Disable all sync features? This will stop all cloud synchronization and work offline-only.'
    );
    if (!confirm) return;
    
    setUpdating('all');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setFlags(prev => prev.map(flag => ({
        ...flag,
        enabled: false,
        lastUpdated: new Date().toISOString()
      })));
      
      loadSyncStatus();
      
    } finally {
      setUpdating(null);
    }
  };

  const requestKillSwitchOverride = async () => {
    const reason = prompt('Please enter the reason for requesting kill switch override:');
    if (!reason) return;
    
    // Simulate sending override request
    alert(`Kill switch override request sent.\nReason: ${reason}\n\nThis will be reviewed by the development team.`);
  };

  const formatCategory = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Sync Feature Flags</h2>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sync Feature Flags</h2>
          <p className="text-muted-foreground">
            Control cloud synchronization features and settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={enableAllSync} disabled={updating !== null} variant="outline">
            <Cloud className="mr-2 h-4 w-4" />
            Enable All Sync
          </Button>
          <Button onClick={disableAllSync} disabled={updating !== null} variant="outline">
            <ToggleLeft className="mr-2 h-4 w-4" />
            Disable All Sync
          </Button>
        </div>
      </div>

      {/* Kill Switch Alert */}
      {killSwitch?.enabled && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Server Kill Switch Active</AlertTitle>
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Reason:</strong> {killSwitch.reason}</p>
              <p><strong>Affected Features:</strong> {killSwitch.affectedFeatures.join(', ')}</p>
              <p><strong>Time:</strong> {formatDate(killSwitch.timestamp)}</p>
              <Button 
                onClick={requestKillSwitchOverride} 
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                Request Override
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Status Overview */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Sync Status
            </CardTitle>
            <CardDescription>
              Current synchronization state and connectivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-2">
                {syncStatus.connected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <div className="font-medium">Connection</div>
                  <div className="text-sm text-muted-foreground">
                    {syncStatus.connected ? 'Connected' : 'Offline'}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="font-medium">Pending Uploads</div>
                  <div className="text-sm text-muted-foreground">
                    {syncStatus.pendingUploads} items
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium">Pending Downloads</div>
                  <div className="text-sm text-muted-foreground">
                    {syncStatus.pendingDownloads} items
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium">Conflicts</div>
                  <div className="text-sm text-muted-foreground">
                    {syncStatus.conflicts} items
                  </div>
                </div>
              </div>
            </div>
            
            {syncStatus.lastSync && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last sync: {formatDate(syncStatus.lastSync)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature Flags List */}
      <div className="space-y-4">
        {flags.map((flag) => (
          <Card key={flag.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {flag.enabled ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
                    )}
                    {flag.name}
                    <Badge variant="outline">{formatCategory(flag.category)}</Badge>
                  </CardTitle>
                  <CardDescription>{flag.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {updating === flag.name ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <Switch
                      checked={flag.enabled}
                      onCheckedChange={() => toggleFeatureFlag(flag.name)}
                      disabled={updating !== null || (killSwitch?.enabled && killSwitch.affectedFeatures.includes(flag.name))}
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 text-sm">
                <div>
                  <div className="font-medium">Status</div>
                  <div className={flag.enabled ? 'text-green-600' : 'text-gray-600'}>
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div>
                  <div className="font-medium">Rollout</div>
                  <div>{flag.rolloutPercentage}%</div>
                </div>
                <div>
                  <div className="font-medium">Last Updated</div>
                  <div>{formatDate(flag.lastUpdated)}</div>
                </div>
              </div>
              
              {flag.serverOverride && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Server Override</AlertTitle>
                  <AlertDescription>
                    This flag is currently controlled by server settings and cannot be changed locally.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Server Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Configuration
          </CardTitle>
          <CardDescription>
            Server-side sync settings and policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="font-medium mb-2">Provider</div>
              <div className="text-sm text-muted-foreground">
                {syncStatus?.provider || 'Not configured'}
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">Region</div>
              <div className="text-sm text-muted-foreground">
                {syncStatus?.region || 'Local only'}
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <div className="font-medium mb-2">Kill Switch Status</div>
            <div className="flex items-center gap-2">
              {killSwitch?.enabled ? (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="text-red-600">Active</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600">Inactive</span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Descriptions</CardTitle>
          <CardDescription>
            Detailed explanations of sync capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Sync Uplink</h4>
              <p className="text-sm text-muted-foreground">
                Uploads local data to cloud servers for backup and cross-device access.
                Enables data recovery and synchronization across multiple devices.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Sync Downlink</h4>
              <p className="text-sm text-muted-foreground">
                Downloads data from cloud servers to keep local data in sync.
                Ensures you have the latest data across all your devices.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Sync Batching</h4>
              <p className="text-sm text-muted-foreground">
                Combines multiple sync operations into batches for improved efficiency
                and reduced network overhead.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Sync Observability</h4>
              <p className="text-sm text-muted-foreground">
                Collects metrics and provides insights into sync performance and reliability.
                Helps identify issues and optimize sync operations.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Conflict Resolution</h4>
              <p className="text-sm text-muted-foreground">
                Automatically resolves conflicts when data is modified on multiple devices.
                Uses timestamps and heuristics to determine the correct version.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}