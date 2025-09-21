import { timezoneTelemetry, TimezoneDiffEvent } from './telemetry';
import { TIMEZONE_LAUNCH_CONFIG } from '../config/launch-config';

// Monitoring dashboard interface
export interface TimezoneMetrics {
  totalComparisons: number;
  diffCount: number;
  diffRate: number;
  diffByTimeOfDay: Record<string, number>;
  hydrationMismatchRate: number;
  toggleUsage: {
    new: number;
    legacy: number;
    persistentLegacyUsers: number;
  };
  supportTickets: {
    baseline: number;
    current: number;
    increaseRate: number;
  };
}

class TimezoneMonitoring {
  private static instance: TimezoneMonitoring;
  private metrics: TimezoneMetrics = {
    totalComparisons: 0,
    diffCount: 0,
    diffRate: 0,
    diffByTimeOfDay: {},
    hydrationMismatchRate: 0,
    toggleUsage: {
      new: 0,
      legacy: 0,
      persistentLegacyUsers: 0
    },
    supportTickets: {
      baseline: 0,
      current: 0,
      increaseRate: 0
    }
  };

  static getInstance(): TimezoneMonitoring {
    if (!TimezoneMonitoring.instance) {
      TimezoneMonitoring.instance = new TimezoneMonitoring();
    }
    return TimezoneMonitoring.instance;
  }

  // Log boundary difference
  logBoundaryDifference(event: Omit<TimezoneDiffEvent, 'timestamp'>) {
    timezoneTelemetry.logBoundaryDifference(event);

    // Update local metrics
    this.metrics.totalComparisons++;
    if (event.hasDifference) {
      this.metrics.diffCount++;

      // Track by time of day
      this.metrics.diffByTimeOfDay[event.timeOfDayCategory] =
        (this.metrics.diffByTimeOfDay[event.timeOfDayCategory] || 0) + 1;
    }

    this.metrics.diffRate = this.metrics.diffCount / this.metrics.totalComparisons;
  }

  // Log toggle usage
  logToggleUsage(view: 'new' | 'legacy', userId: string) {
    if (view === 'new') {
      this.metrics.toggleUsage.new++;
    } else {
      this.metrics.toggleUsage.legacy++;
    }

    // Check for persistent legacy users
    // This would need to be implemented with actual user tracking
  }

  // Log hydration mismatch
  logHydrationMismatch() {
    this.metrics.hydrationMismatchRate++;
  }

  // Update support ticket metrics
  updateSupportTickets(currentCount: number) {
    if (this.metrics.supportTickets.baseline === 0) {
      this.metrics.supportTickets.baseline = currentCount;
    }
    this.metrics.supportTickets.current = currentCount;
    this.metrics.supportTickets.increaseRate =
      (currentCount - this.metrics.supportTickets.baseline) / this.metrics.supportTickets.baseline;
  }

  // Check if metrics are within thresholds
  checkThresholds(): {
    allHealthy: boolean;
    checks: Record<string, { healthy: boolean; value: number; threshold: number }>;
  } {
    const checks = {
      diffRate: {
        healthy: this.metrics.diffRate <= TIMEZONE_LAUNCH_CONFIG.thresholds.diffAnomalyRate,
        value: this.metrics.diffRate,
        threshold: TIMEZONE_LAUNCH_CONFIG.thresholds.diffAnomalyRate
      },
      hydrationMismatchRate: {
        healthy: this.metrics.hydrationMismatchRate <= TIMEZONE_LAUNCH_CONFIG.thresholds.hydrationMismatchRate,
        value: this.metrics.hydrationMismatchRate,
        threshold: TIMEZONE_LAUNCH_CONFIG.thresholds.hydrationMismatchRate
      },
      supportTicketIncrease: {
        healthy: this.metrics.supportTickets.increaseRate <= TIMEZONE_LAUNCH_CONFIG.thresholds.supportTicketIncrease,
        value: this.metrics.supportTickets.increaseRate,
        threshold: TIMEZONE_LAUNCH_CONFIG.thresholds.supportTicketIncrease
      },
      persistentLegacyUsers: {
        healthy: this.getLegacyUserRate() <= TIMEZONE_LAUNCH_CONFIG.thresholds.persistentLegacyUsers,
        value: this.getLegacyUserRate(),
        threshold: TIMEZONE_LAUNCH_CONFIG.thresholds.persistentLegacyUsers
      }
    };

    const allHealthy = Object.values(checks).every(check => check.healthy);

    return { allHealthy, checks };
  }

  // Get legacy user rate
  private getLegacyUserRate(): number {
    const total = this.metrics.toggleUsage.new + this.metrics.toggleUsage.legacy;
    return total > 0 ? this.metrics.toggleUsage.legacy / total : 0;
  }

  // Get current metrics
  getMetrics(): TimezoneMetrics {
    return { ...this.metrics };
  }

  // Reset metrics (for testing or after deployment)
  reset() {
    this.metrics = {
      totalComparisons: 0,
      diffCount: 0,
      diffRate: 0,
      diffByTimeOfDay: {},
      hydrationMismatchRate: 0,
      toggleUsage: {
        new: 0,
        legacy: 0,
        persistentLegacyUsers: 0
      },
      supportTickets: {
        baseline: 0,
        current: 0,
        increaseRate: 0
      }
    };
    timezoneTelemetry.reset();
  }

  // Generate report for checkpoints
  generateReport(): {
    summary: string;
    metrics: TimezoneMetrics;
    recommendations: string[];
    rolloutDecision: 'proceed' | 'pause' | 'rollback';
  } {
    const { allHealthy, checks } = this.checkThresholds();

    let recommendations: string[] = [];
    let rolloutDecision: 'proceed' | 'pause' | 'rollback' = 'proceed';

    if (!allHealthy) {
      Object.entries(checks).forEach(([key, check]) => {
        if (!check.healthy) {
          switch (key) {
            case 'diffRate':
              recommendations.push('Investigate unexpected timezone boundary differences');
              break;
            case 'hydrationMismatchRate':
              recommendations.push('Check SSR/CSR time label implementation');
              break;
            case 'supportTicketIncrease':
              recommendations.push('Review support tickets and update comms if needed');
              break;
            case 'persistentLegacyUsers':
              recommendations.push('Consider extending comparison window or improving user education');
              break;
          }
        }
      });

      if (recommendations.length > 2) {
        rolloutDecision = 'rollback';
      } else if (recommendations.length > 0) {
        rolloutDecision = 'pause';
      }
    }

    return {
      summary: allHealthy
        ? 'All metrics within thresholds. Proceed with rollout.'
        : `Issues detected: ${recommendations.join(', ')}`,
      metrics: this.getMetrics(),
      recommendations,
      rolloutDecision
    };
  }
}

export const timezoneMonitoring = TimezoneMonitoring.getInstance();

// Hook for components to use monitoring
export function useTimezoneMonitoring() {
  return {
    logBoundaryDifference: timezoneMonitoring.logBoundaryDifference.bind(timezoneMonitoring),
    logToggleUsage: timezoneMonitoring.logToggleUsage.bind(timezoneMonitoring),
    logHydrationMismatch: timezoneMonitoring.logHydrationMismatch.bind(timezoneMonitoring),
    getMetrics: timezoneMonitoring.getMetrics.bind(timezoneMonitoring),
    checkThresholds: timezoneMonitoring.checkThresholds.bind(timezoneMonitoring)
  };
}