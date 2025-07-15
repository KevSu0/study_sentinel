
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Timer, Star } from 'lucide-react';
import type { LogEvent } from '@/lib/types';

interface CompletedRoutineCardProps {
  log: LogEvent;
}

const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    if (hours > 0) {
      return `${hours}h`;
    }
    return `${minutes}m`;
};


export function CompletedRoutineCard({ log }: CompletedRoutineCardProps) {
  const { title, duration, points } = log.payload;

  return (
    <Card className="bg-card/60 dark:bg-card/80 border-l-4 border-accent">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-muted-foreground line-through">
            {title} (Routine)
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Timer className="h-4 w-4" />
              Studied for {formatDuration(duration || 0)}
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-400" />
              {points || 0} pts earned
            </span>
          </div>
        </div>
        <CheckCircle className="h-8 w-8 text-accent shrink-0" />
      </CardContent>
    </Card>
  );
}

    