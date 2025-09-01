'use client';

import React, { memo, useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  RotateCcw, 
  Play, 
  Pause, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar,
  Repeat,
  Plus,
  MoreHorizontal,
  Target,
  TrendingUp
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useGlobalState } from '@/hooks/use-global-state';
import { formatDistanceToNow, format, isToday, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Routine } from '@/lib/types';

// Memoized frequency colors and labels
const FREQUENCY_CONFIG = {
  daily: { 
    label: 'Daily', 
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: Calendar 
  },
  weekly: { 
    label: 'Weekly', 
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: Calendar 
  },
  monthly: { 
    label: 'Monthly', 
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    icon: Calendar 
  },
} as const;

// Memoized routine item component
interface RoutineItemProps {
  routine: Routine;
  onToggleComplete: (routineId: string) => void;
  onStartRoutine: (routineId: string) => void;
  onEdit: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  isActive: boolean;
}

const RoutineItem = memo<RoutineItemProps>(({ 
  routine, 
  onToggleComplete, 
  onStartRoutine, 
  onEdit, 
  onDelete,
  isActive 
}) => {
  const handleToggleComplete = useCallback(() => {
    onToggleComplete(routine.id);
  }, [routine.id, onToggleComplete]);
  
  const handleStartRoutine = useCallback(() => {
    onStartRoutine(routine.id);
  }, [routine.id, onStartRoutine]);
  
  const handleEdit = useCallback(() => {
    onEdit(routine);
  }, [routine, onEdit]);
  
  const handleDelete = useCallback(() => {
    onDelete(routine.id);
  }, [routine.id, onDelete]);
  
  // Memoized computed values
  const isCompletedToday = useMemo(() => {
    return routine.status === 'completed';
  }, [routine.status]);
  
  const streakInfo = useMemo(() => {
    // Since we don't have completion history, return basic streak info
    return { current: routine.status === 'completed' ? 1 : 0, best: 1 };
  }, [routine.status]);
  
  const completionRate = useMemo(() => {
    // Since we don't have completion history, return basic completion rate
    return routine.status === 'completed' ? 100 : 0;
  }, [routine.status]);
  
  // Default to daily frequency since Routine type doesn't have frequency property
  const frequencyConfig = FREQUENCY_CONFIG['daily'];
  const FrequencyIcon = frequencyConfig.icon;
  
  return (
    <div className={cn(
      'group flex items-start gap-3 p-4 rounded-lg border transition-all duration-200',
      'hover:shadow-sm hover:border-border',
      isCompletedToday && 'bg-green-50/50 border-green-200',
      isActive && 'ring-2 ring-primary ring-offset-2'
    )}>
      {/* Completion Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 mt-1 shrink-0"
        onClick={handleToggleComplete}
      >
        {isCompletedToday ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
        )}
      </Button>
      
      {/* Routine Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className={cn(
              'font-medium text-sm leading-tight mb-1',
              isCompletedToday && 'text-green-700'
            )}>
              {routine.title}
            </h4>
            
            {routine.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {routine.description}
              </p>
            )}
          </div>
          
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
                Edit Routine
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleStartRoutine}
                disabled={isCompletedToday || isActive}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Routine
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600 focus:text-red-600"
              >
                Delete Routine
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Routine Meta Info */}
        <div className="flex items-center gap-3 text-xs">
          {/* Frequency Badge */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full border',
            frequencyConfig.color
          )}>
            <FrequencyIcon className="h-3 w-3" />
            <span>{frequencyConfig.label}</span>
          </div>
          
          {/* Time Range */}
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{routine.startTime} - {routine.endTime}</span>
          </div>
          
          {/* Priority */}
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            {routine.priority}
          </Badge>
        </div>
        
        {/* Progress and Stats */}
        <div className="space-y-2">
          {/* Completion Rate Progress */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">30-day completion</span>
              <span className="font-medium">{completionRate}%</span>
            </div>
            <Progress value={completionRate} className="h-1.5" />
          </div>
          
          {/* Streak Info */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3 text-orange-500" />
              <span className="text-muted-foreground">Current:</span>
              <span className="font-medium">{streakInfo.current} days</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">Best:</span>
              <span className="font-medium">{streakInfo.best} days</span>
            </div>
          </div>
        </div>
        
        {/* Last Completion */}
        {isCompletedToday && (
          <div className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed today</span>
          </div>
        )}
      </div>
    </div>
  );
});

RoutineItem.displayName = 'RoutineItem';

// Memoized filter controls
interface FilterControlsProps {
  filter: 'all' | 'active' | 'completed' | 'pending';
  onFilterChange: (filter: 'all' | 'active' | 'completed' | 'pending') => void;
  routineCounts: {
    all: number;
    active: number;
    completed: number;
    pending: number;
  };
}

const FilterControls = memo<FilterControlsProps>(({ filter, onFilterChange, routineCounts }) => {
  const handleAllClick = useCallback(() => onFilterChange('all'), [onFilterChange]);
  const handleActiveClick = useCallback(() => onFilterChange('active'), [onFilterChange]);
  const handleCompletedClick = useCallback(() => onFilterChange('completed'), [onFilterChange]);
  const handlePendingClick = useCallback(() => onFilterChange('pending'), [onFilterChange]);
  
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={filter === 'all' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleAllClick}
        className="h-7 px-2 text-xs"
      >
        All ({routineCounts.all})
      </Button>
      <Button
        variant={filter === 'active' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleActiveClick}
        className="h-7 px-2 text-xs"
      >
        Active ({routineCounts.active})
      </Button>
      <Button
        variant={filter === 'completed' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleCompletedClick}
        className="h-7 px-2 text-xs"
      >
        Done ({routineCounts.completed})
      </Button>
      <Button
        variant={filter === 'pending' ? 'default' : 'ghost'}
        size="sm"
        onClick={handlePendingClick}
        className="h-7 px-2 text-xs"
      >
        Pending ({routineCounts.pending})
      </Button>
    </div>
  );
});

