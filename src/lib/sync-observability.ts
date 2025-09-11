/**
 * Sync Observability and Monitoring System
 * Implements client-side metrics collection and server monitoring integration
 */

export interface SyncObservabilityConfig {
  // Metrics collection
  enableMetrics: boolean;
  metricsSampleRate: number;        // 0.1 = 10% sampling
  metricsFlushInterval: number;     // 30 seconds
  
  // Performance tracking
  enablePerformanceTracing: boolean;
  traceSampleRate: number;          // 0.01 = 1% sampling
  
  // Error tracking
  enableErrorTracking: boolean;
  errorSampleRate: number;          // 1.0 = all errors
  
  // Server integration
  serverEndpoint: string;
  apiKey?: string;
  
  // Alert thresholds
  alertThresholds: {
    successRateMin: number;         // 0.98 = 98%
    duplicateRateMax: number;       // 0.005 = 0.5%
    latencyP95Max: number;           // 800ms
    queueAgeMax: number;            // 7 days
    dailyQuotaUsageMax: number;     // 0.9 = 90%
  };
}

export interface SyncMetrics {
  // Counter metrics
  eventsSent: number;
  eventsFailed: number;
  eventsQueued: number;
  duplicatesDetected: number;
  
  // Gauge metrics
  currentQueueSize: number;
  currentBackoffLevel: number;
  lastSuccessTimestamp: number | null;
  lastFailureTimestamp: number | null;
  
  // Histogram metrics
  batchSizes: number[];
  latencies: number[];
  errorRates: number[];
  
  // Timing metrics
  totalTimeOnline: number;
  totalTimeOffline: number;
  lastOnlineTransition: number | null;
  lastOfflineTransition: number | null;
  
  // Quota metrics
  dailyBytesUsed: number;
  dailyEventsSent: number;
  quotaResetTimestamp: number;
}

export interface SyncAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  category: 'performance' | 'quota' | 'connectivity' | 'error';
  title: string;
  message: string;
  timestamp: number;
  value: number;
  threshold: number;
  resolved: boolean;
  resolvedAt?: number;
}

export interface ServerMetrics {
  // Server response metrics
  responseTimes: number[];
  successRates: number[];
  errorRates: number[];
  
  // Server load metrics
  requestRates: number[];
  payloadSizes: number[];
  
  // Storage metrics
  storageUsage: number;
  storageGrowthRate: number;
  
  // Business metrics
  activeDevices: number;
  dailySyncEvents: number;
  dataRetentionDays: number;
}

export class SyncObservabilityManager {
  private config: SyncObservabilityConfig;
  private metrics: SyncMetrics;
  private alerts: SyncAlert[] = [];
  private metricsFlushTimer: number | null = null;
  private networkStatusTimer: number | null = null;
  private isOnline: boolean = navigator.onLine;
  private sessionStartTime: number = Date.now();

  constructor(config: Partial<SyncObservabilityConfig> = {}) {
    this.config = {
      enableMetrics: true,
      metricsSampleRate: 0.1,
      metricsFlushInterval: 30 * 1000,
      enablePerformanceTracing: true,
      traceSampleRate: 0.01,
      enableErrorTracking: true,
      errorSampleRate: 1.0,
      serverEndpoint: '/api/sync/metrics',
      alertThresholds: {
        successRateMin: 0.98,
        duplicateRateMax: 0.005,
        latencyP95Max: 800,
        queueAgeMax: 7 * 24 * 60 * 60 * 1000,
        dailyQuotaUsageMax: 0.9
      },
      ...config
    };

    this.metrics = this.initializeMetrics();
    this.setupEventListeners();
    this.startMetricsCollection();
  }

  private initializeMetrics(): SyncMetrics {
    const now = Date.now();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return {
      eventsSent: 0,
      eventsFailed: 0,
      eventsQueued: 0,
      duplicatesDetected: 0,
      currentQueueSize: 0,
      currentBackoffLevel: 0,
      lastSuccessTimestamp: null,
      lastFailureTimestamp: null,
      batchSizes: [],
      latencies: [],
      errorRates: [],
      totalTimeOnline: 0,
      totalTimeOffline: 0,
      lastOnlineTransition: this.isOnline ? now : null,
      lastOfflineTransition: this.isOnline ? null : now,
      dailyBytesUsed: 0,
      dailyEventsSent: 0,
      quotaResetTimestamp: startOfDay.getTime()
    };
  }

