'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy third-party library components
// LazyDatePicker removed - react-datepicker not installed

// LazyColorPicker removed - react-color not installed

// Lazy load chart components with better error boundaries
export const LazyPieChart = dynamic(
  () => import('recharts').then(m => ({ default: m.PieChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(m => ({ default: m.BarChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyLineChart = dynamic(
  () => import('recharts').then(m => ({ default: m.LineChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyAreaChart = dynamic(
  () => import('recharts').then(m => ({ default: m.AreaChart })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

// Lazy load animation components
export const LazyMotionDiv = dynamic(
  () => import('framer-motion').then(m => ({ default: m.motion.div })),
  {
    ssr: false,
    loading: () => <div />,
  }
);

export const LazyAnimatePresence = dynamic(
  () => import('framer-motion').then(m => ({ default: m.AnimatePresence })),
  {
    ssr: false,
    loading: () => <div />,
  }
);

// LazyMarkdownEditor removed - @uiw/react-md-editor not installed
// LazyDragDropContext, LazyDroppable, LazyDraggable removed - react-beautiful-dnd not installed

// Lazy load virtual scrolling components
export const LazyVirtualizedList = dynamic(
  () => import('react-window').then(m => ({ default: m.FixedSizeList })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const LazyVirtualizedGrid = dynamic(
  () => import('react-window').then(m => ({ default: m.FixedSizeGrid })),
  {
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

// LazyCodeEditor removed - @monaco-editor/react not installed
// LazyPDFViewer removed - react-pdf not installed