import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { ViewModeProvider } from '@/hooks/use-view-mode';

export function AllProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class">
      <ViewModeProvider>{children}</ViewModeProvider>
    </ThemeProvider>
  );
}