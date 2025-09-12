// Hybrid Rollups System - Incremental + Idle Compaction
import { StorageManagerV2, EventRecord, StudyEventData, TaskEventData, BadgeEventData, EventData } from './storage-v2';
import { calculateExpectedMetrics, validateInvariants } from '../test/golden-dataset';

interface RollupConfig {
  incremental: boolean;
  compactionEnabled: boolean;
  compactionThreshold: number; // MS of idle time before compaction
  maxRollupAge: number; // Days to keep rollups
  aggVersion: number; // Current aggregation version
}

interface RollupMetrics {
  totalDuration: number;
  totalSessions: number;
  averageSessionLength: number;
  subjectBreakdown: Record<string, number>;
  dailyTotals: Record<string, number>;
  weeklyTotals: Record<string, number>;
  monthlyTotals: Record<string, number>;
  extendedTotals: Record<string, number>; // 7d, 30d, 90d
  heatmap: Record<number, number>; // hour of day -> count
  sessionLengthDistribution: {
    short: number; // < 30 min
    medium: number; // 30-120 min
    long: number; // > 120 min
  };
  consistencyScore: number;
  topStudyDays: Array<{ date: string; duration: number }>;
  studyStreaks: {
    current: number;
    longest: number;
  };
}

interface CompactionStats {
  lastCompaction: number;
  rollupsCompacted: number;
  timeSaved: number; // MS saved through compaction
}

interface PerformanceMetrics {
  computationTimes: number[];
  memoryUsage: number[];
  errorRates: number[];
  lastCheck: number;
}

interface PerformanceGuardrails {
  maxComputationTime: number; // MS
  maxMemoryUsage: number; // MB
  maxErrorRate: number; // 0-1
  backoffMultiplier: number;
  throttleThreshold: number;
}

class HybridRollupManager {
  private storage: StorageManagerV2;
  private config: RollupConfig;
  private compactionTimer: NodeJS.Timeout | null = null;
  private lastActivity: number;
  private performanceMetrics: PerformanceMetrics;
  private guardrails: PerformanceGuardrails;
  private isThrottled: boolean = false;
  private throttleUntil: number = 0;

  constructor(storage: StorageManagerV2, config: Partial<RollupConfig> = {}) {
    this.storage = storage;
    this.lastActivity = Date.now();
    
    this.config = {
      incremental: true,
      compactionEnabled: true,
      compactionThreshold: 30000, // 30 seconds idle
      maxRollupAge: 365, // Keep rollups for 1 year
      aggVersion: 1,
      ...config
    };

    // Initialize performance monitoring
    this.performanceMetrics = {
      computationTimes: [],
      memoryUsage: [],
      errorRates: [],
      lastCheck: Date.now()
    };

    // Initialize performance guardrails
    this.guardrails = {
      maxComputationTime: 5000, // 5 seconds
      maxMemoryUsage: 50, // 50MB
      maxErrorRate: 0.05, // 5% error rate
      backoffMultiplier: 2,
      throttleThreshold: 3 // 3 consecutive failures
    };

    this.setupActivityTracking();
    this.setupPerformanceMonitoring();
  }

  // Main entry point - called when events are added/updated
  async processEvent(eventType: string, eventData: EventData): Promise<void> {
    this.lastActivity = Date.now();
    
    if (!this.config.incremental) {
      return;
    }

    // Check if throttled
    if (this.isThrottled && Date.now() < this.throttleUntil) {
      console.warn('Rollup processing is throttled due to performance issues');
      return;
    }

    // Cancel any pending compaction
    this.cancelPendingCompaction();

    // Process incremental updates with performance monitoring
    const startTime = performance.now();
    try {
      await this.updateRollupsIncremental(eventType, eventData);
      const computationTime = performance.now() - startTime;
      this.recordComputationTime(computationTime);
      
      // Check if we exceeded performance limits
      if (this.checkPerformanceViolation(computationTime)) {
        this.handlePerformanceViolation();
      }
    } catch (error) {
      this.recordError();
      console.warn('Failed to process event for rollups:', error);
      
      if (this.shouldThrottle()) {
        this.enableThrottling();
      }
    }

    // Schedule compaction during idle time
    this.scheduleIdleCompaction();
  }

