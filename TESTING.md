Testing conventions

Default: mock by default
- Global mock: '@/hooks/use-global-state' is mocked in 'src/test-setup/jest.setup.ts' so unit/page/component tests do not boot Dexie/IndexedDB.
- Manual mock: lives at 'src/hooks/__mocks__/use-global-state.tsx'. It exports a passthrough GlobalStateProvider and a jest.fn() useGlobalState that returns deterministic state and no-op actions.
- Default render: import { render } from 'src/__tests__/render'. It wraps your component with ThemeProvider and the (mocked) GlobalStateProvider.

Opt-in: real provider with persistence
- When a test must exercise the real state and repositories, import { renderWithRealState } from 'src/__tests__/render-real'.
- This helper un-mocks '@/hooks/use-global-state', sets up 'fake-indexeddb/auto', and wraps with ThemeProvider + real GlobalStateProvider.
- Use seed utilities as needed to pre-populate the DB for the scenario.

Examples

// default (mocked)
import { render, screen } from '@/__tests__/render';
import DashboardPage from '@/app/page';

test('dashboard shows heading', () => {
  render(<DashboardPage />);
  expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
});

// real (opt-in)
import { renderWithRealState, screen } from '@/__tests__/render-real';
import DashboardPage from '@/app/page';

it('completes a task with real persistence', async () => {
  await renderWithRealState(<DashboardPage />);
  // ... interact/assert
});

Notes
- If a suite needs the real provider for every test, import renderWithRealState as render and use it consistently.
- If a test custom-mocks '@/hooks/use-global-state', that local mock will override the global mock for that test file.
- fake-indexeddb is globally available in the current setup; still, renderWithRealState calls it defensively for isolation.

CI smoke test
- The file src/__tests__/real-state.smoke.int.test.tsx validates that the opt-in path works end-to-end on CI (real provider mounts, actions update state, and an event persists via Dexie).
