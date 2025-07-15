'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';

// This page is deprecated and now redirects to /
export default function LetsStartPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-full">
      <p>Redirecting...</p>
    </div>
  );
}
