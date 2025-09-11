import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { toast } from 'react-hot-toast';

// Mock the components and hooks that would be implemented in Phase B
const SyncPanel = jest.fn(() => <div>Sync Panel</div>);
const NotificationPanel = jest.fn(() => <div>Notification Panel</div>);
const useSyncManager = jest.fn();
const useNotificationManager = jest.fn();

// Mock dependencies
jest.mock('react-hot-toast', () => ({
  toast: jest.fn()
}));


describe('SyncPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock navigator online status
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true
    });

    // Mock sync manager
    useSyncManager.mockReturnValue({
      addToOutbox: jest.fn().mockResolvedValue('outbox-123'),
      getOutboxItems: jest.fn().mockResolvedValue([
        { id: 'outbox-1', event: { type: 'StudySessionEvent' }, status: 'pending' }
      ]),
      syncUp: jest.fn().mockResolvedValue(true),
      syncDown: jest.fn().mockResolvedValue(true),
      clearOutbox: jest.fn().mockResolvedValue(true),
      setCheckpoint: jest.fn().mockResolvedValue(true),
      getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders sync panel with correct information', () => {
    render(<SyncPanel />);

    expect(screen.getByText('Sync & Privacy')).toBeInTheDocument();
    expect(screen.getByText('Optional cloud sync for multi-device access')).toBeInTheDocument();
  });

  it('displays sync toggle correctly', () => {
    render(<SyncPanel />);

    const syncToggle = screen.getByRole('switch', { name: /enable sync/i });
    expect(syncToggle).toBeInTheDocument();
  });

  it('handles sync toggle enable', async () => {
    render(<SyncPanel />);

    const syncToggle = screen.getByRole('switch', { name: /enable sync/i });
    fireEvent.click(syncToggle);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Sync enabled', { icon: '🔄' });
    });
  });

  it('handles sync toggle disable', async () => {
    render(<SyncPanel />);

    // First enable sync
    const syncToggle = screen.getByRole('switch', { name: /enable sync/i });
    fireEvent.click(syncToggle);

    // Then disable it
    fireEvent.click(syncToggle);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Sync disabled', { icon: '📵' });
    });
  });

  it('displays last sync time correctly', async () => {
    render(<SyncPanel />);

    // Wait for component to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/last sync:/i)).toBeInTheDocument();
  });

  it('displays queued items correctly', async () => {
    render(<SyncPanel />);

    // Wait for component to load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/1 item queued/i)).toBeInTheDocument();
  });

  it('handles manual sync action', async () => {
    render(<SyncPanel />);

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(useSyncManager().syncUp).toHaveBeenCalled();
      expect(useSyncManager().syncDown).toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith('Sync completed', { icon: '✅' });
    });
  });

  it('handles sync errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    useSyncManager.mockReturnValue({
      addToOutbox: jest.fn().mockResolvedValue('outbox-123'),
      getOutboxItems: jest.fn().mockResolvedValue([]),
      syncUp: jest.fn().mockRejectedValue(new Error('Network error')),
      syncDown: jest.fn().mockResolvedValue(true),
      clearOutbox: jest.fn().mockResolvedValue(true),
      setCheckpoint: jest.fn().mockResolvedValue(true),
      getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
    });

    render(<SyncPanel />);

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Sync failed:', expect.any(Error));
      expect(toast).toHaveBeenCalledWith('Sync failed', { icon: '❌' });
    });

    consoleSpy.mockRestore();
  });

  it('handles export data action', async () => {
    // Mock export functionality
    const mockExportData = jest.fn().mockResolvedValue(true);
    
    render(<SyncPanel />);

    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Data exported successfully', { icon: '💾' });
    });
  });

  it('handles import data action', async () => {
    // Mock file input
    const mockFile = new File(['{"test": "data"}'], 'backup.json', { type: 'application/json' });
    
    render(<SyncPanel />);

    const importButton = screen.getByRole('button', { name: /import data/i });
    fireEvent.click(importButton);

    // File input should be triggered
    const fileInput = screen.getByLabelText(/import data/i);
    expect(fileInput).toBeInTheDocument();
  });

  it('handles delete cloud data action', async () => {
    // Mock delete functionality
    const mockDeleteCloudData = jest.fn().mockResolvedValue(true);
    
    render(<SyncPanel />);

    const deleteButton = screen.getByRole('button', { name: /delete cloud data/i });
    fireEvent.click(deleteButton);

    // Confirmation dialog should appear
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
  });

  it('displays sync status correctly when offline', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false
    });

    render(<SyncPanel />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    
    const syncButton = screen.getByRole('button', { name: /sync now/i });
    expect(syncButton).toBeDisabled();
  });

  it('handles bulk export correctly', async () => {
    const mockEvents = [
      { id: 'event-1', type: 'StudySessionEvent', data: {} },
      { id: 'event-2', type: 'TaskEvent', data: {} }
    ];

    useSyncManager.mockReturnValue({
      addToOutbox: jest.fn().mockResolvedValue('outbox-123'),
      getOutboxItems: jest.fn().mockResolvedValue([]),
      syncUp: jest.fn().mockResolvedValue(true),
      syncDown: jest.fn().mockResolvedValue(true),
      clearOutbox: jest.fn().mockResolvedValue(true),
      setCheckpoint: jest.fn().mockResolvedValue(true),
      getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123'),
      exportAllEvents: jest.fn().mockResolvedValue(mockEvents)
    });

    render(<SyncPanel />);

    const exportButton = screen.getByRole('button', { name: /export data/i });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(useSyncManager().exportAllEvents).toHaveBeenCalled();
    });
  });

  it('handles sync progress states', async () => {
    useSyncManager.mockReturnValue({
      addToOutbox: jest.fn().mockResolvedValue('outbox-123'),
      getOutboxItems: jest.fn().mockResolvedValue([
        { id: 'outbox-1', event: { type: 'StudySessionEvent' }, status: 'syncing' },
        { id: 'outbox-2', event: { type: 'TaskEvent' }, status: 'pending' }
      ]),
      syncUp: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000))),
      syncDown: jest.fn().mockResolvedValue(true),
      clearOutbox: jest.fn().mockResolvedValue(true),
      setCheckpoint: jest.fn().mockResolvedValue(true),
      getCheckpoint: jest.fn().mockResolvedValue('checkpoint-123')
    });

    render(<SyncPanel />);

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    fireEvent.click(syncButton);

    // Should show loading state
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
  });
});

