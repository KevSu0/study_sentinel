# Task and Routine Management

Users can create, manage, and track two primary types of activities: Tasks and Routines.

- **Tasks**: Represent specific, one-off study goals.
  - **Properties**: Title, description, date, time, duration, priority, and points.
  - **Timer Types**:
    - **Countdown**: For tasks with a fixed duration.
    - **Infinity (Stopwatch)**: For tasks where the duration is not predetermined.
  - **Actions**: Tasks can be archived, unarchived, or pushed to the next day.
- **Routines**: Represent recurring activities or subjects (e.g., "Math Practice," "Reading").
  - **Properties**: Title, description, start time, end time, and priority.
  - **Functionality**: Routines are primarily used with the stopwatch timer to log time spent on a general activity.

- **Implementation**:
  - **UI**: `components/tasks/add-task-dialog.tsx` provides a unified interface for creating and editing both tasks and routines.
  - **State**: Managed within `hooks/use-global-state.tsx`.
  - **Persistence**: Handled by `lib/repositories/task.repository.ts` and `lib/repositories/routine.repository.ts`.