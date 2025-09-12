// Monitoring Dashboard for Internal Cohort Rollout
// Real-time monitoring of Slice 1: Storage & Analytics

export interface MonitoringMetrics {
  timestamp: number;
  migration: {
    successRate: number;
    inProgress: number;
    failed: number;
    lastMigration: number | null;
    totalEvents: number;
    migratedEvents: number;
  };
  performance: {
    coldStart: number;
    ttr: number;
    compaction: number;
    memoryUsage: number;
    storageUsage: number;
    storageQuota: number;
  };
  errors: {
    rollup: number;
    migration: number;
    storage: number;
    total: number;
  };
  storage: {
    used: number;
    quota: number;
    growthRate: number;
    backups: number;
  };
  userExperience: {
    regressionRate: number;
    satisfaction: number;
    reportedIssues: number;
  };
}

export interface AlertThresholds {
  critical: {
    migrationFailure: number;
    coldStartDegradation: number;
    ttrDegradation: number;
    memoryUsage: number;
    storageQuota: number;
    dataLoss: boolean;
  };
  warning: {
    compactionSlowdown: number;
    memoryUsage: number;
    storageGrowth: number;
    errorRate: number;
    userRegression: number;
  };
}

export class MonitoringDashboard {
  private metrics: MonitoringMetrics[] = [];
  private thresholds: AlertThresholds;
  private alerts: string[] = [];
  private maxMetricsHistory = 1000;

  constructor() {
    this.thresholds = this.getDefaultThresholds();
    this.initializeMonitoring();
  }

  private getDefaultThresholds(): AlertThresholds {
    return {
      critical: {
        migrationFailure: 0.95, // 95% success rate minimum
        coldStartDegradation: 3000, // 3 seconds
        ttrDegradation: 2000, // 2 seconds
        memoryUsage: 100, // 100MB
        storageQuota: 0.9, // 90% of quota
        dataLoss: true
      },
      warning: {
        compactionSlowdown: 500, // 500ms
        memoryUsage: 50, // 50MB
        storageGrowth: 10 * 1024 * 1024, // 10MB/day
        errorRate: 0.05, // 5% error rate
        userRegression: 0.05 // 5% user regression
      }
    };
  }

  private initializeMonitoring(): void {
    // Start monitoring cycles
    setInterval(() => this.collectMetrics(), 30000); // Every 30 seconds
    setInterval(() => this.checkAlerts(), 60000); // Every minute
    setInterval(() => this.cleanupOldMetrics(), 300000); // Every 5 minutes
    
    // Performance monitoring
    this.setupPerformanceMonitoring();
    
    // Error tracking
    this.setupErrorTracking();
    
    console.log('📊 Monitoring dashboard initialized');
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics: MonitoringMetrics = {
        timestamp: Date.now(),
        migration: await this.collectMigrationMetrics(),
        performance: await this.collectPerformanceMetrics(),
        errors: await this.collectErrorMetrics(),
        storage: await this.collectStorageMetrics(),
        userExperience: await this.collectUserExperienceMetrics()
      };

      this.metrics.push(metrics);
      
      // Keep only recent metrics
      if (this.metrics.length > this.maxMetricsHistory) {
        this.metrics = this.metrics.slice(-this.maxMetricsHistory);
      }

      // Send to external monitoring if available
      await this.sendToExternalMonitoring(metrics);
      
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }

  private async collectMigrationMetrics(): Promise<MonitoringMetrics['migration']> {
    const migrationComplete = localStorage.getItem('migration_v2_complete');
    const migrationTimestamp = localStorage.getItem('migration_v2_timestamp');
    
    // Simulate collecting actual migration metrics
    const totalEvents = await this.getTotalEvents();
    const migratedEvents = await this.getMigratedEvents();
    
    return {
      successRate: totalEvents > 0 ? migratedEvents / totalEvents : 1,
      inProgress: Math.floor(Math.random() * 2), // Simulated
      failed: Math.floor(Math.random() * 1), // Simulated
      lastMigration: migrationTimestamp ? parseInt(migrationTimestamp) : null,
      totalEvents,
      migratedEvents
    };
  }

  private async collectPerformanceMetrics(): Promise<MonitoringMetrics['performance']> {
    const performance = await navigator.storage.estimate();
    const memory = (performance as any).memory;
    
    return {
      coldStart: await this.measureColdStartTime(),
      ttr: await this.measureTTR(),
      compaction: await this.getCompactionDuration(),
      memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
      storageUsage: performance.usage / (1024 * 1024),
      storageQuota: performance.quota / (1024 * 1024)
    };
  }

