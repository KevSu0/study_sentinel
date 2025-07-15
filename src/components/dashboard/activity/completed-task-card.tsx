
'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Timer, Star } from 'lucide-react';
import type { StudyTask } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface CompletedTaskCardProps {
  task: StudyTask;
}

export function CompletedTaskCard({ task }: CompletedTaskCardProps) {
  return (
    <Card className="bg-card/60 dark:bg-card/80 border-l-4 border-green-500">
      <CardContent className="p-4 flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="font-semibold text-muted-foreground line-through">
            {task.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Timer className="h-4 w-4" />
              Completed ({task.duration} min)
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 text-yellow-400" />
              {task.points} pts earned
            </span>
            <Badge variant="secondary" className="capitalize">{task.priority} Priority</Badge>
          </div>
        </div>
        <CheckCircle className="h-8 w-8 text-green-500 shrink-0" />
      </CardContent>
    </Card>
  );
}

    