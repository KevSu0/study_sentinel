'use client';

import React, { memo, useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus,
  Filter,
  Calendar,
  Flag,
  Timer,
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useTasksSelector, useOptimizedGlobalState } from '@/hooks/use-global-state-optimized';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type { StudyTask as Task, TaskStatus } from '@/lib/types';

// Memoized priority colors
const PRIORITY_COLORS = {
  low: 'text-blue-600 bg-blue-50 border-blue-200',
  medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  high: 'text-red-600 bg-red-50 border-red-200',
} as const;

const PRIORITY_ICONS = {
  low: Flag,
  medium: AlertCircle,
  high: AlertCircle,
} as const;

// Memoized task item component
interface TaskItemProps {
  task: Task;
  onToggleComplete: (taskId: string) => void;
  onStartTimer: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isTimerActive: boolean;
}

const TaskItem = memo<TaskItemProps>(({ 
  task, 
  onToggleComplete, 
  onStartTimer, 
  onEdit, 
  onDelete,
  isTimerActive 
}) => {
  const handleToggleComplete = useCallback(() => {
    onToggleComplete(task.id);
  }, [task.id, onToggleComplete]);
  
  const handleStartTimer = useCallback(() => {
    onStartTimer(task.id);
  }, [task.id, onStartTimer]);
  
  const handleEdit = useCallback(() => {
    onEdit(task);
  }, [task, onEdit]);
  
  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [task.id, onDelete]);
  
  // Memoized computed values
  const isOverdue = useMemo(() => {
    if (!task.date || task.status === 'completed') return false;
    const taskDateTime = new Date(`${task.date}T${task.time || '00:00'}`);
    return taskDateTime < new Date();
  }, [task.date, task.time, task.status]);
  
  const timeInfo = useMemo(() => {
    if (!task.date) return null;
    
    const taskDateTime = new Date(`${task.date}T${task.time || '00:00'}`);
    const now = new Date();
    
    if (task.status === 'completed') {
      return {
        text: 'Completed',
        className: 'text-green-600',
        icon: CheckCircle2,
      };
    }
    
    if (taskDateTime < now) {
      return {
        text: `Overdue by ${formatDistanceToNow(taskDateTime)}`,
        className: 'text-red-600',
        icon: AlertCircle,
      };
    }
    
    return {
      text: `Due ${formatDistanceToNow(taskDateTime, { addSuffix: true })}`,
      className: 'text-muted-foreground',
      icon: Clock,
    };
  }, [task.date, task.time, task.status]);
  
  const PriorityIcon = PRIORITY_ICONS[task.priority];
  const TimeIcon = timeInfo?.icon || Clock;
  
  return (
    <div className={cn(
      'group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200',
      'hover:shadow-sm hover:border-border',
      task.status === 'completed' && 'opacity-60',
        isOverdue && task.status !== 'completed' && 'border-red-200 bg-red-50/30'
    )}>
      {/* Completion Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 mt-0.5 shrink-0"
        onClick={handleToggleComplete}
      >
        {task.status === 'completed' ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </Button>
      
      {/* Task Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            'font-medium text-sm leading-tight',
            task.status === 'completed' && 'line-through text-muted-foreground'
          )}>
            {task.title}
          </h4>
          
          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleEdit}>
                Edit Task
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleStartTimer}
                disabled={task.status === 'completed' || isTimerActive}
              >
                <Timer className="h-4 w-4 mr-2" />
                Start Timer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Task Description */}
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        {/* Task Meta Info */}
        <div className="flex items-center gap-3 text-xs">
          {/* Priority Badge */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full border',
            PRIORITY_COLORS[task.priority]
          )}>
            <PriorityIcon className="h-3 w-3" />
            <span className="capitalize">{task.priority}</span>
          </div>
          
          {/* Time Info */}
          {timeInfo && (
            <div className={cn('flex items-center gap-1', timeInfo.className)}>
              <TimeIcon className="h-3 w-3" />
              <span>{timeInfo.text}</span>
            </div>
          )}
          
          {/* Duration */}
          {task.duration && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{task.duration}min</span>
            </div>
          )}
          
          {/* Points */}
          {task.points > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {task.points} pts
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

TaskItem.displayName = 'TaskItem';

// Memoized filter controls
interface FilterControlsProps {
  filter: 'all' | 'active' | 'completed' | 'overdue';
  onFilterChange: (filter: 'all' | 'active' | 'completed' | 'overdue') => void;
  taskCounts: {
    all: number;
    active: number;
    completed: number;
    overdue: number;
  };
}

const FilterControls = memo<FilterControlsProps>(({ filter, onFilterChange, taskCounts }) => {
  const handleAllClick = useCallback(() => onFilterChange('all'), [onFilterChange]);
  const handleActiveClick = useCallback(() => onFilterChange('active'), [onFilterChange]);
  const handleCompletedClick = useCallback(() => onFilterChange('completed'), [onFilterChange]);
  const handleOverdueClick = useCallback(() => onFilterChange('overdue'), [onFilterChange]);
  
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={filter === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleAllClick}
        className="h-7 px-2 text-xs"
      >
        All ({taskCounts.all})
      </Button>
      <Button
        variant={filter === 'active' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleActiveClick}
        className="h-7 px-2 text-xs"
      >
        Active ({taskCounts.active})
      </Button>
      <Button
        variant={filter === 'completed' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleCompletedClick}
        className="h-7 px-2 text-xs"
      >
        Done ({taskCounts.completed})
      </Button>
      {taskCounts.overdue > 0 && (
        <Button
          variant={filter === 'overdue' ? 'default' : 'ghost'}
          size="sm"
          onClick={handleOverdueClick}
          className="h-7 px-2 text-xs text-red-600 hover:text-red-600"
        >
          Overdue ({taskCounts.overdue})
        </Button>
      )}
    </div>
  );
});

