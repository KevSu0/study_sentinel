import { render as rtlRender } from '@testing-library/react';
import { AllProviders } from './test-wrapper';

export * from '@testing-library/react';

// Default render uses mocked GlobalStateProvider via jest.setup (always-on mock)
export function render(ui: React.ReactElement, options?: any) {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

// Named export for integration tests that need real persistence
export { renderWithRealState } from './render-real';

// Trivial test to satisfy Jest when scanning __tests__ helpers.
test('custom render exports', () => {
  expect(typeof render).toBe('function');
});
