
'use client';
import React from 'react';
import {RoutineCard} from '@/components/routines/routine-card';
import {Routine} from '@/lib/types';

interface TodaysRoutinesWidgetProps {
  todaysRoutines: Routine[];
}

export const TodaysRoutinesWidget = ({
  todaysRoutines,
}: TodaysRoutinesWidgetProps) => {
  if (!todaysRoutines || todaysRoutines.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">
        Today's Routines
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {todaysRoutines.map((routine: any) => (
          <RoutineCard key={routine.id} routine={routine} />
        ))}
      </div>
    </section>
  );
};
