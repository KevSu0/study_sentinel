'use client';

import {useState, useEffect, useCallback} from 'react';
import {type StudyTask} from '@/lib/types';

const TASKS_KEY = 'studySentinelTasks';

export function useTasks() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load tasks from localStorage on initial mount
  useEffect(() => {
    setIsLoaded(false);
    try {
      const savedTasks = localStorage.getItem(TASKS_KEY);
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (error) {
      console.error('Failed to load tasks from localStorage', error);
      // If parsing fails, clear the corrupted data to prevent app crashes
      localStorage.removeItem(TASKS_KEY);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const addTask = useCallback(
    (task: Omit<StudyTask, 'id' | 'status'>) => {
      setTasks(prevTasks => {
        const newTask: StudyTask = {
          ...task,
          id: crypto.randomUUID(), // Generate a unique ID
          status: 'todo',
          description: task.description || '',
        };
        const updatedTasks = [...prevTasks, newTask];
        const sortedTasks = [...updatedTasks].sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        );
        try {
          localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
        } catch (error) {
          console.error('Failed to save tasks to localStorage', error);
        }
        return sortedTasks;
      });
    },
    []
  );

  const updateTask = useCallback((updatedTask: StudyTask) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      );
      const sortedTasks = [...newTasks].sort(
        (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
      );
      try {
        localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
      } catch (error) {
        console.error('Failed to update task in localStorage', error);
      }
      return sortedTasks;
    });
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => {
      const newTasks = prevTasks.filter(task => task.id !== taskId);
      // No need to re-sort on delete, the order is preserved
      try {
        localStorage.setItem(TASKS_KEY, JSON.stringify(newTasks));
      } catch (error) {
        console.error('Failed to delete task from localStorage', error);
      }
      return newTasks;
    });
  }, []);

  return {tasks, addTask, updateTask, deleteTask, isLoaded};
}
