import { db } from '../db';
import { StudyTask } from '../types';
import { BaseRepository } from './base.repository';

export interface Task extends StudyTask {}

class TaskRepository extends BaseRepository<Task, string> {
  constructor() {
    super(db.plans);
  }

  async getByDateRange(startDate: string, endDate: string): Promise<Task[]> {
    return this.table
      .where('date')
      .between(startDate, endDate)
      .toArray();
  }
}

export const taskRepository = new TaskRepository();
