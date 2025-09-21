/**
 * Metric Dictionary v1.0.0
 *
 * This file defines all metrics calculated and displayed in the Stats page.
 * Version: 1.0.0
 * Last Updated: 2025-01-21
 */

export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  unit: string;
  formula: string;
  source: 'events' | 'tasks' | 'rollups' | 'derived';
  rounding: number;
  minValue?: number;
  maxValue?: number;
  version: '1.0.0';
  edgeCases: string[];
  example: string;
}

export const METRIC_DICTIONARY_V1: Record<string, MetricDefinition> = {
  // Time-based metrics
  totalHours: {
    id: 'totalHours',
    name: 'Total Hours',
    description: 'Total time spent studying in the selected time range',
    unit: 'hours',
    formula: 'sum(duration) / 3600',
    source: 'events',
    rounding: 1,
    minValue: 0,
    edgeCases: [
      'Returns 0 when no sessions exist',
      'Includes all session types (tasks and routines)',
      'Handles overlapping sessions by summing durations'
    ],
    example: '3 sessions of 30, 45, and 60 minutes = 2.3 hours',
    version: '1.0.0'
  },

  totalPoints: {
    id: 'totalPoints',
    name: 'Total Points',
    description: 'Total points earned from completed study sessions',
    unit: 'points',
    formula: 'sum(points)',
    source: 'events',
    rounding: 0,
    minValue: 0,
    edgeCases: [
      'Points calculated as duration in minutes',
      'No minimum session duration',
      'Bonus points not implemented in v1'
    ],
    example: '3 sessions of 30, 45, and 60 minutes = 135 points',
    version: '1.0.0'
  },

  completionRate: {
    id: 'completionRate',
    name: 'Completion Rate',
    description: 'Percentage of planned tasks that were completed',
    unit: 'percent',
    formula: '(completedTasks / totalTasks) * 100',
    source: 'tasks',
    rounding: 0,
    minValue: 0,
    maxValue: 100,
    edgeCases: [
      'Returns 0 when no tasks exist',
      'Excludes archived tasks',
      'Based on tasks, not sessions'
    ],
    example: '8 planned tasks, 6 completed = 75%',
    version: '1.0.0'
  },

  studyStreak: {
    id: 'studyStreak',
    name: 'Study Streak',
    description: 'Number of consecutive days with at least one study session',
    unit: 'days',
    formula: 'count_consecutive_days_with_activity',
    source: 'events',
    rounding: 0,
    minValue: 0,
    edgeCases: [
      'Grace period: 0 days (must study every 24 hours)',
      'Any activity counts (minimum 1 minute)',
      'Based on study day (04:00 IST boundary)',
      'Resets after 48 hours of inactivity'
    ],
    example: 'Studied Mon, Tue, Wed = 3 day streak',
    version: '1.0.0'
  },

  // Session metrics
  avgSessionDuration: {
    id: 'avgSessionDuration',
    name: 'Average Session Duration',
    description: 'Average length of study sessions in minutes',
    unit: 'minutes',
    formula: 'sum(duration) / count(sessions) / 60',
    source: 'events',
    rounding: 0,
    minValue: 0,
    edgeCases: [
      'Returns 0 when no sessions exist',
      'Includes all session types',
      'Not weighted by difficulty or subject'
    ],
    example: 'Sessions of 30, 60, 90 minutes = 60 minutes average',
    version: '1.0.0'
  },

  // Comparative metrics
  dailyComparison: {
    id: 'dailyComparison',
    name: 'Daily Comparison',
    description: "Today's stats compared to yesterday and averages",
    unit: 'composite',
    formula: '{today, yesterday, dailyAvg, weeklyAvg, monthlyAvg}',
    source: 'derived',
    rounding: 1,
    edgeCases: [
      'Yesterday returns empty if no data',
      'Averages include only days with activity',
      'Weekly average: last 7 days including today',
      'Monthly average: last 30 days including today'
    ],
    example: 'Today: 3.2h, Yesterday: 2.8h, Daily Avg: 2.5h',
    version: '1.0.0'
  },

  // Badge metrics
  badgeProgress: {
    id: 'badgeProgress',
    name: 'Badge Progress',
    description: 'Number of earned badges out of total available',
    unit: 'fraction',
    formula: 'earnedBadges / totalBadges',
    source: 'derived',
    rounding: 0,
    minValue: 0,
    maxValue: 100,
    edgeCases: [
      'Excludes disabled badges',
      'Includes both system and custom badges',
      'Based on badge evaluation at time of calculation'
    ],
    example: '8 earned out of 12 available = 67%',
    version: '1.0.0'
  },

  // Routine analysis
  routineStats: {
    id: 'routineStats',
    name: 'Routine Statistics',
    description: 'Breakdown of time spent by routine type',
    unit: 'composite',
    formula: 'group_by(routine_name).aggregate(sum(duration), count(sessions))',
    source: 'events',
    rounding: 1,
    edgeCases: [
      'Only includes sessions marked as routine type',
      'Excludes task sessions',
      'Multiple routines with same name are grouped'
    ],
    example: 'Pomodoro: 5 sessions, 2.5 hours total',
    version: '1.0.0'
  }
};

