import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PWAInstallPrompt, PWAUpdateNotification, usePWAUpdates } from '../update-notification';
import { swTestHarness } from '@/test/sw-test-harness';

const success = jest.fn();
const error = jest.fn();

jest.mock('react-hot-toast', () => {
  const toast = {
    success: (...args: unknown[]) => success(...args),
    error: (...args: unknown[]) => error(...args),
  };
  return {
    __esModule: true,
    default: toast,
    toast,
  };
});

describe('PWAUpdateNotification', () => {
  beforeEach(() => {
    success.mockClear();
    error.mockClear();
  });

  it('does not render when no update is available', () => {
    render(<PWAUpdateNotification />);
    expect(screen.queryByRole('status', { name: /application update status/i })).toBeNull();
  });

  it('renders an update banner when a waiting worker is present', async () => {
    await act(async () => {
      swTestHarness.simulateWaitingWorker();
    });

    render(<PWAUpdateNotification />);

    expect(await screen.findByRole('status', { name: /application update status/i })).toHaveTextContent(/update available/i);
    expect(success).toHaveBeenCalledWith('A new update is ready');
  });

  it('sends SKIP_WAITING when the refresh button is clicked', async () => {
    let waiting: any = null;
    await act(async () => {
      waiting = swTestHarness.simulateWaitingWorker();
    });

    render(<PWAUpdateNotification />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /refresh now/i }));

    expect(waiting?.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('hides the banner after controllerchange', async () => {
    await act(async () => {
      swTestHarness.simulateWaitingWorker();
    });

    render(<PWAUpdateNotification />);

    expect(await screen.findByRole('status', { name: /application update status/i })).toBeInTheDocument();

    await act(async () => {
      swTestHarness.activateWaitingWorker();
    });

    await waitFor(() => expect(screen.queryByRole('status', { name: /application update status/i })).toBeNull());
    expect(success).toHaveBeenCalledWith('Update applied successfully');
  });

  it('invokes registration.update when checking for updates', async () => {
    const registration = await swTestHarness.getRegistration();
    await act(async () => {
      swTestHarness.simulateWaitingWorker();
    });

    render(<PWAUpdateNotification />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /check again/i }));

    await waitFor(() => expect(registration.update).toHaveBeenCalled());
  });

  it('allows the banner to be dismissed', async () => {
    await act(async () => {
      swTestHarness.simulateWaitingWorker();
    });

    render(<PWAUpdateNotification />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /dismiss update banner/i }));

    expect(screen.queryByRole('status', { name: /application update status/i })).toBeNull();
  });
});

describe('usePWAUpdates', () => {
  it('exposes helper functions from the hook', async () => {
    await act(async () => {
      swTestHarness.simulateWaitingWorker();
    });

    const { result } = renderHook(() => usePWAUpdates());

    await waitFor(() => expect(result.current.updateAvailable).toBe(true));
    expect(typeof result.current.checkForUpdates).toBe('function');
    expect(typeof result.current.skipWaiting).toBe('function');
  });
});

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    success.mockClear();
    error.mockClear();
  });

  const createBeforeInstallPromptEvent = () => {
    const event = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
    Object.defineProperty(event, 'prompt', {
      configurable: true,
      value: jest.fn(() => Promise.resolve()),
    });
    Object.defineProperty(event, 'userChoice', {
      configurable: true,
      value: Promise.resolve({ outcome: 'accepted' as const }),
    });
    return event;
  };

  it('does not render without an install prompt', () => {
    render(<PWAInstallPrompt />);
    expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();
  });

  it('shows the install prompt when the browser fires beforeinstallprompt', () => {
    render(<PWAInstallPrompt />);
    const event = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
  });

  it('triggers the stored prompt when installing', async () => {
    render(<PWAInstallPrompt />);
    const event = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /install app/i }));
    await waitFor(() => expect((event as BeforeInstallPromptEvent).prompt).toHaveBeenCalled());
  });

  it('hides the prompt after installation completes', () => {
    render(<PWAInstallPrompt />);
    const event = createBeforeInstallPromptEvent();
    act(() => {
      window.dispatchEvent(event);
    });
    expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.queryByRole('button', { name: /install app/i })).toBeNull();
  });
});

type BeforeInstallPromptEvent = Event & {
  prompt: jest.Mock;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};
