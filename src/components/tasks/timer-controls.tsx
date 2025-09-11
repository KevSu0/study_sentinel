'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Pause, Play, CheckCircle, XCircle } from 'lucide-react';

interface TimerControlsProps {
  isPaused: boolean;
  onTogglePause: () => void;
  onComplete: () => void;
  onStop: () => void;
}

export function TimerControls({ isPaused, onTogglePause, onComplete, onStop }: TimerControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0">
      <Button size="lg" variant="outline" onClick={onTogglePause} className="w-full sm:w-32">
        {isPaused ? <Play className="mr-2" /> : <Pause className="mr-2" />}
        {isPaused ? 'Resume' : 'Pause'}
      </Button>
      <Button
        size="lg"
        onClick={onComplete}
        className="w-full sm:w-48 bg-green-500 hover:bg-green-600 text-white order-first sm:order-none"
      >
        <CheckCircle className="mr-2" />
        Complete
      </Button>
      <Button size="lg" variant="destructive" onClick={onStop} className="w-full sm:w-32">
        <XCircle className="mr-2" />
        Stop
      </Button>
    </div>
  );
}