  // Force a full rebuild of all rollups
  async rebuildAllRollups(forceVersionBump = false): Promise<void> {
    if (forceVersionBump) {
      this.config.aggVersion++;
    }

    const events = await this.storage.getEvents();
    const metrics = this.calculateMetricsFromEvents(events);

    await this.saveAllRollups(metrics, this.config.aggVersion);
  }

  // Get comprehensive analytics metrics
  async getAnalytics(): Promise<RollupMetrics> {
    // Try to get from rollups first
    const cachedMetrics = await this.getMetricsFromRollups();
    
    if (cachedMetrics && this.areRollupsFresh()) {
      return cachedMetrics;
    }

    // Fall back to calculating from events
    const events = await this.storage.getEvents();
    return this.calculateMetricsFromEvents(events);
  }

  // Get extended time frame analytics
  async getExtendedAnalytics(): Promise<{
    last7Days: RollupMetrics;
    last30Days: RollupMetrics;
    last90Days: RollupMetrics;
    yearToDate: RollupMetrics;
    allTime: RollupMetrics;
  }> {
    const now = Date.now();
    const cutoff7d = now - (7 * 24 * 60 * 60 * 1000);
    const cutoff30d = now - (30 * 24 * 60 * 60 * 1000);
    const cutoff90d = now - (90 * 24 * 60 * 60 * 1000);
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1).getTime();

    const events = await this.storage.getEvents();
    const studySessions = events.filter(e => e.type.startsWith('study_session'));

