import { LOG_PREFIX } from '@/lib/storage-keys';
import { CompletedWork, LogEvent } from '@/lib/types';
import { METRICS_VERSION, calculateSessionMetrics } from './metrics';

interface MigrationProgress {
  totalSessions: number;
  processedSessions: number;
  completed: boolean;
  error?: string;
}

export class MetricsMigration {
  private static instance: MetricsMigration;
  private progress: MigrationProgress = {
    totalSessions: 0,
    processedSessions: 0,
    completed: false,
  };

  static getInstance(): MetricsMigration {
    if (!MetricsMigration.instance) {
      MetricsMigration.instance = new MetricsMigration();
    }
    return MetricsMigration.instance;
  }

  /**
   * Check if migration is needed
   */
  needsMigration(): boolean {
    try {
      // Check if any sessions lack the new metrics
      const allTimeLogs: LogEvent[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOG_PREFIX)) {
          allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
        }
      }

      const sessionLogs = allTimeLogs.filter(
        l => l.type === 'ROUTINE_SESSION_COMPLETE' || l.type === 'TIMER_SESSION_COMPLETE'
      );

      // Check if any sessions need migration
      const needsMigration = sessionLogs.some(log =>
        log.payload.metricsVersion !== METRICS_VERSION ||
        log.payload.totalDuration === undefined ||
        log.payload.focusPercentage === undefined
      );

