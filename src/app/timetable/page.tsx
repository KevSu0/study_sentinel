
'use client';
import React, {useEffect} from 'react';
import {useRouter} from 'next/navigation';

// This page is deprecated and now redirects to /plans
export default function TimetablePage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/plans');
    }, [router]);

    return (
        <div className="flex items-center justify-center h-full">
            <p>Redirecting...</p>
        </div>
    );
}
