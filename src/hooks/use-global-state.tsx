'use client';
// Compatibility shim: route all global state usage to the canonical AppStateProvider implementation
// that includes timer ticking, progress, and the rest of the real app state.
export { AppStateProvider as GlobalStateProvider, useGlobalState } from '@/state/providers/AppStateProvider';
