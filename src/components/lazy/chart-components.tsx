'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// Lazy load chart components with loading fallbacks
export const LazyPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart as any })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded" /> }
);

export const LazyBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart as any })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded" /> }
);

export const LazyLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart as any })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded" /> }
);

export const LazyRadarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.RadarChart as any })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded" /> }
);

// Lazy load other recharts components
export const LazyResponsiveContainer = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ResponsiveContainer as any })),
  { ssr: false }
);

export const LazyPie = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Pie as any })),
  { ssr: false }
);

export const LazyBar = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Bar as any })),
  { ssr: false }
);

export const LazyLine = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Line as any })),
  { ssr: false }
);

export const LazyRadar = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Radar as any })),
  { ssr: false }
);

export const LazyPolarGrid = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PolarGrid as any })),
  { ssr: false }
);

export const LazyPolarAngleAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PolarAngleAxis as any })),
  { ssr: false }
);

export const LazyPolarRadiusAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PolarRadiusAxis as any })),
  { ssr: false }
);

export const LazyXAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.XAxis as any })),
  { ssr: false }
);

export const LazyYAxis = dynamic(
  () => import('recharts').then(mod => ({ default: mod.YAxis as any })),
  { ssr: false }
);

export const LazyCartesianGrid = dynamic(
  () => import('recharts').then(mod => ({ default: mod.CartesianGrid as any })),
  { ssr: false }
);

export const LazyTooltip = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Tooltip as any })),
  { ssr: false }
);

export const LazyLegend = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Legend as any })),
  { ssr: false }
);

export const LazyCell = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Cell as any })),
  { ssr: false }
);

export const LazySector = dynamic(
  () => import('recharts').then(mod => ({ default: mod.Sector as any })),
  { ssr: false }
);

export const LazyRadialBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.RadialBarChart as any })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse bg-gray-200 rounded" /> }
);

export const LazyRadialBar = dynamic(
  () => import('recharts').then(mod => ({ default: mod.RadialBar as any })),
  { ssr: false }
);