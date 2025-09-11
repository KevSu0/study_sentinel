# Today's Activity UI Enhancement Plan

This document outlines the steps to implement a new UI for the "Today's Activity" section on the "Plans" page. The plan includes creating a compact list view, a toggle to switch between views, and updating the "Undo" logic.

---

### Step 1: Create `view-mode-toggle.tsx` Component

**Action:** Create a new component to handle the view mode switching.

**Location:** Create a new file at `src/components/plans/view-mode-toggle.tsx`.

**Expected Change (New File Content):**

```tsx
'use client';

import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TaskViewMode } from '@/hooks/use-view-mode';

interface ViewModeToggleProps {
  viewMode: TaskViewMode;
  setViewMode: (mode: TaskViewMode) => void;
}

export const ViewModeToggle = ({ viewMode, setViewMode }: ViewModeToggleProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          {viewMode === 'list' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => setViewMode('list')}>
          <List className="mr-2 h-4 w-4" />
          List View
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setViewMode('card')}>
          <LayoutGrid className="mr-2 h-4 w-4" />
          Card View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

---

### Step 2: Create `completed-plan-list-item.tsx` Component

**Action:** Create a new component for the compact list view of a single completed item.

**Location:** Create a new file at `src/components/plans/completed-plan-list-item.tsx`.

**Expected Change (New File Content):**

```tsx
'use client';

import React from 'react';
import { CheckCircle, Star, Timer, Undo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ActivityFeedItem } from '@/hooks/use-global-state';

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
};

interface CompletedPlanListItemProps {
  item: ActivityFeedItem;
  onUndo?: () => void;
  isUndone: boolean;
}

