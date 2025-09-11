import React from 'react';
window.HTMLElement.prototype.scrollIntoView = jest.fn();
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';

// Mock the useGlobalState hook
jest.mock('@/hooks/use-global-state');

const mockUseGlobalState = useGlobalState as jest.Mock;

describe('SettingsPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the loading skeleton when isLoaded is false', () => {
    mockUseGlobalState.mockReturnValue({
      state: { isLoaded: false, soundSettings: {} },
      setSoundSettings: jest.fn(),
    });

    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText(/customize your experience./i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  describe('when loaded', () => {
    const setSoundSettings = jest.fn();
    const initialSoundSettings = {
      alarm: 'alarm_clock',
      tick: 'tick_tock',
      notificationInterval: 15,
    };

    beforeEach(() => {
      mockUseGlobalState.mockReturnValue({
        state: { isLoaded: true, soundSettings: initialSoundSettings },
        setSoundSettings,
      });
    });

    it('should render the settings page with initial values', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
      expect(screen.getByText(/customize your experience./i)).toBeInTheDocument();
      expect(screen.getByText(/sound & notifications/i)).toBeInTheDocument();

      // Check initial values
      expect(screen.getByText('Alarm Clock')).toBeInTheDocument();
      expect(screen.getByText('Tick Tock')).toBeInTheDocument();
      expect(screen.getByText('Every 15 minutes')).toBeInTheDocument();
    });

    it('should call setSoundSettings when alarm sound is changed', async () => {
      render(<SettingsPage />);

      fireEvent.click(screen.getByLabelText('Alarm Sound'));
      const alarmOption = await screen.findByText('Digital Alarm');
      fireEvent.click(alarmOption);

      expect(setSoundSettings).toHaveBeenCalledWith({ alarm: 'digital_alarm' });
    });

    it('should call setSoundSettings when tick sound is changed', async () => {
      render(<SettingsPage />);

      fireEvent.click(screen.getByLabelText('Timer Tick Sound'));
      const tickOption = await screen.findByText('None');
      fireEvent.click(tickOption);

      expect(setSoundSettings).toHaveBeenCalledWith({ tick: 'none' });
    });

    it('should call setSoundSettings when reminder interval is changed', async () => {
      render(<SettingsPage />);

      fireEvent.click(screen.getByLabelText('Reminder Interval'));
      const intervalOption = await screen.findByText('Every 30 minutes');
      fireEvent.click(intervalOption);

      expect(setSoundSettings).toHaveBeenCalledWith({ notificationInterval: 30 });
    });
  });
});