// Canary Device Management for Internal Cohort Rollout
// Manages the canary device list and rollout logic

export interface CanaryDevice {
  id: string;
  name: string;
  owner: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  enrolledAt: number;
  lastActive: number;
  status: 'active' | 'inactive' | 'excluded';
  metrics?: {
    migrationSuccess: boolean;
    performanceScore: number;
    errorCount: number;
    feedback: string;
  };
}

export interface RolloutConfig {
  canaryDevices: string[];
  rolloutPercentage: number;
  enabled: boolean;
  startTime: number;
  endTime?: number;
  criteria: {
    minMigrationSuccess: number;
    maxResponseTime: number;
    maxErrorRate: number;
  };
}

export class CanaryManager {
  private config: RolloutConfig;
  private devices: CanaryDevice[] = [];
  private storageKey = 'canary_manager_config';

  constructor() {
    this.loadConfig();
    this.initializeDevices();
  }

  private loadConfig(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.config = JSON.parse(stored);
    } else {
      this.config = this.getDefaultConfig();
      this.saveConfig();
    }
  }

  private getDefaultConfig(): RolloutConfig {
    return {
      canaryDevices: [
        'canary-desktop-001',
        'canary-mobile-001', 
        'canary-tablet-001',
        'canary-desktop-002',
        'canary-mobile-002'
      ],
      rolloutPercentage: 0, // Start with 0%
      enabled: false,
      startTime: Date.now(),
      criteria: {
        minMigrationSuccess: 1.0, // 100%
        maxResponseTime: 2000, // 2 seconds
        maxErrorRate: 0.0 // 0%
      }
    };
  }

  private initializeDevices(): void {
    // Load devices from localStorage or create defaults
    const storedDevices = localStorage.getItem('canary_devices');
    if (storedDevices) {
      this.devices = JSON.parse(storedDevices);
    } else {
      this.devices = this.createDefaultDevices();
      this.saveDevices();
    }
  }

  private createDefaultDevices(): CanaryDevice[] {
    return [
      {
        id: 'canary-desktop-001',
        name: 'Engineering Lead Desktop',
        owner: 'engineering-lead',
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        enrolledAt: Date.now(),
        lastActive: Date.now(),
        status: 'active'
      },
      {
        id: 'canary-mobile-001',
        name: 'Product Manager iPhone',
        owner: 'product-manager',
        deviceType: 'mobile',
        browser: 'Safari',
        os: 'iOS',
        enrolledAt: Date.now(),
        lastActive: Date.now(),
        status: 'active'
      },
      {
        id: 'canary-tablet-001',
        name: 'QA Lead iPad',
        owner: 'qa-lead',
        deviceType: 'tablet',
        browser: 'Safari',
        os: 'iPadOS',
        enrolledAt: Date.now(),
        lastActive: Date.now(),
        status: 'active'
      },
      {
        id: 'canary-desktop-002',
        name: 'DevOps Engineer Desktop',
        owner: 'devops-engineer',
        deviceType: 'desktop',
        browser: 'Firefox',
        os: 'Linux',
        enrolledAt: Date.now(),
        lastActive: Date.now(),
        status: 'active'
      },
      {
        id: 'canary-mobile-002',
        name: 'Support Lead Android',
        owner: 'support-lead',
        deviceType: 'mobile',
        browser: 'Chrome',
        os: 'Android',
        enrolledAt: Date.now(),
        lastActive: Date.now(),
        status: 'active'
      }
    ];
  }

  private saveConfig(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.config));
  }

  private saveDevices(): void {
    localStorage.setItem('canary_devices', JSON.stringify(this.devices));
  }

  // Public API methods
  isCanaryDevice(deviceId: string): boolean {
    return this.config.canaryDevices.includes(deviceId);
  }

  isEligibleForRollout(deviceId: string): boolean {
    if (!this.config.enabled) return false;

    // Check if device is in canary list
    if (this.isCanaryDevice(deviceId)) {
      return true;
    }

    // Check if device is in percentage rollout
    if (this.config.rolloutPercentage > 0) {
      const hash = this.hashString(deviceId);
      const rollValue = hash % 100;
      return rollValue < this.config.rolloutPercentage;
    }

    return false;
  }

  enableCanary(): void {
    this.config.enabled = true;
    this.config.startTime = Date.now();
    this.config.rolloutPercentage = 0;
    this.saveConfig();
    console.log('🚀 Canary rollout enabled for specific devices');
  }

  enablePercentageRollout(percentage: number): void {
    this.config.enabled = true;
    this.config.rolloutPercentage = Math.min(100, Math.max(0, percentage));
    this.saveConfig();
    console.log(`📊 Enabled percentage rollout: ${percentage}%`);
  }

  disableRollout(): void {
    this.config.enabled = false;
    this.config.rolloutPercentage = 0;
    this.saveConfig();
    console.log('🛑 Rollout disabled');
  }

  updateCanaryDevices(devices: string[]): void {
    this.config.canaryDevices = devices;
    this.saveConfig();
    console.log('📝 Canary devices updated:', devices);
  }

  addCanaryDevice(deviceId: string, deviceInfo: Partial<CanaryDevice>): void {
    if (!this.devices.find(d => d.id === deviceId)) {
      const newDevice: CanaryDevice = {
        id: deviceId,
        name: deviceInfo.name || deviceId,
        owner: deviceInfo.owner || 'unknown',
        deviceType: deviceInfo.deviceType || 'desktop',
        browser: deviceInfo.browser || 'unknown',
        os: deviceInfo.os || 'unknown',
        enrolledAt: Date.now(),
        lastActive: Date.now(),
        status: 'active'
      };
      this.devices.push(newDevice);
      this.saveDevices();
      console.log(`➕ Added canary device: ${deviceId}`);
    }
  }

  removeCanaryDevice(deviceId: string): void {
    this.devices = this.devices.filter(d => d.id !== deviceId);
    this.config.canaryDevices = this.config.canaryDevices.filter(id => id !== deviceId);
    this.saveDevices();
    this.saveConfig();
    console.log(`➖ Removed canary device: ${deviceId}`);
  }

  reportDeviceMetrics(deviceId: string, metrics: CanaryDevice['metrics']): void {
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.metrics = metrics;
      device.lastActive = Date.now();
      this.saveDevices();
      console.log(`📊 Updated metrics for device: ${deviceId}`);
    }
  }

  getRolloutStatus(): {
    enabled: boolean;
    canaryCount: number;
    rolloutPercentage: number;
    startTime: number;
    uptime: number;
  } {
    return {
      enabled: this.config.enabled,
      canaryCount: this.config.canaryDevices.length,
      rolloutPercentage: this.config.rolloutPercentage,
      startTime: this.config.startTime,
      uptime: Date.now() - this.config.startTime
    };
  }

  getDeviceStatus(deviceId: string): CanaryDevice | null {
    return this.devices.find(d => d.id === deviceId) || null;
  }

  getAllDevices(): CanaryDevice[] {
    return [...this.devices];
  }

  getActiveCanaries(): CanaryDevice[] {
    return this.devices.filter(d => 
      this.config.canaryDevices.includes(d.id) && d.status === 'active'
    );
  }

  generateReport(): string {
    const activeCanaries = this.getActiveCanaries();
    const rolloutStatus = this.getRolloutStatus();
    
    return `
=== Canary Rollout Report ===
Generated: ${new Date().toISOString()}

Rollout Status:
- Enabled: ${rolloutStatus.enabled}
- Canary Devices: ${rolloutStatus.canaryCount}
- Rollout Percentage: ${rolloutStatus.rolloutPercentage}%
- Start Time: ${new Date(rolloutStatus.startTime).toISOString()}
- Uptime: ${Math.floor(rolloutStatus.uptime / (1000 * 60))} minutes

Active Canary Devices:
${activeCanaries.map(device => `
  - ${device.name} (${device.id})
    Owner: ${device.owner}
    Type: ${device.deviceType} (${device.browser} on ${device.os})
    Status: ${device.status}
    Last Active: ${new Date(device.lastActive).toISOString()}
    Metrics: ${device.metrics ? `Success: ${device.metrics.migrationSuccess}, Score: ${device.metrics.performanceScore}` : 'No metrics'}
`).join('\n')}

Configuration:
- Min Migration Success: ${(this.config.criteria.minMigrationSuccess * 100).toFixed(0)}%
- Max Response Time: ${this.config.criteria.maxResponseTime}ms
- Max Error Rate: ${(this.config.criteria.maxErrorRate * 100).toFixed(0)}%
    `.trim();
  }

  // Utility methods
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getCurrentDeviceId(): string {
    // Generate or retrieve device ID
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  private generateDeviceId(): string {
    return `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Rollout progression methods
  canProgressToNextStage(): boolean {
    if (!this.config.enabled) return false;

    const activeCanaries = this.getActiveCanaries();
    
    // Check if all canaries have reported metrics
    const canariesWithMetrics = activeCanaries.filter(d => d.metrics);
    if (canariesWithMetrics.length < activeCanaries.length) {
      console.log('⏳ Waiting for all canaries to report metrics');
      return false;
    }

    // Check criteria
    const migrationSuccess = canariesWithMetrics.filter(d => d.metrics?.migrationSuccess).length / canariesWithMetrics.length;
    const avgPerformance = canariesWithMetrics.reduce((sum, d) => sum + (d.metrics?.performanceScore || 0), 0) / canariesWithMetrics.length;
    const totalErrors = canariesWithMetrics.reduce((sum, d) => sum + (d.metrics?.errorCount || 0), 0);

    const criteriaMet = 
      migrationSuccess >= this.config.criteria.minMigrationSuccess &&
      avgPerformance >= (100 - this.config.criteria.maxResponseTime) && // Inverted for performance score
      (totalErrors / canariesWithMetrics.length) <= this.config.criteria.maxErrorRate;

    console.log('📈 Rollout criteria check:', {
      migrationSuccess: `${(migrationSuccess * 100).toFixed(1)}% >= ${(this.config.criteria.minMigrationSuccess * 100).toFixed(1)}%`,
      avgPerformance: `${avgPerformance.toFixed(1)} >= ${(100 - this.config.criteria.maxResponseTime).toFixed(1)}`,
      errorRate: `${(totalErrors / canariesWithMetrics.length).toFixed(3)} <= ${this.config.criteria.maxErrorRate.toFixed(3)}`,
      criteriaMet
    });

    return criteriaMet;
  }

  async progressToSmallCohort(): Promise<boolean> {
    if (!this.canProgressToNextStage()) {
      return false;
    }

    this.config.rolloutPercentage = 15; // 15% for small cohort
    this.saveConfig();
    console.log('🎯 Progressed to small cohort (15% rollout)');
    return true;
  }

  async progressToFullInternal(): Promise<boolean> {
    if (!this.canProgressToNextStage()) {
      return false;
    }

    this.config.rolloutPercentage = 100; // 100% for full internal
    this.saveConfig();
    console.log('🎉 Progressed to full internal rollout (100%)');
    return true;
  }

  getRolloutStage(): 'disabled' | 'canary' | 'small-cohort' | 'full-internal' {
    if (!this.config.enabled) return 'disabled';
    if (this.config.rolloutPercentage === 0) return 'canary';
    if (this.config.rolloutPercentage < 100) return 'small-cohort';
    return 'full-internal';
  }

  // Integration with analytics_v2 feature flag
  shouldEnableAnalyticsV2(): boolean {
    return this.isEligibleForRollout(this.getCurrentDeviceId());
  }

  // Initialize the canary manager for the current device
  initializeForCurrentDevice(): void {
    const deviceId = this.getCurrentDeviceId();
    
    // Check if device is already enrolled
    if (!this.devices.find(d => d.id === deviceId)) {
      // Auto-enroll if this is a development environment
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.addCanaryDevice(deviceId, {
          name: 'Development Environment',
          owner: 'developer',
          deviceType: 'desktop',
          browser: navigator.userAgent.split(' ')[0],
          os: navigator.platform
        });
      }
    }

    // Update last active time
    const device = this.devices.find(d => d.id === deviceId);
    if (device) {
      device.lastActive = Date.now();
      this.saveDevices();
    }
  }
}


// Global instance
const canaryManager = new CanaryManager();
(window as any).canaryManager = canaryManager;