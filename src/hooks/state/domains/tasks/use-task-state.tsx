"use client";

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { StudyTask, TaskState } from './task-state-types';
import { loadJSON, saveJSON } from '../../core/use-state-persistence';

const STORAGE_KEY = 'state:tasks';

type Ctx = {
  state: TaskState;
  addTask: (t: Omit<StudyTask, 'id' | 'status'> & Partial<Pick<StudyTask, 'status'>>) => string;
  updateTask: (t: StudyTask) => void;
  archiveTask: (id: string) => void;
  unarchiveTask: (id: string) => void;
  pushTaskToNextDay: (id: string) => void;
};

const TaskContext = createContext<Ctx | undefined>(undefined);

export function TaskStateProvider({ children }: { children: ReactNode }) {
  const initial = loadJSON<TaskState>(STORAGE_KEY) ?? { tasks: [] };
  const [state, setState] = useState<TaskState>(initial);
  const persist = (next: TaskState) => saveJSON(STORAGE_KEY, next);

  const addTask = (t: Omit<StudyTask, 'id' | 'status'> & Partial<Pick<StudyTask, 'status'>>) => {
    const id = `${Date.now()}-${Math.random()}`;
    const task: StudyTask = { id, status: t.status ?? 'todo', ...t } as StudyTask;
    setState(prev => {
      const next = { tasks: [...prev.tasks, task] };
      persist(next);
      return next;
    });
    return id;
  };
  const updateTask = (u: StudyTask) => {
    setState(prev => {
      const next = { tasks: prev.tasks.map(x => (x.id === u.id ? u : x)) };
      persist(next);
      return next;
    });
  };
  const archiveTask = (id: string) => {
    setState(prev => {
      const next = { tasks: prev.tasks.map(x => (x.id === id ? { ...x, status: 'archived' } : x)) };
      persist(next);
      return next;
    });
  };
  const unarchiveTask = (id: string) => {
    setState(prev => {
      const next = { tasks: prev.tasks.map(x => (x.id === id ? { ...x, status: 'todo' } : x)) };
      persist(next);
      return next;
    });
  };
  const pushTaskToNextDay = (id: string) => {
    setState(prev => {
      const next = {
        tasks: prev.tasks.map(x =>
          x.id === id ? { ...x, date: new Date(new Date(x.date).getTime() + 86400000).toISOString().slice(0, 10) } : x
        ),
      };
      persist(next);
      return next;
    });
  };

  const value = useMemo<Ctx>(() => ({ state, addTask, updateTask, archiveTask, unarchiveTask, pushTaskToNextDay }), [state]);
  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskState(): Ctx {
  const ctx = useContext(TaskContext);
  /* istanbul ignore next */
  if (!ctx) throw new Error('useTaskState must be used within TaskStateProvider');
  return ctx;
}
