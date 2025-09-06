// This is a new file for the fullscreen timer experience.
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGlobalState } from '@/hooks/use-global-state';
import { Button } from '@/components/ui/button';
import { Shrink, Volume2, VolumeX, Star } from 'lucide-react';
import { TimerControls } from '@/components/tasks/timer-controls';
import { cn } from '@/lib/utils';
import { useWakeLock } from '@/hooks/use-wake-lock';
import { StopTimerDialog } from '@/components/tasks/stop-timer-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { MotivationalQuote } from '@/components/shared/motivational-quote';

function Hourglass({ progress }: { progress: number }) {
  const sandLevel = 100 - progress;

  return (
    <div className="absolute inset-0 flex items-center justify-center -z-10 opacity-20">
      <svg width="200" height="300" viewBox="0 0 200 300">
        <path d="M 30 10 C 30 40, 170 40, 170 10 L 170 0 L 30 0 Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 30 290 C 30 260, 170 260, 170 290 L 170 300 L 30 300 Z" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 30 10 L 90 140 C 95 150, 105 150, 110 140 L 170 10" fill="none" stroke="currentColor" strokeWidth="4" />
        <path d="M 30 290 L 90 160 C 95 150, 105 150, 110 160 L 170 290" fill="none" stroke="currentColor" strokeWidth="4" />
        <path
          d={`M 40 20 L 160 20 L 100 140 Z`}
          fill="currentColor"
          style={{
            clipPath: `inset(${100 - sandLevel}% 0 0 0)`,
            transition: 'clip-path 1s linear'
          }}
        />
        <path
          d={`M 40 280 L 160 280 L 100 160 Z`}
          fill="currentColor"
          style={{
            clipPath: `inset(0 0 ${sandLevel}% 0)`,
            transition: 'clip-path 1s linear'
          }}
        />
        {progress < 100 && (
          <g>
            <circle cx="100" r="2" fill="currentColor">
                <animate attributeName="cy" from="150" to="160" dur="0.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" dur="0.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>
    </div>
  );
}

export default function TimerPage() {
  useWakeLock();
  const router = useRouter();
  const { state, togglePause, completeTimer, stopTimer, toggleMute } = useGlobalState();
  const { activeAttempt, timeDisplay, isOvertime, timerProgress, isMuted, starCount, showStarAnimation, tasks, routines } = state;
  
  const [isStopDialogOpen, setStopDialogOpen] = useState(false);

  const handleComplete = () => {
    completeTimer();
    router.back();
  };

  const handleStop = () => {
    if (!state.isPaused) {
      togglePause();
    }
    setStopDialogOpen(true);
  };
  
  const handleConfirmStop = (reason: string) => {
    stopTimer(reason);
    setStopDialogOpen(false);
    router.back();
  };

  useEffect(() => {
    if (!activeAttempt) {
      router.replace('/');
    }
  }, [activeAttempt, router]);

  if (!activeAttempt) {
    return null;
  }

  const progress = timerProgress ?? 0;
  const item = [...tasks, ...routines].find(t => t.id === activeAttempt.entityId);
  const title = item?.title ?? 'Studying';

  return (
    <div className="h-screen w-full bg-background flex flex-col p-4 overflow-hidden">
      <header className="flex justify-end gap-2">
        <div className="flex-1 text-yellow-400">
           {starCount > 0 && (
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 fill-current"/>
                <span className="text-xl font-bold">{starCount}</span>
              </div>
           )}
        </div>
        <Button variant="ghost" size="icon" onClick={toggleMute}>
          {isMuted ? <VolumeX /> : <Volume2 />}
          <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
        </Button>
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <Shrink />
          <span className="sr-only">Exit Fullscreen</span>
        </Button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center text-center relative">
        <Hourglass progress={progress} />
        <h1 className="text-lg sm:text-2xl text-muted-foreground font-medium px-4">{title}</h1>
        <p className={cn(
          "font-mono font-bold tracking-widest my-4",
          isOvertime ? 'text-destructive animate-pulse' : 'text-primary',
          timeDisplay.length > 5 ? 'text-6xl sm:text-8xl' : 'text-7xl sm:text-9xl'
        )}>
          {timeDisplay}
        </p>
      </main>

      <footer className="flex flex-col items-center gap-4 sm:gap-8 pb-4 sm:pb-8">
        <TimerControls
          isPaused={state.isPaused}
          onTogglePause={togglePause}
          onComplete={handleComplete}
          onStop={handleStop}
        />
        <MotivationalQuote />
      </footer>

      <StopTimerDialog
        isOpen={isStopDialogOpen}
        onOpenChange={setStopDialogOpen}
        onConfirm={handleConfirmStop}
      />
      
      <AnimatePresence>
        {showStarAnimation && (
            <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.5, rotate: 360 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 1.5, type: 'spring' }}
            >
                <Star className="w-32 h-32 text-yellow-400 fill-current drop-shadow-lg" />
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}