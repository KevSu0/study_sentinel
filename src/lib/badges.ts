import type {Badge, StudyTask, LogEvent, BadgeCondition} from '@/lib/types';
import {
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  subDays,
} from 'date-fns';

// --- Default System Badges ---
// These serve as templates and can be edited or disabled by the user.

export const SYSTEM_BADGES: readonly Omit<Badge, 'id' | 'isCustom' | 'isEnabled'>[] = [
  {
    name: 'First Step',
    description: 'Complete your first study task.',
    motivationalMessage:
      "The journey of a thousand miles begins with a single step. You've taken yours. Keep going!",
    category: 'overall',
    icon: 'Award',
    color: '#f59e0b', // amber-500
    conditions: [
      {
        type: 'TASKS_COMPLETED',
        target: 1,
        timeframe: 'TOTAL',
      },
    ],
  },
  {
    name: 'Daily Dedication',
    description: 'Study for at least 2 hours in a single day.',
    motivationalMessage:
      "Two hours of focused study! That's discipline in action. Imagine what you can do tomorrow. Keep building the momentum!",
    category: 'daily',
    icon: 'Zap',
    color: '#84cc16', // lime-500
    conditions: [
      {
        type: 'TOTAL_STUDY_TIME',
        target: 120, // minutes
        timeframe: 'DAY',
      },
    ],
  },
  {
    name: 'Hardcore Hustle',
    description: 'Study for at least 4 hours in a single day.',
    motivationalMessage:
      'Four hours in a day! You are pushing your limits and it shows. This dedication is what separates the good from the great.',
    category: 'daily',
    icon: 'Rocket',
    color: '#ef4444', // red-500
    conditions: [
      {
        type: 'TOTAL_STUDY_TIME',
        target: 240,
        timeframe: 'DAY',
      },
    ],
  },
  {
    name: 'Consistent Week',
    description: 'Study every day for 7 days in a row.',
    motivationalMessage:
      'A full week of consistent effort! This is how habits are forged and greatness is built. You are on the right path.',
    category: 'weekly',
    icon: 'Calendar',
    color: '#3b82f6', // blue-500
    conditions: [
      {
        type: 'DAY_STREAK',
        target: 7,
        timeframe: 'TOTAL', // Timeframe is ignored for streak
      },
    ],
  },
  {
    name: 'Weekend Warrior',
    description: 'Study for at least 3 hours over a single weekend.',
    motivationalMessage:
      'No days off! You used your weekend to get ahead. This commitment is your secret weapon. Amazing job!',
    category: 'weekly',
    icon: 'Sparkles',
    color: '#a855f7', // purple-500
    conditions: [
      {
        type: 'TOTAL_STUDY_TIME',
        target: 180,
        timeframe: 'WEEK',
      },
    ],
    // Note: This badge's logic in the checker is more complex and would check for weekends.
    // The simplified custom badge system might not fully replicate this nuance without a "weekend" timeframe.
  },
  {
    name: 'Task Master',
    description: 'Complete 50 tasks.',
    motivationalMessage:
      '50 tasks completed! You are no longer an apprentice; you are a master of your routine. Your knowledge is compounding!',
    category: 'overall',
    icon: 'Brain',
    color: '#14b8a6', // teal-500
    conditions: [
      {
        type: 'TASKS_COMPLETED',
        target: 50,
        timeframe: 'TOTAL',
      },
    ],
  },
  {
    name: 'Routine Rookie',
    description: 'Complete your first timed routine session.',
    motivationalMessage:
      'You started your first routine! Building consistent habits is the key to long-term success. Keep it up!',
    category: 'overall',
    icon: 'PlayCircle',
    color: '#6366f1', // indigo-500
    conditions: [
      {
        type: 'ROUTINES_COMPLETED',
        target: 1,
        timeframe: 'TOTAL',
      },
    ],
  },
];

// --- Badge Evaluation Logic ---

// Helper to get a date range for a timeframe relative to a given date
function getTimeframeDates(
  timeframe: BadgeCondition['timeframe'],
  date: Date
) {
  switch (timeframe) {
    case 'DAY':
      return {start: date, end: date};
    case 'WEEK':
      return {
        start: startOfWeek(date, {weekStartsOn: 1}),
        end: endOfWeek(date, {weekStartsOn: 1}),
      };
    case 'MONTH':
      return {start: startOfMonth(date), end: endOfMonth(date)};
    default: // 'TOTAL'
      return {start: new Date(0), end: new Date()};
  }
}

