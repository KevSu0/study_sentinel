'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Timer, Star } from 'lucide-react';
import type { CompletedActivity } from '@/lib/types';

interface CompletedItemProps {
  item: CompletedActivity;
}

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

// For simple list view
export function SimpleCompletedItem({ item }: CompletedItemProps) {
  const { template, completeEvent } = item;
  const { duration, points } = completeEvent.payload;
  const itemType = 'isRoutine' in template ? 'Routine' : 'Task';

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg transition-colors bg-accent/10">
      <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
      <div className="flex-1 grid gap-1">
        <p className="font-medium text-muted-foreground line-through">
          {template.title} ({itemType})
        </p>
        <p className="text-sm text-muted-foreground">
          Studied for {formatDuration(duration || 0)} &bull; {points || 0} pts
        </p>
      </div>
    </div>
  );
}

// For card view
export function CardCompletedItem({ item }: CompletedItemProps) {
  const { template, completeEvent } = item;
  const { duration, points } = completeEvent.payload;
  const itemType = 'isRoutine' in template ? 'Routine' : 'Task';

  return (
    <Card className="bg-card/60 dark:bg-card/80 border-l-4 border-accent">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 space-y-1">
          <p className="font-semibold text-muted-foreground line-through">
            {template.title} ({itemType})
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
        <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
      </CardContent>
    </Card>
  );
}