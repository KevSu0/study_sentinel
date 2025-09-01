import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { SoundSettingsProvider, useSoundSettings } from '../use-sound-settings';

describe('useSoundSettings', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SoundSettingsProvider>{children}</SoundSettingsProvider>
  );

  it('exposes defaults and updates', () => {
    const { result } = renderHook(() => useSoundSettings(), { wrapper });
    expect(result.current.state.isMuted).toBe(false);
    expect(result.current.state.soundSettings.alarm).toBeDefined();

    act(() => result.current.toggleMute());
    expect(result.current.state.isMuted).toBe(true);

    act(() => result.current.setSoundSettings({ alarm: 'bell' }));
    expect(result.current.state.soundSettings.alarm).toBe('bell');
  });

});
