// Internal Cohort Rollout Integration
// Integrates monitoring, canary management, and feature flags

import { CanaryManager, type CanaryDevice } from './canary-manager';
import { MonitoringDashboard, type MonitoringMetrics } from './monitoring-dashboard';
import { MigrationManager } from './migration-manager';
import { StorageManagerV2 } from './storage-v2';
import { HybridRollupManager } from './hybrid-rollups';

export interface RolloutIntegration {
  canaryManager: CanaryManager;
  monitoring: MonitoringDashboard;
  migrationManager: MigrationManager;
  storageManager: StorageManagerV2;
  rollupManager: HybridRollupManager;
}

export interface RolloutStatus {
  stage: 'disabled' | 'canary' | 'small-cohort' | 'full-internal';
  enabled: boolean;
  deviceId: string;
  isCanary: boolean;
  isInRollout: boolean;
  migrationComplete: boolean;
  lastCheck: number;
  metrics: MonitoringMetrics | null;
  alerts: string[];
}

export class InternalCohortRollout {
  private canaryManager: CanaryManager;
  private monitoring: MonitoringDashboard;
  private migrationManager: MigrationManager;
  private storageManager: StorageManagerV2;
  private rollupManager: HybridRollupManager;
  private deviceId: string;
  private initialized: boolean = false;

  constructor(deviceId?: string) {
    this.deviceId = deviceId || this.generateDeviceId();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Internal Cohort Rollout...');
      
      // Initialize components
      this.canaryManager = new CanaryManager();
      this.monitoring = new MonitoringDashboard();
      this.storageManager = new StorageManagerV2(this.deviceId);
      this.rollupManager = new HybridRollupManager(this.storageManager);
      this.migrationManager = new MigrationManager(this.deviceId);
      
      // Initialize canary manager for current device
      this.canaryManager.initializeForCurrentDevice();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Check initial rollout status
      await this.checkRolloutStatus();
      
      this.initialized = true;
      console.log('✅ Internal Cohort Rollout initialized successfully');
      
      // Start monitoring
      this.startMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to initialize rollout:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    // Listen for feature flag changes
    window.addEventListener('storage', (event) => {
      if (event.key === 'analytics_v2_disabled') {
        this.handleFeatureFlagChange();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('📡 Device online - syncing rollout status');
      this.syncRolloutStatus();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Device offline - working offline');
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('👁️ Page visible - checking rollout status');
        this.checkRolloutStatus();
      }
    });
  }

  private async checkRolloutStatus(): Promise<void> {
    try {
      const status = this.getRolloutStatus();
      
      if (status.enabled && !status.migrationComplete) {
        await this.startMigration();
      }
      
      // Update device metrics
      await this.updateDeviceMetrics();
      
    } catch (error) {
      console.error('Error checking rollout status:', error);
    }
  }

  private async startMigration(): Promise<void> {
    try {
      console.log('🔄 Starting migration for device:', this.deviceId);
      
      const migrationResult = await this.migrationManager.migrate();
      
      if (migrationResult.success) {
        console.log('✅ Migration completed successfully');
        
        // Report metrics to canary manager
        this.canaryManager.reportDeviceMetrics(this.deviceId, {
          migrationSuccess: true,
          performanceScore: 100,
          errorCount: 0,
          feedback: 'Migration successful'
        });
        
        // Initialize rollup manager
        await this.rollupManager.rebuildAllRollups();
        
      } else {
        console.error('❌ Migration failed:', migrationResult.error);
        
        // Report failure to canary manager
        this.canaryManager.reportDeviceMetrics(this.deviceId, {
          migrationSuccess: false,
          performanceScore: 0,
          errorCount: 1,
          feedback: migrationResult.error || 'Migration failed'
        });
      }
      
    } catch (error) {
      console.error('Migration error:', error);
      
      // Report error to canary manager
      this.canaryManager.reportDeviceMetrics(this.deviceId, {
        migrationSuccess: false,
        performanceScore: 0,
        errorCount: 1,
        feedback: error.message
      });
    }
  }

