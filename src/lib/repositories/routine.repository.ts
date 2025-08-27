import { db } from '../db';
import { Routine } from '../types';
import { BaseRepository } from './base.repository';

class RoutineRepository extends BaseRepository<Routine, string> {
  constructor() {
    super(db.routines);
  }

  // Add any routine-specific methods here
}

export const routineRepository = new RoutineRepository();
