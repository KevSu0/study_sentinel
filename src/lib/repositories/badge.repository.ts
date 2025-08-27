import { db } from '../db';
import { Badge } from '../types';
import { BaseRepository } from './base.repository';

class BadgeRepository extends BaseRepository<Badge, string> {
  constructor() {
    super(db.badges);
  }

  // Add any badge-specific methods here
}

export const badgeRepository = new BadgeRepository();
