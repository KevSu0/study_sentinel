"use client";

import {useState, useEffect, useCallback} from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {type StudyTask} from '@/lib/types';

const tasksCollectionRef = collection(db, 'tasks');

export function useTasks() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const q = query(tasksCollectionRef, orderBy('date', 'asc'), orderBy('time', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedTasks = querySnapshot.docs.map(
            (doc) =>
            ({
                ...doc.data(),
                id: doc.id,
            } as StudyTask)
        );
        setTasks(fetchedTasks);
        setIsLoaded(true);
    }, (error) => {
        console.error('Failed to subscribe to tasks', error);
        setIsLoaded(true); // also set to true on error so we don't show infinite loader
    });

    return () => unsubscribe();
  }, []);

  const addTask = useCallback(
    async (task: Omit<StudyTask, 'id' | 'status'>) => {
      try {
        const newTaskData = {
          ...task,
          status: 'todo' as const,
          description: task.description || '',
        };
        await addDoc(tasksCollectionRef, newTaskData);
      } catch (error) {
        console.error('Failed to add task to Firestore', error);
      }
    },
    []
  );

  const updateTask = useCallback(async (updatedTask: StudyTask) => {
    try {
      const taskDoc = doc(db, 'tasks', updatedTask.id);
      const {id, ...taskData} = updatedTask;
      await updateDoc(taskDoc, taskData);
    } catch (error) {
      console.error('Failed to update task in Firestore', error);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const taskDoc = doc(db, 'tasks', taskId);
      await deleteDoc(taskDoc);
    } catch (error) {
      console.error('Failed to delete task from Firestore', error);
    }
  }, []);

  return {tasks, addTask, updateTask, deleteTask, isLoaded};
}
