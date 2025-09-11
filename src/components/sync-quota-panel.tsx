'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Database, 
  Activity, 
  Zap, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart3,
  Settings,
  RefreshCw,
  Trash2,
  Cloud,
  Wifi,
  WifiOff,
  Timer,
  HardDrive,
  Upload,
  Download
} from 'lucide-react';
import { useSyncQuotas, type SyncMetrics, type SyncQuotaConfig } from '@/lib/sync-quotas';

interface SyncQuotaPanelProps {
  onConfigChange?: (config: Partial<SyncQuotaConfig>) => void;
}

export function SyncQuotaPanel({ onConfigChange }: SyncQuotaPanelProps) {
  const { metrics, config, addEvent, forceFlush, clearQueue, updateConfig } = useSyncQuotas();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [flushing, setFlushing] = useState(false);
  const [editingConfig, setEditingConfig] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Update last update time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const handleForceFlush = async () => {
    setFlushing(true);
    try {
      await forceFlush();
    } finally {
      setFlushing(false);
    }
  };

  const generateTestEvent = async () => {
    const testEvent = {
      type: 'test_sync_event',
      data: {
        message: `Test event at ${new Date().toISOString()}`,
        random: Math.random()
      }
    };
    await addEvent(testEvent);
  };

  const getBackoffStatus = () => {
    if (metrics.currentBackoffLevel === 0) {
      return { status: 'normal', color: 'text-green-600', icon: CheckCircle };
    } else if (metrics.currentBackoffLevel <= 3) {
      return { status: 'retrying', color: 'text-yellow-600', icon: Timer };
    } else {
      return { status: 'backing-off', color: 'text-red-600', icon: XCircle };
    }
  };

  const backoffStatus = getBackoffStatus();
  const BackoffIcon = backoffStatus.icon;

  const getQuotaUsage = () => {
    const percentage = (metrics.dailyBytesUsed / config.dailyQuotaBytes) * 100;
    if (percentage >= 90) return { level: 'critical', color: 'red' };
    if (percentage >= 70) return { level: 'warning', color: 'yellow' };
    return { level: 'normal', color: 'green' };
  };

  const quotaUsage = getQuotaUsage();

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sync Quotas & Batching</h2>
          <p className="text-muted-foreground">
            Monitor and control sync performance and quotas
          </p>
        </div>
        <div className="flex items-center gap-2">
          {testMode && (
            <Button onClick={generateTestEvent} variant="outline" size="sm">
              <Upload className="mr-2 h-4 w-4" />
              Add Test Event
            </Button>
          )}
          <Button onClick={handleForceFlush} disabled={flushing} variant="outline" size="sm">
            {flushing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Cloud className="mr-2 h-4 w-4" />
            )}
            Force Flush
          </Button>
          <Button onClick={clearQueue} variant="outline" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Queue
          </Button>
          <Switch
            checked={testMode}
            onCheckedChange={setTestMode}
          />
          <span className="text-sm">Test Mode</span>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Queue Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {metrics.queuedCount > 0 ? (
                <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <div>
                <div className="text-2xl font-bold">{metrics.queuedCount}</div>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(metrics.queuedSizeBytes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Quota */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Quota</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {formatBytes(metrics.dailyBytesUsed)}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full bg-${quotaUsage.color}-600`}
                  style={{ 
                    width: `${Math.min(100, (metrics.dailyBytesUsed / config.dailyQuotaBytes) * 100)}%` 
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(config.dailyQuotaBytes)} total
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div>
                <div className="text-2xl font-bold">
                  {metrics.sentCount + metrics.failedCount > 0 
                    ? ((metrics.sentCount / (metrics.sentCount + metrics.failedCount)) * 100).toFixed(1) + '%'
                    : '100%'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.sentCount} sent, {metrics.failedCount} failed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Backoff Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backoff</CardTitle>
            <BackoffIcon className={`h-4 w-4 ${backoffStatus.color}`} />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold capitalize">
                {backoffStatus.status}
              </div>
              {metrics.currentBackoffLevel > 0 && (
                <p className="text-xs text-muted-foreground">
                  Level {metrics.currentBackoffLevel}: {metrics.backoffReason}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Real-time sync performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-sm font-medium">Avg Batch Size</div>
              <div className="text-lg">{metrics.avgBatchSize.toFixed(1)} events</div>
            </div>
            <div>
              <div className="text-sm font-medium">Avg Latency</div>
              <div className="text-lg">{formatDuration(metrics.avgBatchLatency)}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Duplicates</div>
              <div className="text-lg">{metrics.duplicateCount}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Last Success</div>
              <div className="text-lg">
                {metrics.lastSuccessTimestamp 
                  ? formatDuration(Date.now() - metrics.lastSuccessTimestamp) + ' ago'
                  : 'Never'
                }
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>
                Sync quotas and batching policies
              </CardDescription>
            </div>
            <Button
              onClick={() => setEditingConfig(!editingConfig)}
              variant="outline"
              size="sm"
            >
              {editingConfig ? 'Done' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Batch Limits */}
            <div className="space-y-4">
              <h4 className="font-medium">Batch Limits</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Batch Size</span>
                  <span className="text-sm font-medium">
                    {formatBytes(config.maxBatchSizeBytes)} / {config.maxBatchSizeEvents} events
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Batch Age Limit</span>
                  <span className="text-sm font-medium">
                    {formatDuration(config.maxBatchAgeMs)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Queue Retention</span>
                  <span className="text-sm font-medium">
                    {formatDuration(config.maxQueueAgeMs)}
                  </span>
                </div>
              </div>
            </div>

            {/* Quota Limits */}
            <div className="space-y-4">
              <h4 className="font-medium">Quota Limits</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Daily Quota</span>
                  <span className="text-sm font-medium">
                    {formatBytes(config.dailyQuotaBytes)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Max Queue Size</span>
                  <span className="text-sm font-medium">
                    {config.maxQueueSizeEvents.toLocaleString()} events
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backoff Max</span>
                  <span className="text-sm font-medium">
                    {formatDuration(config.backoffMaxMs)}
                  </span>
                </div>
              </div>
            </div>

            {/* Behavior Settings */}
            <div className="space-y-4">
              <h4 className="font-medium">Behavior</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Flush on Background</span>
                  <Switch
                    checked={config.flushOnBackground}
                    onCheckedChange={(checked) => {
                      updateConfig({ flushOnBackground: checked });
                      onConfigChange?.({ flushOnBackground: checked });
                    }}
                    disabled={!editingConfig}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Flush on Idle</span>
                  <Switch
                    checked={config.flushOnIdle}
                    onCheckedChange={(checked) => {
                      updateConfig({ flushOnIdle: checked });
                      onConfigChange?.({ flushOnIdle: checked });
                    }}
                    disabled={!editingConfig}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Idle Threshold</span>
                  <span className="text-sm font-medium">
                    {formatDuration(config.idleThresholdMs)}
                  </span>
                </div>
              </div>
            </div>

            {/* Backoff Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium">Backoff</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Initial Delay</span>
                  <span className="text-sm font-medium">
                    {formatDuration(config.backoffInitialMs)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Multiplier</span>
                  <span className="text-sm font-medium">
                    {config.backoffMultiplier}x
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Jitter</span>
                  <span className="text-sm font-medium">
                    ±{formatDuration(config.backoffJitterMs)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Server Guardrails */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Server Guardrails
          </CardTitle>
          <CardDescription>
            Server-side limits and policies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2">Rate Limits</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Max Write QPS: 50 (soft) / 100 (hard)</div>
                <div>Rate Limit Window: 1 minute</div>
                <div>Max Requests/Window: 3,000</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Payload Limits</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Max Payload Size: 256 KB</div>
                <div>Max Events/Request: 512</div>
                <div>Idempotency Window: 24 hours</div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Storage Limits</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Max Storage/Tenant: 1 GB</div>
                <div>Max Growth/Day: 100 MB</div>
                <div>Max Duplicate Rate: 0.5%</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Alert Conditions
          </CardTitle>
          <CardDescription>
            Monitoring thresholds and alert triggers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">Performance Alerts</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Success Rate &lt; 98%</span>
                  <Badge variant="outline">15-min window</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Duplicate Rate &gt; 0.5%</span>
                  <Badge variant="outline">Real-time</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>p95 Latency &gt; 800ms</span>
                  <Badge variant="outline">30-min sustained</Badge>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">Storage Alerts</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Storage Growth &gt; 2x forecast</span>
                  <Badge variant="outline">24-hour window</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Queue Age &gt; 7 days</span>
                  <Badge variant="outline">Event cleanup</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Daily Quota &gt; 90%</span>
                  <Badge variant="outline">Usage warning</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Queue Details
          </CardTitle>
          <CardDescription>
            Current queue state and pending operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Queue Health</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Total Events</span>
                    <span>{metrics.queuedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Queue Size</span>
                    <span>{formatBytes(metrics.queuedSizeBytes)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Daily Usage</span>
                    <span>{formatBytes(metrics.dailyBytesUsed)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Daily Events</span>
                    <span>{metrics.dailyEventsSent}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Flush Schedule</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Next Flush</span>
                    <span>
                      {metrics.queuedCount > 0 
                        ? 'Based on batch age or size'
                        : 'No pending events'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Background Flush</span>
                    <span>{config.flushOnBackground ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Idle Flush</span>
                    <span>{config.flushOnIdle ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Idle Threshold</span>
                    <span>{formatDuration(config.idleThresholdMs)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {metrics.queuedCount > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Events Pending Sync</AlertTitle>
                <AlertDescription>
                  {metrics.queuedCount} events ({formatBytes(metrics.queuedSizeBytes)}) are queued for synchronization.
                  {metrics.currentBackoffLevel > 0 && ` Currently in backoff due to: ${metrics.backoffReason}`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-sm text-muted-foreground text-center">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}