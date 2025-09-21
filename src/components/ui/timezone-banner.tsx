'use client';

import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIMEZONE_LAUNCH_CONFIG } from '@/config/launch-config';

interface TimezoneBannerProps {
  className?: string;
}

export function TimezoneBanner({ className }: TimezoneBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if banner should be shown
    const hasDismissed = localStorage.getItem('timezone-banner-dismissed');
    const isAfterLaunch = new Date() >= new Date(TIMEZONE_LAUNCH_CONFIG.dayZeroTimestamp);

    if (!hasDismissed && isAfterLaunch && TIMEZONE_LAUNCH_CONFIG.showLegacyToggle) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('timezone-banner-dismissed', 'true');
    setIsVisible(false);
  };

  const handleLearnMore = () => {
    // Open help center article
    window.open('/help/timezone-update', '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className={`bg-blue-50 border-b border-blue-200 px-4 py-3 ${className}`}>
      <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3">
        <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          <p className="text-sm text-blue-900">
            We&#39;ve aligned your study day to IST (4:00 AM–4:00 AM) for clearer stats.
            Compare with Legacy (UTC) using the toggle for 30 days.{' '}
            <button
              onClick={handleLearnMore}
              className="text-blue-700 hover:text-blue-800 underline font-medium whitespace-nowrap"
            >
              Learn more
            </button>
          </p>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 h-8 w-8 p-0"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}