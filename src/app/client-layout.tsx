"use client";

import { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: 'black',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { initDatabase } from '@/lib/db-init';
import { Toaster } from 'sonner';

const StatusChip = dynamic(() => import('@/components/shared/status-chip'), {
  ssr: false,
});
import { registerServiceWorker } from '@/lib/sw-utils';
// import { requestPersistentStorage } from '@/lib/sw-utils';
import { Providers } from '@/components/providers';
import { useStatusBarStyle } from '@/utils/platform-optimization';
import { UserPreferencesRepository } from '@/lib/repositories/user-preferences.repository';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useStatusBarStyle('default');
  
  useEffect(() => {
    const initializeApp = async () => {
      // Register service worker
      registerServiceWorker();
      
      // Initialize database
      await initDatabase();
      
      // Request persistent storage for better offline experience
      // await requestPersistentStorage();
      
      // Migrate localStorage preferences to IndexedDB
      try {
        const userPrefsRepo = new UserPreferencesRepository();
        await userPrefsRepo.migrateFromLocalStorage();
      } catch (error) {
        console.error('Failed to migrate preferences:', error);
      }
    };
    
    initializeApp();
  }, []);

  return (
    <>
      <Providers>{children}</Providers>
      <StatusChip />
      <Toaster />
    </>
  );
}