// A unified list of all completed work, tasks and routines.
function getAllCompletedWork(
  tasks: StudyTask[],
  logs: LogEvent[]
): {
  date: string;
  duration: number;
  type: 'task' | 'routine';
  subjectId?: string;
  points: number;
}[] {
  const workItems: {
    date: string;
    duration: number; // minutes
    type: 'task' | 'routine';
    subjectId?: string;
    points: number;
  }[] = [];

  const sessionLogs = logs.filter(
    l =>
      l.type === 'ROUTINE_SESSION_COMPLETE' ||
      l.type === 'TIMER_SESSION_COMPLETE'
  );
  const timedTaskIds = new Set(
    sessionLogs.map(l => l.payload.taskId).filter(Boolean)
  );

  workItems.push(
    ...sessionLogs.map(l => {
      const isRoutine = l.type === 'ROUTINE_SESSION_COMPLETE';
      return {
        date: l.timestamp.split('T')[0],
        duration: Math.round(l.payload.duration / 60),
        type: isRoutine ? 'routine' : 'task',
        subjectId: isRoutine ? l.payload.routineId : l.payload.taskId,
        points: l.payload.points || 0,
      };
    })
  );

  const manuallyCompletedTasks = tasks.filter(
    t => t.status === 'completed' && !timedTaskIds.has(t.id)
  );
  workItems.push(
    ...manuallyCompletedTasks.map(t => ({
      date: t.date,
      duration: t.duration,
      type: 'task' as const,
      subjectId: t.id,
      points: t.points,
    }))
  );

  return workItems;
}

export function checkBadge(
  badge: Badge,
  data: {tasks: StudyTask[]; logs: LogEvent[]}
): boolean {
  if (!badge.isEnabled) return false;

  const allWork = getAllCompletedWork(data.tasks, data.logs);
  const allCompletedTasks = data.tasks.filter(t => t.status === 'completed');
  const allCompletedRoutines = allWork.filter(w => w.type === 'routine');

  for (const condition of badge.conditions) {
    let conditionMet = false;

    // Total timeframe logic
    if (condition.timeframe === 'TOTAL') {
      let currentValue = 0;
      if (condition.type === 'TASKS_COMPLETED') {
        currentValue = allCompletedTasks.length;
      } else if (condition.type === 'ROUTINES_COMPLETED') {
        currentValue = allCompletedRoutines.length;
      } else if (condition.type === 'TOTAL_STUDY_TIME') {
        currentValue = allWork.reduce((sum, item) => sum + item.duration, 0);
      } else if (condition.type === 'POINTS_EARNED') {
        currentValue = allWork.reduce((sum, item) => sum + item.points, 0);
      } else if (condition.type === 'TIME_ON_SUBJECT') {
        currentValue = allWork
          .filter(w => w.subjectId === condition.subjectId)
          .reduce((sum, item) => sum + item.duration, 0);
      } else if (condition.type === 'DAY_STREAK') {
        const studyDays = new Set(allWork.map(w => w.date));
        if (studyDays.size < condition.target) return false;

        let streak = 0;
        let checkDate = new Date();
        // Start check from yesterday if no activity today
        if (!studyDays.has(checkDate.toISOString().split('T')[0])) {
          checkDate = subDays(checkDate, 1);
        }

        while (studyDays.has(checkDate.toISOString().split('T')[0])) {
          streak++;
          checkDate = subDays(checkDate, 1);
        }
        currentValue = streak;
      }
      if (currentValue >= condition.target) {
        conditionMet = true;
      }
    } else {
      // Time-boxed timeframe logic (DAY, WEEK, MONTH)
      const dateSet = new Set(allWork.map(w => w.date));
      for (const dateStr of dateSet) {
        const checkDate = parseISO(dateStr);
        const {start, end} = getTimeframeDates(condition.timeframe, checkDate);

        const workInTimeframe = allWork.filter(w => {
          const wDate = parseISO(w.date);
          return wDate >= start && wDate <= end;
        });

        let currentValue = 0;
        if (condition.type === 'TASKS_COMPLETED') {
          currentValue = workInTimeframe.filter(w => w.type === 'task').length;
        } else if (condition.type === 'ROUTINES_COMPLETED') {
          currentValue = workInTimeframe.filter(w => w.type === 'routine')
            .length;
        } else if (condition.type === 'TOTAL_STUDY_TIME') {
          currentValue = workInTimeframe.reduce(
            (sum, item) => sum + item.duration,
            0
          );
        } else if (condition.type === 'POINTS_EARNED') {
          currentValue = workInTimeframe.reduce(
            (sum, item) => sum + item.points,
            0
          );
        } else if (condition.type === 'TIME_ON_SUBJECT') {
          currentValue = workInTimeframe
            .filter(w => w.subjectId === condition.subjectId)
            .reduce((sum, item) => sum + item.duration, 0);
        }

        if (currentValue >= condition.target) {
          conditionMet = true;
          break; // Found a timeframe that satisfies the condition
        }
      }
    }

    if (!conditionMet) {
      return false; // If any condition is not met, the badge is not earned
    }
  }

  return true; // All conditions were met
}
