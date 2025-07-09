import type {Badge, StudyTask, LogEvent} from '@/lib/types';
import {
  Award,
  Book,
  Brain,
  BrainCircuit,
  Calendar,
  Coffee,
  Crown,
  Dumbbell,
  Gem,
  Medal,
  Moon,
  PlayCircle,
  Repeat,
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
  // --- Routine Badges ---
  {
    id: 'routine-rookie',
    name: 'Routine Rookie',
    description: 'Complete your first timed routine session.',
    motivationalMessage:
      'You started your first routine! Building consistent habits is the key to long-term success. Keep it up!',
    category: 'overall',
    Icon: PlayCircle,
    checker: ({logs}) =>
      logs.some(l => l.type === 'ROUTINE_SESSION_COMPLETE'),
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    description: 'Log a single uninterrupted routine session of over an hour.',
    motivationalMessage:
      'An hour of pure focus! You tapped into a state of deep work. That is where real progress happens. Incredible!',
    category: 'daily',
    Icon: BrainCircuit,
    checker: ({logs}) =>
      logs.some(
        l => l.type === 'ROUTINE_SESSION_COMPLETE' && l.payload.duration >= 3600
      ),
  },
  {
    id: 'routine-rampage',
    name: 'Routine Rampage',
    description: 'Complete 5 timed routine sessions in a single week.',
    motivationalMessage:
      'Five routines in a week! You are building a powerful rhythm. Consistency is your superpower!',
    category: 'weekly',
    Icon: Repeat,
    checker: ({logs}) => {
      const routineLogs = logs.filter(
        l => l.type === 'ROUTINE_SESSION_COMPLETE'
      );
      const weeks: Record<string, number> = {};
      for (const log of routineLogs) {
        const date = parseISO(log.timestamp);
        const weekStart = startOfWeek(date, {weekStartsOn: 1}).toISOString();
        if (!weeks[weekStart]) weeks[weekStart] = 0;
        weeks[weekStart]++;
      }
      return Object.values(weeks).some(count => count >= 5);
    },
  },

  // --- Daily Badges ---
  {
    id: 'daily-dedication',
    name: 'Daily Dedication',
    description: 'Study for at least 2 hours in a single day.',
    motivationalMessage:
      "Two hours of focused study! That's discipline in action. Imagine what you can do tomorrow. Keep building the momentum!",
    category: 'daily',
    Icon: Zap,
    checker: ({completedTasks}) => {
      const grouped = groupTasksByDay(completedTasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 120
      );
    },
  },
  {
    id: 'hardcore-hustle',
    name: 'Hardcore Hustle',
    description: 'Study for at least 4 hours in a single day.',
    motivationalMessage:
      'Four hours in a day! You are pushing your limits and it shows. This dedication is what separates the good from the great.',
    category: 'daily',
    Icon: Rocket,
    checker: ({completedTasks}) => {
      const grouped = groupTasksByDay(completedTasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 240
      );
    },
  },
  {
    id: 'elite-effort',
    name: 'Elite Effort',
    description: 'Study for at least 6 hours in a single day. Impressive!',
    motivationalMessage:
      'Six hours of solid study! You are in the elite zone now. Your brain is a muscle, and today it got a phenomenal workout.',
    category: 'daily',
    Icon: Crown,
    checker: ({completedTasks}) => {
      const grouped = groupTasksByDay(completedTasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 360
      );
    },
  },
  {
    id: 'academic-athlete',
    name: 'Academic Athlete',
    description: 'Study for at least 8 hours in a single day. True endurance!',
    motivationalMessage:
      "Eight hours! That's a full workday dedicated to your growth. Your future self will thank you for this incredible effort.",
    category: 'daily',
    Icon: Dumbbell,
    checker: ({completedTasks}) => {
      const grouped = groupTasksByDay(completedTasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 480
      );
    },
  },
  {
    id: 'study-marathoner',
    name: 'Study Marathoner',
    description: 'Study for at least 10 hours in a single day. Absolutely epic!',
    motivationalMessage:
      "An incredible 10 hours of studying! You've demonstrated the stamina of a marathoner. Rest well, you've earned it.",
    category: 'daily',
    Icon: Medal,
    checker: ({completedTasks}) => {
      const grouped = groupTasksByDay(completedTasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 600
      );
    },
  },
  {
    id: 'sentinel-scholar',
    name: 'Sentinel Scholar',
    description: 'Study for 12 hours in a single day. You are a legend!',
    motivationalMessage:
      'Twelve hours. You have achieved the pinnacle of daily study. This is legendary focus. You are unstoppable!',
    category: 'daily',
    Icon: Gem,
    checker: ({completedTasks}) => {
      const grouped = groupTasksByDay(completedTasks);
      return Object.values(grouped).some(
        dayTasks => getTotalDuration(dayTasks) >= 720
      );
    },
  },
  {
    id: 'morning-bird',
    name: 'Morning Bird',
    description: 'Complete a task before 9 AM.',
    motivationalMessage:
      'The early bird gets the worm! Starting your day with productivity sets a powerful tone. Well done for seizing the morning.',
    category: 'daily',
    Icon: Sunrise,
    checker: ({completedTasks}) =>
      completedTasks.some(task => parseInt(task.time.split(':')[0]) < 9),
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Complete a task after 9 PM.',
    motivationalMessage:
      'Burning the midnight oil! Your dedication shines brightly even when the sun is down. Keep up the great work.',
    category: 'daily',
    Icon: Moon,
    checker: ({completedTasks}) =>
      completedTasks.some(task => parseInt(task.time.split(':')[0]) >= 21),
  },

  // --- Weekly Badges ---
  {
    id: 'consistent-week',
    name: 'Consistent Week',
    description: 'Study every day for 7 days in a row.',
    motivationalMessage:
      'A full week of consistent effort! This is how habits are forged and greatness is built. You are on the right path.',
    category: 'weekly',
    Icon: Calendar,
    checker: ({completedTasks}) => {
      // Get unique dates and sort them
      const uniqueDates = [...new Set(completedTasks.map(t => t.date))].sort();

      if (uniqueDates.length < 7) {
        return false;
      }

      const parsedDates = uniqueDates.map(d => parseISO(d));

      // Check for a 7-day consecutive streak
      for (let i = 0; i <= parsedDates.length - 7; i++) {
        let consecutive = true;
        for (let j = 0; j < 6; j++) {
          const day1 = parsedDates[i + j];
          const day2 = parsedDates[i + j + 1];
          if (differenceInDays(day2, day1) !== 1) {
            consecutive = false;
            break;
          }
        }
        if (consecutive) {
          return true;
        }
      }

      return false;
    },
  },
  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Study for at least 3 hours over a single weekend.',
    motivationalMessage:
      'No days off! You used your weekend to get ahead. This commitment is your secret weapon. Amazing job!',
    category: 'weekly',
    Icon: Sparkles,
    checker: ({completedTasks}) => {
      const weekends: Record<string, number> = {};
      for (const task of completedTasks) {
        const date = parseISO(task.date);
        const day = date.getDay();
        if (day === 0 || day === 6) {
          // Sunday or Saturday
          // Group by the start of the week, with Monday as day 1
          const weekStart = startOfWeek(date, {weekStartsOn: 1}).toISOString();
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
    motivationalMessage:
      "Over 40 hours this month! That's a huge investment in yourself. Every minute is a step towards your dream. Phenomenal!",
    category: 'monthly',
    Icon: Trophy,
    checker: ({completedTasks}) => {
      const months: Record<string, number> = {};
      for (const task of completedTasks) {
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
    motivationalMessage:
      'A perfect month! Studying every single day is an incredible feat of discipline and consistency. You are an inspiration!',
    category: 'monthly',
    Icon: Star,
    checker: ({completedTasks}) => {
      const studyDaysByMonth: Record<string, Set<string>> = {};
      for (const task of completedTasks) {
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
    motivationalMessage:
      "The journey of a thousand miles begins with a single step. You've taken yours. Keep going!",
    category: 'overall',
    Icon: Award,
    checker: ({completedTasks}) => completedTasks.length >= 1,
  },
  {
    id: 'task-apprentice',
    name: 'Task Apprentice',
    description: 'Complete 10 tasks.',
    motivationalMessage:
      "10 tasks down! You're getting the hang of this. Every completed task is a victory. On to the next one!",
    category: 'overall',
    Icon: Book,
    checker: ({completedTasks}) => completedTasks.length >= 10,
  },
  {
    id: 'task-master',
    name: 'Task Master',
    description: 'Complete 50 tasks.',
    motivationalMessage:
      '50 tasks completed! You are no longer an apprentice; you are a master of your routine. Your knowledge is compounding!',
    category: 'overall',
    Icon: Brain,
    checker: ({completedTasks}) => completedTasks.length >= 50,
  },
  {
    id: 'committed-learner',
    name: 'Committed Learner',
    description: 'Complete 100 tasks. You are a true scholar!',
    motivationalMessage:
      '100 tasks conquered! This is a testament to your unwavering commitment. You are building an incredible foundation for success.',
    category: 'overall',
    Icon: Trophy,
    checker: ({completedTasks}) => completedTasks.length >= 100,
  },
];
