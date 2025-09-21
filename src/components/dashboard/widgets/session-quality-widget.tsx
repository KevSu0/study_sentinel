'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGlobalState } from '@/hooks/use-global-state';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { formatDuration } from '@/lib/metrics';

interface SessionQualityWidgetProps {
  className?: string;
}

function SessionQualityWidgetContent({ className }: SessionQualityWidgetProps) {
  const { state } = useGlobalState();
  const { todaysCompletedWork } = state;

  // Get last 3 sessions
  const recentSessions = useMemo(() => {
    return [...todaysCompletedWork]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);
  }, [todaysCompletedWork]);

  const getPauseBucket = (avgPauseDuration: number) => {
    if (avgPauseDuration <= 30 * 1000) return '0-30s';
    if (avgPauseDuration <= 2 * 60 * 1000) return '30s-2m';
    if (avgPauseDuration <= 5 * 60 * 1000) return '2m-5m';
    return '5m+';
  };

  const getFocusVariant = (focus: number) => {
    if (focus >= 80) return 'default';
    if (focus >= 60) return 'secondary';
    return 'destructive';
  };

  const getPauseBucketColor = (bucket: string) => {
    switch (bucket) {
      case '0-30s': return 'text-green-600';
      case '30s-2m': return 'text-yellow-600';
      case '2m-5m': return 'text-orange-600';
      case '5m+': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (recentSessions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Session Quality</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete a session to see quality metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Session Quality</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recentSessions.map((session, index) => {
            const avgPauseDuration = session.pauseCount > 0
              ? session.pauseDuration / session.pauseCount
              : 0;
            const pauseBucket = getPauseBucket(avgPauseDuration);

            return (
              <div
                key={session.timestamp}
                className={`p-3 rounded-lg border ${index === 0 ? 'bg-muted/50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm truncate">
                        {session.title}
                      </span>
                      <Badge variant={getFocusVariant(session.focusPercentage)}>
                        {session.focusPercentage.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>{formatDuration(session.productiveDuration)} productive</span>
                      <span className={getPauseBucketColor(pauseBucket)}>
                        {pauseBucket} pauses
                      </span>
                      <span>{session.pauseCount} pauses</span>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {session.type}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {todaysCompletedWork.length > 3 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              Showing last 3 of {todaysCompletedWork.length} sessions today
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SessionQualityWidget({ className }: SessionQualityWidgetProps) {
  const { isEnabled } = useFeatureFlags();

  // Check if the feature is enabled
  if (!isEnabled('session_quality_widget')) {
    return null;
  }

  return <SessionQualityWidgetContent className={className} />;
}