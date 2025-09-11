'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Cloud, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Download, 
  Upload, 
  Trash2, 
  Settings, 
  Shield, 
  Bell,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  Database,
  BarChart3,
  Lock,
  Unlock
} from 'lucide-react';
import { getSyncEngine, SyncStatus } from '@/lib/sync-engine';
import { initializeNotifications, getNotificationManager } from '@/lib/notifications';
import { initializeE2EEManager, getE2EEManager } from '@/lib/e2ee';
import { diagnosticsManager, CacheManager } from '@/lib/diagnostics';
import { toast } from 'react-hot-toast';

export default function SyncAndNotificationsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<any>(null);
  const [e2eeInfo, setE2eeInfo] = useState<any>(null);
  const [isE2eeUnlocked, setIsE2eeUnlocked] = useState(false);
  const [storageUsage, setStorageUsage] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load sync status
      const syncEngine = getSyncEngine();
      if (syncEngine) {
        const status = await syncEngine.getSyncStatus();
        setSyncStatus(status);
      }

      // Load notification settings
      const { settingsManager } = getNotificationManager();
      if (settingsManager) {
        const settings = await settingsManager.getSettings();
        setNotificationSettings(settings);
      }

      // Load E2EE info
      const e2eeManager = getE2EEManager();
      if (e2eeManager) {
        const info = await e2eeManager.getKeyInfo();
        setE2eeInfo(info);
        setIsE2eeUnlocked(e2eeManager.isKeyUnlocked());
      }

      // Load storage usage
      try {
        const usage = await diagnosticsManager.getStorageUsage();
        setStorageUsage(usage);
      } catch (error) {
        console.log('Storage usage not available');
      }

      // Load system health
      try {
        const health = await diagnosticsManager.getSystemHealth();
        setSystemHealth(health);
      } catch (error) {
        console.log('System health not available');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncToggle = async (enabled: boolean) => {
    try {
      // This would update the settings in the database
      toast.success(`Sync ${enabled ? 'enabled' : 'disabled'}`);
      loadData();
    } catch (error) {
      toast.error('Failed to update sync settings');
    }
  };

  const handleForceSync = async () => {
    const syncEngine = getSyncEngine();
    if (!syncEngine) return;

    setIsSyncing(true);
    try {
      const result = await syncEngine.forceSync();
      if (result.success) {
        toast.success('Sync completed successfully');
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
      loadData();
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleNotificationToggle = async (channel: string, enabled: boolean) => {
    try {
      const { settingsManager } = getNotificationManager();
      if (settingsManager) {
        if (enabled) {
          await settingsManager.enableChannel(channel as any);
        } else {
          await settingsManager.disableChannel(channel as any);
        }
        toast.success(`${channel} ${enabled ? 'enabled' : 'disabled'}`);
        loadData();
      }
    } catch (error) {
      toast.error('Failed to update notification settings');
    }
  };

  const handleClearFailedEvents = async () => {
    const syncEngine = getSyncEngine();
    if (!syncEngine) return;

    try {
      const cleared = await syncEngine.clearFailedEvents();
      toast.success(`Cleared ${cleared} failed events`);
      loadData();
    } catch (error) {
      toast.error('Failed to clear failed events');
    }
  };

  const handleExportData = async () => {
    const syncEngine = getSyncEngine();
    if (!syncEngine) return;

    try {
      const data = await syncEngine.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-sentinel-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  const handleClearCaches = async () => {
    try {
      const result = await CacheManager.clearPublicityCaches();
      if (result) {
        toast.success('Caches cleared successfully');
        loadData();
      } else {
        toast.error('Failed to clear caches');
      }
    } catch (error) {
      toast.error('Failed to clear caches');
    }
  };

  const handleE2eeUnlock = async () => {
    // This would open a modal for passphrase entry
    toast('E2EE unlock modal would open here');
  };

  const handleE2eeLock = () => {
    const e2eeManager = getE2EEManager();
    if (e2eeManager) {
      e2eeManager.lock();
      setIsE2eeUnlocked(false);
      toast.success('E2EE locked');
      loadData();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Sync & Privacy</h1>
        <p className="text-muted-foreground">
          Optional cloud sync for multi-device access and advanced privacy controls
        </p>
      </div>

      <Tabs defaultValue="sync" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Sync
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="diagnostics" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Cloud Sync
              </CardTitle>
              <CardDescription>
                Sync your study data across devices for seamless access anywhere
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label htmlFor="sync-toggle" className="text-sm font-medium">
                    Enable Cloud Sync
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {syncStatus?.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
                <Switch
                  id="sync-toggle"
                  checked={notificationSettings?.syncEnabled || false}
                  onCheckedChange={handleSyncToggle}
                />
              </div>

              {syncStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{syncStatus.pendingEvents}</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{syncStatus.failedEvents}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleDateString() : 'Never'}
                    </div>
                    <div className="text-xs text-muted-foreground">Last Sync</div>
                  </div>
                  <div className="text-center">
                    <Badge variant={syncStatus.isOnline ? 'default' : 'secondary'}>
                      {syncStatus.isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                      {syncStatus.isOnline ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleForceSync}
                  disabled={!syncStatus?.isOnline || isSyncing}
                  className="flex-1"
                >
                  {isSyncing ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Now
                </Button>
                
                {syncStatus?.failedEvents! > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleClearFailedEvents}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Failed
                  </Button>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Data
                </Button>
                <Button variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Push Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications for study reminders, streak protection, and session summaries
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Study Reminders</label>
                    <p className="text-xs text-muted-foreground">Get notified when it's time to study</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.channels?.studyReminders || false}
                    onCheckedChange={(enabled) => handleNotificationToggle('studyReminders', enabled)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Streak Protection</label>
                    <p className="text-xs text-muted-foreground">Protect your study streak</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.channels?.streakProtection || false}
                    onCheckedChange={(enabled) => handleNotificationToggle('streakProtection', enabled)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Session Summaries</label>
                    <p className="text-xs text-muted-foreground">Get summaries after study sessions</p>
                  </div>
                  <Switch
                    checked={notificationSettings?.channels?.sessionSummaries || false}
                    onCheckedChange={(enabled) => handleNotificationToggle('sessionSummaries', enabled)}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Quiet Hours</label>
                    <p className="text-xs text-muted-foreground">
                      {notificationSettings?.quietHours?.enabled 
                        ? `${notificationSettings.quietHours.start} - ${notificationSettings.quietHours.end}`
                        : 'Disabled'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={notificationSettings?.quietHours?.enabled || false}
                    onCheckedChange={(enabled) => {
                      // This would open quiet hours configuration
                      toast('Quiet hours configuration would open here');
                    }}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Button variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                End-to-End Encryption
              </CardTitle>
              <CardDescription>
                Protect your data with client-side encryption before syncing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {e2eeInfo?.hasKey ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <div className="text-sm text-muted-foreground">Key Status</div>
                      <div className="flex items-center gap-2">
                        {isE2eeUnlocked ? (
                          <><CheckCircle className="h-4 w-4 text-green-500" /> Unlocked</>
                        ) : (
                          <><AlertCircle className="h-4 w-4 text-yellow-500" /> Locked</>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Created</div>
                      <div>{new Date(e2eeInfo.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>

                  {isE2eeUnlocked ? (
                    <Button variant="outline" onClick={handleE2eeLock}>
                      <Lock className="mr-2 h-4 w-4" />
                      Lock Encryption
                    </Button>
                  ) : (
                    <Button onClick={handleE2eeUnlock}>
                      <Unlock className="mr-2 h-4 w-4" />
                      Unlock Encryption
                    </Button>
                  )}

                  {e2eeInfo.hasRecoveryPhrase && (
                    <div className="text-sm text-muted-foreground">
                      Recovery phrase available for backup
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">E2EE Not Set Up</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Enable end-to-end encryption to protect your data before syncing
                  </p>
                  <Button>
                    <Shield className="mr-2 h-4 w-4" />
                    Set Up Encryption
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Storage Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {storageUsage ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Usage</span>
                        <span>{(storageUsage.usagePercent).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(storageUsage.usagePercent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Events</div>
                        <div className="font-medium">{storageUsage.breakdown.events.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rollups</div>
                        <div className="font-medium">{storageUsage.breakdown.rollups.toLocaleString()}</div>
                      </div>
                    </div>

                    <Button variant="outline" onClick={handleClearCaches} className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Clear Caches
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    Storage information not available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemHealth ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Status</span>
                      <Badge 
                        variant={systemHealth.overallStatus === 'healthy' ? 'default' : 'destructive'}
                      >
                        {systemHealth.overallStatus}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      {Object.entries(systemHealth.healthChecks).map(([key, check]) => (
                        <div key={key} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{key.replace('_', ' ')}</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor((check as any).status)}`} />
                            <span className="text-xs">{(check as any).status}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(systemHealth.timestamp).toLocaleString()}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    System health information not available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}