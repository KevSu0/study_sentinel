import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncConsentSettings } from '@/components/sync-consent-settings';

const settleConsentScreen = async () => {
  await act(async () => {
    jest.runAllTimers();
  });
};

describe('SyncConsentSettings', () => {
  let alertSpy: jest.SpyInstance;
  let confirmSpy: jest.SpyInstance;
  let promptSpy: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => undefined);
    confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);
    promptSpy = jest.spyOn(window, 'prompt').mockImplementation(() => 'Test reason');
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    alertSpy.mockRestore();
    confirmSpy.mockRestore();
    promptSpy.mockRestore();
  });

  it('loads default consent preferences with toggles disabled', async () => {
    render(<SyncConsentSettings />);
    await settleConsentScreen();

    expect(screen.getByRole('switch', { name: /sync uplink/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /sync downlink/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /analytics/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: /marketing/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('combobox')).toHaveValue('90days');
  });

  it('persists consent updates when enabling sync uplink', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SyncConsentSettings />);
    await settleConsentScreen();

    const uplinkToggle = screen.getByRole('switch', { name: /sync uplink/i });
    await user.click(uplinkToggle);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(alertSpy).toHaveBeenCalled();
    const stored = JSON.parse(localStorage.getItem('sync_consent') ?? '{}');
    expect(stored.syncUplink).toBe(true);
    expect(screen.getByRole('switch', { name: /sync uplink/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('accept all enables every consent switch', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<SyncConsentSettings />);
    await settleConsentScreen();

    await user.click(screen.getByRole('button', { name: /accept all/i }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const stored = JSON.parse(localStorage.getItem('sync_consent') ?? '{}');
    expect(stored.syncUplink).toBe(true);
    expect(stored.syncDownlink).toBe(true);
    expect(stored.analytics).toBe(true);
    expect(stored.marketing).toBe(true);
  });

  it('reject all disables previously enabled toggles', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    localStorage.setItem('sync_consent', JSON.stringify({
      syncUplink: true,
      syncDownlink: true,
      analytics: true,
      marketing: true,
      dataRetention: '90days',
      lastUpdated: new Date().toISOString(),
      version: '1.0',
    }));

    render(<SyncConsentSettings />);
    await settleConsentScreen();

    await user.click(screen.getByRole('button', { name: /reject all/i }));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const stored = JSON.parse(localStorage.getItem('sync_consent') ?? '{}');
    expect(stored.syncUplink).toBe(false);
    expect(stored.syncDownlink).toBe(false);
    expect(stored.analytics).toBe(false);
    expect(stored.marketing).toBe(false);
  });
});