FilterControls.displayName = 'FilterControls';

// Main optimized component
interface OptimizedRoutineTrackerWidgetProps {
  className?: string;
  maxHeight?: number;
  showAddButton?: boolean;
  onAddRoutine?: () => void;
  onEditRoutine?: (routine: Routine) => void;
}

const OptimizedRoutineTrackerWidget = memo<OptimizedRoutineTrackerWidgetProps>(({ 
  className = '',
  maxHeight = 400,
  showAddButton = true,
  onAddRoutine,
  onEditRoutine
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pending'>('active');
  
  // Use global state
  const { state, updateRoutine, deleteRoutine, startTimer } = useGlobalState();
  const activeRoutines = state.routines.filter(r => r.status !== 'completed');
  const completedRoutines = state.routines.filter(r => r.status === 'completed');
  
  // Memoized filtered routines
  const { filteredRoutines, routineCounts } = useMemo(() => {
    const allRoutines = [...activeRoutines, ...completedRoutines];
    
    const counts = {
      all: allRoutines.length,
      active: activeRoutines.length,
      completed: completedRoutines.length,
      pending: activeRoutines.length, // Active routines are pending
    };
    
    let filtered: Routine[] = [];
    
    switch (filter) {
      case 'all':
        filtered = allRoutines;
        break;
      case 'active':
        filtered = activeRoutines;
        break;
      case 'completed':
        filtered = completedRoutines;
        break;
      case 'pending':
        filtered = activeRoutines; // Active routines are pending
        break;
    }
    
    // Sort by status and title
    filtered.sort((a, b) => {
      // Completed routines last
      if (a.status !== b.status) {
        return a.status === 'completed' ? 1 : -1;
      }
      
      // Then by title
      return a.title.localeCompare(b.title);
    });
    
    return { filteredRoutines: filtered, routineCounts: counts };
  }, [activeRoutines, completedRoutines, filter]);
  
  // Memoized handlers
  const handleToggleComplete = useCallback((routineId: string) => {
    const routine = [...activeRoutines, ...completedRoutines].find(r => r.id === routineId);
    if (!routine) return;
    
    // Toggle routine status between 'todo' and 'completed'
    const newStatus: 'todo' | 'completed' = routine.status === 'completed' ? 'todo' : 'completed';
    const updatedRoutine = { ...routine, status: newStatus };
    updateRoutine(updatedRoutine);
  }, [activeRoutines, completedRoutines, updateRoutine]);
  
  const handleStartRoutine = useCallback((routineId: string) => {
    const routine = [...activeRoutines, ...completedRoutines].find(r => r.id === routineId);
    if (routine) {
      startTimer(routine);
    }
  }, [activeRoutines, completedRoutines, startTimer]);
  
  const handleEditRoutine = useCallback((routine: Routine) => {
    onEditRoutine?.(routine);
  }, [onEditRoutine]);
  
  const handleDeleteRoutine = useCallback((routineId: string) => {
    deleteRoutine(routineId);
  }, [deleteRoutine]);
  
  const handleAddRoutine = useCallback(() => {
    onAddRoutine?.();
  }, [onAddRoutine]);
  
  const handleFilterChange = useCallback((newFilter: 'all' | 'active' | 'completed' | 'pending') => {
    setFilter(newFilter);
  }, []);
  
  // Loading state
  if (!activeRoutines && !completedRoutines) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-2 w-full" />
                  </div>
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
          <RotateCcw className="h-5 w-5" />
          Routines
        </CardTitle>
        
        <div className="flex items-center gap-2">
          {showAddButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRoutine}
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
            routineCounts={routineCounts}
          />
        </div>
        
        {/* Routine List */}
        {filteredRoutines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <RotateCcw className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm font-medium mb-1">
              {filter === 'completed' ? 'No completed routines today' :
               filter === 'pending' ? 'No pending routines' :
               filter === 'active' ? 'No active routines' :
               'No routines found'}
            </p>
            <p className="text-xs">
              {filter === 'active' && showAddButton ? 'Create your first routine to build habits!' :
               filter === 'completed' ? 'Complete some routines to see them here.' :
               filter === 'pending' ? 'Great! All routines are completed for today.' :
               'Try changing the filter or adding new routines.'}
            </p>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-3">
              {filteredRoutines.map((routine, index) => (
                <React.Fragment key={routine.id}>
                  <RoutineItem
                    routine={routine}
                    onToggleComplete={handleToggleComplete}
                    onStartRoutine={handleStartRoutine}
                    onEdit={handleEditRoutine}
                    onDelete={handleDeleteRoutine}
                    isActive={false} // TODO: Get from routine state
                  />
                  {index < filteredRoutines.length - 1 && (
                    <Separator className="my-3" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        )}
        
        {/* Quick Stats */}
        {routineCounts.all > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-blue-600">
                  {routineCounts.pending}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {routineCounts.completed}
                </div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-purple-600">
                  {Math.round((routineCounts.completed / routineCounts.all) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

OptimizedRoutineTrackerWidget.displayName = 'OptimizedRoutineTrackerWidget';

export default OptimizedRoutineTrackerWidget;