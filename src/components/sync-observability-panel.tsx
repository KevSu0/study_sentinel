'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff,
  BarChart3,
  Clock,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Bell,
  BellOff,
  Settings,
  Eye,
  Download,
  Upload,
  Server,
  HardDrive,
  Network
} from 'lucide-react';
import { useSyncObservability, type SyncAlert, type SyncMetrics } from '@/lib/sync-observability';

interface SyncObservabilityPanelProps {
  onConfigChange?: (config: any) => void;
}

export function SyncObservabilityPanel({ onConfigChange }: SyncObservabilityPanelProps) {
  const { metrics, alerts, summary, config, updateConfig } = useSyncObservability();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Update last update time
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

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

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getAlertBadgeColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-600';
      case 'error': return 'bg-red-600';
      case 'warning': return 'bg-yellow-600';
      default: return 'bg-green-600';
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (current < previous) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <BarChart3 className="h-4 w-4 text-gray-600" />;
  };

  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const recentAlerts = alerts.slice(-5);
  const displayAlerts = showAllAlerts ? alerts : recentAlerts;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sync Observability</h2>
          <p className="text-muted-foreground">
            Monitor sync performance, health, and alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm">
            {refreshing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          {activeAlerts.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {activeAlerts.length} Active Alerts
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div>
                <div className={`text-2xl font-bold ${summary.successRate >= 0.98 ? 'text-green-600' : summary.successRate >= 0.95 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {formatPercentage(summary.successRate)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.eventsSent} sent, {metrics.eventsFailed} failed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Average Latency */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(summary.averageLatency)}
            </div>
            <p className="text-xs text-muted-foreground">
              P95: {metrics.latencies.length > 0 ? formatDuration(metrics.latencies[Math.floor(metrics.latencies.length * 0.95)]) : 'N/A'}
            </p>
          </CardContent>
        </Card>

        {/* Duplicate Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicate Rate</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.duplicateRate <= 0.005 ? 'text-green-600' : 'text-yellow-600'}`}>
              {formatPercentage(summary.duplicateRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.duplicatesDetected} duplicates
            </p>
          </CardContent>
        </Card>

        {/* Quota Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quota Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.quotaUsage <= 0.7 ? 'text-green-600' : summary.quotaUsage <= 0.9 ? 'text-yellow-600' : 'text-red-600'}`}>
              {formatPercentage(summary.quotaUsage)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatBytes(metrics.dailyBytesUsed)} used
            </p>
          </CardContent>
        </Card>

        {/* Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            {navigator.onLine ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.uptime >= 0.95 ? 'text-green-600' : 'text-yellow-600'}`}>
              {formatPercentage(summary.uptime)}
            </div>
            <p className="text-xs text-muted-foreground">
              {navigator.onLine ? 'Online' : 'Offline'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAlerts.slice(0, 3).map((alert) => (
                <Alert key={alert.id} className={alert.type === 'critical' ? 'border-red-500' : 'border-yellow-500'}>
                  {getAlertIcon(alert.type)}
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.title}</span>
                    <Badge className={getAlertBadgeColor(alert.type)}>
                      {alert.type.toUpperCase()}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription>{alert.message}</AlertDescription>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.timestamp).toLocaleString()}
                  </div>
                </Alert>
              ))}
              {activeAlerts.length > 3 && (
                <Button
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  variant="outline"
                  size="sm"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {showAllAlerts ? 'Show Less' : `Show ${activeAlerts.length - 3} More`}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Detailed performance and usage statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Event Metrics */}
            <div className="space-y-4">
              <h4 className="font-medium">Event Processing</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Events Sent</span>
                  <span className="text-sm font-medium">{metrics.eventsSent.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Events Failed</span>
                  <span className="text-sm font-medium text-red-600">{metrics.eventsFailed.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Events Queued</span>
                  <span className="text-sm font-medium">{metrics.eventsQueued.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Duplicates</span>
                  <span className="text-sm font-medium text-yellow-600">{metrics.duplicatesDetected.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Latency Metrics */}
            <div className="space-y-4">
              <h4 className="font-medium">Latency Distribution</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Average</span>
                  <span className="text-sm font-medium">{formatDuration(summary.averageLatency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">P50</span>
                  <span className="text-sm font-medium">
                    {metrics.latencies.length > 0 ? formatDuration(metrics.latencies[Math.floor(metrics.latencies.length * 0.5)]) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">P95</span>
                  <span className="text-sm font-medium">
                    {metrics.latencies.length > 0 ? formatDuration(metrics.latencies[Math.floor(metrics.latencies.length * 0.95)]) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">P99</span>
                  <span className="text-sm font-medium">
                    {metrics.latencies.length > 0 ? formatDuration(metrics.latencies[Math.floor(metrics.latencies.length * 0.99)]) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Network Metrics */}
            <div className="space-y-4">
              <h4 className="font-medium">Network Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Time Online</span>
                  <span className="text-sm font-medium">{formatDuration(metrics.totalTimeOnline)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Time Offline</span>
                  <span className="text-sm font-medium">{formatDuration(metrics.totalTimeOffline)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Current Status</span>
                  <span className="text-sm font-medium">{navigator.onLine ? 'Online' : 'Offline'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backoff Level</span>
                  <span className="text-sm font-medium">{metrics.currentBackoffLevel}</span>
                </div>
              </div>
            </div>

            {/* Quota Metrics */}
            <div className="space-y-4">
              <h4 className="font-medium">Quota Usage</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Daily Bytes Used</span>
                  <span className="text-sm font-medium">{formatBytes(metrics.dailyBytesUsed)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Daily Events Sent</span>
                  <span className="text-sm font-medium">{metrics.dailyEventsSent.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Queue Size</span>
                  <span className="text-sm font-medium">{metrics.currentQueueSize.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quota Reset</span>
                  <span className="text-sm font-medium">
                    {new Date(metrics.quotaResetTimestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Batch Statistics
          </CardTitle>
          <CardDescription>
            Batch processing efficiency and sizing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-medium mb-2">Batch Sizes</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Total Batches</span>
                  <span>{metrics.batchSizes.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Average Size</span>
                  <span>
                    {metrics.batchSizes.length > 0 
                      ? (metrics.batchSizes.reduce((a, b) => a + b, 0) / metrics.batchSizes.length).toFixed(0)
                      : '0'
                    } events
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Largest Batch</span>
                  <span>
                    {metrics.batchSizes.length > 0 
                      ? Math.max(...metrics.batchSizes)
                      : 0
                    } events
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Recent Activity</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Last Success</span>
                  <span>
                    {metrics.lastSuccessTimestamp 
                      ? formatDuration(Date.now() - metrics.lastSuccessTimestamp) + ' ago'
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Failure</span>
                  <span>
                    {metrics.lastFailureTimestamp 
                      ? formatDuration(Date.now() - metrics.lastFailureTimestamp) + ' ago'
                      : 'Never'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Session Duration</span>
                  <span>{formatDuration(Date.now() - metrics.quotaResetTimestamp)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Alert Thresholds</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Success Rate ≥ {formatPercentage(config.alertThresholds.successRateMin)}</div>
                <div>Duplicate Rate ≤ {formatPercentage(config.alertThresholds.duplicateRateMax)}</div>
                <div>P95 Latency ≤ {config.alertThresholds.latencyP95Max}ms</div>
                <div>Quota Usage ≤ {formatPercentage(config.alertThresholds.dailyQuotaUsageMax)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alert History
          </CardTitle>
          <CardDescription>
            Recent alerts and their resolution status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No alerts recorded</p>
              <p className="text-sm">System is operating normally</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${
                    alert.resolved 
                      ? 'bg-gray-50 border-gray-200' 
                      : alert.type === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getAlertIcon(alert.type)}
                      <span className="font-medium">{alert.title}</span>
                      <Badge className={getAlertBadgeColor(alert.type)} variant="outline">
                        {alert.type.toUpperCase()}
                      </Badge>
                      {alert.resolved && (
                        <Badge className="bg-green-600">RESOLVED</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{alert.message}</p>
                  {alert.resolved && alert.resolvedAt && (
                    <div className="text-xs text-green-600">
                      Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
              
              {alerts.length > 5 && !showAllAlerts && (
                <div className="text-center">
                  <Button
                    onClick={() => setShowAllAlerts(!showAllAlerts)}
                    variant="outline"
                    size="sm"
                  >
                    Show All Alerts ({alerts.length} total)
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Server Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Server Integration
          </CardTitle>
          <CardDescription>
            Metrics collection and server communication status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">Collection Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Metrics Collection</span>
                  <span className={config.enableMetrics ? 'text-green-600' : 'text-red-600'}>
                    {config.enableMetrics ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sample Rate</span>
                  <span>{formatPercentage(config.metricsSampleRate)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Flush Interval</span>
                  <span>{config.metricsFlushInterval / 1000}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Error Tracking</span>
                  <span className={config.enableErrorTracking ? 'text-green-600' : 'text-red-600'}>
                    {config.enableErrorTracking ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">Server Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Endpoint</span>
                  <span className="font-mono text-xs">{config.serverEndpoint}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>API Key</span>
                  <span>{config.apiKey ? 'Configured' : 'Not configured'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Metrics Version</span>
                  <span>1.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>User Agent</span>
                  <span className="text-xs truncate">{navigator.userAgent}</span>
                </div>
              </div>
            </div>
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