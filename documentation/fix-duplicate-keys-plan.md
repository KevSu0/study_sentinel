# Plan to Fix Duplicate Keys Error

This plan outlines the necessary changes to resolve the "Encountered two children with the same key" error in the application.

### 1. Update `CompletedPlanItem` type in `src/app/plans/page.tsx`

*   **Action**: Add the `logId` property to the `completed_task` type within the `CompletedPlanItem` union type. This will allow us to pass the unique log ID for each completed task.
*   **Location**:
    *   File: [`src/app/plans/page.tsx`](src/app/plans/page.tsx)
    *   Lines: 62
*   **Expected Change**:

    **Before**:
    ```typescript
    type CompletedPlanItem =
      | { type: 'completed_task'; data: StudyTask; completed_at: string; timestamp: number }
      | { type: 'completed_routine'; data: LogEvent; completed_at: string; timestamp: number };
    ```

    **After**:
    ```typescript
    type CompletedPlanItem =
      | { type: 'completed_task'; data: StudyTask; completed_at: string; timestamp: number; logId: string; }
      | { type: 'completed_routine'; data: LogEvent; completed_at: string; timestamp: number };
    ```

### 2. Update `completedTasks` creation in `src/app/plans/page.tsx`

*   **Action**: When creating the `completedTasks` array, include the `logId` from the log event (`l.id`).
*   **Location**:
    *   File: [`src/app/plans/page.tsx`](src/app/plans/page.tsx)
    *   Lines: 124-135
*   **Expected Change**:

    **Before**:
    ```typescript
          acc.push({
            type: 'completed_task',
            data: task,
            completed_at: l.timestamp,
            timestamp: parseISO(l.timestamp).getTime(),
          });
    ```

    **After**:
    ```typescript
          acc.push({
            type: 'completed_task',
            data: task,
            completed_at: l.timestamp,
            timestamp: parseISO(l.timestamp).getTime(),
            logId: l.id,
          });
    ```

### 3. Update `CompletedPlanItem` type in `src/components/dashboard/widgets/completed-today-widget.tsx`

*   **Action**: Mirror the change from step 1 in this component to ensure type consistency.
*   **Location**:
    *   File: [`src/components/dashboard/widgets/completed-today-widget.tsx`](src/components/dashboard/widgets/completed-today-widget.tsx)
    *   Lines: 14
*   **Expected Change**:

    **Before**:
    ```typescript
    type CompletedPlanItem =
      | { type: 'completed_task'; data: StudyTask; completed_at: string; timestamp: number }
      | { type: 'completed_routine'; data: LogEvent; completed_at: string; timestamp: number };
    ```

    **After**:
    ```typescript
    type CompletedPlanItem =
      | { type: 'completed_task'; data: StudyTask; completed_at: string; timestamp: number; logId: string; }
      | { type: 'completed_routine'; data: LogEvent; completed_at: string; timestamp: number };
    ```

### 4. Update `transformToActivityItem` in `src/components/dashboard/widgets/completed-today-widget.tsx`

*   **Action**: The `transformToActivityItem` function needs to be updated to handle the `CompletedPlanItem` with the new `logId` property.
*   **Location**:
    *   File: [`src/components/dashboard/widgets/completed-today-widget.tsx`](src/components/dashboard/widgets/completed-today-widget.tsx)
    *   Lines: 17-34
*   **Expected Change**:

    **Before**:
    ```typescript
    const transformToActivityItem = (item: CompletedPlanItem): ActivityFeedItem => {
      if (item.type === 'completed_task') {
        const task = item.data;
        const fakeSessionLog = { payload: {duration: task.duration * 60, points: task.points} };
        return {
          type: 'TASK_COMPLETE',
          data: { task, log: fakeSessionLog },
          timestamp: formatISO(new Date(item.completed_at)),
        };
      } else {
        const log = item.data;
        return {
          type: 'ROUTINE_COMPLETE',
          data: log,
          timestamp: formatISO(new Date(item.completed_at)),
        };
      }
    };
    ```

    **After**:
    ```typescript
    const transformToActivityItem = (item: CompletedPlanItem): ActivityFeedItem => {
      if (item.type === 'completed_task') {
        const task = item.data;
        const fakeSessionLog = {
          id: item.logId, // Pass the logId
          payload: { duration: task.duration * 60, points: task.points },
        };
        return {
          type: 'TASK_COMPLETE',
          data: { task, log: fakeSessionLog },
          timestamp: formatISO(new Date(item.completed_at)),
        };
      } else {
        const log = item.data;
        return {
          type: 'ROUTINE_COMPLETE',
          data: log,
          timestamp: formatISO(new Date(item.completed_at)),
        };
      }
    };
    ```

### 5. Update key generation in `src/components/dashboard/widgets/completed-today-widget.tsx`

*   **Action**: Modify the key generation logic to use the `logId` for completed tasks, ensuring a unique key for every rendered item.
*   **Location**:
    *   File: [`src/components/dashboard/widgets/completed-today-widget.tsx`](src/components/dashboard/widgets/completed-today-widget.tsx)
    *   Lines: 77
*   **Expected Change**:

    **Before**:
    ```typescript
    const itemId = 'id' in originalItem.data ? originalItem.data.id : ('id' in transformedItem.data ? transformedItem.data.id : index);
    ```

    **After**:
    ```typescript
    const itemId = originalItem.type === 'completed_task' ? originalItem.logId : originalItem.data.id;