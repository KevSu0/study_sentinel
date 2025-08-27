
"use client";

import { useEffect } from 'react';
import { initDatabase } from '@/lib/db-init';
import StatusChip from '@/components/shared/status-chip';
import { Toaster } from 'sonner';
import { registerServiceWorker } from '@/lib/sw-utils';
import { Providers } from '@/components/providers';

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
