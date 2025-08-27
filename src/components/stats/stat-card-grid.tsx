
import React from 'react';
import {
  Target,
  CheckCircle,
  Clock,
  Flame,
  Award,
  Activity,
  Star,
  Zap,
} from 'lucide-react';
import {StatCard} from './stat-card';

const getTitleCase = (str: string) => {
    if (str === 'overall') return 'Overall';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

interface StatCardGridProps {
  timeRange: string;
  timeRangeStats: any;
  badgeStats: any;
  studyStreak: number;
  isLoaded: boolean;
}

export function StatCardGrid({
  timeRange,
  timeRangeStats,
  badgeStats,
  studyStreak,
  isLoaded,
}: StatCardGridProps) {
  const timeRangeLabel = getTitleCase(timeRange);

  const statCards = [
    {
      title: `Points (${timeRangeLabel})`,
      value: timeRangeStats.totalPoints,
      unit: 'pts',
      Icon: Star,
    },
    {
      title: `Time (${timeRangeLabel})`,
      value: timeRangeStats.totalHours,
      unit: 'hours',
      Icon: Clock,
    },
    {
      title: `Focus (${timeRangeLabel})`,
      value: timeRangeStats.focusScore.toFixed(0),
      unit: '%',
      Icon: Zap,
    },
    {
      title: `Task Rate (${timeRangeLabel})`,
      value: timeRangeStats.completionRate.toFixed(0),
      unit: '%',
      Icon: Target,
    },
    {
      title: `Sessions (${timeRangeLabel})`,
      value: timeRangeStats.completedCount,
      Icon: CheckCircle,
    },
    {title: 'Badges Earned', value: badgeStats.earnedCount, Icon: Award},
    {title: 'Current Streak', value: studyStreak, unit: 'days', Icon: Flame},
    {
      title: `Avg. Session (${timeRangeLabel})`,
      value: timeRangeStats.avgSessionDuration,
      unit: 'min',
      Icon: Activity,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {statCards.map(stat => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          unit={stat.unit}
          Icon={stat.Icon}
          isLoaded={isLoaded}
        />
      ))}
    </section>
  );
}
