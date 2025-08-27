import React from 'react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import type {LucideIcon} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  Icon: LucideIcon;
  isLoaded: boolean;
}

export function StatCard({
  title,
  value,
  unit,
  Icon,
  isLoaded,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2">
              <CardTitle className="text-xs font-medium">{title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-2">
              {isLoaded ? (
                <div className="text-xl font-bold">
                  {value}
                  {unit && (
                    <span className="text-sm font-normal ml-1">{unit}</span>
                  )}
                </div>
              ) : (
                <Skeleton className="h-6 w-3/4" />
              )}
            </CardContent>
    </Card>
  );
}
