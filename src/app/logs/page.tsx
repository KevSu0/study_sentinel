'use client';
import React from 'react';
import {useGlobalState} from '@/hooks/use-global-state';
import {format, parseISO} from 'date-fns';
import {Card, CardContent} from '@/components/ui/card';
import {Skeleton} from '@/components/ui/skeleton';
import {BookOpenCheck} from 'lucide-react';

const getIconForLogType = (type: string) => {
  switch (type) {
    case 'TASK_ADD':
      return '📝';
    case 'TASK_COMPLETE':
      return '✅';
    case 'TASK_RETRY':
      return '🔄';
    case 'ROUTINE_RETRY':
      return '🔄';
    case 'TIMER_START':
      return '▶️';
    case 'TIMER_PAUSE':
      return '⏸️';
    case 'TIMER_STOP':
      return '⏹️';
    case 'TIMER_COMPLETE':
      return '🎉';
    default:
      return '🔹';
  }
};

export default function LogPage() {
  const {state} = useGlobalState();
  const {logs, isLoaded} = state;

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Activity Log</h1>
        <p className="text-muted-foreground">
          A detailed record of your actions for the current session day.
        </p>
      </header>

      <main className="flex-1 p-2 sm:p-4 overflow-y-auto">
        {!isLoaded ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : logs.length > 0 ? (
          <div className="space-y-4">
            {logs
              .slice()
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map(log => (
                <Card key={log.id} className="bg-card/70" data-testid="log-item">
                  <CardContent className="p-4 flex items-start gap-4">
                    <span className="text-xl mt-1">
                      {getIconForLogType(log.type)}
                    </span>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-primary/90">
                          {log.type.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(log.timestamp), 'h:mm:ss a')}
                        </p>
                      </div>
                      <pre className="text-xs text-muted-foreground mt-1 bg-muted/50 p-2 rounded-md overflow-x-auto">
                        <code>{JSON.stringify(log.payload, null, 2)}</code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 bg-card/50 rounded-lg shadow-sm border border-dashed">
            <BookOpenCheck className="h-16 w-16 text-primary/80 mb-4" />
            <h2 className="text-xl font-bold">No Activity Yet Today</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              As you work on your tasks, your actions will be logged here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
