import { render as rtlRender } from '@testing-library/react';
import { AllProviders } from './test-wrapper';

export * from '@testing-library/react';

export function render(ui: React.ReactElement, options?: any) {
  return rtlRender(ui, { wrapper: AllProviders, ...options });
}