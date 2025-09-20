import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SyncAndNotificationsPage from '../../settings/sync-notifications/page';
import {
  cacheManagerMock,
  diagnosticsManagerMock,
  e2eeManagerMock,
  notificationManagerMock,
  resetSyncFixtures,
  setForceSyncResult,
  setNotificationSettingsFixture,
  setSyncStatusFixture,
  syncEngineMock,
} from '@/test/mocks/sync-fixtures';

jest.mock('react-hot-toast', () => {
  const success = jest.fn();
  const error = jest.fn();
  const toast = Object.assign(jest.fn(), { success, error });
  return {
    __esModule: true,
    default: toast,
    toast,
    success,
    error,
  };
});

jest.mock('@/lib/sync-engine', () => {
  const { syncEngineMock } = require('@/test/mocks/sync-fixtures');
  return {
    getSyncEngine: jest.fn(() => syncEngineMock),
    initializeSyncEngine: jest.fn(() => syncEngineMock),
  };
});

jest.mock('@/lib/notifications', () => {
  const { notificationManagerMock } = require('@/test/mocks/sync-fixtures');
  return {
    getNotificationManager: jest.fn(() => notificationManagerMock),
    initializeNotifications: jest.fn(() => notificationManagerMock),
  };
});

jest.mock('@/lib/e2ee', () => {
  const { e2eeManagerMock } = require('@/test/mocks/sync-fixtures');
  return {
    getE2EEManager: jest.fn(() => e2eeManagerMock),
    initializeE2EEManager: jest.fn(() => e2eeManagerMock),
  };
});

jest.mock('@/lib/diagnostics', () => {
  const { diagnosticsManagerMock, cacheManagerMock } = require('@/test/mocks/sync-fixtures');
  return {
    diagnosticsManager: diagnosticsManagerMock,
    CacheManager: cacheManagerMock,
  };
});

const { success: toastSuccess, error: toastError } = require('react-hot-toast');

const renderPage = async () => {
  render(<SyncAndNotificationsPage />);
  await waitFor(() =>
    expect(
      screen.getByRole('heading', { name: /sync & privacy/i })
    ).toBeInTheDocument()
  );
};

describe('SyncAndNotificationsPage', () => {
  beforeEach(() => {
    resetSyncFixtures();
    jest.clearAllMocks();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it('renders metrics from the current sync status', async () => {
    setSyncStatusFixture({ pendingEvents: 4, failedEvents: 2 });
    await renderPage();

    const pendingLabel = screen.getByText('Pending');
    const failedLabel = screen.getByText('Failed');

    expect(pendingLabel.previousElementSibling).toHaveTextContent('4');
    expect(failedLabel.previousElementSibling).toHaveTextContent('2');
    expect(screen.getAllByText(/online/i)[0]).toBeInTheDocument();
  });

  it('disables Sync Now while offline', async () => {
    setSyncStatusFixture({ isOnline: false });
    await renderPage();

    expect(screen.getByRole('button', { name: /sync now/i })).toBeDisabled();
    expect(screen.getAllByText(/offline/i).length).toBeGreaterThan(0);
  });

  it('runs a successful sync and updates queue metrics', async () => {
    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sync now/i }));

    await waitFor(() => expect(syncEngineMock.forceSync).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Sync completed successfully'));

    await waitFor(() => {
      const pendingLabel = screen.getByText('Pending');
      const failedLabel = screen.getByText('Failed');
      expect(pendingLabel.previousElementSibling).toHaveTextContent('2');
      expect(failedLabel.previousElementSibling).toHaveTextContent('0');
    });
  });

  it('surfaces sync errors from the engine', async () => {
    setForceSyncResult({ success: false, error: 'Network issue' });
    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sync now/i }));

    await waitFor(() => expect(syncEngineMock.forceSync).toHaveBeenCalled());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Sync failed: Network issue'));
  });

  it('clears failed events via the sync engine', async () => {
    setSyncStatusFixture({ failedEvents: 3 });
    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /clear failed/i }));

    await waitFor(() => expect(syncEngineMock.clearFailedEvents).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Cleared 3 failed events'));
    await waitFor(() => {
      const failedLabel = screen.getByText('Failed');
      expect(failedLabel.previousElementSibling).toHaveTextContent('0');
    });
  });

  it('enables notification channels through the settings manager', async () => {
    setNotificationSettingsFixture({
      channels: { studyReminders: true, streakProtection: false, sessionSummaries: true },
      streakProtection: false,
    });

    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: /notifications/i }));
    const streakToggle = await screen.findByRole('switch', { name: /streak protection/i });
    await user.click(streakToggle);

    await waitFor(() =>
      expect(notificationManagerMock.settingsManager.enableChannel).toHaveBeenCalledWith('streakProtection')
    );
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('streakProtection enabled'));
  });

  it('clears publicity caches from diagnostics utilities', async () => {
    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('tab', { name: /diagnostics/i }));
    const clearCachesButton = await screen.findByRole('button', { name: /clear caches/i });
    await user.click(clearCachesButton);

    await waitFor(() => expect(cacheManagerMock.clearPublicityCaches).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Caches cleared successfully'));
  });
});