FilterControls.displayName = 'FilterControls';

// Main optimized component
interface OptimizedTaskListWidgetProps {
  className?: string;
  maxHeight?: number;
  showAddButton?: boolean;
  onAddTask?: () => void;
  onEditTask?: (task: Task) => void;
}

const OptimizedTaskListWidget = memo<OptimizedTaskListWidgetProps>(({ 
  className = '',
  maxHeight = 400,
  showAddButton = true,
  onAddTask,
  onEditTask
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('active');
  
  // Use optimized selectors
  const { activeTasks, completedTasks, todaysTasks } = useTasksSelector();
  const { actions } = useOptimizedGlobalState();
  const { updateTask, archiveTask, startTimer } = actions;
  
  // Memoized filtered tasks
  const { filteredTasks, taskCounts } = useMemo(() => {
    const allTasks = [...activeTasks, ...completedTasks];
    const now = new Date();
    
    const overdueTasks = allTasks.filter(task => {
      if (task.status === 'completed' || !task.date) return false;
      const taskDateTime = new Date(`${task.date}T${task.time || '23:59'}`);
      return taskDateTime < now;
    });
    
    const counts = {
      all: allTasks.length,
      active: activeTasks.length,
      completed: completedTasks.length,
      overdue: overdueTasks.length,
    };
    
    let filtered: Task[] = [];
    
    switch (filter) {
      case 'all':
        filtered = allTasks;
        break;
      case 'active':
        filtered = activeTasks;
        break;
      case 'completed':
        filtered = completedTasks;
        break;
      case 'overdue':
        filtered = overdueTasks;
        break;
    }
    
    // Sort by priority and due date
    filtered.sort((a, b) => {
      // Completed tasks go to bottom
      if (a.status !== b.status) {
        return a.status === 'completed' ? 1 : -1;
      }
      
      // Priority order: high > medium > low
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Due date order: sooner first
      if (a.date && b.date) {
        const aDateTime = new Date(`${a.date}T${a.time || '23:59'}`);
        const bDateTime = new Date(`${b.date}T${b.time || '23:59'}`);
        return aDateTime.getTime() - bDateTime.getTime();
      }
      if (a.date) return -1;
      if (b.date) return 1;
      
      // Fallback to title alphabetical order
      return a.title.localeCompare(b.title);
    });
    
    return { filteredTasks: filtered, taskCounts: counts };
  }, [activeTasks, completedTasks, filter]);
  
  // Memoized handlers
  const handleToggleComplete = useCallback((taskId: string) => {
    const task = [...activeTasks, ...completedTasks].find(t => t.id === taskId);
    if (task) {
      const updatedTask = {
        ...task,
        status: task.status === 'completed' ? 'todo' as TaskStatus : 'completed' as TaskStatus
      };
      updateTask(updatedTask);
    }
  }, [activeTasks, completedTasks, updateTask]);
  
  const handleStartTimer = useCallback((taskId: string) => {
    const task = [...activeTasks, ...completedTasks].find(t => t.id === taskId);
    if (task) {
      startTimer(task);
    }
  }, [activeTasks, completedTasks, startTimer]);
  
  const handleEditTask = useCallback((task: Task) => {
    onEditTask?.(task);
  }, [onEditTask]);
  
  const handleDeleteTask = useCallback((taskId: string) => {
    archiveTask(taskId);
  }, [archiveTask]);
  
  const handleAddTask = useCallback(() => {
    onAddTask?.();
  }, [onAddTask]);
  
  const handleFilterChange = useCallback((newFilter: 'all' | 'active' | 'completed' | 'overdue') => {
    setFilter(newFilter);
  }, []);
  
  // Loading state
  if (!activeTasks && !completedTasks) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Tasks
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {showAddButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddTask}
              className="h-8 px-3"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Filter Controls */}
        <div className="mb-4">
          <FilterControls 
            filter={filter} 
            onFilterChange={handleFilterChange}
            taskCounts={taskCounts}
          />
        </div>
        
        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium mb-1">
              {filter === 'completed' ? 'No completed tasks' :
               filter === 'overdue' ? 'No overdue tasks' :
               filter === 'active' ? 'No active tasks' :
               'No tasks found'}
            </p>
            <p className="text-xs">
              {filter === 'active' && showAddButton ? 'Create your first task to get started!' :
               filter === 'completed' ? 'Complete some tasks to see them here.' :
               filter === 'overdue' ? 'Great! All your tasks are on time.' :
               'Try changing the filter or adding new tasks.'}
            </p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-2">
              {filteredTasks.map((task, index) => (
                <React.Fragment key={task.id}>
                  <TaskItem
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onStartTimer={handleStartTimer}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    isTimerActive={false} // TODO: Get from timer state
                  />
                  {index < filteredTasks.length - 1 && (
                    <Separator className="my-2" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Quick Stats */}
        {taskCounts.all > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {taskCounts.active}
                </div>
                <div className="text-xs text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {taskCounts.completed}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className={cn(
                  'text-lg font-semibold',
                  taskCounts.overdue > 0 ? 'text-red-600' : 'text-muted-foreground'
                )}>
                  {taskCounts.overdue}
                </div>
                <div className="text-xs text-muted-foreground">Overdue</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedTaskListWidget.displayName = 'OptimizedTaskListWidget';

export default OptimizedTaskListWidget;