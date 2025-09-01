import { render as rtlRender } from '@testing-library/react';
import { AllProviders } from './test-wrapper';

export * from '@testing-library/react';

export function render(ui: React.ReactElement, options?: any) {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}

// Trivial test to satisfy Jest when scanning __tests__ helpers.
test('custom render exports', () => {
  expect(typeof render).toBe('function');
});
