import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SettingsProvider, useSettings, useSoundSettings, useMuteSettings } from '../SettingsProvider';
import { SoundSettings } from '@/lib/types';
import { defaultSoundSettings } from '../settings-state-types';

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

// Mock Audio constructor
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  currentTime: 0,
  volume: 1,
};

global.Audio = jest.fn().mockImplementation(() => mockAudio);

// Test wrapper component
function TestWrapper({ children, initialState }: { children: React.ReactNode; initialState?: any }) {
  return (
    <SettingsProvider initialState={initialState}>
      {children}
    </SettingsProvider>
  );
}

describe('SettingsProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('useSettings', () => {
    it('should provide default settings state', () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.soundSettings).toEqual(defaultSoundSettings);
      expect(result.current.state.isMuted).toBe(false);
    });

    it('should load sound settings from localStorage on initialization', () => {
      const savedSettings: SoundSettings = {
        ...defaultSoundSettings,
        alarm: 'bell',
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.soundSettings.alarm).toBe('bell');
    });

    it('should handle invalid localStorage data gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.soundSettings).toEqual(defaultSoundSettings);
    });

    it('should accept initial state override', () => {
      const initialState = {
        soundSettings: {
          ...defaultSoundSettings,
          alarm: 'bell',
        },
      };

      const { result } = renderHook(() => useSettings(), {
        wrapper: ({ children }) => (
          <TestWrapper initialState={initialState}>{children}</TestWrapper>
        ),
      });

      expect(result.current.state.soundSettings.alarm).toBe('bell');
    });

    it('should update sound settings and persist to localStorage', () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      const newSettings: SoundSettings = {
        ...defaultSoundSettings,
        alarm: 'bell',
      };

      act(() => {
        result.current.actions.setSoundSettings(newSettings);
      });

      expect(result.current.state.soundSettings).toEqual(newSettings);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'soundSettings',
        JSON.stringify(newSettings)
      );
    });

    it('should toggle mute state', () => {
      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.state.isMuted).toBe(false);

      act(() => {
        result.current.actions.toggleMute();
      });

      expect(result.current.state.isMuted).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      act(() => {
        result.current.actions.toggleMute();
      });

      expect(result.current.state.isMuted).toBe(false);
    });
  });

  describe('useSoundSettings', () => {
    it('should provide sound-related functionality', () => {
      const { result } = renderHook(() => useSoundSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.soundSettings).toEqual(defaultSoundSettings);
      expect(typeof result.current.setSoundSettings).toBe('function');
    });



    it('should update sound settings', () => {
      const { result } = renderHook(() => useSoundSettings(), {
        wrapper: TestWrapper,
      });

      const newSettings: Partial<SoundSettings> = {
        alarm: 'bell',
        notificationInterval: 30
      };

      act(() => {
        result.current.setSoundSettings(newSettings);
      });

      expect(result.current.soundSettings.alarm).toBe('bell');
      expect(result.current.soundSettings.notificationInterval).toBe(30);
    });
  });

  describe('useMuteSettings', () => {
    it('should provide mute-related functionality', () => {
      const { result } = renderHook(() => useMuteSettings(), {
        wrapper: TestWrapper,
      });

      expect(typeof result.current.isMuted).toBe('boolean');
      expect(typeof result.current.toggleMute).toBe('function');
    });

    it('should toggle mute state correctly', () => {
      const { result } = renderHook(() => useMuteSettings(), {
        wrapper: TestWrapper,
      });

      expect(result.current.isMuted).toBe(false);

      act(() => {
        result.current.toggleMute();
      });

      expect(result.current.isMuted).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when useSettings is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useSettings());
      }).toThrow('useSettings must be used within a SettingsProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error when useSoundSettings is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useSoundSettings());
      }).toThrow('useSettings must be used within a SettingsProvider');

      consoleSpy.mockRestore();
    });

    it('should throw error when useMuteSettings is used outside provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useMuteSettings());
      }).toThrow('useSettings must be used within a SettingsProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('localStorage Integration', () => {
    it('should handle localStorage setItem errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useSettings(), {
        wrapper: TestWrapper,
      });

      act(() => {
        result.current.actions.setSoundSettings({
          notificationInterval: 30,
        });
      });

      // Should still update state even if localStorage fails
      expect(result.current.state.soundSettings.notificationInterval).toBe(30);
      
      consoleSpy.mockRestore();
    });
  });
});