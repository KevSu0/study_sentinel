
'use client';
import React from 'react';
import { parseISO, format } from 'date-fns';
import { SimpleTaskList } from '@/components/tasks/simple-task-list';
import { TaskList } from '@/components/tasks/task-list';
import { CardCompletedRoutineItem, SimpleCompletedRoutineItem } from '@/components/dashboard/completed-routine-card';
import { cn } from '@/lib/utils';
import type { StudyTask } from '@/lib/types';

export const CompletedTodayWidget = ({ tasks, logs, viewMode, activeItem, onUpdateTask, onArchiveTask, onUnarchiveTask, onPushTask, onEditTask }: any) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todaysCompletedTasks = tasks.filter(
    (t: StudyTask) => t.status === 'completed' && t.date === todayStr
  );
  
  const todaysCompletedRoutines = logs
    .filter((l: any) => l.type === 'ROUTINE_SESSION_COMPLETE' && l.timestamp.startsWith(todayStr))
    .sort((a: any, b: any) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime());

  if (todaysCompletedTasks.length === 0 && todaysCompletedRoutines.length === 0) {
    return null;
  }

  const renderTaskList = (tasksToRender: StudyTask[]) => {
    const props = {
      tasks: tasksToRender,
      onUpdate: onUpdateTask,
      onArchive: onArchiveTask,
      onUnarchive: onUnarchiveTask,
      onPushToNextDay: onPushTask,
      onEdit: onEditTask,
      activeItem: activeItem,
    };
    return viewMode === 'card' ? <TaskList {...props} /> : <SimpleTaskList {...props} />;
  };

  return (
    <section>
      <h2 className="text-xl font-semibold text-primary mb-3">Completed Today</h2>
      {todaysCompletedTasks.length > 0 && renderTaskList(todaysCompletedTasks)}

      {todaysCompletedRoutines.length > 0 && (
        <div className={cn(
          viewMode === 'card' ? 'space-y-4' : 'space-y-2',
          todaysCompletedTasks.length > 0 && 'mt-4'
        )}>
          {todaysCompletedRoutines.map((log: any) =>
            viewMode === 'card' ? (
              <CardCompletedRoutineItem key={log.id} log={log} />
            ) : (
              <SimpleCompletedRoutineItem key={log.id} log={log} />
            )
          )}
        </div>
      )}
    </section>
  );
};
