# Mobile Optimization Implementation Plan

This document provides a step-by-step guide for a subordinate AI to refactor the "Plans" and "Timer" pages for a responsive, mobile-first experience.

---

### 1. Refactor Timer Controls for Responsiveness

**Action:** Modify the `TimerControls` component to stack its buttons vertically on small screens, making them easier to use on mobile devices.

**Location:**
*   **File:** [`src/components/tasks/timer-controls.tsx`](src/components/tasks/timer-controls.tsx)
*   **Function:** `TimerControls`
*   **Lines:** 16-28

**Expected Change:**

**Before:**
```typescript
<div className="flex items-center justify-center gap-4">
  <Button size="lg" variant="outline" onClick={onTogglePause} className="w-32">
    {isPaused ? <Play className="mr-2" /> : <Pause className="mr-2" />}
    {isPaused ? 'Resume' : 'Pause'}
  </Button>
  <Button size="lg" onClick={onComplete} className="w-48 bg-green-500 hover:bg-green-600 text-white">
    <CheckCircle className="mr-2" />
    Complete
  </Button>
  <Button size="lg" variant="destructive" onClick={onStop} className="w-32">
    <XCircle className="mr-2" />
    Stop
  </Button>
</div>
```

**After:**
```typescript
<div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0">
  <Button size="lg" variant="outline" onClick={onTogglePause} className="w-full sm:w-32">
    {isPaused ? <Play className="mr-2" /> : <Pause className="mr-2" />}
    {isPaused ? 'Resume' : 'Pause'}
  </Button>
  <Button size="lg" onClick={onComplete} className="w-full sm:w-48 bg-green-500 hover:bg-green-600 text-white order-first sm:order-none">
    <CheckCircle className="mr-2" />
    Complete
  </Button>
  <Button size="lg" variant="destructive" onClick={onStop} className="w-full sm:w-32">
    <XCircle className="mr-2" />
    Stop
  </Button>
</div>
```

---

### 2. Make Plan Item Card More Compact on Mobile

**Action:** Adjust the `PlanItemCard` component to use a more vertical layout on small screens. The timeline element will be made less prominent, and the main content will wrap better.

**Location:**
*   **File:** [`src/components/plans/plan-item-card.tsx`](src/components/plans/plan-item-card.tsx)
*   **Function:** `PlanItemCard`
*   **Lines:** 139-155

**Expected Change:**

**Before:**
```typescript
<div className="flex items-start gap-3">
  {/* Timeline */}
  <div className="flex flex-col items-center h-full pt-1">
    <span className="text-xs font-mono text-muted-foreground">{time}</span>
    <div className="mt-1 h-full w-px bg-border" />
  </div>

  {/* Card */}
  <div className="w-full">
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border p-3 transition-all',
        isTask && !isCompleted && getPriorityStyles((item.data as StudyTask).priority),
        isRoutine && !isCompleted && 'border-purple-500/50 bg-purple-500/5',
        isCompleted && 'bg-background border-dashed',
        isTimerActiveForThis && 'ring-2 ring-primary'
      )}
    >
```

**After:**
```typescript
<div className="flex items-start gap-2 sm:gap-3">
  {/* Timeline */}
  <div className="flex flex-col items-center h-full pt-1 w-12 sm:w-auto">
    <span className="text-xs font-mono text-muted-foreground">{time}</span>
    <div className="mt-1 flex-grow w-px bg-border" />
  </div>

  {/* Card */}
  <div className="w-full">
    <div
      className={cn(
        'flex items-center gap-2 sm:gap-3 rounded-lg border p-2 sm:p-3 transition-all',
        isTask && !isCompleted && getPriorityStyles((item.data as StudyTask).priority),
        isRoutine && !isCompleted && 'border-purple-500/50 bg-purple-500/5',
        isCompleted && 'bg-background border-dashed',
        isTimerActiveForThis && 'ring-2 ring-primary'
      )}
    >
```

---

### 3. Optimize Plan Item Card Details for Mobile

**Action:** Make the details within the `PlanItemCard` wrap correctly and take up less horizontal space on mobile.

**Location:**
*   **File:** [`src/components/plans/plan-item-card.tsx`](src/components/plans/plan-item-card.tsx)
*   **Function:** `PlanItemCard`
*   **Lines:** 168-178

**Expected Change:**

**Before:**
```typescript
<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
  {item.type === 'task' && <TaskDetails data={item.data as StudyTask} />}
  {item.type === 'routine' && <RoutineDetails data={item.data as Routine} />}
  {item.type === 'completed_task' && <TaskDetails data={item.data as StudyTask} />}
  {item.type === 'completed_routine' && (
     <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TimerIcon className="h-3 w-3" />
        <span>Logged {format(parseISO(item.data.timestamp), 'p')}</span>
    </div>
  )}
</div>
```

**After:**
```typescript
<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
  {item.type === 'task' && <TaskDetails data={item.data as StudyTask} />}
  {item.type === 'routine' && <RoutineDetails data={item.data as Routine} />}
  {item.type === 'completed_task' && <TaskDetails data={item.data as StudyTask} />}
  {item.type === 'completed_routine' && (
     <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TimerIcon className="h-3 w-3" />
        <span>Logged {format(parseISO(item.data.timestamp), 'p')}</span>
    </div>
  )}
</div>
```

---

### 4. Adjust Plans Page Header for Small Screens

**Action:** Make the header controls on the `PlansPage` more compact on smaller screens.

**Location:**
*   **File:** [`src/app/plans/page.tsx`](src/app/plans/page.tsx)
*   **Lines:** 201-211

**Expected Change:**

**Before:**
```typescript
<div className="flex items-center gap-1 sm:gap-2">
  <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
    <ChevronLeft className="h-5 w-5" />
  </Button>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant={'outline'} className="text-base font-semibold w-40 sm:w-48 justify-center">
        <CalendarIcon className="mr-2 h-4 w-4" />
        {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}
      </Button>
    </PopoverTrigger>
```

**After:**
```typescript
<div className="flex items-center gap-1">
  <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
    <ChevronLeft className="h-5 w-5" />
  </Button>
  <Popover>
    <PopoverTrigger asChild>
      <Button variant={'outline'} className="text-sm sm:text-base font-semibold w-32 sm:w-48 justify-center">
        <CalendarIcon className="mr-2 h-4 w-4" />
        {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}
      </Button>
    </PopoverTrigger>
```

---

I have created the detailed plan. I will now switch to the Orchestrator to execute these changes.