    return {
      last7Days: this.calculateMetricsFromEvents(
        studySessions.filter(e => e.timestamp >= cutoff7d)
      ),
      last30Days: this.calculateMetricsFromEvents(
        studySessions.filter(e => e.timestamp >= cutoff30d)
      ),
      last90Days: this.calculateMetricsFromEvents(
        studySessions.filter(e => e.timestamp >= cutoff90d)
      ),
      yearToDate: this.calculateMetricsFromEvents(
        studySessions.filter(e => e.timestamp >= yearStart)
      ),
      allTime: this.calculateMetricsFromEvents(studySessions)
    };
  }

  // Performance monitoring
  async getRollupStats(): Promise<{
    totalRollups: number;
    avgComputationTime: number;
    lastCompaction: CompactionStats | null;
    storageEfficiency: number; // 0-1 ratio of compressed size
  }> {
    // Implementation would track actual performance metrics
    return {
      totalRollups: 0,
      avgComputationTime: 0,
      lastCompaction: null,
      storageEfficiency: 0.8
    };
  }

  // Advanced analytics patterns
  async getStudyPatterns(): Promise<{
    mostProductiveHours: Array<{ hour: number; duration: number }>;
    weeklyPatterns: Record<string, number>; // dayOfWeek -> total duration
    monthlyTrends: Array<{ month: string; duration: number; trend: 'up' | 'down' | 'stable' }>;
    subjectEfficiency: Record<string, { avgRating: number; avgDuration: number; sessions: number }>;
    consistency: {
      dailyAverage: number;
      weeklyAverage: number;
      improvementTrend: 'improving' | 'declining' | 'stable';
    };
  }> {
    const events = await this.storage.getEvents();
    const studySessions = events.filter(e => e.type.startsWith('study_session'));
    
    if (studySessions.length === 0) {
      return {
        mostProductiveHours: [],
        weeklyPatterns: {},
        monthlyTrends: [],
        subjectEfficiency: {},
        consistency: {
          dailyAverage: 0,
          weeklyAverage: 0,
          improvementTrend: 'stable'
        }
      };
    }

    // Most productive hours
    const hourlyData: Record<number, number> = {};
    studySessions.forEach(session => {
      const data = session.data as StudyEventData;
      const hour = new Date(data.startTime).getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + data.duration;
    });
    const mostProductiveHours = Object.entries(hourlyData)
      .map(([hour, duration]) => ({ hour: parseInt(hour), duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 6);

    // Weekly patterns
    const weeklyPatterns: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    studySessions.forEach(session => {
      const data = session.data as StudyEventData;
      const dayOfWeek = dayNames[new Date(data.startTime).getDay()];
      weeklyPatterns[dayOfWeek] = (weeklyPatterns[dayOfWeek] || 0) + data.duration;
    });

    // Monthly trends
    const monthlyData: Record<string, number> = {};
    studySessions.forEach(session => {
      const data = session.data as StudyEventData;
      const month = new Date(data.startTime).toISOString().substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + data.duration;
    });
    const monthlyTrends = Object.entries(monthlyData)
      .map(([month, duration]) => ({ month, duration }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item, index, array) => {
        if (index === 0) return { ...item, trend: 'stable' as const };
        const prevDuration = array[index - 1].duration;
        const change = ((item.duration - prevDuration) / prevDuration) * 100;
        return {
          ...item,
          trend: change > 5 ? 'up' as const : change < -5 ? 'down' as const : 'stable' as const
        };
      });

    // Subject efficiency
    const subjectStats: Record<string, { ratings: number[]; durations: number[] }> = {};
    studySessions.forEach(session => {
      const data = session.data as StudyEventData;
      const subject = data.subject;
      if (!subjectStats[subject]) {
        subjectStats[subject] = { ratings: [], durations: [] };
      }
      subjectStats[subject].ratings.push(data.rating || 3);
      subjectStats[subject].durations.push(data.duration);
    });
    const subjectEfficiency: Record<string, any> = {};
    Object.entries(subjectStats).forEach(([subject, stats]) => {
      subjectEfficiency[subject] = {
        avgRating: stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length,
        avgDuration: stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length,
        sessions: stats.ratings.length
      };
    });

    // Consistency analysis
    const dailyTotals = this.calculateTimeTotals(studySessions, 'day');
    const weeklyTotals = this.calculateTimeTotals(studySessions, 'week');
    const dailyAverage = Object.values(dailyTotals).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(dailyTotals).length);
    const weeklyAverage = Object.values(weeklyTotals).reduce((a, b) => a + b, 0) / Math.max(1, Object.keys(weeklyTotals).length);
    
    // Calculate improvement trend
    const sortedWeeks = Object.entries(weeklyTotals).sort((a, b) => a[0].localeCompare(b[0]));
    let improvementTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (sortedWeeks.length >= 4) {
      const recent = sortedWeeks.slice(-2).reduce((sum, [_, duration]) => sum + duration, 0);
      const earlier = sortedWeeks.slice(-4, -2).reduce((sum, [_, duration]) => sum + duration, 0);
      const change = ((recent - earlier) / earlier) * 100;
      improvementTrend = change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable';
    }

    return {
      mostProductiveHours,
      weeklyPatterns,
      monthlyTrends,
      subjectEfficiency,
      consistency: {
        dailyAverage,
        weeklyAverage,
        improvementTrend
      }
    };
  }

  // Private methods

  private async updateRollupsIncremental(eventType: string, eventData: EventData): Promise<void> {
    const now = Date.now();
    
    // Only process study session events for rollups
    if (!eventType.startsWith('study_session')) {
      return;
    }

    const session = eventData as StudyEventData;
    const date = new Date(session.startTime).toISOString().split('T')[0];
    const week = this.getWeekNumber(new Date(session.startTime));
    const month = date.substring(0, 7); // YYYY-MM

    // Update daily rollup
    await this.incrementRollup('day', date, 'duration', session.duration);
    await this.incrementRollup('day', date, 'count', 1);

    // Update weekly rollup
    await this.incrementRollup('week', week, 'duration', session.duration);
    await this.incrementRollup('week', week, 'count', 1);

    // Update monthly rollup
    await this.incrementRollup('month', month, 'duration', session.duration);
    await this.incrementRollup('month', month, 'count', 1);

    // Update subject-specific rollups
    await this.incrementRollup('day', date, `subject_${session.subject}`, session.duration);
    await this.incrementRollup('week', week, `subject_${session.subject}`, session.duration);
    await this.incrementRollup('month', month, `subject_${session.subject}`, session.duration);

    // Update heatmap
    const hour = new Date(session.startTime).getHours();
    await this.incrementRollup('day', date, `hour_${hour}`, session.duration);
  }

  private async incrementRollup(
    period: 'day' | 'week' | 'month',
    key: string,
    type: string,
    value: number
  ): Promise<void> {
    const rollupId = `${period}_${key}_${type}`;
    
    try {
      const existing = await this.storage.getRollups(period, key);
      const matchingRollup = existing.find(r => r.id === rollupId);

      if (matchingRollup) {
        // Update existing rollup
        matchingRollup.value += value;
        matchingRollup.timestamp = Date.now();
        await this.storage.saveRollup({
          ...matchingRollup,
          period,
          subject: key,
          type: type as any,
          metadata: matchingRollup.metadata,
          aggVersion: this.config.aggVersion
        });
      } else {
        // Create new rollup
        await this.storage.saveRollup({
          period,
          subject: key,
          type: type as any,
          value,
          metadata: {},
          aggVersion: this.config.aggVersion
        });
      }
    } catch (error) {
      console.warn(`Failed to increment rollup ${rollupId}:`, error);
    }
  }

  private async saveAllRollups(metrics: RollupMetrics, version: number): Promise<void> {
    const promises: Promise<void>[] = [];

    // Save daily totals
    Object.entries(metrics.dailyTotals).forEach(([date, duration]) => {
      promises.push(this.storage.saveRollup({
        period: 'day',
        subject: date,
        type: 'duration',
        value: duration,
        metadata: { sessionCount: 1 },
        aggVersion: version
      }));

      promises.push(this.storage.saveRollup({
        period: 'day',
        subject: date,
        type: 'count',
        value: 1,
        metadata: {},
        aggVersion: version
      }));
    });

    // Save weekly totals
    Object.entries(metrics.weeklyTotals).forEach(([week, duration]) => {
      promises.push(this.storage.saveRollup({
        period: 'week',
        subject: week,
        type: 'duration',
        value: duration,
        metadata: {},
        aggVersion: version
      }));
    });

    // Save monthly totals
    Object.entries(metrics.monthlyTotals).forEach(([month, duration]) => {
      promises.push(this.storage.saveRollup({
        period: 'month',
        subject: month,
        type: 'duration',
        value: duration,
        metadata: {},
        aggVersion: version
      }));
    });

    // Save extended rollups
    Object.entries(metrics.extendedTotals).forEach(([period, duration]) => {
      promises.push(this.storage.saveRollup({
        period: period as any,
        subject: 'all',
        type: 'duration',
        value: duration,
        metadata: {},
        aggVersion: version
      }));
    });

    await Promise.all(promises);
  }

  private calculateMetricsFromEvents(events: EventRecord[]): RollupMetrics {
    // Filter study sessions
    const studySessions = events.filter(e => e.type.startsWith('study_session'));
    
    if (studySessions.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalDuration = studySessions.reduce((sum, e) => sum + (e.data as StudyEventData).duration, 0);
    const totalSessions = studySessions.length;
    const averageSessionLength = totalDuration / totalSessions;

    // Subject breakdown
    const subjectBreakdown: Record<string, number> = {};
    studySessions.forEach(e => {
      const data = e.data as StudyEventData;
      const subject = data.subject;
      subjectBreakdown[subject] = (subjectBreakdown[subject] || 0) + data.duration;
    });

    // Time-based totals
    const dailyTotals = this.calculateTimeTotals(studySessions, 'day');
    const weeklyTotals = this.calculateTimeTotals(studySessions, 'week');
    const monthlyTotals = this.calculateTimeTotals(studySessions, 'month');
    const extendedTotals = this.calculateExtendedTotals(studySessions);

    // Heatmap
    const heatmap = this.calculateHeatmap(studySessions);

    // Session length distribution
    const sessionLengthDistribution = {
      short: studySessions.filter(e => (e.data as StudyEventData).duration < 30).length,
      medium: studySessions.filter(e => (e.data as StudyEventData).duration >= 30 && (e.data as StudyEventData).duration <= 120).length,
      long: studySessions.filter(e => (e.data as StudyEventData).duration > 120).length
    };

    // Consistency score
    const consistencyScore = this.calculateConsistencyScore(studySessions);

    // Top study days
    const topStudyDays = Object.entries(dailyTotals)
      .map(([date, duration]) => ({ date, duration }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Study streaks
    const studyStreaks = this.calculateStudyStreaks(studySessions);

    return {
      totalDuration,
      totalSessions,
      averageSessionLength,
      subjectBreakdown,
      dailyTotals,
      weeklyTotals,
      monthlyTotals,
      extendedTotals,
      heatmap,
      sessionLengthDistribution,
      consistencyScore,
      topStudyDays,
      studyStreaks
    };
  }

  private calculateTimeTotals(events: EventRecord[], period: 'day' | 'week' | 'month'): Record<string, number> {
    const totals: Record<string, number> = {};
    
    events.forEach(e => {
      const data = e.data as StudyEventData;
      const date = new Date(data.startTime);
      let key: string;
      
      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          key = this.getWeekNumber(date);
          break;
        case 'month':
          key = date.toISOString().substring(0, 7); // YYYY-MM
          break;
      }
      
      totals[key] = (totals[key] || 0) + data.duration;
    });
    
    return totals;
  }

  private calculateExtendedTotals(events: EventRecord[]): Record<string, number> {
    const now = Date.now();
    const cutoffs = {
      '7d': now - (7 * 24 * 60 * 60 * 1000),
      '30d': now - (30 * 24 * 60 * 60 * 1000),
      '90d': now - (90 * 24 * 60 * 60 * 1000)
    };

    const totals: Record<string, number> = {};
    
    Object.entries(cutoffs).forEach(([period, cutoff]) => {
      totals[period] = events
        .filter(e => (e.data as StudyEventData).startTime >= cutoff)
        .reduce((sum, e) => sum + (e.data as StudyEventData).duration, 0);
    });

    return totals;
  }

  private calculateHeatmap(events: EventRecord[]): Record<number, number> {
    const heatmap: Record<number, number> = {};
    
    events.forEach(e => {
      const data = e.data as StudyEventData;
      const startHour = new Date(data.startTime).getHours();
      const endHour = new Date(data.endTime).getHours();
      const duration = data.duration;
      
      // Handle sessions that span multiple hours
      if (startHour === endHour) {
        // Single hour session
        heatmap[startHour] = (heatmap[startHour] || 0) + duration;
      } else {
        // Multi-hour session - distribute duration proportionally
        const totalHours = endHour - startHour + 1;
        const minutesPerHour = duration / totalHours;
        
        for (let hour = startHour; hour <= endHour; hour++) {
          const hourKey = hour % 24;
          heatmap[hourKey] = (heatmap[hourKey] || 0) + minutesPerHour;
        }
      }
    });
    
    return heatmap;
  }

  private calculateConsistencyScore(events: EventRecord[]): number {
    if (events.length === 0) return 0;
    
    // Simple consistency based on ratings and regularity
    const avgRating = events.reduce((sum, e) => sum + ((e.data as StudyEventData).rating || 3), 0) / events.length;
    const ratingScore = avgRating / 5; // Normalize to 0-1
    
    // Check for regular study patterns
    const studyDays = new Set(events.map(e => new Date((e.data as StudyEventData).startTime).toDateString()));
    const totalDays = Math.max(1, (Date.now() - Math.min(...events.map(e => (e.data as StudyEventData).startTime))) / (24 * 60 * 60 * 1000));
    const regularityScore = studyDays.size / totalDays;
    
    return (ratingScore + regularityScore) / 2;
  }

  private calculateStudyStreaks(events: EventRecord[]): { current: number; longest: number } {
    if (events.length === 0) return { current: 0, longest: 0 };
    
    // Group by date
    const studyDays = new Set(
      events.map(e => new Date((e.data as StudyEventData).startTime).toDateString())
    );
    
    // Calculate streaks
    const sortedDates = Array.from(studyDays)
      .map(date => new Date(date))
      .sort((a, b) => a.getTime() - b.getTime());
    
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate: Date | null = null;
    
    for (const date of sortedDates) {
      if (!lastDate) {
        currentStreak = 1;
      } else {
        const daysDiff = Math.floor((date.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysDiff === 1) {
          currentStreak++;
        } else {
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      }
      
      lastDate = date;
    }
    
    longestStreak = Math.max(longestStreak, currentStreak);
    
    return { current: currentStreak, longest: longestStreak };
  }

  private async getMetricsFromRollups(): Promise<RollupMetrics | null> {
    try {
      // This would implement reading from cached rollups
      // For now, return null to force calculation from events
      return null;
    } catch (error) {
      console.warn('Failed to get metrics from rollups:', error);
      return null;
    }
  }

  private areRollupsFresh(): boolean {
    // Check if rollups are recent enough
    return false; // For now, always recalculate
  }

  private getEmptyMetrics(): RollupMetrics {
    return {
      totalDuration: 0,
      totalSessions: 0,
      averageSessionLength: 0,
      subjectBreakdown: {},
      dailyTotals: {},
      weeklyTotals: {},
      monthlyTotals: {},
      extendedTotals: {},
      heatmap: {},
      sessionLengthDistribution: { short: 0, medium: 0, long: 0 },
      consistencyScore: 0,
      topStudyDays: [],
      studyStreaks: { current: 0, longest: 0 }
    };
  }

  private getWeekNumber(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil(dayOfYear / 7);
    return `${d.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  }

  private setupActivityTracking(): void {
    // Track user activity to schedule compaction during idle time
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const activityHandler = () => {
      this.lastActivity = Date.now();
      this.cancelPendingCompaction();
      this.scheduleIdleCompaction();
    };
    
    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });
  }

  private scheduleIdleCompaction(): void {
    if (!this.config.compactionEnabled) {
      return;
    }

    this.cancelPendingCompaction();

    const idleTime = Date.now() - this.lastActivity;
    const timeUntilCompaction = Math.max(0, this.config.compactionThreshold - idleTime);

    this.compactionTimer = setTimeout(() => {
      this.performIdleCompaction();
    }, timeUntilCompaction);
  }

  private cancelPendingCompaction(): void {
    if (this.compactionTimer) {
      clearTimeout(this.compactionTimer);
      this.compactionTimer = null;
    }
  }

  private async performIdleCompaction(): Promise<void> {
    try {
      console.log('Starting idle compaction...');
      const startTime = Date.now();

      // Compact old rollups
      const compacted = await this.compactOldRollups();
      
      // Rebuild stale rollups
      const rebuilt = await this.rebuildStaleRollups();

      const duration = Date.now() - startTime;
      console.log(`Idle compaction completed in ${duration}ms. Compacted: ${compacted}, Rebuilt: ${rebuilt}`);

      // Schedule next compaction
      this.scheduleIdleCompaction();
    } catch (error) {
      console.warn('Idle compaction failed:', error);
      this.scheduleIdleCompaction();
    }
  }

  private async compactOldRollups(): Promise<number> {
    // Implementation would remove or merge old rollups
    return 0;
  }

  private async rebuildStaleRollups(): Promise<number> {
    // Implementation would rebuild rollups with outdated aggVersion
    return 0;
  }

  // Public utility methods
  async forceCompaction(): Promise<void> {
    this.cancelPendingCompaction();
    await this.performIdleCompaction();
  }

  updateConfig(newConfig: Partial<RollupConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.aggVersion !== undefined && newConfig.aggVersion > this.config.aggVersion) {
      // Force rebuild with new version
      this.rebuildAllRollups();
    }
  }

  destroy(): void {
    this.cancelPendingCompaction();
  }

  // Performance monitoring methods
  private setupPerformanceMonitoring(): void {
    // Monitor memory usage periodically
    setInterval(() => {
      this.recordMemoryUsage();
      this.cleanupOldMetrics();
    }, 60000); // Every minute
  }

  private recordComputationTime(time: number): void {
    this.performanceMetrics.computationTimes.push(time);
    // Keep only last 100 measurements
    if (this.performanceMetrics.computationTimes.length > 100) {
      this.performanceMetrics.computationTimes = this.performanceMetrics.computationTimes.slice(-100);
    }
  }

  private recordMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize && memory.totalJSHeapSize) {
        const usageMB = memory.usedJSHeapSize / (1024 * 1024);
        this.performanceMetrics.memoryUsage.push(usageMB);
        if (this.performanceMetrics.memoryUsage.length > 100) {
          this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage.slice(-100);
        }
      }
    }
  }

  private recordError(): void {
    const now = Date.now();
    this.performanceMetrics.errorRates.push(now);
    // Keep only errors from last hour
    const oneHourAgo = now - 3600000;
    this.performanceMetrics.errorRates = this.performanceMetrics.errorRates.filter(time => time > oneHourAgo);
  }

  private checkPerformanceViolation(computationTime: number): boolean {
    return computationTime > this.guardrails.maxComputationTime;
  }

  private shouldThrottle(): boolean {
    const recentErrors = this.performanceMetrics.errorRates.length;
    const errorRate = recentErrors / Math.max(1, this.performanceMetrics.computationTimes.length);
    return errorRate > this.guardrails.maxErrorRate;
  }

  private enableThrottling(): void {
    this.isThrottled = true;
    this.throttleUntil = Date.now() + (30000 * this.guardrails.backoffMultiplier); // 30s * backoff
    console.warn(`Rollup processing throttled until ${new Date(this.throttleUntil).toISOString()}`);
  }

  private handlePerformanceViolation(): void {
    // Disable incremental updates temporarily
    this.config.incremental = false;
    
    // Schedule re-enable after cooldown
    setTimeout(() => {
      this.config.incremental = true;
      this.isThrottled = false;
    }, 60000); // 1 minute cooldown
    
    console.warn('Performance violation detected, temporarily disabling incremental updates');
  }

  private cleanupOldMetrics(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.performanceMetrics.computationTimes = this.performanceMetrics.computationTimes
      .filter((_, index) => this.performanceMetrics.lastCheck - oneHourAgo > 0);
    this.performanceMetrics.memoryUsage = this.performanceMetrics.memoryUsage
      .filter((_, index) => this.performanceMetrics.lastCheck - oneHourAgo > 0);
  }

  // Public performance monitoring methods
  async getPerformanceStatus(): Promise<{
    isThrottled: boolean;
    throttleUntil: number;
    avgComputationTime: number;
    avgMemoryUsage: number;
    errorRate: number;
    guardrailsStatus: {
      computationTime: 'ok' | 'warning' | 'critical';
      memoryUsage: 'ok' | 'warning' | 'critical';
      errorRate: 'ok' | 'warning' | 'critical';
    };
  }> {
    const avgComputationTime = this.performanceMetrics.computationTimes.length > 0
      ? this.performanceMetrics.computationTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.computationTimes.length
      : 0;
    
    const avgMemoryUsage = this.performanceMetrics.memoryUsage.length > 0
      ? this.performanceMetrics.memoryUsage.reduce((a, b) => a + b, 0) / this.performanceMetrics.memoryUsage.length
      : 0;
    
    const recentErrors = this.performanceMetrics.errorRates.length;
    const errorRate = recentErrors / Math.max(1, this.performanceMetrics.computationTimes.length);

    const guardrailsStatus = {
      computationTime: avgComputationTime < this.guardrails.maxComputationTime * 0.7 ? 'ok' as const :
                       avgComputationTime < this.guardrails.maxComputationTime * 0.9 ? 'warning' as const : 'critical' as const,
      memoryUsage: avgMemoryUsage < this.guardrails.maxMemoryUsage * 0.7 ? 'ok' as const :
                   avgMemoryUsage < this.guardrails.maxMemoryUsage * 0.9 ? 'warning' as const : 'critical' as const,
      errorRate: errorRate < this.guardrails.maxErrorRate * 0.7 ? 'ok' as const :
                errorRate < this.guardrails.maxErrorRate * 0.9 ? 'warning' as const : 'critical' as const
    };

    return {
      isThrottled: this.isThrottled,
      throttleUntil: this.throttleUntil,
      avgComputationTime,
      avgMemoryUsage,
      errorRate,
      guardrailsStatus
    };
  }

  updateGuardrails(newGuardrails: Partial<PerformanceGuardrails>): void {
    this.guardrails = { ...this.guardrails, ...newGuardrails };
  }

  resetPerformanceMetrics(): void {
    this.performanceMetrics = {
      computationTimes: [],
      memoryUsage: [],
      errorRates: [],
      lastCheck: Date.now()
    };
    this.isThrottled = false;
    this.throttleUntil = 0;
  }
}

export { HybridRollupManager, type RollupMetrics, type RollupConfig };