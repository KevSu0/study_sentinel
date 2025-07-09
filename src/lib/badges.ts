import type {Badge, StudyTask} from '@/lib/types';
import {
  Award,
  Book,
  Brain,
  Calendar,
  Coffee,
  Crown,
  Moon,
  Rocket,
  Sparkles,
  Star,
  Sunrise,
  Trophy,
  Zap,
} from 'lucide-react';
import {
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  differenceInDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from 'date-fns';

const groupTasksByDay = (tasks: StudyTask[]) => {
  const groups: Record<string, StudyTask[]> = {};
  for (const task of tasks) {
    const day = task.date;
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(task);
  }
  return groups;
};

const getTotalDuration = (tasks: StudyTask[]) =>
  tasks.reduce((sum, task) => sum + task.duration, 0);

export const ALL_BADGES: readonly Badge[] = [
  // --- Daily Badges ---
  {
    id: 'daily-dedication',
    name: 'Daily Dedication',
    description: 'Study for at least 2 hours in a single day.',
    category: 'daily',
    Icon: Zap,
    checker: (tasks: StudyTask[]) => {
      const grouped = groupTasksByDay(tasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 120
      );
    },
  },
  {
    id: 'hardcore-hustle',
    name: 'Hardcore Hustle',
    description: 'Study for at least 4 hours in a single day.',
    category: 'daily',
    Icon: Rocket,
    checker: (tasks: StudyTask[]) => {
      const grouped = groupTasksByDay(tasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 240
      );
    },
  },
  {
    id: 'elite-effort',
    name: 'Elite Effort',
    description: 'Study for at least 6 hours in a single day. Impressive!',
    category: 'daily',
    Icon: Crown,
    checker: (tasks: StudyTask[]) => {
      const grouped = groupTasksByDay(tasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 360
      );
    },
  },
  {
    id: 'morning-bird',
    name: 'Morning Bird',
    description: 'Complete a task before 9 AM.',
    category: 'daily',
    Icon: Sunrise,
    checker: (tasks: StudyTask[]) =>
      tasks.some(task => parseInt(task.time.split(':')[0]) < 9),
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete a task after 9 PM.',
    category: 'daily',
    Icon: Moon,
    checker: (tasks: StudyTask[]) =>
      tasks.some(task => parseInt(task.time.split(':')[0]) >= 21),
  },

  // --- Weekly Badges ---
  {
    id: 'consistent-week',
    name: 'Consistent Week',
    description: 'Study every day for 7 days in a row.',
    category: 'weekly',
    Icon: Calendar,
    checker: (tasks: StudyTask[]) => {
      if (tasks.length < 7) return false;
      const dates = [
        ...new Set(tasks.map(t => parseISO(t.date).getTime())),
      ].sort();
      for (let i = 0; i < dates.length - 6; i++) {
        let isConsecutive = true;
        for (let j = 0; j < 6; j++) {
          const diff = differenceInDays(dates[i + j + 1], dates[i + j]);
          if (diff !== 1) {
            isConsecutive = false;
            break;
          }
        }
        if (isConsecutive) return true;
      }
      return false;
    },
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Study for at least 3 hours over a single weekend.',
    category: 'weekly',
    Icon: Sparkles,
    checker: (tasks: StudyTask[]) => {
      const weekends: Record<string, number> = {};
      for (const task of tasks) {
        const date = parseISO(task.date);
        const day = date.getDay();
        if (day === 0 || day === 6) {
          // Sunday or Saturday
          const weekStart = startOfWeek(date).toISOString();
          if (!weekends[weekStart]) weekends[weekStart] = 0;
          weekends[weekStart] += task.duration;
        }
      }
      return Object.values(weekends).some(duration => duration >= 180);
    },
  },

  // --- Monthly Badges ---
  {
    id: 'monthly-marathon',
    name: 'Monthly Marathon',
    description: 'Log over 40 hours of study in a single month.',
    category: 'monthly',
    Icon: Trophy,
    checker: (tasks: StudyTask[]) => {
      const months: Record<string, number> = {};
      for (const task of tasks) {
        const date = parseISO(task.date);
        const monthStart = startOfMonth(date).toISOString();
        if (!months[monthStart]) months[monthStart] = 0;
        months[monthStart] += task.duration;
      }
      return Object.values(months).some(duration => duration >= 40 * 60);
    },
  },
  {
    id: 'perfect-month',
    name: 'Perfect Month',
    description: 'Study at least once every day for a full calendar month.',
    category: 'monthly',
    Icon: Star,
    checker: (tasks: StudyTask[]) => {
      const studyDaysByMonth: Record<string, Set<string>> = {};
      for (const task of tasks) {
          const date = parseISO(task.date);
          const monthKey = startOfMonth(date).toISOString();
          if (!studyDaysByMonth[monthKey]) {
              studyDaysByMonth[monthKey] = new Set();
          }
          studyDaysByMonth[monthKey].add(task.date);
      }
      for (const monthKey in studyDaysByMonth) {
          const monthStart = parseISO(monthKey);
          const monthEnd = endOfMonth(monthStart);
          const totalDaysInMonth = differenceInDays(monthEnd, monthStart) + 1;
          if (studyDaysByMonth[monthKey].size === totalDaysInMonth) {
              return true;
          }
      }
      return false;
    }
  },

  // --- Overall Badges ---
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Complete your first study task.',
    category: 'overall',
    Icon: Award,
    checker: (tasks: StudyTask[]) => tasks.length >= 1,
  },
  {
    id: 'task-apprentice',
    name: 'Task Apprentice',
    description: 'Complete 10 tasks.',
    category: 'overall',
    Icon: Book,
    checker: (tasks: StudyTask[]) => tasks.length >= 10,
  },
  {
    id: 'task-master',
    name: 'Task Master',
    description: 'Complete 50 tasks.',
    category: 'overall',
    Icon: Brain,
    checker: (tasks: StudyTask[]) => tasks.length >= 50,
  },
  {
    id: 'committed-learner',
    name: 'Committed Learner',
    description: 'Complete 100 tasks. You are a true scholar!',
    category: 'overall',
    Icon: Trophy,
    checker: (tasks: StudyTask[]) => tasks.length >= 100,
  },
];
