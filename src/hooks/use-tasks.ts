"use client";

import {useState, useEffect, useCallback} from 'react';
import {type StudyTask} from '@/lib/types';
import {v4 as uuidv4} from 'uuid';

// uuid is not in package.json, so add a simple fallback
const generateId = () => {
    try {
        return uuidv4();
    } catch (e) {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
}


const STORAGE_KEY = 'study-sentinel-tasks';

export function useTasks() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem(STORAGE_KEY);
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error('Failed to load tasks from localStorage', error);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      } catch (error) {
        console.error('Failed to save tasks to localStorage', error);
      }
    }
  }, [tasks, isLoaded]);

  const addTask = useCallback((task: Omit<StudyTask, 'id' | 'status'>) => {
    setTasks(prevTasks => [
      ...prevTasks,
      {...task, id: generateId(), status: 'todo'},
    ]);
  }, []);

  const updateTask = useCallback((updatedTask: StudyTask) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === updatedTask.id ? updatedTask : task))
    );
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  }, []);

  return {tasks, addTask, updateTask, deleteTask, isLoaded};
}