export const CompletedPlanListItem = ({ item, onUndo, isUndone }: CompletedPlanListItemProps) => {
  const isTask = item.type === 'TASK_COMPLETE';
  const data = item.data;
  
  const title = isTask ? data.task.title : data.payload.title;
  const duration = isTask ? data.task.duration * 60 : data.payload.duration;
  const points = isTask ? data.task.points : data.payload.points;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg p-2 transition-all text-sm',
        isUndone ? 'bg-muted/50' : 'hover:bg-muted/50'
      )}
    >
      <div className="flex-shrink-0">
        {isUndone ? (
          <Undo className="h-5 w-5 text-muted-foreground" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>

      <div className="flex-1 grid gap-0.5">
        <p className={cn("font-medium", isUndone && "line-through text-muted-foreground")}>
          {title}
        </p>
      </div>
      
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <span className="flex items-center gap-1">
          <Timer className="h-3 w-3" />
          {formatDuration(duration || 0)}
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 text-yellow-400" />
          {points || 0} pts
        </span>
      </div>

      <div className="flex-shrink-0">
        {onUndo && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onUndo} 
            className={cn("text-xs", isUndone && "pointer-events-none opacity-50")}
            disabled={isUndone}
          >
            Undo
          </Button>
        )}
      </div>
    </div>
  );
};
```

---

### Step 3: Update `completed-today-widget.tsx`

**Action:** Modify the `CompletedTodayWidget` to accept a `viewMode` prop and render the appropriate component.

**Location:** `src/components/dashboard/widgets/completed-today-widget.tsx`

**Expected Change:**

*   **Before (lines 33-41):**
    ```tsx
    export const CompletedTodayWidget = ({
      todaysActivity,
      completedItems,
      onUndoComplete,
    }: {
      todaysActivity: ActivityFeedItem[];
      completedItems?: CompletedPlanItem[];
      onUndoComplete?: (item: CompletedPlanItem) => void;
    }) => {
    ```
*   **After (add `viewMode` prop):**
    ```tsx
    import { CompletedPlanListItem } from '@/components/plans/completed-plan-list-item';
    import { TaskViewMode } from '@/hooks/use-view-mode';

    // ... (keep existing code)

    export const CompletedTodayWidget = ({
      todaysActivity,
      completedItems,
      onUndoComplete,
      viewMode = 'card',
    }: {
      todaysActivity: ActivityFeedItem[];
      completedItems?: CompletedPlanItem[];
      onUndoComplete?: (item: CompletedPlanItem) => void;
      viewMode?: TaskViewMode;
    }) => {
    ```

*   **Before (lines 67-78):**
    ```tsx
    {completedItems ? (
      completedItems.map((originalItem, index) => {
        const transformedItem = transformToActivityItem(originalItem);
        const itemId = 'id' in originalItem.data ? originalItem.data.id : index;
        return (
          <ActivityItem
            key={`${transformedItem.type}-${itemId}`}
            item={transformedItem}
            onUndo={onUndoComplete ? () => onUndoComplete(originalItem) : undefined}
          />
        );
      })
    ) : (
    ```
*   **After (add view switching logic):**
    ```tsx
    <div className={cn("space-y-3", viewMode === 'list' && "space-y-1")}>
      {completedItems ? (
        completedItems.map((originalItem, index) => {
          const transformedItem = transformToActivityItem(originalItem);
          const itemId = 'id' in originalItem.data ? originalItem.data.id : index;
          const isUndone = originalItem.type === 'completed_task' && originalItem.data.status !== 'completed';
          
          if (viewMode === 'list') {
            return (
              <CompletedPlanListItem
                key={`${transformedItem.type}-${itemId}`}
                item={transformedItem}
                onUndo={onUndoComplete ? () => onUndoComplete(originalItem) : undefined}
                isUndone={isUndone}
              />
            );
          }
          
          return (
            <ActivityItem
              key={`${transformedItem.type}-${itemId}`}
              item={transformedItem}
              onUndo={onUndoComplete ? () => onUndoComplete(originalItem) : undefined}
            />
          );
        })
      ) : (
    ```

---

### Step 4: Update `plans/page.tsx`

**Action:** Update the `PlansPage` to pass the `viewMode` to the widget and modify the "Undo" logic.

**Location:** `src/app/plans/page.tsx`

**Expected Change:**

1.  **Import new component:**
    *   Add `import { ViewModeToggle } from '@/components/plans/view-mode-toggle';` at the top.

2.  **Update View Mode Toggle UI:**
    *   **Before (lines 232-248):**
        ```tsx
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                {viewMode === 'list' ? <List className="h-5 w-5" /> : <LayoutGrid className="h-5 w-5" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setViewMode('list')}>
                <List className="mr-2 h-4 w-4" />
                List View
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setViewMode('card')}>
                <LayoutGrid className="mr-2 h-4 w-4" />
                Card View
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ```
    *   **After (use new component):**
        ```tsx
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
        ```

3.  **Update `CompletedTodayWidget` props:**
    *   **Before (lines 320-335):**
        ```tsx
        <CompletedTodayWidget 
          todaysActivity={todaysActivity} 
          completedItems={completedItems}
          onUndoComplete={(item) => {
            if (item.type === 'completed_routine') {
              handleUndoCompleteRoutine(item.data.id);
            } else {
              // Find the log entry to remove
              const logEntry = logs.find(l => l.type === 'TASK_COMPLETE' && l.payload.taskId === item.data.id);
              if (logEntry) {
                removeLog(logEntry.id);
              }
              updateTask({ ...item.data, status: 'todo' });
            }
          }}
        />
        ```
    *   **After (pass `viewMode` and update `onUndoComplete`):**
        ```tsx
        <CompletedTodayWidget 
          todaysActivity={todaysActivity} 
          completedItems={completedItems}
          viewMode={viewMode}
          onUndoComplete={(item) => {
            if (item.type === 'completed_routine') {
              // For now, routine undo remains the same
              handleUndoCompleteRoutine(item.data.id);
            } else {
              // IMPORTANT: Only update the task status. Do NOT remove the log.
              // This keeps the item in the completed list, and its "undone"
              // state is inferred from the task's status.
              updateTask({ ...item.data, status: 'todo' });
              toast.success('Task marked as not complete.');
            }
          }}
        />
        ```

---

### Step 5: Update `activity-item.tsx` for "Undone" State

**Action:** Modify the `ActivityItem` component to visually distinguish "undone" tasks.

**Location:** `src/components/dashboard/activity/activity-item.tsx`

**Expected Change:**

1.  **Update Props:**
    *   **Before (lines 38-41):**
        ```tsx
        }: {
          item: ActivityFeedItem;
          onUndo?: () => void;
        }) {
        ```
    *   **After (add `isUndone` prop):**
        ```tsx
        }: {
          item: ActivityFeedItem;
          onUndo?: () => void;
          isUndone: boolean;
        }) {
        ```

2.  **Update `TASK_COMPLETE` case:**
    *   **Before (lines 53-63):**
        ```tsx
        <div className={cn(baseClasses, 'border-green-500/50')}>
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div className="flex-1 grid gap-1">
            <div className="flex justify-between items-center">
              <p className="font-medium text-muted-foreground line-through">
                {task.title}
              </p>
              {onUndo && (
                <button onClick={onUndo} className="text-xs text-muted-foreground hover:text-primary">Undo</button>
              )}
            </div>
        ```
    *   **After (handle `isUndone` state):**
        ```tsx
        <div className={cn(baseClasses, isUndone ? 'border-muted/50' : 'border-green-500/50')}>
          {isUndone ? (
            <Undo className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 grid gap-1">
            <div className="flex justify-between items-center">
              <p className={cn("font-medium", isUndone ? "text-muted-foreground" : "line-through")}>
                {task.title}
              </p>
              {onUndo && (
                <button 
                  onClick={onUndo} 
                  className={cn("text-xs text-muted-foreground hover:text-primary", isUndone && "pointer-events-none opacity-50")}
                  disabled={isUndone}
                >
                  Undo
                </button>
              )}
            </div>
        ```
This detailed plan should be sufficient for the subordinate AI to execute the required changes.