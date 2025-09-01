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
  format,
} from 'date-fns';

// --- Default System Badges ---
// These serve as templates and can be edited or disabled by the user.

export const SYSTEM_BADGES: readonly Omit<Badge, 'id' | 'isCustom' | 'isEnabled'>[] = [
  {
    name: 'First Step',
    requiredCount: 0,
    description: 'Complete your first study task.',
    motivationalMessage:
      "The journey of a thousand miles begins with a single step. You've taken yours. Keep going!",
    category: 'overall',
    icon: 'Footprints',
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
    name: 'Routine Rookie',
    requiredCount: 0,
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
  {
    name: 'Daily Dedication',
    requiredCount: 0,
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
    requiredCount: 0,
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
    name: 'Deep Work Novice',
    requiredCount: 0,
    description: 'Study for 90 minutes in a single session.',
    motivationalMessage:
      'A full 90-minute session! You tapped into a state of deep focus, which is where real learning happens. Fantastic work!',
    category: 'daily',
    icon: 'BookLock',
    color: '#22d3ee', // cyan-400
    conditions: [
      {
        type: 'SINGLE_SESSION_TIME',
        target: 90, // minutes
        timeframe: 'TOTAL', // this checks any single session ever
      },
    ],
  },
  {
    name: 'Momentum Builder',
    requiredCount: 0,
    description: 'Study every day for 3 days in a row.',
    motivationalMessage:
      'Three days in a row! You\'re building a powerful habit. Don\'t break the chain now, you\'re just getting started!',
    category: 'weekly',
    icon: 'ChevronsUp',
    color: '#f97316', // orange-500
    conditions: [
      {
        type: 'DAY_STREAK',
        target: 3,
        timeframe: 'TOTAL',
      },
    ],
  },
  {
    name: 'Consistent Week',
    requiredCount: 0,
    description: 'Study every day for 7 days in a row.',
    motivationalMessage:
      'A full week of consistent effort! This is how habits are forged and greatness is built. You are on the right path.',
    category: 'weekly',
    icon: 'CalendarCheck',
    color: '#3b82f6', // blue-500
    conditions: [
      {
        type: 'DAY_STREAK',
        target: 7,
        timeframe: 'TOTAL',
      },
    ],
  },
  {
    name: 'Flawless Finisher',
    requiredCount: 0,
    description: 'Complete all planned tasks for a single day.',
    motivationalMessage:
      'You planned your day and executed it flawlessly. This level of discipline is rare and incredibly powerful. Well done!',
    category: 'daily',
    icon: 'Trophy',
    color: '#eab308', // yellow-500
    conditions: [
      {
        type: 'ALL_TASKS_COMPLETED_ON_DAY',
        target: 1, // This is a flag, target is not used
        timeframe: 'DAY',
      },
    ],
  },
  {
    name: 'Productivity Powerhouse',
    requiredCount: 0,
    description: 'Complete 10 tasks in a single day.',
    motivationalMessage:
      '10 tasks in one day! Your productivity is off the charts. You didn\'t just have a good day; you had a great day.',
    category: 'daily',
    icon: 'Workflow',
    color: '#a855f7', // purple-500
     conditions: [
      {
        type: 'TASKS_COMPLETED',
        target: 10,
        timeframe: 'DAY',
      },
    ],
  },
    {
    name: 'Monthly Marathon',
    requiredCount: 0,
    description: 'Study for a total of 40 hours in a month.',
    motivationalMessage:
      '40 hours in a month! That\'s equivalent to a full work week dedicated to your growth. Your long-term commitment is truly inspiring.',
    category: 'monthly',
    icon: 'TrendingUp',
    color: '#ec4899', // pink-500
    conditions: [
      {
        type: 'TOTAL_STUDY_TIME',
        target: 2400, // minutes
        timeframe: 'MONTH',
      },
    ],
  },
  {
    name: 'Task Master',
    requiredCount: 0,
    description: 'Complete 50 tasks in total.',
    motivationalMessage:
      '50 tasks completed! You are no longer an apprentice; you are a master of your routine. Your knowledge is compounding!',
    category: 'overall',
    icon: 'BrainCircuit',
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
    name: 'Point Collector',
    requiredCount: 0,
    description: 'Earn a total of 1,000 points.',
    motivationalMessage:
      '1,000 points! Each point represents a moment of effort and dedication. Look how far you\'ve come. Keep collecting!',
    category: 'overall',
    icon: 'Star',
    color: '#facc15', // yellow-400
    conditions: [
      {
        type: 'POINTS_EARNED',
        target: 1000,
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
        type: isRoutine ? ('routine' as const) : ('task' as const),
        subjectId: (isRoutine
          ? l.payload.routineId
          : l.payload.taskId) as string,
        points: Number(l.payload.points || 0),
      };
    })
  );

  const manuallyCompletedTasks = tasks.filter(
    t => t.status === 'completed' && !timedTaskIds.has(t.id)
  );
  workItems.push(
    ...manuallyCompletedTasks.map(t => ({
      date: t.date,
      duration: t.duration ?? 0,
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

    // Handle special, non-standard condition types first
    if (condition.type === 'SINGLE_SESSION_TIME') {
        conditionMet = allWork.some(w => w.duration >= condition.target);
    } else if (condition.type === 'ALL_TASKS_COMPLETED_ON_DAY') {
        const tasksByDay = data.tasks.reduce((acc, task) => {
            if (task.status !== 'archived') {
                (acc[task.date] = acc[task.date] || []).push(task);
            }
            return acc;
        }, {} as Record<string, StudyTask[]>);

        conditionMet = Object.values(tasksByDay).some(dayTasks => 
            dayTasks.length > 0 && dayTasks.every(t => t.status === 'completed')
        );
    }
    // Handle TOTAL timeframe logic
    else if (condition.timeframe === 'TOTAL') {
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
        
        if (!studyDays.has(format(checkDate, 'yyyy-MM-dd'))) {
          checkDate = subDays(checkDate, 1);
        }

        while (studyDays.has(format(checkDate, 'yyyy-MM-dd'))) {
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
          const completedTasksInTimeframe = data.tasks.filter(t => {
            const tDate = parseISO(t.date);
            return t.status === 'completed' && tDate >= start && tDate <= end;
          });
          currentValue = completedTasksInTimeframe.length;
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

export default checkBadge;
