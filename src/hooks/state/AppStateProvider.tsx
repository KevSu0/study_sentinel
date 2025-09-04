'use client';

import React, { type ReactNode } from 'react';
import { GlobalStateProvider } from '@/hooks/use-global-state';
import { ConfettiProvider } from '@/components/providers/confetti-provider';
import { SettingsProvider } from './domains/settings';
import { ProfileProvider } from './domains/profile';
import { BadgeProvider } from './domains/badges';

/**
 * App State Provider Props
 */
interface AppStateProviderProps {
  children: ReactNode;
}

/**
 * Composed App State Provider
 * 
 * This provider composes all domain-specific state providers while maintaining
 * backward compatibility with the existing GlobalStateProvider.
 * 
 * Provider hierarchy (outer to inner):
 * 1. GlobalStateProvider - Legacy global state (for backward compatibility)
 * 2. SettingsProvider - Settings domain (sound settings, preferences)
 * 3. ProfileProvider - Profile domain (user profile management)
 * 4. BadgeProvider - Badge domain (badge management and checking)
 * 
 * This composition allows:
 * - Gradual migration from global state to domain-specific state
 * - Backward compatibility with existing components
 * - Clear separation of concerns between domains
 * - Independent testing of each domain
 */
export function AppStateProvider({ children }: AppStateProviderProps) {
  return (
    <ConfettiProvider>
      <GlobalStateProvider>
        <SettingsProvider>
          <ProfileProvider>
            <BadgeProvider>
              {children}
            </BadgeProvider>
          </ProfileProvider>
        </SettingsProvider>
      </GlobalStateProvider>
    </ConfettiProvider>
  );
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use AppStateProvider instead
 */
export { GlobalStateProvider as LegacyGlobalStateProvider } from '@/hooks/use-global-state';

/**
 * Re-export domain providers for direct usage if needed
 */
export { SettingsProvider } from './domains/settings';
export { ProfileProvider } from './domains/profile';
export { BadgeProvider } from './domains/badges';

/**
 * Re-export domain hooks for easy access
 */
export {
  useSettings,
  useSoundSettings,
  useMuteSettings,
} from './domains/settings';

export {
  useProfile,
  useProfileData,
  useProfileActions,
} from './domains/profile';

export {
  useBadges,
  useBadgeData,
  useBadgeActions,
  useBadgeChecking,
  useBadgeStats,
  useIsBadgeEarned,
  useEarnedBadges,
  useUnearnedBadges,
  useTodaysBadges,
} from './domains/badges';

/**
 * Re-export legacy global state hook for backward compatibility
 */
export { useGlobalState } from '@/hooks/use-global-state';
