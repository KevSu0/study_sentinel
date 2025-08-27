'use client'

import React, {useRef, useState, useMemo, useCallback} from 'react'
import {useTheme} from 'next-themes'
import {cn} from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'

export type HourBin = {
  hour: number
  productiveMin: number
  pausedMin?: number
  weeklyAvgProductiveMin?: number
  pauseCount?: number;
}

function getFocusColor(focusPercent: number) {
  if (focusPercent >= 85) return 'hsl(142.1 76.2% 42.2%)' // green-600
  if (focusPercent >= 70) return 'hsl(24.6 95% 53.1%)' // orange-500
  if (focusPercent >= 50) return 'hsl(47.9 95.8% 53.1%)' // amber-500
  return 'hsl(0 84.2% 60.2%)' // red-500
}

const arc = (x: number, y: number, r: number, start: number, end: number) => {
  const startPoint = {x: x + r * Math.cos(start), y: y + r * Math.sin(start)}
  const endPoint = {x: x + r * Math.cos(end), y: y + r * Math.sin(end)}
  const largeArc = end - start <= Math.PI ? '0' : '1'
  return `M ${startPoint.x} ${startPoint.y} A ${r} ${r} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y}`
}

export function ProductivityClock({
  bins,
  summary,
  responsive = true,
  size = 260,
  stroke,
  title = 'Productivity Clock',
  subtitle = '24-hour ring · mobile-first',
  onHourPress,
  dayLabel,
}: {
  bins: HourBin[]
  summary?: {
    overallFocusPercent?: number
    totalStudiedMin?: number
    totalProductiveMin?: number
  }
  responsive?: boolean
  size?: number
  stroke?: number
  title?: string
  subtitle?: string
  onHourPress?: (hour: number, productiveMinutes: number) => void
  dayLabel?: string
}) {
  const {theme} = useTheme()
  const ref = useRef<HTMLDivElement>(null)
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const isReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  const totalProductiveMin = useMemo(() => {
    return summary?.totalProductiveMin ?? bins.reduce((sum, bin) => sum + bin.productiveMin, 0)
  }, [summary?.totalProductiveMin, bins])
  
  const totalStudiedMin = useMemo(() => {
     const totalPaused = bins.reduce((sum, bin) => sum + (bin.pausedMin ?? 0), 0)
     return summary?.totalStudiedMin ?? totalProductiveMin + totalPaused
  }, [summary?.totalStudiedMin, totalProductiveMin, bins])
  
  const focusPercent = useMemo(() => {
    if (summary?.overallFocusPercent !== undefined) return summary.overallFocusPercent
    if (totalStudiedMin === 0) return 100
    return (totalProductiveMin / totalStudiedMin) * 100
  }, [summary?.overallFocusPercent, totalProductiveMin, totalStudiedMin])

  const chartSize = responsive ? '100%' : size
  const strokeWidth = (stroke ?? Math.max(8, Math.floor(size / 22))) * 0.7
  const r = 100 - strokeWidth * 2
  
  const selectedBin = useMemo(() => {
    return selectedHour !== null ? bins.find(b => b.hour === selectedHour) : null
  }, [selectedHour, bins])

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGPathElement>) => {
    const hour = parseInt(e.currentTarget.dataset.hour || '0', 10);
    setSelectedHour(hour)
    onHourPress?.(hour, bins.find(b => b.hour === hour)?.productiveMin || 0)
    if (navigator.vibrate) navigator.vibrate(50)
  }, [onHourPress, bins])

  const centerColor = getFocusColor(focusPercent);

  return (
    <div ref={ref} className={cn('relative', responsive && 'w-full')}>
        <div style={{width: chartSize, height: chartSize}} className="relative aspect-square touch-manipulation mx-auto">
            <svg viewBox="0 0 200 200" width="100%" height="100%">
                {/* Invisible hit paths for touch */}
                {Array.from({ length: 24 }).map((_, i) => {
                    const angle = (i - 6) * (Math.PI / 12);
                    return (
                    <path
                        key={`hit-${i}`}
                        d={arc(100, 100, r + strokeWidth, angle - Math.PI / 22, angle + Math.PI / 22)}
                        fill="transparent"
                        stroke="transparent"
                        strokeWidth={strokeWidth*1.5}
                        data-hour={i}
                        onPointerDown={handlePointerDown}
                        style={{ cursor: 'pointer' }}
                    />
                    );
                })}
                 {/* Background track */}
                <circle cx="100" cy="100" r={r} fill="none" stroke="hsla(var(--muted-foreground), 0.1)" strokeWidth={strokeWidth}/>

                 {/* Weekly Average */}
                {bins[0]?.weeklyAvgProductiveMin !== undefined && (
                    <circle cx="100" cy="100" r={r-strokeWidth*1.1} fill="none" stroke="hsla(var(--muted-foreground), 0.2)" strokeWidth={strokeWidth/2} />
                )}

                 {/* Hour Labels Outside the Circle */}
                 {Array.from({ length: 24 }).map((_, i) => {
                    if (i % 3 !== 0) return null
                    const angle = (i - 6) * (Math.PI / 12);
                    const labelR = r + strokeWidth + 4; // Position labels outside the main ring
                    const x = 100 + labelR * Math.cos(angle);
                    const y = 100 + labelR * Math.sin(angle);

                    let label: string;
                    if (i === 0 || i === 24) label = '12a';
                    else if (i === 12) label = '12p';
                    else label = `${i % 12}`;
                    
                    return (
                        <text
                            key={`label-${i}`}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="8"
                            fill="hsl(var(--muted-foreground))"
                            className="pointer-events-none select-none"
                        >
                            {label}
                        </text>
                    );
                })}

                 {/* Center Display */}
                <g className="pointer-events-none select-none" onPointerDown={() => setSelectedHour(null)}>
                  <circle cx="100" cy="100" r={r - strokeWidth * 1.5} fill="transparent" />
                    {selectedBin ? (
                      <>
                        <text x="100" y="85" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                            {`${String(selectedBin.hour).padStart(2,'0')}:00 - ${String(selectedBin.hour+1).padStart(2,'0')}:00`}
                        </text>
                        <text x="100" y="102" textAnchor="middle" fontSize="16" fontWeight="bold" fill="hsl(var(--foreground))">
                            {`${Math.round(selectedBin.productiveMin)}m Productive`}
                        </text>
                        <text x="100" y="118" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                            {`${Math.round(selectedBin.pausedMin || 0)}m Paused (${selectedBin.pauseCount || 0} times)`}
                        </text>
                      </>
                    ) : (
                      <>
                        <text x="100" y="100" textAnchor="middle" fontSize="24" fontWeight="bold" fill={centerColor}>
                            {`${Math.round(focusPercent)}%`}
                        </text>
                        <text x="100" y="118" textAnchor="middle" fontSize="10" fill="hsl(var(--muted-foreground))">
                           Focus
                        </text>
                      </>
                    )}
                </g>

                {/* Arcs for each hour */}
                {bins.map(({ hour, productiveMin, pausedMin }) => {
                    const angle = (hour - 6) * (Math.PI / 12);
                    const prodRatio = Math.min(productiveMin / 60, 1);
                    const pauseRatio = Math.min((pausedMin ?? 0) / 60, 1);

                    return (
                        <g key={hour}>
                            {/* Productive time arc */}
                            <path
                                d={arc(100, 100, r, angle - Math.PI / 24, angle + (Math.PI / 24) * (2 * prodRatio - 1))}
                                fill="none"
                                stroke={centerColor}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                className={!isReducedMotion ? "transition-all duration-300" : ""}
                            />
                             {/* Paused time arc */}
                            {pauseRatio > 0 && (
                                <path
                                    d={arc(100, 100, r, angle + (Math.PI / 24) * (2 * prodRatio - 1), angle + (Math.PI / 24) * (2 * (prodRatio+pauseRatio) - 1))}
                                    fill="none"
                                    stroke="hsl(38 92% 50%)"
                                    strokeWidth={strokeWidth*0.8}
                                    strokeLinecap="round"
                                    className={!isReducedMotion ? "transition-all duration-300" : ""}
                                />
                            )}
                        </g>
                    )
                })}
            </svg>
        </div>
    </div>
  )
}
