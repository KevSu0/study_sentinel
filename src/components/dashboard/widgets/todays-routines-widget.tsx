
'use client';
import React from 'react';
import { RoutineDashboardCard } from '@/components/timetable/routine-dashboard-card';

export const TodaysRoutinesWidget = ({ routines }: any) => {
  const today = new Date().getDay();
  const todaysRoutines = routines.filter((r: any) => r.days.includes(today));

  if (todaysRoutines.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">Today's Routines</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {todaysRoutines.map((routine: any) => (
          <RoutineDashboardCard key={routine.id} routine={routine} />
        ))}
      </div>
    </section>
  );
};
