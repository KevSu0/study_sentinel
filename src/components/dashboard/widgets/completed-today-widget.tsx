
'use client';
import React, {useState, useMemo} from 'react';
import type {ActivityFeedItem} from '@/hooks/use-global-state';
import {CheckCircle2, ListFilter, ArrowDownUp} from 'lucide-react';
import {ActivityItem} from '@/components/dashboard/activity/activity-item';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {parseISO} from 'date-fns';

type ActivityFilter = 'all' | 'task' | 'routine';
type ActivitySort = 'newest' | 'time_asc' | 'time_desc';

export const CompletedTodayWidget = ({
  todaysActivity,
}: {
  todaysActivity: ActivityFeedItem[];
}) => {
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [sort, setSort] = useState<ActivitySort>('newest');

  const filteredAndSortedActivity = useMemo(() => {
    let result = [...todaysActivity];

    // Filtering
    if (filter !== 'all') {
      result = result.filter(item => {
        if (filter === 'task') return item.type.startsWith('TASK');
        if (filter === 'routine') return item.type.startsWith('ROUTINE');
        return true;
      });
    }

    // Sorting
    const getTime = (item: ActivityFeedItem): number => {
      if (item.type === 'TASK_COMPLETE') return item.data.duration * 60;
      if (item.type === 'ROUTINE_COMPLETE') return item.data.payload.duration || 0;
      if (item.type === 'TASK_STOPPED') return item.data.payload.timeSpentSeconds || 0;
      return 0;
    };
    
    result.sort((a, b) => {
        switch(sort) {
            case 'time_asc':
                return getTime(a) - getTime(b);
            case 'time_desc':
                return getTime(b) - getTime(a);
            case 'newest':
            default:
                // Timestamps are now guaranteed to be ISO strings
                return parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime();
        }
    });

    return result;
  }, [todaysActivity, filter, sort]);


  if (!todaysActivity || todaysActivity.length === 0) {
    return (
      <section className="pt-8">
        <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-card/50 rounded-lg shadow-sm border border-dashed">
          <CheckCircle2 className="h-16 w-16 text-primary/80 mb-4" />
          <h2 className="text-xl font-bold">No Activity Yet Today</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            Complete or work on tasks and routines to see your activity here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
        <h2 className="text-xl font-semibold text-primary">
          Today's Activity
        </h2>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as ActivityFilter)}>
                        <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="task">Tasks</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="routine">Routines</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <ArrowDownUp className="mr-2 h-4 w-4" />
                        Sort
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as ActivitySort)}>
                        <DropdownMenuRadioItem value="newest">Newest First</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="time_desc">Time Spent (High to Low)</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="time_asc">Time Spent (Low to High)</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <div className="space-y-3">
        {filteredAndSortedActivity.map((item, index) => (
          <ActivityItem
            key={`${item.type}-${'id' in item.data ? item.data.id : index}`}
            item={item}
          />
        ))}
      </div>
    </section>
  );
};