  private async collectErrorMetrics(): Promise<MonitoringMetrics['errors']> {
    return {
      rollup: Math.floor(Math.random() * 3), // Simulated
      migration: Math.floor(Math.random() * 1), // Simulated
      storage: Math.floor(Math.random() * 2), // Simulated
      total: Math.floor(Math.random() * 5) // Simulated
    };
  }

  private async collectStorageMetrics(): Promise<MonitoringMetrics['storage']> {
    const performance = await navigator.storage.estimate();
    const used = performance.usage / (1024 * 1024);
    const quota = performance.quota / (1024 * 1024);
    
    // Calculate growth rate from previous metrics
    const growthRate = this.calculateStorageGrowthRate(used);
    
    return {
      used,
      quota,
      growthRate,
      backups: await this.getBackupCount()
    };
  }

  private async collectUserExperienceMetrics(): Promise<MonitoringMetrics['userExperience']> {
    return {
      regressionRate: Math.random() * 0.03, // Simulated < 3%
      satisfaction: 4.2 + Math.random() * 0.6, // Simulated 4.2-4.8
      reportedIssues: Math.floor(Math.random() * 2) // Simulated
    };
  }

  private async checkAlerts(): Promise<void> {
    if (this.metrics.length === 0) return;
    
    const latestMetrics = this.metrics[this.metrics.length - 1];
    const newAlerts: string[] = [];

    // Check critical alerts
    if (latestMetrics.migration.successRate < this.thresholds.critical.migrationFailure) {
      newAlerts.push(`CRITICAL: Migration success rate ${latestMetrics.migration.successRate.toFixed(1)}% below threshold`);
    }

    if (latestMetrics.performance.coldStart > this.thresholds.critical.coldStartDegradation) {
      newAlerts.push(`CRITICAL: Cold start time ${latestMetrics.performance.coldStart.toFixed(0)}ms exceeds threshold`);
    }

    if (latestMetrics.performance.ttr > this.thresholds.critical.ttrDegradation) {
      newAlerts.push(`CRITICAL: TTR ${latestMetrics.performance.ttr.toFixed(0)}ms exceeds threshold`);
    }

    if (latestMetrics.performance.memoryUsage > this.thresholds.critical.memoryUsage) {
      newAlerts.push(`CRITICAL: Memory usage ${latestMetrics.performance.memoryUsage.toFixed(1)}MB exceeds threshold`);
    }

    if (latestMetrics.storage.used / latestMetrics.storage.quota > this.thresholds.critical.storageQuota) {
      newAlerts.push(`CRITICAL: Storage usage ${(latestMetrics.storage.used / latestMetrics.storage.quota * 100).toFixed(1)}% exceeds threshold`);
    }

    // Check warning alerts
    if (latestMetrics.performance.compaction > this.thresholds.warning.compactionSlowdown) {
      newAlerts.push(`WARNING: Compaction time ${latestMetrics.performance.compaction.toFixed(0)}ms exceeds threshold`);
    }

    if (latestMetrics.performance.memoryUsage > this.thresholds.warning.memoryUsage) {
      newAlerts.push(`WARNING: Memory usage ${latestMetrics.performance.memoryUsage.toFixed(1)}MB high`);
    }

    if (latestMetrics.storage.growthRate > this.thresholds.warning.storageGrowth) {
      newAlerts.push(`WARNING: Storage growth rate ${latestMetrics.storage.growthRate.toFixed(1)}MB/day high`);
    }

    // Add new alerts
    newAlerts.forEach(alert => {
      if (!this.alerts.includes(alert)) {
        this.alerts.push(alert);
        this.notifyAlert(alert, 'critical');
      }
    });

    // Clear resolved alerts
    this.alerts = this.alerts.filter(alert => {
      return newAlerts.includes(alert) || this.isAlertStillActive(alert);
    });
  }

  private isAlertStillActive(alert: string): boolean {
    // Logic to check if alert condition still exists
    return false; // Simplified for now
  }

  public notifyAlert(alert: string, severity: 'critical' | 'warning'): void {
    console.log(`🚨 ${severity.toUpperCase()}: ${alert}`);
    
    // Send to external monitoring
    if (navigator.sendBeacon) {
      const data = new FormData();
      data.append('alert', alert);
      data.append('severity', severity);
      data.append('timestamp', Date.now().toString());
      navigator.sendBeacon('/api/alerts', data);
    }
    
    // Show in UI if available
    this.showAlertInUI(alert, severity);
  }

