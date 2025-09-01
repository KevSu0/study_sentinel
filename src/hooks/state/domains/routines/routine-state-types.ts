export type Routine = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  days: number[];
  priority?: 'low' | 'medium' | 'high';
  status: 'todo' | 'archived';
};

export type RoutineState = {
  routines: Routine[];
};

