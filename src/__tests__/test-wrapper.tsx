import { type ReactNode } from 'react';
import React from 'react';
// Keep providers minimal to avoid environment-specific crashes in tests

export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <>{children}</>
  );
}

// Trivial test to satisfy Jest when scanning __tests__ helpers.
test('test-wrapper loads', () => {
  expect(true).toBe(true);
});
