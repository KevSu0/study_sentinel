'use client';

import { useTimezoneComparison } from '@/hooks/use-timezone-comparison';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Info } from 'lucide-react';

interface TimezoneComparisonToggleProps {
  className?: string;
}

export function TimezoneComparisonToggle({ className }: TimezoneComparisonToggleProps) {
  const { comparison, viewMode, setViewMode } = useTimezoneComparison();

  if (!comparison) {
    return null;
  }

  return (
    <div className={className}>
      {comparison.hasDifference && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Timezone boundary affects how daily totals are calculated.{' '}
            {viewMode === 'new' ? 'Currently showing IST (4 AM)' : 'Currently showing UTC (4 AM)'}.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">Timezone View:</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'new' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('new')}
            className="flex items-center gap-2"
          >
            New (IST)
            <Badge variant="secondary" className="text-xs">
              4:00 AM
            </Badge>
          </Button>

          <Button
            variant={viewMode === 'legacy' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('legacy')}
            className="flex items-center gap-2"
          >
            Legacy (UTC)
            <Badge variant="secondary" className="text-xs">
              4:00 AM
            </Badge>
          </Button>
        </div>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">
        Current boundary: {viewMode === 'new' ? comparison.newResult.studyDateLabel : comparison.legacyResult.studyDateLabel}
      </div>
    </div>
  );
}