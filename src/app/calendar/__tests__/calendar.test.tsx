import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CalendarPage from '../page';
import { useCalendarEvents } from '@/hooks/use-calendar-events';
import { useGlobalState } from '@/hooks/use-global-state';
import { MemoryRouterProvider } from 'next-router-mock/MemoryRouterProvider';
import { type CalendarEvent } from '@/lib/types';

jest.mock('@/hooks/use-calendar-events');
jest.mock('@/hooks/use-global-state');

const mockUseCalendarEvents = useCalendarEvents as jest.Mock;
const mockUseGlobalState = useGlobalState as jest.Mock;

const mockEvents: CalendarEvent[] = [
  { id: '1', type: 'study_block', title: 'Test Event 1', date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '11:00' },
  { id: 't1', type: 'study_block', title: 'Test Task 1', date: new Date().toISOString().split('T')[0], isCompleted: false },
];

describe('CalendarPage', () => {
  const mockAddEvent = jest.fn();
  const mockUpdateEvent = jest.fn();
  const mockDeleteEvent = jest.fn();

  const setup = (view = 'month') => {
    mockUseCalendarEvents.mockReturnValue({
      events: mockEvents,
      addEvent: mockAddEvent,
      updateEvent: mockUpdateEvent,
      deleteEvent: mockDeleteEvent,
    });
    mockUseGlobalState.mockReturnValue({
        tasks: [],
    });

    render(<CalendarPage />, { wrapper: MemoryRouterProvider });
    
    // Default view is month, switch if needed
    if (view !== 'month') {
        fireEvent.click(screen.getByRole('button', { name: new RegExp(view, 'i') }));
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render view toggles and switch between views', () => {
    setup();
    expect(screen.getByRole('button', { name: /^month$/i })).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /^week$/i }));
    expect(screen.getByTestId('week-view')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /day/i }));
    expect(screen.getByTestId('day-view')).toBeInTheDocument();
  });

  it('should display the todo list in the day view', () => {
    setup('day');
    expect(screen.getByTestId('day-view-todo-list')).toBeInTheDocument();
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
  });

  describe('EventDialog in Create Mode', () => {
    it('should open, validate, and submit a new event', async () => {
      setup();
      fireEvent.click(screen.getByLabelText(/add event/i));
      
      const dialog = await screen.findByRole('dialog', { name: 'Create New Event' });

      fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'My New Event' } });
      fireEvent.change(within(dialog).getByLabelText('Start Time'), { target: { value: '14:00' } });
      fireEvent.change(within(dialog).getByLabelText('End Time'), { target: { value: '15:00' } });
      
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({
          title: 'My New Event',
          startTime: '14:00',
          endTime: '15:00',
        }));
      });
    });
  });

  describe('EventDialog in Edit Mode', () => {
    it('should open with pre-filled data when an event is clicked', async () => {
      setup('day'); // Day view is easiest to find the event
      
      // Assuming the event item has a role of 'button' or similar for interaction
      fireEvent.click(screen.getByText('Test Event 1'));

      const dialog = await screen.findByRole('dialog', { name: 'Edit Event' });

      expect(within(dialog).getByLabelText('Title')).toHaveValue('Test Event 1');
      expect(within(dialog).getByLabelText('Start Time')).toHaveValue('10:00');

      fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Updated Event Title' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockUpdateEvent).toHaveBeenCalledWith(expect.objectContaining({
          id: '1',
          title: 'Updated Event Title',
        }));
      });
    });
  });
});