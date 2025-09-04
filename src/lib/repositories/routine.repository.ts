import { getDB } from '../db';
import { type Routine } from '../types';
import { BaseRepository } from './base.repository';

class RoutineRepository extends BaseRepository<Routine, string> {
  constructor() {
    super(() => getDB().routines);
  }

  // Add any routine-specific methods here
}

export const routineRepository = new RoutineRepository();
