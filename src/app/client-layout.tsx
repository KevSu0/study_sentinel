"use client";

import { Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: 'black',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

import { useEffect } from 'react';
import { initDatabase } from '@/lib/db-init';
import StatusChip from '@/components/shared/status-chip';
import { Toaster } from 'sonner';
import { registerServiceWorker } from '@/lib/sw-utils';
import { Providers } from '@/components/providers';
import { useStatusBarStyle } from '@/utils/platform-optimization';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useStatusBarStyle('default');
  
  useEffect(() => {
    registerServiceWorker();
    initDatabase();
  }, []);

  return (
    <>
      <Providers>{children}</Providers>
      <StatusChip />
      <Toaster />
    </>
  );
}
