'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { format, formatISO } from 'date-fns';
import type {
  StudyTask,
  Routine,
  LogEvent,
  UserProfile,
  Badge,
  ActiveTimerItem,
  CompletedWork,
  TaskPriority,
  SoundSettings,
} from '@/lib/types';
import { taskRepository, routineRepository, profileRepository, badgeRepository, eventRepository } from '@/lib/repositories';
import { getSessionDate, getStudyDateForTimestamp, getStudyDayBounds } from '@/lib/utils';
import { buildSessionsFromEvents } from '@/lib/projections/sessions';
import { buildActivityFromEvents } from '@/lib/projections/activity';

export type ActivityFeedItem = { type: 'TASK_COMPLETE' | 'ROUTINE_COMPLETE' | 'TASK_STOPPED' | 'TIMER_STOP'; data: any; timestamp: string };

type RoutineLogDialogState = { isOpen: boolean; action: 'complete' | 'stop' | null };
export type ManualLogFormData = {
  logDate: string;
  startTime: string;
  endTime: string;
  productiveDuration: number;
  breaks: number;
  notes?: string;
};

type AppState = {
  isLoaded: boolean;
  tasks: StudyTask[];
  logs: LogEvent[];
  profile: UserProfile;
  routines: Routine[];
  allBadges: Badge[];
  earnedBadges: Map<string, string>;
  soundSettings: SoundSettings;
  activeItem: ActiveTimerItem | null;
  timeDisplay: string;
  isPaused: boolean;
  isOvertime: boolean;
  isMuted: boolean;
  timerProgress: number | null;
  currentQuote: string;
  routineLogDialog: RoutineLogDialogState;
  todaysLogs: LogEvent[];
  previousDayLogs: LogEvent[];
  allCompletedWork: CompletedWork[];
  todaysCompletedWork: CompletedWork[];
  todaysPoints: number;
  todaysBadges: Badge[];
  starCount: number;
  showStarAnimation: boolean;
  todaysActivity: ActivityFeedItem[];
  quickStartOpen: boolean;
};

type GlobalStateContextType = {
  state: AppState;
  // tasks
  addTask: (task: Omit<StudyTask, 'id' | 'shortId' | 'status'> & { id?: string; shortId?: string }) => Promise<void>;
  updateTask: (updatedTask: StudyTask, isManualCompletion?: boolean) => void;
  archiveTask: (taskId: string) => void;
  unarchiveTask: (taskId: string) => void;
  pushTaskToNextDay: (taskId: string) => void;
  // timer
  startTimer: (item: StudyTask | Routine) => void;
  togglePause: () => void;
  completeTimer: (studyLog?: string) => void;
  stopTimer: (reason: string, studyLog?: string) => void;
  manuallyCompleteItem: (item: StudyTask | Routine, data: { productiveDuration: number; breaks: number; logDate?: string; startTime?: string; endTime?: string }) => void;
  // routines
  addRoutine: (routine: Omit<Routine, 'id' | 'shortId' | 'status' | 'createdAt'> & Partial<Pick<Routine, 'id'>>) => Promise<string>;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (routineId: string) => void;
  // badges
  addBadge: (badge: Omit<Badge, 'id'>) => Promise<void>;
  updateBadge: (badge: Badge) => void;
  deleteBadge: (badgeId: string) => Promise<void>;
  // profile/settings
  updateProfile: (p: Partial<UserProfile>) => void;
  setSoundSettings: (s: Partial<SoundSettings>) => void;
  toggleMute: () => void;
  retryItem: (item: ActivityFeedItem) => void;
  // ui
  openQuickStart: () => void;
  closeQuickStart: () => void;
  openRoutineLogDialog: (action: 'complete' | 'stop') => void;
  closeRoutineLogDialog: () => void;
};

const defaultSoundSettings: SoundSettings = { alarm: 'alarm_clock', tick: 'none', notificationInterval: 15 };
const defaultProfile: UserProfile = { name: 'Guest', dailyStudyGoal: 8 };

const initialState: AppState = {
  isLoaded: false,
  tasks: [],
  logs: [],
  profile: defaultProfile,
  routines: [],
  allBadges: [],
  earnedBadges: new Map(),
  soundSettings: defaultSoundSettings,
  activeItem: null,
  timeDisplay: '00:00',
  isPaused: true,
  isOvertime: false,
  isMuted: false,
  timerProgress: null,
  currentQuote: '',
  routineLogDialog: { isOpen: false, action: null },
  todaysLogs: [],
  previousDayLogs: [],
  allCompletedWork: [],
  todaysCompletedWork: [],
  todaysPoints: 0,
  todaysBadges: [],
  starCount: 0,
  showStarAnimation: false,
  todaysActivity: [],
  quickStartOpen: false,
};

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

