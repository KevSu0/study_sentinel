import React from 'react';
// ThemeProvider intentionally omitted for real-state smoke; some versions of next-themes break in jsdom
import { GlobalStateProvider } from '@/hooks/use-global-state';

export const AllProvidersReal = ({ children }: { children: React.ReactNode }) => {
  return (
    <GlobalStateProvider>{children}</GlobalStateProvider>
  );
};