  private async updateDeviceMetrics(): Promise<void> {
    try {
      const metrics = this.monitoring.getCurrentMetrics();
      if (metrics) {
        // Calculate performance score based on metrics
        const performanceScore = this.calculatePerformanceScore(metrics);
        const errorCount = metrics.errors.total;
        
        this.canaryManager.reportDeviceMetrics(this.deviceId, {
          migrationSuccess: localStorage.getItem('migration_v2_complete') === 'true',
          performanceScore,
          errorCount,
          feedback: 'Metrics updated'
        });
      }
    } catch (error) {
      console.error('Error updating device metrics:', error);
    }
  }

  private calculatePerformanceScore(metrics: MonitoringMetrics): number {
    // Calculate performance score (0-100)
    let score = 100;
    
    // Deduct for slow cold start
    if (metrics.performance.coldStart > 2000) {
      score -= Math.min(30, (metrics.performance.coldStart - 2000) / 100);
    }
    
    // Deduct for slow TTR
    if (metrics.performance.ttr > 1200) {
      score -= Math.min(20, (metrics.performance.ttr - 1200) / 50);
    }
    
    // Deduct for errors
    score -= Math.min(25, metrics.errors.total * 5);
    
    // Deduct for high memory usage
    if (metrics.performance.memoryUsage > 50) {
      score -= Math.min(15, (metrics.performance.memoryUsage - 50) / 5);
    }
    
    return Math.max(0, Math.min(100, score));
  }

  private startMonitoring(): void {
    // Monitor every 30 seconds
    setInterval(() => {
      this.checkRolloutStatus();
    }, 30000);
    
    // Report metrics every 5 minutes
    setInterval(() => {
      this.updateDeviceMetrics();
    }, 300000);
  }

  private handleFeatureFlagChange(): void {
    const isDisabled = localStorage.getItem('analytics_v2_disabled') === 'true';
    console.log('🚩 Feature flag changed - disabled:', isDisabled);
    
    if (isDisabled) {
      // Handle rollback
      this.handleRollback();
    }
  }

  private async handleRollback(): Promise<void> {
    try {
      console.log('🔄 Handling rollback...');
      
      // Report rollback to canary manager
      this.canaryManager.reportDeviceMetrics(this.deviceId, {
        migrationSuccess: false,
        performanceScore: 0,
        errorCount: 1,
        feedback: 'Rollback initiated'
      });
      
      // Disable rollout for this device
      this.canaryManager.disableRollout();
      
    } catch (error) {
      console.error('Error handling rollback:', error);
    }
  }

