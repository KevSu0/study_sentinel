import { renderHook, act } from '@testing-library/react';
import { useCalendarEvents } from '../use-calendar-events';
import { CalendarEvent } from '../../lib/types';

// Mock crypto.randomUUID with incrementing IDs
let mockIdCounter = 0;
const mockRandomUUID = jest.fn();

// Setup crypto mock before any imports
if (!global.crypto) {
  Object.defineProperty(global, 'crypto', {
    value: {
      randomUUID: mockRandomUUID
    },
    writable: true
  });
} else {
  global.crypto.randomUUID = mockRandomUUID;
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock console.error to avoid noise in tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Helper function to create valid CalendarEvent objects
const createValidStudyBlock = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: '1',
  type: 'study_block',
  title: 'Math Study',
  date: '2024-01-15',
  notes: '',
  materials: '',
  startTime: '09:00',
  endTime: '10:00',
  isCompleted: false,
  ...overrides,
});

const createValidPersonalEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: '2',
  type: 'personal_event',
  title: 'Meeting',
  date: '2024-01-16',
  notes: '',
  startTime: '14:00',
  endTime: '15:00',
  isCompleted: false,
  ...overrides,
});

const createValidMilestone = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: '3',
  type: 'milestone',
  title: 'Graduation Day',
  date: '2024-06-15',
  ...overrides,
});