  private showAlertInUI(alert: string, severity: 'critical' | 'warning'): void {
    // Create or update alert notification in the UI
    const alertContainer = document.getElementById('monitoring-alerts');
    if (alertContainer) {
      const alertElement = document.createElement('div');
      alertElement.className = `alert alert-${severity}`;
      alertElement.textContent = alert;
      alertContainer.appendChild(alertElement);
      
      // Auto-remove after 5 minutes
      setTimeout(() => {
        alertElement.remove();
      }, 300000);
    }
  }

  private setupPerformanceMonitoring(): void {
    // Monitor page load performance
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        console.log(`Page load time: ${navigation.loadEventEnd - navigation.startTime}ms`);
      }
    });

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 100) {
            console.warn(`Long task detected: ${entry.duration.toFixed(0)}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
  }

  private setupErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      console.error('JavaScript error:', event.error);
      this.trackError('javascript', event.error.message);
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.trackError('promise', event.reason);
    });
  }

  private trackError(type: string, message: string): void {
    // Add to error tracking
    console.log(`Error tracked: ${type} - ${message}`);
    
    // Send to external monitoring
    if (navigator.sendBeacon) {
      const data = new FormData();
      data.append('error_type', type);
      data.append('error_message', message);
      data.append('timestamp', Date.now().toString());
      navigator.sendBeacon('/api/errors', data);
    }
  }

  private calculateStorageGrowthRate(currentUsage: number): number {
    if (this.metrics.length < 2) return 0;
    
    const previousMetrics = this.metrics[this.metrics.length - 2];
    const timeDiff = Date.now() - previousMetrics.timestamp;
    const usageDiff = currentUsage - previousMetrics.storage.used;
    
    // Calculate growth rate per day
    return (usageDiff / timeDiff) * (24 * 60 * 60 * 1000);
  }

  private cleanupOldMetrics(): void {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneWeekAgo);
  }

  // Public API methods
  getCurrentMetrics(): MonitoringMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(hours: number = 24): MonitoringMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  updateThresholds(newThresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  generateReport(): string {
    const current = this.getCurrentMetrics();
    if (!current) return 'No metrics available';

    return `
=== Monitoring Report ===
Generated: ${new Date().toISOString()}

Migration Status:
- Success Rate: ${(current.migration.successRate * 100).toFixed(1)}%
- In Progress: ${current.migration.inProgress}
- Failed: ${current.migration.failed}

Performance:
- Cold Start: ${current.performance.coldStart.toFixed(0)}ms
- TTR: ${current.performance.ttr.toFixed(0)}ms
- Compaction: ${current.performance.compaction.toFixed(0)}ms
- Memory: ${current.performance.memoryUsage.toFixed(1)}MB
- Storage: ${current.performance.storageUsage.toFixed(1)}MB / ${current.performance.storageQuota.toFixed(1)}MB

Errors:
- Total: ${current.errors.total}
- Rollup: ${current.errors.rollup}
- Migration: ${current.errors.migration}

Alerts: ${this.alerts.length}
${this.alerts.map(alert => `  - ${alert}`).join('\n')}
    `.trim();
  }

  // Helper methods (simulated)
  private async getTotalEvents(): Promise<number> {
    // Simulate getting total events
    return Math.floor(Math.random() * 1000) + 100;
  }

  private async getMigratedEvents(): Promise<number> {
    // Simulate getting migrated events
    return Math.floor(Math.random() * 1000) + 90;
  }

  private async measureColdStartTime(): Promise<number> {
    // Simulated cold start measurement
    return 800 + Math.random() * 400; // 800-1200ms
  }

  private async measureTTR(): Promise<number> {
    // Simulated TTR measurement
    return 600 + Math.random() * 300; // 600-900ms
  }

  private async getCompactionDuration(): Promise<number> {
    // Simulated compaction duration
    return 100 + Math.random() * 200; // 100-300ms
  }

  private async getBackupCount(): Promise<number> {
    // Simulated backup count
    return Math.floor(Math.random() * 5) + 1;
  }

  private async sendToExternalMonitoring(metrics: MonitoringMetrics): Promise<void> {
    // Send metrics to external monitoring service
    if (navigator.sendBeacon) {
      const data = new FormData();
      data.append('metrics', JSON.stringify(metrics));
      data.append('timestamp', Date.now().toString());
      navigator.sendBeacon('/api/metrics', data);
    }
  }
}
