import { useEffect } from 'react';
import { initializeEventManager } from '@/lib/event-sourcing';
import { initializeSyncEngine } from '@/lib/sync-engine';
import { initializeNotifications } from '@/lib/notifications';
import { initializeAnalyticsEngine } from '@/lib/analytics';
import { initializeE2EEManager } from '@/lib/e2ee';
import { diagnosticsManager } from '@/lib/diagnostics';

// Main application initializer
export function useAppInitializer() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('Initializing Study Sentinel Phase B + C...');
        
        // Initialize core systems
        await initializeEventManager();
        
        // Initialize sync engine
        initializeSyncEngine();
        
        // Initialize notifications (with placeholder VAPID key)
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'placeholder_vapid_key';
        initializeNotifications(vapidPublicKey);
        
        // Initialize analytics engine
        initializeAnalyticsEngine();
        
        // Initialize E2EE manager
        initializeE2EEManager();
        
        // Start health monitoring
        diagnosticsManager.runAllHealthChecks();
        
        console.log('Study Sentinel initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);
}

// Utility function to check if all systems are ready
export async function areSystemsReady(): Promise<{
  eventManager: boolean;
  syncEngine: boolean;
  notifications: boolean;
  analytics: boolean;
  e2ee: boolean;
  diagnostics: boolean;
}> {
  // This would check the actual status of each system
  return {
    eventManager: true,
    syncEngine: true,
    notifications: true,
    analytics: true,
    e2ee: true,
    diagnostics: true
  };
}

// Export initialization status
export const InitializationStatus = {
  PENDING: 'pending',
  INITIALIZING: 'initializing',
  READY: 'ready',
  ERROR: 'error'
} as const;

export type InitializationStatusType = typeof InitializationStatus[keyof typeof InitializationStatus];