describe('useCalendarEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockIdCounter = 0;
    mockRandomUUID.mockImplementation(() => `mock-uuid-${++mockIdCounter}`);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Initial state and localStorage loading', () => {
    it('should initialize with empty events array when localStorage is empty', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const { result } = renderHook(() => useCalendarEvents());
      
      expect(result.current.events).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('calendar_events');
    });

    it('should load events from localStorage on initialization', () => {
      const mockEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Math Study',
          date: '2024-01-15',
        }),
        createValidPersonalEvent({
          id: '2',
          title: 'Meeting',
          date: '2024-01-16',
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockEvents));
      
      const { result } = renderHook(() => useCalendarEvents());
      
      expect(result.current.events).toEqual(mockEvents);
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');
      
      const { result } = renderHook(() => useCalendarEvents());
      
      expect(result.current.events).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load calendar events from local storage',
        expect.any(Error)
      );
    });

    it('should handle localStorage.getItem throwing an error', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });
      
      const { result } = renderHook(() => useCalendarEvents());
      
      expect(result.current.events).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load calendar events from local storage',
        expect.any(Error)
      );
    });
  });

  describe('addEvent', () => {
    it('should add a new study block event', () => {
      const { result } = renderHook(() => useCalendarEvents());
      
      const newEvent = {
        type: 'study_block' as const,
        title: 'Physics Study',
        date: '2024-01-20',
        startTime: '14:00',
        endTime: '16:00',
        notes: 'Chapter 5 review',
        materials: [],
        isCompleted: false
      };
      
      act(() => {
        result.current.addEvent(newEvent);
      });
      
      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0]).toEqual({
        ...newEvent,
        id: 'mock-uuid-1'
      });
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'calendar_events',
        JSON.stringify([{ ...newEvent, id: 'mock-uuid-1' }])
      );
    });

    it('should add a new personal event', () => {
      const { result } = renderHook(() => useCalendarEvents());
      
      const newEvent = {
        type: 'personal_event' as const,
        title: 'Doctor Appointment',
        date: '2024-01-25',
        startTime: '10:30',
        endTime: '11:30',
        notes: 'Annual checkup',
        isCompleted: false
      };
      
      act(() => {
        result.current.addEvent(newEvent);
      });
      
      expect(result.current.events[0]).toEqual({
        ...newEvent,
        id: 'mock-uuid-1'
      });
    });

    it('should add a new milestone event', () => {
      const { result } = renderHook(() => useCalendarEvents());
      
      const newEvent = {
        type: 'milestone' as const,
        title: 'Graduation Day',
        date: '2024-06-15',
        notes: ''
      };
      
      act(() => {
        result.current.addEvent(newEvent);
      });
      
      expect(result.current.events[0]).toEqual({
        ...newEvent,
        id: 'mock-uuid-1'
      });
    });

    it('should add multiple events and maintain order', () => {
      const { result } = renderHook(() => useCalendarEvents());
      
      const event1 = {
        type: 'study_block' as const,
        title: 'Event 1',
        date: '2024-01-01',
        notes: '',
        materials: '',
        startTime: '09:00',
        endTime: '10:00',
        isCompleted: false
      };
      
      const event2 = {
        type: 'personal_event' as const,
        title: 'Event 2',
        date: '2024-01-02',
        notes: '',
        startTime: '14:00',
        endTime: '15:00',
        isCompleted: false
      };
      
      act(() => {
        result.current.addEvent(event1);
      });
      
      act(() => {
        result.current.addEvent(event2);
      });
      
      expect(result.current.events).toHaveLength(2);
      expect(result.current.events[0].title).toBe('Event 1');
      expect(result.current.events[1].title).toBe('Event 2');
    });

    it('should handle localStorage.setItem errors when adding events', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const { result } = renderHook(() => useCalendarEvents());
      
      const newEvent = {
        type: 'study_block' as const,
        title: 'Test Event',
        date: '2024-01-01',
        notes: '',
        materials: [],
        startTime: '09:00',
        endTime: '10:00',
        isCompleted: false
      };
      
      act(() => {
        result.current.addEvent(newEvent);
      });
      
      // Event should still be added to state even if localStorage fails
      expect(result.current.events).toHaveLength(1);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save calendar events to local storage',
        expect.any(Error)
      );
    });
  });

  describe('updateEvent', () => {
    it('should update an existing event', () => {
      const initialEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Original Title',
          date: '2024-01-15'
        }),
        createValidPersonalEvent({
          id: '2',
          title: 'Another Event',
          date: '2024-01-16'
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialEvents));
      
      const { result } = renderHook(() => useCalendarEvents());
      
      const updatedEvent: CalendarEvent = createValidStudyBlock({
        id: '1',
        title: 'Updated Title',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '11:00',
        notes: 'Added notes'
      });
      
      act(() => {
        result.current.updateEvent(updatedEvent);
      });
      
      expect(result.current.events[0]).toEqual(updatedEvent);
      expect(result.current.events[1]).toEqual(initialEvents[1]); // Other event unchanged
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'calendar_events',
        JSON.stringify([updatedEvent, initialEvents[1]])
      );
    });

    it('should not modify events if ID does not exist', () => {
      const initialEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Existing Event',
          date: '2024-01-15'
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialEvents));
      
      const { result } = renderHook(() => useCalendarEvents());
      
      const nonExistentEvent: CalendarEvent = createValidPersonalEvent({
        id: 'non-existent',
        title: 'Non-existent Event',
        date: '2024-01-20'
      });
      
      act(() => {
        result.current.updateEvent(nonExistentEvent);
      });
      
      expect(result.current.events).toEqual(initialEvents);
    });

    it('should handle localStorage.setItem errors when updating events', () => {
      const initialEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Original Title',
          date: '2024-01-15'
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialEvents));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const { result } = renderHook(() => useCalendarEvents());
      
      const updatedEvent: CalendarEvent = {
        ...initialEvents[0],
        title: 'Updated Title'
      };
      
      act(() => {
        result.current.updateEvent(updatedEvent);
      });
      
      expect(result.current.events[0].title).toBe('Updated Title');
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save calendar events to local storage',
        expect.any(Error)
      );
    });
  });

  describe('deleteEvent', () => {
    it('should delete an existing event', () => {
      const initialEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Event to Delete',
          date: '2024-01-15'
        }),
        createValidPersonalEvent({
          id: '2',
          title: 'Event to Keep',
          date: '2024-01-16'
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialEvents));
      
      const { result } = renderHook(() => useCalendarEvents());
      
      act(() => {
        result.current.deleteEvent('1');
      });
      
      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0]).toEqual(initialEvents[1]);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'calendar_events',
        JSON.stringify([initialEvents[1]])
      );
    });

    it('should handle deleting non-existent event gracefully', () => {
      const initialEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Existing Event',
          date: '2024-01-15'
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialEvents));
      
      const { result } = renderHook(() => useCalendarEvents());
      
      act(() => {
        result.current.deleteEvent('non-existent-id');
      });
      
      expect(result.current.events).toEqual(initialEvents);
    });

    it('should delete all events when called multiple times', () => {
      const initialEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Event 1',
          date: '2024-01-15'
        }),
        createValidPersonalEvent({
          id: '2',
          title: 'Event 2',
          date: '2024-01-16'
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialEvents));
      
      const { result } = renderHook(() => useCalendarEvents());
      
      act(() => {
        result.current.deleteEvent('1');
      });
      
      act(() => {
        result.current.deleteEvent('2');
      });
      
      expect(result.current.events).toEqual([]);
    });

    it('should handle localStorage.setItem errors when deleting events', () => {
      const initialEvents: CalendarEvent[] = [
        createValidStudyBlock({
          id: '1',
          title: 'Event to Delete',
          date: '2024-01-15'
        })
      ];
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialEvents));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const { result } = renderHook(() => useCalendarEvents());
      
      act(() => {
        result.current.deleteEvent('1');
      });
      
      expect(result.current.events).toEqual([]);
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save calendar events to local storage',
        expect.any(Error)
      );
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle rapid successive operations', () => {
      const { result } = renderHook(() => useCalendarEvents());
      
      const event1 = {
        type: 'study_block' as const,
        title: 'Event 1',
        date: '2024-01-01',
        notes: '',
        materials: '',
        startTime: '09:00',
        endTime: '10:00',
        isCompleted: false
      };
      
      const event2 = {
        type: 'personal_event' as const,
        title: 'Event 2',
        date: '2024-01-02',
        notes: '',
        startTime: '14:00',
        endTime: '15:00'
      };
      
      act(() => {
        result.current.addEvent(event1);
      });
      
      act(() => {
        result.current.addEvent(event2);
      });
      
      act(() => {
        result.current.deleteEvent('mock-uuid-1');
      });
      
      expect(result.current.events).toHaveLength(1);
      expect(result.current.events[0].title).toBe('Event 2');
    });

    it('should maintain function types across re-renders', () => {
      const { result, rerender } = renderHook(() => useCalendarEvents());
      
      const firstRender = result.current;
      
      rerender();
      
      const secondRender = result.current;
      
      // Functions should be of correct type
      expect(typeof firstRender.addEvent).toBe('function');
      expect(typeof firstRender.updateEvent).toBe('function');
      expect(typeof firstRender.deleteEvent).toBe('function');
      expect(typeof secondRender.addEvent).toBe('function');
      expect(typeof secondRender.updateEvent).toBe('function');
      expect(typeof secondRender.deleteEvent).toBe('function');
    });

    it('should handle empty string event IDs', () => {
      const { result } = renderHook(() => useCalendarEvents());
      
      act(() => {
        result.current.deleteEvent('');
      });
      
      expect(result.current.events).toEqual([]);
    });

    it('should preserve event properties when updating', () => {
      const initialEvent = createValidStudyBlock({
        id: '1',
        title: 'Original',
        date: '2024-01-15',
        startTime: '09:00',
        endTime: '10:00',
        notes: 'Original notes',
        materials: 'Book chapter 1',
        isCompleted: false
      });
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify([initialEvent]));
      
      const { result } = renderHook(() => useCalendarEvents());
      
      const updatedEvent = {
        ...initialEvent,
        title: 'Updated',
        isCompleted: true
      };
      
      act(() => {
        result.current.updateEvent(updatedEvent as CalendarEvent);
      });
      
      expect(result.current.events[0]).toEqual(updatedEvent);
      if (result.current.events[0].type === 'study_block') {
        expect((result.current.events[0] as any).materials).toBe('Book chapter 1');
        expect((result.current.events[0] as any).isCompleted).toBe(true);
      }
    });
  });
});