'use client';

import React, { useState, useEffect } from 'react';
import { motivationalQuotes } from '@/lib/motivation';
import { AnimatePresence, motion } from 'framer-motion';

const getRandomQuote = () => {
  return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
};

export const MotivationalQuote = () => {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setQuote(getRandomQuote());

    const intervalId = setInterval(() => {
      setQuote(getRandomQuote());
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="text-sm sm:text-lg md:text-xl h-16 text-center max-w-2xl px-4 flex items-center justify-center">
        <AnimatePresence mode="wait">
            <motion.p
                key={quote}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.5 }}
                className="italic text-muted-foreground"
            >
                {quote}
            </motion.p>
        </AnimatePresence>
    </div>
  );
};