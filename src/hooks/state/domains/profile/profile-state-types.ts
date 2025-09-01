export type UserProfile = {
  name: string;
  email: string;
  phone?: string;
  dailyStudyGoal: number;
};

export type ProfileState = {
  profile: UserProfile;
  isLoading?: boolean;
  error?: string | null;
};

export type ProfileActions = {
  loadProfile: () => void | Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => void;
};

export type ProfileContextType = {
  state: ProfileState;
  actions: ProfileActions;
};

export const defaultProfileState: ProfileState = {
  profile: { name: 'Guest', email: '', dailyStudyGoal: 8 },
  isLoading: false,
  error: null,
};
