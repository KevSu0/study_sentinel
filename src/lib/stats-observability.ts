/**
 * Stats Observability System
 *
 * Monitors performance, tracks budgets, and collects telemetry data
 * with 5% sampling rate for privacy
 */

interface PerformanceBudget {
  id: string;
  name: string;
  limit: number;
  unit: string;
  critical: boolean;
}

interface TelemetryEvent {
  type: string;
  timestamp: number;
  metrics: Record<string, number>;
  metadata: Record<string, any>;
  sampled: boolean;
}

interface BudgetExceededEvent {
  budgetId: string;
  actualValue: number;
  limit: number;
  percentageOver: number;
  context: string;
}

interface StatsDiagnostics {
  metricsVersion: string;
  statsCodeVersion: string;
  computeTime: number;
  workerTime: number;
  memoryDelta: number;
  deviceClass: string;
  errorCount: number;
  legacyReads: number;
  timestamp: number;
}

// Performance budgets
export const PERFORMANCE_BUDGETS: Record<string, PerformanceBudget> = {
  useStats30Day: {
    id: 'useStats30Day',
    name: 'use-stats computation (30-day range)',
    limit: 50,
    unit: 'ms',
    critical: true
  },
  workerRTT: {
    id: 'workerRTT',
    name: 'Worker round-trip time',
    limit: 80,
    unit: 'ms',
    critical: true
  },
  routeJS: {
    id: 'routeJS',
    name: 'Stats route JavaScript bundle',
    limit: 180,
    unit: 'KB (gzipped)',
    critical: true
  },
  heapDelta: {
    id: 'heapDelta',
    name: 'Memory usage delta',
    limit: 30,
    unit: 'MB',
    critical: false
  },
  cls: {
    id: 'cls',
    name: 'Cumulative Layout Shift',
    limit: 0.03,
    unit: 'score',
    critical: false
  },
  rerenders: {
    id: 'rerenders',
    name: 'Re-renders per interaction',
    limit: 3,
    unit: 'count',
    critical: false
  }
};

// Observability class
class StatsObservability {
  private telemetryBuffer: TelemetryEvent[] = [];
  private budgetViolations: BudgetExceededEvent[] = [];
  private diagnostics: StatsDiagnostics[] = [];
  private sampleRate = 0.05; // 5% sampling
  private isInitialized = false;
  private consentGranted = false;

  constructor() {
    this.init();
  }

  private async init() {
    // Check for telemetry consent
    const consent = localStorage.getItem('telemetry-consent');
    if (consent === 'granted') {
      this.consentGranted = true;
    }

    // Set up performance observers
    this.setupPerformanceObservers();

    // Initialize metrics
    this.recordInitialMetrics();

    this.isInitialized = true;
  }

