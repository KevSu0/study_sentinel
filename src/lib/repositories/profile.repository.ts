import { db, User } from '../db';
import { BaseRepository } from './base.repository';

class ProfileRepository extends BaseRepository<User, string> {
  constructor() {
    super(db.users);
  }

  // Add any profile-specific methods here
}

export const profileRepository = new ProfileRepository();
