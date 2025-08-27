'use client';

import React, {useState, useEffect, useMemo} from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {useGlobalState} from '@/hooks/use-global-state';
import {Trophy} from 'lucide-react';
import {motion} from 'framer-motion';
import { getRandomMotivationalMessage } from '@/lib/motivation';

const CountdownUnit = ({value, label}: {value: number; label: string}) => (
  <motion.div
    className="text-center bg-black/10 backdrop-blur-sm p-2 sm:p-3 rounded-lg shadow-lg w-16 sm:w-20"
    initial={{opacity: 0, y: 20}}
    animate={{opacity: 1, y: 0}}
    transition={{duration: 0.5}}
  >
    <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-widest">
      {String(value).padStart(2, '0')}
    </div>
    <div className="text-[10px] sm:text-xs font-light text-foreground/80 uppercase tracking-wider">
      {label}
    </div>
  </motion.div>
);

export const AchievementCountdownWidget = () => {
  const {state} = useGlobalState();
  const {profile} = state;
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const dailyMessage = useMemo(() => {
    if (!isClient) return '';
    return getRandomMotivationalMessage();
  }, [isClient]);

  useEffect(() => {
    if (!profile?.achievementDate) {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date(profile.achievementDate as string);

      if (target.getTime() < now.getTime()) {
        setCountdown({days: 0, hours: 0, minutes: 0, seconds: 0});
        return;
      }

      const diff = target.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setCountdown({days, hours, minutes, seconds});
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.achievementDate]);

  if (!profile?.showCountdown || !profile?.achievementDate) {
    return null;
  }

  const totalSeconds =
    countdown.days * 86400 +
    countdown.hours * 3600 +
    countdown.minutes * 60 +
    countdown.seconds;
  if (totalSeconds <= 0) return null;

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.9}}
      animate={{opacity: 1, scale: 1}}
      transition={{duration: 0.5}}
    >
      <Card className="bg-card border-none shadow-lg overflow-hidden">
        <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center text-foreground relative">
          <Trophy className="absolute -top-4 -left-4 h-16 w-16 sm:h-24 sm:w-24 text-foreground/5 transform rotate-[-15deg]" />
          <Trophy className="absolute -bottom-6 -right-6 h-20 w-20 sm:h-28 sm:w-28 text-foreground/5 transform rotate-[15deg]" />

          <div className="text-center mb-4 sm:mb-6 z-10">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              Your Goal is in Sight!
            </h3>
            <p className="text-xs sm:text-sm text-foreground/80">
              Keep up the momentum. You're almost there!
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 z-10">
            <CountdownUnit value={countdown.days} label="Days" />
            <CountdownUnit value={countdown.hours} label="Hours" />
            <CountdownUnit value={countdown.minutes} label="Mins" />
            <CountdownUnit value={countdown.seconds} label="Secs" />
          </div>

          <motion.div
            className="text-center z-10 px-2"
            key={dailyMessage}
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            transition={{duration: 1}}
          >
            <p className="text-sm italic text-foreground/90">"{dailyMessage}"</p>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
