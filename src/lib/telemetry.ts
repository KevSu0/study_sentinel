// Timezone migration telemetry
export interface TimezoneDiffEvent {
  timestamp: string;
  hasDifference: boolean;
  boundary_type: 'session' | 'stats' | 'export';
  // Non-PII metadata only
  timeOfDayCategory: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';
}

class TimezoneTelemetry {
  private static instance: TimezoneTelemetry;
  private diffCount = 0;
  private totalComparisons = 0;

  static getInstance(): TimezoneTelemetry {
    if (!TimezoneTelemetry.instance) {
      TimezoneTelemetry.instance = new TimezoneTelemetry();
    }
    return TimezoneTelemetry.instance;
  }

  logBoundaryDifference(event: Omit<TimezoneDiffEvent, 'timestamp'>) {
    this.totalComparisons++;

    if (event.hasDifference) {
      this.diffCount++;

      // Log to console for now (in production, send to analytics)
      console.log('Timezone boundary difference:', {
        ...event,
        timestamp: new Date().toISOString(),
        diffRate: (this.diffCount / this.totalComparisons * 100).toFixed(2) + '%'
      });

      // Alert if diff rate exceeds threshold
      const diffRate = this.diffCount / this.totalComparisons;
      if (diffRate > 0.001) { // 0.1%
        console.warn('Timezone diff rate threshold exceeded:', diffRate);
      }
    }
  }

  getDiffRate(): number {
    return this.totalComparisons > 0 ? this.diffCount / this.totalComparisons : 0;
  }

  reset() {
    this.diffCount = 0;
    this.totalComparisons = 0;
  }
}

export const timezoneTelemetry = TimezoneTelemetry.getInstance();