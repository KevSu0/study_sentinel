# Point System Reconstruction Plan

This document outlines the steps required to reconstruct the point system for routines and tasks.

## 1. Update Data Structures

- **Action:** Add a `priority` field to the `Routine` type definition.
- **Location:** [`src/lib/types.ts`](src/lib/types.ts:24), inside the `Routine` interface.
- **Expected Change:**
    - **Before:**
        ```typescript
        export type Routine = {
          id: string;
          title: string;
          description?: string;
          days: number[]; // 0 = Sunday, 1 = Monday, etc.
          startTime: string; // HH:mm
          endTime: string; // HH:mm
        };
        ```
    - **After:**
        ```typescript
        export type Routine = {
          id: string;
          title: string;
          description?: string;
          days: number[]; // 0 = Sunday, 1 = Monday, etc.
          startTime: string; // HH:mm
          endTime: string; // HH:mm
          priority: TaskPriority;
        };
        ```

## 2. Update Task Point Calculation

- **Action:** Modify the `calculatePoints` function to use the new point calculation logic.
- **Location:** [`src/components/tasks/add-task-dialog.tsx`](src/components/tasks/add-task-dialog.tsx:105), line 105.
- **Expected Change:**
    - **Before:**
        ```typescript
        const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 1.5, high: 2 };

        const calculatePoints = (duration: number, priority: TaskPriority) => {
          return Math.round((duration / 60) * 10 * priorityMultipliers[priority]);
        };
        ```
    - **After:**
        ```typescript
        const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };

        const calculatePoints = (duration: number, priority: TaskPriority) => {
          return Math.round(duration * priorityMultipliers[priority]);
        };
        ```

## 3. Update Routine Management UI

- **Action:** Add a priority selector to the routine form.
- **Location:** [`src/components/timetable/add-routine-dialog.tsx`](src/components/timetable/add-routine-dialog.tsx)
- **Changes:**
    1.  **Import `TaskPriority`:**
        - **Location:** Line 28
        - **Before:** `import {Routine} from '@/lib/types';`
        - **After:** `import {Routine, TaskPriority} from '@/lib/types';`
    2.  **Update `routineSchema`:**
        - **Location:** Inside `routineSchema` definition, after `endTime`.
        - **Change:** Add `priority: z.enum(['low', 'medium', 'high']),`
    3.  **Add `priorityOptions`:**
        - **Location:** After `daysOfWeek` definition (line 63).
        - **Change:**
            ```typescript
            const priorityOptions: {value: TaskPriority; label: string}[] = [
              {value: 'low', label: 'Low'},
              {value: 'medium', label: 'Medium'},
              {value: 'high', label: 'High'},
            ];
            ```
    4.  **Update `defaultValues` in `useForm`:**
        - **Location:** Inside `useForm` hook.
        - **Change:** Add `priority: 'medium',`
    5.  **Update `reset` logic in `useEffect`:**
        - **Location:** Inside `useEffect` hook.
        - **Change:** Add `priority: 'medium',` to the `else` block and `priority: routineToEdit.priority,` to the `if` block.
    6.  **Add priority selector UI:**
        - **Location:** Inside the `RoutineForm` component, after the `endTime` input field div.
        - **Change:**
            ```tsx
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Controller name="priority" control={control} render={({field}) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="priority" className="mt-1"><SelectValue placeholder="Select priority" /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {errors.priority && <p className="text-sm text-destructive mt-1">{errors.priority.message}</p>}
            </div>
            ```

## 4. Update Routine Point Calculation

- **Action:** Update the point calculation logic for routines.
- **Location:** [`src/hooks/use-global-state.tsx`](src/hooks/use-global-state.tsx), inside `stopTimer` and `completeTimer` functions.
- **Changes:**
    1.  **`stopTimer` function:**
        - **Location:** Line 586
        - **Before:** `const points = Math.floor(durationInSeconds / 60 / 10);`
        - **After:**
            ```typescript
            const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
            const points = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
            ```
    2.  **`completeTimer` function:**
        - **Location:** Line 610
        - **Before:** `const points = Math.floor(durationInSeconds / 60 / 10);`
        - **After:**
            ```typescript
            const priorityMultipliers: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
            const points = Math.floor((durationInSeconds / 60) * priorityMultipliers[item.item.priority]);
            ```
    3.  **`addRoutine` function:**
        - **Location:** Line 621
        - **Before:** `const newRoutine: Routine = { ...routine, id: crypto.randomUUID(), description: routine.description || '' };`
        - **After:** `const newRoutine: Routine = { ...routine, id: crypto.randomUUID(), description: routine.description || '', priority: routine.priority || 'medium' };`