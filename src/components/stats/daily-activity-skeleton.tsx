'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * DailyActivitySkeleton — lightweight shimmer while sessions load.
 * Matches the approximate layout/height of the DailyActivityCard charts.
 */
export default function DailyActivitySkeleton() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-5 w-40" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="mt-2 h-4 w-56" />
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex h-[300px] w-full items-center justify-center">
          {/* faux radial rings */}
          <div className="relative h-56 w-56">
            <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20" />
            <div className="absolute inset-4 rounded-full border-2 border-muted-foreground/20" />
            <div className="absolute inset-8 rounded-full border-2 border-muted-foreground/20" />
            <div className="absolute inset-12 rounded-full border-2 border-muted-foreground/20" />
            <div className="absolute inset-0 animate-pulse rounded-full border-4 border-transparent border-t-muted-foreground/40" />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="mt-2">
          <Skeleton className="h-3 w-64" />
        </div>
      </CardContent>
    </Card>
  )
}