  private setupPerformanceObservers() {
    // CLS monitoring
    if ('LayoutShift' in window) {
      let clsScore = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
            this.checkBudget('cls', clsScore);
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });
    }

    // Memory monitoring
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1024 / 1024;
        this.checkBudget('heapDelta', usedMB);
      }, 5000);
    }
  }

  private recordInitialMetrics() {
    // Record initial page load metrics
    if ('performance' in window) {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (nav) {
        this.recordTelemetry('page_load', {
          domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
          loadComplete: nav.loadEventEnd - nav.loadEventStart,
          firstPaint: 0 // TODO: Add paint timing
        });
      }
    }
  }

  // Public API
  recordComputeTime(operation: string, duration: number, context: any = {}) {
    this.checkBudget('useStats30Day', duration, operation);

    // Record detailed metrics
    this.recordTelemetry('compute_time', {
      operation,
      duration,
      ...context
    });

    // Update diagnostics
    const diag: Partial<StatsDiagnostics> = {
      computeTime: duration,
      timestamp: Date.now()
    };

    if (operation.includes('worker')) {
      diag.workerTime = duration;
    }

    this.updateDiagnostics(diag);
  }

  recordWorkerStats(stats: {
    computeTime: number;
    memoryUsage?: { used: number; total: number; limit: number };
  }) {
    this.checkBudget('workerRTT', stats.computeTime);

    if (stats.memoryUsage) {
      this.updateDiagnostics({
        memoryDelta: stats.memoryUsage.used,
        workerTime: stats.computeTime
      });
    }

    this.recordTelemetry('worker_stats', {
      computeTime: stats.computeTime,
      memoryUsed: stats.memoryUsage?.used || 0
    });
  }

  recordLegacyRead() {
    this.recordTelemetry('legacy_read', { count: 1 });
    this.updateDiagnostics({ legacyReads: 1 }, true);
  }

  recordError(error: Error, context: any = {}) {
    this.recordTelemetry('error', {
      message: error.message,
      stack: error.stack,
      ...context
    });

    this.updateDiagnostics({ errorCount: 1 }, true);
  }

  private checkBudget(budgetId: string, value: number, context = '') {
    const budget = PERFORMANCE_BUDGETS[budgetId];
    if (!budget) return;

    if (value > budget.limit) {
      const violation: BudgetExceededEvent = {
        budgetId,
        actualValue: value,
        limit: budget.limit,
        percentageOver: ((value - budget.limit) / budget.limit) * 100,
        context
      };

      this.budgetViolations.push(violation);

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Budget exceeded: ${budget.name}`, violation);
      }

      // Trigger alert if critical
      if (budget.critical) {
        this.triggerBudgetAlert(violation);
      }
    }
  }

  private triggerBudgetAlert(violation: BudgetExceededEvent) {
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('stats-budget-exceeded', {
      detail: violation
    }));

    // Log to analytics if consent given
    if (this.consentGranted) {
      this.recordTelemetry('budget_violation', {
        percentageOver: violation.percentageOver,
        isCritical: PERFORMANCE_BUDGETS[violation.budgetId].critical ? 1 : 0
      }, {
        budgetId: violation.budgetId
      });
    }
  }

  private recordTelemetry(type: string, metrics: Record<string, number>, metadata: Record<string, any> = {}) {
    if (!this.consentGranted) return;

    // Sample events
    const sampled = Math.random() < this.sampleRate;
    if (!sampled && !type.includes('critical')) return;

    const event: TelemetryEvent = {
      type,
      timestamp: Date.now(),
      metrics,
      metadata: {
        ...metadata,
        metricsVersion: '1.0.0',
        statsCodeVersion: '1.0.0',
        deviceClass: this.getDeviceClass(),
        url: window.location.pathname
      },
      sampled
    };

    this.telemetryBuffer.push(event);

    // Flush buffer when it gets large
    if (this.telemetryBuffer.length > 50) {
      this.flushTelemetry();
    }
  }

  private updateDiagnostics(updates: Partial<StatsDiagnostics>, increment = false) {
    const now = Date.now();
    let diag = this.diagnostics[this.diagnostics.length - 1];

    if (!diag || now - diag.timestamp > 60000) { // New diagnostic every minute
      diag = {
        metricsVersion: '1.0.0',
        statsCodeVersion: '1.0.0',
        computeTime: 0,
        workerTime: 0,
        memoryDelta: 0,
        deviceClass: this.getDeviceClass(),
        errorCount: 0,
        legacyReads: 0,
        timestamp: now
      };
      this.diagnostics.push(diag);
    }

    // Update values
    for (const [key, value] of Object.entries(updates)) {
      if (increment && typeof value === 'number') {
        (diag as any)[key] += value;
      } else {
        (diag as any)[key] = value;
      }
    }

    diag.timestamp = now;
  }

  private getDeviceClass(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) {
      return /iphone|ipad/.test(userAgent) ? 'ios' : 'android';
    }
    return 'desktop';
  }

  public async flushTelemetry() {
    if (this.telemetryBuffer.length === 0 || !this.consentGranted) return;

    try {
      // In a real implementation, this would send to your analytics service
      // For now, we'll just log and clear
      console.log('Flushing telemetry:', this.telemetryBuffer.length, 'events');

      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 100));

      this.telemetryBuffer = [];
    } catch (error) {
      console.error('Failed to flush telemetry:', error);
    }
  }

  // Public methods
  grantConsent() {
    this.consentGranted = true;
    localStorage.setItem('telemetry-consent', 'granted');
    this.recordTelemetry('consent_granted', {});
  }

  revokeConsent() {
    this.consentGranted = false;
    localStorage.setItem('telemetry-consent', 'denied');
    this.flushTelemetry(); // Flush any pending data
  }

  getDiagnostics(): StatsDiagnostics | null {
    return this.diagnostics[this.diagnostics.length - 1] || null;
  }

  getBudgetStatus(): Record<string, { within: boolean; usage: number; limit: number }> {
    const status: Record<string, any> = {};

    for (const [id, budget] of Object.entries(PERFORMANCE_BUDGETS)) {
      // Find the latest measurement for this budget
      let usage = 0;
      if (id === 'useStats30Day') {
        const diag = this.getDiagnostics();
        usage = diag?.computeTime || 0;
      } else if (id === 'workerRTT') {
        const diag = this.getDiagnostics();
        usage = diag?.workerTime || 0;
      } else if (id === 'heapDelta') {
        const diag = this.getDiagnostics();
        usage = diag?.memoryDelta || 0;
      }

      status[id] = {
        within: usage <= budget.limit,
        usage,
        limit: budget.limit
      };
    }

    return status;
  }

  getRecentViolations(count = 10): BudgetExceededEvent[] {
    return this.budgetViolations.slice(-count);
  }

  // Debug panel data
  getDebugData() {
    return {
      budgets: this.getBudgetStatus(),
      diagnostics: this.getDiagnostics(),
      violations: this.getRecentViolations(5),
      consent: this.consentGranted,
      sampleRate: this.sampleRate,
      pendingEvents: this.telemetryBuffer.length
    };
  }

  // Clean up
  destroy() {
    this.flushTelemetry();
    this.telemetryBuffer = [];
    this.budgetViolations = [];
    this.diagnostics = [];
  }
}

// Export singleton instance
export const statsObservability = new StatsObservability();

// React hook for consuming observability data
import { useEffect, useState } from 'react';

export function useStatsObservability() {
  const [debugData, setDebugData] = useState(() => statsObservability.getDebugData());

  useEffect(() => {
    const interval = setInterval(() => {
      setDebugData(statsObservability.getDebugData());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    debugData,
    grantConsent: () => statsObservability.grantConsent(),
    revokeConsent: () => statsObservability.revokeConsent(),
    flushTelemetry: () => statsObservability.flushTelemetry()
  };
}

// Debug panel component (React component)
// This should be moved to a separate .tsx file
/*
export function StatsDebugPanel() {
  const { debugData, grantConsent, revokeConsent } = useStatsObservability();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 max-w-sm z-50">
      <h3 className="font-bold mb-2">Stats Debug Panel</h3>

      <div className="space-y-2 text-sm">
        <div>
          <strong>Consent:</strong> {debugData.consent ? 'Granted' : 'Denied'}
          <div className="space-x-2 mt-1">
            <button
              onClick={grantConsent}
              className="px-2 py-1 bg-green-500 text-white rounded text-xs"
            >
              Grant
            </button>
            <button
              onClick={revokeConsent}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
            >
              Revoke
            </button>
          </div>
        </div>

        <div>
          <strong>Budgets:</strong>
          <div className="ml-2">
            {Object.entries(debugData.budgets).map(([id, status]) => (
              <div key={id} className="text-xs">
                <span className={status.within ? 'text-green-600' : 'text-red-600'}>
                  {id}: {status.usage.toFixed(1)}/{status.limit} {PERFORMANCE_BUDGETS[id]?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {debugData.diagnostics && (
          <div>
            <strong>Diagnostics:</strong>
            <div className="ml-2 text-xs">
              <div>Compute: {debugData.diagnostics.computeTime}ms</div>
              <div>Worker: {debugData.diagnostics.workerTime}ms</div>
              <div>Memory: {debugData.diagnostics.memoryDelta}MB</div>
              <div>Errors: {debugData.diagnostics.errorCount}</div>
              <div>Legacy Reads: {debugData.diagnostics.legacyReads}</div>
            </div>
          </div>
        )}

        {debugData.violations.length > 0 && (
          <div>
            <strong>Recent Violations:</strong>
            <div className="ml-2 text-xs">
              {debugData.violations.map((v, i) => (
                <div key={i} className="text-red-600">
                  {v.budgetId}: +{v.percentageOver.toFixed(1)}%
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
*/