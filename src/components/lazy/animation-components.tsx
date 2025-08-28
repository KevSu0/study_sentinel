'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// Lazy load framer-motion components
export const LazyMotionDiv = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.motion.div })),
  {
    loading: () => <div className="animate-pulse" />,
    ssr: false,
  }
);

export const LazyAnimatePresence = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.AnimatePresence })),
  {
    ssr: false,
  }
);

export const LazyMotion = dynamic(
  () => import('framer-motion').then(mod => ({ default: mod.LazyMotion })),
  {
    ssr: false,
  }
);

// Note: domAnimation is not a component, so we'll export it directly
export { domAnimation } from 'framer-motion';

// Utility hook for lazy motion
export const useLazyMotion = () => {
  return {
    LazyMotionDiv,
    LazyAnimatePresence,
    LazyMotion,
  };
};

// Common animation variants
export const fadeInVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const slideUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

export const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};