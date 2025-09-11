# "Hard Undo" Feature Implementation Plan

This document outlines the steps to implement a "Hard Undo" feature, which will give users two ways to undo a completed task: a "Normal Undo" that preserves the record and a "Hard Undo" that completely removes it.

---

### Step 1: Update `completed-plan-list-item.tsx`

**Action:** Add a dropdown menu to the list item to provide "Normal Undo" and "Hard Undo" options.

**Location:** `src/components/plans/completed-plan-list-item.tsx`

**Expected Change:**

1.  **Import new dependencies:**
    ```tsx
    import { MoreHorizontal } from 'lucide-react';
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuTrigger,
    } from '@/components/ui/dropdown-menu';
    ```

2.  **Update props:** Add an `onHardUndo` function to the props.
    ```tsx
    interface CompletedPlanListItemProps {
      item: ActivityFeedItem;
      onUndo?: () => void;
      onHardUndo?: () => void; // Add this
      isUndone: boolean;
    }
    ```

3.  **Update component return:** Replace the existing "Undo" button with a dropdown menu.
    *   **Replace this (lines 70-82):**
        ```tsx
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
        ```
    *   **With this:**
        ```tsx
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onUndo} disabled={isUndone}>
                Normal Undo
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onHardUndo} className="text-destructive">
                Hard Undo (Reset)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        ```

---

### Step 2: Update `activity-item.tsx`

**Action:** Add the same dropdown menu to the card view.

**Location:** `src/components/dashboard/activity/activity-item.tsx`

**Expected Change:**

1.  **Import new dependencies:**
    ```tsx
    import { MoreHorizontal } from 'lucide-react';
    import {
      DropdownMenu,
      DropdownMenuContent,
      DropdownMenuItem,
      DropdownMenuTrigger,
    } from '@/components/ui/dropdown-menu';
    ```

2.  **Update props:** Add the `onHardUndo` function to the props.
    ```tsx
    interface ActivityItemProps {
      item: ActivityFeedItem;
      onUndo?: () => void;
      onHardUndo?: () => void; // Add this
      isUndone: boolean;
    }
    ```

3.  **Update `TASK_COMPLETE` case:** Replace the "Undo" button with the new dropdown.
    *   **Replace this (lines 67-75):**
        ```tsx
        {onUndo && (
          <button
            onClick={onUndo}
            className={cn("text-xs text-muted-foreground hover:text-primary", isUndone && "pointer-events-none opacity-50")}
            disabled={isUndone}
          >
            Undo
          </button>
        )}
        ```
    *   **With this:**
        ```tsx
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onUndo} disabled={isUndone}>
              Normal Undo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onHardUndo} className="text-destructive">
              Hard Undo (Reset)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        ```

---

### Step 3: Update `completed-today-widget.tsx`

**Action:** Pass the new `onHardUndoComplete` prop down to the child components.

**Location:** `src/components/dashboard/widgets/completed-today-widget.tsx`

**Expected Change:**

1.  **Update props:** Add `onHardUndoComplete` to the props interface.
    ```tsx
    onUndoComplete?: (item: CompletedPlanItem) => void;
    onHardUndoComplete?: (item: CompletedPlanItem) => void; // Add this
    viewMode?: TaskViewMode;
    ```

2.  **Update component calls:** Pass the new prop to both `CompletedPlanListItem` and `ActivityItem`.
    *   In the `completedItems.map` function, add the `onHardUndo` prop:
        ```tsx
        <CompletedPlanListItem
          // ... other props
          onHardUndo={onHardUndoComplete ? () => onHardUndoComplete(originalItem) : undefined}
        />
        // ...
        <ActivityItem
          // ... other props
          onHardUndo={onHardUndoComplete ? () => onHardUndoComplete(originalItem) : undefined}
        />
        ```
    *   Do the same for the `todaysActivity.map` function.

---

### Step 4: Update `plans/page.tsx`

**Action:** Implement the final logic for "Hard Undo" in the main page component.

**Location:** `src/app/plans/page.tsx`

**Expected Change:**

1.  **Define `handleHardUndo` function:** Create a new handler function inside the `PlansPage` component.
    ```tsx
    const handleHardUndo = (item: CompletedPlanItem) => {
      if (item.type === 'completed_routine') {
        // For routines, hard undo is the same as normal undo for now
        handleUndoCompleteRoutine(item.data.id);
        toast.success('Routine completion reset.');
      } else {
        // For tasks, find the log and remove it
        const logEntry = logs.find(l => l.type === 'TASK_COMPLETE' && l.payload.taskId === item.data.id);
        if (logEntry) {
          removeLog(logEntry.id);
        }
        // Also reset the task status
        updateTask({ ...item.data, status: 'todo' });
        toast.error('Task completion has been permanently reset.');
      }
    };
    ```

2.  **Update `CompletedTodayWidget` call:** Pass the new `onHardUndoComplete` prop to the widget.
    *   **Inside the return statement, update the widget:**
        ```tsx
        <CompletedTodayWidget 
          // ... other props
          onHardUndoComplete={handleHardUndo}
        />
        ```
This plan provides all the necessary steps to implement the "Hard Undo" functionality.