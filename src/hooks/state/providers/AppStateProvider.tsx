"use client";

import React, { type ReactNode } from 'react';
import { AppStateProvider as CoreProvider } from '../core/use-app-state';

export function AppStateProvider({ children }: { children: ReactNode }) {
  return <CoreProvider>{children}</CoreProvider>;
}

