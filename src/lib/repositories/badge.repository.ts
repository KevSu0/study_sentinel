import { getDB } from '../db';
import { Badge } from '../types';
import { BaseRepository } from './base.repository';

class BadgeRepository extends BaseRepository<Badge, string> {
  constructor() {
    super(() => getDB().badges);
  }

  // Add any badge-specific methods here
}

export const badgeRepository = new BadgeRepository();
