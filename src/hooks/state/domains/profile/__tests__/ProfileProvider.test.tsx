import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ProfileProvider, useProfile, useProfileData, useProfileActions } from '../ProfileProvider';
import { defaultProfileState } from '../profile-state-types';
import { type UserProfile } from '@/lib/types';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock profile repository
const mockProfileRepository = {
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  createProfile: jest.fn(),
  deleteProfile: jest.fn(),
};

jest.mock('@/lib/repositories/profile.repository', () => ({
  profileRepository: mockProfileRepository,
}));

// Test wrapper component
function TestWrapper({ children, initialState }: { children: React.ReactNode; initialState?: any }) {
  return (
    <ProfileProvider initialState={initialState}>
      {children}
    </ProfileProvider>
  );
}

const mockProfile: UserProfile = {
  name: 'Test User',
  email: 'test@example.com',
  phone: '123-456-7890',
  passion: 'Learning',
  dream: 'To become an expert',
  education: 'University',
  reasonForUsing: 'Personal growth',
  dailyStudyGoal: 8
};

describe('ProfileProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockProfileRepository.getProfile.mockResolvedValue(null);
    mockProfileRepository.updateProfile.mockResolvedValue(mockProfile);
    mockProfileRepository.createProfile.mockResolvedValue(mockProfile);
  });

  describe('useProfile', () => {
    it('should provide default profile state', () => {
      const { result } = renderHook(() => useProfile(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.profile).toEqual(defaultProfileState.profile);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
    });

    // LocalStorage initialization is not part of this provider's responsibilities currently.

    it('should accept initial state override', () => {
      const initialState = {
        profile: mockProfile,
        isLoading: false,
        error: null,
      };

      const { result } = renderHook(() => useProfile(), {
        wrapper: ({ children }) => (
          <TestWrapper initialState={initialState}>{children}</TestWrapper>
        ),
      });

      expect(result.current.state.profile).toEqual(mockProfile);
    });

    it('should update profile state', async () => {
      const { result } = renderHook(() => useProfile(), {
        wrapper: TestWrapper,
      });

      const updatedProfile = {
        ...mockProfile,
        name: 'Updated User',
      };

      await act(async () => {
        await result.current.actions.updateProfile(updatedProfile);
      });

      expect(result.current.state.profile).toEqual(updatedProfile);
    });

    it('updateProfile merges partial data', async () => {
      const { result } = renderHook(() => useProfile(), { wrapper: TestWrapper });
      await act(async () => {
        await result.current.actions.updateProfile({ name: 'Changed' });
      });
      expect(result.current.state.profile.name).toBe('Changed');
    });

    it('loadProfile keeps default profile when no data source', async () => {
      const { result } = renderHook(() => useProfile(), { wrapper: TestWrapper });
      await act(async () => {
        await result.current.actions.loadProfile();
      });
      expect(result.current.state.profile).toEqual(defaultProfileState.profile);
    });

    it('loadProfile is a no-op and leaves loading false', () => {
      const { result } = renderHook(() => useProfile(), { wrapper: TestWrapper });
      act(() => {
        result.current.actions.loadProfile();
      });
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
    });
  });

  describe('useProfileData', () => {
    it('should provide profile data and computed properties', () => {
      const initialState = {
        profile: mockProfile,
        isAuthenticated: true,
      };

      const { result } = renderHook(() => useProfileData(), {
        wrapper: ({ children }) => (
          <TestWrapper initialState={initialState}>{children}</TestWrapper>
        ),
      });

      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should return default profile when not initialized', () => {
      const { result } = renderHook(() => useProfileData(), {
        wrapper: TestWrapper,
      });

      expect(result.current.profile).toEqual(defaultProfileState.profile);
      expect(result.current.error).toBe(null);
    });
  });

  describe('useProfileActions', () => {
    it('should provide profile action functions', () => {
      const { result } = renderHook(() => useProfileActions(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.updateProfile).toBe('function');
      expect(typeof result.current.loadProfile).toBe('function');
    });

    it('should execute profile actions correctly', async () => {
      const { result } = renderHook(() => useProfile(), { wrapper: TestWrapper });
      await act(async () => {
        await result.current.actions.updateProfile(mockProfile);
      });
      expect(result.current.state.profile).toEqual({ ...defaultProfileState.profile, ...mockProfile });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useProfile is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useProfile());
      }).toThrow('useProfile must be used within a ProfileProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error when useProfileData is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useProfileData());
      }).toThrow('useProfile must be used within a ProfileProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error when useProfileActions is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useProfileActions());
      }).toThrow('useProfile must be used within a ProfileProvider');

      consoleSpy.mockRestore();
    });
  });

  // Storage interactions are handled outside of this provider in the current implementation.
});
