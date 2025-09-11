
'use client';
import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface RoutineStat {
    name: string;
    totalSeconds: number;
    sessionCount: number;
    points: number;
}

interface RoutineStatsListProps {
  data: RoutineStat[];
}

export function RoutineStatsList({ data }: RoutineStatsListProps) {
  const [showAll, setShowAll] = useState(false);

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [data]);

  const displayedData = showAll ? sortedData : sortedData.slice(0, 3);

  if (!data || data.length === 0) {
    return (
       <Card>
        <CardHeader>
          <CardTitle>Routine Details</CardTitle>
          <CardDescription>
            A detailed breakdown of each completed routine.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">
            No routine data to display.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Routine Details</CardTitle>
        <CardDescription>
          A detailed breakdown of each completed routine.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Routine</TableHead>
              <TableHead className="text-right">Total Time</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Avg. Session</TableHead>
              <TableHead className="text-right">Sessions</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedData.map((routine) => (
              <TableRow key={routine.name} className="text-sm">
                <TableCell className="font-medium p-2 sm:p-4">{routine.name}</TableCell>
                <TableCell className="text-right p-2 sm:p-4">{formatDuration(routine.totalSeconds)}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">{formatDuration(routine.totalSeconds / routine.sessionCount)}</TableCell>
                <TableCell className="text-right p-2 sm:p-4">{routine.sessionCount}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">{routine.points}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      {sortedData.length > 3 && (
        <CardFooter className="justify-center py-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show Less' : 'Show More'}
            {showAll ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
