import React from 'react';
import type { Routine } from '@/lib/types';
import { SimpleRoutineItem } from '@/components/routines/simple-routine-item';

interface TodaysRoutinesWidgetProps {
  routines: Routine[];
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onComplete: (routine: Routine) => void;
}

export const TodaysRoutinesWidget = ({
  routines,
  onEdit,
  onDelete,
  onComplete,
}: TodaysRoutinesWidgetProps) => {
  if (!routines || routines.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No routines for today.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {routines.map((routine) => (
        <SimpleRoutineItem
          key={routine.id}
          routine={routine}
          onEdit={onEdit}
          onDelete={onDelete}
          onComplete={onComplete}
        />
      ))}
    </div>
  );
};