  private setupEventListeners(): void {
    // Network status monitoring
    window.addEventListener('online', () => {
      const now = Date.now();
      if (this.metrics.lastOfflineTransition) {
        this.metrics.totalTimeOffline += now - this.metrics.lastOfflineTransition;
      }
      this.metrics.lastOnlineTransition = now;
      this.isOnline = true;
      this.recordMetric('network', 'online', 1);
    });

    window.addEventListener('offline', () => {
      const now = Date.now();
      if (this.metrics.lastOnlineTransition) {
        this.metrics.totalTimeOnline += now - this.metrics.lastOnlineTransition;
      }
      this.metrics.lastOfflineTransition = now;
      this.isOnline = false;
      this.recordMetric('network', 'offline', 1);
    });

    // Page visibility for background/foreground detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.recordMetric('app', 'backgrounded', 1);
      } else {
        this.recordMetric('app', 'foregrounded', 1);
      }
    });

    // Error handling
    window.addEventListener('error', (event) => {
      this.recordError('uncaught', event.error?.message || 'Unknown error');
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('unhandled_rejection', event.reason?.message || 'Unknown promise rejection');
    });
  }

  private startMetricsCollection(): void {
    if (!this.config.enableMetrics) return;

    // Periodic metrics flush
    this.metricsFlushTimer = window.setInterval(() => {
      this.flushMetrics();
    }, this.config.metricsFlushInterval);

    // Network status monitoring
    this.networkStatusTimer = window.setInterval(() => {
      this.updateNetworkMetrics();
    }, 5000);
  }

  private updateNetworkMetrics(): void {
    const connection = (navigator as any).connection;
    if (connection) {
      this.recordMetric('network', 'effective_type', connection.effectiveType);
      this.recordMetric('network', 'downlink', connection.downlink);
      this.recordMetric('network', 'rtt', connection.rtt);
    }
  }

  // Public API for recording metrics
  recordEventSent(batchSize: number, latency: number): void {
    if (Math.random() > this.config.metricsSampleRate) return;

    this.metrics.eventsSent++;
    this.metrics.lastSuccessTimestamp = Date.now();
    this.metrics.batchSizes.push(batchSize);
    this.metrics.latencies.push(latency);
    
    // Keep only last 1000 measurements
    if (this.metrics.batchSizes.length > 1000) {
      this.metrics.batchSizes = this.metrics.batchSizes.slice(-1000);
      this.metrics.latencies = this.metrics.latencies.slice(-1000);
    }

    this.checkAlerts();
  }

  recordEventFailed(error: string): void {
    if (Math.random() > this.config.metricsSampleRate) return;

    this.metrics.eventsFailed++;
    this.metrics.lastFailureTimestamp = Date.now();
    
    // Update error rate (rolling window of last 100 attempts)
    const totalAttempts = this.metrics.eventsSent + this.metrics.eventsFailed;
    const errorRate = this.metrics.eventsFailed / totalAttempts;
    this.metrics.errorRates.push(errorRate);
    
    if (this.metrics.errorRates.length > 100) {
      this.metrics.errorRates = this.metrics.errorRates.slice(-100);
    }

    if (this.config.enableErrorTracking && Math.random() <= this.config.errorSampleRate) {
      this.recordError('sync_failure', error);
    }

    this.checkAlerts();
  }

  recordEventQueued(size: number): void {
    if (Math.random() > this.config.metricsSampleRate) return;

    this.metrics.eventsQueued++;
    this.metrics.currentQueueSize = size;
    this.checkAlerts();
  }

  recordDuplicateDetected(): void {
    if (Math.random() > this.config.metricsSampleRate) return;

    this.metrics.duplicatesDetected++;
    this.checkAlerts();
  }

  recordBackoffChange(level: number, reason?: string): void {
    this.metrics.currentBackoffLevel = level;
    this.recordMetric('sync', 'backoff_level', level);
    if (reason) {
      this.recordMetric('sync', 'backoff_reason', reason);
    }
  }

  recordQuotaUpdate(bytesUsed: number, eventsSent: number): void {
    this.metrics.dailyBytesUsed = bytesUsed;
    this.metrics.dailyEventsSent = eventsSent;
    this.checkAlerts();
  }

  private recordMetric(category: string, name: string, value: number | string): void {
    if (!this.config.enableMetrics) return;

    // In a real implementation, this would send to a metrics service
    console.log(`[Metric] ${category}.${name}: ${value}`);
  }

  private recordError(type: string, message: string): void {
    if (!this.config.enableErrorTracking) return;

    // In a real implementation, this would send to an error tracking service
    console.error(`[Error] ${type}: ${message}`);
  }

  private checkAlerts(): void {
    const now = Date.now();
    const alerts: SyncAlert[] = [];

    // Success rate alert
    const totalAttempts = this.metrics.eventsSent + this.metrics.eventsFailed;
    if (totalAttempts > 0) {
      const successRate = this.metrics.eventsSent / totalAttempts;
      if (successRate < this.config.alertThresholds.successRateMin) {
        alerts.push({
          id: `success_rate_${now}`,
          type: 'error',
          category: 'performance',
          title: 'Low Success Rate',
          message: `Sync success rate is ${(successRate * 100).toFixed(1)}%, below threshold of ${(this.config.alertThresholds.successRateMin * 100).toFixed(1)}%`,
          timestamp: now,
          value: successRate,
          threshold: this.config.alertThresholds.successRateMin,
          resolved: false
        });
      }
    }

    // Duplicate rate alert
    const totalEvents = this.metrics.eventsSent + this.metrics.duplicatesDetected;
    if (totalEvents > 0) {
      const duplicateRate = this.metrics.duplicatesDetected / totalEvents;
      if (duplicateRate > this.config.alertThresholds.duplicateRateMax) {
        alerts.push({
          id: `duplicate_rate_${now}`,
          type: 'warning',
          category: 'performance',
          title: 'High Duplicate Rate',
          message: `Duplicate rate is ${(duplicateRate * 100).toFixed(2)}%, above threshold of ${(this.config.alertThresholds.duplicateRateMax * 100).toFixed(2)}%`,
          timestamp: now,
          value: duplicateRate,
          threshold: this.config.alertThresholds.duplicateRateMax,
          resolved: false
        });
      }
    }

    // Latency alert
    if (this.metrics.latencies.length > 10) {
      const sortedLatencies = [...this.metrics.latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sortedLatencies.length * 0.95);
      const p95Latency = sortedLatencies[p95Index];
      
      if (p95Latency > this.config.alertThresholds.latencyP95Max) {
        alerts.push({
          id: `latency_p95_${now}`,
          type: 'warning',
          category: 'performance',
          title: 'High Latency',
          message: `P95 latency is ${p95Latency.toFixed(0)}ms, above threshold of ${this.config.alertThresholds.latencyP95Max}ms`,
          timestamp: now,
          value: p95Latency,
          threshold: this.config.alertThresholds.latencyP95Max,
          resolved: false
        });
      }
    }

    // Quota usage alert
    const dailyQuotaLimit = 5 * 1024 * 1024; // 5 MB
    const quotaUsage = this.metrics.dailyBytesUsed / dailyQuotaLimit;
    if (quotaUsage > this.config.alertThresholds.dailyQuotaUsageMax) {
      alerts.push({
        id: `quota_usage_${now}`,
        type: 'warning',
        category: 'quota',
        title: 'High Quota Usage',
        message: `Daily quota usage is ${(quotaUsage * 100).toFixed(1)}%, above threshold of ${(this.config.alertThresholds.dailyQuotaUsageMax * 100).toFixed(1)}%`,
        timestamp: now,
        value: quotaUsage,
        threshold: this.config.alertThresholds.dailyQuotaUsageMax,
        resolved: false
      });
    }

    // Check for resolved alerts
    this.alerts = this.alerts.filter(alert => {
      if (!alert.resolved) {
        const isResolved = this.isAlertResolved(alert);
        if (isResolved) {
          alert.resolved = true;
          alert.resolvedAt = now;
        }
      }
      return true;
    });

    // Add new alerts
    alerts.forEach(alert => {
      if (!this.alerts.some(existing => existing.id === alert.id)) {
        this.alerts.push(alert);
        this.notifyAlert(alert);
      }
    });
  }

  private isAlertResolved(alert: SyncAlert): boolean {
    switch (alert.category) {
      case 'performance':
        const totalAttempts = this.metrics.eventsSent + this.metrics.eventsFailed;
        if (totalAttempts === 0) return true;
        const successRate = this.metrics.eventsSent / totalAttempts;
        return successRate >= this.config.alertThresholds.successRateMin;
      
      case 'quota':
        const dailyQuotaLimit = 5 * 1024 * 1024;
        const quotaUsage = this.metrics.dailyBytesUsed / dailyQuotaLimit;
        return quotaUsage <= this.config.alertThresholds.dailyQuotaUsageMax;
      
      default:
        return false;
    }
  }

  private notifyAlert(alert: SyncAlert): void {
    console.warn(`[Alert] ${alert.type.toUpperCase()}: ${alert.title}`);
    console.warn(`[Alert] ${alert.message}`);
    
    // In a real implementation, this would send to notification service
    // webhook, Slack, email, etc.
  }

  private async flushMetrics(): Promise<void> {
    if (!this.config.enableMetrics) return;

    try {
      const metricsPayload = {
        timestamp: Date.now(),
        sessionDuration: Date.now() - this.sessionStartTime,
        metrics: this.metrics,
        alerts: this.alerts.filter(a => !a.resolved),
        userAgent: navigator.userAgent,
        online: navigator.onLine
      };

      const response = await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey || '',
          'X-Metrics-Version': '1.0'
        },
        body: JSON.stringify(metricsPayload)
      });

      if (!response.ok) {
        console.warn('Failed to flush metrics:', await response.text());
      }
    } catch (error) {
      console.warn('Error flushing metrics:', error);
    }
  }

  // Public API
  getMetrics(): SyncMetrics {
    return { ...this.metrics };
  }

  getAlerts(): SyncAlert[] {
    return [...this.alerts];
  }

  getConfig(): SyncObservabilityConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<SyncObservabilityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getDashboardData(): {
    metrics: SyncMetrics;
    alerts: SyncAlert[];
    summary: {
      successRate: number;
      averageLatency: number;
      duplicateRate: number;
      quotaUsage: number;
      uptime: number;
    };
  } {
    const totalAttempts = this.metrics.eventsSent + this.metrics.eventsFailed;
    const successRate = totalAttempts > 0 ? this.metrics.eventsSent / totalAttempts : 1;
    const averageLatency = this.metrics.latencies.length > 0 
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length 
      : 0;
    const totalEvents = this.metrics.eventsSent + this.metrics.duplicatesDetected;
    const duplicateRate = totalEvents > 0 ? this.metrics.duplicatesDetected / totalEvents : 0;
    const dailyQuotaLimit = 5 * 1024 * 1024;
    const quotaUsage = this.metrics.dailyBytesUsed / dailyQuotaLimit;
    const totalSessionTime = this.metrics.totalTimeOnline + this.metrics.totalTimeOffline;
    const uptime = totalSessionTime > 0 ? this.metrics.totalTimeOnline / totalSessionTime : 1;

    return {
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        successRate,
        averageLatency,
        duplicateRate,
        quotaUsage,
        uptime
      }
    };
  }

  destroy(): void {
    if (this.metricsFlushTimer) {
      clearInterval(this.metricsFlushTimer);
    }
    if (this.networkStatusTimer) {
      clearInterval(this.networkStatusTimer);
    }
    
    // Final metrics flush
    this.flushMetrics();
  }
}

// React hook for sync observability
export function useSyncObservability() {
  const [manager] = useState(() => new SyncObservabilityManager());
  const [dashboardData, setDashboardData] = useState(() => manager.getDashboardData());

  useEffect(() => {
    const interval = setInterval(() => {
      setDashboardData(manager.getDashboardData());
    }, 5000);

    return () => {
      clearInterval(interval);
      manager.destroy();
    };
  }, [manager]);

  return {
    metrics: dashboardData.metrics,
    alerts: dashboardData.alerts,
    summary: dashboardData.summary,
    config: manager.getConfig(),
    updateConfig: (newConfig: Partial<SyncObservabilityConfig>) => manager.updateConfig(newConfig),
    recordEventSent: (batchSize: number, latency: number) => manager.recordEventSent(batchSize, latency),
    recordEventFailed: (error: string) => manager.recordEventFailed(error),
    recordEventQueued: (size: number) => manager.recordEventQueued(size),
    recordDuplicateDetected: () => manager.recordDuplicateDetected(),
    recordBackoffChange: (level: number, reason?: string) => manager.recordBackoffChange(level, reason),
    recordQuotaUpdate: (bytesUsed: number, eventsSent: number) => manager.recordQuotaUpdate(bytesUsed, eventsSent)
  };
}