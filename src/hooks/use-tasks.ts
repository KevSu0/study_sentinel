'use client';

import {useState, useEffect, useCallback} from 'react';
import {type StudyTask} from '@/lib/types';
import {addDays, format} from 'date-fns';
import {useLogger} from './use-logger';

const TASKS_KEY = 'studySentinelTasks';

// Helper function to save tasks and maintain sort order
const saveTasks = (tasks: StudyTask[]) => {
  const sortedTasks = [...tasks].sort(
    (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
  );
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(sortedTasks));
  } catch (error) {
    console.error('Failed to save tasks to localStorage', error);
  }
  return sortedTasks;
};

export function useTasks() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const {addLog} = useLogger();

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
      const newTask: StudyTask = {
        ...task,
        id: crypto.randomUUID(), // Generate a unique ID
        status: 'todo',
        description: task.description || '',
      };
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks, newTask];
        return saveTasks(updatedTasks);
      });
      addLog('TASK_ADD', {taskId: newTask.id, title: newTask.title});
    },
    [addLog]
  );

  const updateTask = useCallback(
    (updatedTask: StudyTask) => {
      let oldTask: StudyTask | undefined;
      setTasks(prevTasks => {
        oldTask = prevTasks.find(t => t.id === updatedTask.id);
        const newTasks = prevTasks.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        );
        return saveTasks(newTasks);
      });

      // Log status changes or general updates
      if (oldTask && oldTask.status !== updatedTask.status) {
        if (updatedTask.status === 'completed') {
          addLog('TASK_COMPLETE', {
            taskId: updatedTask.id,
            title: updatedTask.title,
          });
        } else if (updatedTask.status === 'in_progress') {
          addLog('TASK_IN_PROGRESS', {
            taskId: updatedTask.id,
            title: updatedTask.title,
          });
        }
      } else {
        addLog('TASK_UPDATE', {
          taskId: updatedTask.id,
          title: updatedTask.title,
        });
      }
    },
    [addLog]
  );

  const archiveTask = useCallback(
    (taskId: string) => {
      let taskTitle = '';
      setTasks(prevTasks => {
        const taskToArchive = prevTasks.find(t => t.id === taskId);
        if (taskToArchive) taskTitle = taskToArchive.title;
        const newTasks = prevTasks.map(task =>
          task.id === taskId ? {...task, status: 'archived'} : task
        );
        return saveTasks(newTasks);
      });
      addLog('TASK_ARCHIVE', {taskId, title: taskTitle});
    },
    [addLog]
  );

  const unarchiveTask = useCallback(
    (taskId: string) => {
      let taskTitle = '';
      setTasks(prevTasks => {
        const taskToUnarchive = prevTasks.find(t => t.id === taskId);
        if (taskToUnarchive) taskTitle = taskToUnarchive.title;
        const newTasks = prevTasks.map(task =>
          task.id === taskId ? {...task, status: 'todo'} : task
        );
        return saveTasks(newTasks);
      });
      addLog('TASK_UNARCHIVE', {taskId, title: taskTitle});
    },
    [addLog]
  );

  const pushTaskToNextDay = useCallback(
    (taskId: string) => {
      let taskTitle = '';
      setTasks(prevTasks => {
        const newTasks = prevTasks.map(task => {
          if (task.id === taskId) {
            if (!taskTitle) taskTitle = task.title;
            // Dates are stored as 'yyyy-MM-dd', which UTC.
            // To avoid timezone issues, we add a time component to parse it correctly, then format back.
            const taskDate = new Date(`${task.date}T00:00:00`);
            const nextDay = addDays(taskDate, 1);
            return {...task, date: format(nextDay, 'yyyy-MM-dd')};
          }
          return task;
        });
        return saveTasks(newTasks);
      });
      addLog('TASK_PUSH_NEXT_DAY', {taskId, title: taskTitle});
    },
    [addLog]
  );

  return {
    tasks,
    addTask,
    updateTask,
    archiveTask,
    unarchiveTask,
    pushTaskToNextDay,
    isLoaded,
  };
}