  private async syncRolloutStatus(): Promise<void> {
    // Sync rollout status with server if online
    try {
      // This would sync with a central server
      console.log('📡 Syncing rollout status...');
    } catch (error) {
      console.error('Error syncing rollout status:', error);
    }
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  // Public API methods
  async startCanaryRollout(): Promise<boolean> {
    try {
      console.log('🚀 Starting canary rollout...');
      
      this.canaryManager.enableCanary();
      
      // Wait a moment for propagation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const status = this.getRolloutStatus();
      return status.enabled && status.stage === 'canary';
      
    } catch (error) {
      console.error('Error starting canary rollout:', error);
      return false;
    }
  }

  async startSmallCohortRollout(): Promise<boolean> {
    try {
      console.log('🎯 Starting small cohort rollout...');
      
      const canProgress = this.canaryManager.canProgressToNextStage();
      if (!canProgress) {
        console.log('⚠️ Cannot progress to small cohort - criteria not met');
        return false;
      }
      
      return await this.canaryManager.progressToSmallCohort();
      
    } catch (error) {
      console.error('Error starting small cohort rollout:', error);
      return false;
    }
  }

  async startFullInternalRollout(): Promise<boolean> {
    try {
      console.log('🎉 Starting full internal rollout...');
      
      const canProgress = this.canaryManager.canProgressToNextStage();
      if (!canProgress) {
        console.log('⚠️ Cannot progress to full internal - criteria not met');
        return false;
      }
      
      return await this.canaryManager.progressToFullInternal();
      
    } catch (error) {
      console.error('Error starting full internal rollout:', error);
      return false;
    }
  }

  async emergencyRollback(): Promise<boolean> {
    try {
      console.log('🚨 Emergency rollback initiated...');
      
      // Disable rollout
      this.canaryManager.disableRollout();
      
      // Set feature flag to disabled
      localStorage.setItem('analytics_v2_disabled', 'true');
      
      // Clear migration state
      localStorage.removeItem('migration_v2_complete');
      localStorage.removeItem('migration_v2_timestamp');
      
      // Notify monitoring
      this.monitoring.notifyAlert('Emergency rollback initiated', 'critical');
      
      console.log('✅ Emergency rollback completed');
      return true;
      
    } catch (error) {
      console.error('Error during emergency rollback:', error);
      return false;
    }
  }

  getRolloutStatus(): RolloutStatus {
    const rolloutStage = this.canaryManager.getRolloutStage();
    const isCanary = this.canaryManager.isCanaryDevice(this.deviceId);
    const isInRollout = this.canaryManager.isEligibleForRollout(this.deviceId);
    
    return {
      stage: rolloutStage,
      enabled: rolloutStage !== 'disabled',
      deviceId: this.deviceId,
      isCanary,
      isInRollout,
      migrationComplete: localStorage.getItem('migration_v2_complete') === 'true',
      lastCheck: Date.now(),
      metrics: this.monitoring.getCurrentMetrics(),
      alerts: this.monitoring.getAlerts()
    };
  }

  getCanaryReport(): string {
    return this.canaryManager.generateReport();
  }

  getMonitoringReport(): string {
    return this.monitoring.generateReport();
  }

  getFullReport(): string {
    const rolloutStatus = this.getRolloutStatus();
    const canaryReport = this.getCanaryReport();
    const monitoringReport = this.getMonitoringReport();
    
    return `
=== Internal Cohort Rollout - Full Report ===
Generated: ${new Date().toISOString()}

Rollout Status:
- Stage: ${rolloutStatus.stage}
- Enabled: ${rolloutStatus.enabled}
- Device ID: ${rolloutStatus.deviceId}
- Is Canary: ${rolloutStatus.isCanary}
- In Rollout: ${rolloutStatus.isInRollout}
- Migration Complete: ${rolloutStatus.migrationComplete}

${canaryReport}

${monitoringReport}

Integration Status:
- Initialized: ${this.initialized}
- Active Alerts: ${rolloutStatus.alerts.length}
- Last Check: ${new Date(rolloutStatus.lastCheck).toISOString()}
    `.trim();
  }

  // Static methods for global access
  static async create(): Promise<InternalCohortRollout> {
    const rollout = new InternalCohortRollout();
    await rollout.initialize();
    return rollout;
  }

  static getInstance(): InternalCohortRollout | null {
    return (window as any).internalCohortRollout || null;
  }
}

// Initialize and attach to window object
if (typeof window !== 'undefined') {
  // Create instance when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const rollout = await InternalCohortRollout.create();
        (window as any).internalCohortRollout = rollout;
        console.log('🎯 Internal Cohort Rollout ready');
      } catch (error) {
        console.error('Failed to initialize rollout:', error);
      }
    });
  } else {
    // DOM already loaded
    InternalCohortRollout.create().then(rollout => {
      (window as any).internalCohortRollout = rollout;
      console.log('🎯 Internal Cohort Rollout ready');
    }).catch(error => {
      console.error('Failed to initialize rollout:', error);
    });
  }
}

