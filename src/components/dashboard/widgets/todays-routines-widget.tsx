'use client';
import React from 'react';
import {RoutineDashboardCard} from '@/components/timetable/routine-dashboard-card';
import {Routine} from '@/lib/types';

interface TodaysRoutinesWidgetProps {
  todaysRoutines: Routine[];
}

export const TodaysRoutinesWidget = ({
  todaysRoutines,
}: TodaysRoutinesWidgetProps) => {
  if (todaysRoutines.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">
        Today's Routines
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {todaysRoutines.map((routine: any) => (
          <RoutineDashboardCard key={routine.id} routine={routine} />
        ))}
      </div>
    </section>
  );
};
