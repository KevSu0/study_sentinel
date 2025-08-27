export const mockProfile = {
  id: 'user-profile',
  dailyStudyGoal: 2,
};

export const mockTasks = [
  {
    id: 'task1',
    title: 'Task 1',
    status: 'completed',
    date: '2024-01-15',
  },
  {
    id: 'task2',
    title: 'Task 2',
    status: 'pending',
    date: '2024-01-15',
  },
];

export const mockAllCompletedWork = [
  {
    id: 'work1',
    title: 'Task 1',
    duration: 3000,
    pausedDuration: 300,
    pauseCount: 2,
    timestamp: '2024-01-15T10:00:00.000Z',
    date: '2024-01-15',
    points: 100,
    type: 'task',
  },
  {
    id: 'work2',
    title: 'Routine 1',
    duration: 2400,
    pausedDuration: 600,
    pauseCount: 3,
    timestamp: '2024-01-15T11:00:00.000Z',
    date: '2024-01-15',
    points: 50,
    type: 'routine',
  },
  {
    id: 'work3',
    title: 'Task 3',
    duration: 3600,
    pausedDuration: 0,
    pauseCount: 0,
    timestamp: '2024-01-14T10:00:00.000Z',
    date: '2024-01-14',
    points: 120,
    type: 'task',
  },
];

export const mockEvents = [];