'use client';

import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePerformanceMetrics, type PerformanceSnapshot, type PerformanceStatus } from '@/lib/performance-metrics';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<PerformanceStatus, string> = {
  good: 'Good',
  warning: 'Warning',
  critical: 'Critical',
  unknown: 'Unknown',
};

const STATUS_STYLES: Record<PerformanceStatus, string> = {
  good: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
  unknown: 'bg-slate-100 text-slate-600',
};

type MetricKey = 'fps' | 'longTasksPerSecond' | 'heapUsedPercentage';

type MetricDefinition = {
  key: MetricKey;
  label: string;
  description: string;
  format: (value: number | null) => string;
  status: (value: number | null) => PerformanceStatus;
};

const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: 'fps',
    label: 'Frame rate',
    description: 'Average frames per second over the last 5 seconds.',
    format: (value) => (value == null ? 'Unknown' : `${Math.round(value)} fps`),
    status: (value) => {
      if (value == null) return 'unknown';
      if (value >= 55) return 'good';
      if (value >= 40) return 'warning';
      return 'critical';
    },
  },
  {
    key: 'longTasksPerSecond',
    label: 'Long tasks',
    description: 'Long tasks per second measured over the last 5 seconds.',
    format: (value) => (value == null ? 'Unknown' : `${value.toFixed(1)} long tasks/s`),
    status: (value) => {
      if (value == null) return 'unknown';
      if (value <= 1) return 'good';
      if (value <= 4) return 'warning';
      return 'critical';
    },
  },
  {
    key: 'heapUsedPercentage',
    label: 'Heap usage',
    description: 'Estimated JavaScript heap usage.',
    format: (value) => (value == null ? 'Unknown' : `${Math.round(value)}% used`),
    status: (value) => {
      if (value == null) return 'unknown';
      if (value <= 60) return 'good';
      if (value <= 75) return 'warning';
      return 'critical';
    },
  },
];

export function PerformanceMonitor() {
  const { snapshot, refresh } = usePerformanceMetrics();
  const collectedAt = useMemo(() => new Date(snapshot.collectedAt), [snapshot.collectedAt]);

  return (
    <section aria-label="Performance monitor" className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Performance overview</h2>
          <p className="text-sm text-muted-foreground">
            Snapshot captured at {collectedAt.toLocaleTimeString()}.
          </p>
        </div>
        <Button variant="outline" onClick={refresh} aria-label="Refresh performance metrics">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh metrics
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {METRIC_DEFINITIONS.map((metric) => {
          const rawValue = snapshot[metric.key] as PerformanceSnapshot[MetricKey];
          const status = metric.status(rawValue);
          return (
            <Card key={metric.key} aria-label={`${metric.label} metric`}>
              <CardHeader className="space-y-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <Badge className={cn('w-fit', STATUS_STYLES[status])}>Status: {STATUS_LABELS[status]}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-semibold">{metric.format(rawValue)}</div>
                <CardDescription>{metric.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

