import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OfflineGate, AILoadingState, useAIFeature } from '../offline-gate';
import { swTestHarness } from '@/test/sw-test-harness';

describe('OfflineGate', () => {
  beforeEach(() => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });

  it('renders children when online', () => {
    swTestHarness.setOnline(true);

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI content</div>
      </OfflineGate>
    );

    expect(screen.getByText('AI content')).toBeInTheDocument();
  });

  it('renders offline UI when offline', () => {
    swTestHarness.setOnline(false);

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI content</div>
      </OfflineGate>
    );

    expect(screen.queryByText('AI content')).toBeNull();
    expect(
      screen.getByRole('status', { name: /ai feature offline status/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/retry connection/i)).toBeInTheDocument();
  });

  it('renders provided fallback when offline', () => {
    swTestHarness.setOnline(false);

    render(
      <OfflineGate featureName="AI Feature" fallback={<div>Fallback UI</div>}>
        <div>AI content</div>
      </OfflineGate>
    );

    expect(screen.getByText('Fallback UI')).toBeInTheDocument();
    expect(screen.queryByText('AI content')).toBeNull();
  });

  it('attempts to reconnect when retry is clicked', async () => {
    swTestHarness.setOnline(false);
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });
    const user = userEvent.setup();

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI content</div>
      </OfflineGate>
    );

    await user.click(screen.getByRole('button', { name: /retry connection/i }));

    expect(fetchMock).toHaveBeenCalledWith('/offline-check.txt', {
      cache: 'no-store',
      method: 'HEAD',
    });

    await waitFor(() => expect(screen.getByText('AI content')).toBeInTheDocument());
  });

  it('reacts to online/offline events', async () => {
    swTestHarness.setOnline(true);

    render(
      <OfflineGate featureName="AI Feature">
        <div>AI content</div>
      </OfflineGate>
    );

    expect(screen.getByText('AI content')).toBeInTheDocument();

    swTestHarness.setOnline(false);
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() =>
      expect(screen.getByRole('status', { name: /ai feature offline status/i })).toBeInTheDocument()
    );

    swTestHarness.setOnline(true);
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => expect(screen.getByText('AI content')).toBeInTheDocument());
  });
});

describe('AILoadingState', () => {
  it('renders skeleton placeholders', () => {
    render(<AILoadingState />);

    expect(screen.getByLabelText('AI loading state')).toBeInTheDocument();
    expect(screen.getAllByRole('generic').length).toBeGreaterThan(0);
  });
});

describe('useAIFeature', () => {
  beforeEach(() => {
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });

  it('tracks connectivity state and allows manual checks', async () => {
    swTestHarness.setOnline(false);
    const fetchMock = global.fetch as jest.Mock;
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 });

    const { result } = renderHook(() => useAIFeature());

    expect(result.current.isOnline).toBe(false);
    expect(result.current.canUseAI).toBe(false);

    await act(async () => {
      await result.current.checkConnectivity();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.isOnline).toBe(true);
    expect(result.current.canUseAI).toBe(true);
    expect(result.current.lastCheck).toBeInstanceOf(Date);
  });

  it('allows AI to be disabled independently of connectivity', async () => {
    swTestHarness.setOnline(true);
    const { result } = renderHook(() => useAIFeature());

    expect(result.current.canUseAI).toBe(true);

    act(() => {
      result.current.disableAI();
    });

    expect(result.current.isAIEnabled).toBe(false);
    expect(result.current.canUseAI).toBe(false);
  });
});