      return needsMigration;
    } catch (error) {
      console.error('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Get current migration progress
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Run migration in batches to avoid blocking UI
   */
  async runMigration(batchSize = 50, onProgress?: (progress: MigrationProgress) => void): Promise<void> {
    if (this.progress.completed) {
      return;
    }

    try {
      // Collect all session logs
      const allTimeLogs: LogEvent[] = [];
      const logKeys: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOG_PREFIX)) {
          logKeys.push(key);
          allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
        }
      }

      const sessionLogs = allTimeLogs.filter(
        l => l.type === 'ROUTINE_SESSION_COMPLETE' || l.type === 'TIMER_SESSION_COMPLETE'
      );

      // Filter logs that need migration
      const logsToMigrate = sessionLogs.filter(log =>
        log.payload.metricsVersion !== METRICS_VERSION ||
        log.payload.totalDuration === undefined ||
        log.payload.focusPercentage === undefined
      );

      this.progress.totalSessions = logsToMigrate.length;
      this.progress.processedSessions = 0;
      this.progress.completed = false;

      // Process in batches
      for (let i = 0; i < logsToMigrate.length; i += batchSize) {
        const batch = logsToMigrate.slice(i, i + batchSize);

        // Group by date to update the correct localStorage keys
        const updatesByDate: { [date: string]: LogEvent[] } = {};

        batch.forEach(log => {
          const logDate = log.timestamp.split('T')[0];
          if (!updatesByDate[logDate]) {
            // Load existing logs for this date
            const existingLogs = JSON.parse(localStorage.getItem(`${LOG_PREFIX}${logDate}`) || '[]');
            updatesByDate[logDate] = existingLogs;
          }

          // Find and update the log
          const logIndex = updatesByDate[logDate].findIndex(l => l.id === log.id);
          if (logIndex !== -1) {
            // Migrate the log
            const migratedLog = this.migrateLog(log);
            updatesByDate[logDate][logIndex] = migratedLog;
          }
        });

        // Save updates
        Object.entries(updatesByDate).forEach(([date, logs]) => {
          localStorage.setItem(`${LOG_PREFIX}${date}`, JSON.stringify(logs));
        });

        this.progress.processedSessions += batch.length;
        if (onProgress) {
          onProgress({ ...this.progress });
        }

        // Yield to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      this.progress.completed = true;
      if (onProgress) {
        onProgress({ ...this.progress });
      }
    } catch (error) {
      this.progress.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a single log entry
   */
  private migrateLog(log: LogEvent): LogEvent {
    // For old sessions, we don't have detailed pause tracking
    // Assume 100% focus for sessions without pause data
    const duration = log.payload.duration || 0;
    const totalDuration = duration * 1000; // Convert to ms

    return {
      ...log,
      payload: {
        ...log.payload,
        totalDuration,
        productiveDuration: totalDuration, // Assume no pauses for old sessions
        pauseDuration: 0,
        pauseCount: 0,
        focusPercentage: 100,
        metricsVersion: METRICS_VERSION,
      },
    };
  }

  /**
   * Reset migration progress (for testing)
   */
  resetProgress(): void {
    this.progress = {
      totalSessions: 0,
      processedSessions: 0,
      completed: false,
    };
  }

  // Public methods for feature flag integration
  async shouldMigrate(): Promise<boolean> {
    const migrationFlag = localStorage.getItem('metrics_migration_v2_completed');
    if (migrationFlag === 'true') {
      return false;
    }

    // Check if there are logs that need migration
    const logsToMigrate = this.findLogsToMigrate();
    return logsToMigrate.length > 0;
  }

  /**
   * Find logs that need migration
   */
  private findLogsToMigrate(): LogEvent[] {
    // Collect all session logs
    const allTimeLogs: LogEvent[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOG_PREFIX)) {
        allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
      }
    }

    return allTimeLogs.filter(
      l => (l.type === 'ROUTINE_SESSION_COMPLETE' || l.type === 'TIMER_SESSION_COMPLETE') &&
      !l.payload.metricsVersion
    );
  }

  async migrateInBatches(onProgress?: (progress: MigrationProgress) => void): Promise<boolean> {
    try {
      await this.runMigration(50, onProgress);
      localStorage.setItem('metrics_migration_v2_completed', 'true');
      return true;
    } catch (error) {
      console.error('Migration failed:', error);
      return false;
    }
  }

  /**
   * Recompute metrics for all sessions (maintenance action)
   */
  async recomputeAllMetrics(batchSize = 50, onProgress?: (progress: MigrationProgress) => void): Promise<void> {
    try {
      // Collect all session logs
      const allTimeLogs: LogEvent[] = [];
      const logKeys: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(LOG_PREFIX)) {
          logKeys.push(key);
          allTimeLogs.push(...JSON.parse(localStorage.getItem(key) || '[]'));
        }
      }

      const sessionLogs = allTimeLogs.filter(
        l => l.type === 'ROUTINE_SESSION_COMPLETE' || l.type === 'TIMER_SESSION_COMPLETE'
      );

      this.progress.totalSessions = sessionLogs.length;
      this.progress.processedSessions = 0;
      this.progress.completed = false;

      // Process in batches
      for (let i = 0; i < sessionLogs.length; i += batchSize) {
        const batch = sessionLogs.slice(i, i + batchSize);

        // Group by date to update the correct localStorage keys
        const updatesByDate: { [date: string]: LogEvent[] } = {};

        batch.forEach(log => {
          const logDate = log.timestamp.split('T')[0];
          if (!updatesByDate[logDate]) {
            // Load existing logs for this date
            const existingLogs = JSON.parse(localStorage.getItem(`${LOG_PREFIX}${logDate}`) || '[]');
            updatesByDate[logDate] = existingLogs;
          }

          // Find and update the log
          const logIndex = updatesByDate[logDate].findIndex(l => l.id === log.id);
          if (logIndex !== -1) {
            // Recompute metrics with current logic
            const timerState = {
              startTime: log.payload.startTime,
              endTime: log.payload.endTime,
              pausedDuration: log.payload.pausedDuration || 0,
              pauseCount: log.payload.pauseCount || 0,
              isPaused: false,
              pauseStartTime: undefined,
            };

            const metrics = calculateSessionMetrics(timerState);

            const updatedLog = {
              ...log,
              payload: {
                ...log.payload,
                totalDuration: metrics.totalDuration,
                productiveDuration: metrics.productiveDuration,
                pauseDuration: metrics.pauseDuration,
                pauseCount: metrics.pauseCount,
                focusPercentage: metrics.focusPercentage,
                metricsVersion: METRICS_VERSION,
              },
            };

            updatesByDate[logDate][logIndex] = updatedLog;
          }
        });

        // Save updates
        Object.entries(updatesByDate).forEach(([date, logs]) => {
          localStorage.setItem(`${LOG_PREFIX}${date}`, JSON.stringify(logs));
        });

        this.progress.processedSessions += batch.length;
        if (onProgress) {
          onProgress({ ...this.progress });
        }

        // Yield to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      this.progress.completed = true;
      if (onProgress) {
        onProgress({ ...this.progress });
      }
    } catch (error) {
      this.progress.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('Recompute failed:', error);
      throw error;
    }
  }
}