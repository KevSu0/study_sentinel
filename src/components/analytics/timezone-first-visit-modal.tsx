'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TIMEZONE_LAUNCH_CONFIG } from '@/config/launch-config';

interface TimezoneFirstVisitModalProps {
  onOpenChange: (open: boolean) => void;
}

export function TimezoneFirstVisitModal({ onOpenChange }: TimezoneFirstVisitModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if this is first visit to analytics after timezone update
    const hasSeenModal = localStorage.getItem('timezone-modal-seen');
    const isAfterLaunch = new Date() >= new Date(TIMEZONE_LAUNCH_CONFIG.dayZeroTimestamp);

    if (!hasSeenModal && isAfterLaunch && TIMEZONE_LAUNCH_CONFIG.showLegacyToggle) {
      setIsOpen(true);
    }
  }, []);

  const handleGotIt = () => {
    localStorage.setItem('timezone-modal-seen', 'true');
    setIsOpen(false);
    onOpenChange(false);
  };

  const handleOpenHelp = () => {
    window.open('/help/timezone-update', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Your analytics now use IST</DialogTitle>
          <DialogDescription className="text-base">
            We&#39;ve updated how your study day is calculated to better match your local time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-800 rounded-full p-1 mt-0.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Your study day now runs 4:00 AM IST → 4:00 AM IST</p>
                <p className="text-sm text-gray-600 mt-1">
                  This means late-night sessions count toward the day they belong to
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-800 rounded-full p-1 mt-0.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Compare with Legacy for 30 days</p>
                <p className="text-sm text-gray-600 mt-1">
                  Use the View toggle on analytics pages to see both versions
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-800 rounded-full p-1 mt-0.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Exports default to IST</p>
                <p className="text-sm text-gray-600 mt-1">
                  Legacy export format available during the transition period
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleOpenHelp} className="sm:w-auto w-full">
            Open Help Article
          </Button>
          <Button onClick={handleGotIt} className="sm:w-auto w-full">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}