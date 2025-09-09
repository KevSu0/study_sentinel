'use client';

import dynamic from 'next/dynamic';

// Container and common primitives
export const LazyResponsiveContainer = dynamic<any>(
  () => import('recharts').then(mod => mod.ResponsiveContainer as any),
  { ssr: false }
);

export const LazyTooltip = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Tooltip as any })),
  { ssr: false }
);

export const LazyLegend = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Legend as any })),
  { ssr: false }
);

export const LazyXAxis = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.XAxis as any })),
  { ssr: false }
);

export const LazyYAxis = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.YAxis as any })),
  { ssr: false }
);

export const LazyCartesianGrid = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.CartesianGrid as any })),
  { ssr: false }
);

// Bar charts
export const LazyBarChart = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.BarChart as any })),
  { ssr: false }
);

export const LazyBar = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Bar as any })),
  { ssr: false }
);

// Line charts
export const LazyLineChart = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.LineChart as any })),
  { ssr: false }
);

export const LazyLine = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Line as any })),
  { ssr: false }
);

// Pie charts
export const LazyPieChart = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.PieChart as any })),
  { ssr: false }
);

export const LazyPie = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Pie as any })),
  { ssr: false }
);

// Others
export const LazyCell = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Cell as any })),
  { ssr: false }
);

export const LazySector = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Sector as any })),
  { ssr: false }
);

export const LazyLabelList = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.LabelList as any })),
  { ssr: false }
);

// Radar charts (if used)
export const LazyRadarChart = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.RadarChart as any })),
  { ssr: false }
);

export const LazyRadar = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.Radar as any })),
  { ssr: false }
);

export const LazyPolarGrid = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.PolarGrid as any })),
  { ssr: false }
);

export const LazyPolarAngleAxis = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.PolarAngleAxis as any })),
  { ssr: false }
);

export const LazyPolarRadiusAxis = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.PolarRadiusAxis as any })),
  { ssr: false }
);

// Radial bar charts (if used)
export const LazyRadialBarChart = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.RadialBarChart as any })),
  { ssr: false }
);

export const LazyRadialBar = dynamic<any>(
  () => import('recharts').then(mod => ({ default: mod.RadialBar as any })),
  { ssr: false }
);
