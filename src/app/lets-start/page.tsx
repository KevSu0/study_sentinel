'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

// This page is deprecated and now redirects to /
export default function LetsStartPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 space-y-4">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-8 w-1/3" />
      <div className="w-full pt-8 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    </div>
  );
}
