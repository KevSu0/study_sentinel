import { type TaskPriority } from './types';

/**
 * Priority-based transparent glass color configuration
 * High priority: Red/Rose colors
 * Medium priority: Yellow/Amber colors  
 * Low priority: Blue colors
 */
export const priorityColorConfig: Record<TaskPriority, {
  background: string;
  border: string;
  borderLeft: string;
  text: string;
  badge: string;
}> = {
  high: {
    background: 'bg-red-500/10',
    border: 'border-red-500/20',
    borderLeft: 'border-l-red-500/60',
    text: 'text-red-600 dark:text-red-400 text-red-500',
    badge: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30'
  },
  medium: {
    background: 'bg-amber-500/10',
    border: 'border-amber-500/20', 
    borderLeft: 'border-l-amber-500/60',
    text: 'text-amber-600 dark:text-amber-400 text-yellow-500',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
  },
  low: {
    background: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    borderLeft: 'border-l-blue-500/60', 
    text: 'text-blue-600 dark:text-blue-400 text-blue-500',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30'
  }
};

/**
 * Get priority-based color classes for card backgrounds and borders
 */
export const getPriorityCardStyles = (priority: TaskPriority): string => {
  const config = priorityColorConfig[priority];
  return `${config.background} ${config.border} ${config.borderLeft}`;
};

/**
 * Get priority-based color classes for text elements
 */
export const getPriorityTextStyles = (priority: TaskPriority): string => {
  return priorityColorConfig[priority].text;
};

/**
 * Get priority-based color classes for badge elements
 */
export const getPriorityBadgeStyles = (priority: TaskPriority): string => {
  return priorityColorConfig[priority].badge;
};

/**
 * Get priority-based background color only
 */
export const getPriorityBackground = (priority: TaskPriority): string => {
  return priorityColorConfig[priority].background;
};

/**
 * Get priority-based border color only
 */
export const getPriorityBorder = (priority: TaskPriority): string => {
  return priorityColorConfig[priority].border;
};
