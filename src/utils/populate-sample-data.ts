import { taskRepository } from '@/lib/repositories/task.repository';
import { routineRepository } from '@/lib/repositories/routine.repository';
import { sessionRepository } from '@/lib/repositories/session.repository';
import { StudyTask, Routine } from '@/lib/types';
import { Session } from '@/lib/db';

  const today = new Date().toISOString().split('T')[0];
  const sampleTasks: StudyTask[] = [
    {
      id: 'task-1',
      shortId: 'T1',
      title: 'Complete React Tutorial',
      description: 'Learn React fundamentals and hooks',
      time: '09:00',
      date: today,
      duration: 60,
      points: 10,
      status: 'completed',
      priority: 'high',
      timerType: 'countdown'
    },
    {
      id: 'task-2',
      shortId: 'T2',
      title: 'Study TypeScript',
      description: 'Advanced TypeScript concepts',
      time: '14:00',
      date: today,
      duration: 45,
      points: 8,
      status: 'completed',
      priority: 'medium',
      timerType: 'countdown'
    },
    {
      id: 'task-3',
      shortId: 'T3',
      title: 'Practice Algorithms',
      description: 'Solve coding problems',
      time: '16:00',
      date: today,
      duration: 90,
      points: 12,
      status: 'completed',
      priority: 'high',
      timerType: 'infinity'
    }
  ];

  const sampleRoutines: Routine[] = [
    {
      id: 'routine-1',
      shortId: 'R1',
      title: 'Morning Reading',
      description: 'Daily reading session',
      days: [1, 2, 3, 4, 5], // Monday to Friday
      startTime: '08:00',
      endTime: '08:30',
      priority: 'medium',
      status: 'completed',
      createdAt: Date.now()
    },
    {
      id: 'routine-2',
      shortId: 'R2',
      title: 'Evening Review',
      description: 'Review daily progress',
      days: [0, 1, 2, 3, 4, 5, 6], // Every day
      startTime: '20:00',
      endTime: '20:15',
      priority: 'low',
      status: 'completed',
      createdAt: Date.now()
    }
  ];

function generateSampleSessionData(): { logs: any[], sessions: Session[] } {
  const logs: any[] = [];
  const sessions: Session[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Generate logs and sessions for tasks
  sampleTasks.forEach((task, index) => {
    const completedTime = new Date(Date.now() - (index + 1) * 2 * 60 * 60 * 1000).toISOString();
    
    // Create log entry
    logs.push({
      id: `log-task-${task.id}`,
      timestamp: completedTime,
      type: 'TIMER_SESSION_COMPLETE',
      payload: {
        taskId: task.id,
        title: task.title,
        duration: task.duration! * 60, // Convert to seconds
        points: task.points,
        priority: task.priority,
        pauseCount: 0,
        pausedDuration: 0
      }
    });

    // Create session entry
    sessions.push({
      id: `session-task-${task.id}`,
      userId: 'user-1',
      timestamp: completedTime,
      duration: task.duration! * 60, // Convert to seconds
      pausedDuration: 0,
      points: task.points,
      date: today,
      type: 'task',
      title: task.title
    });
  });

  // Generate logs and sessions for routines
  sampleRoutines.forEach((routine, index) => {
    const sessionTime = new Date(Date.now() - (index + 1) * 3 * 60 * 60 * 1000).toISOString();
    
    // Create log entry
    logs.push({
      id: `log-routine-${routine.id}`,
      timestamp: sessionTime,
      type: 'ROUTINE_SESSION_COMPLETE',
      payload: {
        routineId: routine.id,
        title: routine.title,
        duration: 30 * 60, // 30 minutes in seconds
        points: 5,
        priority: routine.priority,
        pauseCount: 0,
        pausedDuration: 0
      }
    });

    // Create session entry
    sessions.push({
      id: `session-routine-${routine.id}`,
      userId: 'user-1',
      timestamp: sessionTime,
      duration: 30 * 60, // 30 minutes in seconds
      pausedDuration: 0,
      points: 5,
      date: today,
      type: 'routine',
      title: routine.title
    });
  });

  return { logs, sessions };
}

export async function populateSampleData(): Promise<void> {
  try {
    console.log('Starting to populate sample data...');
    
    // Clear existing sample data first to avoid constraint errors
    await clearSampleData();
    console.log('Existing data cleared.');

    // Add sample tasks
    for (const task of sampleTasks) {
      await taskRepository.add(task);
    }

    // Add sample routines
    for (const routine of sampleRoutines) {
      await routineRepository.add(routine);
    }

    // Generate and add sample logs and sessions
    const { logs, sessions } = generateSampleSessionData();
    
    for (const log of logs) {
      // await logRepository.add(log);
    }
    
    for (const session of sessions) {
      await sessionRepository.add(session);
    }

    console.log('Sample data populated successfully!');
    console.log(`Added ${sampleTasks.length} tasks, ${sampleRoutines.length} routines, ${logs.length} logs, and ${sessions.length} sessions`);
  } catch (error) {
    console.error('Error populating sample data:', error);
    throw error;
  }
}

// Function to clear all sample data (for testing)
export async function clearSampleData(): Promise<void> {
  try {
    console.log('Clearing sample data...');
    
    // Note: This is a simple implementation. In a real app, you might want
    // to add specific identifiers to track sample data
    const tasks = await taskRepository.getAll();
    const routines = await routineRepository.getAll();
    const logs = [] as any[]; // await logRepository.getAll();
    const sessions = await sessionRepository.getAll();

    // Clear all data (be careful with this in production!)
    for (const task of tasks) {
      await taskRepository.delete(task.id!);
    }
    for (const routine of routines) {
      await routineRepository.delete(routine.id!);
    }
    for (const log of logs) {
      // await logRepository.delete(log.id);
    }
    for (const session of sessions) {
      await sessionRepository.delete(session.id);
    }

    console.log('Sample data cleared successfully!');
  } catch (error) {
    console.error('Error clearing sample data:', error);
    throw error;
  }
}