async function emitEvent(type: string, payload: any) {
  const ts = formatISO(new Date());
  const dateKey = format(getStudyDateForTimestamp(ts), 'yyyy-MM-dd');
  await (eventRepository as any).add?.({ id: crypto.randomUUID(), type, timestamp: ts, payload, dateKey, meta: { v: 1 } });
}

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const loadingRef = useRef(false);

  const refreshTodayFromEvents = useCallback(async () => {
    try {
      const sessionDate = getSessionDate();
      const dayStr = format(sessionDate, 'yyyy-MM-dd');
      const { start, end } = getStudyDayBounds(sessionDate);
      const repo: any = eventRepository as any;
      const evts = typeof repo.getByTimestampRange === 'function'
        ? await repo.getByTimestampRange(start.toISOString(), end.toISOString())
        : await (eventRepository as any).getEventsByDate(dayStr);
      const sessions = buildSessionsFromEvents(evts as any);
      const items = buildActivityFromEvents(evts as any, state.tasks, state.routines) as ActivityFeedItem[];
      setState(prev => ({
        ...prev,
        allCompletedWork: sessions,
        todaysCompletedWork: sessions.filter(s => s.date === dayStr),
        todaysActivity: items,
      }));
    } catch {}
  }, [state.tasks, state.routines]);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    (async () => {
      try {
        const [tasks, routines, profile, badges] = await Promise.all([
          taskRepository.getAll().catch(() => []),
          routineRepository.getAll().catch(() => []),
          profileRepository.getById('user-profile').catch(() => defaultProfile),
          badgeRepository.getAll().catch(() => []),
        ]);
        setState(prev => ({ ...prev, tasks, routines, profile: profile || defaultProfile, allBadges: badges, isLoaded: true }));
        await refreshTodayFromEvents();
      } finally {
        loadingRef.current = false;
      }
    })();
  }, [refreshTodayFromEvents]);

  // tasks
  const addTask = useCallback(async (task: Omit<StudyTask, 'id' | 'shortId' | 'status'> & { id?: string; shortId?: string }) => {
    const id = task.id || crypto.randomUUID();
    const newTask: StudyTask = {
      ...task,
      id,
      shortId: task.shortId || `T-${id.slice(0, 6)}`,
      status: 'todo',
      description: task.description || '',
    } as StudyTask;
    await taskRepository.add(newTask);
    setState(prev => ({ ...prev, tasks: [...prev.tasks, newTask].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)) }));
    await emitEvent('TASK_ADD', { taskId: id, title: newTask.title });
  }, []);

  const updateTask = useCallback((updatedTask: StudyTask) => {
    taskRepository.update(updatedTask.id, updatedTask as any).catch(() => {});
    setState(prev => ({ ...prev, tasks: prev.tasks.map(t => (t.id === updatedTask.id ? updatedTask : t)) }));
  }, []);

  const archiveTask = useCallback((taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = { ...task, status: 'archived' as const };
    taskRepository.update(taskId, updated as any).catch(() => {});
    setState(prev => ({ ...prev, tasks: prev.tasks.map(t => (t.id === taskId ? updated : t)) }));
    emitEvent('TASK_ARCHIVE', { taskId, title: task.title });
  }, [state.tasks]);

  const unarchiveTask = useCallback((taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = { ...task, status: 'todo' as const };
    taskRepository.update(taskId, updated as any).catch(() => {});
    setState(prev => ({ ...prev, tasks: prev.tasks.map(t => (t.id === taskId ? updated : t)) }));
    emitEvent('TASK_UNARCHIVE', { taskId, title: task.title });
  }, [state.tasks]);

  const pushTaskToNextDay = useCallback((taskId: string) => {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;
    const [y, m, d] = task.date.split('-').map(n => parseInt(n, 10));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + 1);
    const newDate = format(dt, 'yyyy-MM-dd');
    const updated = { ...task, date: newDate };
    taskRepository.update(taskId, updated as any).catch(() => {});
    setState(prev => ({ ...prev, tasks: prev.tasks.map(t => (t.id === taskId ? updated : t)) }));
    emitEvent('TASK_PUSH_NEXT_DAY', { taskId, title: task.title });
  }, [state.tasks]);

  // timer
  const startTimer = useCallback((item: StudyTask | Routine) => {
    const activeItem: ActiveTimerItem = 'timerType' in item ? { type: 'task', item } : { type: 'routine', item } as any;
    setState(prev => ({ ...prev, activeItem, isPaused: false }));
    emitEvent('TIMER_START', { title: (item as any).title, taskId: (item as any).id, routineId: (item as any).id, startTime: formatISO(new Date()) });
  }, []);

  const togglePause = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    emitEvent('TIMER_PAUSE', { at: formatISO(new Date()) });
  }, []);

  const completeTimer = useCallback((studyLog?: string) => {
    const item = state.activeItem;
    if (!item) return;
    const now = new Date();
    if (item.type === 'task') {
      emitEvent('TIMER_SESSION_COMPLETE', { taskId: item.item.id, title: item.item.title, duration: (item.item.duration || 0) * 60, points: item.item.points, priority: item.item.priority, studyLog, endTime: formatISO(now) }).then(refreshTodayFromEvents);
      updateTask({ ...item.item, status: 'completed' });
    } else {
      emitEvent('ROUTINE_SESSION_COMPLETE', { routineId: item.item.id, title: item.item.title, duration: 0, points: 0, priority: item.item.priority, studyLog, endTime: formatISO(now) }).then(refreshTodayFromEvents);
    }
    setState(prev => ({ ...prev, activeItem: null, isPaused: true }));
  }, [state.activeItem, updateTask, refreshTodayFromEvents]);

  const stopTimer = useCallback((reason: string, studyLog?: string) => {
    const item = state.activeItem;
    if (!item) return;
    emitEvent('TIMER_STOP', { title: (item.item as any).title, reason, at: formatISO(new Date()) }).then(refreshTodayFromEvents);
    setState(prev => ({ ...prev, activeItem: null, isPaused: true }));
  }, [state.activeItem, refreshTodayFromEvents]);

  const manuallyCompleteItem = useCallback((item: StudyTask | Routine, data: { productiveDuration: number; breaks: number }) => {
    const pointsFromPriority = (p: TaskPriority, minutes: number) => {
      const mult: Record<TaskPriority, number> = { low: 1, medium: 2, high: 3 };
      return Math.floor((minutes / 60) * mult[p]);
    };
    if ('timerType' in item) {
      const pts = pointsFromPriority(item.priority, data.productiveDuration / 60);
      emitEvent('TIMER_SESSION_COMPLETE', { taskId: item.id, title: item.title, duration: data.productiveDuration, pausedDuration: data.breaks, points: pts, priority: item.priority, manual: true }).then(refreshTodayFromEvents);
      updateTask({ ...item, status: 'completed' });
    } else {
      emitEvent('ROUTINE_SESSION_COMPLETE', { routineId: item.id, title: item.title, duration: data.productiveDuration, pausedDuration: data.breaks, points: 0, priority: item.priority, manual: true }).then(refreshTodayFromEvents);
    }
  }, [updateTask, refreshTodayFromEvents]);

  // routines
  const addRoutine = useCallback(async (input: Omit<Routine, 'id' | 'shortId' | 'status' | 'createdAt'> & Partial<Pick<Routine, 'id'>>) => {
    const id = input.id || crypto.randomUUID();
    const r: Routine = { ...input, id, shortId: `R-${id.slice(0, 6)}`, status: 'todo', createdAt: Date.now(), title: input.title || 'Untitled Routine', priority: input.priority || 'medium', startTime: input.startTime || '08:00', endTime: input.endTime || '09:00', days: input.days || [1,2,3,4,5] } as Routine;
    await routineRepository.add(r);
    setState(prev => ({ ...prev, routines: [...prev.routines, r].sort((a, b) => a.startTime.localeCompare(b.startTime)) }));
    await emitEvent('ROUTINE_ADD', { routine: r });
    return id;
  }, []);

  const updateRoutine = useCallback((routine: Routine) => {
    routineRepository.update(routine.id, routine as any).catch(() => {});
    setState(prev => ({ ...prev, routines: prev.routines.map(r => (r.id === routine.id ? routine : r)).sort((a, b) => a.startTime.localeCompare(b.startTime)) }));
    emitEvent('ROUTINE_UPDATE', { routineId: routine.id, changes: routine });
  }, []);

  const deleteRoutine = useCallback((routineId: string) => {
    routineRepository.delete(routineId).catch(() => {});
    setState(prev => ({ ...prev, routines: prev.routines.filter(r => r.id !== routineId) }));
    emitEvent('ROUTINE_DELETE', { routineId });
  }, []);

  // badges
  const addBadge = useCallback(async (badgeData: Omit<Badge, 'id'>) => {
    const id = `custom_${crypto.randomUUID()}`;
    const badge: Badge = { ...badgeData, id } as any;
    await badgeRepository.add(badge);
    setState(prev => ({ ...prev, allBadges: [...prev.allBadges, badge] }));
  }, []);

  const updateBadge = useCallback((badge: Badge) => {
    badgeRepository.update(badge.id, badge as any).catch(() => {});
    setState(prev => ({ ...prev, allBadges: prev.allBadges.map(b => (b.id === badge.id ? badge : b)) }));
  }, []);

  const deleteBadge = useCallback(async (badgeId: string) => {
    await badgeRepository.delete(badgeId);
    setState(prev => ({ ...prev, allBadges: prev.allBadges.filter(b => b.id !== badgeId) }));
  }, []);

  // profile/settings
  const updateProfile = useCallback((p: Partial<UserProfile>) => {
    const next = { ...state.profile, ...p } as UserProfile;
    setState(prev => ({ ...prev, profile: next }));
    profileRepository.update('user-profile' as any, next as any).catch(() => {});
  }, [state.profile]);

  const setSoundSettings = useCallback((s: Partial<SoundSettings>) => {
    const next = { ...state.soundSettings, ...s };
    setState(prev => ({ ...prev, soundSettings: next }));
    try { localStorage.setItem('studySentinelSoundSettings_v1', JSON.stringify(next)); } catch {}
  }, [state.soundSettings]);

  const toggleMute = useCallback(() => setState(prev => ({ ...prev, isMuted: !prev.isMuted })), []);

  const retryItem = useCallback((item: ActivityFeedItem) => {
    if (item.type === 'TASK_COMPLETE') {
      const taskId = (item.data?.task?.id) || (item.data?.log?.payload?.taskId);
      if (taskId) emitEvent('TASK_RETRY', { originalTaskId: taskId }).then(refreshTodayFromEvents);
    } else if (item.type === 'ROUTINE_COMPLETE') {
      const routineId = (item.data?.routine?.id) || (item.data?.log?.payload?.routineId);
      if (routineId) emitEvent('ROUTINE_RETRY', { routineId }).then(refreshTodayFromEvents);
    }
  }, [refreshTodayFromEvents]);

  // ui
  const openQuickStart = useCallback(() => setState(prev => ({ ...prev, quickStartOpen: true })), []);
  const closeQuickStart = useCallback(() => setState(prev => ({ ...prev, quickStartOpen: false })), []);
  const openRoutineLogDialog = useCallback((action: 'complete' | 'stop') => setState(prev => ({ ...prev, routineLogDialog: { isOpen: true, action } })), []);
  const closeRoutineLogDialog = useCallback(() => setState(prev => ({ ...prev, routineLogDialog: { isOpen: false, action: null } })), []);

  const value = useMemo<GlobalStateContextType>(() => ({
    state,
    addTask,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    startTimer,
    togglePause,
    completeTimer,
    stopTimer,
    manuallyCompleteItem,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    addBadge,
    updateBadge,
    deleteBadge,
    updateProfile,
    setSoundSettings,
    toggleMute,
    retryItem,
    openQuickStart,
    closeQuickStart,
    openRoutineLogDialog,
    closeRoutineLogDialog,
  }), [state, addTask, updateTask, archiveTask, unarchiveTask, pushTaskToNextDay, startTimer, togglePause, completeTimer, stopTimer, manuallyCompleteItem, addRoutine, updateRoutine, deleteRoutine, addBadge, updateBadge, deleteBadge, updateProfile, setSoundSettings, toggleMute, retryItem, openQuickStart, closeQuickStart, openRoutineLogDialog, closeRoutineLogDialog]);

  return <GlobalStateContext.Provider value={value}>{children}</GlobalStateContext.Provider>;
}

export function useGlobalState() {
  const ctx = useContext(GlobalStateContext);
  if (!ctx) throw new Error('useGlobalState must be used within a GlobalStateProvider');
  return ctx;
}

