"use strict";
// Monitoring Dashboard for Internal Cohort Rollout
// Real-time monitoring of Slice 1: Storage & Analytics
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringDashboard = void 0;
class MonitoringDashboard {
    constructor() {
        this.metrics = [];
        this.alerts = [];
        this.maxMetricsHistory = 1000;
        this.thresholds = this.getDefaultThresholds();
        this.initializeMonitoring();
    }
    getDefaultThresholds() {
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
    initializeMonitoring() {
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
    async collectMetrics() {
        try {
            const metrics = {
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
        }
        catch (error) {
            console.error('Failed to collect metrics:', error);
        }
    }
    async collectMigrationMetrics() {
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
    async collectPerformanceMetrics() {
        const performance = await navigator.storage.estimate();
        const memory = performance.memory;
        return {
            coldStart: await this.measureColdStartTime(),
            ttr: await this.measureTTR(),
            compaction: await this.getCompactionDuration(),
            memoryUsage: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
            storageUsage: performance.usage / (1024 * 1024),
            storageQuota: performance.quota / (1024 * 1024)
        };
    }
    async collectErrorMetrics() {
        return {
            rollup: Math.floor(Math.random() * 3), // Simulated
            migration: Math.floor(Math.random() * 1), // Simulated
            storage: Math.floor(Math.random() * 2), // Simulated
            total: Math.floor(Math.random() * 5) // Simulated
        };
    }
    async collectStorageMetrics() {
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
    async collectUserExperienceMetrics() {
        return {
            regressionRate: Math.random() * 0.03, // Simulated < 3%
            satisfaction: 4.2 + Math.random() * 0.6, // Simulated 4.2-4.8
            reportedIssues: Math.floor(Math.random() * 2) // Simulated
        };
    }
    async checkAlerts() {
        if (this.metrics.length === 0)
            return;
        const latestMetrics = this.metrics[this.metrics.length - 1];
        const newAlerts = [];
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
    isAlertStillActive(alert) {
        // Logic to check if alert condition still exists
        return false; // Simplified for now
    }
    notifyAlert(alert, severity) {
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
    showAlertInUI(alert, severity) {
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
    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
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
    setupErrorTracking() {
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
    trackError(type, message) {
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
    calculateStorageGrowthRate(currentUsage) {
        if (this.metrics.length < 2)
            return 0;
        const previousMetrics = this.metrics[this.metrics.length - 2];
        const timeDiff = Date.now() - previousMetrics.timestamp;
        const usageDiff = currentUsage - previousMetrics.storage.used;
        // Calculate growth rate per day
        return (usageDiff / timeDiff) * (24 * 60 * 60 * 1000);
    }
    cleanupOldMetrics() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        this.metrics = this.metrics.filter(m => m.timestamp > oneWeekAgo);
    }
    // Public API methods
    getCurrentMetrics() {
        return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
    }
    getMetricsHistory(hours = 24) {
        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        return this.metrics.filter(m => m.timestamp > cutoff);
    }
    getAlerts() {
        return [...this.alerts];
    }
    clearAlerts() {
        this.alerts = [];
    }
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
    }
    generateReport() {
        const current = this.getCurrentMetrics();
        if (!current)
            return 'No metrics available';
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
    async getTotalEvents() {
        // Simulate getting total events
        return Math.floor(Math.random() * 1000) + 100;
    }
    async getMigratedEvents() {
        // Simulate getting migrated events
        return Math.floor(Math.random() * 1000) + 90;
    }
    async measureColdStartTime() {
        // Simulated cold start measurement
        return 800 + Math.random() * 400; // 800-1200ms
    }
    async measureTTR() {
        // Simulated TTR measurement
        return 600 + Math.random() * 300; // 600-900ms
    }
    async getCompactionDuration() {
        // Simulated compaction duration
        return 100 + Math.random() * 200; // 100-300ms
    }
    async getBackupCount() {
        // Simulated backup count
        return Math.floor(Math.random() * 5) + 1;
    }
    async sendToExternalMonitoring(metrics) {
        // Send metrics to external monitoring service
        if (navigator.sendBeacon) {
            const data = new FormData();
            data.append('metrics', JSON.stringify(metrics));
            data.append('timestamp', Date.now().toString());
            navigator.sendBeacon('/api/metrics', data);
        }
    }
}
exports.MonitoringDashboard = MonitoringDashboard;
