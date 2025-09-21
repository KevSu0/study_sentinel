// src/data/entities/task.store.ts

import { LocalStore, storageKeys } from '../storage/local.store';
import { eventAppend, createEvent } from '../logs/event.append';
import { TaskAddEvent, TaskUpdateEvent, TaskDeleteEvent } from '../logs/event.model';

export interface Task {
  id: string;
  title: string;
  description?: string;
  duration?: number; // minutes for countdown
  priority?: number;
  status: 'todo' | 'in_progress' | 'completed';
  createdAt: number;
  updatedAt: number;
}

export class TaskStore {
  private store: LocalStore;

  constructor(store?: LocalStore) {
    this.store = store || new LocalStore();
  }

  /**
   * Get all tasks
   */
  getAll(): Task[] {
    return this.store.get<Task[]>(storageKeys.tasks()) || [];
  }

  /**
   * Get task by ID
   */
  getById(id: string): Task | null {
    const tasks = this.getAll();
    return tasks.find(task => task.id === id) || null;
  }

  /**
   * Add a new task
   */
  async add(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: this.generateId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Append event first
    const event = createEvent<TaskAddEvent>(
      'TASK_ADD',
      {
        id: newTask.id,
        title: newTask.title,
        description: newTask.description,
        duration: newTask.duration,
        priority: newTask.priority,
        status: newTask.status,
      }
    );

    const appended = await eventAppend.append(event as any);
    if (!appended) {
      throw new Error('Failed to append TASK_ADD event');
    }

    // Update store
    const tasks = this.getAll();
    tasks.push(newTask);
    this.store.set(storageKeys.tasks(), tasks);

    return newTask;
  }

  /**
   * Update a task
   */
  async update(id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<Task | null> {
    const tasks = this.getAll();
    const taskIndex = tasks.findIndex(task => task.id === id);

    if (taskIndex === -1) {
      return null;
    }

    const updatedTask = {
      ...tasks[taskIndex],
      ...updates,
      updatedAt: Date.now(),
    };

    // Append event
    const event = createEvent<TaskUpdateEvent>(
      'TASK_UPDATE',
      {
        id,
        updates: {
          title: updatedTask.title,
          description: updatedTask.description,
          duration: updatedTask.duration,
          priority: updatedTask.priority,
          status: updatedTask.status,
        },
      }
    );

    const appended = await eventAppend.append(event as any);
    if (!appended) {
      throw new Error('Failed to append TASK_UPDATE event');
    }

    // Update store
    tasks[taskIndex] = updatedTask;
    this.store.set(storageKeys.tasks(), tasks);

    return updatedTask;
  }

  /**
   * Delete a task
   */
  async delete(id: string): Promise<boolean> {
    const tasks = this.getAll();
    const filteredTasks = tasks.filter(task => task.id !== id);

    if (filteredTasks.length === tasks.length) {
      return false; // Task not found
    }

    // Append event
    const event = createEvent<TaskDeleteEvent>(
      'TASK_DELETE',
      { id }
    );

    const appended = await eventAppend.append(event as any);
    if (!appended) {
      throw new Error('Failed to append TASK_DELETE event');
    }

    // Update store
    this.store.set(storageKeys.tasks(), filteredTasks);

    return true;
  }

  /**
   * Update task status
   */
  async updateStatus(id: string, status: Task['status']): Promise<Task | null> {
    return this.update(id, { status });
  }

  /**
   * Get tasks by status
   */
  getByStatus(status: Task['status']): Task[] {
    return this.getAll().filter(task => task.status === status);
  }

  /**
   * Clear all tasks
   */
  async clear(): Promise<void> {
    const tasks = this.getAll();

    // Append delete events for all tasks
    for (const task of tasks) {
      const event = createEvent<TaskDeleteEvent>(
        'TASK_DELETE',
        { id: task.id }
      );
      await eventAppend.append(event as any);
    }

    // Clear store
    this.store.remove(storageKeys.tasks());
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default instance
export const taskStore = new TaskStore();