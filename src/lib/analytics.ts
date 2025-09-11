import { db, DailyRollup, WeeklyRollup, MonthlyRollup, AppEvent, StudySessionEvent } from './database';

// Advanced analytics engine with offline computation
export class AdvancedAnalyticsEngine {
  private cache: Map<string, AnalyticsCache> = new Map();
  private compactionInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCompactionInterval();
  }

  // Main analytics computation method
  async computeAnalytics(timeRange: TimeRange, metrics: MetricType[]): Promise<AnalyticsResult> {
    const cacheKey = this.getCacheKey(timeRange, metrics);
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isCacheExpired(cached)) {
      return cached.data;
    }

    // Compute analytics
    const result = await this.computeAnalyticsInternal(timeRange, metrics);
    
    // Cache result
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      timeRange,
      metrics
    });

    return result;
  }

  private async computeAnalyticsInternal(timeRange: TimeRange, metrics: MetricType[]): Promise<AnalyticsResult> {
    const startDate = this.getStartDate(timeRange);
    const endDate = this.getEndDate(timeRange);

    const events = await db.getEvents({
      startDate: startDate.getTime(),
      endDate: endDate.getTime()
    });

    const result: AnalyticsResult = {
      timeRange,
      computedAt: Date.now(),
      metrics: {}
    };

    for (const metric of metrics) {
      switch (metric) {
        case 'total_study_time':
          result.metrics.total_study_time = this.computeTotalStudyTime(events);
          break;
        case 'session_count':
          result.metrics.session_count = this.computeSessionCount(events);
          break;
        case 'average_session_length':
          result.metrics.average_session_length = this.computeAverageSessionLength(events);
          break;
        case 'subject_distribution':
          result.metrics.subject_distribution = this.computeSubjectDistribution(events);
          break;
        case 'hourly_heatmap':
          result.metrics.hourly_heatmap = this.computeHourlyHeatmap(events, timeRange);
          break;
        case 'streak_analysis':
          result.metrics.streak_analysis = this.computeStreakAnalysis(events);
          break;
        case 'consistency_score':
          result.metrics.consistency_score = this.computeConsistencyScore(events);
          break;
        case 'session_length_distribution':
          result.metrics.session_length_distribution = this.computeSessionLengthDistribution(events);
          break;
        case 'subject_drift':
          result.metrics.subject_drift = this.computeSubjectDrift(events);
          break;
        case 'anomaly_detection':
          result.metrics.anomaly_detection = this.detectAnomalies(events);
          break;
        case 'productivity_trends':
          result.metrics.productivity_trends = this.computeProductivityTrends(events);
          break;
      }
    }

    return result;
  }

  // Individual metric computations
  private computeTotalStudyTime(events: AppEvent[]): number {
    return events
      .filter(e => e.type === 'study_session_created')
      .reduce((total, event) => total + (event as StudySessionEvent).data.duration, 0);
  }

  private computeSessionCount(events: AppEvent[]): number {
    return events.filter(e => e.type === 'study_session_created').length;
  }

  private computeAverageSessionLength(events: AppEvent[]): number {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    if (sessionEvents.length === 0) return 0;
    
    const totalTime = sessionEvents.reduce((total, event) => total + event.data.duration, 0);
    return totalTime / sessionEvents.length;
  }

  private computeSubjectDistribution(events: AppEvent[]): Record<string, number> {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    const distribution: Record<string, number> = {};
    
    for (const event of sessionEvents) {
      const subject = event.data.subject;
      distribution[subject] = (distribution[subject] || 0) + event.data.duration;
    }
    
    return distribution;
  }

  private computeHourlyHeatmap(events: AppEvent[], timeRange: TimeRange): Array<{ hour: number; value: number }> {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    const heatmap = Array.from({ length: 24 }, (_, hour) => ({ hour, value: 0 }));
    
    for (const event of sessionEvents) {
      const hour = new Date(event.timestamp).getHours();
      heatmap[hour].value += event.data.duration;
    }
    
    return heatmap;
  }

  private computeStreakAnalysis(events: AppEvent[]): StreakAnalysis {
    const sessionEvents = events
      .filter(e => e.type === 'study_session_created')
      .map(e => new Date(e.timestamp).toDateString())
      .filter((date, index, arr) => arr.indexOf(date) === index)
      .sort();

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sessionEvents.length; i++) {
      const currentDate = new Date(sessionEvents[i]);
      const prevDate = i > 0 ? new Date(sessionEvents[i - 1]) : null;

      if (prevDate && (currentDate.getTime() - prevDate.getTime()) === 24 * 60 * 60 * 1000) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }

      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
    }

    // Check if current streak is active
    const today = new Date().toDateString();
    const lastStudyDate = sessionEvents[sessionEvents.length - 1];
    currentStreak = lastStudyDate === today ? tempStreak : 0;

    return {
      currentStreak,
      bestStreak,
      totalDaysWithStudy: sessionEvents.length
    };
  }

  private computeConsistencyScore(events: AppEvent[]): number {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    
    if (sessionEvents.length === 0) return 0;

    // Factors for consistency score
    const frequencyScore = Math.min(sessionEvents.length / 30, 1) * 40; // 40% weight
    const durationScore = Math.min(this.computeTotalStudyTime(events) / (30 * 60 * 60 * 1000), 1) * 30; // 30% weight
    const regularityScore = this.computeRegularityScore(sessionEvents) * 30; // 30% weight

    return Math.round(frequencyScore + durationScore + regularityScore);
  }

  private computeRegularityScore(sessionEvents: StudySessionEvent[]): number {
    if (sessionEvents.length < 3) return 0;

    // Group sessions by hour of day
    const hourDistribution: Record<number, number> = {};
    for (const event of sessionEvents) {
      const hour = new Date(event.timestamp).getHours();
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    }

    // Calculate standard deviation of study times
    const hours = Object.keys(hourDistribution).map(Number);
    const mean = hours.reduce((sum, hour) => sum + hour * hourDistribution[hour], 0) / sessionEvents.length;
    
    const variance = hours.reduce((sum, hour) => {
      return sum + Math.pow(hour - mean, 2) * hourDistribution[hour];
    }, 0) / sessionEvents.length;
    
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher regularity
    return Math.max(0, 100 - stdDev * 10);
  }

  private computeSessionLengthDistribution(events: AppEvent[]): Array<{ range: string; count: number }> {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    
    const ranges = [
      { min: 0, max: 15 * 60 * 1000, label: '0-15 min' },
      { min: 15 * 60 * 1000, max: 30 * 60 * 1000, label: '15-30 min' },
      { min: 30 * 60 * 1000, max: 60 * 60 * 1000, label: '30-60 min' },
      { min: 60 * 60 * 1000, max: 120 * 60 * 1000, label: '1-2 hours' },
      { min: 120 * 60 * 1000, max: Infinity, label: '2+ hours' }
    ];

    return ranges.map(range => ({
      range: range.label,
      count: sessionEvents.filter(e => e.data.duration >= range.min && e.data.duration < range.max).length
    }));
  }

  private computeSubjectDrift(events: AppEvent[]): SubjectDrift {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    
    if (sessionEvents.length < 7) {
      return { currentDrift: 0, trend: 'stable', subjects: {} };
    }

    // Sort events by timestamp
    const sortedEvents = sessionEvents.sort((a, b) => a.timestamp - b.timestamp);
    
    // Split into first half and second half
    const midPoint = Math.floor(sortedEvents.length / 2);
    const firstHalf = sortedEvents.slice(0, midPoint);
    const secondHalf = sortedEvents.slice(midPoint);

    // Compute subject distribution for each half
    const firstHalfDistribution = this.computeSubjectDistribution(firstHalf.map(e => ({ ...e, type: 'study_session_created' } as AppEvent)));
    const secondHalfDistribution = this.computeSubjectDistribution(secondHalf.map(e => ({ ...e, type: 'study_session_created' } as AppEvent)));

    // Calculate drift
    const allSubjects = new Set([...Object.keys(firstHalfDistribution), ...Object.keys(secondHalfDistribution)]);
    const drifts: Record<string, number> = {};

    for (const subject of allSubjects) {
      const firstTime = firstHalfDistribution[subject] || 0;
      const secondTime = secondHalfDistribution[subject] || 0;
      
      if (firstTime + secondTime > 0) {
        drifts[subject] = (secondTime - firstTime) / (firstTime + secondTime);
      }
    }

    const maxDrift = Math.max(...Object.values(drifts).map(Math.abs));
    const trend = maxDrift > 0.3 ? 'significant' : maxDrift > 0.1 ? 'moderate' : 'stable';

    return {
      currentDrift: maxDrift,
      trend,
      subjects: drifts
    };
  }

  private detectAnomalies(events: AppEvent[]): AnomalyDetection {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    
    if (sessionEvents.length < 5) {
      return { anomalies: [], anomalyScore: 0 };
    }

    const anomalies: Array<{
      type: 'duration' | 'frequency' | 'rating';
      severity: 'low' | 'medium' | 'high';
      description: string;
      eventId: string;
    }> = [];

    // Duration anomalies
    const durations = sessionEvents.map(e => e.data.duration);
    const meanDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const stdDevDuration = Math.sqrt(durations.reduce((sum, d) => sum + Math.pow(d - meanDuration, 2), 0) / durations.length);

    for (const event of sessionEvents) {
      const zScore = Math.abs((event.data.duration - meanDuration) / stdDevDuration);
      
      if (zScore > 2) {
        anomalies.push({
          type: 'duration',
          severity: zScore > 3 ? 'high' : 'medium',
          description: `Unusual session duration: ${Math.round(event.data.duration / 60000)} minutes`,
          eventId: event.id
        });
      }
    }

    // Frequency anomalies
    const dailySessionCounts = this.getDailySessionCounts(sessionEvents);
    const avgDailySessions = Array.from(dailySessionCounts.values()).reduce((sum, count) => sum + count, 0) / dailySessionCounts.size;
    
    for (const [date, count] of dailySessionCounts) {
      if (count > avgDailySessions * 2) {
        anomalies.push({
          type: 'frequency',
          severity: 'medium',
          description: `Unusually high study frequency on ${date}`,
          eventId: sessionEvents.find(e => new Date(e.timestamp).toDateString() === date)?.id || ''
        });
      }
    }

    return {
      anomalies,
      anomalyScore: anomalies.length > 0 ? 
        (anomalies.filter(a => a.severity === 'high').length * 3 + 
         anomalies.filter(a => a.severity === 'medium').length * 2 + 
         anomalies.filter(a => a.severity === 'low').length) : 0
    };
  }

  private computeProductivityTrends(events: AppEvent[]): ProductivityTrends {
    const sessionEvents = events.filter(e => e.type === 'study_session_created') as StudySessionEvent[];
    
    if (sessionEvents.length < 7) {
      return { trend: 'stable', change: 0, confidence: 0 };
    }

    // Group by week
    const weeklyData = this.groupByWeek(sessionEvents);
    
    if (weeklyData.length < 2) {
      return { trend: 'stable', change: 0, confidence: 0 };
    }

    // Calculate trend
    const firstWeek = weeklyData[0];
    const lastWeek = weeklyData[weeklyData.length - 1];
    const change = ((lastWeek.totalTime - firstWeek.totalTime) / firstWeek.totalTime) * 100;

    let trend: 'improving' | 'declining' | 'stable';
    if (change > 10) trend = 'improving';
    else if (change < -10) trend = 'declining';
    else trend = 'stable';

    // Calculate confidence based on consistency
    const confidence = this.calculateTrendConfidence(weeklyData);

    return { trend, change, confidence };
  }

  // Helper methods
  private getCacheKey(timeRange: TimeRange, metrics: MetricType[]): string {
    return `${timeRange.start}_${timeRange.end}_${metrics.join(',')}`;
  }

  private isCacheExpired(cache: AnalyticsCache): boolean {
    const cacheAge = Date.now() - cache.timestamp;
    return cacheAge > 5 * 60 * 1000; // 5 minutes
  }

  private getStartDate(timeRange: TimeRange): Date {
    return new Date(timeRange.start);
  }

  private getEndDate(timeRange: TimeRange): Date {
    return new Date(timeRange.end);
  }

  private getDailySessionCounts(sessionEvents: StudySessionEvent[]): Map<string, number> {
    const dailyCounts = new Map<string, number>();
    
    for (const event of sessionEvents) {
      const date = new Date(event.timestamp).toDateString();
      dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
    }
    
    return dailyCounts;
  }

  private groupByWeek(sessionEvents: StudySessionEvent[]): Array<{ week: string; totalTime: number; sessionCount: number }> {
    const weeklyData = new Map<string, { totalTime: number; sessionCount: number }>();
    
    for (const event of sessionEvents) {
      const date = new Date(event.timestamp);
      const weekStart = this.getWeekStartDate(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { totalTime: 0, sessionCount: 0 });
      }
      
      const weekData = weeklyData.get(weekKey)!;
      weekData.totalTime += event.data.duration;
      weekData.sessionCount += 1;
    }
    
    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }

  private getWeekStartDate(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  private calculateTrendConfidence(weeklyData: Array<{ totalTime: number }>): number {
    if (weeklyData.length < 3) return 0;
    
    const values = weeklyData.map(d => d.totalTime);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Lower standard deviation = higher confidence
    return Math.max(0, Math.min(100, 100 - (stdDev / mean) * 100));
  }

  private startCompactionInterval(): void {
    this.compactionInterval = setInterval(() => {
      this.compactCache();
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  private compactCache(): void {
    const now = Date.now();
    for (const [key, cache] of this.cache) {
      if (now - cache.timestamp > 30 * 60 * 1000) { // 30 minutes
        this.cache.delete(key);
      }
    }
  }

  // Public methods
  async getDashboardAnalytics(timeRange: TimeRange): Promise<DashboardAnalytics> {
    const result = await this.computeAnalytics(timeRange, [
      'total_study_time',
      'session_count',
      'average_session_length',
      'subject_distribution',
      'streak_analysis',
      'consistency_score',
      'productivity_trends'
    ]);

    return {
      totalStudyTime: result.metrics.total_study_time || 0,
      sessionCount: result.metrics.session_count || 0,
      averageSessionLength: result.metrics.average_session_length || 0,
      subjectDistribution: result.metrics.subject_distribution || {},
      currentStreak: result.metrics.streak_analysis?.currentStreak || 0,
      bestStreak: result.metrics.streak_analysis?.bestStreak || 0,
      consistencyScore: result.metrics.consistency_score || 0,
      productivityTrend: result.metrics.productivity_trends?.trend || 'stable'
    };
  }

  async getDetailedAnalytics(timeRange: TimeRange): Promise<DetailedAnalytics> {
    const result = await this.computeAnalytics(timeRange, [
      'hourly_heatmap',
      'session_length_distribution',
      'subject_drift',
      'anomaly_detection'
    ]);

    return {
      hourlyHeatmap: result.metrics.hourly_heatmap || [],
      sessionLengthDistribution: result.metrics.session_length_distribution || [],
      subjectDrift: result.metrics.subject_drift,
      anomalies: result.metrics.anomaly_detection?.anomalies || [],
      anomalyScore: result.metrics.anomaly_detection?.anomalyScore || 0
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  destroy(): void {
    if (this.compactionInterval) {
      clearInterval(this.compactionInterval);
    }
    this.clearCache();
  }
}

// Type definitions
export interface TimeRange {
  start: string; // ISO string
  end: string; // ISO string
}

export type MetricType = 
  | 'total_study_time'
  | 'session_count'
  | 'average_session_length'
  | 'subject_distribution'
  | 'hourly_heatmap'
  | 'streak_analysis'
  | 'consistency_score'
  | 'session_length_distribution'
  | 'subject_drift'
  | 'anomaly_detection'
  | 'productivity_trends';

export interface AnalyticsResult {
  timeRange: TimeRange;
  computedAt: number;
  metrics: Partial<Record<MetricType, any>>;
}

export interface AnalyticsCache {
  data: AnalyticsResult;
  timestamp: number;
  timeRange: TimeRange;
  metrics: MetricType[];
}

export interface StreakAnalysis {
  currentStreak: number;
  bestStreak: number;
  totalDaysWithStudy: number;
}

export interface SubjectDrift {
  currentDrift: number;
  trend: 'stable' | 'moderate' | 'significant';
  subjects: Record<string, number>;
}

export interface AnomalyDetection {
  anomalies: Array<{
    type: 'duration' | 'frequency' | 'rating';
    severity: 'low' | 'medium' | 'high';
    description: string;
    eventId: string;
  }>;
  anomalyScore: number;
}

export interface ProductivityTrends {
  trend: 'improving' | 'declining' | 'stable';
  change: number; // percentage
  confidence: number; // 0-100
}

export interface DashboardAnalytics {
  totalStudyTime: number;
  sessionCount: number;
  averageSessionLength: number;
  subjectDistribution: Record<string, number>;
  currentStreak: number;
  bestStreak: number;
  consistencyScore: number;
  productivityTrend: 'improving' | 'declining' | 'stable';
}

export interface DetailedAnalytics {
  hourlyHeatmap: Array<{ hour: number; value: number }>;
  sessionLengthDistribution: Array<{ range: string; count: number }>;
  subjectDrift?: SubjectDrift;
  anomalies: Array<{
    type: 'duration' | 'frequency' | 'rating';
    severity: 'low' | 'medium' | 'high';
    description: string;
    eventId: string;
  }>;
  anomalyScore: number;
}

// Global instance
let analyticsEngine: AdvancedAnalyticsEngine | null = null;

// Initialize analytics engine
export function initializeAnalyticsEngine(): AdvancedAnalyticsEngine {
  if (!analyticsEngine) {
    analyticsEngine = new AdvancedAnalyticsEngine();
  }
  return analyticsEngine;
}

// Get analytics engine instance
export function getAnalyticsEngine(): AdvancedAnalyticsEngine | null {
  return analyticsEngine;
}