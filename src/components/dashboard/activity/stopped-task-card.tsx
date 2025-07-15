
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { XCircle, Timer, AlertTriangle } from 'lucide-react';
import type { LogEvent } from '@/lib/types';

interface StoppedTaskCardProps {
  log: LogEvent;
}

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
};

export function StoppedTaskCard({ log }: StoppedTaskCardProps) {
  const { title, reason, timeSpentSeconds } = log.payload;

  return (
    <Card className="bg-card/60 dark:bg-card/80 border-l-4 border-amber-500">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="font-semibold">
            {title} (Stopped)
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Timer className="h-4 w-4" />
              Time spent: {formatDuration(timeSpentSeconds || 0)}
            </span>
          </div>
          {reason && (
             <div className="flex items-center gap-1.5 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Reason: {reason}
             </div>
          )}
        </div>
        <XCircle className="h-8 w-8 text-amber-500 shrink-0" />
      </CardContent>
    </Card>
  );
}

    