import { render as rtlRender } from '@testing-library/react';
import React from 'react';

// IMPORTANT: Consumers of this helper should import from this file when they need real persistence.
// This helper un-mocks use-global-state and sets up fake-indexeddb automatically.

export * from '@testing-library/react';

export async function renderWithRealState(ui: React.ReactElement, options?: any) {
  // Use the real implementation of global state for this render
  try { jest.unmock('@/hooks/use-global-state'); } catch {}

  // Setup fake-indexeddb so Dexie works in jsdom (redundant if globally enabled, safe otherwise)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('fake-indexeddb/auto');

  const { AllProvidersReal } = await import('./test-wrapper-real');
  return rtlRender(ui, { wrapper: AllProvidersReal as any, ...options });
}