describe('NotificationPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock notification permissions
    Object.defineProperty(Notification, 'permission', {
      value: 'granted',
      configurable: true
    });

    // Mock notification manager
    useNotificationManager.mockReturnValue({
      requestPermission: jest.fn().mockResolvedValue('granted'),
      subscribeToNotifications: jest.fn().mockResolvedValue(true),
      unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
      sendNotification: jest.fn().mockResolvedValue(true),
      getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
      isSupported: jest.fn().mockReturnValue(true),
      getNotificationSettings: jest.fn().mockResolvedValue({
        studyReminders: true,
        streakProtection: true,
        sessionSummaries: false,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders notification panel with correct information', () => {
    render(<NotificationPanel />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push notifications for study reminders and updates')).toBeInTheDocument();
  });

  it('displays notification channels correctly', () => {
    render(<NotificationPanel />);

    expect(screen.getByText(/study reminders/i)).toBeInTheDocument();
    expect(screen.getByText(/streak protection/i)).toBeInTheDocument();
    expect(screen.getByText(/session summaries/i)).toBeInTheDocument();
  });

  it('handles notification channel toggles', async () => {
    render(<NotificationPanel />);

    const studyRemindersToggle = screen.getByRole('switch', { name: /study reminders/i });
    fireEvent.click(studyRemindersToggle);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Study reminders enabled', { icon: '🔔' });
    });
  });

  it('handles quiet hours configuration', async () => {
    render(<NotificationPanel />);

    const quietHoursToggle = screen.getByRole('switch', { name: /quiet hours/i });
    fireEvent.click(quietHoursToggle);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Quiet hours enabled', { icon: '🌙' });
    });
  });

  it('displays permission status correctly', async () => {
    render(<NotificationPanel />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/permission: granted/i)).toBeInTheDocument();
  });

  it('handles permission request', async () => {
    useNotificationManager.mockReturnValue({
      requestPermission: jest.fn().mockResolvedValue('granted'),
      subscribeToNotifications: jest.fn().mockResolvedValue(true),
      unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
      sendNotification: jest.fn().mockResolvedValue(true),
      getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
      isSupported: jest.fn().mockReturnValue(true),
      getNotificationSettings: jest.fn().mockResolvedValue({
        studyReminders: false,
        streakProtection: false,
        sessionSummaries: false,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      })
    });

    render(<NotificationPanel />);

    const requestButton = screen.getByRole('button', { name: /request permission/i });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(useNotificationManager().requestPermission).toHaveBeenCalled();
      expect(toast).toHaveBeenCalledWith('Permission granted', { icon: '✅' });
    });
  });

  it('handles permission denial', async () => {
    useNotificationManager.mockReturnValue({
      requestPermission: jest.fn().mockResolvedValue('denied'),
      subscribeToNotifications: jest.fn().mockResolvedValue(false),
      unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
      sendNotification: jest.fn().mockResolvedValue(true),
      getSubscription: jest.fn().mockResolvedValue(null),
      isSupported: jest.fn().mockReturnValue(true),
      getNotificationSettings: jest.fn().mockResolvedValue({
        studyReminders: false,
        streakProtection: false,
        sessionSummaries: false,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      })
    });

    render(<NotificationPanel />);

    const requestButton = screen.getByRole('button', { name: /request permission/i });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Permission denied', { icon: '❌' });
    });
  });

  it('displays notification subscription status', async () => {
    useNotificationManager.mockReturnValue({
      requestPermission: jest.fn().mockResolvedValue('granted'),
      subscribeToNotifications: jest.fn().mockResolvedValue(true),
      unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
      sendNotification: jest.fn().mockResolvedValue(true),
      getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
      isSupported: jest.fn().mockReturnValue(true),
      getNotificationSettings: jest.fn().mockResolvedValue({
        studyReminders: true,
        streakProtection: true,
        sessionSummaries: false,
        quietHours: { enabled: true, start: '22:00', end: '08:00' }
      })
    });

    render(<NotificationPanel />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/subscribed/i)).toBeInTheDocument();
  });

  it('handles notification test action', async () => {
    render(<NotificationPanel />);

    const testButton = screen.getByRole('button', { name: /test notification/i });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(useNotificationManager().sendNotification).toHaveBeenCalledWith({
        title: 'Test Notification',
        body: 'This is a test notification from Study Sentinel',
        icon: '/icon.png',
        tag: 'test'
      });
      expect(toast).toHaveBeenCalledWith('Test notification sent', { icon: '🔔' });
    });
  });

  it('handles unsupported browsers', async () => {
    useNotificationManager.mockReturnValue({
      requestPermission: jest.fn().mockResolvedValue('denied'),
      subscribeToNotifications: jest.fn().mockResolvedValue(false),
      unsubscribeFromNotifications: jest.fn().mockResolvedValue(false),
      sendNotification: jest.fn().mockResolvedValue(false),
      getSubscription: jest.fn().mockResolvedValue(null),
      isSupported: jest.fn().mockReturnValue(false),
      getNotificationSettings: jest.fn().mockResolvedValue({
        studyReminders: false,
        streakProtection: false,
        sessionSummaries: false,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      })
    });

    render(<NotificationPanel />);

    expect(screen.getByText(/not supported/i)).toBeInTheDocument();
  });

  it('handles notification errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    useNotificationManager.mockReturnValue({
      requestPermission: jest.fn().mockRejectedValue(new Error('Permission error')),
      subscribeToNotifications: jest.fn().mockResolvedValue(false),
      unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
      sendNotification: jest.fn().mockResolvedValue(true),
      getSubscription: jest.fn().mockResolvedValue(null),
      isSupported: jest.fn().mockReturnValue(true),
      getNotificationSettings: jest.fn().mockResolvedValue({
        studyReminders: false,
        streakProtection: false,
        sessionSummaries: false,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      })
    });

    render(<NotificationPanel />);

    const requestButton = screen.getByRole('button', { name: /request permission/i });
    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Permission request failed:', expect.any(Error));
      expect(toast).toHaveBeenCalledWith('Permission request failed', { icon: '❌' });
    });

    consoleSpy.mockRestore();
  });

  it('displays quiet hours time configuration', async () => {
    render(<NotificationPanel />);

    const quietHoursToggle = screen.getByRole('switch', { name: /quiet hours/i });
    fireEvent.click(quietHoursToggle);

    // Time inputs should appear
    expect(screen.getByLabelText(/start time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end time/i)).toBeInTheDocument();
  });

  it('handles notification preferences persistence', async () => {
    const mockSaveSettings = jest.fn().mockResolvedValue(true);
    
    render(<NotificationPanel />);

    const studyRemindersToggle = screen.getByRole('switch', { name: /study reminders/i });
    fireEvent.click(studyRemindersToggle);

    await waitFor(() => {
      expect(useNotificationManager().getNotificationSettings).toHaveBeenCalled();
    });
  });

  it('shows notification delivery status', async () => {
    useNotificationManager.mockReturnValue({
      requestPermission: jest.fn().mockResolvedValue('granted'),
      subscribeToNotifications: jest.fn().mockResolvedValue(true),
      unsubscribeFromNotifications: jest.fn().mockResolvedValue(true),
      sendNotification: jest.fn().mockResolvedValue(true),
      getSubscription: jest.fn().mockResolvedValue({ endpoint: 'test-endpoint' }),
      isSupported: jest.fn().mockReturnValue(true),
      getNotificationSettings: jest.fn().mockResolvedValue({
        studyReminders: true,
        streakProtection: true,
        sessionSummaries: false,
        quietHours: { enabled: false, start: '22:00', end: '08:00' }
      }),
      getDeliveryStats: jest.fn().mockResolvedValue({
        delivered: 15,
        failed: 2,
        pending: 1
      })
    });

    render(<NotificationPanel />);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/delivered: 15/i)).toBeInTheDocument();
    expect(screen.getByText(/failed: 2/i)).toBeInTheDocument();
  });
});