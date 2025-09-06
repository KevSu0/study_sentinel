import { CompletedActivity, CompletedWork, StudyTask, Routine } from './types';

export type CompletedItem = {
  id: string;
  title: string;
  type: 'task' | 'routine';
  isUndone: boolean;
  productiveDuration: number;
  pausedDuration: number;
  totalDuration: number;
  points: number;
  focusPercentage: number;
  pauseCount: number;
  subject?: string;
  priority?: string;
  timestamp: string;
  originalItem: CompletedActivity | CompletedWork;
};

export function transformToCompletedItem(item: CompletedActivity | CompletedWork): CompletedItem {
  if ('attempt' in item) {
    // It's a CompletedActivity
    const { attempt, template, completeEvent } = item;
    const totalDuration = completeEvent.occurredAt - attempt.createdAt;
    const productiveDuration = attempt.productiveDuration || 0;
    const pausedDuration = totalDuration - productiveDuration;
    const focusPercentage = totalDuration > 0 ? (productiveDuration / totalDuration) * 100 : 100;
    const pauseCount = attempt.events?.filter(e => e.type === 'PAUSE').length || 0;

    return {
      id: attempt.id,
      title: template.title,
      type: 'templateId' in template ? 'task' : 'routine',
      isUndone: attempt.status !== 'COMPLETED',
      productiveDuration,
      pausedDuration,
      totalDuration,
      points: attempt.points || 0,
      focusPercentage,
      pauseCount,
      subject: 'subject' in template ? template.subject : undefined,
      priority: 'priority' in template ? template.priority : undefined,
      timestamp: new Date(attempt.createdAt).toISOString(),
      originalItem: item,
    };
  } else {
    // It's a CompletedWork
    const totalDuration = item.duration;
    const productiveDuration = totalDuration - (item.pausedDuration || 0);
    const focusPercentage = totalDuration > 0 ? (productiveDuration / totalDuration) * 100 : 100;

    return {
      id: `${item.timestamp}-${item.title}`,
      title: item.title,
      type: item.type,
      isUndone: !!item.isUndone,
      productiveDuration,
      pausedDuration: item.pausedDuration || 0,
      totalDuration,
      points: item.points,
      focusPercentage,
      pauseCount: 0, // Not available in CompletedWork
      subject: item.subject,
      priority: item.priority,
      timestamp: item.timestamp,
      originalItem: item,
    };
  }
}