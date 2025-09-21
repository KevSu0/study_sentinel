// src/data/entities/routine.store.ts

import { LocalStore, storageKeys } from '../storage/local.store';
import { eventAppend, createEvent } from '../logs/event.append';
import { RoutineAddEvent, RoutineUpdateEvent, RoutineDeleteEvent } from '../logs/event.model';
import { Routine } from '../../domain/routine.rules';

export class RoutineStore {
  private store: LocalStore;

  constructor(store?: LocalStore) {
    this.store = store || new LocalStore();
  }

  /**
   * Get all routines
   */
  getAll(): Routine[] {
    return this.store.get<Routine[]>(storageKeys.routines()) || [];
  }

  /**
   * Get routine by ID
   */
  getById(id: string): Routine | null {
    const routines = this.getAll();
    return routines.find(routine => routine.id === id) || null;
  }

  /**
   * Add a new routine
   */
  async add(routine: Omit<Routine, 'id'>): Promise<Routine> {
    const newRoutine: Routine = {
      ...routine,
      id: this.generateId(),
    };

    // Append event first
    const event = createEvent<RoutineAddEvent>(
      'ROUTINE_ADD',
      {
        id: newRoutine.id,
        title: newRoutine.title,
        description: newRoutine.description,
        calendar: newRoutine.calendar,
        taskTemplateId: newRoutine.taskTemplateId,
      }
    );

    const appended = await eventAppend.append(event as any);
    if (!appended) {
      throw new Error('Failed to append ROUTINE_ADD event');
    }

    // Update store
    const routines = this.getAll();
    routines.push(newRoutine);
    this.store.set(storageKeys.routines(), routines);

    return newRoutine;
  }

  /**
   * Update a routine
   */
  async update(id: string, updates: Partial<Omit<Routine, 'id'>>): Promise<Routine | null> {
    const routines = this.getAll();
    const routineIndex = routines.findIndex(routine => routine.id === id);

    if (routineIndex === -1) {
      return null;
    }

    const updatedRoutine = {
      ...routines[routineIndex],
      ...updates,
    };

    // Append event
    const event = createEvent<RoutineUpdateEvent>(
      'ROUTINE_UPDATE',
      {
        id,
        updates: {
          title: updatedRoutine.title,
          description: updatedRoutine.description,
          calendar: updatedRoutine.calendar,
          taskTemplateId: updatedRoutine.taskTemplateId,
        },
      }
    );

    const appended = await eventAppend.append(event as any);
    if (!appended) {
      throw new Error('Failed to append ROUTINE_UPDATE event');
    }

    // Update store
    routines[routineIndex] = updatedRoutine;
    this.store.set(storageKeys.routines(), routines);

    return updatedRoutine;
  }

  /**
   * Delete a routine
   */
  async delete(id: string): Promise<boolean> {
    const routines = this.getAll();
    const filteredRoutines = routines.filter(routine => routine.id !== id);

    if (filteredRoutines.length === routines.length) {
      return false; // Routine not found
    }

    // Append event
    const event = createEvent<RoutineDeleteEvent>(
      'ROUTINE_DELETE',
      { id }
    );

    const appended = await eventAppend.append(event as any);
    if (!appended) {
      throw new Error('Failed to append ROUTINE_DELETE event');
    }

    // Update store
    this.store.set(storageKeys.routines(), filteredRoutines);

    return true;
  }

  /**
   * Get routines for specific days
   */
  getByDays(days: number[]): Routine[] {
    return this.getAll().filter(routine =>
      routine.calendar.days.some(day => days.includes(day))
    );
  }

  /**
   * Clear all routines
   */
  async clear(): Promise<void> {
    const routines = this.getAll();

    // Append delete events for all routines
    for (const routine of routines) {
      const event = createEvent<RoutineDeleteEvent>(
        'ROUTINE_DELETE',
        { id: routine.id }
      );
      await eventAppend.append(event as any);
    }

    // Clear store
    this.store.remove(storageKeys.routines());
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `routine_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Default instance
export const routineStore = new RoutineStore();