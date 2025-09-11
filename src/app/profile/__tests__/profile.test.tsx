import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfilePage from '../page';
import { useGlobalState } from '@/hooks/use-global-state';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('@/hooks/use-global-state');
jest.mock('react-hot-toast');

const mockUseGlobalState = useGlobalState as jest.Mock;
const mockToast = toast as jest.Mocked<typeof toast>;

const mockProfile = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  dailyStudyGoal: 8,
  idealStartTime: '09:00',
  idealEndTime: '17:00',
  showCountdown: true,
  achievementDate: '2025-12-31',
  passion: 'Coding',
  dream: 'Become a great developer',
  education: 'B.S. in Computer Science',
  reasonForUsing: 'To stay focused',
};

const mockSoundSettings = {
    notificationInterval: 15,
    alarm: 'alarm_clock',
    tick: 'tick_tock',
};

describe('ProfilePage', () => {
  let updateProfile: jest.Mock;
  let setSoundSettings: jest.Mock;

  beforeEach(() => {
    updateProfile = jest.fn();
    setSoundSettings = jest.fn();
    mockUseGlobalState.mockReturnValue({
      state: {
        profile: mockProfile,
        isLoaded: true,
        soundSettings: mockSoundSettings,
      },
      updateProfile,
      setSoundSettings,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading skeletons when not loaded', () => {
    mockUseGlobalState.mockReturnValue({
      state: { isLoaded: false, profile: {}, soundSettings: { notificationInterval: 0 } },
      updateProfile: jest.fn(),
      setSoundSettings: jest.fn(),
    });
    render(<ProfilePage />);
    expect(screen.getByText('Your Profile')).toBeInTheDocument();
    // Check for skeletons
    const skeletons = screen.getAllByRole('status');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render the form with pre-filled data when loaded', () => {
    render(<ProfilePage />);

    expect(screen.getByLabelText(/name/i)).toHaveValue(mockProfile.name);
    expect(screen.getByLabelText(/email address/i)).toHaveValue(mockProfile.email);
    expect(screen.getByLabelText(/daily study goal/i)).toHaveValue(mockProfile.dailyStudyGoal);
    expect(screen.getByLabelText(/ideal start time/i)).toHaveValue(mockProfile.idealStartTime);
    expect(screen.getByLabelText(/ideal end time/i)).toHaveValue(mockProfile.idealEndTime);
    expect(screen.getByLabelText(/achievement date/i)).toHaveValue(mockProfile.achievementDate);
    expect(screen.getByLabelText(/show countdown/i)).toBeChecked();
    expect(screen.getByLabelText(/your passion/i)).toHaveValue(mockProfile.passion);
    expect(screen.getByLabelText(/your dream/i)).toHaveValue(mockProfile.dream);
    expect(screen.getByLabelText(/current education/i)).toHaveValue(mockProfile.education);
    expect(screen.getByLabelText(/why are you using this app/i)).toHaveValue(mockProfile.reasonForUsing);
    expect(screen.getByRole('combobox')).toHaveTextContent(/every 15 minutes/i);
  });
  
  it('should render with an empty profile without crashing', () => {
    mockUseGlobalState.mockReturnValue({
        state: {
          profile: {},
          isLoaded: true,
          soundSettings: { notificationInterval: 0 },
        },
        updateProfile,
        setSoundSettings,
      });
      render(<ProfilePage />);
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
      expect(screen.getByRole('combobox')).toHaveTextContent(/off/i);
  });

  it('should show validation errors for invalid data', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    await user.clear(screen.getByLabelText(/name/i));
    await user.type(screen.getByLabelText(/email address/i), 'invalid-email');
    await user.clear(screen.getByLabelText(/daily study goal/i));
    await user.type(screen.getByLabelText(/daily study goal/i), '0');
    
    const startTimeInput = screen.getByLabelText(/ideal start time/i);
    await user.clear(startTimeInput);
    await user.type(startTimeInput, 'invalid');

    const endTimeInput = screen.getByLabelText(/ideal end time/i);
    await user.clear(endTimeInput);
    await user.type(endTimeInput, 'invalid');

    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.queryByText('Name is required.')).toBeInTheDocument();
      expect(screen.queryByText('Invalid email address.')).toBeInTheDocument();
      expect(screen.queryByText('Goal must be at least 0.5 hours.')).toBeInTheDocument();
      expect(screen.queryAllByText('Invalid time (HH:mm)')).toHaveLength(2);
    });
  });

  it('should call updateProfile on form submission with valid data', async () => {
    render(<ProfilePage />);
    const newName = 'Jane Doe';
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: newName } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({ ...mockProfile, name: newName });
      expect(mockToast.success).toHaveBeenCalledWith('Your information has been updated successfully.');
    });
  });

  it('should call setSoundSettings when notification interval is changed', async () => {
    const user = userEvent.setup();
    render(<ProfilePage />);

    const selectTrigger = screen.getByRole('combobox');
    await user.click(selectTrigger);

    const option = await screen.findByRole('option', { name: 'Every 30 minutes' });
    await user.click(option);

    expect(setSoundSettings).toHaveBeenCalledWith({ notificationInterval: 30 });
  });

  it('should disable save button when form is not dirty', () => {
    render(<ProfilePage />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('should enable save button when form is dirty', () => {
    render(<ProfilePage />);
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Jane Doe' } });
    expect(screen.getByRole('button', { name: /save changes/i })).toBeEnabled();
  });
});