// Time range definitions
export interface TimeRangeDefinition {
  id: string;
  name: string;
  description: string;
  days: number;
  includesToday: boolean;
  boundary: 'calendar' | 'rolling' | 'study_day' | 'none';
}

export const TIME_RANGES: Record<string, TimeRangeDefinition> = {
  daily: {
    id: 'daily',
    name: 'Daily',
    description: 'Today\'s study activity',
    days: 1,
    includesToday: true,
    boundary: 'study_day' // 04:00 IST
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly',
    description: 'Last 7 days including today',
    days: 7,
    includesToday: true,
    boundary: 'rolling'
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    description: 'Last 30 days including today',
    days: 30,
    includesToday: true,
    boundary: 'rolling'
  },
  overall: {
    id: 'overall',
    name: 'Overall',
    description: 'All time data',
    days: 0, // Unlimited
    includesToday: true,
    boundary: 'none'
  }
};

// Chart data specifications
export interface ChartSpec {
  id: string;
  title: string;
  description: string;
  type: 'bar' | 'pie' | 'line' | 'timeline';
  xAxis: string;
  yAxis: string;
  aggregation: 'sum' | 'average' | 'count' | 'none';
  timeRangeSupport: string[];
}

export const CHART_SPECS: Record<string, ChartSpec> = {
  studyBreakdown: {
    id: 'studyBreakdown',
    title: 'Study Breakdown',
    description: 'Hours studied per period',
    type: 'bar',
    xAxis: 'time_period',
    yAxis: 'hours',
    aggregation: 'sum',
    timeRangeSupport: ['daily', 'weekly', 'monthly', 'overall']
  },
  subjectDistribution: {
    id: 'subjectDistribution',
    title: 'Subject Distribution',
    description: 'Time spent by subject/task',
    type: 'pie',
    xAxis: 'subject',
    yAxis: 'hours',
    aggregation: 'sum',
    timeRangeSupport: ['daily', 'weekly', 'monthly', 'overall']
  },
  dailyTimeline: {
    id: 'dailyTimeline',
    title: 'Daily Activity Timeline',
    description: 'Study sessions throughout the day',
    type: 'timeline',
    xAxis: 'time_of_day',
    yAxis: 'session',
    aggregation: 'none',
    timeRangeSupport: ['daily']
  }
};

// Helper functions
export function getMetricDefinition(id: string): MetricDefinition | undefined {
  return METRIC_DICTIONARY_V1[id];
}

export function validateMetricValue(metricId: string, value: number): boolean {
  const metric = METRIC_DICTIONARY_V1[metricId];
  if (!metric) return false;

  if (metric.minValue !== undefined && value < metric.minValue) return false;
  if (metric.maxValue !== undefined && value > metric.maxValue) return false;

  return true;
}

export function formatMetricValue(metricId: string, value: number): string {
  const metric = METRIC_DICTIONARY_V1[metricId];
  if (!metric) return value.toString();

  const roundedValue = Math.round(value * Math.pow(10, metric.rounding)) / Math.pow(10, metric.rounding);

  switch (metric.unit) {
    case 'percent':
      return `${roundedValue}%`;
    case 'hours':
      return `${roundedValue}h`;
    case 'minutes':
      return `${roundedValue}m`;
    case 'points':
      return `${roundedValue} pts`;
    case 'days':
      return `${roundedValue} day${roundedValue !== 1 ? 's' : ''}`;
    default:
      return roundedValue.toString();
  }
}

// Version tracking
export const METRICS_VERSION = '1.0.0';

// Migration function for future versions
export function migrateMetricsData(oldData: any, oldVersion: string, newVersion: string): any {
  // For v1.0.0, no migration needed yet
  return oldData;
}