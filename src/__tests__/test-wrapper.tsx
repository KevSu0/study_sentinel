import { ReactNode } from 'react';
import React from 'react';
import { GlobalStateProvider } from '@/hooks/use-global-state';
import { ThemeProvider } from 'next-themes';

/**
 * AllProviders
 *
 * This component wraps the test environment with all necessary providers.
 *
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to render.
 * @returns {JSX.Element} The rendered component.
 */
export const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <GlobalStateProvider>{children}</GlobalStateProvider>
    </ThemeProvider>
  );
};

// Trivial test to satisfy Jest when scanning __tests__ helpers.
test('test-wrapper loads', () => {
  expect(true).toBe(true);
});
